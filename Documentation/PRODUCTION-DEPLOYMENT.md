# AtlasBasket Production Deployment & CI/CD Guide

This document describes the canonical production deployment architecture, automated CI/CD pipeline, rollback mechanisms, and operational procedures for AtlasBasket.

---

## 1. Production Architecture Overview

- **Physical Host**: `serversforplan` (Runs KVM hypervisor and Cloudflare Tunnel `cloudflared`).
- **Production VM**: `atlasbasket-virtual-machine` (`192.168.122.90` on KVM bridge `virbr0`).
- **VM Hardware**: Ubuntu Server, 7.4 GB RAM, 4 CPU threads.
- **Docker Network**: `atlasbasket-vm-net` (External bridge network).
- **Core State Storage**:
  - PostgreSQL: Container `atlasbasket-postgres` (Standalone unmanaged, untouched by CI/CD).
  - Redis: Container `atlasbasket-vm-redis` (Standalone unmanaged, untouched by CI/CD).
  - Production Secrets: `/home/sathwik-atlasbasket/apps/atlasbasket/secrets/backend.env`.
- **Target Backend APIs**:

| Service | Container Name | Host Port | Internal Port | Healthcheck |
| :--- | :--- | :---: | :---: | :--- |
| Customer API | `atlasbasket-vm-customer-api` | `3001` | `3001` | `GET /health` (200 OK) |
| Seller API | `atlasbasket-vm-seller-api` | `3002` | `3002` | `GET /health` (200 OK) |
| Admin API | `atlasbasket-vm-admin-api` | `3003` | `3003` | `GET /health` (200 OK) |
| Delivery API | `atlasbasket-vm-delivery-api` | `3004` | `3004` | `GET /health` (200 OK) |
| Payment API | `atlasbasket-vm-payment-api` | `3005` | `3005` | `GET /health` (200 OK) |

- **Cloudflare Tunnel Routing**: Cloudflare Tunnel on `serversforplan` connects across the internal network to `http://192.168.122.90:3001` to serve `api.atlasbasket.com`. Port bindings use `${HOST_BIND_IP:-0.0.0.0}` to remain accessible while respecting VM `DOCKER-USER` firewall rules.

---

## 2. Canonical Deployment Flow

The deployment is executed by `backend/scripts/deploy.sh` through a self-hosted GitHub Actions runner on the VM:

1. **Flock Locking**: Acquires an exclusive file lock (`/tmp/atlasbasket-deploy.lock`) to prevent concurrent executions between GitHub Actions and manual runs.
2. **Preflight Checks**:
   - Validates Docker daemon responsiveness.
   - Checks that free disk space is at least 2,048 MB.
   - Validates existence of `secrets/backend.env` (never prints secrets).
   - Validates that `atlasbasket-postgres` and `atlasbasket-vm-redis` are actively running (missing dependencies immediately block deployment with exit code 1; neither container is touched).
3. **Sequential Builds**:
   - Builds `Dockerfile.customer`, `Dockerfile.seller`, `Dockerfile.admin`, `Dockerfile.delivery`, and `Dockerfile.payment` one by one using Docker BuildKit.
   - Tags images with the full immutable Git commit SHA (`atlasbasket-<service>:${COMMIT_SHA}`) and `:latest`.
   - Sequential execution keeps memory consumption at $\sim$1 GB, protecting the 7.4 GB RAM VM against OOM killer kills.
4. **Deliberate Migration & Rolling Replacement**:
   - For each service:
     - Tags running container image as `${img_name}:rollback-backup`.
     - Records the service into `TRACKED_UPDATES`.
     - Starts downtime stopwatch (`STOP_START_TIME`).
     - Stops the container and renames it to `atlasbasket-vm-<service>-prev` (clears container name conflict).
     - Deploys replacement container using canonical Docker Compose:
       `IMAGE_TAG=${COMMIT_SHA} docker compose -f backend/compose.vm.yml up -d <service>`
     - Polls `http://127.0.0.1:<port>/health` (up to 40s timeout).
     - Calculates and logs actual measured downtime:
       `STOP_END_TIME - STOP_START_TIME`.
5. **Finalization**:
   - Only after **all 5 services** are confirmed healthy:
     - Removes temporary `-prev` backup containers.
     - Persists deployment record to `~apps/atlasbasket/.deployment_manifest.json`.
     - Releases flock and exits 0.

---

## 3. Rollback Architecture

### Automated In-Flight Rollback
If any image build, container stop/rename, compose up, or health check fails:
- Error trap invokes `execute_targeted_rollback`.
- The trap is immediately disabled (`trap '' ERR EXIT`) and guarded by `IN_ROLLBACK` to avoid recursive error loops.
- Rollback operates **strictly on services in `TRACKED_UPDATES`** in reverse order:
  - Stops and removes the failed replacement container.
  - Renames `atlasbasket-vm-<service>-prev` back to `atlasbasket-vm-<service>` and restarts it.
