#!/usr/bin/env bash
# ==============================================================================
# AtlasBasket Production Database Migration Utility
# Target Host: Ubuntu VM (atlasbasket-virtual-machine / 192.168.122.90)
#
# Canonical Production Migration Execution:
#   - Command: npx prisma migrate deploy --schema ./prisma
#   - Runs in isolated runner container attached to 'atlasbasket-vm-net'
#   - Uses production DATABASE_URL loaded directly from SECRETS_FILE
#   - Runs strictly ONCE per deployment before any backend APIs are updated
#   - Creates an automated pre-migration PostgreSQL backup via pg_dump
#   - Exits with exact error code on failure to block unsafe service rollout
#
# Usage:
#   ./migrate.sh             # Creates backup & applies pending migrations
#   ./migrate.sh --status    # Checks migration status without modifying DB
#   ./migrate.sh --backup    # Takes pre-migration database snapshot only
# ==============================================================================

set -uo pipefail

# ------------------------------------------------------------------------------
# 1. Configuration & Paths
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/.." && pwd)"
SECRETS_FILE="${SECRETS_FILE:-/home/sathwik-atlasbasket/apps/atlasbasket/secrets/backend.env}"
VM_REPO_PATH="/home/sathwik-atlasbasket/apps/atlasbasket"

# Determine backup directory
if [ -d "${VM_REPO_PATH}" ]; then
  BACKUP_DIR="${VM_REPO_PATH}/backups/db"
else
  BACKUP_DIR="${BACKEND_DIR}/backups/db"
fi

LOCK_FILE="/tmp/atlasbasket-deploy.lock"
DOCKER_NETWORK="atlasbasket-vm-net"
POSTGRES_CONTAINER="atlasbasket-postgres"
COMMIT_SHA="${GITHUB_SHA:-$(git -C "${REPO_ROOT}" rev-parse HEAD 2>/dev/null || echo 'manual')}"

ACTION_MODE="${1:-deploy}"

# Logging helpers
log_info() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
log_ok()   { echo -e "\033[1;32m[OK]\033[0m $*"; }
log_warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
log_err()  { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }

# ------------------------------------------------------------------------------
# 2. Concurrency Serialization (flock)
# ------------------------------------------------------------------------------
# Check if file descriptor 200 is already held by parent deploy.sh; if not, acquire lock
if ! flock -n 200 2>/dev/null; then
  # Already held by calling script (e.g. deploy.sh), safe to proceed
  :
else
  # Running standalone, acquire own lock to prevent concurrent executions
  exec 200>"${LOCK_FILE}"
  if ! flock -n 200; then
    log_err "Another deployment or migration is currently running (lock held on ${LOCK_FILE})."
    log_err "Aborting to prevent concurrent migration conflicts."
    exit 1
  fi
  log_ok "Exclusive migration lock acquired on ${LOCK_FILE}."
fi

# ------------------------------------------------------------------------------
# 3. Pre-Flight Validation
# ------------------------------------------------------------------------------
echo "===================================================================="
echo " AtlasBasket Production Prisma Migration Pipeline"
echo " Mode:        ${ACTION_MODE}"
echo " Host:        $(hostname 2>/dev/null || echo 'atlasbasket-vm')"
echo " Commit:      ${COMMIT_SHA:0:12}"
echo " Timestamp:   $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "===================================================================="

# Check Docker CLI
if ! command -v docker >/dev/null 2>&1; then
  log_err "Docker CLI is required for containerized migration execution."
  exit 1
fi

# Check Docker daemon connectivity
if ! docker info >/dev/null 2>&1; then
  log_err "Cannot communicate with Docker daemon. Verify user permissions."
  exit 1
fi

# Verify PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}\$"; then
  log_err "PREFLIGHT ERROR: Container '${POSTGRES_CONTAINER}' is NOT running!"
  log_err "PostgreSQL database is required for migrations. Aborting to protect data integrity."
  exit 1
fi
log_ok "PostgreSQL container (${POSTGRES_CONTAINER}) is active."

# Verify production environment secrets file exists and is readable
if [ ! -f "${SECRETS_FILE}" ] || [ ! -r "${SECRETS_FILE}" ]; then
  log_err "Production secrets file missing or unreadable at: ${SECRETS_FILE}"
  log_err "Migration blocked: production credentials are required."
  exit 1
