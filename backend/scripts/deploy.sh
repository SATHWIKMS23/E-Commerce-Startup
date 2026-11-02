#!/usr/bin/env bash
# ==============================================================================
# AtlasBasket Production Backend Deployment Script
# Target Host: Ubuntu VM (atlasbasket-virtual-machine / 192.168.122.90)
#
# Sequential builds, zero-downtime rolling update, health verification,
# and automatic rollback on failure.
# ==============================================================================

set -euo pipefail

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

# Service definitions: service_name | container_name | image_name | dockerfile | port
SERVICES=(
  "customer-api|atlasbasket-vm-customer-api|atlasbasket-customer-api|Dockerfile.customer|3001"
  "seller-api|atlasbasket-vm-seller-api|atlasbasket-seller-api|Dockerfile.seller|3002"
  "admin-api|atlasbasket-vm-admin-api|atlasbasket-admin-api|Dockerfile.admin|3003"
  "delivery-api|atlasbasket-vm-delivery-api|atlasbasket-delivery-api|Dockerfile.delivery|3004"
  "payment-api|atlasbasket-vm-payment-api|atlasbasket-payment-api|Dockerfile.payment|3005"
)

# ------------------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------------------
log_info() {
  echo -e "\033[1;34m[INFO]\033[0m $*"
}

log_ok() {
  echo -e "\033[1;32m[OK]\033[0m $*"
}

log_warn() {
  echo -e "\033[1;33m[WARN]\033[0m $*"
}

log_err() {
  echo -e "\033[1;31m[ERROR]\033[0m $*" >&2
}

http_get_check() {
  local url="$1"
  if command -v curl >/dev/null 2>&1; then
    curl -s -f -m 3 "$url" >/dev/null 2>&1
  elif command -v wget >/dev/null 2>&1; then
    wget -q -T 3 -O /dev/null "$url" >/dev/null 2>&1
  else
    # Fallback to Node.js built-in fetch if neither curl nor wget is found
    node -e "fetch('$url').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" >/dev/null 2>&1
  fi
}

# ------------------------------------------------------------------------------
# 1. Pre-Flight Checks
# ------------------------------------------------------------------------------
echo "===================================================================="
echo " Starting AtlasBasket Production Backend Deployment"
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
log_ok "Using compose engine: ${COMPOSE_CMD}"

# Verify secrets file exists without echoing its contents
if [ ! -f "${SECRETS_FILE}" ]; then
  log_err "Production secrets file missing at: ${SECRETS_FILE}"
  log_err "Deployment cannot continue without production credentials."
  exit 1
fi
log_ok "Production secrets file verified at: ${SECRETS_FILE}"

# Verify Docker daemon is responsive
if ! docker info >/dev/null 2>&1; then
  log_err "Cannot communicate with Docker daemon. Verify user permissions."
  exit 1
fi
log_ok "Docker daemon responsive."

# Verify Docker network exists
if ! docker network inspect "${DOCKER_NETWORK}" >/dev/null 2>&1; then
  log_warn "Network '${DOCKER_NETWORK}' not found. Creating..."
  docker network create "${DOCKER_NETWORK}"
fi
log_ok "Docker network '${DOCKER_NETWORK}' confirmed."

# Verify Redis dependency is alive
if docker ps --format '{{.Names}}' | grep -q "^atlasbasket-vm-redis$"; then
  log_ok "Redis dependency (atlasbasket-vm-redis) is running."
else
  log_warn "Redis container 'atlasbasket-vm-redis' is not active. Services will wait or connect once started."
fi

# ------------------------------------------------------------------------------
# 2. Preserve Rollback Capability (Backup Current Images)
# ------------------------------------------------------------------------------
echo "--------------------------------------------------------------------"
log_info "Creating rollback backup tags for existing containers..."
declare -A HAS_BACKUP

for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port <<< "${entry}"
  
  if docker ps -a --format '{{.Names}}' | grep -q "^${c_name}$"; then
    CURRENT_IMAGE_ID=$(docker inspect --format='{{.Image}}' "${c_name}" 2>/dev/null || true)
    if [ -n "${CURRENT_IMAGE_ID}" ]; then
      docker tag "${CURRENT_IMAGE_ID}" "${img_name}:rollback-backup"
      HAS_BACKUP["${s_name}"]="true"
      log_ok "Backed up ${c_name} image (${CURRENT_IMAGE_ID:0:12}) -> ${img_name}:rollback-backup"
    else
      HAS_BACKUP["${s_name}"]="false"
      log_warn "Could not resolve image ID for existing ${c_name}."
    fi
  else
    HAS_BACKUP["${s_name}"]="false"
    log_info "No previous container found for ${c_name} (initial deploy)."
  fi
done

# ------------------------------------------------------------------------------
# 3. Build Five Backend Images Sequentially
# ------------------------------------------------------------------------------
# VM has 7.4 GB RAM and 4 vCPUs. Building sequentially prevents OOM kills.
echo "--------------------------------------------------------------------"
log_info "Building 5 backend images sequentially to conserve memory..."

build_idx=1
for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port <<< "${entry}"
  
  echo ""
  log_info "[${build_idx}/5] Building image: ${img_name}:latest from ${d_file}..."
  
  DOCKER_BUILDKIT=1 docker build \
    --file "${BACKEND_DIR}/${d_file}" \
    --tag "${img_name}:latest" \
    --tag "${img_name}:${COMMIT_SHA}" \
    "${BACKEND_DIR}"
  
  log_ok "[${build_idx}/5] Successfully built ${img_name}:latest"
  build_idx=$((build_idx + 1))
