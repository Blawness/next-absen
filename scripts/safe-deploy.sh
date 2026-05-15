#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }

APP_NAME="absensi-pkp"
PROJECT_DIR="$(dirname "$0")/.."
cd "$PROJECT_DIR"

if [ ! -f "package.json" ]; then
  fail "Not in project root"
fi

if [ -f ".env" ]; then
  log "Loading .env"
  set -a; source .env; set +a
fi

log "Deploy start: $(date)"

# ──────────────────────────────────────
# 1. install deps
# ──────────────────────────────────────
log "Installing dependencies..."
npm ci || fail "npm ci failed"
ok "Dependencies installed"

# ──────────────────────────────────────
# 2. prisma generate
# ──────────────────────────────────────
log "Generating Prisma client..."
npx prisma generate || fail "prisma generate failed"
ok "Prisma client generated"

# ──────────────────────────────────────
# 3. prisma migrate deploy (safe)
# ──────────────────────────────────────
log "Running prisma migrate deploy..."
npx prisma migrate deploy || fail "prisma migrate deploy failed"
ok "Migrations applied"

# ──────────────────────────────────────
# 4. build
# ──────────────────────────────────────
log "Building Next.js app..."
rm -rf .next
npm run build || fail "Build failed"
ok "Build complete"

# ──────────────────────────────────────
# 5. pm2 reload
# ──────────────────────────────────────
export PATH="$PATH:$(npm config get prefix)/bin"

if pm2 list | grep -q "$APP_NAME"; then
  log "Reloading $APP_NAME..."
  pm2 reload ecosystem.config.js --update-env || fail "pm2 reload failed"
else
  log "Starting $APP_NAME..."
  pm2 start ecosystem.config.js || fail "pm2 start failed"
fi
pm2 save
ok "PM2 deployed"

# ──────────────────────────────────────
# 6. health check
# ──────────────────────────────────────
log "Health check..."
for i in $(seq 1 12); do
  if curl -sf http://localhost:8006/api/health > /dev/null 2>&1; then
    ok "Health check passed"
    log "Deploy done: $(date)"
    exit 0
  fi
  sleep 5
done

fail "Health check failed after 60s"
