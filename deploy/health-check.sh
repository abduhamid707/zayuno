#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Zayuno Health Check & Smoke Test Suite
# Robust retry mechanism with bounded exponential backoff
# ==============================================================================

MODE="${1:-all}" # "all", "internal", or "public"
MAX_ATTEMPTS="${HEALTH_CHECK_MAX_ATTEMPTS:-20}"
INITIAL_DELAY_SECONDS="${HEALTH_CHECK_INITIAL_DELAY:-3}"
CONNECT_TIMEOUT=5
MAX_TIME=10

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

INTERNAL_TARGETS=(
  "api|http://127.0.0.1:4100/health"
  "mock-evos|http://127.0.0.1:4101/health"
  "mcp|http://127.0.0.1:4102/health"
  "admin|http://127.0.0.1:4103"
  "provider-portal|http://127.0.0.1:4104"
  "mock-coffee-time|http://127.0.0.1:4105/health"
  "mock-poyez|http://127.0.0.1:4106/health"
  "telegram-recruitment|http://127.0.0.1:4107/health"
)

target_for_service() {
  case "$1" in
    api) echo "api|http://127.0.0.1:4100/health" ;;
    mock-evos) echo "mock-evos|http://127.0.0.1:4101/health" ;;
    mcp) echo "mcp|http://127.0.0.1:4102/health" ;;
    admin) echo "admin|http://127.0.0.1:4103" ;;
    provider-portal) echo "provider-portal|http://127.0.0.1:4104" ;;
    mock-coffee-time) echo "mock-coffee-time|http://127.0.0.1:4105/health" ;;
    mock-poyez) echo "mock-poyez|http://127.0.0.1:4106/health" ;;
    telegram-recruitment) echo "telegram-recruitment|http://127.0.0.1:4107/health" ;;
    *) return 1 ;;
  esac
}

PUBLIC_TARGETS=(
  "api.zayuno.uz|https://api.zayuno.uz/health"
  "mcp.zayuno.uz|https://mcp.zayuno.uz/health"
  "admin.zayuno.uz|https://admin.zayuno.uz"
  "developers.zayuno.uz|https://developers.zayuno.uz"
  "partners.zayuno.uz|https://partners.zayuno.uz"
  "evos-sandbox.shopla.uz|https://evos-sandbox.shopla.uz/health"
  "coffee-time-sandbox.shopla.uz|https://coffee-time-sandbox.shopla.uz/health"
  "poyez-sandbox.shopla.uz|https://poyez-sandbox.shopla.uz/health"
)

check_single_endpoint() {
  local name="$1"
  local url="$2"
  
  local http_code
  http_code=$(curl -fsS -o /dev/null -w "%{http_code}" \
    --connect-timeout "$CONNECT_TIMEOUT" \
    --max-time "$MAX_TIME" \
    "$url" 2>/dev/null || echo "000")

  if [[ "$http_code" =~ ^2[0-9]{2}$|^3[0-9]{2}$ ]]; then
    return 0
  else
    return 1
  fi
}

verify_target_list() {
  local target_type="$1"
  shift
  local targets=("$@")

  log_info "Starting $target_type health checks (Max attempts: $MAX_ATTEMPTS)..."
  sleep "$INITIAL_DELAY_SECONDS"

  local attempt=1
  local delay=2

  while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
    local all_passed=true
    local failed_list=()

    for item in "${targets[@]}"; do
      IFS="|" read -r name url <<< "$item"
      if ! check_single_endpoint "$name" "$url"; then
        all_passed=false
        failed_list+=("$name ($url)")
      fi
    done

    if [ "$all_passed" = true ]; then
      log_success "All $target_type endpoints healthy on attempt $attempt/$MAX_ATTEMPTS."
      return 0
    fi

    log_warn "Attempt $attempt/$MAX_ATTEMPTS failed for: ${failed_list[*]}"
    log_info "Retrying in ${delay}s (bounded backoff)..."
    sleep "$delay"

    # Exponential backoff with 8s cap
    delay=$(( delay < 8 ? delay + 2 : 8 ))
    attempt=$(( attempt + 1 ))
  done

  log_error "Health check failed after $MAX_ATTEMPTS attempts for $target_type: ${failed_list[*]}"
  return 1
}

main() {
  log_info "=== Zayuno Health Validation Suite ==="

  if [ "$MODE" = "all" ] || [ "$MODE" = "internal" ]; then
    if ! verify_target_list "INTERNAL" "${INTERNAL_TARGETS[@]}"; then
      exit 1
    fi
  fi

  if [ "$MODE" = "services" ]; then
    shift || true
    local selected_targets=()
    for service in "$@"; do
      [ -z "$service" ] && continue
      local target
      if ! target=$(target_for_service "$service"); then
        log_error "Unknown service requested for health check: $service"
        exit 1
      fi
      selected_targets+=("$target")
    done
    if [ "${#selected_targets[@]}" -eq 0 ]; then
      log_success "No services were restarted; no targeted health check required."
      exit 0
    fi
    verify_target_list "TARGETED" "${selected_targets[@]}"
    exit $?
  fi

  if [ "$MODE" = "all" ] || [ "$MODE" = "public" ]; then
    if ! verify_target_list "PUBLIC" "${PUBLIC_TARGETS[@]}"; then
      exit 1
    fi
  fi

  log_success "=== All health checks passed successfully ==="
}

main "$@"