- **Untouched services are never modified**, preventing accidental rollout of stale images.
- Deployment exits with code 1, marking the GitHub Actions run as RED.

### Manual Rollback (Post-Deployment)
When an issue is discovered after a successful deployment (when `-prev` containers have been cleaned up):
```bash
ssh sathwik-atlasbasket@192.168.122.90
cd /home/sathwik-atlasbasket/apps/atlasbasket

# Roll back to immediate previous working release (:rollback-backup):
bash backend/scripts/rollback.sh

# Or roll back to a specific immutable Git commit SHA:
bash backend/scripts/rollback.sh <COMMIT_SHA>
```

---

## 4. Self-Hosted Runner Setup (One-Time)

The GitHub runner runs on the AtlasBasket Ubuntu VM as a persistent systemd service.

### Security Implications of Docker Access
Adding user `sathwik-atlasbasket` to the `docker` group grants access to `/var/run/docker.sock`. Because Docker commands can mount host root directories, docker group access is equivalent to root-level execution. To secure this:
- The runner must **never** be used for public pull-request workflows.
- Workflow triggers are restricted to pushes on `refs/heads/main` in `STARTUP-GIT/E-Commerce-Startup`.
- The runner communicates outbound over HTTPS (port 443). **No inbound ports or public SSH access are required.**

### Installation Steps

```bash
# 1. SSH into the VM as sathwik-atlasbasket
ssh sathwik-atlasbasket@192.168.122.90

# 2. Confirm user is in docker group
sudo usermod -aG docker sathwik-atlasbasket
newgrp docker
docker ps

# 3. Download and extract runner
mkdir -p /home/sathwik-atlasbasket/actions-runner
cd /home/sathwik-atlasbasket/actions-runner
curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/download/v2.322.0/actions-runner-linux-x64-2.322.0.tar.gz
tar xzf ./actions-runner-linux-x64.tar.gz

# 4. Configure runner with required label
# (Obtain token from GitHub -> Settings -> Actions -> Runners -> New runner)
./config.sh \
  --url https://github.com/STARTUP-GIT/E-Commerce-Startup \
  --token <REGISTRATION_TOKEN> \
  --name atlasbasket-virtual-machine \
  --labels atlasbasket-prod \
  --work _work \
  --unattended

# 5. Install and start persistent systemd service
sudo ./svc.sh install sathwik-atlasbasket
sudo ./svc.sh start
sudo ./svc.sh status
```

---

## 5. GitHub Environment & Security Configuration

To enable deployment approvals and protect the production VM:
1. In `https://github.com/STARTUP-GIT/E-Commerce-Startup`, go to **Settings** $\rightarrow$ **Environments**.
2. Click **New environment** and enter name: `production`.
3. Configure **Deployment protection rules**:
   - Check **Required reviewers** and add repository administrators.
   - Under **Deployment branches**, select **Selected branches** $\rightarrow$ Add `main`.
4. Save protection rules. Now, whenever code is pushed to `main`, GitHub Actions will pause for administrator confirmation before dispatching commands to the runner.

---

## 6. Recovery After VM or Runner Reboot

- The runner service starts automatically on boot via `systemd` (`actions.runner.*`).
- Production containers (`atlasbasket-postgres`, `atlasbasket-vm-redis`, and all 5 APIs) have `restart: unless-stopped`, so Docker restores them automatically on reboot.
- If the runner service is stopped:
  ```bash
  sudo systemctl restart actions.runner.STARTUP-GIT-E-Commerce-Startup.atlasbasket-virtual-machine.service
  ```

---

## 7. Troubleshooting & Disaster Recovery

### What to do if Rollback Itself Fails
If a severe OS or filesystem issue prevents automated rollback:
1. Check container states:
   ```bash
   docker ps -a --filter "name=atlasbasket-vm-"
   ```
2. If `-prev` containers exist:
   ```bash
   # Manually restore original container:
   docker rm -f atlasbasket-vm-customer-api
   docker rename atlasbasket-vm-customer-api-prev atlasbasket-vm-customer-api
   docker start atlasbasket-vm-customer-api
   ```
3. If containers were removed, re-launch from known-good backup images:
   ```bash
   cd /home/sathwik-atlasbasket/apps/atlasbasket/backend
   IMAGE_TAG="rollback-backup" docker compose -f compose.vm.yml up -d
   ```
4. Check logs for failures:
   ```bash
   docker logs --tail 100 atlasbasket-vm-customer-api
   ```
