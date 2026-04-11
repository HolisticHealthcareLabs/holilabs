#!/bin/bash
# =============================================================================
# HoliLabs Accessibility Audit
# =============================================================================
#
# Static analysis for common accessibility violations in .tsx files.
# CI-ready: exits 1 if violations found, 0 if clean.
#
# Checks:
#   1. Every page.tsx has an <h1> tag
#   2. Icon-only buttons have aria-label
#   3. Modals have role="dialog"
#   4. Tables have <thead> and <th>
#   5. No font sizes below 10px
#   6. Interactive elements have focus styles
#   7. Images/icons have alt text or aria-hidden
#
# Usage:
#   ./accessibility-audit.sh              # Audit dashboard pages
#   ./accessibility-audit.sh --all        # Audit entire src/
#   ./accessibility-audit.sh file.tsx     # Audit single file
# =============================================================================
set -euo pipefail

HOLILABS_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC_DIR="$HOLILABS_ROOT/apps/web/src"
SCAN_DIR="$SRC_DIR/app/dashboard"

ALL=false
SINGLE_FILE=""
for arg in "$@"; do
  case "$arg" in
    --all) ALL=true; SCAN_DIR="$SRC_DIR" ;;
    *.tsx) SINGLE_FILE="$arg" ;;
  esac
done

RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m'

VIOLATIONS=0
WARNINGS=0

violation() {
  local file="$1" line="$2" rule="$3" detail="$4"
  local rel="${file#$HOLILABS_ROOT/}"
  echo -e "  ${RED}VIOLATION${NC} ${CYAN}${rel}:${line}${NC} — ${YELLOW}[${rule}]${NC} ${detail}"
  VIOLATIONS=$((VIOLATIONS + 1))
}

warning() {
  local file="$1" line="$2" rule="$3" detail="$4"
  local rel="${file#$HOLILABS_ROOT/}"
  echo -e "  ${YELLOW}WARNING${NC}   ${CYAN}${rel}:${line}${NC} — ${GRAY}[${rule}]${NC} ${detail}"
  WARNINGS=$((WARNINGS + 1))
}

echo "HoliLabs Accessibility Audit"
echo "═══════════════════════════════════════════"
echo ""

# ─── Check 1: Every page.tsx has <h1> ─────────────────────────────────────────

echo -e "${CYAN}[1/7] Page headings (<h1>)${NC}"
if [ -n "$SINGLE_FILE" ]; then
  PAGE_FILES="$SINGLE_FILE"
else
  PAGE_FILES=$(find "$SCAN_DIR" -name "page.tsx" -not -path "*/node_modules/*" -not -path "*/.next/*" 2>/dev/null)
fi

for file in $PAGE_FILES; do
  [ -f "$file" ] || continue
  basename=$(basename "$file")
  [ "$basename" != "page.tsx" ] && continue

  if ! grep -q '<h1\b' "$file" 2>/dev/null; then
    violation "$file" "1" "H1_MISSING" "Page has no <h1> heading. Every page needs a main heading for screen readers."
  fi
done

# ─── Check 2: Icon-only buttons have aria-label ──────────────────────────────

echo -e "${CYAN}[2/7] Icon-only buttons (aria-label)${NC}"

if [ -n "$SINGLE_FILE" ]; then
  BUTTON_FILES="$SINGLE_FILE"
else
  BUTTON_FILES=$(find "$SCAN_DIR" -name "*.tsx" -not -path "*/node_modules/*" -not -path "*/.next/*" 2>/dev/null)
fi

for file in $BUTTON_FILES; do
  [ -f "$file" ] || continue
  # Find <button> tags that contain only an icon component (no text children)
  # Heuristic: button with only a Lucide icon child and no aria-label
  grep -n '<button' "$file" 2>/dev/null | while IFS=: read -r line content; do
    # Check if this button line or the next few lines have aria-label
    context=$(sed -n "${line},$((line + 3))p" "$file" 2>/dev/null)
    # If button contains only an Icon (ClassName ending in Icon or from lucide-react) and no text
    if echo "$context" | grep -qE '<(Check|X|Plus|Minus|Search|Filter|Download|Upload|Settings|Menu|ChevronLeft|ChevronRight|RefreshCw|Send|Paperclip|Trash|Edit|Eye|Copy|Link|Unlink) ' && \
       ! echo "$context" | grep -q 'aria-label' && \
       ! echo "$context" | grep -qE '>[A-Za-z]'; then
      warning "$file" "$line" "ICON_BUTTON_NO_LABEL" "Button appears icon-only without aria-label"
    fi
  done
done

# ─── Check 3: Modals have role="dialog" ──────────────────────────────────────

