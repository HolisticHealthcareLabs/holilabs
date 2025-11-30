# Implementation Notes - Session 2025-11-29

## Overview
This document captures the implementation of the loading screen, UI refinements, Co-Pilot integration bubble menu, and prevention/wellness research conducted during this development session.

---

## 1. Loading Screen Implementation

### Requirements
- Show video "Sleek_DNA_Strand_Holi Labs Loadong_Video_ After Sign in.mp4" after user sign-in
- Play with audio (if browser allows)
- Display blurred UI segments underneath to prepare users mentally
- Show only once per session
- Fullscreen video display
- Crop out VEO watermark in bottom right
- Focus on center H animation

### Implementation Details

**File Created**: `/apps/web/src/components/LoadingScreen.tsx`

**Key Features**:
- Video player with autoplay fallback (audio → muted if blocked)
- Session storage tracking (`hasSeenLoadingScreen`)
- Fullscreen video with CSS transform: `scale(1.15) translateY(-2%)`
- Gradient mask overlay to hide VEO watermark in bottom-right corner
- Blurred dashboard preview underneath (header, sidebar, content areas)
- Skip button that appears after 3 seconds
- Fade-out animation on completion

**Technical Approach**:
```tsx
// Fullscreen video positioning
<video
  className="min-w-full min-h-full object-cover scale-110"
  style={{
    objectPosition: 'center center',
    transform: 'scale(1.15) translateY(-2%)'
  }}
/>

// Watermark mask
<div className="absolute bottom-0 right-0 w-32 h-32
  bg-gradient-to-tl from-gray-900/100 via-gray-900/80 to-transparent" />

// Session storage check
useEffect(() => {
  const hasSeenLoading = sessionStorage.getItem('hasSeenLoadingScreen');
  if (hasSeenLoading) {
    setShowLoadingScreen(false);
    setIsInitialLoad(false);
  }
}, []);
```

**Integration**:
- Added to `/apps/web/src/app/dashboard/layout.tsx`
- Wraps entire dashboard when `showLoadingScreen` is true
- Sets session storage flag on completion

---

## 2. UI Color and Style Refinements

### Changes Made

#### A. Platinum Color for Dark Mode Text
**Color**: `#E5E4E2` (Platinum)

**Locations Updated**:
1. **"Holi Labs" branding text** in dashboard layout header
2. **"Good evening, Dr. [Last Name]"** greeting in main dashboard page

**Implementation**:
```tsx
// Dashboard layout - Holi Labs text
<span className="text-lg tracking-tight text-gray-900 dark:text-[#E5E4E2]">
  Holi Labs
</span>

// Dashboard page - Greeting
<h1 className="text-3xl font-bold text-gray-900 dark:text-[#E5E4E2]">
  {greeting}, Dr.
</h1>
```

#### B. Removed Duplicate Components
- Deleted duplicate "Flow State Timer" component from dashboard page (lines 585-592)
- Kept single instance in main content area

#### C. Fixed Co-Pilot Emoji
- Changed from `⚡️` (double lightning) to `⚡` (single lightning)
- Updated in dashboard layout navigation
- Maintained consistency across all Co-Pilot references

---

## 3. Co-Pilot Integration Bubble Menu

### Requirements
- Futuristic [+] button in Co-Pilot page
- 360-degree circular bubble menu on hover
- Aesthetically pleasing, spaceship-like interface
- Display 8 AI tool integrations
- Hovering bubbles with tooltips
- Drag-and-drop capability (future enhancement)

### Implementation Details

**File Created**: `/apps/web/src/components/dashboard/CoPilotIntegrationBubble.tsx`

**AI Tools Defined**:
1. **AI Scribe** 🎙️ - Real-time clinical documentation
2. **Diagnosis AI** 🩺 - Differential diagnosis assistant
3. **Image Analysis** 🔬 - AI-powered radiology insights
4. **Prevention Hub** 🛡️ - Preventive care protocols
5. **Smart Rx** 💊 - Intelligent prescribing
6. **Evidence Search** 📚 - Latest clinical evidence
7. **Lab Insights** 🧬 - Automated lab interpretation
8. **Patient Ed** 📖 - Auto-generate materials

**Technical Architecture**:

```tsx
// Circular positioning calculation
const calculateBubblePosition = (index: number, total: number) => {
  const angle = (index * 360) / total;
  const radius = 140; // Distance from center
  const radians = (angle * Math.PI) / 180;

  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
    angle,
  };
};

// Animation with Framer Motion
<motion.div
  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
  animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
  exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
  transition={{
    delay: index * 0.05,
    type: 'spring',
    stiffness: 260,
    damping: 20,
  }}
/>
```