done

# ------------------------------------------------------------------------------
# 4. Synchronize VM App Directory (Keep /apps/atlasbasket in sync)
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
# 5. Rollout Update to Containers Using Compose
# ------------------------------------------------------------------------------
echo "--------------------------------------------------------------------"
log_info "Deploying updated backend containers..."
# Extract service names for compose command
COMPOSE_SERVICES=()
for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port <<< "${entry}"
  COMPOSE_SERVICES+=("${s_name}")
done

# We explicitly pass --no-deps so Redis or any dependency is NEVER touched or restarted!
${COMPOSE_CMD} -f "${COMPOSE_FILE}" up -d --no-deps "${COMPOSE_SERVICES[@]}"
log_ok "Container recreate and start commands issued."

# ------------------------------------------------------------------------------
# 6. Verification & Health Checks
# ------------------------------------------------------------------------------
echo "--------------------------------------------------------------------"
log_info "Verifying health of all five backend APIs..."

DEPLOYMENT_FAILED=0
FAILED_SERVICE=""
MAX_RETRIES=20
RETRY_DELAY=2

for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port <<< "${entry}"
  
  log_info "Checking ${s_name} on port ${port} (max wait: $((MAX_RETRIES * RETRY_DELAY))s)..."
  service_healthy=0
  
  for attempt in $(seq 1 ${MAX_RETRIES}); do
    # Check localhost port binding
    if http_get_check "http://127.0.0.1:${port}/health"; then
      log_ok "  -> ${s_name} is HEALTHY on http://127.0.0.1:${port}/health (attempt ${attempt})"
      
      # Verify reachability via VM IP for Cloudflare Tunnel
      if http_get_check "http://${VM_IP}:${port}/health"; then
        log_ok "  -> ${s_name} is reachable on VM IP http://${VM_IP}:${port}/health"
      else
        log_warn "  -> http://${VM_IP}:${port}/health did not respond immediately, but localhost responded."
      fi
      
      service_healthy=1
      break
    fi
    sleep ${RETRY_DELAY}
  done
  
  if [ "${service_healthy}" -eq 0 ]; then
    log_err "Health check failed for ${s_name} on port ${port} after ${MAX_RETRIES} attempts!"
    DEPLOYMENT_FAILED=1
    FAILED_SERVICE="${s_name}"
    break
  fi
done

# ------------------------------------------------------------------------------
# 7. Rollback on Failure or Finalize on Success
# ------------------------------------------------------------------------------
if [ "${DEPLOYMENT_FAILED}" -ne 0 ]; then
  echo ""
  echo "===================================================================="
  log_err "DEPLOYMENT FAILED on service: ${FAILED_SERVICE}"
  echo "===================================================================="
  
  # Dump container logs for troubleshooting in GitHub Actions log
  for entry in "${SERVICES[@]}"; do
    IFS="|" read -r s_name c_name img_name d_file port <<< "${entry}"
    if [ "${s_name}" == "${FAILED_SERVICE}" ]; then
      echo "--- Recent logs for failing container (${c_name}) ---"
      docker logs --tail 80 "${c_name}" 2>&1 || true
      echo "------------------------------------------------------"
    fi
  done
  
  echo ""
  log_warn "Initiating automatic rollback to previous working containers..."
  
  rollback_count=0
  for entry in "${SERVICES[@]}"; do
    IFS="|" read -r s_name c_name img_name d_file port <<< "${entry}"
    if [ "${HAS_BACKUP[${s_name}]:-false}" == "true" ]; then
      if docker image inspect "${img_name}:rollback-backup" >/dev/null 2>&1; then
        docker tag "${img_name}:rollback-backup" "${img_name}:latest"
        rollback_count=$((rollback_count + 1))
        log_info "Restored tag ${img_name}:latest from rollback-backup."
      fi
    fi
  done
  
  if [ "${rollback_count}" -gt 0 ]; then
    log_info "Restarting containers with previous images..."
    ${COMPOSE_CMD} -f "${COMPOSE_FILE}" up -d --no-deps "${COMPOSE_SERVICES[@]}"
    log_warn "Rollback deployment completed. Verification of restored containers:"
    for entry in "${SERVICES[@]}"; do
      IFS="|" read -r s_name c_name img_name d_file port <<< "${entry}"
      if http_get_check "http://127.0.0.1:${port}/health"; then
        log_ok "  Restored ${s_name} is healthy."
      else
        log_err "  Restored ${s_name} could not be confirmed."
      fi
    done
  else
    log_warn "No rollback-backup tags available to restore."
  fi
  
  log_err "Production deployment failed. Check GitHub Actions logs above."
  exit 1
fi

# ------------------------------------------------------------------------------
# 8. Success Report
# ------------------------------------------------------------------------------
echo ""
echo "===================================================================="
log_ok "ALL 5 BACKEND SERVICES DEPLOYED AND VERIFIED HEALTHY!"
echo "===================================================================="
docker ps --filter "name=atlasbasket-vm-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "===================================================================="
log_ok "AtlasBasket backend CI/CD pipeline finished successfully."
exit 0

