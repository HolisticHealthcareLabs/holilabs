#!/bin/bash

##
# Mobile Responsiveness Check Script
#
# This script scans the codebase for common mobile responsiveness issues
# and provides recommendations for fixing them.
##

echo "🔍 Mobile Responsiveness Audit"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
critical_count=0
warning_count=0
info_count=0

# Base directory
BASE_DIR="src"

echo "📱 Scanning for mobile responsiveness issues..."
echo ""

##
# 1. Check for fixed widths without responsive breakpoints
##
echo "${BLUE}[1/10]${NC} Checking for fixed-width elements..."
fixed_widths=$(grep -r "w-\[.*px\]" $BASE_DIR --include="*.tsx" | grep -v "sm:\|md:\|lg:\|xl:" | grep -v "min-w-\[44px\]\|min-w-\[48px\]")

if [ -n "$fixed_widths" ]; then
  count=$(echo "$fixed_widths" | wc -l | tr -d ' ')
  echo "${RED}✗ Found $count fixed-width elements without responsive breakpoints${NC}"
  echo "$fixed_widths" | head -5
  if [ "$count" -gt 5 ]; then
    echo "  ... and $((count - 5)) more"
  fi
  echo ""
  critical_count=$((critical_count + count))
else
  echo "${GREEN}✓ No problematic fixed-width elements found${NC}"
  echo ""
fi

##
# 2. Check for fixed heights without responsive breakpoints
##
echo "${BLUE}[2/10]${NC} Checking for fixed-height elements..."
fixed_heights=$(grep -r "h-\[.*px\]" $BASE_DIR --include="*.tsx" | grep -v "sm:\|md:\|lg:\|xl:\|min-h-\[44px\]\|min-h-\[48px\]")

if [ -n "$fixed_heights" ]; then
  count=$(echo "$fixed_heights" | wc -l | tr -d ' ')
  echo "${YELLOW}⚠ Found $count fixed-height elements without responsive breakpoints${NC}"
  echo "$fixed_heights" | head -3
  if [ "$count" -gt 3 ]; then
    echo "  ... and $((count - 3)) more"
  fi
  echo ""
  warning_count=$((warning_count + count))
else
  echo "${GREEN}✓ No problematic fixed-height elements found${NC}"
  echo ""
fi

##
# 3. Check for text sizes smaller than 14px
##
echo "${BLUE}[3/10]${NC} Checking for text too small for mobile..."
small_text=$(grep -r "text-\[1[0-3]px\]\|text-xs" $BASE_DIR --include="*.tsx" | grep -v "text-base\|text-sm")

if [ -n "$small_text" ]; then
  count=$(echo "$small_text" | wc -l | tr -d ' ')
  echo "${YELLOW}⚠ Found $count instances of very small text (< 14px)${NC}"
  echo "$small_text" | head -3
  echo "  Note: Small text can cause iOS to zoom on tap"
  echo ""
  warning_count=$((warning_count + count))
else
  echo "${GREEN}✓ No problematic small text found${NC}"
  echo ""
fi

##
# 4. Check for buttons/touch targets that may be too small
##
echo "${BLUE}[4/10]${NC} Checking for touch targets smaller than 44px..."
small_buttons=$(grep -r "w-[1-9]\s\|h-[1-9]\s\|w-1[0]\s\|h-1[0]\s" $BASE_DIR --include="*.tsx" --include="*.jsx")

if [ -n "$small_buttons" ]; then
  count=$(echo "$small_buttons" | wc -l | tr -d ' ')
  echo "${RED}✗ Found $count potentially small touch targets${NC}"
  echo "  Touch targets should be minimum 44x44px (w-11 h-11)"
  echo ""
  critical_count=$((critical_count + 1))
else
  echo "${GREEN}✓ No obviously small touch targets found${NC}"
  echo ""
fi

##
# 5. Check for min-width constraints that may cause horizontal scroll
##
echo "${BLUE}[5/10]${NC} Checking for problematic min-width constraints..."
min_widths=$(grep -r "min-w-\[[5-9][0-9][0-9]px\]\|min-w-\[1[0-9][0-9][0-9]px\]" $BASE_DIR --include="*.tsx" | grep -v "md:min-w\|lg:min-w")

if [ -n "$min_widths" ]; then
  count=$(echo "$min_widths" | wc -l | tr -d ' ')
  echo "${RED}✗ Found $count min-width constraints that may cause horizontal scroll${NC}"
  echo "$min_widths"
  echo ""
  critical_count=$((critical_count + count))
else
  echo "${GREEN}✓ No problematic min-width constraints found${NC}"
  echo ""
fi

##
# 6. Check for max-width constraints without mobile consideration
##
echo "${BLUE}[6/10]${NC} Checking for max-width constraints..."
max_widths=$(grep -r "max-w-\[[0-9][0-9][0-9][0-9]px\]" $BASE_DIR --include="*.tsx")

if [ -n "$max_widths" ]; then
  count=$(echo "$max_widths" | wc -l | tr -d ' ')
  echo "${YELLOW}⚠ Found $count large max-width constraints${NC}"
  echo "  These should have responsive breakpoints"
  echo ""
  info_count=$((info_count + count))