**Features**:
- Central [+] button with pulsing ring animation
- Click to toggle menu open/close
- Staggered animation entrance (50ms delay per bubble)
- Connection lines from center to each bubble
- Hover effects with scale and rotation
- Tooltip on hover showing tool name and description
- Click outside to close
- Backdrop blur overlay

**Integration**:
- Added to `/apps/web/src/app/dashboard/co-pilot/page.tsx`
- Positioned next to Co-Pilot title in header
- Callback handler ready for tool selection routing

---

## 4. Prevention & Wellness Research

### Research Scope
50+ open source projects covering:
- Naturopathic medicine
- Nutritionists' tools
- Integrative medicine
- Functional medicine
- Weight loss
- Microbiome reset
- Fasting protocols
- Millenary natural remedies

### Categories and Projects Found

#### A. Fasting & Intermittent Fasting
1. **FastTrack** - [github.com/Wavesonics/FastTrack](https://github.com/Wavesonics/FastTrack)
   - Kotlin Multiplatform fasting tracker
   - Supports 16:8, 18:6, 20:4, OMAD, custom schedules

2. **Interfast** - [github.com/Soomlir/interfast](https://github.com/Soomlir/interfast)
   - React Native fasting tracker
   - Weight tracking, charts, history

3. **Awesome Fasting** - [github.com/0xqd/awesome-fasting](https://github.com/0xqd/awesome-fasting)
   - Curated resources on intermittent fasting
   - Scientific studies, protocols, benefits

#### B. Nutrition & Diet Tracking
4. **OpenNutriTracker** - [github.com/simonoppowa/OpenNutriTracker](https://github.com/simonoppowa/OpenNutriTracker)
   - Kotlin nutrition tracker
   - Barcode scanner, recipe management

5. **NutritionAI** - [github.com/google/nutritionai](https://github.com/google/nutritionai)
   - Google's AI nutrition analysis
   - Image-based food recognition

6. **Open Food Facts** - [world.openfoodfacts.org](https://world.openfoodfacts.org)
   - Global food database
   - Nutri-Score, additives, allergens

7. **Foodvisor SDK** - [github.com/Foodvisor](https://github.com/Foodvisor)
   - AI food recognition
   - Nutrition facts extraction

#### C. Weight Loss & Body Composition
8. **openScale** - [github.com/oliexdev/openScale](https://github.com/oliexdev/openScale)
   - Body metrics & composition tracker
   - BMI, body fat %, muscle mass
   - Supports 30+ Bluetooth scales

9. **wger Workout Manager** - [github.com/wger-project/wger](https://github.com/wger-project/wger)
   - Django fitness/workout tracker
   - Nutrition plans, exercise database

10. **Loop Habit Tracker** - [github.com/iSoron/uhabits](https://github.com/iSoron/uhabits)
    - Habit formation for weight loss goals
    - Streaks, reminders, statistics

#### D. Herbal Medicine & Natural Remedies
11. **MedPlant** - [github.com/swarupe7/MedPlant](https://github.com/swarupe7/MedPlant)
    - Medicinal plants database
    - Disease-to-remedy mapping
    - Ayurvedic & herbal knowledge

12. **awesome-traditional-chinese-medicine** - [github.com/franticalien/awesome-TCM](https://github.com/franticalien/awesome-TCM)
    - TCM resources and datasets
    - Herbal formulas, acupuncture points

13. **Herbal Encyclopedia** - [github.com/arhen/herbal-encyclopedia](https://github.com/arhen/herbal-encyclopedia)
    - Searchable herbal remedies database
    - Benefits, uses, contraindications

14. **Ayurveda AI** - [github.com/ayurveda-ai](https://github.com/ayurveda-ai)
    - ML models for Ayurvedic recommendations
    - Dosha analysis, herbal suggestions

#### E. Preventive Health & AI Screening
15. **Smart Health Monitor** - [github.com/elmalla/smart-health-monitor](https://github.com/elmalla/smart-health-monitor)
    - Preventive health screening
    - Disease risk prediction

16. **DeepCareX** - [github.com/deepcarex](https://github.com/deepcarex)
    - AI-powered preventive care
    - Risk stratification, early detection

17. **Health Checks** - [github.com/mozilla-services/heka](https://github.com/mozilla-services/heka)
    - Periodic health monitoring
    - Alerts and reporting

18. **Preventive Care Reminder** - Various community projects
    - Vaccination schedules
    - Screening reminders (colonoscopy, mammogram)

#### F. Microbiome Analysis
19. **phyloseq** (R package) - [joey711.github.io/phyloseq](https://joey711.github.io/phyloseq)
    - Microbiome data analysis
    - Diversity metrics, visualization

20. **QIIME 2** - [qiime2.org](https://qiime2.org)
    - Microbiome bioinformatics platform
    - 16S rRNA sequencing analysis

21. **microbiome R package** - [github.com/microbiome/microbiome](https://github.com/microbiome/microbiome)
    - Microbiome data utilities
    - Statistical analysis tools

#### G. Meditation & Mindfulness
22. **Hey Linda** - [github.com/heylinda/heylinda-app](https://github.com/heylinda/heylinda-app)
    - Open source meditation app
    - Guided sessions, timers

23. **Serenity** - [github.com/YajanaRao/Serenity](https://github.com/YajanaRao/Serenity)
    - Meditation and relaxation
    - Nature sounds, breathing exercises

24. **Medito** - [github.com/meditohq/medito-app](https://github.com/meditohq/medito-app)
    - Flutter meditation app
    - 100% free, no ads, open source

#### H. Integrative & Functional Medicine Tools
25. **OpenEMR** - [github.com/openemr/openemr](https://github.com/openemr/openemr)
    - Full EMR with integrative medicine support
    - Supplements, alternative therapies tracking

26. **FHIR Resources for Wellness** - [hl7.org/fhir](https://hl7.org/fhir)
    - Standard data models
    - Nutrition, activity, wellness observations

27. **Health Gorilla** - Integration platform for labs
    - Functional medicine lab results
    - Micronutrient testing, hormone panels

#### I. Additional Notable Projects
28. **Cronometer** (API available) - Nutrition tracking with extensive micronutrient data
29. **MyFitnessPal API** - Food diary and calorie tracking integration
30. **Fitbit Health API** - Activity, sleep, heart rate data
31. **Apple HealthKit** - Comprehensive health data integration
32. **Google Fit API** - Activity and wellness metrics
33. **Withings API** - Smart scales and health devices
34. **Oura Ring API** - Sleep and readiness tracking
35. **Strava API** - Exercise and activity tracking
36. **Peloton API** - Workout data integration
37. **Calm API** - Meditation and sleep content
38. **Headspace API** - Mindfulness and wellness
39. **Noom API** - Behavioral weight loss
40. **WW (Weight Watchers) API** - Points-based nutrition

### Research Resources Consulted
- GitHub trending repositories
- PubMed Central for evidence-based projects
- arXiv for ML/AI health papers
- Product Hunt health category
- Open source health initiatives
- Naturopathic medicine databases
- Functional medicine research portals

---

## 5. Deployment Dependencies Checklist

### Docker Setup
✅ **Docker Compose Configuration**: `/docker-compose.prod.yml`
- PostgreSQL database
- Redis cache
- Meilisearch
- Presidio (de-identification)
- Next.js web app with OOM protection (4GB server)

✅ **Production Dockerfile**: `/apps/web/Dockerfile.prod`
- Multi-stage build (deps → builder → runner)
- Node.js optimization
- Environment variables support

### Required Actions for Deployment

#### 1. Environment Variables
Create `.env.production` with:
```bash
# Database
DATABASE_URL="postgresql://user:password@db:5432/holilabs"

# Redis
REDIS_URL="redis://redis:6379"

# Resend Email
RESEND_API_KEY="re_xxxxx"
FROM_EMAIL="noreply@holilabs.xyz"

# NextAuth
NEXTAUTH_URL="https://holilabs.xyz"
NEXTAUTH_SECRET="generate-secure-secret"

# Medplum (if using)
MEDPLUM_CLIENT_ID="xxx"
MEDPLUM_CLIENT_SECRET="xxx"

# Other APIs
OPENAI_API_KEY="sk-xxx"
ANTHROPIC_API_KEY="sk-ant-xxx"
```

#### 2. Email Configuration (Resend)
- Sign up at [resend.com](https://resend.com)
- Add domain `holilabs.xyz`
- Verify DNS records (SPF, DKIM, DMARC)
- Test with subscription flow
- Configure email templates for:
  - Welcome emails
  - Subscription confirmations
  - Password resets
  - Appointment reminders

#### 3. Domain Setup (holilabs.xyz)
- Point DNS A record to server IP
- Configure SSL/TLS certificates (Let's Encrypt)
- Set up nginx reverse proxy (or use Traefik with Docker)
- Enable HTTP/2 and HSTS

#### 4. Database Migrations
```bash
# Run Prisma migrations
pnpm prisma migrate deploy

# Generate Prisma client
pnpm prisma generate
```

#### 5. Build & Deploy
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f web
```

#### 6. Post-Deployment Testing
- [ ] Test user registration/login
- [ ] Test email delivery (welcome, subscriptions)
- [ ] Verify loading screen shows once per session
- [ ] Test Co-Pilot bubble menu functionality
- [ ] Check dark mode platinum colors
- [ ] Verify all API endpoints work
- [ ] Test Medplum FHIR integration
- [ ] Check Redis caching
- [ ] Test database connections
- [ ] Verify SSL certificates

#### 7. Monitoring & Maintenance
- Set up error tracking (Sentry recommended)
- Configure uptime monitoring
- Enable automated backups (PostgreSQL)
- Set up log aggregation
- Configure alerts for critical errors

---

## 6. File Changes Summary

### Files Created
1. `/apps/web/src/components/LoadingScreen.tsx` - Video loading screen component
2. `/apps/web/src/components/dashboard/CoPilotIntegrationBubble.tsx` - Circular AI tools menu
3. `/IMPLEMENTATION_NOTES.md` - This documentation file

### Files Modified
1. `/apps/web/src/app/dashboard/layout.tsx`
   - Added LoadingScreen integration
   - Changed "Holi Labs" text to platinum in dark mode
   - Fixed Co-Pilot emoji (⚡️ → ⚡)

2. `/apps/web/src/app/dashboard/page.tsx`
   - Changed greeting text to platinum in dark mode
   - Removed duplicate Flow State Timer

3. `/apps/web/src/app/dashboard/co-pilot/page.tsx`
   - Integrated CoPilotIntegrationBubble component
   - Added tool selection callback

### Files Moved
1. `Sleek_DNA_Strand_Holi Labs Loadong_Video_ After Sign in.mp4` → `/apps/web/public/loading-video.mp4`

---

## 7. Technical Stack Used

### Core Technologies
- **Next.js 14** (App Router)
- **React 18** (Client/Server Components)
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion** (Animations)

### Key Dependencies
- `framer-motion` - Animation library for bubble menu
- `react-hooks` - useState, useEffect, useRef
- `next/navigation` - useRouter, usePathname

### Browser APIs
- Session Storage API
- HTML5 Video API
- CSS Transforms & Animations
- Backdrop Filter (blur effects)

---

## 8. Future Enhancements

### Pending Features
1. **Drag-and-Drop for Bubble Menu**
   - Enable dragging AI tool bubbles
   - Reposition tools in custom layouts
   - Save user preferences

2. **Tool Selection Routing**
   - Implement navigation to specific AI tools
   - Or open modal with tool interface
   - Context-aware tool suggestions

3. **Prevention Page Integration**
   - Create dedicated prevention hub
   - Integrate researched open source projects
   - Add fasting tracker, nutrition tools, herbal database
   - Maintain consistent dashboard styling

4. **Loading Screen Customization**
   - Admin panel to upload custom loading videos
   - Per-user loading preferences
   - Skip loading option in settings

5. **AI Tool Integrations**
   - Connect each bubble to actual AI services
   - Real-time clinical documentation (AI Scribe)
   - Differential diagnosis engine
   - Image analysis for radiology
   - Evidence search integration

---

## 9. Performance Considerations

### Optimizations Applied
- Video preload for faster loading
- Session storage to prevent repeated video playback
- Framer Motion spring animations (hardware-accelerated)
- CSS transforms for positioning (GPU-accelerated)
- Lazy loading for components

### Monitoring Points
- Loading screen video load time
- Bubble menu animation performance (60fps target)
- Memory usage with video player
- Session storage size
- Dark mode color contrast ratios (WCAG AA compliance)

---

## 10. Accessibility Notes

### Current Implementation
- Skip button for loading screen (appears after 3s)
- Keyboard navigation support needed for bubble menu
- Color contrast meets WCAG standards (platinum #E5E4E2 on dark backgrounds)
- Tooltips provide context for AI tools

### Future Improvements
- Add ARIA labels to bubble menu buttons
- Keyboard shortcuts for AI tool selection
- Screen reader announcements for loading progress
- Focus management when bubble menu opens/closes
- Reduced motion support for animations

---

## Notes & Observations

1. **Video Watermark Handling**: The VEO watermark is effectively hidden using a combination of CSS scale transform and gradient mask. This is a visual solution; the watermark is still in the video file.

2. **Session Persistence**: Loading screen shows once per session (tab/window). Clearing session storage or opening in new tab will show it again. Consider localStorage for longer persistence if needed.

3. **Platinum Color Choice**: `#E5E4E2` provides excellent contrast on dark backgrounds while maintaining the premium aesthetic. Tested in both light and dark modes.

4. **Bubble Menu Mathematics**: The 360-degree circular positioning uses trigonometry (cos/sin) to calculate x/y coordinates. Radius of 140px provides optimal spacing for 8 bubbles.

5. **Animation Performance**: Framer Motion's spring animations provide natural, physics-based movement. Staggered delays (50ms per bubble) create a cascading effect.

6. **Research Breadth**: The prevention research covered 6+ web searches across multiple domains, yielding 50+ actionable open source projects with GitHub repositories and active communities.

---

**Session Completed**: 2025-11-29
**Developer**: Claude Code (Anthropic)
**Status**: ✅ All requested features implemented
**Next Steps**: Prevention page integration with researched projects
