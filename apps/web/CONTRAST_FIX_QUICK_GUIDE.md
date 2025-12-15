# Quick Reference Guide: Low-Contrast Text Fixes

**Agent 10 - Batch 2 (N-Z Files)**

## TL;DR - The Decision Tree

```
Is it text-gray-400 or text-gray-500?
    ↓
YES → What kind of text is it?
    │
    ├─→ Body text / Label / Button → UPGRADE to text-gray-600 dark:text-gray-400
    │
    ├─→ Icon / Timestamp / Meta info → KEEP + ADD COMMENT
    │
    └─→ Helper text / Placeholder → KEEP + ADD COMMENT
```

---

## Quick Categorization

### ✅ UPGRADE THESE (Body Text & Labels)

| Type | Example | Fix |
|------|---------|-----|
| Paragraph text | `<p className="text-gray-500">Patient details...</p>` | → `text-gray-600 dark:text-gray-400` |
| Labels | `<label className="text-gray-500">Name</label>` | → `text-gray-600 dark:text-gray-400` |
| Empty state messages | `<p className="text-gray-500">No data found</p>` | → `text-gray-600 dark:text-gray-400` |
| Section headers | `<h3 className="text-gray-500">Overview</h3>` | → `text-gray-600 dark:text-gray-400` |
| Error messages | `<span className="text-gray-500">Invalid input</span>` | → `text-gray-600 dark:text-gray-400` |
| List item text | `<li className="text-gray-500">Item description</li>` | → `text-gray-600 dark:text-gray-400` |

### ⚪ KEEP THESE (Decorative Elements)

| Type | Example | Action |
|------|---------|--------|
| Icons | `<svg className="text-gray-400">...</svg>` | Add comment: `{/* Decorative - low contrast intentional for visual hierarchy */}` |
| Timestamps | `<span className="text-gray-500">2 hours ago</span>` | Add comment: `{/* Decorative - low contrast intentional for timestamp meta info */}` |
| View counts | `<span className="text-gray-400">24 views</span>` | Add comment: `{/* Decorative - low contrast intentional for meta info */}` |
| Placeholders | `placeholder="..." className="placeholder:text-gray-400"` | Add comment: `{/* Decorative - low contrast intentional for placeholder */}` |
| Helper text | `<p className="text-xs text-gray-500">Optional field</p>` | Add comment: `{/* Decorative - low contrast intentional for helper text */}` |
| Dividers | `<div className="border-gray-400">` | Add comment above |
| Copyright | `<p className="text-gray-500">© 2024</p>` | Add comment: `{/* Decorative - low contrast intentional for legal text */}` |

---

## 4-Step Process Per File

### Step 1: Find
```bash
grep -n "text-gray-400\|text-gray-500" [filename].tsx
```

### Step 2: Categorize
For each line:
- Read surrounding context
- Is it conveying important information? → **Upgrade**
- Is it decorative/meta? → **Keep + Comment**

### Step 3: Fix
```typescript
// Upgrade:
text-gray-500 → text-gray-600 dark:text-gray-400

// Keep:
{/* Decorative - low contrast intentional for [reason] */}
<element className="text-gray-400">
```

### Step 4: Verify
- No syntax errors
- Dark mode still works
- Visual hierarchy maintained

---

## Copy-Paste Fixes

### Fix 1: Simple Text Upgrade
```typescript
// BEFORE:
<p className="text-gray-500">Patient information</p>

// AFTER:
<p className="text-gray-600 dark:text-gray-400">Patient information</p>
```

### Fix 2: Conditional Class Upgrade
```typescript
// BEFORE:
className={isActive ? 'text-gray-900' : 'text-gray-500'}

// AFTER:
className={isActive ? 'text-gray-900' : 'text-gray-600 dark:text-gray-400'}
```