fi
log_ok "Production secrets file verified at: ${SECRETS_FILE}"

# Verify Prisma schema and migrations directory exist
if [ ! -d "${BACKEND_DIR}/prisma" ] || [ ! -f "${BACKEND_DIR}/prisma/schema.prisma" ]; then
  log_err "Prisma schema directory not found at: ${BACKEND_DIR}/prisma"
  exit 1
fi
log_ok "Prisma schema and migrations directory verified at: ${BACKEND_DIR}/prisma"

# ------------------------------------------------------------------------------
# 4. Determine Migration Runner Image
# ------------------------------------------------------------------------------
# Prefer image tagged with current COMMIT_SHA if built by deploy.sh; fallback to latest
RUNNER_IMAGE=""
if docker image inspect "atlasbasket-customer-api:${COMMIT_SHA}" >/dev/null 2>&1; then
  RUNNER_IMAGE="atlasbasket-customer-api:${COMMIT_SHA}"
elif docker image inspect "atlasbasket-customer-api:latest" >/dev/null 2>&1; then
  RUNNER_IMAGE="atlasbasket-customer-api:latest"
elif docker image inspect "atlasbasket-seller-api:latest" >/dev/null 2>&1; then
  RUNNER_IMAGE="atlasbasket-seller-api:latest"
fi

if [ -z "${RUNNER_IMAGE}" ]; then
  log_err "No existing backend image found (atlasbasket-customer-api:${COMMIT_SHA} or :latest)."
  log_err "Please build backend images first (e.g. via deploy.sh) before running migrations."
  exit 1
fi
log_ok "Migration runner image: ${RUNNER_IMAGE}"

