#!/usr/bin/env bash
# ==============================================================================
# AtlasBasket Manual Rollback Utility
# Target Host: Ubuntu VM (atlasbasket-virtual-machine / 192.168.122.90)
#
# Usage:
#   ./rollback.sh                    # Restores images tagged :rollback-backup
#   ./rollback.sh <COMMIT_SHA_OR_TAG># Restores images tagged with specific SHA/tag
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${BACKEND_DIR}/compose.vm.yml"
TARGET_TAG="${1:-rollback-backup}"

SERVICES=(
  "customer-api|atlasbasket-vm-customer-api|atlasbasket-customer-api|3001"
  "seller-api|atlasbasket-vm-seller-api|atlasbasket-seller-api|3002"
  "admin-api|atlasbasket-vm-admin-api|atlasbasket-admin-api|3003"
  "delivery-api|atlasbasket-vm-delivery-api|atlasbasket-delivery-api|3004"
  "payment-api|atlasbasket-vm-payment-api|atlasbasket-payment-api|3005"
)

log_info() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
log_ok()   { echo -e "\033[1;32m[OK]\033[0m $*"; }
log_err()  { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }

echo "===================================================================="
echo " AtlasBasket Production Rollback Utility"
echo " Target tag to restore: '${TARGET_TAG}'"
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

COMPOSE_SERVICES=()
restored_count=0

for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name port <<< "${entry}"
  COMPOSE_SERVICES+=("${s_name}")
  
  if docker image inspect "${img_name}:${TARGET_TAG}" >/dev/null 2>&1; then
    log_info "Retagging ${img_name}:${TARGET_TAG} -> ${img_name}:latest..."
    docker tag "${img_name}:${TARGET_TAG}" "${img_name}:latest"
    restored_count=$((restored_count + 1))
  else
    log_err "Image ${img_name}:${TARGET_TAG} does not exist in local Docker storage!"
  fi
done

if [ "${restored_count}" -eq 0 ]; then
  log_err "No images found with tag '${TARGET_TAG}'. Rollback aborted."
  exit 1
fi

log_info "Recreating containers with restored images (preserving Redis & DB)..."
${COMPOSE_CMD} -f "${COMPOSE_FILE}" up -d --no-deps "${COMPOSE_SERVICES[@]}"

echo "--------------------------------------------------------------------"
log_info "Verifying health of rolled-back services..."
sleep 3

ALL_OK=1
for entry in "${SERVICES[@]}"; do
  IFS="|" read -r s_name c_name img_name port <<< "${entry}"
  if curl -s -f -m 3 "http://127.0.0.1:${port}/health" >/dev/null 2>&1 || \
     wget -q -T 3 -O /dev/null "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
    log_ok "  ${s_name} is HEALTHY on port ${port}."
  else
    log_err "  ${s_name} did not respond on port ${port}."
    ALL_OK=0
  fi
done

if [ "${ALL_OK}" -eq 1 ]; then
  echo "===================================================================="
  log_ok "Rollback to '${TARGET_TAG}' completed successfully and verified!"
  echo "===================================================================="
else
  echo "===================================================================="
  log_err "Rollback completed with warnings. Check container logs."
  echo "===================================================================="
  exit 1
fi

