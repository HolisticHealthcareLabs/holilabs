#!/bin/bash
#
# Verify a built Sidecar macOS artifact is signed + notarized.
#
# Usage:
#   ./scripts/verify-artifact-mac.sh "dist/installers/<file>.dmg"
#
set -euo pipefail

DMG_PATH="${1:-}"
if [[ -z "$DMG_PATH" ]]; then
  echo "ERROR: DMG path required"
  exit 2
fi

if [[ ! -f "$DMG_PATH" ]]; then
  echo "ERROR: DMG not found at: $DMG_PATH"
  exit 2
fi

echo "==> Mounting DMG: $DMG_PATH"
MOUNT_DIR="$(mktemp -d)"

cleanup() {
  set +e
  hdiutil detach "$MOUNT_DIR" -quiet >/dev/null 2>&1 || true
  rm -rf "$MOUNT_DIR" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Mount (no browsing / no verification prompts)
hdiutil attach "$DMG_PATH" -mountpoint "$MOUNT_DIR" -nobrowse -quiet

APP_PATH="$(find "$MOUNT_DIR" -maxdepth 2 -name "*.app" -print -quit)"
if [[ -z "$APP_PATH" ]]; then
  echo "ERROR: No .app found inside DMG"
  exit 1
fi

echo "==> Found app: $APP_PATH"

echo "==> Verifying code signature (deep, strict)"
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

echo "==> Gatekeeper assessment (expect Notarized Developer ID)"
SPCTL_OUT="$(spctl -a -vv "$APP_PATH" 2>&1 || true)"
echo "$SPCTL_OUT"
echo "$SPCTL_OUT" | grep -q "source=Notarized Developer ID"

echo "==> Stapler validation"
if command -v xcrun >/dev/null 2>&1; then
  xcrun stapler validate "$APP_PATH"
else
  echo "WARN: xcrun not found; skipping stapler validate"
fi

echo "✅ macOS artifact is signed + notarized"

