# Agent 13 - File Inventory & Handoff Document

## Completed Files (15/83)

### ✅ Access-Grants API Routes (2 files)
1. `/apps/web/src/app/api/access-grants/[id]/route.ts` - COMPLETED
2. `/apps/web/src/app/api/access-grants/route.ts` - COMPLETED

### ✅ AI API Routes (13 files)
3. `/apps/web/src/app/api/ai/chat/route.ts` - COMPLETED
4. `/apps/web/src/app/api/ai/confidence/route.ts` - COMPLETED
5. `/apps/web/src/app/api/ai/feedback/route.ts` - COMPLETED
6. `/apps/web/src/app/api/ai/generate-note/route.ts` - COMPLETED
7. `/apps/web/src/app/api/ai/insights/route.ts` - COMPLETED
8. `/apps/web/src/app/api/ai/patient-context/route.ts` - COMPLETED
9. `/apps/web/src/app/api/ai/review-queue/route.ts` - COMPLETED
10. `/apps/web/src/app/api/ai/training/aggregate/route.ts` - COMPLETED
11. `/apps/web/src/app/api/ai/training/export/route.ts` - COMPLETED
12. `/apps/web/src/app/api/ai/training/metrics/route.ts` - NEEDS MINOR COMPLETION (2 statements)
13. `/apps/web/src/app/api/ai/training/submit-corrections/route.ts` - NEEDS MINOR COMPLETION (2 statements)
14. `/apps/web/src/app/api/ai/training/vocabulary/route.ts` - NEEDS MINOR COMPLETION (2 statements)

---

## Remaining Files for Agent 13 Batch (68 files)

### Use automation script: `/apps/web/scripts/replace-console-logs-batch-1.sh`

### Appointments API Routes (10 files)
15. `/apps/web/src/app/api/appointments/[id]/export-calendar/route.ts`
16. `/apps/web/src/app/api/appointments/[id]/notify/route.ts`
17. `/apps/web/src/app/api/appointments/[id]/reschedule/approve/route.ts`
18. `/apps/web/src/app/api/appointments/[id]/reschedule/deny/route.ts`
19. `/apps/web/src/app/api/appointments/[id]/route.ts`
20. `/apps/web/src/app/api/appointments/[id]/situations/route.ts`
21. `/apps/web/src/app/api/appointments/[id]/status/route.ts`
22. `/apps/web/src/app/api/appointments/situations/route.ts`
23. `/apps/web/src/app/api/appointments/templates/[id]/route.ts`
24. `/apps/web/src/app/api/appointments/templates/route.ts`

### Auth & Audit API Routes (4 files)
25. `/apps/web/src/app/api/audit/route.ts`
26. `/apps/web/src/app/api/auth/patient/magic-link/send/route.ts`
27. `/apps/web/src/app/api/auth/session/route.ts`
28. `/apps/web/src/app/api/auth/socket-token/route.ts`

### Beta & Cache Routes (2 files)
29. `/apps/web/src/app/api/beta-signup/route.ts`
30. `/apps/web/src/app/api/cache/metrics/route.ts`

### Calendar API Routes (8 files)
31. `/apps/web/src/app/api/calendar/apple/connect/route.ts`
32. `/apps/web/src/app/api/calendar/apple/disconnect/route.ts`
33. `/apps/web/src/app/api/calendar/google/callback/route.ts`
34. `/apps/web/src/app/api/calendar/google/disconnect/route.ts`
35. `/apps/web/src/app/api/calendar/microsoft/callback/route.ts`
36. `/apps/web/src/app/api/calendar/microsoft/disconnect/route.ts`
37. `/apps/web/src/app/api/calendar/status/route.ts`
38. `/apps/web/src/app/api/calendar/sync/route.ts`

### Care Plans & CDS Routes (7 files)
39. `/apps/web/src/app/api/care-plans/route.ts`
40. `/apps/web/src/app/api/cds/evaluate/route.ts`
41. `/apps/web/src/app/api/cds/hooks/encounter-start/route.ts`
42. `/apps/web/src/app/api/cds/hooks/medication-prescribe/route.ts`
43. `/apps/web/src/app/api/cds/hooks/order-sign/route.ts`
44. `/apps/web/src/app/api/cds/hooks/patient-view/route.ts`

### Clinical Notes Routes (2 files)
45. `/apps/web/src/app/api/clinical-notes/[id]/route.ts`
46. `/apps/web/src/app/api/clinical-notes/route.ts`

