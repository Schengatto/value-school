#!/bin/bash
set -euo pipefail

# ── Stocks Radar — VPS deploy script ─────────────────────────────
# Pulls the pre-built Docker image from GHCR and restarts the
# stocks-radar container via Docker Compose.
#
# Usage:  bash deploy.sh
# ─────────────────────────────────────────────────────────────────

STOCKS_DIR="${STOCKS_DIR:-$(pwd)}"
COMPOSE_DIR="${COMPOSE_DIR:-$STOCKS_DIR}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env.docker}"
PROJECT="${COMPOSE_PROJECT:-stocks-radar}"
IMAGE="${DOCKER_IMAGE:-ghcr.io/${GITHUB_REPOSITORY:-your-user/stocks-radar}:latest}"
APP_SERVICE="${APP_SERVICE:-app}"
APP_CONTAINER="${APP_CONTAINER:-${PROJECT}-${APP_SERVICE}-1}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[stocks-radar]${NC} $*"; }
warn()  { echo -e "${YELLOW}[stocks-radar]${NC} $*"; }
error() { echo -e "${RED}[stocks-radar]${NC} $*" >&2; }

# ── 1. Pull latest stocks-radar code (for migrations, compose, etc.) ──
cd "${STOCKS_DIR}"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
info "Pulling stocks-radar (branch: ${BRANCH})..."
git fetch origin "${BRANCH}"
git reset --hard "origin/${BRANCH}"
COMMIT=$(git rev-parse --short HEAD)
info "Now at commit: ${COMMIT}"

# ── 2. Pull pre-built image from GHCR ────────────────────────────
info "Pulling image ${IMAGE}..."
docker pull "${IMAGE}" || { error "Docker pull failed"; exit 1; }

# ── 3. Recreate stocks-radar container ──────────────────────────
cd "${COMPOSE_DIR}"
info "Recreating app container..."
docker compose --env-file "${ENV_FILE}" -p "${PROJECT}" up -d --force-recreate ${APP_SERVICE} \
  || { error "Docker up (${APP_SERVICE}) failed"; exit 1; }

# ── 4. Wait and health check ───────────────────────────────────
info "Waiting for container to start (10s)..."
sleep 10

APP_STATUS=$(docker inspect --format='{{.State.Status}}' "${APP_CONTAINER}" 2>/dev/null || echo "not found")

info "Container status:"
echo "  ${APP_SERVICE}: ${APP_STATUS}"

if [[ "$APP_STATUS" == "running" ]]; then
  info "Container running!"
else
  warn "Container may not be healthy — check logs:"
  echo "  docker compose --env-file ${ENV_FILE} -p ${PROJECT} logs --tail=30 ${APP_SERVICE}"
  exit 1
fi

# ── 5. Smoke test (optional) ─────────────────────────────────────
if [[ -n "$HEALTH_CHECK_URL" ]]; then
  info "Running smoke test..."
  SR_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${HEALTH_CHECK_URL}" 2>/dev/null || echo "000")
  if [[ "$SR_HTTP" == "200" || "$SR_HTTP" == "301" || "$SR_HTTP" == "302" ]]; then
    info "Smoke test passed (HTTP ${SR_HTTP})"
  else
    warn "Smoke test returned HTTP ${SR_HTTP} — may still be starting up"
  fi
fi

# ── 6. Show recent logs ────────────────────────────────────────
info "Recent ${APP_SERVICE} logs:"
echo ""
docker compose --env-file "${ENV_FILE}" -p "${PROJECT}" logs --tail=10 --no-log-prefix ${APP_SERVICE}

echo ""
info "Deploy complete! Branch: ${BRANCH}, Commit: ${COMMIT}"
if [[ -n "$HEALTH_CHECK_URL" ]]; then
  info "Dashboard: ${HEALTH_CHECK_URL}"
fi
