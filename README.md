# 🏥 Holi Labs / Holi Protocol — Healthcare Infrastructure (Closed Alpha)

**Version:** 0.1.0 (Alpha)  
**Status:** Closed Alpha  
**License:** Not yet published (closed alpha)

## Start here (always read first)
Before making product, architecture, or deployment decisions, read:
- `docs/ANTIGRAVITY_HANDOFF.md` (canonical architecture + ports + run commands + integration assumptions)

This repo is a closed-alpha monorepo for Holi Labs, spanning a web app (`apps/web`), an API service (`apps/api`), and a desktop Sidecar (`apps/sidecar`). It focuses on prevention-first clinical workflows, interoperability (FHIR/HL7/DICOM), and clinician-in-the-loop AI assistance.

---

## 🎯 Core Functions

1. **AI-Powered Scribe**: Real-time medical transcription (Whisper + Llama 3.1)
2. **Interoperable HIMS**: FHIR R4-native health information system (Medplum)
3. **Patient-Centric Prevention**: Predictive analytics + portable health records
4. **Verifiable Workflow Engine**: Blockchain-anchored audit logs (Ethereum/Polygon)

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Fastify (optional: Python FastAPI for ML)
- **AI/ML**: Whisper (STT), Llama 3.1 (via Ollama), Claude (backup)
- **Database**: PostgreSQL 15 + Prisma ORM
- **FHIR**: Medplum (TypeScript FHIR R4 server)
- **Web3**: ethers.js v6, Veramo (DIDs + VCs), IPFS
- **Infrastructure**: Docker Compose, Redis, MinIO

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- **Node.js** 20+
- **pnpm** 8+
- **Docker** & Docker Compose
- **Git**

### Installation

```bash
# 1. Clone the repository
cd /Users/nicolacapriroloteran/prototypes/holilabsv2

# 2. Install dependencies
pnpm install

# 3. Start infrastructure (Postgres, Redis, MinIO)
cd infra/docker
docker-compose up -d

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your API keys (Anthropic, Deepgram)

# 5. Run database migrations
cd apps/web
pnpm db:migrate

# 6. Generate Prisma client
pnpm db:generate

# 7. Start website (Next.js)
cd ../..
pnpm dev

# 🎉 Open http://localhost:3000
```

### View Landing Page

```bash
# Open the static landing page in your browser
open public/landing.html
```

---

## 📁 Project Structure

```
holilabsv2/
├── apps/
│   └── web/                    # Next.js 14 frontend
│       ├── src/
│       │   ├── app/           # Next.js App Router pages
│       │   ├── components/    # React components
│       │   ├── lib/           # Business logic
│       │   │   ├── auth/      # Authentication (JWT, sessions)
│       │   │   ├── ai/        # AI integration (Claude, Llama)
│       │   │   ├── blockchain/ # Ethereum/Polygon integration
│       │   │   ├── security/  # Rate limiting, CSRF, MFA
│       │   │   └── transcription/ # Deepgram/Whisper STT
│       │   └── types/         # TypeScript types
│       ├── prisma/
│       │   └── schema.prisma  # Database schema (4K lines)
│       └── public/
│           └── landing.html   # Static landing page
├── packages/
│   ├── deid/                  # De-identification (HIPAA Safe Harbor)
│   ├── dp/                    # Differential privacy (ε/δ accounting)
│   ├── utils/                 # Shared utilities
│   └── schemas/               # Zod validation schemas
├── infra/
│   └── docker/
│       └── docker-compose.yml # Local dev infrastructure
├── prisma/
│   └── schema.prisma          # Database schema
├── docs/                      # Documentation
├── turbo.json                 # Turborepo configuration
├── pnpm-workspace.yaml        # pnpm workspace
└── package.json               # Root package.json
```

---

## 🔐 Security & Compliance