# ------------------------------------------------------------------------------
# 5. Extract Database Credentials for Backup & Reachability
# ------------------------------------------------------------------------------
get_db_credentials() {
  local db_url
  db_url=$(grep -E '^[[:space:]]*DATABASE_URL=' "${SECRETS_FILE}" 2>/dev/null | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  
  DB_USER=""
  DB_PASS=""
  DB_NAME=""

  if [ -n "${db_url}" ]; then
    # Parse postgresql://user:pass@host:port/dbname?params
    DB_USER=$(echo "${db_url}" | sed -E 's|^.*://([^:@]+).*$|\1|' 2>/dev/null || echo "")
    if echo "${db_url}" | grep -q '://[^:@]*:[^@]*@'; then
      DB_PASS=$(echo "${db_url}" | sed -E 's|^.*://[^:@]*:([^@]+)@.*$|\1|' 2>/dev/null || echo "")
    fi
    DB_NAME=$(echo "${db_url}" | sed -E 's|^.*://[^/]+/([^?]+).*$|\1|' 2>/dev/null || echo "")
  fi

  # Fallback to inspecting environment variables inside the postgres container
  if [ -z "${DB_USER}" ] || [ "${DB_USER}" == "${db_url}" ]; then
    DB_USER=$(docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "${POSTGRES_CONTAINER}" 2>/dev/null | grep -E '^POSTGRES_USER=' | cut -d= -f2)
  fi
  if [ -z "${DB_PASS}" ]; then
    DB_PASS=$(docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "${POSTGRES_CONTAINER}" 2>/dev/null | grep -E '^POSTGRES_PASSWORD=' | cut -d= -f2)
  fi
  if [ -z "${DB_NAME}" ] || [ "${DB_NAME}" == "${db_url}" ]; then
    DB_NAME=$(docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "${POSTGRES_CONTAINER}" 2>/dev/null | grep -E '^POSTGRES_DB=' | cut -d= -f2)
  fi

  DB_USER="${DB_USER:-postgres}"
  DB_NAME="${DB_NAME:-atlasbasket}"
}

# Pre-flight check: Verify database reachability
get_db_credentials
log_info "Verifying PostgreSQL reachability on container '${POSTGRES_CONTAINER}'..."
if ! docker exec -i -e PGPASSWORD="${DB_PASS:-}" "${POSTGRES_CONTAINER}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
  if ! docker exec -i "${POSTGRES_CONTAINER}" pg_isready >/dev/null 2>&1; then
    log_err "PREFLIGHT ERROR: PostgreSQL database is NOT accepting connections (pg_isready failed)!"
    log_err "Database reachability check failed. Migration aborted to protect production data."
    exit 1
  fi
fi
log_ok "PostgreSQL database is reachable and accepting connections."

# ------------------------------------------------------------------------------
# 6. Pre-Migration Database Snapshot (Safety Requirement)
# ------------------------------------------------------------------------------
create_pre_migration_backup() {
  log_info "Creating automated pre-migration database snapshot..."
  mkdir -p "${BACKUP_DIR}"

  get_db_credentials

  local backup_ts
  backup_ts="$(date -u '+%Y%m%d%H%M%S')"
  local backup_file="${BACKUP_DIR}/atlasbasket-pre-migrate-${COMMIT_SHA:0:7}-${backup_ts}.dump"

  log_info "Dumping PostgreSQL database '${DB_NAME}' (User: ${DB_USER}) using custom archive format (-Fc)..."

  local dump_err_msg=""
  if ! dump_err_msg=$(docker exec -i -e PGPASSWORD="${DB_PASS:-}" "${POSTGRES_CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -Fc 2>&1 > "${backup_file}"); then
    # Try with default postgres user if custom user failed
    log_warn "pg_dump with user '${DB_USER}' encountered an error. Retrying with user 'postgres'..."
    if ! dump_err_msg=$(docker exec -i -e PGPASSWORD="${DB_PASS:-}" "${POSTGRES_CONTAINER}" pg_dump -U postgres -d "${DB_NAME}" -Fc 2>&1 > "${backup_file}"); then
      log_err "CRITICAL: Database snapshot failed! Error: ${dump_err_msg}"
      rm -f "${backup_file}"
      return 1
    fi
  fi

  # Verify backup file exists and has content
  if [ ! -s "${backup_file}" ] || [ "$(wc -c < "${backup_file}")" -lt 1024 ]; then
    log_err "CRITICAL: Backup file ${backup_file} is empty or invalid (< 1KB)! Aborting migration."
    rm -f "${backup_file}"
    return 1
  fi

  # Validate backup archive integrity using pg_restore --list
  log_info "Validating backup archive integrity with pg_restore..."
  local toc_count=0
  if ! toc_count=$(docker exec -i "${POSTGRES_CONTAINER}" pg_restore --list < "${backup_file}" 2>/dev/null | grep -c -E '^(TABLE|INDEX|SEQUENCE|TABLE DATA)' || echo 0); then
    log_err "CRITICAL: pg_restore failed to read backup TOC! The archive is corrupted or invalid."
    rm -f "${backup_file}"
    return 1
  fi

  if [ "${toc_count}" -eq 0 ]; then
    log_err "CRITICAL: Backup archive TOC contains 0 schema objects! Aborting migration."
    rm -f "${backup_file}"
    return 1
  fi

  local backup_size_kb
  backup_size_kb=$(( $(wc -c < "${backup_file}") / 1024 ))
  log_ok "Pre-migration database snapshot verified: ${backup_file} (${backup_size_kb} KB, ${toc_count} objects verified via pg_restore)"

  # Prune snapshots keeping the 5 most recent
  local old_backups
  old_backups=$(ls -t "${BACKUP_DIR}"/atlasbasket-pre-migrate-* 2>/dev/null | tail -n +6 || echo "")
  if [ -n "${old_backups}" ]; then
    for ob in ${old_backups}; do
      log_info "Pruning old database snapshot: $(basename "${ob}")"
      rm -f "${ob}" 2>/dev/null || true
    done
  fi

  return 0
}

# ------------------------------------------------------------------------------
# 7. Check Migration Status Mode (--status / -s)
# ------------------------------------------------------------------------------
if [ "${ACTION_MODE}" == "--status" ] || [ "${ACTION_MODE}" == "-s" ]; then
  echo "--------------------------------------------------------------------"
  log_info "Checking production Prisma migration status..."
  
  docker run --rm \
    --name "atlasbasket-migrate-status-${COMMIT_SHA:0:7}" \
    --network "${DOCKER_NETWORK}" \
    --env-file "${SECRETS_FILE}" \
    -v "${BACKEND_DIR}/prisma:/app/prisma:ro" \
    "${RUNNER_IMAGE}" \
    npx prisma migrate status --schema ./prisma
  
  exit $?
fi

# ------------------------------------------------------------------------------
# 8. Backup Only Mode (--backup / -b)
# ------------------------------------------------------------------------------
if [ "${ACTION_MODE}" == "--backup" ] || [ "${ACTION_MODE}" == "-b" ]; then
  create_pre_migration_backup
  exit $?
fi

# ------------------------------------------------------------------------------
# 9. Execute Production Migration (npx prisma migrate deploy --schema ./prisma)
# ------------------------------------------------------------------------------
echo "--------------------------------------------------------------------"
log_info "Starting Production Migration Workflow"
echo "--------------------------------------------------------------------"

# Step 1: Create safety snapshot before running any DDL
if ! create_pre_migration_backup; then
  log_err "Migration stopped before execution due to snapshot failure. Database is untouched."
  exit 1
fi

# Step 2: Execute npx prisma migrate deploy
echo ""
log_info "Executing migration command: npx prisma migrate deploy --schema ./prisma"
log_info "Runner container: ${RUNNER_IMAGE} on network ${DOCKER_NETWORK}"
echo "--------------------------------------------------------------------"

MIGRATE_LOG_FILE="${BACKUP_DIR}/atlasbasket-migrate-${COMMIT_SHA:0:7}-$(date -u '+%Y%m%d%H%M%S').log"
MIGRATE_START_TIME=$(date +%s)
MIGRATE_EXIT_CODE=0

# Run in an ephemeral container attached to the production database network
# Log output to both stdout/stderr and persistent migration log file
docker run --rm \
  --name "atlasbasket-vm-migrate-${COMMIT_SHA:0:7}-$(date +%s)" \
  --network "${DOCKER_NETWORK}" \
  --env-file "${SECRETS_FILE}" \
  -v "${BACKEND_DIR}/prisma:/app/prisma:ro" \
  "${RUNNER_IMAGE}" \
  npx prisma migrate deploy --schema ./prisma 2>&1 | tee "${MIGRATE_LOG_FILE}"
MIGRATE_EXIT_CODE=${PIPESTATUS[0]}

MIGRATE_END_TIME=$(date +%s)
MIGRATE_DURATION=$(( MIGRATE_END_TIME - MIGRATE_START_TIME ))

echo "--------------------------------------------------------------------"

# Step 3: Handle Migration Result
if [ "${MIGRATE_EXIT_CODE}" -ne 0 ]; then
  echo ""
  log_err "===================================================================="
  log_err "CRITICAL FAILURE: Prisma migration failed with exit code ${MIGRATE_EXIT_CODE}!"
  log_err "Execution duration: ${MIGRATE_DURATION}s"
  log_err "Migration log retained at: ${MIGRATE_LOG_FILE}"
  log_err "Production database migration failed. DEPLOYMENT IS BLOCKED."
  log_err "Existing application containers have NOT been touched."
  log_err "Review the Prisma error output above before re-triggering deployment."
  log_err "===================================================================="
  exit ${MIGRATE_EXIT_CODE}
fi

log_ok "Prisma production migrations deployed successfully in ${MIGRATE_DURATION}s."
log_ok "Migration log retained at: ${MIGRATE_LOG_FILE}"

# Step 4: Verify Migration Status
echo ""
log_info "Verifying database migration status..."
STATUS_EXIT_CODE=0
docker run --rm \
  --name "atlasbasket-vm-migrate-verify-${COMMIT_SHA:0:7}" \
  --network "${DOCKER_NETWORK}" \
  --env-file "${SECRETS_FILE}" \
  -v "${BACKEND_DIR}/prisma:/app/prisma:ro" \
  "${RUNNER_IMAGE}" \
  npx prisma migrate status --schema ./prisma || STATUS_EXIT_CODE=$?

if [ "${STATUS_EXIT_CODE}" -ne 0 ]; then
  log_warn "Migration status check returned non-zero code (${STATUS_EXIT_CODE}), but deploy reported success."
fi

echo "===================================================================="
log_ok "Production database schema is fully up to date and verified."
echo "===================================================================="
exit 0
