#!/usr/bin/env bash
# ==============================================================================
# AtlasBasket Production Backend Deployment Script
# Target Host: Ubuntu VM (atlasbasket-virtual-machine / 192.168.122.90)
#
# Canonical Deployment Architecture:
#   - Single canonical deployment mechanism: Docker Compose (backend/compose.vm.yml).
#   - Immutable image tagging using full Git commit SHA (${COMMIT_SHA}).
#   - Sequential Dockerfile builds (1 at a time) conserving 7.4 GB RAM.
#   - Exclusive flock locking (/tmp/atlasbasket-deploy.lock) preventing race conditions.
#   - Pre-flight checks strictly block deployment if Postgres or Redis is down.
#   - Safe transition: existing containers renamed to -prev to eliminate conflicts.
#   - Actual measured downtime reported per service (no speculative estimates).
#   - Rollback operates EXCLUSIVELY on services modified in this deployment run.
#   - Non-recursive error trapping: trap disabled inside rollback handler.
#   - Durable release manifest persisted to disk for manual post-deploy rollback.
# ==============================================================================

set -uo pipefail

# ------------------------------------------------------------------------------
# 1. Configuration & Paths
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/.." && pwd)"
COMPOSE_FILE="${BACKEND_DIR}/compose.vm.yml"
SECRETS_FILE="/home/sathwik-atlasbasket/apps/atlasbasket/secrets/backend.env"
VM_REPO_PATH="/home/sathwik-atlasbasket/apps/atlasbasket"
DEPLOY_MANIFEST="${VM_REPO_PATH}/.deployment_manifest.json"
LOCK_FILE="/tmp/atlasbasket-deploy.lock"
DOCKER_NETWORK="atlasbasket-vm-net"
VM_IP="192.168.122.90"
COMMIT_SHA="${GITHUB_SHA:-$(git -C "${REPO_ROOT}" rev-parse HEAD 2>/dev/null || echo 'manual')}"

# Service definitions:
# service_name | container_name | image_name | dockerfile | port | env_port_var
SERVICES=(
  "customer-api|atlasbasket-vm-customer-api|atlasbasket-customer-api|Dockerfile.customer|3001|CUSTOMER_PORT"
  "seller-api|atlasbasket-vm-seller-api|atlasbasket-seller-api|Dockerfile.seller|3002|SELLER_PORT"
  "admin-api|atlasbasket-vm-admin-api|atlasbasket-admin-api|Dockerfile.admin|3003|ADMIN_PORT"
  "delivery-api|atlasbasket-vm-delivery-api|atlasbasket-delivery-api|Dockerfile.delivery|3004|DELIVERY_PORT"
  "payment-api|atlasbasket-vm-payment-api|atlasbasket-payment-api|Dockerfile.payment|3005|PAYMENT_PORT"
)

# Service lifecycle states:
# UNTOUCHED | STOPPING | ORIGINAL_STOPPED | ORIGINAL_PRESERVED | REPLACEMENT_CREATING | REPLACEMENT_CREATED | REPLACEMENT_HEALTHY
declare -A SERVICE_STATE
for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name _ <<< "${entry}"
  SERVICE_STATE["${s_name}"]="UNTOUCHED"
done

TRACKED_UPDATES=()
IN_ROLLBACK=0

