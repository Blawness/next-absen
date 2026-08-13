#!/bin/bash
# E2E test runner — sets up the chromium library path, then runs test scripts.
#
#   ./e2e/run.sh                  # run every e2e script, sequentially
#   ./e2e/run.sh auto-checkout    # run one (with or without the .mjs suffix)
#   ./e2e/run.sh login-flow.mjs
#
# Requires a dev server on http://localhost:3004 (override with BASE_URL).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPS_DIR="$SCRIPT_DIR/chromium-deps"

export LD_LIBRARY_PATH=$(find "$DEPS_DIR" -name "*.so*" -exec dirname {} \; | sort -u | tr '\n' ':')${LD_LIBRARY_PATH:-}

BASE="${BASE_URL:-http://localhost:3004}"
if ! curl -sf -o /dev/null --max-time 5 "$BASE/auth/signin"; then
  echo "No server responding at $BASE — start it with 'npm run dev' first." >&2
  exit 1
fi

if [ $# -gt 0 ]; then
  # Normalise "auto-checkout" and "auto-checkout.mjs" to the same path.
  scripts=()
  for arg in "$@"; do
    scripts+=("$SCRIPT_DIR/${arg%.mjs}.mjs")
  done
else
  mapfile -t scripts < <(find "$SCRIPT_DIR" -maxdepth 1 -name "*.mjs" | sort)
fi

# proxy.ts rate-limits auth POSTs to 5/min/IP. Suites each log in a few times,
# so back-to-back runs would trip the limiter and fail for the wrong reason.
COOLDOWN_SECONDS="${E2E_COOLDOWN:-65}"

failed=()
first=true
for script in "${scripts[@]}"; do
  name="$(basename "$script")"

  if [ "$first" = false ]; then
    echo "(cooling down ${COOLDOWN_SECONDS}s for the auth rate limiter)"
    sleep "$COOLDOWN_SECONDS"
  fi
  first=false
  if [ ! -f "$script" ]; then
    echo "Not found: $script" >&2
    failed+=("$name")
    continue
  fi

  echo "═══ $name ═══"
  if node "$script"; then
    echo "── $name OK"
  else
    echo "── $name FAILED"
    failed+=("$name")
  fi
  echo
done

if [ ${#failed[@]} -gt 0 ]; then
  echo "Failed: ${failed[*]}" >&2
  exit 1
fi

echo "All e2e suites passed."