✅ **HIPAA Safe Harbor**: 18-identifier de-identification  
✅ **Differential Privacy**: ε/δ accounting for data exports  
✅ **Audit Logging**: Immutable hash-chained logs  
✅ **Row-Level Security**: Postgres RLS for multi-tenancy  
✅ **End-to-End Encryption**: AES-256 for PHI at rest  
✅ **Rate Limiting**: Redis-backed API throttling  
✅ **MFA Support**: TOTP authentication  

---

## 🧪 Testing Locally

### 1. Test Database Connection

```bash
cd apps/web
pnpm db:studio
# Opens Prisma Studio at http://localhost:5555
```

### 2. Test AI Scribe (Requires API Keys)

```bash
# Ensure ANTHROPIC_API_KEY is set in .env
# Or install Ollama for local Llama 3.1:
# brew install ollama
# ollama pull llama3.1:70b

# Start the dev server
pnpm dev

# Navigate to /dashboard/scribe (after auth)
```

### 3. Test Docker Infrastructure

```bash
cd infra/docker
docker-compose ps

# Expected output:
# NAME            STATUS
# holi-postgres   Up (healthy)
# holi-redis      Up (healthy)
# holi-minio      Up (healthy)
```

---

## 📊 Component Recycling Analysis

See [`/HOLILABS_RECYCLING_ANALYSIS.md`](/HOLILABS_RECYCLING_ANALYSIS.md) for a comprehensive analysis of components migrated from the holilabs production codebase.

**Key Statistics:**
- 70% backend architecture reused
- 60% frontend components reused
- 3,997 lines of Prisma schema (battle-tested)
- $50K+ worth of production-grade infrastructure

---

## 🗺 Roadmap

### Phase 1: Foundation (Current)
- [x] Project scaffolding
- [x] Database schema migration
- [x] Authentication system
- [x] AI Scribe backend
- [x] Landing page

### Phase 2: Core Features (Weeks 1-4)
- [ ] Patient portal UI (dark mode)
- [ ] Clinical dashboard UI
- [ ] AI Scribe frontend (voice recording)
- [ ] SOAP note generation

### Phase 3: Web3 Integration (Weeks 5-6)
- [ ] Wallet authentication (ethers.js)
- [ ] Verifiable Credentials (Veramo)
- [ ] IPFS document storage
- [ ] Smart contract audit logs

### Phase 4: FHIR Integration (Weeks 7-8)
- [ ] Medplum server setup
- [ ] FHIR R4 resource mapping
- [ ] Interoperability testing

### Phase 5: Production Hardening (Weeks 9-12)
- [ ] Security audit
- [ ] Performance testing
- [ ] HIPAA compliance review
- [ ] Deployment automation (Kubernetes)

---

## 🤝 Contributing

We're in closed alpha. To request access:

1. **Clinicians**: Share your specialty + pain points
2. **Engineers**: Submit a PR or issue
3. **Patients**: Join our community Discord

**Priority access** for early contributors.

---

## 📚 Documentation

- [Tech Stack Rationale](docs/TECH_STACK.md) (see landing.html header)
- [Component Recycling Analysis](HOLILABS_RECYCLING_ANALYSIS.md)
- [Deployment Guide](docs/DEPLOYMENT.md) (coming soon)
- [API Documentation](docs/API.md) (coming soon)

---

## 📄 License

No open-source license is published for this repository at this time.

---

## 🔗 Links

- **Website**: [holilabs.xyz](https://holilabs.xyz) (legacy)
- **GitHub**: [github.com/holilabs/protocol](https://github.com/holilabs/protocol)
- **Discord**: [discord.gg/holiprotocol](https://discord.gg/holiprotocol)
- **Twitter**: [@holiprotocol](https://twitter.com/holiprotocol)

---

## 💬 Support

- **Email**: support@holilabs.xyz
- **Security**: security@holilabs.xyz
- **Discord**: [Join Community](https://discord.gg/holiprotocol)

---

**Built for healthcare providers, patients, and engineers.**
