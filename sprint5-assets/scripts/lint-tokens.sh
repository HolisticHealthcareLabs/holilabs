#!/bin/bash
# =============================================================================
# HoliLabs Design Token Linter
# =============================================================================
#
# Scans .tsx files for raw Tailwind classes that should use design tokens.
# CI-ready: exits 1 if violations found, 0 if clean.
#
# Usage:
#   ./lint-tokens.sh                    # Lint dashboard pages
#   ./lint-tokens.sh --all              # Lint entire src/
#   ./lint-tokens.sh --fix-preview      # Show sed commands to fix
#   ./lint-tokens.sh --summary          # Count only, no line details
#   ./lint-tokens.sh path/to/file.tsx   # Lint a single file
#
# Requires: grep (with -n for line numbers)
# =============================================================================
set -euo pipefail

HOLILABS_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC_DIR="$HOLILABS_ROOT/apps/web/src"
SCAN_DIR="$SRC_DIR/app/dashboard"

# Parse args
ALL=false
FIX_PREVIEW=false
SUMMARY=false
SINGLE_FILE=""

for arg in "$@"; do
  case "$arg" in
    --all) ALL=true; SCAN_DIR="$SRC_DIR" ;;
    --fix-preview) FIX_PREVIEW=true ;;
    --summary) SUMMARY=true ;;
    *.tsx|*.ts) SINGLE_FILE="$arg" ;;
  esac
done

if [ -n "$SINGLE_FILE" ]; then
  FILES="$SINGLE_FILE"
elif [ "$ALL" = true ]; then
  FILES=$(find "$SCAN_DIR" -name "*.tsx" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -name "tailwind.config*" -not -name "globals.css" 2>/dev/null)
else
  FILES=$(find "$SCAN_DIR" -name "*.tsx" -not -path "*/node_modules/*" -not -path "*/.next/*" 2>/dev/null)
fi

VIOLATIONS=0
VIOLATION_FILES=0
CURRENT_FILE=""

# ─── Color helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m'

report() {
  local file="$1" line="$2" raw="$3" token="$4" context="$5"
  if [ "$SUMMARY" = false ]; then
    # Show file header on first violation per file
    if [ "$file" != "$CURRENT_FILE" ]; then
      CURRENT_FILE="$file"
      VIOLATION_FILES=$((VIOLATION_FILES + 1))
      echo ""
      echo -e "${CYAN}${file#$HOLILABS_ROOT/}${NC}"
    fi
    echo -e "  ${RED}L${line}${NC}: ${YELLOW}\"${raw}\"${NC} → ${token}  ${GRAY}(${context})${NC}"
  fi
  VIOLATIONS=$((VIOLATIONS + 1))
}

# ─── Spacing violations ──────────────────────────────────────────────────────
# p-1 through p-12, px-*, py-*, m-*, mx-*, my-*, gap-*, space-*

check_spacing() {
  local file="$1"
  while IFS=: read -r line content; do
    [ -z "$line" ] && continue
    # Extract individual class matches
    echo "$content" | grep -oE '\bp-[0-9]+\b' | while read -r match; do
      case "$match" in
        p-1)  report "$file" "$line" "$match" "p-xs" "spacing: 4px" ;;
        p-2)  report "$file" "$line" "$match" "p-sm" "spacing: 8px" ;;
        p-3)  report "$file" "$line" "$match" "p-sm" "spacing: 8px (12px→8px nearest)" ;;
        p-4)  report "$file" "$line" "$match" "p-md" "spacing: 16px" ;;
        p-5)  report "$file" "$line" "$match" "p-lg" "spacing: 24px (20px→24px)" ;;
        p-6)  report "$file" "$line" "$match" "p-lg" "spacing: 24px" ;;
        p-8)  report "$file" "$line" "$match" "p-xl" "spacing: 32px" ;;
        p-10) report "$file" "$line" "$match" "p-xl" "spacing: 32px (40px→32px)" ;;
        p-12) report "$file" "$line" "$match" "p-2xl" "spacing: 48px" ;;
      esac
    done
    echo "$content" | grep -oE '\bpx-[0-9]+\b' | while read -r match; do
      case "$match" in
        px-1) report "$file" "$line" "$match" "px-xs" "spacing" ;; px-2) report "$file" "$line" "$match" "px-sm" "spacing" ;;
        px-3) report "$file" "$line" "$match" "px-sm" "spacing" ;; px-4) report "$file" "$line" "$match" "px-md" "spacing" ;;
        px-5) report "$file" "$line" "$match" "px-lg" "spacing" ;; px-6) report "$file" "$line" "$match" "px-lg" "spacing" ;;
        px-8) report "$file" "$line" "$match" "px-xl" "spacing" ;;
      esac
    done
    echo "$content" | grep -oE '\bpy-[0-9]+\b' | while read -r match; do
      case "$match" in
        py-1) report "$file" "$line" "$match" "py-xs" "spacing" ;; py-2) report "$file" "$line" "$match" "py-sm" "spacing" ;;
        py-3) report "$file" "$line" "$match" "py-sm" "spacing" ;; py-4) report "$file" "$line" "$match" "py-md" "spacing" ;;
        py-5) report "$file" "$line" "$match" "py-lg" "spacing" ;; py-6) report "$file" "$line" "$match" "py-lg" "spacing" ;;
        py-8) report "$file" "$line" "$match" "py-xl" "spacing" ;;
      esac
    done
    echo "$content" | grep -oE '\bgap-[0-9]+\b' | while read -r match; do
      case "$match" in
        gap-1) report "$file" "$line" "$match" "gap-xs" "spacing" ;; gap-2) report "$file" "$line" "$match" "gap-sm" "spacing" ;;
        gap-3) report "$file" "$line" "$match" "gap-sm" "spacing" ;; gap-4) report "$file" "$line" "$match" "gap-md" "spacing" ;;
        gap-6) report "$file" "$line" "$match" "gap-lg" "spacing" ;; gap-8) report "$file" "$line" "$match" "gap-xl" "spacing" ;;
      esac
    done
    echo "$content" | grep -oE '\bspace-[xy]-[0-9]+\b' | while read -r match; do
      case "$match" in
        space-?-2) report "$file" "$line" "$match" "${match%-*}-sm" "spacing" ;;
        space-?-4) report "$file" "$line" "$match" "${match%-*}-md" "spacing" ;;
        space-?-6) report "$file" "$line" "$match" "${match%-*}-lg" "spacing" ;;
      esac
    done
    echo "$content" | grep -oE '\bm[btlrxy]?-[0-9]+\b' | grep -v "^m[in]" | while read -r match; do
      case "$match" in
        m-1|mb-1|mt-1|ml-1|mr-1|mx-1|my-1) report "$file" "$line" "$match" "${match%-*}-xs" "margin" ;;
        m-2|mb-2|mt-2|ml-2|mr-2|mx-2|my-2) report "$file" "$line" "$match" "${match%-*}-sm" "margin" ;;
        m-4|mb-4|mt-4|ml-4|mr-4|mx-4|my-4) report "$file" "$line" "$match" "${match%-*}-md" "margin" ;;
        m-6|mb-6|mt-6|ml-6|mr-6|mx-6|my-6) report "$file" "$line" "$match" "${match%-*}-lg" "margin" ;;
        m-8|mb-8|mt-8|ml-8|mr-8|mx-8|my-8) report "$file" "$line" "$match" "${match%-*}-xl" "margin" ;;
      esac
    done
  done < <(grep -n -E '\b(p|px|py|m|mb|mt|ml|mr|mx|my|gap|space-[xy])-[0-9]+\b' "$file" 2>/dev/null || true)
}

