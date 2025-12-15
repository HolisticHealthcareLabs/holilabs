# Phase 6: Developer Quick Start Guide

**Get up and running with Prevention Hub Phase 6 features in 5 minutes.**

---

## 🚀 Prerequisites

- Node.js 18+
- PostgreSQL database running
- pnpm installed (`npm install -g pnpm`)
- Environment variables configured (see `.env.example`)

## ⚡ Quick Setup (5 Minutes)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Database
```bash
# Set your database URL
export DATABASE_URL="postgresql://user:password@localhost:5432/holi_labs?schema=public"

# Or add to .env file
echo 'DATABASE_URL="postgresql://user:password@localhost:5432/holi_labs?schema=public"' >> .env
```

### 3. Sync Database Schema
```bash
# Push schema to database
npx prisma db push

# Regenerate Prisma Client
npx prisma generate
```

### 4. Load Seed Data (Optional but Recommended)
```bash
# Load 5 prevention plan templates
pnpm tsx scripts/seed-prevention-templates.ts
```

### 5. Start Development Server
```bash
pnpm dev
```

### 6. Access Phase 6 Features

Open your browser and navigate to:
- **Templates**: http://localhost:3000/dashboard/prevention/templates
- **Activity Feed**: http://localhost:3000/dashboard/prevention/activity
- **Audit Logs**: http://localhost:3000/dashboard/prevention/audit
- **Search**: http://localhost:3000/dashboard/prevention/search

**Note**: You'll need to be logged in to access these pages.

---

## 📚 API Endpoints Reference

### Templates API

```bash
# List all templates
curl http://localhost:3000/api/prevention/templates

# Get specific template
curl http://localhost:3000/api/prevention/templates/{id}

# Create new template
curl -X POST http://localhost:3000/api/prevention/templates \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "My Custom Template",
    "planType": "CARDIOVASCULAR",
    "description": "Custom prevention plan",
    "goals": [],
    "recommendations": []
  }'

# Use template to create plan
curl -X POST http://localhost:3000/api/prevention/templates/{id}/use \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient_id_here",
    "planName": "Patient Prevention Plan"
  }'

# Update template
curl -X PUT http://localhost:3000/api/prevention/templates/{id} \
  -H "Content-Type: application/json" \
  -d '{"templateName": "Updated Name"}'

# Delete (deactivate) template
curl -X DELETE http://localhost:3000/api/prevention/templates/{id}
```

### Activity API

```bash
# Get all recent activities
curl http://localhost:3000/api/prevention/activity

# Filter by resource type
curl "http://localhost:3000/api/prevention/activity?resourceType=plan"

# Filter by specific resource
curl "http://localhost:3000/api/prevention/activity?resourceType=plan&resourceId=plan_123"

# Pagination
curl "http://localhost:3000/api/prevention/activity?limit=10&offset=0"
```

### Audit API

```bash
# Get all audit logs
curl http://localhost:3000/api/prevention/audit

# Filter by action
curl "http://localhost:3000/api/prevention/audit?action=CREATE"

# Filter by resource
curl "http://localhost:3000/api/prevention/audit?resource=prevention_plan"

# Filter by date range
curl "http://localhost:3000/api/prevention/audit?startDate=2025-01-01&endDate=2025-12-31"

# Filter by user
curl "http://localhost:3000/api/prevention/audit?userId=user_123"

# Pagination
curl "http://localhost:3000/api/prevention/audit?limit=20&offset=0"
```

### Search API

```bash
# Search all resources
curl "http://localhost:3000/api/prevention/search?q=cardiovascular"

# Search specific type
curl "http://localhost:3000/api/prevention/search?q=diabetes&type=template"

# Filter by plan type
curl "http://localhost:3000/api/prevention/search?q=prevention&planType=CARDIOVASCULAR"

# Filter by status
curl "http://localhost:3000/api/prevention/search?q=plan&status=ACTIVE"

# Filter by date range
curl "http://localhost:3000/api/prevention/search?q=wellness&startDate=2025-01-01"
```

---

