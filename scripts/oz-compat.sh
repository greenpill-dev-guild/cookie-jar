#!/usr/bin/env bash
# OZ v5 compatibility: ERC777 interfaces moved from token/ERC777/ to interfaces/
# Superfluid protocol-monorepo still imports from the old v4 path.
# This script creates the missing files so builds work on fresh clones.

set -euo pipefail

OZ_DIR="lib/openzeppelin-contracts/contracts"

# Only run if OZ submodule exists but ERC777 dir is missing
if [ -d "$OZ_DIR/interfaces" ] && [ ! -f "$OZ_DIR/token/ERC777/IERC777.sol" ]; then
  mkdir -p "$OZ_DIR/token/ERC777"
  for f in IERC777.sol IERC777Recipient.sol IERC777Sender.sol; do
    if [ -f "$OZ_DIR/interfaces/$f" ]; then
      cp "$OZ_DIR/interfaces/$f" "$OZ_DIR/token/ERC777/$f"
    fi
  done
  echo "Created OZ v5 ERC777 compatibility shims"
fi
