# Lab Reference Ranges API Examples

Complete examples of API requests and responses for the lab reference ranges system.

---

## 1. Create Lab Result - Normal Value

### Request
```http
POST /api/lab-results
Content-Type: application/json
Authorization: Bearer <token>

{
  "patientId": "cm4abc123xyz",
  "testName": "Hemoglobin",
  "testCode": "718-7",
  "value": "14.5",
  "unit": "g/dL",
  "resultDate": "2025-12-14T10:00:00Z",
  "status": "FINAL",
  "orderingDoctor": "Dr. Smith"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "cm4result123",
    "patientId": "cm4abc123xyz",
    "testName": "Hemoglobin",
    "testCode": "718-7",
    "category": "Hematology",
    "value": "14.5",
    "unit": "g/dL",
    "referenceRange": "13.5-17.5 g/dL",
    "status": "FINAL",
    "interpretation": "Normal hemoglobin level - adequate oxygen-carrying capacity",
    "isAbnormal": false,
    "isCritical": false,
    "orderingDoctor": "Dr. Smith",
    "resultDate": "2025-12-14T10:00:00Z",
    "resultHash": "abc123def456...",
    "createdAt": "2025-12-14T10:05:00Z",
    "updatedAt": "2025-12-14T10:05:00Z"
  },
  "clinicalContext": {
    "loincCode": "718-7",
    "testName": "Hemoglobin",
    "category": "Hematology",
    "clinicalSignificance": "Oxygen-carrying capacity of blood",
    "interpretation": "normal",
    "interpretationText": "Normal hemoglobin level - adequate oxygen-carrying capacity",
    "referenceRange": "13.5-17.5 g/dL",
    "criticalAlerts": [],
    "treatmentRecommendations": [],
    "requiresNotification": false,
    "notificationPriority": "low"
  },
  "monitoring": {
    "monitored": false,
    "testType": null,
    "preventionPlanCreated": false
  }
}
```

---

## 2. Create Lab Result - Abnormal (Non-Critical)

### Request
```http
POST /api/lab-results
Content-Type: application/json
Authorization: Bearer <token>

{
  "patientId": "cm4abc123xyz",
  "testName": "LDL Cholesterol",
  "testCode": "13457-7",
  "value": "180",
  "unit": "mg/dL",
  "resultDate": "2025-12-14T10:00:00Z"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "cm4result456",
    "patientId": "cm4abc123xyz",
    "testName": "LDL Cholesterol",
    "testCode": "13457-7",
    "category": "Lipids",
    "value": "180",
    "unit": "mg/dL",
    "referenceRange": "0-100 mg/dL",
    "status": "PRELIMINARY",
    "interpretation": "Elevated LDL - 100-129 above optimal, 130-159 borderline high, 160-189 high, ≥190 very high. Statin therapy per ACC/AHA guidelines",
    "isAbnormal": true,
    "isCritical": false,
    "resultDate": "2025-12-14T10:00:00Z",
    "createdAt": "2025-12-14T10:05:00Z"
  },
  "clinicalContext": {
    "loincCode": "13457-7",
    "testName": "LDL Cholesterol",
    "category": "Lipids",
    "interpretation": "high",
    "criticalAlerts": [],
    "treatmentRecommendations": [
      {
        "condition": "Elevated LDL Cholesterol",
        "interventions": [
          "Calculate 10-year ASCVD risk using Pooled Cohort Equations",
          "Lifestyle modifications: Mediterranean diet, exercise 150 min/week, weight loss if overweight",
          "Consider statin therapy per ACC/AHA guidelines:",
          "  - LDL ≥190: High-intensity statin",
          "  - Diabetes age 40-75: Moderate to high-intensity statin",
          "  - ASCVD risk ≥7.5%: Moderate to high-intensity statin",
          "High-intensity statins: Atorvastatin 40-80mg or Rosuvastatin 20-40mg",
          "Moderate-intensity statins: Atorvastatin 10-20mg, Rosuvastatin 5-10mg, Simvastatin 20-40mg",
          "Recheck lipids in 4-12 weeks after starting therapy"
        ],
        "monitoring": [
          "Lipid panel every 3-12 months",
          "Monitor for statin side effects (myalgias, transaminitis)",
          "Check CK if muscle symptoms develop",
          "LFTs at baseline and as clinically indicated"
        ],
        "referrals": [
          "Cardiology if familial hypercholesterolemia suspected",
          "Nutrition counseling"
        ],
        "timeframe": "Initiate within 2 weeks",
        "evidenceLevel": "A"
      }
    ],
    "requiresNotification": false,
    "notificationPriority": "medium"
  }
}
```

