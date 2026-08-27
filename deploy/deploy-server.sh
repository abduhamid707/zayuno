#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Zayuno Production Server Deployment Script
# Executed on production host (158.220.100.58)
# ==============================================================================

DEPLOY_SHA="${1:?Deploy commit SHA is required}"
SERVICES="${2:-mock-evos mock-coffee-time mock-poyez api mcp admin provider-portal worker}"
IMAGE_PREFIX="${3:-ghcr.io/zayuno}"
RUN_MIGRATIONS="${4:-true}"

REMOTE_DIR="/root/zayuno"
LOCK_FILE="/tmp/zayuno-deploy.lock"
CURRENT_SHA_FILE="$REMOTE_DIR/.current_release_sha"
PREVIOUS_SHA_FILE="$REMOTE_DIR/.previous_release_sha"
BACKUP_DIR="/root/zayuno-backups"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[DEPLOY-INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[DEPLOY-OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[DEPLOY-WARN]${NC} $1"; }
log_error() { echo -e "${RED}[DEPLOY-ERROR]${NC} $1"; }

# 1. Acquire exclusive lock
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  log_error "Another deployment is currently in progress. Aborting."
  exit 1
fi

log_info "Starting zero-downtime deployment for SHA: $DEPLOY_SHA"

ALL_SERVICES="mock-evos mock-coffee-time mock-poyez api mcp admin provider-portal worker"
if [ "$SERVICES" = "all" ]; then
  SERVICES="$ALL_SERVICES"
fi

for svc in $SERVICES; do
  case " $ALL_SERVICES " in
    *" $svc "*) ;;
    *) log_error "Unknown deploy service: $svc"; exit 1 ;;
  esac
done

log_info "Target services: ${SERVICES:-none}"

cd "$REMOTE_DIR"

# 2. System and disk validation with automated cache reclamation
log_info "Validating disk space and performing pre-deploy cleanup..."

# Proactively reclaim dangling Docker images, builder cache and old journal logs
if docker info >/dev/null 2>&1; then
  docker image prune -f >/dev/null 2>&1 || true
  docker builder prune -f --keep-storage 512MB >/dev/null 2>&1 || true
