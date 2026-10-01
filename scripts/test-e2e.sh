#!/bin/bash
# Run the configured desktop/mobile suites against the local development stack.
set -euo pipefail

SETUP_ONLY=false
SKIP_SETUP=false
MODE=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --setup-only) SETUP_ONLY=true ;;
    --skip-setup) SKIP_SETUP=true ;;
    --ui) MODE=(--ui) ;;
    --debug) MODE=(--debug) ;;
    --ci) MODE=() ;; # Reporters are configured in playwright.config.ts.
    -h|--help)
      echo 'Usage: scripts/test-e2e.sh [--setup-only|--skip-setup] [--ui|--debug|--ci]'
      exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

[[ -f package.json && -d e2e ]] || { echo 'Run from the repository root.' >&2; exit 1; }
if [[ "$SKIP_SETUP" != true ]]; then
  command -v bunx >/dev/null
  bunx --no-install playwright --version
  for file in playwright.config.ts playwright.stipend.config.ts e2e/jar-creation.spec.ts e2e/jar-operations.spec.ts e2e/admin-functions.spec.ts; do
    [[ -f "$file" ]] || { echo "Missing required test file: $file" >&2; exit 1; }
  done
fi
[[ "$SETUP_ONLY" != true ]] || exit 0

curl --fail --silent --show-error "${COOKIE_JAR_QA_URL:-http://localhost:3000}/" >/dev/null || {
  echo 'Client unavailable. Start bun dev before running E2E tests.' >&2
  exit 1
}
RPC_CHAIN=$(curl --fail --silent --show-error -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://127.0.0.1:8545)
[[ "$RPC_CHAIN" =~ \"result\"[[:space:]]*:[[:space:]]*\"0x7a69\" ]] || {
  echo 'E2E transaction tests require local Anvil chain 31337.' >&2
  exit 1
}

# exec propagates failures and interrupts without replacing the configured artifact reporters.
if [[ ${#MODE[@]} -gt 0 ]]; then
  exec bunx --no-install playwright test "${MODE[@]}"
fi
exec bunx --no-install playwright test