---

## 3. Create Lab Result - CRITICAL Value

### Request
```http
POST /api/lab-results
Content-Type: application/json
Authorization: Bearer <token>

{
  "patientId": "cm4abc123xyz",
  "testName": "Potassium",
  "testCode": "2823-3",
  "value": "6.8",
  "unit": "mEq/L",
  "resultDate": "2025-12-14T10:00:00Z"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "cm4result789",
    "patientId": "cm4abc123xyz",
    "testName": "Potassium",
    "testCode": "2823-3",
    "category": "Chemistry",
    "value": "6.8",
    "unit": "mEq/L",
    "referenceRange": "3.5-5.0 mEq/L",
    "status": "PRELIMINARY",
    "interpretation": "Hyperkalemia - consider renal failure, ACE inhibitors, potassium-sparing diuretics, or hemolysis (spurious)",
    "isAbnormal": true,
    "isCritical": true,
    "resultDate": "2025-12-14T10:00:00Z",
    "createdAt": "2025-12-14T10:05:00Z"
  },
  "clinicalContext": {
    "loincCode": "2823-3",
    "testName": "Potassium",
    "category": "Chemistry",
    "interpretation": "critical-high",
    "criticalAlerts": [
      {
        "severity": "critical",
        "title": "CRITICAL: Severe Hyperkalemia",
        "message": "Potassium critically high at 6.8 mEq/L (normal: 3.5-5.0)",
        "recommendations": [
          "IMMEDIATE: Obtain 12-lead ECG to assess for peaked T waves, widened QRS",
          "Initiate cardiac monitoring",
          "If ECG changes: Give IV calcium gluconate 10% 10mL over 2-3 minutes (cardiac protection)",
          "Lower potassium: Insulin 10 units IV + D50W 50mL, Albuterol 10-20mg nebulized",
          "Consider sodium polystyrene sulfonate (Kayexalate) 15-30g PO/PR",
          "Dialysis consult if K >6.5 or refractory",
          "Stop potassium-sparing diuretics, ACE inhibitors, NSAIDs",
          "Recheck potassium in 2 hours"
        ],
        "urgency": "immediate",
        "requiresNotification": true,
        "notifyRoles": ["ADMIN", "CLINICIAN"]
      }
    ],
    "treatmentRecommendations": [],
    "requiresNotification": true,
    "notificationPriority": "critical"
  }
}
```

### Console Log (ERROR Level)
```
[Lab Result] CRITICAL ALERT: {
  patientId: 'cm4abc123xyz',
  testName: 'Potassium',
  value: 6.8,
  alerts: [
    {
      severity: 'critical',
      title: 'CRITICAL: Severe Hyperkalemia',
      urgency: 'immediate'
    }
  ]
}
```

---

## 4. Create Lab Result - Diabetes Diagnosis

### Request
```http
POST /api/lab-results
Content-Type: application/json
Authorization: Bearer <token>

{
  "patientId": "cm4abc123xyz",
  "testName": "Hemoglobin A1c",
  "testCode": "4548-4",
  "value": "8.5",
  "unit": "%",
  "resultDate": "2025-12-14T10:00:00Z"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "cm4result999",
    "testName": "Hemoglobin A1c",
    "testCode": "4548-4",
    "category": "Endocrine",
    "value": "8.5",
    "unit": "%",
    "referenceRange": "4.0-5.6 %",
    "interpretation": "Elevated HbA1c - ≥6.5% diagnostic for diabetes. Goal <7% for most diabetics, <8% for elderly/comorbid patients",
    "isAbnormal": true,
    "isCritical": false
  },
  "clinicalContext": {
    "interpretation": "high",
    "treatmentRecommendations": [
      {
        "condition": "Poorly Controlled Diabetes",
        "interventions": [
          "Confirm diagnosis with repeat HbA1c or fasting glucose",
          "Diabetes education: nutrition, SMBG, foot care, eye care",
          "Lifestyle: Weight loss 5-10% if overweight, 150 min exercise/week, Mediterranean diet",
          "Metformin 500-1000mg BID (first-line unless contraindicated)",
          "If HbA1c >9% or symptomatic: Consider adding second agent or insulin",
          "Second-line agents: GLP-1 RA (if ASCVD/CKD), SGLT2i (if HF/CKD), or DPP-4i",
          "Set individualized HbA1c goal: <7% for most, <8% if elderly/comorbid",
          "Screen for complications: retinopathy, nephropathy, neuropathy"
        ],
        "monitoring": [
          "HbA1c every 3 months until controlled, then every 6 months",
          "Annual comprehensive foot exam",
          "Annual dilated eye exam",
          "Annual urine albumin/creatinine ratio",
          "Annual lipid panel",
          "Blood pressure at each visit (goal <130/80)"
        ],
        "referrals": [
          "Endocrinology if uncontrolled despite 2-3 agents",
          "Ophthalmology for dilated retinal exam",
          "Diabetes education program",
          "Nutrition counseling"
        ],
        "timeframe": "Initiate treatment immediately",
        "evidenceLevel": "A"
      }
    ],
    "requiresNotification": false,
    "notificationPriority": "high"
  },
  "monitoring": {
    "monitored": true,
    "testType": "HBA1C",
    "preventionPlanCreated": true
  }
}
```

