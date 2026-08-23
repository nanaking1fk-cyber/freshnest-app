#!/bin/bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
APP_STORE="$(cd "$HERE/.." && pwd)"
REPO="$(cd "$APP_STORE/.." && pwd)"
SRC="$REPO/work-gym-planner/icons/home-512-v167.png"
OUT="$APP_STORE/resources/icon-1024.png"
mkdir -p "$APP_STORE/resources"
cp "$SRC" "$OUT"
/usr/bin/sips -z 1024 1024 "$OUT" >/dev/null
echo "Created $OUT"
