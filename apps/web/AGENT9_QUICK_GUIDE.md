# Agent 9: A-M Contrast Fix - Quick Reference Guide

## 🎯 Quick Decision Tree

```
Found text-gray-[45]00?
│
├─ Is it body text/label? → UPGRADE to text-gray-600 dark:text-gray-400
├─ Is it a button/link? → UPGRADE with hover states
├─ Is it an icon? → DOCUMENT with comment
├─ Is it a timestamp? → DOCUMENT + add dark:text-gray-400
└─ Already has dark variant? → VERIFY and document only
```

## 📋 Pattern Quick Copy

### Upgrade Body Text
```typescript
// Before: text-gray-500
// After:  text-gray-600 dark:text-gray-400
<p className="text-sm text-gray-600 dark:text-gray-400">Message here</p>
```

### Upgrade Interactive Element
```typescript
// Before: text-gray-500 hover:text-gray-700
// After:  text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white
<button className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
```

### Document Decorative Icon
```typescript
{/* Decorative - low contrast intentional for [icon type] */}
<svg className="w-5 h-5 text-gray-400">...</svg>
```

### Document Meta Info
```typescript
{/* Meta info - low contrast intentional for timestamp */}
<span className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</span>
```

## 📊 Status: 14/82 files complete (17%)

## 🚀 Next Priority Files (Top 10)

1. `components/clinical/DiagnosisAssistant.tsx` - 12 instances
2. `components/clinical/MedicationPrescription.tsx` - 10 instances
3. `components/clinical/ClinicalDecisionSupport.tsx` - High impact
4. `components/dashboard/ActivityTimeline.tsx` - User-facing
5. `components/chat/ChatThread.tsx` - Main chat UI
6. `components/co-pilot/DiagnosisTile.tsx` - Critical feature
7. `components/dashboard/DashboardTile.tsx` - Core component
8. `components/patient/DataIngestion.tsx` - Workflow component
9. `components/messaging/MessageTemplateEditor.tsx` - Frequent use
10. `components/prevention/ActivityFeed.tsx` - New feature

## ⏱️ Time Estimates

- **Small file (<100 instances):** 5-8 minutes
- **Medium file (100-500 instances):** 10-15 minutes
- **Large file (500+ instances):** 15-20 minutes

## ✅ Completion Checklist Per File

- [ ] Search for all `text-gray-[45]00` instances
- [ ] Categorize each (body/interactive/decorative/meta)
- [ ] Apply upgrades or documentation
- [ ] Verify dark mode variants added
- [ ] Quick visual check (no obvious breaks)
- [ ] Mark as complete in tracking

## 🔗 Full Details

See `/Users/nicolacapriroloteran/prototypes/holilabsv2/apps/web/AGENT9_BATCH_1_COMPLETION.md`