echo -e "${CYAN}[3/7] Modal role='dialog'${NC}"

for file in $BUTTON_FILES; do
  [ -f "$file" ] || continue
  # Find modal-like patterns (fixed inset-0 overlay with inner content)
  grep -n 'fixed inset-0\|isOpen\|isModalOpen\|showModal' "$file" 2>/dev/null | while IFS=: read -r line content; do
    # Check surrounding context for role="dialog"
    context=$(sed -n "$((line > 5 ? line - 5 : 1)),$((line + 10))p" "$file" 2>/dev/null)
    if echo "$content" | grep -q 'fixed inset-0'; then
      if ! echo "$context" | grep -q 'role="dialog"\|role=.dialog.\|aria-modal'; then
        warning "$file" "$line" "MODAL_NO_ROLE" "Modal overlay detected without role='dialog' or aria-modal='true'"
      fi
    fi
  done
done

# ─── Check 4: Tables have <thead> and <th> ───────────────────────────────────

echo -e "${CYAN}[4/7] Table structure (<thead>, <th>)${NC}"

for file in $BUTTON_FILES; do
  [ -f "$file" ] || continue
  if grep -q '<table' "$file" 2>/dev/null; then
    if ! grep -q '<thead' "$file" 2>/dev/null; then
      line=$(grep -n '<table' "$file" | head -1 | cut -d: -f1)
      violation "$file" "$line" "TABLE_NO_THEAD" "Table missing <thead>. Required for screen reader table navigation."
    fi
    if ! grep -q '<th' "$file" 2>/dev/null; then
      line=$(grep -n '<table' "$file" | head -1 | cut -d: -f1)
      violation "$file" "$line" "TABLE_NO_TH" "Table missing <th> header cells."
    fi
  fi
done

# ─── Check 5: No tiny font sizes ─────────────────────────────────────────────

echo -e "${CYAN}[5/7] Minimum font size (no <10px)${NC}"

for file in $BUTTON_FILES; do
  [ -f "$file" ] || continue
  grep -n 'text-\[[0-9]*px\]' "$file" 2>/dev/null | while IFS=: read -r line content; do
    size=$(echo "$content" | grep -oE 'text-\[[0-9]+px\]' | grep -oE '[0-9]+')
    if [ -n "$size" ] && [ "$size" -lt 10 ]; then
      violation "$file" "$line" "FONT_TOO_SMALL" "Font size ${size}px is below 10px minimum. Use text-caption (12px) at minimum."
    fi
  done
  # Also check for text-[10px] which is borderline
  grep -n 'text-\[10px\]' "$file" 2>/dev/null | while IFS=: read -r line content; do
    warning "$file" "$line" "FONT_BORDERLINE" "Font size 10px is very small. Consider text-caption (12px) for readability."
  done
done

# ─── Check 6: Focus styles on interactive elements ───────────────────────────

echo -e "${CYAN}[6/7] Focus styles on interactive elements${NC}"

for file in $BUTTON_FILES; do
  [ -f "$file" ] || continue
  # Find buttons and links without focus: or focus-visible: classes
  grep -n '<button\|<a ' "$file" 2>/dev/null | while IFS=: read -r line content; do
    context=$(sed -n "${line},$((line + 2))p" "$file" 2>/dev/null)
    if ! echo "$context" | grep -qE 'focus:|focus-visible:|focus-within:'; then
      # Only flag if it has other styling (className) — pure semantic elements are OK
      if echo "$context" | grep -q 'className'; then
        warning "$file" "$line" "NO_FOCUS_STYLE" "Styled button/link without visible focus indicator (focus: or focus-visible:)"
      fi
    fi
  done
done

# ─── Check 7: Images/icons have alt or aria-hidden ───────────────────────────

echo -e "${CYAN}[7/7] Image alt text / decorative aria-hidden${NC}"

for file in $BUTTON_FILES; do
  [ -f "$file" ] || continue
  grep -n '<img ' "$file" 2>/dev/null | while IFS=: read -r line content; do
    if ! echo "$content" | grep -qE 'alt=|aria-hidden'; then
      violation "$file" "$line" "IMG_NO_ALT" "Image without alt attribute. Use alt='' for decorative or descriptive alt for informational."
    fi
  done
done

# ─── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════"
echo -e "Violations: ${RED}${VIOLATIONS}${NC}"
echo -e "Warnings:   ${YELLOW}${WARNINGS}${NC}"

if [ "$VIOLATIONS" -gt 0 ]; then
  echo -e "${RED}Fix violations before merge.${NC}"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}Warnings found — review recommended.${NC}"
  exit 0
else
  echo -e "${CYAN}✓ All accessibility checks passed!${NC}"
  exit 0
fi
