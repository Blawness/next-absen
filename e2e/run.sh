#!/bin/bash
# E2E test runner — sets up chromium library path then runs test script
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPS_DIR="$SCRIPT_DIR/chromium-deps"

export LD_LIBRARY_PATH=$(find "$DEPS_DIR" -name "*.so*" -exec dirname {} \; | sort -u | tr '\n' ':')$LD_LIBRARY_PATH

node "$SCRIPT_DIR/login-flow.mjs" "$@"