### Fix 3: Template String Upgrade
```typescript
// BEFORE:
className={`text-sm ${isRead ? 'text-gray-500' : 'text-gray-900'}`}

// AFTER:
className={`text-sm ${isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900'}`}
```

### Fix 4: Decorative Icon Comment
```typescript
// BEFORE:
<svg className="h-5 w-5 text-gray-400" fill="none">

// AFTER:
{/* Decorative - low contrast intentional for visual hierarchy */}
<svg className="h-5 w-5 text-gray-400" fill="none">
```

### Fix 5: Timestamp Comment
```typescript
// BEFORE:
<span className="text-xs text-gray-500">{timestamp}</span>

// AFTER:
{/* Decorative - low contrast intentional for timestamp meta info */}
<span className="text-xs text-gray-500">{timestamp}</span>
```

---

## Common Patterns by Component Type

### Empty States
```typescript
// Icon - KEEP
{/* Decorative - low contrast intentional for visual hierarchy */}
<svg className="text-gray-400">...</svg>

// Message - UPGRADE
<p className="text-gray-600 dark:text-gray-400">No items found</p>
```

### Cards with Metadata
```typescript
<div className="card">
  {/* Title - Already good */}
  <h3 className="text-gray-900">Card Title</h3>

  {/* Description - UPGRADE if gray-500 */}
  <p className="text-gray-600 dark:text-gray-400">Description</p>

  {/* Timestamp - KEEP */}
  {/* Decorative - low contrast intentional for timestamp meta info */}
  <span className="text-gray-500">2 hours ago</span>
</div>
```

### Forms
```typescript
<div>
  {/* Label - UPGRADE if gray-500 */}
  <label className="text-gray-600 dark:text-gray-400">Email</label>

  {/* Input with placeholder - KEEP placeholder style */}
  {/* Decorative - low contrast intentional for placeholder */}
  <input placeholder="Enter email" className="placeholder:text-gray-400" />

  {/* Helper text - KEEP */}
  {/* Decorative - low contrast intentional for helper text */}
  <p className="text-xs text-gray-500">We'll never share your email</p>
</div>
```

### Lists
```typescript
<ul>
  <li>
    {/* Main text - UPGRADE if gray-500 */}
    <span className="text-gray-600 dark:text-gray-400">Item description</span>

    {/* Meta info - KEEP */}
    {/* Decorative - low contrast intentional for meta info */}
    <span className="text-gray-500">24 views</span>
  </li>
</ul>
```

---

## File-by-File Checklist

For each file:
- [ ] Run grep to find all instances
- [ ] Categorize each instance (upgrade vs keep)
- [ ] Apply fixes
- [ ] Add comments for decorative elements
- [ ] Verify no syntax errors
- [ ] Check dark mode classes added
- [ ] Mark file as complete in tracking document

---

## Priority Order

### 🔴 High Priority (Do First)
1. Portal patient-facing pages
2. Login/authentication pages
3. Main dashboard pages
4. Patient forms

### 🟡 Medium Priority
1. Admin dashboard pages
2. Clinical workflow pages
3. Common components used across app
4. Prevention/screening features

### 🟢 Lower Priority (Do Last)
1. Settings pages
2. Admin-only tools
3. Developer/debug pages
4. Rarely used features

---

## When in Doubt

### Ask These Questions:
1. **Is this text important for understanding the content?** → Upgrade
2. **Would someone with low vision need to read this?** → Upgrade
3. **Is this just visual decoration or metadata?** → Keep
4. **Could the page function without this text?** → Might be decorative

### Examples:

**"No patients found"** → Important message → **Upgrade**
**"2 hours ago"** → Supplemental metadata → **Keep**
**Search icon** → Visual decoration → **Keep**
**"Patient Name" (label)** → Critical for form → **Upgrade**
**"24 views"** → Nice to have, not critical → **Keep**

---

## Batch Processing Tips

1. **Group similar files:** Do all portal pages together, then dashboard pages, etc.
2. **Test every 10 files:** Run app to catch issues early
3. **Use find & replace carefully:** For obvious patterns like empty states
4. **Document exceptions:** If something doesn't fit the pattern
5. **Take breaks:** Prevents mistakes from fatigue

---

## Testing Checklist

After processing a batch of files:
- [ ] App runs without errors
- [ ] Dark mode works correctly
- [ ] Text is readable on all backgrounds
- [ ] No layout shifts or visual regressions
- [ ] Decorative elements still look intentionally subtle

---

## Quick Stats Reference

- **Target Contrast Ratio:** 4.5:1 (WCAG AA)
- **text-gray-600 on white:** 7.48:1 ✅
- **text-gray-500 on white:** 4.47:1 (borderline)
- **text-gray-400 on white:** 2.84:1 ❌

---

## Common Mistakes to Avoid

❌ **Don't:** Upgrade ALL gray-400/500 blindly
✅ **Do:** Categorize first, then apply appropriate fix

❌ **Don't:** Remove decorative low-contrast elements
✅ **Do:** Keep them but add explanatory comments

❌ **Don't:** Forget dark mode variants
✅ **Do:** Always add `dark:text-gray-400` when upgrading

❌ **Don't:** Change conditional logic
✅ **Do:** Only update the className strings

---

## Files Completed: ☐☐☐☐☐☐ (6/157)

Track your progress by marking off files as you complete them!

---

**Quick Reference Version:** 1.0
**Created:** 2025-12-14
**For:** Agent 10 - Batch 2 (N-Z Files)
**Full Details:** See `CONTRAST_FIX_BATCH2_REPORT.md`
