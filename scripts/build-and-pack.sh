#!/usr/bin/env bash
# =============================================================================
# Cortex — Master Release Build Script
# Version 2.0.0
#
# Builds the Next.js web app, the Electron sidecar, and packages both into
# signed (or unsigned for dry-run) distributable artifacts.
#
# Usage:
#   ./scripts/build-and-pack.sh [--dry-run] [--skip-web]
#
# Flags:
#   --dry-run    Runs electron-builder with --dir (unpacked, unsigned, fast).
#                No code-signing credentials required. Ideal for CI pre-flight.
#   --skip-web   Skips the Next.js build entirely (use when testing sidecar only).
#
# Required env vars for signed production builds:
#   macOS:   APPLE_TEAM_ID, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD
#   Windows: AZURE_SIGNING_ENDPOINT, AZURE_SIGNING_CERT_PROFILE,
#            AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
#   Both:    BUILD_ID (optional, defaults to timestamp)
#
# Output (in <repo-root>/release/):
#   macOS:   Cortex-v2.0.0-mac-universal.dmg
#   Windows: Cortex-v2.0.0-win-x64.exe
#   dry-run: release/win-unpacked/ and release/mac-universal/
# =============================================================================

set -euo pipefail

# ── Helpers ───────────────────────────────────────────────────────────────────

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

DRY_RUN=false
SKIP_WEB=false

for arg in "$@"; do
  case $arg in
    --dry-run)   DRY_RUN=true  ;;
    --skip-web)  SKIP_WEB=true ;;
    *)           echo -e "${RED}Unknown argument: $arg${RESET}"; exit 1 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SIDECAR_DIR="$ROOT/apps/sidecar"
WEB_DIR="$ROOT/apps/web"
RELEASE_DIR="$ROOT/release"
VERSION="$(node -p "require('$SIDECAR_DIR/package.json').version" 2>/dev/null || echo "unknown")"

STEP=0
TOTAL_STEPS=4
[ "$SKIP_WEB" = true ] && TOTAL_STEPS=3

step() {
  STEP=$((STEP + 1))
  echo ""
  echo -e "${CYAN}${BOLD}[${STEP}/${TOTAL_STEPS}] $1${RESET}"
  echo -e "${CYAN}$(printf '─%.0s' {1..60})${RESET}"
}

ok()   { echo -e "${GREEN}  ✓ $1${RESET}"; }
warn() { echo -e "${YELLOW}  ⚠ $1${RESET}"; }
fail() {
  echo ""
  echo -e "${RED}${BOLD}  ✗ BUILD FAILED${RESET}"
  echo -e "${RED}  Step: $1${RESET}"
  echo -e "${RED}  Exit code: ${2:-unknown}${RESET}"
  echo ""
  exit "${2:-1}"
}

# ── Preflight ─────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   Cortex Release Build Pipeline  v${VERSION}$(printf '%*s' $((47 - ${#VERSION})) '')║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Root:${RESET}     $ROOT"
echo -e "  ${BOLD}Release:${RESET}  $RELEASE_DIR"
echo -e "  ${BOLD}Mode:${RESET}     $([ "$DRY_RUN" = true ] && echo "DRY-RUN (unpacked, unsigned)" || echo "PRODUCTION (signed installers)")"
[ "$SKIP_WEB" = true ] && echo -e "  ${BOLD}Web:${RESET}      SKIPPED"

# Verify required tools exist
command -v node   >/dev/null 2>&1 || fail "preflight: node not found in PATH" 1
command -v pnpm   >/dev/null 2>&1 || fail "preflight: pnpm not found in PATH" 1
ok "node $(node --version), pnpm $(pnpm --version)"

# Warn if signing env vars are absent (not fatal — dry-run still works)
if [ "$DRY_RUN" = false ]; then
  MISSING_VARS=()
  [ -z "${APPLE_TEAM_ID:-}" ]      && MISSING_VARS+=("APPLE_TEAM_ID")
  [ -z "${APPLE_ID:-}" ]           && MISSING_VARS+=("APPLE_ID")
  [ -z "${AZURE_TENANT_ID:-}" ]    && MISSING_VARS+=("AZURE_TENANT_ID")

  if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    warn "Code-signing vars not set: ${MISSING_VARS[*]}"
    warn "Installers will be built but not signed/notarized."
  else
    ok "Code-signing environment variables present"
  fi
fi

# Clean previous release artifacts
step "Preparing release directory"
if [ -d "$RELEASE_DIR" ]; then
  warn "Removing previous release artifacts from $RELEASE_DIR"
  rm -rf "$RELEASE_DIR"
fi
mkdir -p "$RELEASE_DIR"
ok "Release directory ready: $RELEASE_DIR"

# ── Step 1: Next.js web build ─────────────────────────────────────────────────

