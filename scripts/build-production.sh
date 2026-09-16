#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.compact/bin:$HOME/.local/bin:$PATH"
if ! command -v compact >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 --fail --silent --show-error --location \
    https://github.com/midnightntwrk/compact/releases/download/compact-v0.5.2/compact-installer.sh | sh
fi
compact update 0.31.1
corepack pnpm contract:compile
corepack pnpm build
