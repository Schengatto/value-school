#!/bin/bash
set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-/root}"
IMAGE="${DOCKER_IMAGE:-ghcr.io/schengatto/stocks-radar:latest}"
APP_SERVICE="app-stocks-radar"
APP_CONTAINER="root-${APP_SERVICE}-1"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-https://value.schengatto.cloud}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[stocks-radar]${NC} $*"; }
warn()  { echo -e "${YELLOW}[stocks-radar]${NC} $*"; }
error() { echo -e "${RED}[stocks-radar]${NC} $*" >&2; }

info "Pulling image ${IMAGE}..."
docker pull "${IMAGE}" || { error "Docker pull failed"; exit 1; }

cd "${COMPOSE_DIR}"
info "Recreating ${APP_SERVICE} container..."
docker compose up -d --force-recreate ${APP_SERVICE} \
  || { error "Docker up (${APP_SERVICE}) failed"; exit 1; }

info "Waiting for container to start (10s)..."
sleep 10

APP_STATUS=$(docker inspect --format='{{.State.Status}}' "${APP_CONTAINER}" 2>/dev/null || echo "not found")

info "Container status: ${APP_STATUS}"

if [[ "$APP_STATUS" == "running" ]]; then
  info "Container running!"
else
  warn "Container may not be healthy — check logs:"
  echo "  docker compose -f ${COMPOSE_DIR}/docker-compose.yml logs --tail=30 ${APP_SERVICE}"
  exit 1
fi

if [[ -n "$HEALTH_CHECK_URL" ]]; then
  info "Running smoke test..."
  SR_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${HEALTH_CHECK_URL}" 2>/dev/null || echo "000")
  if [[ "$SR_HTTP" == "200" || "$SR_HTTP" == "301" || "$SR_HTTP" == "302" ]]; then
    info "Smoke test passed (HTTP ${SR_HTTP})"
  else
    warn "Smoke test returned HTTP ${SR_HTTP} — may still be starting up"
  fi
fi

info "Recent ${APP_SERVICE} logs:"
echo ""
docker compose logs --tail=10 --no-log-prefix ${APP_SERVICE}

echo ""
info "Deploy complete!"
