#!/bin/bash
set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-/root}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-gazette}"
IMAGE="${DOCKER_IMAGE:-ghcr.io/schengatto/stocks-radar:latest}"
APP_SERVICE="app-stocks-radar"
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
info "Recreating ${APP_SERVICE} container (project: ${COMPOSE_PROJECT})..."
docker compose -p "${COMPOSE_PROJECT}" up -d --force-recreate --no-deps ${APP_SERVICE} \
  || { error "Docker up (${APP_SERVICE}) failed"; exit 1; }

info "Waiting for container to start (10s)..."
sleep 10

APP_CONTAINER=$(docker compose -p "${COMPOSE_PROJECT}" ps -q ${APP_SERVICE} 2>/dev/null || echo "")

if [[ -z "$APP_CONTAINER" ]]; then
  error "Container not found"
  exit 1
fi

APP_STATUS=$(docker inspect --format='{{.State.Status}}' "${APP_CONTAINER}" 2>/dev/null || echo "not found")
info "Container status: ${APP_STATUS}"

if [[ "$APP_STATUS" != "running" ]]; then
  warn "Container may not be healthy — check logs:"
  echo "  docker compose -p ${COMPOSE_PROJECT} -f ${COMPOSE_DIR}/docker-compose.yml logs --tail=30 ${APP_SERVICE}"
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
docker compose -p "${COMPOSE_PROJECT}" logs --tail=10 --no-log-prefix ${APP_SERVICE}

echo ""
info "Deploy complete!"