# ─── Typography violations ────────────────────────────────────────────────────

check_typography() {
  local file="$1"
  while IFS=: read -r line content; do
    [ -z "$line" ] && continue
    echo "$content" | grep -oE '\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl)\b' | while read -r match; do
      case "$match" in
        text-xs)   report "$file" "$line" "$match" "text-caption" "typography: 12px" ;;
        text-sm)   report "$file" "$line" "$match" "text-body" "typography: 14px" ;;
        text-base) report "$file" "$line" "$match" "text-body-lg" "typography: 16px" ;;
        text-lg)   report "$file" "$line" "$match" "text-heading-sm" "typography: 18px" ;;
        text-xl)   report "$file" "$line" "$match" "text-heading-md" "typography: 20px" ;;
        text-2xl)  report "$file" "$line" "$match" "text-heading-lg" "typography: 24px" ;;
        text-3xl)  report "$file" "$line" "$match" "text-display" "typography: 32px" ;;
        text-4xl)  report "$file" "$line" "$match" "text-display" "typography: 32px (36→32)" ;;
      esac
    done
  done < <(grep -n -E '\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl)\b' "$file" 2>/dev/null || true)
}

# ─── Clinical color violations ────────────────────────────────────────────────

check_clinical_colors() {
  local file="$1"
  while IFS=: read -r line content; do
    [ -z "$line" ] && continue
    echo "$content" | grep -oE '\b(text|bg)-(green|red|yellow|amber|orange)-[0-9]+\b' | while read -r match; do
      case "$match" in
        text-green-[0-9]*|bg-green-[0-9]*)  report "$file" "$line" "$match" "${match%%%-*}-severity-minimal" "clinical severity (if clinical context)" ;;
        text-red-[0-9]*|bg-red-[0-9]*)      report "$file" "$line" "$match" "${match%%%-*}-severity-severe" "clinical severity" ;;
        text-yellow-[0-9]*|bg-yellow-[0-9]*) report "$file" "$line" "$match" "${match%%%-*}-severity-mild" "clinical severity" ;;
        text-amber-[0-9]*|bg-amber-[0-9]*)  report "$file" "$line" "$match" "${match%%%-*}-severity-mild" "clinical severity" ;;
        text-orange-[0-9]*|bg-orange-[0-9]*) report "$file" "$line" "$match" "${match%%%-*}-severity-moderate" "clinical severity" ;;
      esac
    done
  done < <(grep -n -E '\b(text|bg)-(green|red|yellow|amber|orange)-[0-9]+\b' "$file" 2>/dev/null || true)
}

# ─── Run all checks ──────────────────────────────────────────────────────────

echo "HoliLabs Design Token Linter"
echo "Scanning: $(echo "$FILES" | wc -l | tr -d ' ') files"
echo "═══════════════════════════════════════════"

for file in $FILES; do
  [ -f "$file" ] || continue
  check_spacing "$file"
  check_typography "$file"
  check_clinical_colors "$file"
done

echo ""
echo "═══════════════════════════════════════════"
if [ "$VIOLATIONS" -eq 0 ]; then
  echo -e "${CYAN}✓ No token violations found. Clean!${NC}"
  exit 0
else
  echo -e "${RED}${VIOLATIONS} violations in ${VIOLATION_FILES} files.${NC}"
  echo "Run token migration before merge."
  exit 1
fi