fi
journalctl --vacuum-size=100M >/dev/null 2>&1 || true
rm -f /tmp/deploy_bundle*.tar.gz /tmp/*.tmp 2>/dev/null || true

DISK_AVAIL_KB=$(df -k "$REMOTE_DIR" | awk 'NR==2 {print $4}')
if [ "$DISK_AVAIL_KB" -lt 1048576 ]; then # 1GB minimum
  log_warn "Disk space low (< 1GB), running deep safe container and image prune..."
  if docker info >/dev/null 2>&1; then
    docker system prune -a -f --volumes=false --filter "until=24h" >/dev/null 2>&1 || true
  fi
  if [ -d "$BACKUP_DIR" ]; then
    find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +3 -delete 2>/dev/null || true
  fi
  DISK_AVAIL_KB=$(df -k "$REMOTE_DIR" | awk 'NR==2 {print $4}')
fi

DISK_AVAIL_MB=$((DISK_AVAIL_KB / 1024))
if [ "$DISK_AVAIL_KB" -lt 524288 ]; then # 512MB absolute hard minimum
  log_error "Insufficient disk space (${DISK_AVAIL_MB}MB available, minimum 512MB required). Aborting deploy."
  exit 1
fi
log_info "Available disk space: ${DISK_AVAIL_MB}MB"

if ! docker info >/dev/null 2>&1; then
  log_error "Docker daemon is not responding. Aborting deploy."
  exit 1
fi

# 3. Environment & Poyez Secret/TLS validation
if [ ! -f "$REMOTE_DIR/.env" ]; then
  log_error "Protected environment file $REMOTE_DIR/.env is missing."
  exit 1
fi

if ! grep -Eq '^POYEZ_SANDBOX_SHARED_SECRET=.{16,}$' "$REMOTE_DIR/.env"; then
  log_error "POYEZ_SANDBOX_SHARED_SECRET is missing or invalid in .env."
  exit 1
fi

if ! grep -Eq '^SIMULATOR_SESSION_SECRET=.{16,}$' "$REMOTE_DIR/.env"; then
  log_info "Configuring missing SIMULATOR_SESSION_SECRET in $REMOTE_DIR/.env..."
  SIM_SEC=$(openssl rand -hex 32)
  echo "SIMULATOR_SESSION_SECRET=${SIM_SEC}" >> "$REMOTE_DIR/.env"
fi

if [ ! -f "/etc/letsencrypt/live/poyez-sandbox.shopla.uz/fullchain.pem" ] || [ ! -f "/etc/letsencrypt/live/poyez-sandbox.shopla.uz/privkey.pem" ]; then
  log_error "Poyez SSL certificate files are missing in /etc/letsencrypt/live/poyez-sandbox.shopla.uz/."
  exit 1
fi

# 4. Record previous release SHA
PREVIOUS_SHA=""
if [ -f "$CURRENT_SHA_FILE" ]; then
  PREVIOUS_SHA=$(cat "$CURRENT_SHA_FILE" | tr -d '[:space:]')
  echo "$PREVIOUS_SHA" > "$PREVIOUS_SHA_FILE"
  log_info "Previous working release SHA recorded: $PREVIOUS_SHA"
fi

# 5. Pull target images with fallback to latest if specific SHA not found
log_info "Pulling pre-built GHCR images for SHA $DEPLOY_SHA..."
export IMAGE_PREFIX="$IMAGE_PREFIX"
export DEPLOY_SHA="$DEPLOY_SHA"

for svc in $SERVICES; do
  log_info "Pulling image for service $svc..."
  if ! docker pull "${IMAGE_PREFIX}/${svc}:${DEPLOY_SHA}" 2>/dev/null; then
    log_warn "Tag ${DEPLOY_SHA} not found for ${svc}, falling back to latest..."
    if docker pull "${IMAGE_PREFIX}/${svc}:latest" 2>/dev/null; then
      docker tag "${IMAGE_PREFIX}/${svc}:latest" "${IMAGE_PREFIX}/${svc}:${DEPLOY_SHA}"
    else
      log_warn "Could not pull image for ${svc} (using local image if available)"
    fi
  fi
done

# 6. Run database migrations if requested (one-off before container recreation)
if [ "$RUN_MIGRATIONS" = "true" ]; then
  log_info "Executing database migration check..."
  # Run migration in a temporary container with automatic baselining for existing schemas
  if ! docker compose -f docker-compose.prod.yml run --rm --no-deps api pnpm --filter @zayuno/database run migrate:deploy; then
    log_warn "Standard migrate deploy failed. Attempting baseline resolution for existing database..."
    docker compose -f docker-compose.prod.yml run --rm --no-deps api pnpm --filter @zayuno/database exec prisma migrate resolve --applied 20260816000000_init || true
    if ! docker compose -f docker-compose.prod.yml run --rm --no-deps api pnpm --filter @zayuno/database run migrate:deploy; then
      log_error "Database migration failed! Deployment aborted before container switch."
      exit 1
    fi
  fi
  log_info "Executing idempotent database seed for canonical review provider..."
  docker compose -f docker-compose.prod.yml run --rm --no-deps api pnpm --filter @zayuno/database run seed || true
  log_success "Database seed check completed."
fi

# 7. Recreate containers with new images
if [ -n "$SERVICES" ]; then
  log_info "Recreating target containers..."
  # shellcheck disable=SC2086
  docker compose -f docker-compose.prod.yml up -d --no-deps $SERVICES
else
  log_info "No runtime service changed; skipping container recreation."
fi

# 8. Run health check
log_info "Running post-deploy health check..."
chmod +x "$REMOTE_DIR/deploy/health-check.sh"

# SERVICES was validated above, so splitting it into individual service
# arguments is intentional here.
# shellcheck disable=SC2086
if "$REMOTE_DIR/deploy/health-check.sh" services $SERVICES; then
  log_success "Health check passed!"

  # 9. Update Nginx configuration if needed
  if [ -f "$REMOTE_DIR/deploy/nginx-zayuno.conf" ]; then
    log_info "Verifying and reloading Nginx configuration..."
    cp "$REMOTE_DIR/deploy/nginx-zayuno.conf" /etc/nginx/sites-available/zayuno.conf
    nginx -t
    systemctl reload nginx
    log_success "Nginx reloaded."
  fi

  # Record new current release
  echo "$DEPLOY_SHA" > "$CURRENT_SHA_FILE"
  # Prune old dangling images to keep host disk healthy
  docker image prune -f >/dev/null 2>&1 || true
  log_success "Deployment completed successfully for SHA: $DEPLOY_SHA"
else
  log_error "Health check FAILED for release $DEPLOY_SHA!"

  # 10. Automatic Rollback
  if [ -n "$PREVIOUS_SHA" ] && [ "$PREVIOUS_SHA" != "$DEPLOY_SHA" ]; then
    log_warn "Initiating automatic rollback to previous working release SHA: $PREVIOUS_SHA..."
    export DEPLOY_SHA="$PREVIOUS_SHA"
    if [ -n "$SERVICES" ]; then
      # shellcheck disable=SC2086
      docker compose -f docker-compose.prod.yml up -d --no-deps $SERVICES
    fi
    
    log_info "Validating health of rolled-back release..."
    # shellcheck disable=SC2086
    if "$REMOTE_DIR/deploy/health-check.sh" services $SERVICES; then
      log_warn "Rollback to $PREVIOUS_SHA succeeded. System is stable on previous release."
      echo "$PREVIOUS_SHA" > "$CURRENT_SHA_FILE"
    else
      log_error "CRITICAL: System remains unhealthy even after rollback attempt!"
    fi
  else
    log_error "No valid previous SHA available to rollback to."
  fi

  exit 1
fi