if [ "$SKIP_WEB" = false ]; then
  step "Building Next.js web application"

  # SKIP_ENV_VALIDATION bypasses the validate:env pnpm script which requires
  # a live database connection.  In production CI, set DATABASE_URL + all
  # required env vars and use `pnpm build` (the default) instead.
  export NEXT_TELEMETRY_DISABLED=1
  export SKIP_ENV_VALIDATION=1
  export NODE_ENV=production
  export BUILD_ID="cortex-v${VERSION}-$(date +%Y%m%d%H%M%S)"

  echo "  NODE_ENV=production  BUILD_ID=$BUILD_ID"

  (
    cd "$WEB_DIR"
    pnpm run build:release
  ) || fail "Next.js build" $?

  # Verify standalone output exists
  if [ ! -d "$WEB_DIR/.next/standalone" ]; then
    fail "Next.js standalone output not found at .next/standalone — check output: 'standalone' in next.config.js" 1
  fi
  ok "Next.js standalone build complete → apps/web/.next/standalone"
fi

# ── Step 2: Electron sidecar build ───────────────────────────────────────────

step "Building Electron sidecar (electron-vite)"

(
  cd "$SIDECAR_DIR"
  # electron-vite compile: main + preload → dist/main/, renderer → dist/renderer/
  pnpm run build
) || fail "electron-vite build" $?

# Verify all three electron-vite outputs exist
for dir in dist/main dist/preload dist/renderer; do
  if [ ! -d "$SIDECAR_DIR/$dir" ]; then
    fail "electron-vite: expected output directory '$dir' not found" 1
  fi
done
ok "electron-vite build complete → dist/{main,preload,renderer}"

# ── Step 3: electron-builder packaging ───────────────────────────────────────

step "Packaging with electron-builder"

# Clean stale electron-builder output that may be inside dist/ from previous
# builds. The output dir is now $RELEASE_DIR (repo root), not dist/installers/.
# Leaving old .app bundles in dist/installers/ causes codesign to fail because
# electron-builder packs them into the asar and then tries to sign them.
if [ -d "$SIDECAR_DIR/dist/installers" ]; then
  warn "Cleaning stale dist/installers/ (leftover from previous electron-builder output)"
  rm -rf "$SIDECAR_DIR/dist/installers"
fi

if [ "$DRY_RUN" = true ]; then
  echo -e "  ${YELLOW}DRY-RUN: building unpacked directory (no installer, no signing)${RESET}"
  BUILDER_FLAGS="--dir"
else
  BUILDER_FLAGS=""
fi

(
  cd "$SIDECAR_DIR"
  # --publish never: do not upload to GitHub Releases during local/CI packaging.
  # Remove this flag in a dedicated release job that uses GH_TOKEN.
  pnpm run build:enterprise $BUILDER_FLAGS
) || fail "electron-builder packaging" $?

ok "electron-builder packaging complete"

# ── Step 4: Collect and verify artifacts ─────────────────────────────────────

step "Collecting release artifacts"

ARTIFACTS_FOUND=0

if [ "$DRY_RUN" = true ]; then
  # Dry-run produces unpacked directories — verify they exist
  echo "  Checking unpacked outputs in $RELEASE_DIR..."
  for platform_dir in "$RELEASE_DIR"/*/; do
    if [ -d "$platform_dir" ]; then
      ok "Unpacked dir: $(basename "$platform_dir")"
      ARTIFACTS_FOUND=$((ARTIFACTS_FOUND + 1))
    fi
  done
else
  # Production run produces installable binaries
  echo "  Checking installer artifacts in $RELEASE_DIR..."

  # Rename artifacts to canonical versioned filenames
  # electron-builder already uses artifactName from yml, but we verify here
  for f in "$RELEASE_DIR"/*.dmg "$RELEASE_DIR"/*.exe "$RELEASE_DIR"/*.zip; do
    [ -f "$f" ] || continue
    BASENAME="$(basename "$f")"
    ok "Artifact: $BASENAME ($(du -sh "$f" | cut -f1))"
    ARTIFACTS_FOUND=$((ARTIFACTS_FOUND + 1))
  done
fi

if [ "$ARTIFACTS_FOUND" -eq 0 ]; then
  fail "No artifacts found in $RELEASE_DIR — check electron-builder output above" 1
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}${BOLD}║   BUILD SUCCEEDED  🚀                                        ║${RESET}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Version:${RESET}   Cortex v${VERSION}"
echo -e "  ${BOLD}Artifacts:${RESET} $RELEASE_DIR/"

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo -e "  ${YELLOW}This was a dry-run. Run without --dry-run and with signing${RESET}"
  echo -e "  ${YELLOW}credentials set to produce signed installable artifacts.${RESET}"
fi
echo ""