---

## 5. Query Reference Ranges - Get All Categories

### Request
```http
GET /api/lab-reference-ranges?categories=true
Authorization: Bearer <token>
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "categories": [
      "Cardiac",
      "Chemistry",
      "Endocrine",
      "Hematology",
      "Hepatic",
      "Inflammation",
      "Lipids",
      "Renal"
    ]
  }
}
```

---

## 6. Query Reference Ranges - Get Database Stats

### Request
```http
GET /api/lab-reference-ranges?stats=true
Authorization: Bearer <token>
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "totalRanges": 34,
    "uniqueTests": 30,
    "categories": [
      "Cardiac",
      "Chemistry",
      "Endocrine",
      "Hematology",
      "Hepatic",
      "Inflammation",
      "Lipids",
      "Renal"
    ],
    "categoryBreakdown": [
      { "category": "Cardiac", "count": 2 },
      { "category": "Chemistry", "count": 10 },
      { "category": "Endocrine", "count": 3 },
      { "category": "Hematology", "count": 6 },
      { "category": "Hepatic", "count": 5 },
      { "category": "Inflammation", "count": 1 },
      { "category": "Lipids", "count": 6 },
      { "category": "Renal", "count": 1 }
    ]
  }
}
```

---

## 7. Query Reference Ranges - Patient-Specific Range

### Request
```http
GET /api/lab-reference-ranges?loincCode=718-7&age=45&gender=F
Authorization: Bearer <token>
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "loincCode": "718-7",
    "testName": "Hemoglobin",
    "commonAliases": ["Hgb", "Hb"],
    "unit": "g/dL",
    "minAge": 18,
    "maxAge": undefined,
    "gender": "F",
    "normalMin": 12.0,
    "normalMax": 15.5,
    "criticalLow": 7.0,
    "criticalHigh": 20.0,
    "category": "Hematology",
    "clinicalSignificance": "Oxygen-carrying capacity of blood",
    "interpretation": {
      "low": "Anemia - consider iron deficiency, menstrual losses, pregnancy, nutrition, or chronic disease",
      "normal": "Normal hemoglobin level - adequate oxygen-carrying capacity",
      "high": "Polycythemia - consider dehydration, chronic hypoxia, smoking, or polycythemia vera",
      "criticalLow": "CRITICAL: Severe anemia requiring immediate intervention, possible transfusion",
      "criticalHigh": "CRITICAL: Severe polycythemia with increased thrombosis risk"
    }
  }
}
```

---

## 8. Query Reference Ranges - Tests by Category

### Request
```http
GET /api/lab-reference-ranges?category=Hematology
Authorization: Bearer <token>
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "category": "Hematology",
    "count": 6,
    "tests": [
      {
        "loincCode": "718-7",
        "testName": "Hemoglobin",
        "unit": "g/dL",
        "gender": "M",
        "normalMin": 13.5,
        "normalMax": 17.5
      },
      {
        "loincCode": "718-7",
        "testName": "Hemoglobin",
        "unit": "g/dL",
        "gender": "F",
        "normalMin": 12.0,
        "normalMax": 15.5
      },
      {
        "loincCode": "20570-8",
        "testName": "Hematocrit",
        "unit": "%",
        "gender": "M",
        "normalMin": 38.8,
        "normalMax": 50.0
      },
      {
        "loincCode": "20570-8",
        "testName": "Hematocrit",
        "unit": "%",
        "gender": "F",
        "normalMin": 35.0,
        "normalMax": 45.0
      },
      {
        "loincCode": "6690-2",
        "testName": "White Blood Cell Count",
        "unit": "x10^3/uL",
        "gender": "both",
        "normalMin": 4.5,
        "normalMax": 11.0
      },
      {
        "loincCode": "777-3",
        "testName": "Platelet Count",
        "unit": "x10^3/uL",
        "gender": "both",
        "normalMin": 150,
        "normalMax": 400
      }
    ]
  }
}
```

