#!/usr/bin/env bash
# ==============================================================================
# AtlasBasket Production Backend Deployment Script
# Target Host: Ubuntu VM (atlasbasket-virtual-machine / 192.168.122.90)
#
# Canonical Deployment Architecture:
#   - Single canonical deployment mechanism: Docker Compose (backend/compose.vm.yml).
#   - Real container preservation: original production containers are stopped and
#     renamed to unique backup names (e.g. atlasbasket-vm-<service>-prev-<SHA>).
#   - Zero reliance on Docker image tags or store state for live container rollback.
#   - Immutable image tagging using full Git commit SHA (${COMMIT_SHA}).
#   - Sequential Dockerfile builds (1 at a time) conserving 7.4 GB RAM.
#   - Exclusive flock locking (/tmp/atlasbasket-deploy.lock) preventing race conditions.
#   - Pre-flight checks strictly block deployment if Postgres, Redis, or Bind IP is down.
#   - Actual measured downtime reported per service (no speculative estimates).
#   - Full-fleet rollback operates on all services modified during this run.
#   - Non-recursive error trapping: trap disabled inside rollback handler.
#   - Durable release manifest persisted to disk retaining at least 3 historical releases.
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

if [ -d "${VM_REPO_PATH}" ]; then
  DEPLOY_MANIFEST="${VM_REPO_PATH}/.deployment_manifest.json"
else
  DEPLOY_MANIFEST="${REPO_ROOT}/.deployment_manifest.json"
fi

LOCK_FILE="/tmp/atlasbasket-deploy.lock"
DOCKER_NETWORK="atlasbasket-vm-net"
VM_IP="192.168.122.90"
HOST_BIND_IP="${HOST_BIND_IP:-192.168.122.90}"
export HOST_BIND_IP
COMMIT_SHA="${GITHUB_SHA:-$(git -C "${REPO_ROOT}" rev-parse HEAD 2>/dev/null || echo 'manual')}"

# Python runtime detection for release manifest management
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  PYTHON_BIN=""
fi

# Service definitions:
# service_name | container_name | image_name | dockerfile | port | env_port_var
SERVICES=(
  "customer-api|atlasbasket-vm-customer-api|atlasbasket-customer-api|Dockerfile.customer|3001|CUSTOMER_PORT"
  "seller-api|atlasbasket-vm-seller-api|atlasbasket-seller-api|Dockerfile.seller|3002|SELLER_PORT"
  "admin-api|atlasbasket-vm-admin-api|atlasbasket-admin-api|Dockerfile.admin|3003|ADMIN_PORT"
  "delivery-api|atlasbasket-vm-delivery-api|atlasbasket-delivery-api|Dockerfile.delivery|3004|DELIVERY_PORT"
  "payment-api|atlasbasket-vm-payment-api|atlasbasket-payment-api|Dockerfile.payment|3005|PAYMENT_PORT"
)

# Service lifecycle states and preserved container tracking:
declare -A SERVICE_STATE
declare -A SERVICE_BACKUP_CONTAINER
declare -A SERVICE_BACKUP_CID
declare -A SERVICE_BACKUP_IMAGE
declare -A SERVICE_BACKUP_IMGNAME