## 🧩 Component Usage Examples

### Using ActivityFeed Component

```tsx
import ActivityFeed from '@/components/prevention/ActivityFeed';

// Show all activities (default)
export default function MyPage() {
  return <ActivityFeed />;
}

// Show activities for specific plan
export default function PlanDetailPage({ planId }) {
  return (
    <ActivityFeed
      resourceType="plan"
      resourceId={planId}
      limit={10}
      showHeader={true}
    />
  );
}

// Compact view without header
export default function DashboardWidget() {
  return (
    <ActivityFeed
      limit={5}
      showHeader={false}
      maxHeight="300px"
    />
  );
}
```

### Using QuickActionsPanel Component

```tsx
import QuickActionsPanel from '@/components/prevention/QuickActionsPanel';

// Full panel with all 12 actions
export default function PreventionDashboard() {
  return <QuickActionsPanel />;
}

// Limited actions, no title
export default function Sidebar() {
  return (
    <QuickActionsPanel
      maxActions={6}
      showTitle={false}
    />
  );
}

// Vertical layout for narrow spaces
export default function MobileSidebar() {
  return (
    <QuickActionsPanel
      orientation="vertical"
      maxActions={4}
    />
  );
}
```

---

## 🔧 Development Commands

```bash
# Type checking
pnpm tsc --noEmit

# Build for production
pnpm build

# Start production server
pnpm start

# Database commands
npx prisma studio        # Visual database editor
npx prisma db push       # Sync schema to database
npx prisma generate      # Regenerate Prisma Client
npx prisma migrate dev   # Create new migration

# Seed data
pnpm tsx scripts/seed-prevention-templates.ts

# Verify Phase 6 setup
pnpm tsx scripts/verify-phase6.ts  # (if you create it)
```

---

## 🗃️ Database Schema

### PreventionPlanTemplate Model

```prisma
model PreventionPlanTemplate {
  id              String             @id @default(cuid())
  templateName    String
  planType        PreventionPlanType
  description     String?            @db.Text
  guidelineSource String?
  evidenceLevel   String?
  goals           Json
  recommendations Json
  isActive        Boolean            @default(true)
  useCount        Int                @default(0)
  lastUsedAt      DateTime?
  createdBy       String
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  @@index([planType])
  @@index([isActive])
  @@index([useCount])
}
```

### PreventionPlanType Enum

```prisma
enum PreventionPlanType {
  CARDIOVASCULAR    // ASCVD prevention
  DIABETES          // Type 2 diabetes prevention
  HYPERTENSION      // Blood pressure management
  OBESITY           // Weight management
  CANCER_SCREENING  // Preventive cancer screening
  IMMUNIZATION      // Vaccination and immunization
  GENERAL_WELLNESS  // General health and wellness
  COMPREHENSIVE     // Multi-risk prevention
}
```

---

## 📊 Testing Your Setup

### 1. Verify Database Connection

```bash
npx prisma db pull
# Should connect successfully
```

### 2. Check Prisma Client

```bash
npx prisma validate
# Should show "The schema is valid"
```

### 3. Verify Seed Data

```bash
# Count templates in database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM prevention_plan_templates;"
# Should show 5 if seed was loaded
```

### 4. Test API Endpoints

Create a simple test script:

```bash
# Save as test-api.sh
chmod +x test-api.sh

#!/bin/bash

echo "Testing Phase 6 API endpoints..."

# Test templates endpoint
echo "\n1. Testing /api/prevention/templates"
curl -s http://localhost:3000/api/prevention/templates | jq .

# Test activity endpoint
echo "\n2. Testing /api/prevention/activity"
curl -s http://localhost:3000/api/prevention/activity | jq .

# Test search endpoint
echo "\n3. Testing /api/prevention/search"
curl -s "http://localhost:3000/api/prevention/search?q=cardiovascular" | jq .

echo "\n✅ API tests complete!"
```

---

## 🐛 Troubleshooting

### Issue: Prisma Client not found

```bash
# Solution: Regenerate Prisma Client
npx prisma generate
```

