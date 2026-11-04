#!/usr/bin/env bash
# ==============================================================================
# AtlasBasket Manual Production Rollback Utility
# Target Host: Ubuntu VM (atlasbasket-virtual-machine / 192.168.122.90)
#
# Usage:
#   ./rollback.sh                     # Restores from the most recent preserved release
#   ./rollback.sh <RELEASE_ID_OR_SHA> # Restores a specific release from manifest history
#   ./rollback.sh --list              # Lists available recovery releases & backup containers
#
# Supports both:
#   - Real container restoration: renames and restarts preserved -prev containers.
#   - Compose fallback: re-launches containers from specific Docker image tags.
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

# Python runtime detection for release manifest management
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  PYTHON_BIN=""
fi

TARGET_SELECTOR="${1:-}"

SERVICES=(
  "customer-api|atlasbasket-vm-customer-api|atlasbasket-customer-api|3001|CUSTOMER_PORT"
  "seller-api|atlasbasket-vm-seller-api|atlasbasket-seller-api|3002|SELLER_PORT"
  "admin-api|atlasbasket-vm-admin-api|atlasbasket-admin-api|3003|ADMIN_PORT"
  "delivery-api|atlasbasket-vm-delivery-api|atlasbasket-delivery-api|3004|DELIVERY_PORT"
  "payment-api|atlasbasket-vm-payment-api|atlasbasket-payment-api|3005|PAYMENT_PORT"
)

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
# 2. Handle --list / -l Request
# ------------------------------------------------------------------------------
if [ "${TARGET_SELECTOR}" == "--list" ] || [ "${TARGET_SELECTOR}" == "-l" ]; then
  echo "===================================================================="
  echo " AtlasBasket Production Release History & Recovery Versions"
  echo "===================================================================="
  if [ -f "${DEPLOY_MANIFEST}" ] && [ -n "${PYTHON_BIN}" ]; then
    ${PYTHON_BIN} - <<EOF
import json
try:
    with open("${DEPLOY_MANIFEST}", 'r', encoding='utf-8') as f:
        data = json.load(f)
except Exception:
    data = {}

active = data.get('active_release')
if active:
    print(f"ACTIVE RELEASE: {active.get('release_id')} (Commit: {active.get('commit')}, Deployed: {active.get('deployed_at')})")

history = data.get('history', [])
if not history:
    print("\nNo historical releases recorded in manifest.")
else:
    print(f"\nPRESERVED RELEASES IN HISTORY ({len(history)} available):")
    for idx, rel in enumerate(history):
        print(f"  [{idx + 1}] Release ID: {rel.get('release_id')} | Commit: {rel.get('commit')} | Preserved: {rel.get('preserved_at')}")
        for s_name, c_info in rel.get('preserved_containers', {}).items():
            print(f"      - {s_name}: {c_info.get('backup_container_name')} (Port: {c_info.get('port')})")
EOF
  fi

  echo ""
  echo "Preserved containers currently on Docker daemon:"
  docker ps -a --filter "name=-prev" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
  echo "===================================================================="
  exit 0
fi

echo "===================================================================="
echo " AtlasBasket Production Manual Rollback Utility"
echo " Target selector: '${TARGET_SELECTOR:-latest previous release}'"
echo " Timestamp:       $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "===================================================================="

# ------------------------------------------------------------------------------
# 3. Acquire Exclusive Lock
# ------------------------------------------------------------------------------
exec 200>"${LOCK_FILE}"
if ! flock -n 200; then
  log_err "Another deployment or rollback is in progress (lock held on ${LOCK_FILE})."
  exit 1
fi
log_ok "Exclusive lock acquired on ${LOCK_FILE}."

# ------------------------------------------------------------------------------
# 4. Pre-Flight Checks
# ------------------------------------------------------------------------------
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  log_err "Neither 'docker compose' nor 'docker-compose' command was found."
  exit 1
fi

# Pre-flight check: Verify PostgreSQL & Redis dependencies are running
if ! docker ps --format '{{.Names}}' | grep -q "^atlasbasket-postgres$"; then
  log_err "PREFLIGHT ERROR: Container 'atlasbasket-postgres' is not running!"
  log_err "Rollback cannot verify or connect without PostgreSQL. Start it first."
  exit 1
fi
log_ok "PostgreSQL container (atlasbasket-postgres) is running."

if ! docker ps --format '{{.Names}}' | grep -q "^atlasbasket-vm-redis$"; then
  log_err "PREFLIGHT ERROR: Container 'atlasbasket-vm-redis' is not running!"
  log_err "Rollback cannot verify or connect without Redis. Start it first."
  exit 1
fi
log_ok "Redis container (atlasbasket-vm-redis) is running."

# ------------------------------------------------------------------------------
# 5. Determine Target Release & Preserved Containers
# ------------------------------------------------------------------------------
declare -A TARGET_CONTAINER_MAP
CHOSEN_RELEASE_ID=""
CHOSEN_COMMIT=""

