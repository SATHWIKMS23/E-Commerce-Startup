#!/usr/bin/env bash
# ==============================================================================
# AtlasBasket Manual Production Rollback Utility
# Target Host: Ubuntu VM (atlasbasket-virtual-machine / 192.168.122.90)
#
# Usage:
#   ./rollback.sh                     # Restores from -prev containers OR :rollback-backup images
#   ./rollback.sh <COMMIT_SHA_OR_TAG> # Restores images tagged with a specific SHA/tag
#
# Works both during an active deployment (-prev exists) and post-deployment
# (when -prev has been cleaned up and :rollback-backup is used).
# ==============================================================================

set -uo pipefail

# ------------------------------------------------------------------------------
# Configuration & Paths
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${BACKEND_DIR}/compose.vm.yml"
SECRETS_FILE="/home/sathwik-atlasbasket/apps/atlasbasket/secrets/backend.env"
DOCKER_NETWORK="atlasbasket-vm-net"
TARGET_TAG="${1:-rollback-backup}"

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

echo "===================================================================="
echo " AtlasBasket Production Manual Rollback Utility"
echo " Target image tag / mode: '${TARGET_TAG}'"
echo " Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
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

restored_count=0

for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name port env_var <<< "${entry}"
  echo ""
  log_info "Processing rollback for ${s_name} (${c_name})..."

  # Mode A: If a -prev backup container exists, restore it directly
  if docker ps -a --format '{{.Names}}' | grep -q "^${c_name}-prev\$"; then
    log_info "  -> Found preserved container: ${c_name}-prev"
    docker stop "${c_name}" >/dev/null 2>&1 || true
    docker rm -f "${c_name}" >/dev/null 2>&1 || true
    docker rename "${c_name}-prev" "${c_name}" >/dev/null 2>&1 || true
    docker start "${c_name}" >/dev/null 2>&1 || true
    log_ok "  -> Restored and started ${c_name} from previous container."
    restored_count=$((restored_count + 1))
    continue
  fi

  # Mode B: Post-deployment rollback (when -prev was removed, using target image tag)
  if docker image inspect "${img_name}:${TARGET_TAG}" >/dev/null 2>&1; then
    log_info "  -> Restoring image tag: ${img_name}:${TARGET_TAG} -> ${img_name}:latest"
    
    # Inspect running container to preserve runtime binds and network
    EXISTING_BINDS=""
    EXISTING_NET="${DOCKER_NETWORK}"
    if docker ps -a --format '{{.Names}}' | grep -q "^${c_name}\$"; then
      EXISTING_NET=$(docker inspect --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' "${c_name}" 2>/dev/null || echo "${DOCKER_NETWORK}")
      EXISTING_BINDS=$(docker inspect --format='{{range .HostConfig.Binds}}{{.}} {{end}}' "${c_name}" 2>/dev/null || echo "")
    fi

    docker tag "${img_name}:${TARGET_TAG}" "${img_name}:latest"
    docker stop "${c_name}" >/dev/null 2>&1 || true
    docker rm -f "${c_name}" >/dev/null 2>&1 || true

    # Construct volume arguments from inspected binds if present
    VOLUME_FLAGS=()
    if [ -n "${EXISTING_BINDS}" ]; then
      for b in ${EXISTING_BINDS}; do
        VOLUME_FLAGS+=("-v" "${b}")
      done
    fi

    # Try starting with Compose first; fallback to docker run
    if ${COMPOSE_CMD} -f "${COMPOSE_FILE}" up -d "${s_name}" >/dev/null 2>&1; then
      log_ok "  -> Re-launched ${c_name} via Compose."
    else
      docker run -d \
        --name "${c_name}" \
        --restart unless-stopped \
        --network "${EXISTING_NET}" \
        -p "0.0.0.0:${port}:${port}" \
        --env-file "${SECRETS_FILE}" \
        -e HOST=0.0.0.0 \
        -e PORT="${port}" \
        -e "${env_var}=${port}" \
        "${VOLUME_FLAGS[@]}" \
        "${img_name}:latest" >/dev/null 2>&1 || true
      log_ok "  -> Re-launched ${c_name} via direct docker run."
    fi
    restored_count=$((restored_count + 1))
  else
    log_err "  -> Neither -prev container nor image '${img_name}:${TARGET_TAG}' was found!"
  fi
done

if [ "${restored_count}" -eq 0 ]; then
  log_err "No containers or images were found to restore for '${TARGET_TAG}'."
  exit 1
fi

echo ""
echo "--------------------------------------------------------------------"
log_info "Verifying health of restored services..."
sleep 2

ALL_OK=1
for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name port env_var <<< "${entry}"
  if http_get_check "http://127.0.0.1:${port}/health"; then
    log_ok "  ${s_name} is HEALTHY on port ${port}."
  else
    log_err "  ${s_name} did not respond on port ${port}."
    ALL_OK=0
  fi
done

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