### Issue: Database schema out of sync

```bash
# Solution: Push schema to database
npx prisma db push
```

### Issue: TypeScript errors about PreventionPlanTemplate

```bash
# Solution: Regenerate Prisma Client and restart dev server
npx prisma generate
# Kill and restart: pnpm dev
```

### Issue: Seed data won't load

```bash
# Check if user exists in database
psql $DATABASE_URL -c "SELECT id, email FROM users LIMIT 1;"

# If no users, create one first via the app or seed script
```

### Issue: API returns 401 Unauthorized

- Make sure you're logged in
- Check session configuration in `lib/auth.ts`
- Verify `NEXTAUTH_SECRET` is set in `.env`

### Issue: Activity feed shows no activities

- Create a prevention plan to generate activity
- Or check `statusChanges` field in existing plans
- Verify `lastUsedAt` in templates

---

## 📖 Additional Resources

- **Full Documentation**: See `PHASE_6_DOCUMENTATION.md`
- **Deployment Guide**: See `PHASE_6_DEPLOYMENT_SUMMARY.md`
- **API Schemas**: Check TypeScript interfaces in API route files
- **Component Props**: See component files for full prop documentation

---

## 🎯 Common Tasks

### Creating a New Template

```tsx
const newTemplate = {
  templateName: 'Hypertension Prevention',
  planType: 'HYPERTENSION',
  description: 'Comprehensive blood pressure management plan',
  guidelineSource: 'ACC/AHA 2023',
  evidenceLevel: 'Grade A',
  goals: [
    {
      goal: 'Reduce BP to <130/80 mmHg',
      category: 'Blood Pressure',
      timeframe: '3 months',
      priority: 'high',
    },
  ],
  recommendations: [
    {
      title: 'Monthly BP Monitoring',
      description: 'Check blood pressure monthly',
      category: 'Monitoring',
      priority: 'high',
    },
  ],
};

const response = await fetch('/api/prevention/templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newTemplate),
});
```

### Using a Template to Create a Plan

```tsx
const response = await fetch(`/api/prevention/templates/${templateId}/use`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    patientId: patientId,
    planName: `${patientName} - Hypertension Prevention`,
    customizations: {
      // Optional: override or add goals/recommendations
      goals: [...templateGoals, ...customGoals],
    },
  }),
});

const { plan } = await response.json();
```

### Searching Across Resources

```tsx
const searchQuery = 'cardiovascular';
const params = new URLSearchParams({
  q: searchQuery,
  type: 'all', // or 'plan', 'template', 'reminder'
  limit: '20',
});

const response = await fetch(`/api/prevention/search?${params}`);
const { data } = await response.json();

// data.results = array of search results
// data.stats = statistics by type
```

---

## 🚀 Next Steps

After completing this quick start:

1. ✅ **Explore the UI** - Navigate through all Phase 6 pages
2. ✅ **Read the docs** - Review `PHASE_6_DOCUMENTATION.md`
3. ✅ **Test the APIs** - Try creating templates and plans
4. ✅ **Customize templates** - Create templates for your use case
5. ✅ **Integrate components** - Add ActivityFeed to your pages

---

## 💡 Pro Tips

1. **Use TypeScript autocomplete** - Prisma Client provides full type safety
2. **Check API responses** - All endpoints return consistent JSON structure
3. **Enable dark mode** - All Phase 6 components support dark mode
4. **Use pagination** - Don't fetch all records at once
5. **Cache template lists** - Templates don't change frequently
6. **Monitor audit logs** - Track all changes for compliance

---

## 📞 Support

Need help? Check these resources:

1. **Documentation**: `PHASE_6_DOCUMENTATION.md`
2. **Deployment**: `PHASE_6_DEPLOYMENT_SUMMARY.md`
3. **Code examples**: API route files and component files
4. **Database schema**: `prisma/schema.prisma`
5. **Seed data**: `prisma/seeds/prevention-templates.ts`

---

**Happy coding! 🎉**

Built with ❤️ by Claude Sonnet 4.5
Last updated: December 14, 2025