if [ -f "${DEPLOY_MANIFEST}" ] && [ -n "${PYTHON_BIN}" ]; then
  RESOLVE_DATA=$(${PYTHON_BIN} - <<EOF
import json, sys

try:
    with open("${DEPLOY_MANIFEST}", 'r', encoding='utf-8') as f:
        data = json.load(f)
except Exception:
    sys.exit(0)

history = data.get('history', [])
if not history:
    sys.exit(0)

selector = "${TARGET_SELECTOR}"
chosen = None

if not selector:
    chosen = history[0]
else:
    for rel in history:
        if rel.get('release_id') == selector or rel.get('commit', '').startswith(selector):
            chosen = rel
            break
    if not chosen:
        for rel in history:
            for s_name, c_info in rel.get('preserved_containers', {}).items():
                if c_info.get('backup_container_name') == selector:
                    chosen = rel
                    break
            if chosen: break

if chosen:
    print(f"RELEASE_ID={chosen.get('release_id')}")
    print(f"COMMIT={chosen.get('commit')}")
    for s_name, c_info in chosen.get('preserved_containers', {}).items():
        b_name = c_info.get('backup_container_name')
        if b_name:
            print(f"CONTAINER|{s_name}|{b_name}")
EOF
)

  while IFS= read -r line; do
    if [[ "${line}" =~ ^RELEASE_ID=(.*)$ ]]; then
      CHOSEN_RELEASE_ID="${BASH_REMATCH[1]}"
    elif [[ "${line}" =~ ^COMMIT=(.*)$ ]]; then
      CHOSEN_COMMIT="${BASH_REMATCH[1]}"
    elif [[ "${line}" =~ ^CONTAINER\|([^|]+)\|(.*)$ ]]; then
      TARGET_CONTAINER_MAP["${BASH_REMATCH[1]}"]="${BASH_REMATCH[2]}"
    fi
  done <<< "${RESOLVE_DATA}"
fi

if [ -n "${CHOSEN_RELEASE_ID}" ]; then
  log_ok "Selected target recovery release: ${CHOSEN_RELEASE_ID} (Commit: ${CHOSEN_COMMIT})"
fi

# ------------------------------------------------------------------------------
# 6. Rollback Execution
# ------------------------------------------------------------------------------
restored_count=0

for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name port env_var <<< "${entry}"
  echo ""
  log_info "Processing rollback for ${s_name} (${c_name})..."

  b_name="${TARGET_CONTAINER_MAP[${s_name}]:-}"

  # If manifest did not yield a backup container, scan daemon for latest matching -prev container
  if [ -z "${b_name}" ] || ! docker ps -a --format '{{.Names}}' | grep -q "^${b_name}\$"; then
    b_name=$(docker ps -a --format '{{.Names}}' | grep "^${c_name}-prev" | head -1 || echo "")
  fi

  # Mode A: If preserved backup container exists on daemon, restore it directly
  if [ -n "${b_name}" ] && docker ps -a --format '{{.Names}}' | grep -q "^${b_name}\$"; then
    log_info "  -> Found preserved backup container: ${b_name}"
    docker stop "${c_name}" >/dev/null 2>&1 || true
    docker rm -f "${c_name}" >/dev/null 2>&1 || true
    docker rename "${b_name}" "${c_name}" >/dev/null 2>&1 || true
    docker start "${c_name}" >/dev/null 2>&1 || true
    log_ok "  -> Restored and started ${c_name} from ${b_name}."
    restored_count=$((restored_count + 1))
    continue
  fi

  # Mode B: Fallback using Docker Compose if an image tag was requested
  TARGET_TAG="${TARGET_SELECTOR:-latest}"
  if docker image inspect "${img_name}:${TARGET_TAG}" >/dev/null 2>&1; then
    log_info "  -> Re-launching via Compose using image tag: ${img_name}:${TARGET_TAG}..."
    docker stop "${c_name}" >/dev/null 2>&1 || true
    docker rm -f "${c_name}" >/dev/null 2>&1 || true

    if HOST_BIND_IP="${HOST_BIND_IP}" IMAGE_TAG="${TARGET_TAG}" ${COMPOSE_CMD} -f "${COMPOSE_FILE}" up -d --no-deps "${s_name}" >/dev/null 2>&1; then
      log_ok "  -> Re-launched ${c_name} via Compose with image tag '${TARGET_TAG}'."
      restored_count=$((restored_count + 1))
    else
      log_err "  -> Compose failed to re-launch ${c_name}!"
    fi
  else
    log_err "  -> Neither preserved backup container nor image '${img_name}:${TARGET_TAG}' was found!"
  fi
done

if [ "${restored_count}" -eq 0 ]; then
  log_err "No containers or images were found to restore for target '${TARGET_SELECTOR:-latest}'."
  exit 1
fi

echo ""
echo "--------------------------------------------------------------------"
log_info "Verifying health of restored services..."
sleep 2

ALL_OK=1
for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name port env_var <<< "${entry}"
  if http_get_check "http://${HOST_BIND_IP}:${port}/health" || http_get_check "http://127.0.0.1:${port}/health"; then
    log_ok "  ${s_name} is HEALTHY on port ${port}."
  else
    log_err "  ${s_name} did not respond on port ${port}."
    ALL_OK=0
  fi
done

# Record successful rollback in durable manifest
if [ "${ALL_OK}" -eq 1 ] && [ -n "${PYTHON_BIN}" ] && [ -f "${DEPLOY_MANIFEST}" ]; then
  ${PYTHON_BIN} -c "
import json, datetime
path = '${DEPLOY_MANIFEST}'
try:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    data['active_release'] = {
        'release_id': '${CHOSEN_RELEASE_ID:-manual-rollback}',
        'commit': '${CHOSEN_COMMIT:-manual}',
        'status': 'ACTIVE_ROLLED_BACK',
        'rolled_back_at': datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    with open(path + '.tmp', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    import os
    os.replace(path + '.tmp', path)
except Exception:
    pass
" 2>/dev/null || true
fi

if [ "${ALL_OK}" -eq 1 ]; then
  echo "===================================================================="
  log_ok "Rollback completed and verified healthy for all 5 services!"
  echo "===================================================================="
  exit 0
else
  echo "===================================================================="
  log_err "Rollback completed with warnings. Check container logs."
  echo "===================================================================="
  exit 1
fi
