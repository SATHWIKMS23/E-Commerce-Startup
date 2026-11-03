#!/usr/bin/env bash
# ==============================================================================
# AtlasBasket Production Backend Deployment Script
# Target Host: Ubuntu VM (atlasbasket-virtual-machine / 192.168.122.90)
#
# Key Safety Principles:
#   1. Sequential image builds (1 image at a time) to protect 7.4 GB RAM.
#   2. Preflight checks strictly block deployment if Postgres or Redis is down.
#   3. Containers inspected before replacement to verify & preserve runtime config.
#   4. Safe transition: existing containers renamed to -prev to eliminate conflicts.
#   5. Measured downtime reporting per service (no speculative hardcoded numbers).
#   6. Rollback operates EXCLUSIVELY on services actually modified in this run.
#   7. Recursive error handling disabled during rollback to guarantee completion.
# ==============================================================================

set -uo pipefail

# ------------------------------------------------------------------------------
# Configuration & Paths
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/.." && pwd)"
COMPOSE_FILE="${BACKEND_DIR}/compose.vm.yml"
SECRETS_FILE="/home/sathwik-atlasbasket/apps/atlasbasket/secrets/backend.env"
VM_REPO_PATH="/home/sathwik-atlasbasket/apps/atlasbasket"
DEPLOY_MANIFEST="${VM_REPO_PATH}/.deployment_manifest.json"
DOCKER_NETWORK="atlasbasket-vm-net"
VM_IP="192.168.122.90"
COMMIT_SHA="${GITHUB_SHA:-$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || echo 'manual')}"

# Service definitions:
# service_name | container_name | image_name | dockerfile | port | env_port_var
SERVICES=(
  "customer-api|atlasbasket-vm-customer-api|atlasbasket-customer-api|Dockerfile.customer|3001|CUSTOMER_PORT"
  "seller-api|atlasbasket-vm-seller-api|atlasbasket-seller-api|Dockerfile.seller|3002|SELLER_PORT"
  "admin-api|atlasbasket-vm-admin-api|atlasbasket-admin-api|Dockerfile.admin|3003|ADMIN_PORT"
  "delivery-api|atlasbasket-vm-delivery-api|atlasbasket-delivery-api|Dockerfile.delivery|3004|DELIVERY_PORT"
  "payment-api|atlasbasket-vm-payment-api|atlasbasket-payment-api|Dockerfile.payment|3005|PAYMENT_PORT"
)

# Array tracking ONLY services that were actually modified in this deployment run
TRACKED_UPDATES=()
IN_ROLLBACK=0

# ------------------------------------------------------------------------------
# Logging & Network Helpers
# ------------------------------------------------------------------------------
log_info() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
log_ok()   { echo -e "\033[1;32m[OK]\033[0m $*"; }
log_warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
log_err()  { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }

http_get_check() {
  local url="$1"
  if command -v curl >/dev/null 2>&1; then
    curl -s -f -m 3 "$url" >/dev/null 2>&1
  elif command -v wget >/dev/null 2>&1; then
    wget -q -T 3 -O /dev/null "$url" >/dev/null 2>&1
  else
    node -e "fetch('$url').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" >/dev/null 2>&1
  fi
}