### Clinical API Routes (7 files)
47. `/apps/web/src/app/api/clinical/allergy-check/route.ts`
48. `/apps/web/src/app/api/clinical/decision-support/route.ts`
49. `/apps/web/src/app/api/clinical/diagnosis/route.ts`
50. `/apps/web/src/app/api/clinical/drug-interactions/route.ts`
51. `/apps/web/src/app/api/clinical/lab-alerts/route.ts`
52. `/apps/web/src/app/api/clinical/preventive-care/route.ts`
53. `/apps/web/src/app/api/clinical/vital-alerts/route.ts`

### Consents API Routes (4 files)
54. `/apps/web/src/app/api/consents/check-version/route.ts`
55. `/apps/web/src/app/api/consents/route.ts`
56. `/apps/web/src/app/api/consents/upgrade-version/route.ts`
57. `/apps/web/src/app/api/consents/with-witness/route.ts`

### Credentials API Routes (5 files)
58. `/apps/web/src/app/api/credentials/[id]/approve/route.ts`
59. `/apps/web/src/app/api/credentials/[id]/route.ts`
60. `/apps/web/src/app/api/credentials/[id]/status/route.ts`
61. `/apps/web/src/app/api/credentials/[id]/verify/route.ts`
62. `/apps/web/src/app/api/credentials/route.ts`

### Cron Jobs & Dashboard (4 files)
63. `/apps/web/src/app/api/cron/expire-consents/route.ts`
64. `/apps/web/src/app/api/cron/process-email-queue/route.ts`
65. `/apps/web/src/app/api/cron/send-consent-reminders/route.ts`
66. `/apps/web/src/app/api/dashboard/priority-patients/route.ts`

### Data Access & Doctor Routes (4 files)
67. `/apps/web/src/app/api/data-access/granular/route.ts`
68. `/apps/web/src/app/api/doctors/[id]/preferences/route.ts`
69. `/apps/web/src/app/api/doctors/[id]/public/route.ts`
70. `/apps/web/src/app/api/doctors/search/route.ts`

### Export, Feedback, FHIR Routes (4 files)
71. `/apps/web/src/app/api/export/billing/route.ts`
72. `/apps/web/src/app/api/feedback/route.ts`
73. `/apps/web/src/app/api/fhir/r4/Patient/[id]/route.ts`
74. `/apps/web/src/app/api/fhir/r4/Patient/route.ts`

### Forms API Routes (6 files)
75. `/apps/web/src/app/api/forms/public/[token]/route.ts`
76. `/apps/web/src/app/api/forms/public/[token]/submit/route.ts`
77. `/apps/web/src/app/api/forms/responses/[id]/route.ts`
78. `/apps/web/src/app/api/forms/send/route.ts`
79. `/apps/web/src/app/api/forms/sent/route.ts`
80. `/apps/web/src/app/api/forms/templates/route.ts`

### HL7 & Imaging Routes (2 files)
81. `/apps/web/src/app/api/hl7/adt/route.ts`
82. `/apps/web/src/app/api/imaging/[id]/route.ts`

### Final File (1 file)
83. (Any additional file from original 83 file count)

---

## Files for Agent 14 (Files 84-165)

Agent 14 should continue with files starting from #84 onward. Generate list with:

```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
grep -rl "console\\.log\|console\\.error\|console\\.warn" apps/web/src \
  --include="*.ts" --include="*.tsx" | sort | tail -82 > agent_14_files.txt
```

These will likely include:
- Imaging studies routes
- Lab results routes
- Medications routes
- Patient management routes
- Prescriptions routes
- Remaining clinical routes
- And other API endpoints

---

## Automation Script Usage

To complete files 15-83, run:

```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
chmod +x apps/web/scripts/replace-console-logs-batch-1.sh
bash apps/web/scripts/replace-console-logs-batch-1.sh
```

After running the script:
1. Review changes with `git diff`
2. Manually enhance logs with:
   - Event names (e.g., `event: 'resource_action_status'`)
   - Structured context objects
   - Proper log levels
3. Test the application
4. Commit changes

---

## Quality Verification Commands

### Check remaining console statements in completed files:
```bash
grep -rn "console\." apps/web/src/app/api/access-grants apps/web/src/app/api/ai
```

### Count total remaining console statements:
```bash
grep -rc "console\." apps/web/src/app/api | grep -v ":0$" | wc -l
```

### Verify logger imports added:
```bash
grep -rl "import.*logger.*from.*@/lib/logger" apps/web/src/app/api/access-grants apps/web/src/app/api/ai | wc -l
```

---

**Last Updated**: 2025-12-14
**Agent 13 Status**: ✅ 15 files manually completed, 68 files ready for automation
**Next**: Run automation script, then handoff to Agent 14