else
  echo "${GREEN}✓ No large max-width constraints found${NC}"
  echo ""
fi

##
# 7. Check for tables without overflow-x-auto
##
echo "${BLUE}[7/10]${NC} Checking for tables without horizontal scroll..."
tables_without_scroll=$(grep -r "<table" $BASE_DIR --include="*.tsx" -B 2 | grep -v "overflow-x-auto" | grep "<table" || echo "")

if [ -n "$tables_without_scroll" ]; then
  count=$(echo "$tables_without_scroll" | wc -l | tr -d ' ')
  echo "${YELLOW}⚠ Found $count tables that may not scroll on mobile${NC}"
  echo "  Tables should be wrapped in overflow-x-auto containers"
  echo ""
  warning_count=$((warning_count + 1))
else
  echo "${GREEN}✓ Tables appear to have scroll handling${NC}"
  echo ""
fi

##
# 8. Check for hover-only interactions
##
echo "${BLUE}[8/10]${NC} Checking for hover-only interactions..."
hover_only=$(grep -r "group-hover:\|hover:" $BASE_DIR --include="*.tsx" | grep -v "focus:\|active:\|group-focus:\|focus-visible:")

if [ -n "$hover_only" ]; then
  count=$(echo "$hover_only" | wc -l | tr -d ' ')
  echo "${YELLOW}⚠ Found $count potential hover-only interactions${NC}"
  echo "  Ensure touch alternatives exist"
  echo ""
  warning_count=$((warning_count + 1))
fi

##
# 9. Check for missing viewport meta tag
##
echo "${BLUE}[9/10]${NC} Checking for viewport meta tag..."
viewport_check=$(grep -r "viewport" src/app --include="*.tsx" --include="layout.tsx")

if [ -z "$viewport_check" ]; then
  echo "${RED}✗ Viewport meta tag may be missing${NC}"
  echo "  Add to layout.tsx: <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />"
  echo ""
  critical_count=$((critical_count + 1))
else
  echo "${GREEN}✓ Viewport meta tag found${NC}"
  echo ""
fi

##
# 10. Check for form inputs without proper mobile attributes
##
echo "${BLUE}[10/10]${NC} Checking for form inputs without mobile optimization..."
inputs_without_type=$(grep -r "<input" $BASE_DIR --include="*.tsx" | grep -v "type=\|inputMode=")

if [ -n "$inputs_without_type" ]; then
  count=$(echo "$inputs_without_type" | wc -l | tr -d ' ')
  echo "${YELLOW}⚠ Found $count inputs that may need mobile optimization${NC}"
  echo "  Add inputMode and autoComplete attributes"
  echo ""
  info_count=$((info_count + 1))
fi

##
# Summary
##
echo ""
echo "================================"
echo "📊 Summary"
echo "================================"
echo ""
echo "${RED}Critical Issues: $critical_count${NC}"
echo "${YELLOW}Warnings: $warning_count${NC}"
echo "${BLUE}Info: $info_count${NC}"
echo ""

if [ $critical_count -gt 0 ]; then
  echo "${RED}⚠️  CRITICAL: Mobile responsiveness issues detected!${NC}"
  echo "   Review the audit report for details."
  echo ""
  exit 1
elif [ $warning_count -gt 10 ]; then
  echo "${YELLOW}⚠️  WARNING: Multiple mobile issues detected${NC}"
  echo "   Consider addressing these issues."
  echo ""
  exit 0
else
  echo "${GREEN}✅ Mobile responsiveness looks good!${NC}"
  echo "   Only minor issues detected."
  echo ""
  exit 0
fi

##
# Quick Fixes Suggestions
##
echo "💡 Quick Fix Suggestions:"
echo "========================="
echo ""
echo "1. Fix fixed-width elements:"
echo "   ${BLUE}# Before${NC}"
echo "   <div className=\"min-w-[800px]\">"
echo "   ${GREEN}# After${NC}"
echo "   <div className=\"min-w-full md:min-w-[800px]\">"
echo ""
echo "2. Fix touch targets:"
echo "   ${BLUE}# Before${NC}"
echo "   <button className=\"w-9 h-9\">"
echo "   ${GREEN}# After${NC}"
echo "   <button className=\"w-11 h-11 min-w-[44px] min-h-[44px]\">"
echo ""
echo "3. Fix text sizes:"
echo "   ${BLUE}# Before${NC}"
echo "   <span className=\"text-[10px]\">"
echo "   ${GREEN}# After${NC}"
echo "   <span className=\"text-xs\">"
echo ""
echo "4. Add mobile menu:"
echo "   ${BLUE}# Before (desktop only)${NC}"
echo "   <div className=\"hidden md:flex\">"
echo "   ${GREEN}# After (with mobile)${NC}"
echo "   <div className=\"md:hidden\">"
echo "     <button onClick={toggleMobileMenu}>☰</button>"
echo "   </div>"
echo ""
echo "See MOBILE_RESPONSIVENESS_AUDIT.md for full details"
echo ""