# ------------------------------------------------------------------------------
# 2. Logging & Helper Functions
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
# 3. Targeted Rollback Function (Operates EXCLUSIVELY on Modified Services)
# ------------------------------------------------------------------------------
execute_targeted_rollback() {
  # Disable traps immediately to prevent recursive error handling
  trap '' ERR EXIT
  if [ "${IN_ROLLBACK}" -eq 1 ]; then
    return 1
  fi
  IN_ROLLBACK=1

  echo ""
  echo "===================================================================="
  log_err "CRITICAL: DEPLOYMENT FAILURE DETECTED"
  log_err "Executing safe targeted rollback on modified services..."
  echo "===================================================================="

  if [ ${#TRACKED_UPDATES[@]} -eq 0 ]; then
    log_info "No containers were modified prior to failure. Nothing to roll back."
    exit 1
  fi

  log_warn "Services modified during this run: ${TRACKED_UPDATES[*]}"

  # Iterate backwards ONLY through services that were actually modified
  for (( idx=${#TRACKED_UPDATES[@]}-1; idx>=0; idx-- )); do
    local modified_service="${TRACKED_UPDATES[$idx]}"
    local current_state="${SERVICE_STATE[${modified_service}]:-UNTOUCHED}"

    for entry in "${SERVICES[@]}"; do
      IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"
      if [ "${s_name}" == "${modified_service}" ]; then
        log_warn "Reversing changes for ${s_name} (State: ${current_state})..."

        # Step 1: Remove broken replacement container if created
        if [ "${current_state}" == "REPLACEMENT_CREATED" ] || \
           [ "${current_state}" == "REPLACEMENT_CREATING" ] || \
           [ "${current_state}" == "REPLACEMENT_HEALTHY" ]; then
          log_info "  -> Stopping and removing failed replacement container ${c_name}..."
          docker stop "${c_name}" >/dev/null 2>&1 || true
          docker rm -f "${c_name}" >/dev/null 2>&1 || true
        fi

        # Step 2: Restore the original container
        if docker ps -a --format '{{.Names}}' | grep -q "^${c_name}-prev\$"; then
          log_info "  -> Restoring original container: ${c_name}-prev -> ${c_name}..."
          docker rename "${c_name}-prev" "${c_name}" >/dev/null 2>&1 || true
          docker start "${c_name}" >/dev/null 2>&1 || true
          log_ok "  -> Original container ${c_name} restored and started."
        elif [ "${current_state}" == "ORIGINAL_STOPPED" ]; then
          log_info "  -> Restarting stopped original container ${c_name}..."
          docker start "${c_name}" >/dev/null 2>&1 || true
          log_ok "  -> Original container ${c_name} restarted."
        elif docker image inspect "${img_name}:rollback-backup" >/dev/null 2>&1; then
          log_info "  -> Restoring from backup image tag: ${img_name}:rollback-backup..."
          IMAGE_TAG="rollback-backup" ${COMPOSE_CMD} -f "${COMPOSE_FILE}" up -d "${s_name}" >/dev/null 2>&1 || true
          log_ok "  -> Re-created ${s_name} from rollback-backup."
        else
          log_err "  -> FATAL: Unable to find original container or backup image for ${s_name}!"
        fi

        # Step 3: Verify restored service responds
        if http_get_check "http://127.0.0.1:${port}/health"; then
          log_ok "  -> ${s_name} restored and HEALTHY on port ${port}."
        else
          log_err "  -> Restored ${s_name} did not respond on port ${port}."
        fi
        break
      fi
    done
  done

  # Record rollback state in durable manifest
  if [ -d "${VM_REPO_PATH}" ]; then
    echo "{\"status\":\"ROLLED_BACK\",\"timestamp\":\"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\",\"failed_at_commit\":\"${COMMIT_SHA}\",\"rolled_back_services\":[\"${TRACKED_UPDATES[*]}\"]}" > "${DEPLOY_MANIFEST}" 2>/dev/null || true
  fi

  echo "===================================================================="
  log_err "Targeted rollback completed. Production deployment failed."
  echo "===================================================================="
  exit 1
}

# Trap unexpected errors and trigger targeted rollback without recursion
on_script_failure() {
  local exit_code="$1"
  local line_no="$2"
  log_err "Deployment script failed unexpectedly (exit code: ${exit_code}) at line ${line_no}."
  execute_targeted_rollback
}
trap 'on_script_failure $? $LINENO' ERR

# ------------------------------------------------------------------------------
# 4. Exclusive Deployment Lock (flock)
# ------------------------------------------------------------------------------
exec 200>"${LOCK_FILE}"
if ! flock -n 200; then
  log_err "Another deployment is currently running (lock held on ${LOCK_FILE})."
  log_err "Aborting to prevent concurrent deployment conflicts."
  exit 1
fi
log_ok "Exclusive deployment lock acquired on ${LOCK_FILE}."

# ------------------------------------------------------------------------------
# 5. Pre-Flight Checks & Dependency Validation (Deployment-Blocking)
# ------------------------------------------------------------------------------
echo "===================================================================="
echo " Starting AtlasBasket Production Backend Deployment"
echo " Host:       atlasbasket-virtual-machine (${VM_IP})"
echo " Commit:     ${COMMIT_SHA}"
echo " Timestamp:  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "===================================================================="

# Check Docker CLI
if ! command -v docker >/dev/null 2>&1; then
  log_err "Docker CLI is not installed or not in PATH."
  exit 1
fi

# Detect Compose plugin or standalone
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  log_err "Neither 'docker compose' nor 'docker-compose' was found."
  exit 1
fi
log_ok "Compose engine detected: ${COMPOSE_CMD}"

# Check Docker daemon connectivity
if ! docker info >/dev/null 2>&1; then
  log_err "Cannot communicate with Docker daemon. Verify user permissions."
  exit 1
fi
log_ok "Docker daemon is active and responsive."

# Check available disk space (require >= 2048 MB free)
AVAILABLE_MB=$(df -m "${BACKEND_DIR}" | awk 'NR==2 {print $4}')
if [ "${AVAILABLE_MB}" -lt 2048 ]; then
  log_err "Insufficient disk space: ${AVAILABLE_MB} MB available, 2048 MB required."
  exit 1
fi
log_ok "Disk space verified: ${AVAILABLE_MB} MB free."

# Verify external Docker network exists
if ! docker network inspect "${DOCKER_NETWORK}" >/dev/null 2>&1; then
  log_warn "Docker network '${DOCKER_NETWORK}' not found. Creating..."
  docker network create "${DOCKER_NETWORK}"
fi
log_ok "Docker network '${DOCKER_NETWORK}' verified."

# Verify production environment file exists and is readable (NEVER output contents)
if [ ! -f "${SECRETS_FILE}" ] || [ ! -r "${SECRETS_FILE}" ]; then
  log_err "Production secrets file missing or unreadable at: ${SECRETS_FILE}"
  log_err "Deployment blocked: production credentials are required."
  exit 1
fi
log_ok "Production secrets file confirmed at: ${SECRETS_FILE}"

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

# Inspect existing production containers and verify configuration parity
log_info "Inspecting existing production containers for configuration parity..."
for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"
  if docker ps -a --format '{{.Names}}' | grep -q "^${c_name}\$"; then
    INSPECTED_PORTS=$(docker inspect --format='{{range $p, $conf := .HostConfig.PortBindings}}{{$p}} {{end}}' "${c_name}" 2>/dev/null || echo "")
    log_ok "  -> Found existing ${c_name} (Ports: ${INSPECTED_PORTS:-default})"
  else
    log_info "  -> ${c_name} does not exist yet (will be created in this rollout)."
  fi
done

# ------------------------------------------------------------------------------
# 6. Sequential Image Builds (7.4 GB RAM / 4 Threads Protection)
# ------------------------------------------------------------------------------
echo "--------------------------------------------------------------------"
log_info "Building 5 backend Docker images sequentially to conserve VM memory..."

build_idx=1
for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"

  echo ""
  log_info "[${build_idx}/5] Building image: ${img_name}:${COMMIT_SHA}..."

  if ! DOCKER_BUILDKIT=1 docker build \
    --file "${BACKEND_DIR}/${d_file}" \
    --tag "${img_name}:${COMMIT_SHA}" \
    --tag "${img_name}:latest" \
    "${BACKEND_DIR}"; then
    log_err "Build failed for ${img_name}! Running production containers are untouched."
    exit 1
  fi

  log_ok "[${build_idx}/5] Successfully built ${img_name}:${COMMIT_SHA}"
  build_idx=$((build_idx + 1))
done

# ------------------------------------------------------------------------------
# 7. Synchronize VM App Directory Files (Non-destructive to /secrets/)
# ------------------------------------------------------------------------------
if [ -d "${VM_REPO_PATH}" ] && [ "$(realpath "${REPO_ROOT}")" != "$(realpath "${VM_REPO_PATH}")" ]; then
  log_info "Syncing updated compose specification to ${VM_REPO_PATH}..."
  mkdir -p "${VM_REPO_PATH}/backend/scripts"
  cp "${COMPOSE_FILE}" "${VM_REPO_PATH}/backend/compose.vm.yml" 2>/dev/null || true
  cp "${SCRIPT_DIR}/deploy.sh" "${VM_REPO_PATH}/backend/scripts/deploy.sh" 2>/dev/null || true
  if [ -f "${SCRIPT_DIR}/rollback.sh" ]; then
    cp "${SCRIPT_DIR}/rollback.sh" "${VM_REPO_PATH}/backend/scripts/rollback.sh" 2>/dev/null || true
  fi
  chmod +x "${VM_REPO_PATH}/backend/scripts/"*.sh 2>/dev/null || true
  log_ok "VM app repository compose specification synchronized."
fi

# ------------------------------------------------------------------------------
# 8. Deliberate Container Migration & Measured Downtime Rollout
# ------------------------------------------------------------------------------
echo "--------------------------------------------------------------------"
log_info "Starting canonical Compose rolling replacement of the 5 APIs..."

MAX_RETRIES=20
RETRY_DELAY=2
MANIFEST_DATA="{\"deployment_status\":\"IN_PROGRESS\",\"commit\":\"${COMMIT_SHA}\",\"timestamp\":\"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\",\"services\":{"

for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"
  echo ""
  log_info "===================================================================="
  log_info "Processing service: ${s_name} (Port: ${port})"
  log_info "===================================================================="

  PREV_IMAGE_ID=""
  if docker ps -a --format '{{.Names}}' | grep -q "^${c_name}\$"; then
    PREV_IMAGE_ID=$(docker inspect --format='{{.Image}}' "${c_name}" 2>/dev/null || echo "")
    if [ -n "${PREV_IMAGE_ID}" ]; then
      docker tag "${PREV_IMAGE_ID}" "${img_name}:rollback-backup" 2>/dev/null || true
      log_ok "Tagged current image as ${img_name}:rollback-backup (${PREV_IMAGE_ID:0:12})"
    fi

    # Record into manifest data
    MANIFEST_DATA="${MANIFEST_DATA}\"${s_name}\":{\"prev_image\":\"${PREV_IMAGE_ID}\",\"port\":\"${port}\"},"

    # Track that this service is entering modification
    TRACKED_UPDATES+=("${s_name}")
    SERVICE_STATE["${s_name}"]="STOPPING"

    # Start timing measured service downtime
    STOP_START_TIME=$(date +%s)

    # Step A: Stop original container
    log_info "Stopping original container ${c_name}..."
    if ! docker stop "${c_name}" >/dev/null 2>&1; then
      log_err "Failed to stop ${c_name}! Triggering rollback."
      execute_targeted_rollback
    fi
    SERVICE_STATE["${s_name}"]="ORIGINAL_STOPPED"

    # Step B: Safely preserve original container by renaming to -prev
    log_info "Renaming ${c_name} -> ${c_name}-prev (clears name conflict for Compose)..."
    docker rm -f "${c_name}-prev" >/dev/null 2>&1 || true
    if ! docker rename "${c_name}" "${c_name}-prev" >/dev/null 2>&1; then
      log_err "Failed to rename ${c_name} to ${c_name}-prev! Triggering rollback."
      execute_targeted_rollback
    fi
    SERVICE_STATE["${s_name}"]="ORIGINAL_PRESERVED"
    log_ok "Original container safely preserved as ${c_name}-prev. Name ${c_name} is free."
  else
    log_info "No previous container ${c_name} found (initial deployment for this service)."
    TRACKED_UPDATES+=("${s_name}")
    STOP_START_TIME=$(date +%s)
    SERVICE_STATE["${s_name}"]="ORIGINAL_PRESERVED"
  fi

  # Step C: Deploy replacement container using canonical Docker Compose
  log_info "Launching replacement ${c_name} with image tag ${COMMIT_SHA:0:12} via Compose..."
  SERVICE_STATE["${s_name}"]="REPLACEMENT_CREATING"

  if ! IMAGE_TAG="${COMMIT_SHA}" ${COMPOSE_CMD} -f "${COMPOSE_FILE}" up -d "${s_name}" >/dev/null 2>&1; then
    log_err "Docker Compose up failed for ${s_name}! Triggering rollback."
    execute_targeted_rollback
  fi
  SERVICE_STATE["${s_name}"]="REPLACEMENT_CREATED"
  log_ok "Replacement container ${c_name} launched via Compose."

  # Step D: Health Verification for this service
  log_info "Verifying health of ${s_name} on port ${port} (timeout: $((MAX_RETRIES * RETRY_DELAY))s)..."
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
      SERVICE_STATE["${s_name}"]="REPLACEMENT_HEALTHY"
      break
    fi
    sleep ${RETRY_DELAY}
  done

  # If health verification failed, trigger targeted rollback
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
# 9. Finalization & Durable Manifest Storage (Executed ONLY When All 5 Healthy)
# ------------------------------------------------------------------------------
echo ""
echo "===================================================================="
log_ok "ALL 5 BACKEND SERVICES DEPLOYED AND VERIFIED HEALTHY!"
echo "===================================================================="

# Safely clean up temporary -prev containers now that all 5 replacements are healthy
log_info "Cleaning up temporary -prev backup containers..."
for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"
  docker rm -f "${c_name}-prev" >/dev/null 2>&1 || true
done
log_ok "Temporary backup containers cleaned up."

# Finalize and store durable deployment manifest for post-deployment manual rollback
MANIFEST_DATA="${MANIFEST_DATA%,}}}"
if [ -d "${VM_REPO_PATH}" ]; then
  echo "${MANIFEST_DATA}" > "${DEPLOY_MANIFEST}" 2>/dev/null || true
  log_ok "Durable deployment manifest stored at: ${DEPLOY_MANIFEST}"
fi
log_ok "Rollback backup image tags (${img_name}:rollback-backup) preserved."

echo ""
echo "Current Production Backend Containers:"
docker ps --filter "name=atlasbasket-vm-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "===================================================================="
log_ok "AtlasBasket backend CI/CD pipeline finished successfully."
exit 0