# ------------------------------------------------------------------------------
# Rollback Function: Restores EXCLUSIVELY services modified during this run
# ------------------------------------------------------------------------------
execute_targeted_rollback() {
  # Prevent recursive error handler execution
  trap '' ERR EXIT
  if [ "${IN_ROLLBACK}" -eq 1 ]; then
    return 1
  fi
  IN_ROLLBACK=1

  echo ""
  echo "===================================================================="
  log_err "CRITICAL: DEPLOYMENT FAILURE DETECTED"
  log_err "Executing safe rollback on modified services..."
  echo "===================================================================="

  if [ ${#TRACKED_UPDATES[@]} -eq 0 ]; then
    log_info "No containers were modified prior to failure. Nothing to roll back."
    exit 1
  fi

  log_warn "Services modified during this run that require rollback: ${TRACKED_UPDATES[*]}"

  # Iterate backwards ONLY through services that were actually modified
  for (( i=${#TRACKED_UPDATES[@]}-1; i>=0; i-- )); do
    local modified_service="${TRACKED_UPDATES[$i]}"

    # Find service metadata
    for entry in "${SERVICES[@]}"; do
      IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"
      if [ "${s_name}" == "${modified_service}" ]; then
        log_warn "Rolling back service: ${s_name} (${c_name})..."

        # Step 1: Remove the failed replacement container if present
        docker stop "${c_name}" >/dev/null 2>&1 || true
        docker rm -f "${c_name}" >/dev/null 2>&1 || true

        # Step 2: If -prev container exists, restore and start it directly
        if docker ps -a --format '{{.Names}}' | grep -q "^${c_name}-prev\$"; then
          log_info "  -> Restoring from preserved container: ${c_name}-prev"
          docker rename "${c_name}-prev" "${c_name}" >/dev/null 2>&1 || true
          docker start "${c_name}" >/dev/null 2>&1 || true
        elif docker image inspect "${img_name}:rollback-backup" >/dev/null 2>&1; then
          # Fallback to rollback-backup image if -prev is absent
          log_info "  -> Restoring from backup image: ${img_name}:rollback-backup"
          docker tag "${img_name}:rollback-backup" "${img_name}:latest" >/dev/null 2>&1 || true
          docker run -d \
            --name "${c_name}" \
            --restart unless-stopped \
            --network "${DOCKER_NETWORK}" \
            -p "0.0.0.0:${port}:${port}" \
            --env-file "${SECRETS_FILE}" \
            -e HOST=0.0.0.0 \
            -e PORT="${port}" \
            -e "${env_var}=${port}" \
            "${img_name}:latest" >/dev/null 2>&1 || true
        else
          log_err "  -> No -prev container or backup image found for ${s_name}!"
        fi

        # Verify restored service health
        if http_get_check "http://127.0.0.1:${port}/health"; then
          log_ok "  -> ${s_name} restored and HEALTHY on port ${port}."
        else
          log_err "  -> Restored ${s_name} did not respond on port ${port}."
        fi
        break
      fi
    done
  done

  echo "===================================================================="
  log_err "Rollback routine finished. Production deployment failed."
  echo "===================================================================="
  exit 1
}

# Trap unexpected script errors and trigger targeted rollback without recursion
on_script_failure() {
  local exit_code="$1"
  local line_no="$2"
  log_err "Deployment script failed (exit code: ${exit_code}) at line ${line_no}."
  execute_targeted_rollback
}
trap 'on_script_failure $? $LINENO' ERR

# ------------------------------------------------------------------------------
# 1. Pre-Flight Checks & Dependency Validation (Deployment-Blocking)
# ------------------------------------------------------------------------------
echo "===================================================================="
echo " AtlasBasket Production Backend Deployment"
echo " Host:   atlasbasket-virtual-machine (${VM_IP})"
echo " Commit: ${COMMIT_SHA}"
echo " Time:   $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "===================================================================="

# Determine Docker Compose command
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  log_err "Neither 'docker compose' nor 'docker-compose' command was found."
  exit 1
fi
log_ok "Compose engine detected: ${COMPOSE_CMD}"

# Verify secrets file exists without printing its contents
if [ ! -f "${SECRETS_FILE}" ]; then
  log_err "Production secrets file missing at: ${SECRETS_FILE}"
  log_err "Deployment cannot continue without production credentials."
  exit 1
fi
log_ok "Production secrets file confirmed at: ${SECRETS_FILE}"

# Verify Docker daemon is responsive
if ! docker info >/dev/null 2>&1; then
  log_err "Cannot communicate with Docker daemon. Verify user permissions."
  exit 1
fi
log_ok "Docker daemon is active and responsive."

# Verify Docker network exists
if ! docker network inspect "${DOCKER_NETWORK}" >/dev/null 2>&1; then
  log_warn "Network '${DOCKER_NETWORK}' not found. Creating..."
  docker network create "${DOCKER_NETWORK}"
fi
log_ok "Docker network '${DOCKER_NETWORK}' ready."

# Verify PostgreSQL dependency is running (Deployment-blocking, never modify container)
if ! docker ps --format '{{.Names}}' | grep -q "^atlasbasket-postgres$"; then
  log_err "PREFLIGHT ERROR: Container 'atlasbasket-postgres' is NOT running!"
  log_err "PostgreSQL is a required dependency. Deployment is BLOCKED to protect data integrity."
  exit 1
fi
log_ok "PostgreSQL container (atlasbasket-postgres) is running. (Unmanaged, untouched)"

# Verify Redis dependency is running (Deployment-blocking, never modify container)
if ! docker ps --format '{{.Names}}' | grep -q "^atlasbasket-vm-redis$"; then
  log_err "PREFLIGHT ERROR: Container 'atlasbasket-vm-redis' is NOT running!"
  log_err "Redis is a required dependency. Deployment is BLOCKED to protect cache/session integrity."
  exit 1
fi
log_ok "Redis container (atlasbasket-vm-redis) is running. (Unmanaged, untouched)"

# ------------------------------------------------------------------------------
# 2. Sequential Image Builds (7.4 GB RAM / 4 Threads Protection)
# ------------------------------------------------------------------------------
echo "--------------------------------------------------------------------"
log_info "Building 5 backend Docker images sequentially to conserve VM memory..."

build_idx=1
for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"

  echo ""
  log_info "[${build_idx}/5] Building image: ${img_name}:latest from ${d_file}..."

  if ! DOCKER_BUILDKIT=1 docker build \
    --file "${BACKEND_DIR}/${d_file}" \
    --tag "${img_name}:latest" \
    --tag "${img_name}:${COMMIT_SHA}" \
    "${BACKEND_DIR}"; then
    log_err "Build failed for ${img_name}! Running containers remain completely untouched."
    exit 1
  fi

  log_ok "[${build_idx}/5] Successfully built ${img_name}:latest"
  build_idx=$((build_idx + 1))
done

# ------------------------------------------------------------------------------
# 3. Synchronize VM App Directory Files (Non-destructive to /secrets/)
# ------------------------------------------------------------------------------
if [ -d "${VM_REPO_PATH}" ] && [ "$(realpath "${REPO_ROOT}")" != "$(realpath "${VM_REPO_PATH}")" ]; then
  log_info "Syncing updated compose and scripts to ${VM_REPO_PATH}..."
  mkdir -p "${VM_REPO_PATH}/backend/scripts"
  cp "${COMPOSE_FILE}" "${VM_REPO_PATH}/backend/compose.vm.yml" 2>/dev/null || true
  cp "${SCRIPT_DIR}/deploy.sh" "${VM_REPO_PATH}/backend/scripts/deploy.sh" 2>/dev/null || true
  if [ -f "${SCRIPT_DIR}/rollback.sh" ]; then
    cp "${SCRIPT_DIR}/rollback.sh" "${VM_REPO_PATH}/backend/scripts/rollback.sh" 2>/dev/null || true
  fi
  chmod +x "${VM_REPO_PATH}/backend/scripts/"*.sh 2>/dev/null || true
  log_ok "VM app repository compose and scripts synchronized."
fi

# ------------------------------------------------------------------------------
# 4. Container Inspection, Safe Transition & Measured Downtime Rollout
# ------------------------------------------------------------------------------
echo "--------------------------------------------------------------------"
log_info "Starting safe rolling replacement of the 5 backend API services..."

MAX_RETRIES=20
RETRY_DELAY=2
MANIFEST_DATA="{"

for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"
  echo ""
  log_info "===================================================================="
  log_info "Processing service: ${s_name} (Port: ${port})"
  log_info "===================================================================="

  # Step A: Deep inspection of existing container to preserve runtime settings
  PREV_IMAGE_ID=""
  EXISTING_BINDS=""
  EXISTING_NET="${DOCKER_NETWORK}"

  if docker ps -a --format '{{.Names}}' | grep -q "^${c_name}\$"; then
    log_info "Inspecting existing container ${c_name}..."
    PREV_IMAGE_ID=$(docker inspect --format='{{.Image}}' "${c_name}" 2>/dev/null || echo "")
    EXISTING_NET=$(docker inspect --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' "${c_name}" 2>/dev/null || echo "${DOCKER_NETWORK}")
    EXISTING_BINDS=$(docker inspect --format='{{range .HostConfig.Binds}}{{.}} {{end}}' "${c_name}" 2>/dev/null || echo "")

    # Preserve current image as rollback-backup tag
    if [ -n "${PREV_IMAGE_ID}" ]; then
      docker tag "${PREV_IMAGE_ID}" "${img_name}:rollback-backup" 2>/dev/null || true
      log_ok "Saved rollback backup tag: ${img_name}:rollback-backup (${PREV_IMAGE_ID:0:12})"
    fi

    # Record image ID into manifest for manual post-deployment rollback
    MANIFEST_DATA="${MANIFEST_DATA}\"${s_name}\":{\"prev_image\":\"${PREV_IMAGE_ID}\",\"new_commit\":\"${COMMIT_SHA}\"},"

    # Step B: Record this service as officially being updated
    TRACKED_UPDATES+=("${s_name}")

    # Step C: Safe Transition - Stop & Rename existing container to eliminate name conflicts
    log_info "Stopping and renaming existing container ${c_name} -> ${c_name}-prev..."
    docker rm -f "${c_name}-prev" >/dev/null 2>&1 || true

    # Start timing service interruption
    STOP_START_TIME=$(date +%s)

    if ! docker stop "${c_name}" >/dev/null 2>&1; then
      log_err "Failed to stop ${c_name}! Triggering rollback."
      execute_targeted_rollback
    fi

    if ! docker rename "${c_name}" "${c_name}-prev" >/dev/null 2>&1; then
      log_err "Failed to rename ${c_name} to ${c_name}-prev! Triggering rollback."
      docker start "${c_name}" >/dev/null 2>&1 || true
      execute_targeted_rollback
    fi
    log_ok "Container ${c_name} renamed to ${c_name}-prev. Name is now free."
  else
    log_info "No existing container named ${c_name} found (initial deployment)."
    TRACKED_UPDATES+=("${s_name}")
    STOP_START_TIME=$(date +%s)
  fi

  # Step D: Launch the new container using Compose (with direct docker run fallback)
  log_info "Launching new ${c_name} container..."
  container_started=0

  # Attempt launch via Docker Compose
  if ${COMPOSE_CMD} -f "${COMPOSE_FILE}" up -d "${s_name}" >/dev/null 2>&1; then
    log_ok "Container ${c_name} launched via Compose."
    container_started=1
  else
    log_warn "Compose launch failed for ${s_name}; deploying via direct docker run with inspected settings..."
    
    # Construct volume flags from inspected binds if any exist
    VOLUME_FLAGS=()
    if [ -n "${EXISTING_BINDS}" ]; then
      for b in ${EXISTING_BINDS}; do
        VOLUME_FLAGS+=("-v" "${b}")
      done
    fi

    if docker run -d \
      --name "${c_name}" \
      --restart unless-stopped \
      --network "${EXISTING_NET}" \
      -p "0.0.0.0:${port}:${port}" \
      --env-file "${SECRETS_FILE}" \
      -e HOST=0.0.0.0 \
      -e PORT="${port}" \
      -e "${env_var}=${port}" \
      "${VOLUME_FLAGS[@]}" \
      "${img_name}:latest" >/dev/null 2>&1; then
      log_ok "Container ${c_name} launched via direct docker run."
      container_started=1
    else
      log_err "Failed to launch replacement container for ${s_name}!"
      execute_targeted_rollback
    fi
  fi

  # Step E: Health Verification for this service
  log_info "Verifying health of ${s_name} on port ${port} (max wait: $((MAX_RETRIES * RETRY_DELAY))s)..."
  service_healthy=0

  for attempt in $(seq 1 ${MAX_RETRIES}); do
    if http_get_check "http://127.0.0.1:${port}/health"; then
      STOP_END_TIME=$(date +%s)
      MEASURED_DOWNTIME=$(( STOP_END_TIME - STOP_START_TIME ))

      log_ok "  -> ${s_name} is HEALTHY on http://127.0.0.1:${port}/health (attempt ${attempt})"
      log_ok "  -> Measured service downtime interruption: ${MEASURED_DOWNTIME}s"

      # Also verify accessibility via VM IP for Cloudflare Tunnel
      if http_get_check "http://${VM_IP}:${port}/health"; then
        log_ok "  -> ${s_name} is reachable on VM IP http://${VM_IP}:${port}/health"
      else
        log_warn "  -> http://${VM_IP}:${port}/health did not respond immediately, but localhost is healthy."
      fi

      service_healthy=1
      break
    fi
    sleep ${RETRY_DELAY}
  done

  # If health verification failed, trigger rollback of modified services
  if [ "${service_healthy}" -eq 0 ]; then
    log_err "Health verification failed for ${s_name} on port ${port} after ${MAX_RETRIES} attempts!"
    echo "--- Recent logs for failing container (${c_name}) ---"
    docker logs --tail 80 "${c_name}" 2>&1 || true
    echo "------------------------------------------------------"
    execute_targeted_rollback
  fi

  log_ok "Service ${s_name} successfully updated and verified healthy."
done

# ------------------------------------------------------------------------------
# 5. Finalization & Manifest Storage (Only executed when ALL 5 services are healthy)
# ------------------------------------------------------------------------------
echo ""
echo "===================================================================="
log_ok "ALL 5 BACKEND SERVICES DEPLOYED AND VERIFIED HEALTHY!"
echo "===================================================================="

# Safely clean up temporary -prev containers now that the entire deployment is verified
log_info "Cleaning up temporary -prev backup containers..."
for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"
  docker rm -f "${c_name}-prev" >/dev/null 2>&1 || true
done
log_ok "Temporary backup containers cleaned up."

# Store deployment manifest for post-deployment manual rollback
MANIFEST_DATA="${MANIFEST_DATA%,}}"
if [ -d "${VM_REPO_PATH}" ]; then
  echo "${MANIFEST_DATA}" > "${DEPLOY_MANIFEST}" 2>/dev/null || true
fi
log_ok "Rollback image tags (${img_name}:rollback-backup) retained for manual rollback."

echo ""
echo "Current Production Backend Containers:"
docker ps --filter "name=atlasbasket-vm-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "===================================================================="
log_ok "AtlasBasket backend CI/CD pipeline finished successfully."
exit 0