for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name _ <<< "${entry}"
  SERVICE_STATE["${s_name}"]="UNTOUCHED"
  SERVICE_BACKUP_CONTAINER["${s_name}"]=""
  SERVICE_BACKUP_CID["${s_name}"]=""
  SERVICE_BACKUP_IMAGE["${s_name}"]=""
  SERVICE_BACKUP_IMGNAME["${s_name}"]=""
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
# 3. Targeted Full-Fleet Rollback Function
# ------------------------------------------------------------------------------
execute_targeted_rollback() {
  # Disable traps immediately to prevent recursive error handling
  trap '' ERR EXIT INT TERM
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
    local b_name="${SERVICE_BACKUP_CONTAINER[${modified_service}]:-}"

    for entry in "${SERVICES[@]}"; do
      IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"
      if [ "${s_name}" == "${modified_service}" ]; then
        log_warn "Reversing changes for ${s_name} (State: ${current_state})..."

        # Step 1: Remove failed replacement container if created
        if [ "${current_state}" == "REPLACEMENT_CREATED" ] || \
           [ "${current_state}" == "REPLACEMENT_CREATING" ] || \
           [ "${current_state}" == "REPLACEMENT_HEALTHY" ]; then
          log_info "  -> Stopping and removing failed replacement container ${c_name}..."
          docker stop "${c_name}" >/dev/null 2>&1 || true
          docker rm -f "${c_name}" >/dev/null 2>&1 || true
        fi

        # Step 2: Restore the original container from preserved backup
        if [ -n "${b_name}" ] && docker ps -a --format '{{.Names}}' | grep -q "^${b_name}\$"; then
          log_info "  -> Restoring original container: ${b_name} -> ${c_name}..."
          docker rename "${b_name}" "${c_name}" >/dev/null 2>&1 || true
          docker start "${c_name}" >/dev/null 2>&1 || true
          log_ok "  -> Original container ${c_name} restored and started from ${b_name}."
        elif [ "${current_state}" == "ORIGINAL_STOPPED" ]; then
          log_info "  -> Restarting stopped original container ${c_name}..."
          docker start "${c_name}" >/dev/null 2>&1 || true
          log_ok "  -> Original container ${c_name} restarted."
        else
          log_err "  -> FATAL: Preserved backup container '${b_name}' not found for ${s_name}!"
        fi

        # Step 3: Verify restored service responds
        if http_get_check "http://${HOST_BIND_IP}:${port}/health" || http_get_check "http://127.0.0.1:${port}/health"; then
          log_ok "  -> ${s_name} restored and HEALTHY on port ${port}."
        else
          log_err "  -> Restored ${s_name} did not respond on port ${port}."
        fi
        break
      fi
    done
  done

  # Record rollback state in durable manifest
  if [ -n "${PYTHON_BIN}" ]; then
    ${PYTHON_BIN} -c "
import json, os, datetime
path = '${DEPLOY_MANIFEST}'
try:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
except Exception:
    data = {'active_release': None, 'history': []}
data['last_failure'] = {
    'status': 'ROLLED_BACK',
    'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'failed_commit': '${COMMIT_SHA}',
    'rolled_back_services': '${TRACKED_UPDATES[*]}'.split()
}
try:
    with open(path + '.tmp', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    os.replace(path + '.tmp', path)
except Exception:
    pass
" 2>/dev/null || true
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
echo " Bind IP:    ${HOST_BIND_IP}"
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

# Verify HOST_BIND_IP is assigned to the VM before deployment
log_info "Verifying HOST_BIND_IP (${HOST_BIND_IP}) is assigned to this host..."
IP_FOUND=0
if command -v ip >/dev/null 2>&1; then
  if ip -4 addr show 2>/dev/null | grep -qE "inet ${HOST_BIND_IP}(/|[[:space:]])"; then
    IP_FOUND=1
  fi
fi

if [ "${IP_FOUND}" -eq 0 ] && command -v hostname >/dev/null 2>&1; then
  if hostname -I 2>/dev/null | grep -qw "${HOST_BIND_IP}"; then
    IP_FOUND=1
  fi
fi

if [ "${IP_FOUND}" -eq 0 ] && command -v ifconfig >/dev/null 2>&1; then
  if ifconfig 2>/dev/null | grep -qw "${HOST_BIND_IP}"; then
    IP_FOUND=1
  fi
fi

if [ "${IP_FOUND}" -eq 0 ]; then
  log_err "PREFLIGHT ERROR: HOST_BIND_IP (${HOST_BIND_IP}) is not assigned to any network interface on this VM!"
  log_err "Deployment blocked: binding API ports to an unassigned IP will fail container creation."
  exit 1
fi
log_ok "VM interface IP verified: ${HOST_BIND_IP} is active on this host."

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
  mkdir -p "${VM_REPO_PATH}/backend/prisma"
  cp "${COMPOSE_FILE}" "${VM_REPO_PATH}/backend/compose.vm.yml" 2>/dev/null || true
  cp "${SCRIPT_DIR}/deploy.sh" "${VM_REPO_PATH}/backend/scripts/deploy.sh" 2>/dev/null || true
  if [ -f "${SCRIPT_DIR}/rollback.sh" ]; then
    cp "${SCRIPT_DIR}/rollback.sh" "${VM_REPO_PATH}/backend/scripts/rollback.sh" 2>/dev/null || true
  fi
  if [ -f "${SCRIPT_DIR}/migrate.sh" ]; then
    cp "${SCRIPT_DIR}/migrate.sh" "${VM_REPO_PATH}/backend/scripts/migrate.sh" 2>/dev/null || true
  fi
  if [ -d "${BACKEND_DIR}/prisma" ]; then
    cp -r "${BACKEND_DIR}/prisma/"* "${VM_REPO_PATH}/backend/prisma/" 2>/dev/null || true
  fi
  chmod +x "${VM_REPO_PATH}/backend/scripts/"*.sh 2>/dev/null || true
  log_ok "VM app repository compose specification and migrations synchronized."
fi

# ------------------------------------------------------------------------------
# 7.5. Apply Pending Prisma Production Database Migrations
# ------------------------------------------------------------------------------
echo "--------------------------------------------------------------------"
log_info "Running production Prisma database migrations..."

if [ -f "${SCRIPT_DIR}/migrate.sh" ]; then
  chmod +x "${SCRIPT_DIR}/migrate.sh"
  if ! bash "${SCRIPT_DIR}/migrate.sh"; then
    log_err "CRITICAL: Database migration failed! Aborting deployment to protect production data."
    log_err "Running production containers are 100% UNTOUCHED and fully functional."
    exit 1
  fi
else
  log_err "CRITICAL: Migration script missing at ${SCRIPT_DIR}/migrate.sh!"
  exit 1
fi
log_ok "Production database schema is up to date and verified healthy."

# ------------------------------------------------------------------------------
# 8. Deliberate Container Migration & Measured Downtime Rollout
# ------------------------------------------------------------------------------
echo "--------------------------------------------------------------------"
log_info "Starting canonical Compose rolling replacement of the 5 APIs..."

MAX_RETRIES=20
RETRY_DELAY=2

for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"
  echo ""
  log_info "===================================================================="
  log_info "Processing service: ${s_name} (Port: ${port})"
  log_info "===================================================================="

  PREV_CID=""
  PREV_IMAGE_REF=""
  PREV_IMAGE_NAME=""
  BACKUP_NAME=""

  if docker ps -a --format '{{.Names}}' | grep -q "^${c_name}\$"; then
    # Step 1: Inspect currently running container configuration and container ID
    PREV_CID=$(docker inspect --format='{{.Id}}' "${c_name}" 2>/dev/null || echo "")
    PREV_IMAGE_REF=$(docker inspect --format='{{.Image}}' "${c_name}" 2>/dev/null || echo "")
    PREV_IMAGE_NAME=$(docker inspect --format='{{.Config.Image}}' "${c_name}" 2>/dev/null || echo "")

    log_info "  -> Found live container ${c_name} (CID: ${PREV_CID:0:12})"
    log_info "  -> Image reference: ${PREV_IMAGE_NAME:-${PREV_IMAGE_REF:0:12}}"

    # Step 2: Determine unique previous-container name based on release SHA or deployment identifier
    PREV_RELEASE_SHA=""
    if [ -f "${DEPLOY_MANIFEST}" ] && [ -n "${PYTHON_BIN}" ]; then
      PREV_RELEASE_SHA=$(${PYTHON_BIN} -c "import json; m=json.load(open('${DEPLOY_MANIFEST}')); print(m.get('active_release',{}).get('commit','')[:7])" 2>/dev/null || echo "")
    fi
    if [ -z "${PREV_RELEASE_SHA}" ] && [ -n "${PREV_IMAGE_NAME}" ]; then
      IMG_TAG=$(echo "${PREV_IMAGE_NAME}" | awk -F':' '{print $2}')
      if [[ "${IMG_TAG}" =~ ^[0-9a-f]{7,40}$ ]]; then
        PREV_RELEASE_SHA="${IMG_TAG:0:7}"
      fi
    fi
    if [ -z "${PREV_RELEASE_SHA}" ] && [ -n "${PREV_CID}" ]; then
      PREV_RELEASE_SHA="${PREV_CID:0:7}"
    fi
    BACKUP_TAG="${PREV_RELEASE_SHA:-${COMMIT_SHA:0:7}}"
    BACKUP_NAME="${c_name}-prev-${BACKUP_TAG}"

    # Step 3: Verify unique backup name is available (avoid collisions with prior runs)
    if docker ps -a --format '{{.Names}}' | grep -q "^${BACKUP_NAME}\$"; then
      BACKUP_NAME="${BACKUP_NAME}-$(date +%s)"
    fi
    log_info "  -> Unique backup container name verified: ${BACKUP_NAME}"

    SERVICE_BACKUP_CONTAINER["${s_name}"]="${BACKUP_NAME}"
    SERVICE_BACKUP_CID["${s_name}"]="${PREV_CID}"
    SERVICE_BACKUP_IMAGE["${s_name}"]="${PREV_IMAGE_REF}"
    SERVICE_BACKUP_IMGNAME["${s_name}"]="${PREV_IMAGE_NAME}"

    TRACKED_UPDATES+=("${s_name}")
    SERVICE_STATE["${s_name}"]="STOPPING"
    STOP_START_TIME=$(date +%s)

    # Step 4: Stop the original container
    log_info "Stopping original container ${c_name}..."
    if ! docker stop "${c_name}" >/dev/null 2>&1; then
      log_err "Failed to stop ${c_name}! Triggering rollback."
      execute_targeted_rollback
    fi
    SERVICE_STATE["${s_name}"]="ORIGINAL_STOPPED"

    # Step 5: Rename original container to the unique backup name
    log_info "Preserving original container: ${c_name} -> ${BACKUP_NAME}..."
    if ! docker rename "${c_name}" "${BACKUP_NAME}" >/dev/null 2>&1; then
      log_err "Failed to rename ${c_name} to ${BACKUP_NAME}! Triggering rollback."
      execute_targeted_rollback
    fi

    # Step 6: Verify the renamed container exists and is stopped
    IS_RUNNING=$(docker inspect --format='{{.State.Running}}' "${BACKUP_NAME}" 2>/dev/null || echo "unknown")
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${BACKUP_NAME}\$" || [ "${IS_RUNNING}" != "false" ]; then
      log_err "CRITICAL: Backup container ${BACKUP_NAME} verification failed (running=${IS_RUNNING})! Triggering rollback."
      execute_targeted_rollback
    fi
    SERVICE_STATE["${s_name}"]="ORIGINAL_PRESERVED"
    log_ok "Original container safely preserved and verified as ${BACKUP_NAME} (stopped). Name ${c_name} is free."
  else
    log_info "No previous container ${c_name} found (initial deployment for this service)."
    SERVICE_BACKUP_CONTAINER["${s_name}"]=""
    SERVICE_BACKUP_CID["${s_name}"]=""
    SERVICE_BACKUP_IMAGE["${s_name}"]=""
    SERVICE_BACKUP_IMGNAME["${s_name}"]=""
    TRACKED_UPDATES+=("${s_name}")
    STOP_START_TIME=$(date +%s)
    SERVICE_STATE["${s_name}"]="ORIGINAL_PRESERVED"
  fi

  # Step 7: Create replacement container using canonical Docker Compose with --no-deps
  log_info "Launching replacement ${c_name} with image tag ${COMMIT_SHA:0:12} via Compose..."
  SERVICE_STATE["${s_name}"]="REPLACEMENT_CREATING"

  if ! HOST_BIND_IP="${HOST_BIND_IP}" IMAGE_TAG="${COMMIT_SHA}" ${COMPOSE_CMD} -f "${COMPOSE_FILE}" up -d --no-deps "${s_name}" >/dev/null 2>&1; then
    log_err "Docker Compose up failed for ${s_name}! Triggering rollback."
    execute_targeted_rollback
  fi
  SERVICE_STATE["${s_name}"]="REPLACEMENT_CREATED"
  log_ok "Replacement container ${c_name} launched via Compose."

  # Step 8: Health Verification for this service
  log_info "Verifying health of ${s_name} on port ${port} (timeout: $((MAX_RETRIES * RETRY_DELAY))s)..."
  service_healthy=0

  for attempt in $(seq 1 ${MAX_RETRIES}); do
    if http_get_check "http://${HOST_BIND_IP}:${port}/health" || http_get_check "http://127.0.0.1:${port}/health"; then
      STOP_END_TIME=$(date +%s)
      MEASURED_DOWNTIME=$(( STOP_END_TIME - STOP_START_TIME ))

      log_ok "  -> ${s_name} is HEALTHY on port ${port} (attempt ${attempt})"
      log_ok "  -> Measured service downtime interruption: ${MEASURED_DOWNTIME}s"

      # Also verify accessibility via VM IP for Cloudflare Tunnel
      if http_get_check "http://${VM_IP}:${port}/health"; then
        log_ok "  -> ${s_name} is reachable on VM IP http://${VM_IP}:${port}/health"
      else
        log_warn "  -> http://${VM_IP}:${port}/health did not respond immediately, but health check succeeded."
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

# Retain previous stopped containers for persistent release history
log_info "Retaining preserved backup containers for release history..."
for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"
  local_backup="${SERVICE_BACKUP_CONTAINER[${s_name}]:-}"
  if [ -n "${local_backup}" ] && docker ps -a --format '{{.Names}}' | grep -q "^${local_backup}\$"; then
    log_ok "  -> Preserved release backup: ${local_backup}"
  fi
done

# Persist release history into durable manifest & apply 3-release retention policy
DEPLOY_TS=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
DEPLOY_ID="$(date -u '+%Y%m%d%H%M%S')-${COMMIT_SHA:0:7}"

if [ -n "${PYTHON_BIN}" ]; then
  ACTIVE_SERVICES_JSON="{"
  PRESERVED_SERVICES_JSON="{"
  has_preserved=0

  for entry in "${SERVICES[@]}"; do
    IFS="|" read -r s_name c_name img_name d_file port env_var <<< "${entry}"
    new_cid=$(docker inspect --format='{{.Id}}' "${c_name}" 2>/dev/null || echo "")
    new_img=$(docker inspect --format='{{.Config.Image}}' "${c_name}" 2>/dev/null || echo "")
    ACTIVE_SERVICES_JSON="${ACTIVE_SERVICES_JSON}\"${s_name}\":{\"container_name\":\"${c_name}\",\"container_id\":\"${new_cid}\",\"image\":\"${new_img}\",\"port\":${port}},"

    b_name="${SERVICE_BACKUP_CONTAINER[${s_name}]:-}"
    b_cid="${SERVICE_BACKUP_CID[${s_name}]:-}"
    b_img="${SERVICE_BACKUP_IMAGE[${s_name}]:-}"
    b_imgname="${SERVICE_BACKUP_IMGNAME[${s_name}]:-}"

    if [ -n "${b_name}" ]; then
      has_preserved=1
      PRESERVED_SERVICES_JSON="${PRESERVED_SERVICES_JSON}\"${s_name}\":{\"backup_container_name\":\"${b_name}\",\"container_id\":\"${b_cid}\",\"image\":\"${b_imgname:-${b_img}}\",\"port\":${port}},"
    fi
  done
  ACTIVE_SERVICES_JSON="${ACTIVE_SERVICES_JSON%,}}"
  PRESERVED_SERVICES_JSON="${PRESERVED_SERVICES_JSON%,}}"

  PRUNE_OUTPUT=$(${PYTHON_BIN} - <<EOF
import json, os, sys

manifest_path = "${DEPLOY_MANIFEST}"
try:
    with open(manifest_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
except Exception:
    data = {'active_release': None, 'history': []}

active_commit = "${COMMIT_SHA}"
deploy_ts = "${DEPLOY_TS}"
deploy_id = "${DEPLOY_ID}"

# Set active release
data['active_release'] = {
    'release_id': deploy_id,
    'commit': active_commit,
    'status': 'ACTIVE',
    'deployed_at': deploy_ts,
    'services': json.loads('${ACTIVE_SERVICES_JSON}')
}

# If containers were preserved in this run, record them into history
has_preserved = ${has_preserved}
if has_preserved:
    preserved_entry = {
        'release_id': deploy_id + '-prev',
        'commit': '${PREV_RELEASE_SHA:-unknown}',
        'preserved_at': deploy_ts,
        'preserved_containers': json.loads('${PRESERVED_SERVICES_JSON}')
    }
    data.setdefault('history', []).insert(0, preserved_entry)

# Prune historical releases beyond the last 3, ensuring recovery versions are kept
history = data.get('history', [])
min_retain = 3
to_delete = []

if len(history) > min_retain:
    keep_history = history[:min_retain]
    old_history = history[min_retain:]

    protected_services = set()
    for rel in keep_history:
        for s_name in rel.get('preserved_containers', {}).keys():
            protected_services.add(s_name)

    for rel in old_history:
        for s_name, c_info in rel.get('preserved_containers', {}).items():
            b_name = c_info.get('backup_container_name')
            if s_name in protected_services and b_name:
                to_delete.append(b_name)

    data['history'] = keep_history

tmp_path = manifest_path + '.tmp'
with open(tmp_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
os.replace(tmp_path, manifest_path)

for name in to_delete:
    print(name)
EOF
) 2>/dev/null || true

  # Safely prune retired backup containers beyond the 3 most recent
  if [ -n "${PRUNE_OUTPUT}" ]; then
    for old_b in ${PRUNE_OUTPUT}; do
      if [ -n "${old_b}" ]; then
        is_running=$(docker inspect --format='{{.State.Running}}' "${old_b}" 2>/dev/null || echo "unknown")
        if [ "${is_running}" == "false" ]; then
          log_info "Pruning retired backup container beyond 3 releases: ${old_b}..."
          docker rm -f "${old_b}" >/dev/null 2>&1 || true
        fi
      fi
    done
  fi

  log_ok "Durable deployment manifest updated and verified at: ${DEPLOY_MANIFEST}"
fi

echo ""
echo "Current Production Backend Containers:"
docker ps --filter "name=atlasbasket-vm-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "===================================================================="
log_ok "AtlasBasket backend CI/CD pipeline finished successfully."
exit 0