---

## 9. Get All LOINC Codes

### Request
```http
GET /api/lab-reference-ranges?loincCodes=true
Authorization: Bearer <token>
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "loincCodes": [
      "1742-6",
      "1751-7",
      "17861-6",
      "1920-8",
      "1975-2",
      "1988-5",
      "2028-9",
      "2075-0",
      "2085-9",
      "2093-3",
      "10839-9",
      "13457-7",
      "2160-0",
      "2345-7",
      "2571-8",
      "2601-3",
      "2777-1",
      "20570-8",
      "2823-3",
      "2951-2",
      "3016-3",
      "30934-4",
      "3024-7",
      "3094-0",
      "33914-3",
      "4548-4",
      "6690-2",
      "6768-6",
      "718-7",
      "777-3"
    ]
  }
}
```

---

## 10. Error Handling - Patient Not Found

### Request
```http
POST /api/lab-results
Content-Type: application/json
Authorization: Bearer <token>

{
  "patientId": "invalid-patient-id",
  "testName": "Glucose",
  "value": "95"
}
```

### Response (404 Not Found)
```json
{
  "error": "Patient not found"
}
```

---

## 11. Error Handling - Missing Required Fields

### Request
```http
POST /api/lab-results
Content-Type: application/json
Authorization: Bearer <token>

{
  "patientId": "cm4abc123xyz",
  "value": "95"
}
```

### Response (400 Bad Request)
```json
{
  "error": "Missing required fields: patientId, testName, resultDate"
}
```

---

## 12. Fallback - Test Name Without LOINC Code

### Request
```http
POST /api/lab-results
Content-Type: application/json
Authorization: Bearer <token>

{
  "patientId": "cm4abc123xyz",
  "testName": "Hgb",
  "value": "14.5",
  "unit": "g/dL",
  "resultDate": "2025-12-14T10:00:00Z"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "testName": "Hgb",
    "testCode": null,
    "category": "Hematology",
    "referenceRange": "13.5-17.5 g/dL",
    "interpretation": "Normal hemoglobin level - adequate oxygen-carrying capacity",
    "isAbnormal": false
  },
  "clinicalContext": {
    "loincCode": "718-7",
    "testName": "Hemoglobin"
  }
}
```

Note: System found "Hgb" as an alias for "Hemoglobin" (LOINC: 718-7) and applied the correct reference range.

---

## Authentication

All endpoints require authentication:

```http
Authorization: Bearer <jwt_token>
```

Required roles:
- `ADMIN`
- `CLINICIAN`
- `NURSE`

---

## Rate Limits

- `/api/lab-results` POST: 30 requests per minute
- `/api/lab-results` GET: 100 requests per minute
- `/api/lab-reference-ranges` GET: 100 requests per minute

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (missing/invalid fields) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found (patient/test not found) |
| 429 | Too Many Requests (rate limit exceeded) |
| 500 | Internal Server Error |

---

## Testing with cURL

### Create Normal Result
```bash
curl -X POST http://localhost:3000/api/lab-results \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "patientId": "YOUR_PATIENT_ID",
    "testName": "Glucose",
    "testCode": "2345-7",
    "value": "95",
    "unit": "mg/dL",
    "resultDate": "2025-12-14T10:00:00Z"
  }'
```

### Create Critical Result
```bash
curl -X POST http://localhost:3000/api/lab-results \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "patientId": "YOUR_PATIENT_ID",
    "testName": "Potassium",
    "testCode": "2823-3",
    "value": "6.8",
    "unit": "mEq/L",
    "resultDate": "2025-12-14T10:00:00Z"
  }'
```

### Get Reference Range Stats
```bash
curl http://localhost:3000/api/lab-reference-ranges?stats=true \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Last Updated:** December 14, 2025
**API Version:** 1.0.0
