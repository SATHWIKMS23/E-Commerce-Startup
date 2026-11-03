#!/usr/bin/env bash
# ==============================================================================
# AtlasBasket Production Backend Deployment Script
# Target Host: Ubuntu VM (atlasbasket-virtual-machine / 192.168.122.90)
#
# Deployment Strategy:
#   Safe sequential rolling container replacement with brief service restart
#   window (typically 2-4 seconds per service).
#   Includes safe transition from manual `docker run` containers, error trapping,
#   and full-fleet rollback on ANY failure.
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

# Tracking state for partial updates and rollback
TRACKED_UPDATES=()
ROLLBACK_EXECUTED=0

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
# Rollback Function: Restores ALL partially updated services to previous state
# ------------------------------------------------------------------------------
execute_full_fleet_rollback() {
  if [ "${ROLLBACK_EXECUTED}" -eq 1 ]; then
    return 0
  fi
  ROLLBACK_EXECUTED=1

  echo ""
  echo "===================================================================="
  log_err "CRITICAL: DEPLOYMENT FAILURE DETECTED"
  log_err "Initiating automatic full-fleet rollback..."
  log_err "Restoring ALL partially updated services to ensure consistent state."
  echo "===================================================================="

  # Iterate backwards through all services that had update attempts
  for (( i=${#SERVICES[@]}-1; i>=0; i-- )); do
    local entry="${SERVICES[$i]}"
    IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"

    # Check if a -prev backup container exists for this service
    if docker ps -a --format '{{.Names}}' | grep -q "^${c_name}-prev\$"; then
      log_warn "Restoring ${s_name} from previous container ${c_name}-prev..."
      # Stop and remove the failed new container if it exists
      docker stop "${c_name}" >/dev/null 2>&1 || true
      docker rm -f "${c_name}" >/dev/null 2>&1 || true
      # Restore original container
      docker rename "${c_name}-prev" "${c_name}"
      docker start "${c_name}" >/dev/null 2>&1 || true
      log_ok "Restored original ${c_name}."
    elif docker image inspect "${img_name}:rollback-backup" >/dev/null 2>&1; then
      log_warn "Restoring ${s_name} from backup image tag ${img_name}:rollback-backup..."
      docker stop "${c_name}" >/dev/null 2>&1 || true
      docker rm -f "${c_name}" >/dev/null 2>&1 || true
      docker tag "${img_name}:rollback-backup" "${img_name}:latest"
      # Re-launch container with preserved production settings
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
      log_ok "Re-launched ${c_name} from backup image."
    fi
  done

  echo "--------------------------------------------------------------------"
  log_info "Verifying health of restored services..."
  local fleet_healthy=1
  for entry in "${SERVICES[@]}"; do
    IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"
    if http_get_check "http://127.0.0.1:${port}/health"; then
      log_ok "  -> Restored ${s_name} is HEALTHY on port ${port}."
    else
      log_err "  -> Restored ${s_name} failed to respond on port ${port}!"
      fleet_healthy=0
    fi
  done

  if [ "${fleet_healthy}" -eq 1 ]; then
    log_ok "Fleet rollback completed successfully. All services restored to previous release."
  else
    log_err "Fleet rollback encountered issues on some containers. Check container status manually."
  fi

  echo "===================================================================="
  log_err "Deployment aborted. GitHub Actions status set to FAILED."
  echo "===================================================================="
  exit 1
}

# Trap unexpected script errors or signals and trigger full rollback
on_unexpected_error() {
  local exit_code="$1"
  local line_no="$2"
  log_err "Script encountered unexpected error (exit code: ${exit_code}) at line ${line_no}."
  execute_full_fleet_rollback
}
trap 'on_unexpected_error $? $LINENO' ERR

# ------------------------------------------------------------------------------
# 1. Pre-Flight Checks
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

# Verify PostgreSQL dependency is running (Do NOT touch, stop, or recreate)
if docker ps --format '{{.Names}}' | grep -q "^atlasbasket-postgres$"; then
  log_ok "PostgreSQL container (atlasbasket-postgres) is running. (Unmanaged, untouched)"
else
  log_warn "PostgreSQL container 'atlasbasket-postgres' is not active in 'docker ps'."
fi

# Verify Redis dependency is running (Do NOT touch, stop, or recreate)
if docker ps --format '{{.Names}}' | grep -q "^atlasbasket-vm-redis$"; then
  log_ok "Redis container (atlasbasket-vm-redis) is running. (Unmanaged, untouched)"
else
  log_warn "Redis container 'atlasbasket-vm-redis' is not active in 'docker ps'."
fi

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
    log_err "Build failed for ${img_name}! Running containers are untouched."
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
# 4. Safe Rolling Replacement with Health Verification & Automatic Rollback
# ------------------------------------------------------------------------------
echo "--------------------------------------------------------------------"
log_info "Starting safe rolling replacement of the 5 backend API services..."
log_info "Note: Brief restart window occurs per service while binding to ports."

MAX_RETRIES=20
RETRY_DELAY=2

for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"
  echo ""
  log_info "===================================================================="
  log_info "Processing service: ${s_name} (Port: ${port})"
  log_info "===================================================================="

  # Step A: Backup existing image tag if container is present
  if docker ps -a --format '{{.Names}}' | grep -q "^${c_name}\$"; then
    CURRENT_IMG_ID=$(docker inspect --format='{{.Image}}' "${c_name}" 2>/dev/null || true)
    if [ -n "${CURRENT_IMG_ID}" ]; then
      docker tag "${CURRENT_IMG_ID}" "${img_name}:rollback-backup" 2>/dev/null || true
      log_ok "Backed up running image (${CURRENT_IMG_ID:0:12}) -> ${img_name}:rollback-backup"
    fi

    # Step B: Safe Transition - Stop & Rename existing container to avoid name conflicts
    log_info "Stopping and renaming existing container ${c_name} -> ${c_name}-prev..."
    # Remove any stale -prev container from a previous completed run if left behind
    docker rm -f "${c_name}-prev" >/dev/null 2>&1 || true
    docker stop "${c_name}" >/dev/null 2>&1 || true
    docker rename "${c_name}" "${c_name}-prev"
    log_ok "Container ${c_name} renamed to ${c_name}-prev. Container name is now free."
  else
    log_info "No existing container named ${c_name} found (initial deployment for this service)."
  fi

  # Record that this service has entered update state
  TRACKED_UPDATES+=("${s_name}")

  # Step C: Launch the new container using Compose (with direct docker run fallback)
  log_info "Launching new ${c_name} container..."
  container_started=0

  # Try starting with Docker Compose
  if ${COMPOSE_CMD} -f "${COMPOSE_FILE}" up -d "${s_name}" >/dev/null 2>&1; then
    log_ok "Container ${c_name} launched via Compose."
    container_started=1
  else
    log_warn "Compose launch failed for ${s_name}; deploying via direct docker run..."
    if docker run -d \
      --name "${c_name}" \
      --restart unless-stopped \
      --network "${DOCKER_NETWORK}" \
      -p "0.0.0.0:${port}:${port}" \
      --env-file "${SECRETS_FILE}" \
      -e HOST=0.0.0.0 \
      -e PORT="${port}" \
      -e "${env_var}=${port}" \
      "${img_name}:latest" >/dev/null 2>&1; then
      log_ok "Container ${c_name} launched via direct docker run."
      container_started=1
    else
      log_err "Failed to launch new container for ${s_name}!"
      execute_full_fleet_rollback
    fi
  fi

  # Step D: Health Verification for this service
  log_info "Verifying health of ${s_name} on port ${port} (timeout: $((MAX_RETRIES * RETRY_DELAY))s)..."
  service_healthy=0

  for attempt in $(seq 1 ${MAX_RETRIES}); do
    if http_get_check "http://127.0.0.1:${port}/health"; then
      log_ok "  -> ${s_name} is HEALTHY on http://127.0.0.1:${port}/health (attempt ${attempt})"

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

  # If health verification failed, trigger full rollback of ALL updated services
  if [ "${service_healthy}" -eq 0 ]; then
    log_err "Health verification failed for ${s_name} on port ${port} after ${MAX_RETRIES} attempts!"
    echo "--- Recent logs for failing container (${c_name}) ---"
    docker logs --tail 80 "${c_name}" 2>&1 || true
    echo "------------------------------------------------------"
    execute_full_fleet_rollback
  fi

  log_ok "Service ${s_name} successfully updated and verified healthy."
done

# ------------------------------------------------------------------------------
# 5. Finalization & Cleanup (Only executed when ALL 5 services are healthy)
# ------------------------------------------------------------------------------
echo ""
echo "===================================================================="
log_ok "ALL 5 BACKEND SERVICES DEPLOYED AND VERIFIED HEALTHY!"
echo "===================================================================="

# Safely clean up temporary -prev containers now that the entire fleet is confirmed healthy
log_info "Cleaning up temporary -prev backup containers..."
for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"
  docker rm -f "${c_name}-prev" >/dev/null 2>&1 || true
done
log_ok "Temporary backup containers cleaned up. Image rollback tags preserved."

echo ""
echo "Current Production Backend Containers:"
docker ps --filter "name=atlasbasket-vm-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "===================================================================="
log_ok "AtlasBasket backend CI/CD pipeline finished successfully."
exit 0
