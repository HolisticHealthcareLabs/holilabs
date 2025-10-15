# 🏥 Holi Labs Healthcare Platform

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)

**Enterprise-grade healthcare management platform built for the future of Mexican healthcare.**

Holi Labs is a comprehensive, HIPAA-compliant healthcare platform that combines modern AI technology with traditional medical practice to deliver superior patient care and clinical efficiency.

---

## 📋 Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Architecture](#-architecture)
- [Security & Compliance](#-security--compliance)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Key Features

### 🩺 Patient Portal
- **Comprehensive Health Dashboard** - Real-time overview of appointments, medications, and health metrics
- **Appointment Management** - Schedule, reschedule, and manage medical appointments with calendar integration
- **Document Management** - Upload, view, and organize medical records with OCR support
- **Lab Results & Imaging** - Secure access to test results, X-rays, and diagnostic imaging
- **Prescription Tracking** - Monitor active medications with dosage instructions and refill reminders
- **Billing & Invoices** - View billing history, make payments, and download CFDI-compliant invoices
- **Privacy Controls** - Granular consent management for HIPAA compliance

### 👨‍⚕️ Clinical Portal
- **Patient Management** - Comprehensive patient records with medical history
- **SOAP Notes** - Industry-standard clinical documentation with 4 smart templates (Follow-up, Initial, Procedure, Emergency)
- **E-Prescribing** - Digital prescription generation with drug interaction warnings
- **Lab Integration** - Order tests and track results with automatic patient notifications
- **Blockchain Verification** - Medical record integrity with SHA-256 hashing
- **Audit Logging** - Complete audit trail for HIPAA compliance

### 🤖 AI-Powered Features
- **AI Scribe** - Real-time medical transcription using Deepgram + Claude Sonnet 4.5
- **Smart Diagnostics** - AI-assisted differential diagnosis suggestions
- **Document Analysis** - Automatic extraction of clinical data from PDFs and images
- **Predictive Analytics** - Early warning system for patient health deterioration

### 💳 Billing & Payments
- **Stripe Integration** - Secure payment processing for consultations and services
- **CFDI Compliance** - SAT-compliant electronic invoicing (CFDI 4.0)
- **PDF Invoices** - Professional invoice generation with QR codes for verification
- **PAC Integration** - Multi-PAC support (Finkok, SW Sapien) for timbrado
- **Automatic Billing** - Recurring billing for subscription-based services

### 🌐 Communication
- **WhatsApp Notifications** - Twilio-powered appointment reminders and health alerts
- **Push Notifications** - Web push for real-time updates
- **Email Notifications** - Automated email campaigns via Resend
- **Video Consultations** - WebRTC-based telehealth (coming soon)

### 🔒 Security & Compliance
- **HIPAA Compliant** - Full compliance with US healthcare privacy regulations
- **End-to-End Encryption** - AES-256 encryption for sensitive data at rest
- **Role-Based Access Control** - Granular permissions (ADMIN, CLINICIAN, NURSE, PATIENT)
- **Session Management** - 30-minute inactivity timeout with cross-tab synchronization
- **Audit Logging** - Complete audit trail with tamper-proof blockchain verification
- **Data Backups** - Automated daily/weekly/monthly backups to AWS S3

---

## 🛠 Tech Stack

### Frontend
- **Next.js 14.1** - React framework with App Router
- **React 18.2** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 3.3** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Animation library
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js 20+** - JavaScript runtime
- **Next.js API Routes** - Serverless functions
- **Prisma 5.9** - Type-safe ORM
- **PostgreSQL 15** - Primary database
- **Socket.io 4.8** - WebSocket server
- **Express.js** (custom server) - WebSocket support

### AI & ML
- **Anthropic Claude Sonnet 4.5** - Medical transcription and clinical insights
- **Google Gemini Pro** - Backup AI model
- **Deepgram** - Real-time speech-to-text
- **AssemblyAI** - Medical transcription
- **OpenAI GPT-4** - Document analysis

### Authentication & Authorization
- **Supabase Auth** - User authentication with SSR support
- **NextAuth.js** - Session management
- **Jose** - JWT handling
- **bcrypt** (via Supabase) - Password hashing

### Payments & Billing
- **Stripe** - Payment processing
- **@react-pdf/renderer** - PDF generation
- **xml-crypto** - CFDI digital signatures
- **jsrsasign** - XML signing
- **QRCode** - SAT verification QR codes

### Communication
- **Twilio** - WhatsApp Business API
- **Resend** - Transactional email
- **web-push** - Push notifications

### Observability
- **Sentry** - Error tracking and performance monitoring
- **Logtail** - Centralized logging
- **Pino** - Structured logging

### Security
- **Helmet** - HTTP security headers
- **@upstash/ratelimit** - Rate limiting
- **crypto-js** - Encryption utilities
- **Zod** - Runtime validation

### DevOps
- **Turborepo** - Monorepo build system
- **pnpm 8** - Fast, disk space efficient package manager
- **GitHub Actions** - CI/CD pipeline
- **DigitalOcean App Platform** - Hosting and deployment
- **Docker** - Containerization
- **Trivy** - Security scanning

### Testing
- **Jest** - Unit and integration testing
- **Playwright** - E2E testing
- **Testing Library** - React component testing
- **Lighthouse CI** - Performance testing
- **Supertest** - API testing

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+** - [Download](https://nodejs.org/)
- **pnpm 8+** - `npm install -g pnpm`
- **PostgreSQL 15+** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/downloads)

You'll also need accounts for:

- **Supabase** - [Sign up](https://supabase.com)
- **Stripe** - [Sign up](https://stripe.com)
- **Anthropic** - [Sign up](https://console.anthropic.com)
- **Deepgram** - [Sign up](https://deepgram.com)
- **Twilio** - [Sign up](https://twilio.com)
- **Sentry** - [Sign up](https://sentry.io)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/holi-labs/healthcare-platform.git
cd healthcare-platform
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and add your credentials:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/holi_labs"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Authentication
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
SESSION_SECRET="generate-with-openssl-rand-base64-32"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# AI Services
ANTHROPIC_API_KEY="sk-ant-..."
DEEPGRAM_API_KEY="..."

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# Sentry
NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."

# CFDI (Mexican Tax Compliance)
HOLI_LABS_RFC="HOL123456ABC"
PAC_PROVIDER="finkok"
PAC_API_URL="https://facturacion.finkok.com/servicios/soap"
PAC_USERNAME="your-pac-username"
PAC_PASSWORD="your-pac-password"
```

4. **Set up the database**

```bash
# Create database
createdb holi_labs

# Run migrations
cd apps/web
pnpm prisma migrate dev

# Seed database with sample data
pnpm db:seed
```

5. **Start the development server**

```bash
# From root directory
pnpm dev

# Or from apps/web
cd apps/web
pnpm dev
```

6. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

**Test credentials:**
- Clinician: `doctor@holilabs.com` / `Password123!`
- Patient: `patient@holilabs.com` / `Password123!`

---

## 📁 Project Structure

```
vidabanq-health-ai/
├── apps/
│   └── web/                          # Main Next.js application
│       ├── src/
│       │   ├── app/                  # App Router pages
│       │   │   ├── api/              # API routes
│       │   │   ├── portal/           # Patient portal
│       │   │   ├── clinical/         # Clinician portal
│       │   │   └── admin/            # Admin portal
│       │   ├── components/           # Shared React components
│       │   ├── lib/                  # Utility functions
│       │   │   ├── auth/             # Authentication utilities
│       │   │   ├── ai/               # AI integrations
│       │   │   ├── invoices/         # CFDI & PDF generation
│       │   │   ├── blockchain/       # Blockchain utilities
│       │   │   └── supabase/         # Supabase clients
│       │   └── middleware.ts         # Route protection
│       ├── prisma/
│       │   ├── schema.prisma         # Database schema
│       │   ├── migrations/           # Migration history
│       │   └── seed.ts               # Seed data
│       ├── scripts/
│       │   ├── backup-database.ts    # Automated backups
│       │   └── pre-deploy-check.sh   # Pre-deployment validation
│       ├── tests/
│       │   ├── compliance/           # HIPAA compliance tests
│       │   ├── security/             # Security tests
│       │   └── e2e/                  # End-to-end tests
│       ├── public/                   # Static assets
│       └── server.js                 # Custom server with Socket.io
├── packages/                         # Shared packages (future)
├── infra/
│   └── docker/                       # Docker configuration
├── .github/
│   └── workflows/
│       ├── ci-cd.yml                 # Main CI/CD pipeline
│       └── pr-checks.yml             # PR quality gates
├── DEPLOYMENT.md                     # Deployment guide
└── README.md                         # This file
```

### Key Directories

- **`/app/portal`** - Patient-facing portal with dashboard, appointments, billing
- **`/app/clinical`** - Clinician portal with SOAP notes, prescriptions, lab orders
- **`/app/api`** - RESTful API endpoints and webhooks
- **`/lib/auth`** - Authentication with `AuthProvider.tsx` and server utilities
- **`/lib/ai`** - AI integrations (Claude, Deepgram, OpenAI)
- **`/lib/invoices`** - CFDI generation and PDF rendering
- **`/components`** - Reusable UI components
- **`/prisma`** - Database schema with 12 tables

---

## 💻 Development

### Running Locally

```bash
# Install dependencies
pnpm install

# Start PostgreSQL (if using Docker)
pnpm docker:up

# Set DATABASE_URL
export DATABASE_URL="postgresql://user:password@localhost:5432/holi_labs"

# Run migrations
cd apps/web && pnpm prisma migrate dev

# Start dev server with hot reload
pnpm dev
```

The app will be available at:
- **Web App**: http://localhost:3000
- **Socket.io**: ws://localhost:3001
- **Prisma Studio**: `pnpm db:studio`

### Code Quality

```bash
# Linting
pnpm lint

# Type checking
pnpm type-check

# Formatting
pnpm format        # Auto-fix with Prettier
pnpm format:check  # Check only

# Pre-commit checks
pnpm pre-deploy
```

### Database Management

```bash
# Create a new migration
pnpm prisma migrate dev --name add_new_feature

# Reset database (⚠️ destructive)
pnpm prisma migrate reset

# Generate Prisma Client
pnpm prisma generate

# Open Prisma Studio
pnpm db:studio

# Seed database
pnpm db:seed
```

### Environment Variables

See `apps/web/.env.example` for complete list of required environment variables.

**Generate secrets:**
```bash
# Session secret
openssl rand -base64 32

# Encryption key
openssl rand -hex 32
```

---

## 🧪 Testing

### Unit & Integration Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# Specific test suites
pnpm test:unit           # Library functions
pnpm test:integration    # API endpoints
pnpm test:compliance     # HIPAA compliance
pnpm test:security       # Security tests
```

### E2E Tests

```bash
# Run Playwright tests
pnpm test:e2e

# Interactive mode
pnpm test:e2e --ui

# Specific browser
pnpm test:e2e --project=chromium
```

### Performance Testing

```bash
# Lighthouse CI
pnpm lighthouse

# Bundle analysis
ANALYZE=true pnpm build
```

### Accessibility Testing

```bash
# axe-core tests
pnpm test:a11y
```

---

## 🚢 Deployment

### Deployment Environments

| Environment | Branch | URL | Auto-Deploy |
|-------------|--------|-----|-------------|
| **Production** | `main` | holilabs.com | ✅ Yes |
| **Staging** | `develop` | staging.holilabs.com | ✅ Yes |
| **Preview** | `feature/*` | PR preview links | ✅ Yes |

### Manual Deployment

```bash
# 1. Pre-deployment checks
pnpm pre-deploy

# 2. Build
pnpm build

# 3. Database migrations (production)
DATABASE_URL="<production-url>" pnpm prisma migrate deploy

# 4. Deploy to DigitalOcean
doctl apps create-deployment <app-id> --wait
```

### CI/CD Pipeline

Our GitHub Actions pipeline includes:

1. ✅ **Lint & Type Check** - ESLint + TypeScript
2. ✅ **Test** - Jest with PostgreSQL service
3. ✅ **Build** - Next.js production build
4. ✅ **Security** - Trivy container scanning + npm audit
5. ✅ **Deploy** - Automated deployment to DigitalOcean App Platform
6. ✅ **Migrate** - Prisma database migrations
7. ✅ **Monitor** - Sentry release tracking

### PR Quality Gates

All pull requests must pass:

- 📏 **Size Check** - Max 2000 lines changed
- 📝 **Conventional Commits** - Commit message standards
- 🔍 **Dependency Review** - No vulnerable or GPL dependencies
- 🎨 **Code Quality** - Prettier, no console.log statements
- ⚡ **Lighthouse** - 80% performance, 90% accessibility
- 📦 **Bundle Size** - Track bundle growth
- ♿ **Accessibility** - axe-core violations

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

---

## 🏗 Architecture

### Authentication Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Login
       ▼
┌─────────────────┐
│ Supabase Auth   │ ◄─── Email/Password, OAuth
└──────┬──────────┘
       │ 2. JWT Token
       ▼
┌─────────────────┐
│  AuthProvider   │ ◄─── Session timeout, refresh
│  (React Context)│
└──────┬──────────┘
       │ 3. useAuth() hook
       ▼
┌─────────────────┐
│   Protected     │ ◄─── Role-based access
│     Routes      │
└─────────────────┘
```

**Session Management:**
- 30-minute inactivity timeout
- 5-minute warning with countdown
- Cross-tab synchronization via localStorage
- Auto-logout with redirect

### Database Schema

**12 Tables:**
- `users` - User accounts with roles
- `patients` - Patient demographic data
- `medications` - Drug catalog
- `prescriptions` - E-prescriptions with line items
- `appointments` - Scheduling with status tracking
- `documents` - Medical records and attachments
- `clinical_notes` - SOAP documentation
- `consents` - Patient consent tracking
- `invoices` - Billing with CFDI fields
- `audit_logs` - Complete audit trail
- `token_maps` - Blockchain verification
- `blockchain_transactions` - Medical record hashing

**Key Relationships:**
- Patient → Appointments (1:N)
- Patient → Prescriptions (1:N)
- Patient → Documents (1:N)
- Patient → Invoices (1:N)
- ClinicalNote → Patient (N:1)

### API Structure

```
/api/
├── portal/                    # Patient API
│   ├── appointments/
│   ├── documents/
│   ├── prescriptions/
│   ├── invoices/
│   │   └── [id]/pdf          # CFDI PDF download
│   └── notifications/
├── clinical/                  # Clinician API
│   ├── patients/
│   ├── notes/
│   ├── prescribe/
│   └── labs/
├── ai/
│   ├── transcribe/            # Deepgram + Claude Sonnet 4.5
│   ├── analyze-document/
│   └── diagnosis-assist/
├── webhooks/
│   ├── stripe/                # Payment webhooks
│   └── twilio/                # WhatsApp webhooks
└── admin/
    └── audit-logs/
```

### AI Pipeline

```
┌──────────────┐
│   Clinician  │
│   Recording  │
└──────┬───────┘
       │ Audio Stream
       ▼
┌──────────────┐
│  Deepgram    │ ◄─── Real-time transcription
│  Nova-2      │
└──────┬───────┘
       │ Raw Transcript
       ▼
┌──────────────┐
│   Claude     │ ◄─── SOAP note generation
│  Sonnet 4.5  │      + ICD-10 coding
└──────┬───────┘
       │ Structured Note
       ▼
┌──────────────┐
│  PostgreSQL  │ ◄─── Save + Blockchain hash
│   + Blockchain│
└──────────────┘
```

---

## 🔒 Security & Compliance

### HIPAA Compliance

✅ **Administrative Safeguards:**
- Role-based access control (ADMIN, CLINICIAN, NURSE, PATIENT)
- Audit logging for all PHI access
- Workforce training materials

✅ **Physical Safeguards:**
- AWS S3 for encrypted backups
- DigitalOcean SOC 2 Type II compliant infrastructure

✅ **Technical Safeguards:**
- AES-256 encryption at rest
- TLS 1.3 encryption in transit
- Session timeout (30 minutes)
- Multi-factor authentication (via Supabase)
- Automatic logoff
- Audit controls and reporting

✅ **Policies & Procedures:**
- Data backup and recovery plan
- Disaster recovery plan (RPO: 24h, RTO: 4h)
- Incident response plan
- Business Associate Agreements (BAAs)

### Security Features

- **Helmet.js** - 12 HTTP security headers
- **Rate Limiting** - Upstash Redis with sliding window
- **SQL Injection Protection** - Prisma parameterized queries
- **XSS Protection** - Next.js automatic escaping
- **CSRF Protection** - NextAuth.js built-in
- **Content Security Policy** - Strict CSP headers
- **Secrets Management** - Environment variables, never committed
- **Dependency Scanning** - Dependabot + GitHub Security Advisories
- **Container Scanning** - Trivy in CI/CD

### Data Privacy

- **Patient Consent Management** - Granular consent tracking
- **Data Minimization** - Only collect necessary PHI
- **Right to Access** - Patients can download all their data
- **Right to Erasure** - Hard delete endpoints for GDPR/CPRA
- **Data Retention** - 7-year retention for medical records
- **Anonymization** - PHI removed from analytics

---

## 🤝 Contributing

We follow industry best practices for code quality and collaboration.

### Git Workflow

1. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** with conventional commits

3. **Run pre-commit checks**
```bash
pnpm lint
pnpm type-check
pnpm test
```

4. **Push and create a pull request**
```bash
git push origin feature/your-feature-name
```

### Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) for consistent commit messages:

```bash
feat(portal): add appointment rescheduling
fix(api): resolve invoice PDF generation error
docs(readme): update deployment instructions
test(compliance): add HIPAA audit log tests
refactor(auth): simplify session timeout logic
perf(api): optimize patient query with indexing
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Scopes:** `portal`, `clinical`, `api`, `auth`, `ai`, `billing`, `db`

### Code Review Checklist

- [ ] Code follows TypeScript best practices
- [ ] Tests added for new features
- [ ] HIPAA compliance considered
- [ ] Security implications reviewed
- [ ] Accessibility standards met (WCAG 2.1 AA)
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Bundle size impact checked

### Branch Protection

- ✅ Require PR reviews (2 approvals)
- ✅ Require status checks to pass
- ✅ Require linear history
- ✅ Require signed commits
- ❌ No force push to `main` or `develop`

---

## 📄 License

**Private - All Rights Reserved**

Copyright © 2025 Holi Labs. This software is proprietary and confidential.

Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited without explicit written permission from Holi Labs.

For licensing inquiries, please contact: **legal@holilabs.com**

---

## 📞 Support

### Technical Support
- **Email**: tech@holilabs.com
- **Documentation**: https://docs.holilabs.com
- **Status Page**: https://status.holilabs.com

### Sales & Partnerships
- **Email**: sales@holilabs.com
- **Website**: https://holilabs.com

### Security Issues
- **Email**: security@holilabs.com
- **PGP Key**: Available at https://holilabs.com/pgp

**⚠️ For security vulnerabilities, please do NOT open a public GitHub issue. Email security@holilabs.com instead.**

---

## 🙏 Acknowledgments

Built with ❤️ by the Holi Labs team using world-class open-source technologies:

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database toolkit
- [Supabase](https://supabase.com/) - Authentication & storage
- [Anthropic Claude](https://www.anthropic.com/) - AI-powered transcription
- [Stripe](https://stripe.com/) - Payment processing
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [Vercel](https://vercel.com/) - Build system inspiration

---

<div align="center">

**[Website](https://holilabs.com)** • **[Documentation](https://docs.holilabs.com)** • **[Contact](mailto:info@holilabs.com)**

Made with ❤️ in Mexico 🇲🇽

</div>
