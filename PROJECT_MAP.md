# PROJECT MAP
> Auto-generated on 2026-02-11 23:04:30 UTC | Updated 2026-02-12 (Phase 2)
> Run `pnpm update-map` to refresh.
> Every agent MUST read this before modifying code.

## Project Status: Phase 2 — Production Hardening

**Previous:** Phase 1 — Series B Pilot (COMPLETE, tagged `v1.0.0-SIMULATION-COMPLETE`)
**Current:** Phase 2 — Production Hardening (transition from synthetic data to real patients)

### Agent Roles (Phase 2)
| Agent | Phase 1 Role | Phase 2 Role |
|-------|-------------|-------------|
| **Archie (CTO)** | Ops Commander | CI/CD Architect — build pipeline, deploy automation, monitoring |
| **Paul (CPO)** | Demo UI | Component Library Builder — reusable UI kit, design system |
| **Ruth (CLO)** | Audit Mode | Privacy Policy Drafter — LGPD/HIPAA production policies, consent flows |
| **Elena (CMO)** | Clinical Validator | Clinical Protocol Curator — real-world rule refinement, RLHF activation |
| **Victor (CFP)** | Revenue Simulator | Financial Controller — real billing integration, insurer API connections |

## Statistics
- **Total Files:** 11,294
- **Top File Types:**
  - `.ts`: 3935
  - `.md`: 2366
  - `.tsx`: 1902
  - `.json`: 633
  - `.map`: 520
  - `.svg`: 444
  - `.js`: 435
  - `.sh`: 231
  - `.txt`: 156
  - `.yml`: 127
  - `.png`: 78
  - `(no ext)`: 71
  - `.sql`: 67
  - `.jpeg`: 36
  - `.yaml`: 32

## Monorepo Structure

```
├── 📁 .claude
│   ├── memory.md
│   └── settings.local.json
├── 📁 .cursor
│   └── 📁 rules
│       ├── CFO_GORDON.md
│       ├── CPO_PRODUCT.md
│       ├── CSO_STRATEGY.md
│       └── CTO_ARCHIE.md
├── 📁 .github
│   ├── 📁 workflows
│   │   ├── build-sidecar.yml
│   │   ├── cdss-performance-test.yml
│   │   ├── ci-cd.yml
│   │   ├── ci.yml
│   │   ├── cortex-doc-automation.yml
│   │   ├── coverage-report.yml
│   │   ├── dast-scan.yml
│   │   ├── database-backup.yml
│   │   ├── deploy-production.yml
│   │   ├── deploy-staging.yml
│   │   ├── deploy-vps.yml
│   │   ├── deploy.yml
│   │   ├── disaster-recovery-test.yml
│   │   ├── health-check.yml
│   │   ├── load-testing.yml
│   │   ├── pr-checks.yml
│   │   ├── security-enhanced.yml
│   │   ├── sign-and-verify-images.yml
│   │   └── test.yml
│   ├── dependabot.yml
│   └── PULL_REQUEST_TEMPLATE_SECURITY.md
├── 📁 .husky
│   └── pre-commit
├── 📁 .zap
│   └── rules.tsv
├── 📁 apps
│   ├── 📁 api
│   │   ├── 📁 prisma
│   │   │   ├── 📁 migrations
│   │   │   │   ├── 📁 20251004060226_init
│   │   │   │   │   └── migration.sql
│   │   │   │   └── migration_lock.toml
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── 📁 scripts
│   │   │   ├── check-env.sh
│   │   │   └── healthcheck.sh
│   │   ├── 📁 src
│   │   │   ├── 📁 lib
│   │   │   │   ├── env-validation.ts
│   │   │   │   └── prisma-fhir-middleware.ts
│   │   │   ├── 📁 plugins
│   │   │   │   └── metrics-middleware.ts
│   │   │   ├── 📁 routes
│   │   │   │   ├── admin.d.ts
│   │   │   │   ├── admin.d.ts.map
│   │   │   │   ├── admin.js
│   │   │   │   ├── admin.js.map
│   │   │   │   ├── admin.ts
│   │   │   │   ├── ai.d.ts
│   │   │   │   ├── ai.d.ts.map
│   │   │   │   ├── ai.js
│   │   │   │   ├── ai.js.map
│   │   │   │   ├── ai.ts
│   │   │   │   ├── auth.d.ts
│   │   │   │   ├── auth.d.ts.map
│   │   │   │   ├── auth.js
│   │   │   │   ├── auth.js.map
│   │   │   │   ├── auth.ts
│   │   │   │   ├── exports.d.ts
│   │   │   │   ├── exports.d.ts.map
│   │   │   │   ├── exports.js
│   │   │   │   ├── exports.js.map
│   │   │   │   ├── exports.ts
│   │   │   │   ├── fhir-admin.ts
│   │   │   │   ├── fhir-export.ts
│   │   │   │   ├── fhir-ingress.ts
│   │   │   │   ├── monitoring.ts
│   │   │   │   ├── patients.d.ts
│   │   │   │   ├── patients.d.ts.map
│   │   │   │   ├── patients.js
│   │   │   │   ├── patients.js.map
│   │   │   │   ├── patients.ts
│   │   │   │   ├── telemetry.ts
│   │   │   │   ├── upload.d.ts
│   │   │   │   ├── upload.d.ts.map
│   │   │   │   ├── upload.js
│   │   │   │   ├── upload.js.map
│   │   │   │   └── upload.ts
│   │   │   ├── 📁 services
│   │   │   │   ├── 📁 monitoring
│   │   │   │   │   └── prometheus-metrics.ts
│   │   │   │   ├── fhir-audit-mirror.ts
│   │   │   │   ├── fhir-queue.ts
│   │   │   │   ├── fhir-reconciliation.ts
│   │   │   │   ├── fhir-sync-enhanced.ts
│   │   │   │   └── fhir-sync.ts
│   │   │   ├── index.d.ts
│   │   │   ├── index.d.ts.map
│   │   │   ├── index.js
│   │   │   ├── index.js.map
│   │   │   └── index.ts
│   │   ├── 📁 tests
│   │   │   ├── fhir-export.test.ts
│   │   │   ├── fhir-ingress.test.ts
│   │   │   ├── fhir-reconciliation.test.ts
│   │   │   └── setup.ts
│   │   ├── .env
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── 📁 edge
│   │   ├── 📁 logs
│   │   ├── 📁 prisma
│   │   │   ├── 📁 migrations
│   │   │   │   ├── 📁 20260128210621_init
│   │   │   │   │   └── migration.sql
│   │   │   │   └── migration_lock.toml
│   │   │   ├── dev.db
│   │   │   └── schema.prisma
│   │   ├── 📁 src
│   │   │   ├── 📁 api
│   │   │   │   └── index.ts
│   │   │   ├── 📁 generated
│   │   │   │   └── 📁 prisma
│   │   │   │       ├── 📁 runtime
              └── ... (truncated)
│   │   │   │       ├── default.d.ts
│   │   │   │       ├── default.js
│   │   │   │       ├── edge.d.ts
│   │   │   │       ├── edge.js
│   │   │   │       ├── index-browser.js
│   │   │   │       ├── index.d.ts
│   │   │   │       ├── index.js
│   │   │   │       ├── libquery_engine-darwin-arm64.dylib.node
│   │   │   │       ├── package.json
│   │   │   │       ├── schema.prisma
│   │   │   │       ├── wasm.d.ts
│   │   │   │       └── wasm.js
│   │   │   ├── 📁 lib
│   │   │   │   └── prisma.ts
│   │   │   ├── 📁 sync
│   │   │   │   ├── connectivity.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── queue.ts
│   │   │   │   └── rule-updater.ts
│   │   │   ├── 📁 telemetry
│   │   │   │   └── telemetry-service.ts
│   │   │   ├── 📁 traffic-light
│   │   │   │   └── engine.ts
│   │   │   ├── 📁 utils
│   │   │   │   └── logger.ts
│   │   │   └── index.ts
│   │   ├── .env
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── 📁 messages
│   │   ├── en.json
│   │   ├── es.json
│   │   └── pt.json
│   ├── 📁 mobile
│   │   ├── 📁 .expo
│   │   │   ├── 📁 types
│   │   │   │   └── router.d.ts
│   │   │   ├── devices.json
│   │   │   └── README.md
│   │   ├── 📁 assets
│   │   │   ├── generate_splash.py
│   │   │   ├── generate-assets.md
│   │   │   ├── icon-template.svg
│   │   │   ├── README.md
│   │   │   └── splash-template.svg
│   │   ├── 📁 src
│   │   │   ├── 📁 components
│   │   │   │   ├── 📁 ui
│   │   │   │   │   ├── AnimatedCard.tsx
│   │   │   │   │   ├── Badge.tsx
│   │   │   │   │   ├── BottomSheet.tsx
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── FormField.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── OfflineBanner.tsx
│   │   │   │   │   ├── Skeleton.tsx
│   │   │   │   │   └── Toast.tsx
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   ├── LoadingScreen.tsx
│   │   │   │   └── WebSocketStatus.tsx
│   │   │   ├── 📁 config
│   │   │   │   ├── api.d.ts
│   │   │   │   ├── api.d.ts.map
│   │   │   │   ├── api.js
│   │   │   │   ├── api.js.map
│   │   │   │   ├── api.ts
│   │   │   │   ├── appTheme.ts
│   │   │   │   ├── designTokens.ts
│   │   │   │   ├── queryClient.ts
│   │   │   │   ├── theme.d.ts
│   │   │   │   ├── theme.d.ts.map
│   │   │   │   ├── theme.js
│   │   │   │   ├── theme.js.map
│   │   │   │   └── theme.ts
│   │   │   ├── 📁 features
│   │   │   │   ├── 📁 auth
│   │   │   │   │   └── 📁 screens
              └── ... (truncated)
│   │   │   │   ├── 📁 onboarding
│   │   │   │   │   ├── 📁 navigation
              └── ... (truncated)
│   │   │   │   │   ├── 📁 screens
              └── ... (truncated)
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── README.md
│   │   │   │   ├── 📁 patients
│   │   │   │   │   └── 📁 screens
              └── ... (truncated)
│   │   │   │   ├── 📁 prevention
│   │   │   │   │   ├── 📁 screens
              └── ... (truncated)
│   │   │   │   │   ├── 📁 services
              └── ... (truncated)
│   │   │   │   │   ├── 📁 types
              └── ... (truncated)
│   │   │   │   │   └── index.ts
│   │   │   │   ├── 📁 recording
│   │   │   │   │   └── 📁 screens
              └── ... (truncated)
│   │   │   │   └── 📁 transcription
│   │   │   │       └── 📁 services
              └── ... (truncated)
│   │   │   ├── 📁 hooks
│   │   │   │   ├── useAccessibility.ts
│   │   │   │   ├── useBiometricAuth.ts
│   │   │   │   ├── useNotifications.ts
│   │   │   │   ├── useOfflineSync.ts
│   │   │   │   ├── useSplashScreen.ts
│   │   │   │   ├── useTheme.ts
│   │   │   │   └── useWebSocket.ts
│   │   │   ├── 📁 navigation
│   │   │   │   ├── AppNavigator.tsx
│   │   │   │   ├── AuthNavigator.d.ts
│   │   │   │   ├── AuthNavigator.d.ts.map
│   │   │   │   ├── AuthNavigator.js
│   │   │   │   ├── AuthNavigator.js.map
│   │   │   │   ├── AuthNavigator.tsx
│   │   │   │   ├── linking.ts
│   │   │   │   ├── MainNavigator.d.ts
│   │   │   │   ├── MainNavigator.d.ts.map
│   │   │   │   ├── MainNavigator.js
│   │   │   │   ├── MainNavigator.js.map
│   │   │   │   ├── MainNavigator.tsx
│   │   │   │   ├── RootNavigator.d.ts
│   │   │   │   ├── RootNavigator.d.ts.map
│   │   │   │   ├── RootNavigator.js
│   │   │   │   ├── RootNavigator.js.map
│   │   │   │   ├── RootNavigator.tsx
│   │   │   │   └── types.ts
│   │   │   ├── 📁 providers
│   │   │   │   └── WebSocketProvider.tsx
│   │   │   ├── 📁 screens
│   │   │   │   ├── AppointmentsScreen.tsx
│   │   │   │   ├── CoPilotScreen.tsx
│   │   │   │   ├── EnhancedLoginScreen.tsx
│   │   │   │   ├── HomeDashboardScreen.tsx
│   │   │   │   ├── MessagingScreen.tsx
│   │   │   │   ├── PatientDashboardScreen.tsx
│   │   │   │   ├── PatientSearchScreen.tsx
│   │   │   │   ├── PrivacyConsentScreen.tsx
│   │   │   │   ├── SettingsScreen.tsx
│   │   │   │   └── SmartDiagnosisScreen.tsx
│   │   │   ├── 📁 services
│   │   │   │   ├── analyticsService.tsx
│   │   │   │   ├── biometricAuth.ts
│   │   │   │   ├── haptics.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── notificationService.ts
│   │   │   │   └── websocket.ts
│   │   │   ├── 📁 shared
│   │   │   │   ├── 📁 components
│   │   │   │   │   ├── Button.d.ts
│   │   │   │   │   ├── Button.d.ts.map
│   │   │   │   │   ├── Button.js
│   │   │   │   │   ├── Button.js.map
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Card.d.ts
│   │   │   │   │   ├── Card.d.ts.map
│   │   │   │   │   ├── Card.js
│   │   │   │   │   ├── Card.js.map
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── index.d.ts
│   │   │   │   │   ├── index.d.ts.map
│   │   │   │   │   ├── index.js
│   │   │   │   │   ├── index.js.map
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── Input.d.ts
│   │   │   │   │   ├── Input.d.ts.map
│   │   │   │   │   ├── Input.js
│   │   │   │   │   ├── Input.js.map
│   │   │   │   │   └── Input.tsx
│   │   │   │   ├── 📁 contexts
│   │   │   │   │   ├── ThemeContext.d.ts
│   │   │   │   │   ├── ThemeContext.d.ts.map
│   │   │   │   │   ├── ThemeContext.js
│   │   │   │   │   ├── ThemeContext.js.map
│   │   │   │   │   └── ThemeContext.tsx
│   │   │   │   ├── 📁 services
│   │   │   │   │   ├── api.d.ts
│   │   │   │   │   ├── api.d.ts.map
│   │   │   │   │   ├── api.js
│   │   │   │   │   ├── api.js.map
│   │   │   │   │   ├── api.ts
│   │   │   │   │   ├── storage.d.ts
│   │   │   │   │   ├── storage.d.ts.map
│   │   │   │   │   ├── storage.js
│   │   │   │   │   ├── storage.js.map
│   │   │   │   │   ├── storage.ts
│   │   │   │   │   ├── supabase.d.ts
│   │   │   │   │   ├── supabase.d.ts.map
│   │   │   │   │   ├── supabase.js
│   │   │   │   │   ├── supabase.js.map
│   │   │   │   │   └── supabase.ts
│   │   │   │   └── 📁 types
│   │   │   │       ├── index.d.ts
│   │   │   │       ├── index.d.ts.map
│   │   │   │       ├── index.js
│   │   │   │       ├── index.js.map
│   │   │   │       └── index.ts
│   │   │   ├── 📁 store
│   │   │   │   ├── authStore.d.ts
│   │   │   │   ├── authStore.d.ts.map
│   │   │   │   ├── authStore.js
│   │   │   │   ├── authStore.js.map
│   │   │   │   └── authStore.ts
│   │   │   └── 📁 stores
│   │   │       ├── appointmentStore.ts
│   │   │       ├── index.ts
│   │   │       ├── onboardingStore.ts
│   │   │       ├── patientStore.ts
│   │   │       ├── preventionStore.ts
│   │   │       └── recordingStore.ts
│   │   ├── .env.example
│   │   ├── .gitignore
│   │   ├── ACCESSIBILITY_GUIDE.md
│   │   ├── App.d.ts
│   │   ├── App.d.ts.map
│   │   ├── App.js
│   │   ├── App.js.map
│   │   ├── app.json
│   │   ├── App.tsx
│   │   ├── ARCHITECTURE_MASTER_PLAN.md
│   │   ├── babel.config.js
│   │   ├── BUGFIX_SESSION.md
│   │   ├── COMPONENT_EXAMPLES.md
│   │   ├── CURRENT_STATUS.md
│   │   ├── DEPLOYMENT.md
│   │   ├── DEVELOPMENT_PROGRESS.md
│   │   ├── eas.json
│   │   ├── EXPO_GO_QUICKSTART.md
│   │   ├── expo-env.d.ts
│   │   ├── IMPLEMENTATION_COMPLETE.md
│   │   ├── index.js
│   │   ├── MOBILE_APP_SUMMARY.md
│   │   ├── NAVIGATION_GUIDE.md
│   │   ├── NEXT_STEPS.md
│   │   ├── NOTIFICATION_IMPLEMENTATION_GUIDE.md
│   │   ├── NOTIFICATION_PAYLOAD_REFERENCE.md
│   │   ├── ONBOARDING_TESTING.md
│   │   ├── package.json
│   │   ├── PATIENT_SEARCH_GUIDE.md
│   │   ├── PERFORMANCE.md
│   │   ├── PHASE_1_PREVENTION_IMPLEMENTATION.md
│   │   ├── PHASE_1_TESTING.md
│   │   ├── PHASE_7_MOBILE_API_REFERENCE.md
│   │   ├── PHASE_7_MOBILE_MIGRATION_STATUS.md
│   │   ├── PREVENTION_TROUBLESHOOTING.md
│   │   ├── PRODUCTION_CHECKLIST.md
│   │   ├── PROJECT_SUMMARY.md
│   │   ├── PUSH_NOTIFICATION_ARCHITECTURE.md
│   │   ├── QUICK_START.md
│   │   ├── README.md
│   │   ├── README.old.md
│   │   ├── SESSION_SUMMARY.md
│   │   ├── STORE_USAGE_GUIDE.md
│   │   ├── TESTING_GUIDE.md
│   │   ├── TESTING_QUICK_START.md
│   │   └── tsconfig.json
│   ├── 📁 sidecar
│   │   ├── 📁 build
│   │   │   └── entitlements.mac.plist
│   │   ├── 📁 docs
│   │   │   ├── ENTERPRISE_DEPLOYMENT.md
│   │   │   ├── INSTALLATION.md
│   │   │   ├── README.md
│   │   │   ├── RELEASE_PROCESS.md
│   │   │   └── TROUBLESHOOTING.md
│   │   ├── 📁 scripts
│   │   │   ├── azure-sign.js
│   │   │   ├── benchmark-ocr.ts
│   │   │   ├── hydrate-knowledge.ts
│   │   │   ├── ingest-rxnorm.ts
│   │   │   ├── ingest-snomed.ts
│   │   │   ├── seed-synthetic.ts
│   │   │   ├── simulate-ehr.js
│   │   │   ├── test-search.ts
│   │   │   ├── verify-artifact-mac.sh
│   │   │   ├── verify-install-mac.sh
│   │   │   ├── verify-install-win.ps1
│   │   │   └── verify-integration.ts
│   │   ├── 📁 src
│   │   │   ├── 📁 accessibility
│   │   │   │   └── reader.ts
│   │   │   ├── 📁 api
│   │   │   │   ├── index.ts
│   │   │   │   └── server.ts
│   │   │   ├── 📁 components
│   │   │   │   └── BreakGlassChat.tsx
│   │   │   ├── 📁 detection
│   │   │   │   └── vdi-detector.ts
│   │   │   ├── 📁 fingerprint
│   │   │   │   └── ehr-detector.ts
│   │   │   ├── 📁 main
│   │   │   │   ├── 📁 llm
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── ollama-client.ts
│   │   │   │   │   ├── probabilistic-validator.ts
│   │   │   │   │   └── rlhf-collector.ts
│   │   │   │   ├── 📁 ontology
│   │   │   │   │   ├── cortex-knowledge.db
│   │   │   │   │   ├── DeterministicValidator.ts
│   │   │   │   │   ├── OntologyService.ts
│   │   │   │   │   └── osmosis.sql
│   │   │   │   ├── auto-updater.ts
│   │   │   │   ├── control-plane.ts
│   │   │   │   ├── edge-client.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── input-injector.ts
│   │   │   │   ├── permissions.ts
│   │   │   │   └── resource-guard.ts
│   │   │   ├── 📁 preload
│   │   │   │   └── index.ts
│   │   │   ├── 📁 renderer
│   │   │   │   ├── 📁 components
│   │   │   │   │   ├── ConsoleView.tsx
│   │   │   │   │   ├── OnboardingOverlay.tsx
│   │   │   │   │   └── TrafficLightOverlay.tsx
│   │   │   │   ├── 📁 styles
│   │   │   │   │   ├── console.css
│   │   │   │   │   └── futuristic.css
│   │   │   │   ├── App.legacy.tsx
│   │   │   │   ├── App.tsx
│   │   │   │   ├── index.html
│   │   │   │   ├── index.tsx
│   │   │   │   ├── styles.css
│   │   │   │   └── styles.legacy.css
│   │   │   ├── 📁 vision
│   │   │   │   └── ocr-module.ts
│   │   │   └── types.ts
│   │   ├── electron-builder.yml
│   │   ├── electron.vite.config.ts
│   │   ├── eng.traineddata
│   │   ├── package.json
│   │   ├── por.traineddata
│   │   ├── QUICKSTART.md
│   │   └── tsconfig.json
│   ├── 📁 web
│   │   ├── 📁 .local-email-inbox
│   │   │   └── 2026-01-19T17-02-49-151Z-0137b408a9cee.json
│   │   ├── 📁 .swc
│   │   │   └── 📁 plugins
│   │   │       └── 📁 v7_macos_aarch64_0.106.15
│   │   ├── 📁 apps
│   │   │   └── 📁 web
│   │   │       ├── 📁 src
│   │   │       │   ├── 📁 app
              └── ... (truncated)
│   │   │       │   ├── 📁 components
              └── ... (truncated)
│   │   │       │   ├── 📁 hooks
              └── ... (truncated)
│   │   │       │   └── 📁 middleware
              └── ... (truncated)
│   │   │       └── config.yaml
│   │   ├── 📁 config
│   │   │   └── casbin-model.conf
│   │   ├── 📁 docs
│   │   │   ├── 📁 runbooks
│   │   │   │   ├── DISASTER_RECOVERY.md
│   │   │   │   └── ssl-certificate-renewal.md
│   │   │   ├── AI_MONETIZATION_STRATEGY.md
│   │   │   ├── ALERTING_RULES.md
│   │   │   ├── API_DOCUMENTATION.md
│   │   │   ├── BACKUP_AND_RECOVERY.md
│   │   │   ├── CDSS_PERFORMANCE_OPTIMIZATION.md
│   │   │   ├── CLOUDFLARE_R2_SETUP.md
│   │   │   ├── CRON_JOBS.md
│   │   │   ├── DATABASE_DEPLOYMENT.md
│   │   │   ├── DEMO_AUTH_REMOVAL.md
│   │   │   ├── DEPLOYMENT_GUIDE.md
│   │   │   ├── DEPLOYMENT_STATUS.md
│   │   │   ├── DEPLOYMENT_SUMMARY.md
│   │   │   ├── DNS_CONFIGURATION.md
│   │   │   ├── ENHANCED_FEATURES_PLAN.md
│   │   │   ├── ENVIRONMENT_VARIABLES.md
│   │   │   ├── FILE_UPLOAD_SYSTEM.md
│   │   │   ├── FORMS_SYSTEM_IMPLEMENTATION.md
│   │   │   ├── IMPLEMENTATION_COMPLETE.md
│   │   │   ├── IMPLEMENTATION_PROGRESS.md
│   │   │   ├── LANDING_PAGE_REDESIGN.md
│   │   │   ├── MANUAL_TESTING_CHECKLIST.md
│   │   │   ├── MONITORING_DASHBOARD.md
│   │   │   ├── MONITORING_STRATEGY.md
│   │   │   ├── PATIENT_CONTEXT_FORMATTER.md
│   │   │   ├── PHARMACY_INTEGRATION.md
│   │   │   ├── PRODUCTION_DEPLOYMENT_CHECKLIST.md
│   │   │   ├── PRODUCTION_READINESS.md
│   │   │   ├── PUSH_NOTIFICATIONS.md
│   │   │   ├── SECRETS_AUDIT.md
│   │   │   ├── SECRETS_MANAGEMENT.md
│   │   │   ├── SECURITY_TESTING.md
│   │   │   ├── SENTRY_SETUP.md
│   │   │   ├── SESSION_MANAGEMENT.md
│   │   │   ├── SMS_APPOINTMENT_REMINDERS.md
│   │   │   ├── SOAP_NOTE_GENERATION.md
│   │   │   ├── SSL_TLS_QUICK_REFERENCE.md
│   │   │   ├── SSL_TLS_SETUP.md
│   │   │   ├── STORAGE_COMPARISON.md
│   │   │   ├── TEST_SUMMARY.md
│   │   │   ├── TESTING.md
│   │   │   ├── TROUBLESHOOTING.md
│   │   │   ├── TYPESCRIPT_FIXES.md
│   │   │   └── UPSTASH_REDIS_SETUP.md
│   │   ├── 📁 locales
│   │   │   ├── 📁 en
│   │   │   │   └── common.json
│   │   │   ├── 📁 es
│   │   │   │   └── common.json
│   │   │   └── 📁 pt
│   │   │       └── common.json
│   │   ├── 📁 messages
│   │   │   ├── en.json
│   │   │   ├── es.json
│   │   │   └── pt.json
│   │   ├── 📁 pages
│   │   │   └── 📁 api
│   │   │       └── socketio.ts
│   │   ├── 📁 playwright-report
│   │   │   ├── 📁 data
│   │   │   │   ├── 134b08df46350408543840ce3dead8b60d5d2592.webm
│   │   │   │   ├── 93939cd377a73b6c856d28b7832b25efefe3b908.png
│   │   │   │   ├── d12ca40e742be22256847c90bc0729668cbc2ba2.md
│   │   │   │   └── e8f34cae6f695b4a1b90423546ffb6f00c6f2091.webm
│   │   │   ├── index.html
│   │   │   └── results.json
│   │   ├── 📁 prisma
│   │   │   ├── 📁 migrations
│   │   │   │   ├── 📁 20251205_web2_interop_foundation
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20251214_cdss_performance_indexes
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20251215_session_security_tokens
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260124090723_clinical_intelligence_models
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260124092552_ai_interaction_evaluation
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260124093248_audit_hash_chain
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260124100000_phi_security_audit_trail
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260124101000_feature_flags
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260124102000_clinical_rules
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260206170000_command_center_fleet
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260206193000_user_auth_columns
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260206200000_user_invitation_code_id
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260206203000_users_unique_email
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260206214232_cortexv1
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260206221500_patient_key_versions
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260206222000_patient_recording_consent
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260206222500_patient_soft_delete
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260206223000_appointments_notes
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260206223500_audit_logs_access_reason
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 📁 20260210235900_governance_schema_completeness
│   │   │   │   │   └── migration.sql
│   │   │   │   └── migration_lock.toml
│   │   │   ├── 📁 seeds
│   │   │   │   ├── clinical-templates.d.ts
│   │   │   │   ├── clinical-templates.d.ts.map
│   │   │   │   ├── clinical-templates.js
│   │   │   │   ├── clinical-templates.ts
│   │   │   │   ├── prevention-templates.ts
│   │   │   │   └── test-clinical-data.ts
│   │   │   ├── consolidated_migration.sql
│   │   │   ├── migration_add_invitation_beta_models.sql
│   │   │   ├── schema.prisma
│   │   │   ├── seed-clinical-rules.ts
│   │   │   ├── seed-demo-patient.ts
│   │   │   ├── seed-governance.ts
│   │   │   ├── seed-palliative-care.d.ts
│   │   │   ├── seed-palliative-care.d.ts.map
│   │   │   ├── seed-palliative-care.js
│   │   │   ├── seed-palliative-care.js.map
│   │   │   ├── seed-palliative-care.ts
│   │   │   ├── seed-patients.d.ts
│   │   │   ├── seed-patients.d.ts.map
│   │   │   ├── seed-patients.js
│   │   │   ├── seed-patients.js.map
│   │   │   ├── seed-patients.ts
│   │   │   ├── seed-production.d.ts
│   │   │   ├── seed-production.d.ts.map
│   │   │   ├── seed-production.js
│   │   │   ├── seed-production.js.map
│   │   │   ├── seed-production.ts
│   │   │   ├── seed-situations.d.ts
│   │   │   ├── seed-situations.d.ts.map
│   │   │   ├── seed-situations.js
│   │   │   ├── seed-situations.ts
│   │   │   ├── seed.d.ts
│   │   │   ├── seed.d.ts.map
│   │   │   ├── seed.js
│   │   │   ├── seed.js.map
│   │   │   └── seed.ts
│   │   ├── 📁 public
│   │   │   ├── 📁 .well-known
│   │   │   │   └── security.txt
│   │   │   ├── 📁 demo
│   │   │   │   ├── consult-note-sample.png
│   │   │   │   ├── discharge-summary-sample.png
│   │   │   │   ├── lab-cbc-sample.png
│   │   │   │   ├── lab-cbc.svg
│   │   │   │   ├── lab-report.svg
│   │   │   │   ├── xray-chest.svg
│   │   │   │   ├── xray-hand.svg
│   │   │   │   └── xray-knee.svg
│   │   │   ├── 📁 demo-files
│   │   │   │   ├── consultation_note_demo-patient-11_12.txt
│   │   │   │   ├── consultation_note_demo-patient-15_16.txt
│   │   │   │   ├── consultation_note_demo-patient-19_20.txt
│   │   │   │   ├── consultation_note_demo-patient-23_24.txt
│   │   │   │   ├── consultation_note_demo-patient-27_28.txt
│   │   │   │   ├── consultation_note_demo-patient-3_4.txt
│   │   │   │   ├── consultation_note_demo-patient-7_8.txt
│   │   │   │   ├── index.json
│   │   │   │   ├── lab_result_demo-patient-1_2.txt
│   │   │   │   ├── lab_result_demo-patient-13_14.txt
│   │   │   │   ├── lab_result_demo-patient-17_18.txt
│   │   │   │   ├── lab_result_demo-patient-21_22.txt
│   │   │   │   ├── lab_result_demo-patient-25_26.txt
│   │   │   │   ├── lab_result_demo-patient-29_30.txt
│   │   │   │   ├── lab_result_demo-patient-5_6.txt
│   │   │   │   ├── lab_result_demo-patient-9_10.txt
│   │   │   │   ├── medical_history_demo-patient-0_1.txt
│   │   │   │   ├── medical_history_demo-patient-12_13.txt
│   │   │   │   ├── medical_history_demo-patient-16_17.txt
│   │   │   │   ├── medical_history_demo-patient-20_21.txt
│   │   │   │   ├── medical_history_demo-patient-24_25.txt
│   │   │   │   ├── medical_history_demo-patient-28_29.txt
│   │   │   │   ├── medical_history_demo-patient-4_5.txt
│   │   │   │   ├── medical_history_demo-patient-8_9.txt
│   │   │   │   ├── prescription_demo-patient-10_11.txt
│   │   │   │   ├── prescription_demo-patient-14_15.txt
│   │   │   │   ├── prescription_demo-patient-18_19.txt
│   │   │   │   ├── prescription_demo-patient-2_3.txt
│   │   │   │   ├── prescription_demo-patient-22_23.txt
│   │   │   │   ├── prescription_demo-patient-26_27.txt
│   │   │   │   └── prescription_demo-patient-6_7.txt
│   │   │   ├── 📁 downloads
│   │   │   │   ├── README.txt
│   │   │   │   ├── sidecar-installer-universal.dmg
│   │   │   │   └── sidecar-installer-x64.msi
│   │   │   ├── 📁 icons
│   │   │   │   ├── apple-calendar.svg
│   │   │   │   ├── artificial-intelligence (1).svg
│   │   │   │   ├── artificial-intelligence.svg
│   │   │   │   ├── calendar (1).svg
│   │   │   │   ├── calendar.svg
│   │   │   │   ├── chart-cured-increasing (1).svg
│   │   │   │   ├── chart-cured-increasing.svg
│   │   │   │   ├── clinical-f (1).svg
│   │   │   │   ├── clinical-f.svg
│   │   │   │   ├── communication (1).svg
│   │   │   │   ├── communication.svg
│   │   │   │   ├── credit-card.svg
│   │   │   │   ├── crisis-response_center_person.svg
│   │   │   │   ├── diagnostics (1).svg
│   │   │   │   ├── diagnostics.svg
│   │   │   │   ├── doctor (1).svg
│   │   │   │   ├── doctor-female (1).svg
│   │   │   │   ├── doctor-female.svg
│   │   │   │   ├── doctor-male (1).svg
│   │   │   │   ├── doctor-male.svg
│   │   │   │   ├── doctor.svg
│   │   │   │   ├── download.svg
│   │   │   │   ├── forum (1).svg
│   │   │   │   ├── forum.svg
│   │   │   │   ├── google-calendar.svg
│   │   │   │   ├── head (1).svg
│   │   │   │   ├── head.svg
│   │   │   │   ├── health (1).svg
│   │   │   │   ├── health (2).svg
│   │   │   │   ├── health (3).svg
│   │   │   │   ├── health-alt (1).svg
│   │   │   │   ├── health-alt.svg
│   │   │   │   ├── health-worker_form (1).svg
│   │   │   │   ├── health-worker_form.svg
│   │   │   │   ├── health.svg
│   │   │   │   ├── i-note_action (1).svg
│   │   │   │   ├── i-note_action.svg
│   │   │   │   ├── malnutrition (1).svg
│   │   │   │   ├── malnutrition.svg
│   │   │   │   ├── microsoft-outlook.svg
│   │   │   │   ├── people (1).svg
│   │   │   │   ├── people.svg
│   │   │   │   ├── rx (1).svg
│   │   │   │   ├── rx.svg
│   │   │   │   ├── speech-language_therapy (1).svg
│   │   │   │   ├── speech-language_therapy.svg
│   │   │   │   ├── stethoscope (1).svg
│   │   │   │   ├── stethoscope.svg
│   │   │   │   ├── telemedicine (1).svg
│   │   │   │   └── telemedicine.svg
│   │   │   ├── 📁 legal
│   │   │   │   ├── 📁 consent-forms
│   │   │   │   │   ├── data-sharing-consent.md
│   │   │   │   │   ├── ehr-consent.md
│   │   │   │   │   ├── marketing-communications-consent.md
│   │   │   │   │   └── telemedicine-consent.md
│   │   │   │   ├── business-associate-agreement.md
│   │   │   │   ├── hipaa-notice-of-privacy-practices.md
│   │   │   │   ├── privacy-policy.md
│   │   │   │   └── terms-of-service.md
│   │   │   ├── 📁 logos
│   │   │   │   ├── 📁 cortex
│   │   │   │   │   ├── cortex_v1_neural_00001_.png
│   │   │   │   │   ├── cortex_v2_shield_00001_.png
│   │   │   │   │   ├── cortex_v3_layers_00001_.png
│   │   │   │   │   ├── cortex_v4_brain_00001_.png
│   │   │   │   │   ├── cortex_v5_network_00001_.png
│   │   │   │   │   └── cortex_v6_check_00001_.png
│   │   │   │   ├── holi-dark.png
│   │   │   │   ├── holi-dark.svg
│   │   │   │   ├── holi-light.png
│   │   │   │   ├── holi-light.svg
│   │   │   │   ├── holilabs-helix-blue-dark.svg
│   │   │   │   ├── holilabs-helix-blue-light.svg
│   │   │   │   ├── Logo + Color Palette_Holi Labs (4).png
│   │   │   │   ├── Logo 1_Dark (1).svg
│   │   │   │   ├── Logo 1_Dark.png
│   │   │   │   ├── Logo 1_Dark.svg
│   │   │   │   ├── Logo 1_Light (1).png
│   │   │   │   └── Logo 1_Light.svg
│   │   │   ├── 📁 worklets
│   │   │   │   └── audio-processor.js
│   │   │   ├── DESIGN_ASSETS.md
│   │   │   ├── favicon.ico
│   │   │   ├── icon-192x192.png
│   │   │   ├── icon-256x256.png
│   │   │   ├── icon-384x384.png
│   │   │   ├── icon-512x512.png
│   │   │   ├── icon.svg
│   │   │   ├── landing-hero.jpeg
│   │   │   ├── loading-video.mp4
│   │   │   ├── manifest.json
│   │   │   ├── robots.txt
│   │   │   ├── sw.js
│   │   │   ├── sw.js.map
│   │   │   ├── workbox-01fd22c6.js
│   │   │   └── workbox-01fd22c6.js.map
│   │   ├── 📁 scripts
│   │   │   ├── audit-environment.d.ts
│   │   │   ├── audit-environment.d.ts.map
│   │   │   ├── audit-environment.js
│   │   │   ├── audit-environment.ts
│   │   │   ├── backup-database.d.ts
│   │   │   ├── backup-database.d.ts.map
│   │   │   ├── backup-database.js
│   │   │   ├── backup-database.js.map
│   │   │   ├── backup-database.ts
│   │   │   ├── check-all-apis.ts
│   │   │   ├── check-health.ts
│   │   │   ├── check-mobile-responsiveness.sh
│   │   │   ├── cleanup-synthetic-names.ts
│   │   │   ├── create-demo-clinician.ts
│   │   │   ├── diagnose-connection.ts
│   │   │   ├── fix-encoding.js
│   │   │   ├── generate-demo-files.ts
│   │   │   ├── generate-production-secrets.sh
│   │   │   ├── phase6-cli.ts
│   │   │   ├── pre-deploy-check.sh
│   │   │   ├── replace-console-logs-api-routes.sh
│   │   │   ├── replace-console-logs-batch-1.sh
│   │   │   ├── reset-demo-password.ts
│   │   │   ├── seed-credentials.d.ts
│   │   │   ├── seed-credentials.d.ts.map
│   │   │   ├── seed-credentials.js
│   │   │   ├── seed-credentials.ts
│   │   │   ├── seed-prevention-templates.ts
│   │   │   ├── seed-soap-notes.d.ts
│   │   │   ├── seed-soap-notes.d.ts.map
│   │   │   ├── seed-soap-notes.js
│   │   │   ├── seed-soap-notes.js.map
│   │   │   ├── seed-soap-notes.ts
│   │   │   ├── seed-tasks.d.ts
│   │   │   ├── seed-tasks.d.ts.map
│   │   │   ├── seed-tasks.js
│   │   │   ├── seed-tasks.ts
│   │   │   ├── set-demo-password.ts
│   │   │   ├── setup-git-secrets.sh
│   │   │   ├── test-agent-gateway-browser.js
│   │   │   ├── test-agent-gateway.ts
│   │   │   ├── test-all-security.sh
│   │   │   ├── test-anonymize.ts
│   │   │   ├── test-auth-flow.ts
│   │   │   ├── test-clinical-suite.ts
│   │   │   ├── test-cors.sh
│   │   │   ├── test-cron-security.ts
│   │   │   ├── test-csrf.sh
│   │   │   ├── test-env-validation.ts
│   │   │   ├── test-governance-logger.ts
│   │   │   ├── test-lab-reference-ranges.ts
│   │   │   ├── test-login-direct.ts
│   │   │   ├── test-nextauth-signin.ts
│   │   │   ├── test-prisma-logic.ts
│   │   │   ├── test-realtime-sync.ts
│   │   │   ├── test-rxnav-integration.ts
│   │   │   ├── test-security-headers.sh
│   │   │   ├── test-soap-generation.ts
│   │   │   ├── validate-day1-setup.ts
│   │   │   ├── validate-env.ts
│   │   │   ├── validate-production.d.ts
│   │   │   ├── validate-production.d.ts.map
│   │   │   ├── validate-production.js
│   │   │   ├── validate-production.ts
│   │   │   ├── validate-translations.ts
│   │   │   ├── verify-ai-setup.ts
│   │   │   ├── verify-backups.ts
│   │   │   ├── verify-indexes.sql
│   │   │   ├── verify-login-manually.ts
│   │   │   ├── verify-phase6.ts
│   │   │   ├── verify-security-hardening.sh
│   │   │   └── verify-security-headers.ts
│   │   ├── 📁 src
│   │   │   ├── 📁 __tests__
│   │   │   │   └── 📁 soap-generator
│   │   │   │       ├── confidence-scoring.test.ts
│   │   │   │       └── soap-parser.test.ts
│   │   │   ├── 📁 app
│   │   │   │   ├── 📁 access
│   │   │   │   │   ├── 📁 request
              └── ... (truncated)
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 admin
│   │   │   │   │   ├── 📁 governance
              └── ... (truncated)
│   │   │   │   │   ├── 📁 invitations
              └── ... (truncated)
│   │   │   │   │   └── 📁 pulse
              └── ... (truncated)
│   │   │   │   ├── 📁 api
│   │   │   │   │   ├── 📁 access
              └── ... (truncated)
│   │   │   │   │   ├── 📁 access-grants
              └── ... (truncated)
│   │   │   │   │   ├── 📁 admin
              └── ... (truncated)
│   │   │   │   │   ├── 📁 agent
              └── ... (truncated)
│   │   │   │   │   ├── 📁 ai
              └── ... (truncated)
│   │   │   │   │   ├── 📁 analytics
              └── ... (truncated)
│   │   │   │   │   ├── 📁 appointments
              └── ... (truncated)
│   │   │   │   │   ├── 📁 assurance
              └── ... (truncated)
│   │   │   │   │   ├── 📁 audit
              └── ... (truncated)
│   │   │   │   │   ├── 📁 auditor
              └── ... (truncated)
│   │   │   │   │   ├── 📁 auth
              └── ... (truncated)
│   │   │   │   │   ├── 📁 beta-signup
              └── ... (truncated)
│   │   │   │   │   ├── 📁 cache
              └── ... (truncated)
│   │   │   │   │   ├── 📁 calendar
              └── ... (truncated)
│   │   │   │   │   ├── 📁 care-plans
              └── ... (truncated)
│   │   │   │   │   ├── 📁 cds
              └── ... (truncated)
│   │   │   │   │   ├── 📁 cdss
              └── ... (truncated)
│   │   │   │   │   ├── 📁 clinical
              └── ... (truncated)
│   │   │   │   │   ├── 📁 clinical-notes
              └── ... (truncated)
│   │   │   │   │   ├── 📁 command-center
              └── ... (truncated)
│   │   │   │   │   ├── 📁 consent
              └── ... (truncated)
│   │   │   │   │   ├── 📁 consents
              └── ... (truncated)
│   │   │   │   │   ├── 📁 conversations
              └── ... (truncated)
│   │   │   │   │   ├── 📁 credentials
              └── ... (truncated)
│   │   │   │   │   ├── 📁 cron
              └── ... (truncated)
│   │   │   │   │   ├── 📁 csrf
              └── ... (truncated)
│   │   │   │   │   ├── 📁 dashboard
              └── ... (truncated)
│   │   │   │   │   ├── 📁 data-access
              └── ... (truncated)
│   │   │   │   │   ├── 📁 dev
              └── ... (truncated)
│   │   │   │   │   ├── 📁 dicomweb
              └── ... (truncated)
│   │   │   │   │   ├── 📁 doctors
              └── ... (truncated)
│   │   │   │   │   ├── 📁 documents
              └── ... (truncated)
│   │   │   │   │   ├── 📁 downloads
              └── ... (truncated)
│   │   │   │   │   ├── 📁 ehr
              └── ... (truncated)
│   │   │   │   │   ├── 📁 export
              └── ... (truncated)
│   │   │   │   │   ├── 📁 feature-flags
              └── ... (truncated)
│   │   │   │   │   ├── 📁 feedback
              └── ... (truncated)
│   │   │   │   │   ├── 📁 fhir
              └── ... (truncated)
│   │   │   │   │   ├── 📁 forms
              └── ... (truncated)
│   │   │   │   │   ├── 📁 governance
              └── ... (truncated)
│   │   │   │   │   ├── 📁 health
              └── ... (truncated)
│   │   │   │   │   ├── 📁 hl7
              └── ... (truncated)
│   │   │   │   │   ├── 📁 images
              └── ... (truncated)
│   │   │   │   │   ├── 📁 imaging
              └── ... (truncated)
│   │   │   │   │   ├── 📁 invoices
              └── ... (truncated)
│   │   │   │   │   ├── 📁 jobs
              └── ... (truncated)
│   │   │   │   │   ├── 📁 lab-reference-ranges
              └── ... (truncated)
│   │   │   │   │   ├── 📁 lab-results
              └── ... (truncated)
│   │   │   │   │   ├── 📁 mar
              └── ... (truncated)
│   │   │   │   │   ├── 📁 messages
              └── ... (truncated)
│   │   │   │   │   ├── 📁 monitoring
              └── ... (truncated)
│   │   │   │   │   ├── 📁 monitoring-status
              └── ... (truncated)
│   │   │   │   │   ├── 📁 notifications
              └── ... (truncated)
│   │   │   │   │   ├── 📁 onboarding
              └── ... (truncated)
│   │   │   │   │   ├── 📁 pain-assessments
              └── ... (truncated)
│   │   │   │   │   ├── 📁 patients
              └── ... (truncated)
│   │   │   │   │   ├── 📁 payments
              └── ... (truncated)
│   │   │   │   │   ├── 📁 pharmacies
              └── ... (truncated)
│   │   │   │   │   ├── 📁 portal
              └── ... (truncated)
│   │   │   │   │   ├── 📁 prescriptions
              └── ... (truncated)
│   │   │   │   │   ├── 📁 prevention
              └── ... (truncated)
│   │   │   │   │   ├── 📁 push
              └── ... (truncated)
│   │   │   │   │   ├── 📁 qr
              └── ... (truncated)
│   │   │   │   │   ├── 📁 reconciliation
              └── ... (truncated)
│   │   │   │   │   ├── 📁 recordings
              └── ... (truncated)
│   │   │   │   │   ├── 📁 referrals
              └── ... (truncated)
│   │   │   │   │   ├── 📁 reminders
              └── ... (truncated)
│   │   │   │   │   ├── 📁 research
              └── ... (truncated)
│   │   │   │   │   ├── 📁 review-queue
              └── ... (truncated)
│   │   │   │   │   ├── 📁 scheduling
              └── ... (truncated)
│   │   │   │   │   ├── 📁 scribe
              └── ... (truncated)
│   │   │   │   │   ├── 📁 search
              └── ... (truncated)
│   │   │   │   │   ├── 📁 security
              └── ... (truncated)
│   │   │   │   │   ├── 📁 security-reports
              └── ... (truncated)
│   │   │   │   │   ├── 📁 shared
              └── ... (truncated)
│   │   │   │   │   ├── 📁 tasks
              └── ... (truncated)
│   │   │   │   │   ├── 📁 telemetry
              └── ... (truncated)
│   │   │   │   │   ├── 📁 templates
              └── ... (truncated)
│   │   │   │   │   ├── 📁 tokens
              └── ... (truncated)
│   │   │   │   │   ├── 📁 traffic-light
              └── ... (truncated)
│   │   │   │   │   ├── 📁 upload
              └── ... (truncated)
│   │   │   │   │   ├── 📁 users
              └── ... (truncated)
│   │   │   │   │   ├── 📁 video
              └── ... (truncated)
│   │   │   │   │   └── 📁 waitlist
              └── ... (truncated)
│   │   │   │   ├── 📁 auth
│   │   │   │   │   ├── 📁 error
              └── ... (truncated)
│   │   │   │   │   ├── 📁 forgot-password
              └── ... (truncated)
│   │   │   │   │   ├── 📁 login
              └── ... (truncated)
│   │   │   │   │   ├── 📁 register
              └── ... (truncated)
│   │   │   │   │   └── 📁 reset-password
              └── ... (truncated)
│   │   │   │   ├── 📁 book
│   │   │   │   │   └── 📁 [doctorId]
              └── ... (truncated)
│   │   │   │   ├── 📁 clinician
│   │   │   │   │   ├── 📁 ai-quality
              └── ... (truncated)
│   │   │   │   │   ├── 📁 notes
              └── ... (truncated)
│   │   │   │   │   └── 📁 review-queue
              └── ... (truncated)
│   │   │   │   ├── 📁 confirm
│   │   │   │   │   └── 📁 [token]
              └── ... (truncated)
│   │   │   │   ├── 📁 dashboard
│   │   │   │   │   ├── 📁 admin
              └── ... (truncated)
│   │   │   │   │   ├── 📁 agenda
              └── ... (truncated)
│   │   │   │   │   ├── 📁 ai
              └── ... (truncated)
│   │   │   │   │   ├── 📁 analytics
              └── ... (truncated)
│   │   │   │   │   ├── 📁 auditor
              └── ... (truncated)
│   │   │   │   │   ├── 📁 billing
              └── ... (truncated)
│   │   │   │   │   ├── 📁 clinical-support
              └── ... (truncated)
│   │   │   │   │   ├── 📁 co-pilot-v2
              └── ... (truncated)
│   │   │   │   │   ├── 📁 command-center
              └── ... (truncated)
│   │   │   │   │   ├── 📁 command-center-settings
              └── ... (truncated)
│   │   │   │   │   ├── 📁 console
              └── ... (truncated)
│   │   │   │   │   ├── 📁 credentials
              └── ... (truncated)
│   │   │   │   │   ├── 📁 deid-test
              └── ... (truncated)
│   │   │   │   │   ├── 📁 diagnosis
              └── ... (truncated)
│   │   │   │   │   ├── 📁 doc-intelligence
              └── ... (truncated)
│   │   │   │   │   ├── 📁 downloads
              └── ... (truncated)
│   │   │   │   │   ├── 📁 forms
              └── ... (truncated)
│   │   │   │   │   ├── 📁 governance
              └── ... (truncated)
│   │   │   │   │   ├── 📁 palliative-patients
              └── ... (truncated)
│   │   │   │   │   ├── 📁 patients
              └── ... (truncated)
│   │   │   │   │   ├── 📁 pre-visit
              └── ... (truncated)
│   │   │   │   │   ├── 📁 prevention
              └── ... (truncated)
│   │   │   │   │   ├── 📁 recordings
              └── ... (truncated)
│   │   │   │   │   ├── 📁 referrals
              └── ... (truncated)
│   │   │   │   │   ├── 📁 reminders
              └── ... (truncated)
│   │   │   │   │   ├── 📁 reschedules
              └── ... (truncated)
│   │   │   │   │   ├── 📁 settings
              └── ... (truncated)
│   │   │   │   │   ├── 📁 share-profile
              └── ... (truncated)
│   │   │   │   │   ├── 📁 subscribers
              └── ... (truncated)
│   │   │   │   │   ├── 📁 tasks
              └── ... (truncated)
│   │   │   │   │   ├── 📁 templates
              └── ... (truncated)
│   │   │   │   │   ├── 📁 upload
              └── ... (truncated)
│   │   │   │   │   ├── error.tsx
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 download
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 email-assets
│   │   │   │   │   └── 📁 holilabs-logo.png
              └── ... (truncated)
│   │   │   │   ├── 📁 find-doctor
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 legal
│   │   │   │   │   ├── 📁 baa
              └── ... (truncated)
│   │   │   │   │   ├── 📁 consent
              └── ... (truncated)
│   │   │   │   │   ├── 📁 cookie-policy
              └── ... (truncated)
│   │   │   │   │   ├── 📁 data-processing-agreement
              └── ... (truncated)
│   │   │   │   │   ├── 📁 hipaa-notice
              └── ... (truncated)
│   │   │   │   │   ├── 📁 privacy-policy
              └── ... (truncated)
│   │   │   │   │   └── 📁 terms-of-service
              └── ... (truncated)
│   │   │   │   ├── 📁 onboarding
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 portal
│   │   │   │   │   ├── 📁 (auth)
              └── ... (truncated)
│   │   │   │   │   ├── 📁 appointments
              └── ... (truncated)
│   │   │   │   │   ├── 📁 auth
              └── ... (truncated)
│   │   │   │   │   ├── 📁 consultations
              └── ... (truncated)
│   │   │   │   │   ├── 📁 dashboard
              └── ... (truncated)
│   │   │   │   │   ├── 📁 documents
              └── ... (truncated)
│   │   │   │   │   ├── 📁 fhir
              └── ... (truncated)
│   │   │   │   │   ├── 📁 forms
              └── ... (truncated)
│   │   │   │   │   ├── 📁 medications
              └── ... (truncated)
│   │   │   │   │   ├── 📁 messages
              └── ... (truncated)
│   │   │   │   │   ├── 📁 metrics
              └── ... (truncated)
│   │   │   │   │   ├── 📁 profile
              └── ... (truncated)
│   │   │   │   │   ├── 📁 records
              └── ... (truncated)
│   │   │   │   │   ├── 📁 settings
              └── ... (truncated)
│   │   │   │   │   ├── 📁 video
              └── ... (truncated)
│   │   │   │   │   ├── error.tsx
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   └── loading.tsx
│   │   │   │   ├── 📁 pricing
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 shared
│   │   │   │   │   └── 📁 [shareToken]
              └── ... (truncated)
│   │   │   │   ├── 📁 sign-in
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── error.tsx
│   │   │   │   ├── global-error.tsx
│   │   │   │   ├── globals.css
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── not-found.tsx
│   │   │   │   ├── page_old.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── 📁 components
│   │   │   │   ├── 📁 access-grants
│   │   │   │   │   ├── AccessGrantForm.tsx
│   │   │   │   │   └── AccessGrantsList.tsx
│   │   │   │   ├── 📁 ai
│   │   │   │   │   ├── ai-feedback-button.tsx
│   │   │   │   │   └── confidence-highlight.tsx
│   │   │   │   ├── 📁 appointments
│   │   │   │   │   ├── AddToCalendarButtons.tsx
│   │   │   │   │   └── SelfServiceBooking.tsx
│   │   │   │   ├── 📁 calendar
│   │   │   │   │   ├── CalendarView.tsx
│   │   │   │   │   ├── CustomDateDisplay.tsx
│   │   │   │   │   ├── DailyViewGrid.tsx
│   │   │   │   │   ├── SituationBadges.tsx
│   │   │   │   │   └── StatusDropdown.tsx
│   │   │   │   ├── 📁 chat
│   │   │   │   │   ├── ChatList.tsx
│   │   │   │   │   ├── ChatThread.tsx
│   │   │   │   │   ├── FileAttachment.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── MessageInput.tsx
│   │   │   │   │   └── MessageSearch.tsx
│   │   │   │   ├── 📁 clinical
│   │   │   │   │   ├── 📁 cds
              └── ... (truncated)
│   │   │   │   │   ├── ClinicalDecisionSupport.tsx
│   │   │   │   │   ├── ClinicalDecisionSupportPanel.tsx
│   │   │   │   │   ├── DiagnosisAssistant.tsx
│   │   │   │   │   ├── EnhancedClinicalDecisionSupport.tsx
│   │   │   │   │   ├── ICD10Search.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── MedicalImageViewer.tsx
│   │   │   │   │   ├── MedicationPrescription.tsx
│   │   │   │   │   ├── PrintableSoapNote.tsx
│   │   │   │   │   ├── ProblemList.tsx
│   │   │   │   │   ├── SmartTemplatesPanel.tsx
│   │   │   │   │   └── VitalSignsTracker.tsx
│   │   │   │   ├── 📁 co-pilot
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   ├── CDSChatDrawer.tsx
│   │   │   │   │   ├── CommandCenterGrid.tsx
│   │   │   │   │   ├── CommandCenterTile.tsx
│   │   │   │   │   ├── CommandPalette.tsx
│   │   │   │   │   ├── ConnectionStatus.tsx
│   │   │   │   │   ├── CoPilotOnboarding.tsx
│   │   │   │   │   ├── CoPilotPreventionAlerts.tsx
│   │   │   │   │   ├── CoPilotPreventionHubMini.tsx
│   │   │   │   │   ├── DeviceManagerTile.tsx
│   │   │   │   │   ├── DiagnosisTile.tsx
│   │   │   │   │   ├── DragDropCanvas.tsx
│   │   │   │   │   ├── FindingsTimeline.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── KeyboardShortcutsOverlay.tsx
│   │   │   │   │   ├── LoadingTile.tsx
│   │   │   │   │   ├── NotificationsTile.tsx
│   │   │   │   │   ├── PatientConsentModal.tsx
│   │   │   │   │   ├── PatientSearchTile.tsx
│   │   │   │   │   ├── PulseTooltip.tsx
│   │   │   │   │   ├── QRPairingTile.tsx
│   │   │   │   │   ├── QuickActionsTile.tsx
│   │   │   │   │   ├── TileManager.tsx
│   │   │   │   │   ├── Toast.tsx
│   │   │   │   │   ├── ToolDock.tsx
│   │   │   │   │   ├── Tooltip.tsx
│   │   │   │   │   └── VitalsTile.tsx
│   │   │   │   ├── 📁 common
│   │   │   │   │   └── Tooltip.tsx
│   │   │   │   ├── 📁 compliance
│   │   │   │   │   └── AccessReasonModal.tsx
│   │   │   │   ├── 📁 credentials
│   │   │   │   │   ├── CredentialCard.tsx
│   │   │   │   │   ├── CredentialForm.tsx
│   │   │   │   │   ├── CredentialUpload.tsx
│   │   │   │   │   └── VerifiedBadge.tsx
│   │   │   │   ├── 📁 dashboard
│   │   │   │   │   ├── ActivityTimeline.tsx
│   │   │   │   │   ├── AIInsights.tsx
│   │   │   │   │   ├── CommandKPatientSelector.tsx
│   │   │   │   │   ├── CommandPalette.tsx
│   │   │   │   │   ├── CoPilotIntegrationBubble.tsx
│   │   │   │   │   ├── CorrectionMetricsWidget.tsx
│   │   │   │   │   ├── DashboardTile.tsx
│   │   │   │   │   ├── EmptyState.tsx
│   │   │   │   │   ├── EnhancedStatCard.tsx
│   │   │   │   │   ├── FloatingActionButton.tsx
│   │   │   │   │   ├── FocusTimer.tsx
│   │   │   │   │   ├── HoverMenu.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── KPIWidgets.tsx
│   │   │   │   │   ├── PastelGlassStatCard.tsx
│   │   │   │   │   ├── PatientFilters.tsx
│   │   │   │   │   ├── PatientHoverCard.tsx
│   │   │   │   │   ├── PatientRowActions.tsx
│   │   │   │   │   ├── PriorityPatientsWidget.tsx
│   │   │   │   │   ├── QuickActionsMenu.tsx
│   │   │   │   │   ├── ReviewQueueWidget.tsx
│   │   │   │   │   ├── ReviewQueueWidget.tsx.bak
│   │   │   │   │   ├── SmartNotifications.tsx
│   │   │   │   │   └── WidgetStore.tsx
│   │   │   │   ├── 📁 demo
│   │   │   │   │   └── DemoModeToggle.tsx
│   │   │   │   ├── 📁 download
│   │   │   │   │   ├── DownloadClient.tsx
│   │   │   │   │   └── DownloadGated.tsx
│   │   │   │   ├── 📁 email
│   │   │   │   │   ├── EmailLayout.tsx
│   │   │   │   │   └── InviteEmail.tsx
│   │   │   │   ├── 📁 encounter
│   │   │   │   │   ├── ChatWithSuggestions.tsx
│   │   │   │   │   ├── DocumentUpload.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── SmartAlerts.tsx
│   │   │   │   │   └── SummaryDraft.tsx
│   │   │   │   ├── 📁 forms
│   │   │   │   │   └── SendFormModal.tsx
│   │   │   │   ├── 📁 governance
│   │   │   │   │   ├── GovernanceFeedTable.tsx
│   │   │   │   │   ├── OverrideForm.tsx
│   │   │   │   │   ├── ReplayModal.tsx
│   │   │   │   │   ├── RiskCard.tsx
│   │   │   │   │   ├── SafetyPulse.tsx
│   │   │   │   │   └── TraceDetailModal.tsx
│   │   │   │   ├── 📁 imaging
│   │   │   │   │   ├── CornerstoneDicomViewer.tsx
│   │   │   │   │   ├── DicomViewer.tsx
│   │   │   │   │   ├── ImagingStudiesList.tsx
│   │   │   │   │   └── ImagingStudyForm.tsx
│   │   │   │   ├── 📁 invoices
│   │   │   │   │   ├── InvoiceForm.tsx
│   │   │   │   │   └── InvoicesList.tsx
│   │   │   │   ├── 📁 lab-results
│   │   │   │   │   ├── LabResultForm.tsx
│   │   │   │   │   └── LabResultsList.tsx
│   │   │   │   ├── 📁 landing
│   │   │   │   │   ├── Architecture.tsx
│   │   │   │   │   ├── CoPilot.tsx
│   │   │   │   │   ├── DataManagement.tsx
│   │   │   │   │   ├── DemoRequest.tsx
│   │   │   │   │   ├── Footer.tsx
│   │   │   │   │   ├── Governance.tsx
│   │   │   │   │   ├── Hero.tsx
│   │   │   │   │   ├── HighStakes.tsx
│   │   │   │   │   ├── HowItWorks.tsx
│   │   │   │   │   ├── LandingHeader.tsx
│   │   │   │   │   ├── ParadigmShift.tsx
│   │   │   │   │   └── VerificationWorkflow.tsx
│   │   │   │   ├── 📁 legal
│   │   │   │   │   ├── ConsentAcceptanceFlow.tsx
│   │   │   │   │   └── LegalDocumentViewer.tsx
│   │   │   │   ├── 📁 mar
│   │   │   │   │   └── MARSheet.tsx
│   │   │   │   ├── 📁 medications
│   │   │   │   │   └── MedicationAdherenceTracker.tsx
│   │   │   │   ├── 📁 messaging
│   │   │   │   │   ├── FailedRemindersTable.tsx
│   │   │   │   │   ├── MessageTemplateEditor.tsx
│   │   │   │   │   ├── PatientSelectorModal.tsx
│   │   │   │   │   ├── ScheduledRemindersTable.tsx
│   │   │   │   │   ├── ScheduleReminderModal.tsx
│   │   │   │   │   └── SentRemindersTable.tsx
│   │   │   │   ├── 📁 notifications
│   │   │   │   │   ├── NotificationBell.tsx
│   │   │   │   │   ├── NotificationCenter.tsx
│   │   │   │   │   ├── NotificationProvider.tsx
│   │   │   │   │   └── NotificationToast.tsx
│   │   │   │   ├── 📁 onboarding
│   │   │   │   │   ├── AuthTour.tsx
│   │   │   │   │   ├── DashboardWalkthrough.tsx
│   │   │   │   │   ├── DemoPatientSetup.tsx
│   │   │   │   │   ├── ImprovedWelcomeModal.tsx
│   │   │   │   │   ├── IntroQuestionnaireModal.tsx
│   │   │   │   │   ├── OnboardingChecklist.tsx
│   │   │   │   │   ├── ProfessionalOnboarding.tsx
│   │   │   │   │   ├── ScribeTour.tsx
│   │   │   │   │   └── WelcomeModal.tsx
│   │   │   │   ├── 📁 palliative
│   │   │   │   │   ├── 📁 tabs
              └── ... (truncated)
│   │   │   │   │   └── PainTrendChart.tsx
│   │   │   │   ├── 📁 patient
│   │   │   │   │   ├── ClinicalNotesEditor.tsx
│   │   │   │   │   ├── ConsentManager.tsx
│   │   │   │   │   ├── DataIngestion.tsx
│   │   │   │   │   ├── EHRAccessControl.tsx
│   │   │   │   │   ├── EPrescribingDrawer.tsx
│   │   │   │   │   └── SchedulingModal.tsx
│   │   │   │   ├── 📁 patients
│   │   │   │   │   ├── DesktopPatientTable.tsx
│   │   │   │   │   ├── ElectronicHealthRecord.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── MobilePatientCard.tsx
│   │   │   │   │   ├── PatientDetailSplitPanel.tsx
│   │   │   │   │   ├── PatientImportModal.tsx
│   │   │   │   │   ├── PatientListDualView.tsx
│   │   │   │   │   └── ResponsivePatientList.tsx
│   │   │   │   ├── 📁 pdf
│   │   │   │   │   └── SOAPNotePDF.tsx
│   │   │   │   ├── 📁 portal
│   │   │   │   │   ├── 📁 fhir
              └── ... (truncated)
│   │   │   │   │   ├── FhirResourceViewer.tsx
│   │   │   │   │   ├── MedicalRecordsList.tsx
│   │   │   │   │   ├── PatientNavigation.tsx
│   │   │   │   │   ├── PatientOnboardingWizard.tsx
│   │   │   │   │   ├── PatientPortalWrapper.tsx
│   │   │   │   │   ├── PatientToolkit.tsx
│   │   │   │   │   ├── PortalLayoutWrapper.tsx
│   │   │   │   │   ├── ShareRecordModal.tsx
│   │   │   │   │   └── WhatsAppConsentSection.tsx
│   │   │   │   ├── 📁 prescriptions
│   │   │   │   │   └── ElectronicSignature.tsx
│   │   │   │   ├── 📁 prevention
│   │   │   │   │   ├── ActivityFeed.tsx
│   │   │   │   │   ├── BulkActionToolbar.tsx
│   │   │   │   │   ├── CommentsSection.tsx
│   │   │   │   │   ├── PreventionHubSidebar.tsx
│   │   │   │   │   ├── PreventionNotificationProvider.tsx
│   │   │   │   │   ├── PreventionPlanHistory.tsx
│   │   │   │   │   ├── PreventionPlanVersionComparison.tsx
│   │   │   │   │   ├── QuickActionsPanel.tsx
│   │   │   │   │   ├── ShareTemplateModal.tsx
│   │   │   │   │   ├── StatusHistoryTimeline.tsx
│   │   │   │   │   ├── VersionComparison.tsx
│   │   │   │   │   └── VersionHistory.tsx
│   │   │   │   ├── 📁 print
│   │   │   │   │   └── PrintableSOAPNote.tsx
│   │   │   │   ├── 📁 privacy
│   │   │   │   │   ├── AccessLogViewer.tsx
│   │   │   │   │   ├── ConsentManagementPanel.tsx
│   │   │   │   │   └── GranularAccessManager.tsx
│   │   │   │   ├── 📁 qr
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── PermissionManager.tsx
│   │   │   │   │   ├── QRDisplay.tsx
│   │   │   │   │   └── QRScanner.tsx
│   │   │   │   ├── 📁 recordings
│   │   │   │   │   └── AudioRecorder.tsx
│   │   │   │   ├── 📁 referrals
│   │   │   │   │   └── ReferralDashboard.tsx
│   │   │   │   ├── 📁 reschedule
│   │   │   │   │   └── RescheduleApprovalCard.tsx
│   │   │   │   ├── 📁 scribe
│   │   │   │   │   ├── AudioWaveform.tsx
│   │   │   │   │   ├── ClinicalDisclosureModal.tsx
│   │   │   │   │   ├── ConfidenceBadge.tsx
│   │   │   │   │   ├── PainScaleSelector.tsx
│   │   │   │   │   ├── QuickInterventionsPanel.tsx
│   │   │   │   │   ├── RecordingConsentDialog.tsx
│   │   │   │   │   ├── SOAPNoteEditor.tsx
│   │   │   │   │   ├── TranscriptViewer.tsx
│   │   │   │   │   ├── VersionDiffViewer.tsx
│   │   │   │   │   ├── VersionHistoryModal.tsx
│   │   │   │   │   ├── VoiceActivityDetector.tsx
│   │   │   │   │   └── VoiceInputButton.tsx
│   │   │   │   ├── 📁 search
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   └── GlobalSearch.tsx
│   │   │   │   ├── 📁 shared
│   │   │   │   │   └── SearchParamsHandler.tsx
│   │   │   │   ├── 📁 skeletons
│   │   │   │   │   ├── DashboardSkeleton.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── PatientDetailSkeleton.tsx
│   │   │   │   │   ├── PatientListSkeleton.tsx
│   │   │   │   │   ├── PortalSkeletons.tsx
│   │   │   │   │   ├── ScribeSkeleton.tsx
│   │   │   │   │   └── SkeletonBase.tsx
│   │   │   │   ├── 📁 spatial
│   │   │   │   │   ├── SpatialButton.tsx
│   │   │   │   │   └── SpatialCard.tsx
│   │   │   │   ├── 📁 sync
│   │   │   │   │   ├── ConflictReviewQueue.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── 📁 tasks
│   │   │   │   │   └── TaskManagementPanel.tsx
│   │   │   │   ├── 📁 templates
│   │   │   │   │   ├── NotificationTemplateEditor.tsx
│   │   │   │   │   ├── TemplatePicker.tsx
│   │   │   │   │   ├── TemplatePickerModal.tsx
│   │   │   │   │   ├── TemplatePreview.tsx
│   │   │   │   │   └── VariablePicker.tsx
│   │   │   │   ├── 📁 traffic-light
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── TrafficLight.tsx
│   │   │   │   ├── 📁 ui
│   │   │   │   │   ├── Badge.tsx
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── Dialog.tsx
│   │   │   │   │   ├── EmptyState.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── LanguageSwitch.tsx
│   │   │   │   │   ├── SkeletonLoader.tsx
│   │   │   │   │   ├── Switch.tsx
│   │   │   │   │   ├── Toast.tsx
│   │   │   │   │   └── toaster.tsx
│   │   │   │   ├── 📁 upload
│   │   │   │   │   ├── DocumentList.tsx
│   │   │   │   │   ├── FileUploader.tsx
│   │   │   │   │   └── FileUploadZone.tsx
│   │   │   │   ├── 📁 video
│   │   │   │   │   ├── VideoRoom.tsx
│   │   │   │   │   └── WaitingRoom.tsx
│   │   │   │   ├── 📁 voice
│   │   │   │   │   └── VoiceCommandFeedback.tsx
│   │   │   │   ├── AICommandCenter.tsx
│   │   │   │   ├── CommandPalette.tsx
│   │   │   │   ├── ContextMenu.tsx
│   │   │   │   ├── CookieConsentBanner.tsx
│   │   │   │   ├── DarkModeShowcase.tsx
│   │   │   │   ├── DashboardLayout.tsx
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   ├── FeedbackWidget.tsx
│   │   │   │   ├── IntroAnimation.tsx
│   │   │   │   ├── IOSInstallPrompt.tsx
│   │   │   │   ├── LanguageSelector.tsx
│   │   │   │   ├── LoadingScreen.tsx
│   │   │   │   ├── LoadingSkeleton.tsx
│   │   │   │   ├── NotificationBadge.tsx
│   │   │   │   ├── NotificationPrompt.tsx
│   │   │   │   ├── OfflineDetector.tsx
│   │   │   │   ├── OfflineIndicator.tsx
│   │   │   │   ├── PatientSearch.tsx
│   │   │   │   ├── PrintButton.tsx
│   │   │   │   ├── Providers.tsx
│   │   │   │   ├── SessionTimeoutWarning.tsx
│   │   │   │   ├── SkipLink.tsx
│   │   │   │   ├── SupportContact.tsx
│   │   │   │   ├── ThemeToggle.tsx
│   │   │   │   └── WebVitalsTracker.tsx
│   │   │   ├── 📁 config
│   │   │   │   └── clinical-rules.ts
│   │   │   ├── 📁 contexts
│   │   │   │   ├── AgentContext.tsx
│   │   │   │   ├── ClinicalSessionContext.tsx
│   │   │   │   └── LanguageContext.tsx
│   │   │   ├── 📁 domain
│   │   │   │   └── auditor.types.ts
│   │   │   ├── 📁 hooks
│   │   │   │   ├── index.ts
│   │   │   │   ├── use-audio-recorder.ts
│   │   │   │   ├── use-toast.ts
│   │   │   │   ├── useAgent.ts
│   │   │   │   ├── useAnalytics.ts
│   │   │   │   ├── useCSRF.ts
│   │   │   │   ├── useCsrfToken.ts
│   │   │   │   ├── useDebounce.ts
│   │   │   │   ├── useDeviceSync.ts
│   │   │   │   ├── useFeatureFlag.ts
│   │   │   │   ├── useGovernanceRealtime.ts
│   │   │   │   ├── useJobStatus.ts
│   │   │   │   ├── useKeyboardShortcuts.ts
│   │   │   │   ├── useLanguage.ts
│   │   │   │   ├── useNotifications.ts
│   │   │   │   ├── usePatientContext.ts
│   │   │   │   ├── usePatientFilters.ts
│   │   │   │   ├── useRealtimePreventionUpdates.ts
│   │   │   │   ├── useSafetyInterceptor.ts
│   │   │   │   ├── useSessionTimeout.ts
│   │   │   │   ├── useTaskRealtime.ts
│   │   │   │   ├── useTheme.ts
│   │   │   │   ├── useToolUsageTracker.ts
│   │   │   │   └── useVoiceCommands.ts
│   │   │   ├── 📁 i18n
│   │   │   │   └── shared.ts
│   │   │   ├── 📁 jobs
│   │   │   │   └── override-clustering.job.ts
│   │   │   ├── 📁 legacy_archive
│   │   │   │   ├── 📁 appointments
│   │   │   │   │   ├── error.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 co-pilot
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 co-pilot-v2
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 command-center-demo
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 command-center-showcase
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 messages
│   │   │   │   │   ├── error.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 patients
│   │   │   │   │   ├── 📁 [id]
              └── ... (truncated)
│   │   │   │   │   ├── 📁 import
              └── ... (truncated)
│   │   │   │   │   ├── 📁 invite
              └── ... (truncated)
│   │   │   │   │   ├── error.tsx
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 prescriptions
│   │   │   │   │   ├── 📁 [id]
              └── ... (truncated)
│   │   │   │   │   ├── error.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 scribe
│   │   │   │   │   ├── error.tsx
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── 📁 video
│   │   │   │   │   └── 📁 [appointmentId]
              └── ... (truncated)
│   │   │   │   ├── ARCHIVED_ASSETS_MAP.md
│   │   │   │   ├── page-new.tsx
│   │   │   │   ├── page-refactored.tsx
│   │   │   │   └── page.old.tsx
│   │   │   ├── 📁 lib
│   │   │   │   ├── 📁 __mocks__
│   │   │   │   │   └── logger.ts
│   │   │   │   ├── 📁 __tests__
│   │   │   │   │   ├── 📁 fixtures
              └── ... (truncated)
│   │   │   │   │   ├── api-auth.test.ts
│   │   │   │   │   ├── api-billing-export.test.ts
│   │   │   │   │   ├── api-patients.test.ts
│   │   │   │   │   ├── api-scribe.test.ts
│   │   │   │   │   ├── auth-comprehensive.skip.ts
│   │   │   │   │   ├── betterstack-logger.manual.skip.ts
│   │   │   │   │   ├── env.manual.skip.ts
│   │   │   │   │   ├── logger.manual.skip.ts
│   │   │   │   │   ├── prisma-replica.test.ts
│   │   │   │   │   └── redis-rate-limit.manual.skip.ts
│   │   │   │   ├── 📁 ai
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   ├── 📁 providers
              └── ... (truncated)
│   │   │   │   │   ├── 📁 schemas
              └── ... (truncated)
│   │   │   │   │   ├── 📁 test-fixtures
              └── ... (truncated)
│   │   │   │   │   ├── 📁 validators
              └── ... (truncated)
│   │   │   │   │   ├── anthropic-provider.ts
│   │   │   │   │   ├── bridge.ts
│   │   │   │   │   ├── cache.ts
│   │   │   │   │   ├── chat.ts
│   │   │   │   │   ├── circuit-breaker.ts
│   │   │   │   │   ├── claude.ts
│   │   │   │   │   ├── confidence-scoring.ts
│   │   │   │   │   ├── consensus-verifier.ts
│   │   │   │   │   ├── embeddings.ts
│   │   │   │   │   ├── factory.ts
│   │   │   │   │   ├── gemini-provider.ts
│   │   │   │   │   ├── patient-context-formatter.ts
│   │   │   │   │   ├── patient-data-fetcher.ts
│   │   │   │   │   ├── prompt-builder.ts
│   │   │   │   │   ├── provider-interface.ts
│   │   │   │   │   ├── retry.ts
│   │   │   │   │   ├── router.ts
│   │   │   │   │   ├── types.ts
│   │   │   │   │   ├── usage-tracker.ts
│   │   │   │   │   └── validator.ts
│   │   │   │   ├── 📁 analytics
│   │   │   │   │   └── server-analytics.ts
│   │   │   │   ├── 📁 api
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   ├── 📁 schemas
              └── ... (truncated)
│   │   │   │   │   ├── client.ts
│   │   │   │   │   ├── cors.ts
│   │   │   │   │   ├── export-rate-limit.ts
│   │   │   │   │   ├── fhir-client.ts
│   │   │   │   │   ├── middleware.ts
│   │   │   │   │   ├── request-logger.ts
│   │   │   │   │   ├── schemas.ts
│   │   │   │   │   ├── security-headers.ts
│   │   │   │   │   └── validation.ts
│   │   │   │   ├── 📁 appointments
│   │   │   │   │   ├── confirmation.ts
│   │   │   │   │   ├── conflict-detection.ts
│   │   │   │   │   └── reminder-service.ts
│   │   │   │   ├── 📁 audit
│   │   │   │   │   ├── bemi-context.ts
│   │   │   │   │   └── deid-audit.ts
│   │   │   │   ├── 📁 auth
│   │   │   │   │   ├── auth.config.ts
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── AuthProvider.tsx
│   │   │   │   │   ├── casbin-adapter.ts
│   │   │   │   │   ├── casbin-middleware.ts
│   │   │   │   │   ├── casbin.ts
│   │   │   │   │   ├── magic-link.ts
│   │   │   │   │   ├── mfa.ts
│   │   │   │   │   ├── otp.ts
│   │   │   │   │   ├── password-reset.ts
│   │   │   │   │   ├── password-validation.ts
│   │   │   │   │   ├── patient-session.ts
│   │   │   │   │   ├── server.ts
│   │   │   │   │   ├── session-security.ts
│   │   │   │   │   ├── session-store.ts
│   │   │   │   │   ├── session-tracking.ts
│   │   │   │   │   └── token-revocation.ts
│   │   │   │   ├── 📁 aws
│   │   │   │   │   └── comprehend-medical.ts
│   │   │   │   ├── 📁 blockchain
│   │   │   │   │   ├── contracts.ts
│   │   │   │   │   └── hashing.ts
│   │   │   │   ├── 📁 brazil-interop
│   │   │   │   │   ├── ips-exporter.ts
│   │   │   │   │   └── tiss-serializer.ts
│   │   │   │   ├── 📁 cache
│   │   │   │   │   ├── cache-manager.ts
│   │   │   │   │   ├── patient-context-cache.ts
│   │   │   │   │   └── redis-client.ts
│   │   │   │   ├── 📁 calendar
│   │   │   │   │   ├── ics-generator.ts
│   │   │   │   │   ├── sync.ts
│   │   │   │   │   └── token-encryption.ts
│   │   │   │   ├── 📁 cds
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   ├── 📁 engines
              └── ... (truncated)
│   │   │   │   │   ├── 📁 integrations
              └── ... (truncated)
│   │   │   │   │   ├── 📁 rules
              └── ... (truncated)
│   │   │   │   │   ├── README.md
│   │   │   │   │   └── types.ts
│   │   │   │   ├── 📁 chat
│   │   │   │   │   └── socket-client.ts
│   │   │   │   ├── 📁 client
│   │   │   │   │   └── csrf.ts
│   │   │   │   ├── 📁 clinical
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   ├── 📁 context
              └── ... (truncated)
│   │   │   │   │   ├── 📁 engines
              └── ... (truncated)
│   │   │   │   │   ├── 📁 quality
              └── ... (truncated)
│   │   │   │   │   ├── API_EXAMPLES.md
│   │   │   │   │   ├── ARCHITECTURE.md
│   │   │   │   │   ├── clinical-trials.service.ts
│   │   │   │   │   ├── cms-coverage.service.ts
│   │   │   │   │   ├── compliance-rules.ts
│   │   │   │   │   ├── content-loader.ts
│   │   │   │   │   ├── content-registry.ts
│   │   │   │   │   ├── content-types.ts
│   │   │   │   │   ├── governance-policy.ts
│   │   │   │   │   ├── icd11.service.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── international-guidelines.service.ts
│   │   │   │   │   ├── lab-decision-rules.ts
│   │   │   │   │   ├── lab-reference-ranges.ts
│   │   │   │   │   ├── openfda.service.ts
│   │   │   │   │   ├── process-clinical-decision.ts
│   │   │   │   │   ├── process-with-fallback.ts
│   │   │   │   │   ├── README.md
│   │   │   │   │   ├── rule-engine.ts
│   │   │   │   │   ├── rxnorm.service.ts
│   │   │   │   │   ├── snomed.service.ts
│   │   │   │   │   └── uspstf.service.ts
│   │   │   │   ├── 📁 clinical-notes
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   ├── soap-generator.ts
│   │   │   │   │   └── version-control.ts
│   │   │   │   ├── 📁 compliance
│   │   │   │   │   └── access-reasons.ts
│   │   │   │   ├── 📁 consent
│   │   │   │   │   ├── consent-guard.ts
│   │   │   │   │   ├── expiration-checker.ts
│   │   │   │   │   ├── recording-consent.ts
│   │   │   │   │   ├── reminder-service.ts
│   │   │   │   │   └── version-manager.ts
│   │   │   │   ├── 📁 cron
│   │   │   │   │   ├── data-retention.ts
│   │   │   │   │   ├── monitoring.ts
│   │   │   │   │   └── scheduler.ts
│   │   │   │   ├── 📁 db
│   │   │   │   │   └── encryption-extension.ts
│   │   │   │   ├── 📁 deid
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   └── transcript-gate.ts
│   │   │   │   ├── 📁 deidentification
│   │   │   │   │   └── image-deidentifier.ts
│   │   │   │   ├── 📁 demo
│   │   │   │   │   ├── demo-data-generator.ts
│   │   │   │   │   ├── demo-patient-generator.ts
│   │   │   │   │   ├── generate-demo-documents.ts
│   │   │   │   │   └── synthetic.ts
│   │   │   │   ├── 📁 ehr
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── providers.ts
│   │   │   │   │   ├── smart-client.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── 📁 email
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   ├── deletion-emails.ts
│   │   │   │   │   ├── email-queue.ts
│   │   │   │   │   ├── email-service.ts
│   │   │   │   │   ├── example-usage.ts
│   │   │   │   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── QUICK_START.md
│   │   │   │   │   ├── README.md
│   │   │   │   │   ├── resend.ts
│   │   │   │   │   ├── sendgrid.ts
│   │   │   │   │   └── templates.ts
│   │   │   │   ├── 📁 export
│   │   │   │   │   ├── excel-export.ts
│   │   │   │   │   └── pdf-export.tsx
│   │   │   │   ├── 📁 facades
│   │   │   │   │   └── clinical-assistant.ts
│   │   │   │   ├── 📁 fhir
│   │   │   │   │   ├── aggressive-pull.ts
│   │   │   │   │   ├── patient-mapper.ts
│   │   │   │   │   ├── resource-mappers.ts
│   │   │   │   │   └── smart-client.ts
│   │   │   │   ├── 📁 forms
│   │   │   │   │   └── 📁 templates
              └── ... (truncated)
│   │   │   │   ├── 📁 governance
│   │   │   │   │   ├── auto-promoter.ts
│   │   │   │   │   ├── governance.rules.ts
│   │   │   │   │   ├── governance.service.ts
│   │   │   │   │   ├── rules-db-seed.ts
│   │   │   │   │   ├── rules-manifest.ts
│   │   │   │   │   ├── shared-types.ts
│   │   │   │   │   └── unified-engine.ts
│   │   │   │   ├── 📁 hl7
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   ├── adt-parser.ts
│   │   │   │   │   └── oru-parser.ts
│   │   │   │   ├── 📁 imaging
│   │   │   │   │   ├── cornerstone-init.ts
│   │   │   │   │   └── dicom-parser.ts
│   │   │   │   ├── 📁 integrations
│   │   │   │   │   ├── monitoring.ts
│   │   │   │   │   ├── redis-client.ts
│   │   │   │   │   └── rxnav-api.ts
│   │   │   │   ├── 📁 invoices
│   │   │   │   │   ├── cfdi-generator.ts
│   │   │   │   │   ├── pac-integration.ts
│   │   │   │   │   └── pdf-generator.tsx
│   │   │   │   ├── 📁 jobs
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   ├── appointment-scheduler.ts
│   │   │   │   │   ├── appointment-scheduler.ts.disabled
│   │   │   │   │   ├── AUDIT_ARCHIVAL_README.md
│   │   │   │   │   ├── audit-archival.ts
│   │   │   │   │   ├── correction-aggregation.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── reminder-executor.ts
│   │   │   │   ├── 📁 logging
│   │   │   │   │   └── s3-transport.ts
│   │   │   │   ├── 📁 mar
│   │   │   │   │   └── schedule-generator.ts
│   │   │   │   ├── 📁 mcp
│   │   │   │   │   ├── 📁 schemas
              └── ... (truncated)
│   │   │   │   │   ├── 📁 tools
              └── ... (truncated)
│   │   │   │   │   ├── 📁 workflows
              └── ... (truncated)
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── registry.ts
│   │   │   │   │   ├── server.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── 📁 medical
│   │   │   │   │   └── terminology.ts
│   │   │   │   ├── 📁 ml
│   │   │   │   │   └── clustering.ts
│   │   │   │   ├── 📁 monitoring
│   │   │   │   │   ├── critical-paths.ts
│   │   │   │   │   └── web-vitals.ts
│   │   │   │   ├── 📁 normalization
│   │   │   │   │   └── rxnorm-normalizer.ts
│   │   │   │   ├── 📁 notifications
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   ├── appointment-reminders.ts
│   │   │   │   │   ├── email.ts
│   │   │   │   │   ├── opt-out.ts
│   │   │   │   │   ├── reminder-policy.ts
│   │   │   │   │   ├── send-push.ts
│   │   │   │   │   ├── sms.ts
│   │   │   │   │   ├── template-renderer.ts
│   │   │   │   │   ├── unified-notification-service.ts
│   │   │   │   │   ├── web-push-client.ts
│   │   │   │   │   ├── web-push.ts
│   │   │   │   │   └── whatsapp.ts
│   │   │   │   ├── 📁 nppes
│   │   │   │   │   └── npi-verification.ts
│   │   │   │   ├── 📁 openfda
│   │   │   │   │   └── drug-interactions.ts
│   │   │   │   ├── 📁 orchestration
│   │   │   │   │   └── product-enhancement.ts
│   │   │   │   ├── 📁 patients
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   ├── dossier-queue.ts
│   │   │   │   │   ├── dossier.ts
│   │   │   │   │   ├── name.ts
│   │   │   │   │   └── risk-stratification.ts
│   │   │   │   ├── 📁 prevention
│   │   │   │   │   ├── condition-detection.ts
│   │   │   │   │   ├── international-protocols.ts
│   │   │   │   │   ├── interventions.ts
│   │   │   │   │   ├── lab-result-monitors.ts
│   │   │   │   │   ├── realtime.ts
│   │   │   │   │   └── screening-triggers.ts
│   │   │   │   ├── 📁 privacy
│   │   │   │   │   └── 📁 __tests__
              └── ... (truncated)
│   │   │   │   ├── 📁 qr
│   │   │   │   │   ├── generator.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── permission-manager.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── 📁 queue
│   │   │   │   │   ├── 📁 workers
              └── ... (truncated)
│   │   │   │   │   ├── config.ts
│   │   │   │   │   ├── queues.ts
│   │   │   │   │   ├── README.md
│   │   │   │   │   ├── scheduler.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── 📁 repositories
│   │   │   │   │   ├── document.repository.ts
│   │   │   │   │   ├── encounter.repository.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── job.repository.ts
│   │   │   │   │   └── patient.repository.ts
│   │   │   │   ├── 📁 resilience
│   │   │   │   │   ├── circuit-breaker.ts
│   │   │   │   │   └── graceful-degradation.ts
│   │   │   │   ├── 📁 risk-scores
│   │   │   │   │   ├── ascvd.ts
│   │   │   │   │   └── diabetes.ts
│   │   │   │   ├── 📁 scheduling
│   │   │   │   │   └── recurring-generator.ts
│   │   │   │   ├── 📁 schemas
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   ├── care-plan.schema.ts
│   │   │   │   │   ├── clinical-note.schema.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── medication.schema.ts
│   │   │   │   │   ├── parsed-document.schema.ts
│   │   │   │   │   ├── patient.schema.ts
│   │   │   │   │   ├── prevention-alert.schema.ts
│   │   │   │   │   └── summary-draft.schema.ts
│   │   │   │   ├── 📁 scribe
│   │   │   │   │   ├── 📁 client
              └── ... (truncated)
│   │   │   │   │   └── ai-scribe-service.ts
│   │   │   │   ├── 📁 search
│   │   │   │   │   └── meilisearch.ts
│   │   │   │   ├── 📁 secrets
│   │   │   │   │   ├── aws-secrets.ts
│   │   │   │   │   └── rotation.ts
│   │   │   │   ├── 📁 security
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   ├── audit-chain.ts
│   │   │   │   │   ├── csrf.ts
│   │   │   │   │   ├── encryption.ts
│   │   │   │   │   ├── hipaa-encryption.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── input-sanitization.ts
│   │   │   │   │   ├── sandbox-client.ts
│   │   │   │   │   ├── token-generation.ts
│   │   │   │   │   └── validation.ts
│   │   │   │   ├── 📁 services
│   │   │   │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │   │   │   │   ├── cdss.service.ts
│   │   │   │   │   ├── deid.service.ts
│   │   │   │   │   ├── document.service.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── prevention-engine.service.ts
│   │   │   │   │   ├── prevention-export.service.ts
│   │   │   │   │   ├── prevention-history.service.ts
│   │   │   │   │   ├── prevention-notification.service.ts
│   │   │   │   │   ├── prevention.service.ts
│   │   │   │   │   ├── review-queue.service.ts
│   │   │   │   │   ├── scribe.service.ts
│   │   │   │   │   ├── summary.service.ts
│   │   │   │   │   ├── sync.service.ts
│   │   │   │   │   └── transcription-correction.service.ts
│   │   │   │   ├── 📁 sms
│   │   │   │   │   └── twilio.ts
│   │   │   │   ├── 📁 socket
│   │   │   │   │   ├── client.ts
│   │   │   │   │   ├── events.ts
│   │   │   │   │   └── server.ts
│   │   │   │   ├── 📁 storage
│   │   │   │   │   ├── cloud-storage.ts
│   │   │   │   │   ├── file-storage.ts
│   │   │   │   │   └── r2-client.ts
│   │   │   │   ├── 📁 supabase
│   │   │   │   │   ├── client.ts
│   │   │   │   │   ├── middleware.ts
│   │   │   │   │   └── server.ts
│   │   │   │   ├── 📁 sync
│   │   │   │   │   ├── connectivity.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── protocol.ts
│   │   │   │   │   ├── queue.ts
│   │   │   │   │   ├── rule-updater.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── 📁 templates
│   │   │   │   │   ├── clinical-templates.ts
│   │   │   │   │   └── soap-templates.ts
│   │   │   │   ├── 📁 traffic-light
│   │   │   │   │   ├── 📁 rules
              └── ... (truncated)
│   │   │   │   │   ├── engine.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── 📁 transcription
│   │   │   │   │   ├── deepgram.ts
│   │   │   │   │   ├── MedicalAudioStreamer.ts
│   │   │   │   │   └── patient-state-extractor.ts
│   │   │   │   ├── 📁 utils
│   │   │   │   │   └── browser-detection.ts
│   │   │   │   ├── 📁 validation
│   │   │   │   │   └── schemas.ts
│   │   │   │   ├── 📁 validations
│   │   │   │   │   └── invitation.ts
│   │   │   │   ├── 📁 voice
│   │   │   │   │   └── soapEditorCommands.ts
│   │   │   │   ├── audit.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── csrf.ts
│   │   │   │   ├── email.ts
│   │   │   │   ├── encryption.ts
│   │   │   │   ├── env.ts
│   │   │   │   ├── feature-flags.ts
│   │   │   │   ├── featureFlags.ts
│   │   │   │   ├── hash.ts
│   │   │   │   ├── logger.server.ts
│   │   │   │   ├── logger.ts
│   │   │   │   ├── medical-license-verification.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   ├── offline-queue.ts
│   │   │   │   ├── posthog.ts
│   │   │   │   ├── presidio.ts
│   │   │   │   ├── prisma-replica.ts
│   │   │   │   ├── prisma.ts
│   │   │   │   ├── push-notifications.ts
│   │   │   │   ├── rate-limit.ts
│   │   │   │   ├── referral.ts
│   │   │   │   ├── request-id.ts
│   │   │   │   ├── search.ts
│   │   │   │   ├── security-headers.ts
│   │   │   │   ├── sms.ts
│   │   │   │   ├── socket-auth.ts
│   │   │   │   ├── socket-server.ts
│   │   │   │   ├── storage.ts
│   │   │   │   ├── translations.ts
│   │   │   │   ├── utils.ts
│   │   │   │   ├── validation.ts
│   │   │   │   └── workspace.ts
│   │   │   ├── 📁 prompts
│   │   │   │   ├── 📁 cdss-rules
│   │   │   │   │   ├── clinical-rules.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── rule-loader.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── 📁 clinical-engines
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── medication-adherence.prompt.ts
│   │   │   │   │   ├── symptom-diagnosis.prompt.ts
│   │   │   │   │   ├── treatment-protocol.prompt.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── 📁 traffic-light-rules
│   │   │   │   │   ├── administrative-rules.ts
│   │   │   │   │   ├── billing-rules.ts
│   │   │   │   │   ├── clinical-rules.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── rule-loader.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── auditor.prompt.ts
│   │   │   │   ├── clinical-diagnosis.prompt.ts
│   │   │   │   ├── clinical-treatment.prompt.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── traffic-light.prompt.ts
│   │   │   ├── 📁 providers
│   │   │   │   └── ThemeProvider.tsx
│   │   │   ├── 📁 scripts
│   │   │   │   └── theme-init.ts
│   │   │   ├── 📁 services
│   │   │   │   ├── 📁 auditor
│   │   │   │   │   ├── auditor.service.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── 📁 llm
│   │   │   │   │   └── openai-auditor.adapter.ts
│   │   │   │   ├── action-rate.service.ts
│   │   │   │   ├── adversarial-auditor.service.ts
│   │   │   │   ├── anonymizer.service.ts
│   │   │   │   ├── assurance-capture.service.ts
│   │   │   │   ├── rule-promotion.service.ts
│   │   │   │   └── tiss-reconciliation.service.ts
│   │   │   ├── 📁 styles
│   │   │   │   ├── contrast-utils.ts
│   │   │   │   ├── design-tokens.ts
│   │   │   │   ├── mobile.css
│   │   │   │   ├── print.css
│   │   │   │   └── theme.ts
│   │   │   ├── 📁 tests
│   │   │   │   ├── 📁 governance
│   │   │   │   │   └── auditor.test.ts
│   │   │   │   ├── 📁 infrastructure
│   │   │   │   │   └── anonymizer.test.ts
│   │   │   │   └── 📁 integration
│   │   │   │       └── auditor-live.test.ts
│   │   │   ├── 📁 types
│   │   │   │   ├── dcmjs.d.ts
│   │   │   │   ├── lucide-react.d.ts
│   │   │   │   ├── ml-kmeans.d.ts
│   │   │   │   ├── next-auth.d.ts
│   │   │   │   ├── next-link.d.ts
│   │   │   │   ├── react-pdf.d.ts
│   │   │   │   └── simple-hl7.d.ts
│   │   │   ├── i18n.ts
│   │   │   ├── instrumentation.ts
│   │   │   └── middleware.ts
│   │   ├── 📁 tests
│   │   │   ├── 📁 e2e
│   │   │   │   ├── accessibility-fixes.spec.ts
│   │   │   │   ├── appointment-scheduling.spec.ts
│   │   │   │   ├── critical-flows.spec.ts
│   │   │   │   ├── patient-portal.spec.ts
│   │   │   │   ├── prescription-safety.spec.ts
│   │   │   │   └── soap-note-generation.spec.ts
│   │   │   ├── 📁 load
│   │   │   │   ├── cdss-load-test.js
│   │   │   │   ├── README.md
│   │   │   │   └── run-load-test.sh
│   │   │   ├── 📁 reminders
│   │   │   │   └── reminder-policy.lifecycle.test.ts
│   │   │   ├── 📁 results
│   │   │   │   ├── 📁 accessibility-fixes-Access-8db76-anding-Page---Public-Access-chromium
│   │   │   │   │   ├── error-context.md
│   │   │   │   │   ├── test-failed-1.png
│   │   │   │   │   ├── video-1.webm
│   │   │   │   │   └── video.webm
│   │   │   │   └── .last-run.json
│   │   │   ├── governance-event-contract.test.ts
│   │   │   ├── README.md
│   │   │   ├── smoke.spec.d.ts
│   │   │   ├── smoke.spec.d.ts.map
│   │   │   ├── smoke.spec.js
│   │   │   ├── smoke.spec.js.map
│   │   │   └── smoke.spec.ts
│   │   ├── .browserslistrc
│   │   ├── .dockerignore
│   │   ├── .DS_Store
│   │   ├── .env
│   │   ├── .env.example
│   │   ├── .env.local
│   │   ├── .env.local.backup
│   │   ├── .env.local.example
│   │   ├── .env.production.example
│   │   ├── .env.production.template
│   │   ├── .env.production.template.bak
│   │   ├── .env.test
│   │   ├── .eslintrc.json
│   │   ├── .gitignore
│   │   ├── ACCESSIBILITY_TESTING_GUIDE.md
│   │   ├── AGENDA_SETUP_GUIDE.md
│   │   ├── AGENT_1_COMPLETION_REPORT.md
│   │   ├── AGENT_1_SUMMARY.md
│   │   ├── AGENT_10_BATCH_10A_DARK_MODE_FIX_REPORT.md
│   │   ├── AGENT_10_BATCH_10B_DARK_MODE_FIX_REPORT.md
│   │   ├── AGENT_10_BATCH_10C_FINAL_DARK_MODE_FIX_REPORT.md
│   │   ├── AGENT_10_BATCH_10D_FINAL_FIX_REPORT.md
│   │   ├── AGENT_10_BATCH_2_QUICK_SUMMARY.md
│   │   ├── AGENT_10_BATCH_4_QUICK_SUMMARY.md
│   │   ├── AGENT_10_BATCH_9_INDEX.md
│   │   ├── AGENT_10_BATCH_9_QUICK_SUMMARY.md
│   │   ├── AGENT_10_COMPLETE_SUMMARY.md
│   │   ├── AGENT_10_COMPONENTS_BATCH_1_REPORT.md
│   │   ├── AGENT_10_COMPONENTS_BATCH_2_REPORT.md
│   │   ├── AGENT_10_COMPONENTS_BATCH_3_REPORT.md
│   │   ├── AGENT_10_COMPONENTS_BATCH_4_FINAL_REPORT.md
│   │   ├── AGENT_10_COMPONENTS_BATCH_5_REPORT.md
│   │   ├── AGENT_10_COMPONENTS_BATCH_6_REPORT.md
│   │   ├── AGENT_10_COMPONENTS_BATCH_7_REPORT.md
│   │   ├── AGENT_10_COMPONENTS_BATCH_8_REPORT.md
│   │   ├── AGENT_10_COMPONENTS_BATCH_9_FINAL_REPORT.md
│   │   ├── AGENT_10_CRITICAL_DISCOVERY_DARK_MODE_GAP.md
│   │   ├── AGENT_10_OVERALL_PROGRESS.md
│   │   ├── AGENT_13_COMPLETION_REPORT.md
│   │   ├── AGENT_13_FILE_INVENTORY.md
│   │   ├── AGENT_14_COMPLETION_REPORT.md
│   │   ├── AGENT_15_COMPLETION_REPORT.md
│   │   ├── AGENT_19_COMPLETION_REPORT.md
│   │   ├── AGENT_19_FINAL_VALIDATION_SUMMARY.md
│   │   ├── AGENT_20_CDSS_PERFORMANCE_AUDIT.md
│   │   ├── AGENT_20_COMPLETION_SUMMARY.md
│   │   ├── AGENT_21_FINAL_SUMMARY.md
│   │   ├── AGENT_21_MONITORING_SETUP_COMPLETE.md
│   │   ├── AGENT_27_COMPLETION_SUMMARY.md
│   │   ├── AGENT_28_MOBILE_AUDIT_COMPLETE.md
│   │   ├── AGENT_29_CROSS_BROWSER_COMPATIBILITY.md
│   │   ├── AGENT_3_COMPLETION_REPORT.md
│   │   ├── AGENT_5_SECURITY_HARDENING_COMPLETE.md
│   │   ├── AGENT_7_DARK_MODE_IMPLEMENTATION.md
│   │   ├── AGENT10_BATCH_1_COMPLETION.md
│   │   ├── AGENT10_BATCH_2_COMPLETION.md
│   │   ├── AGENT10_BATCH_3_COMPLETION.md
│   │   ├── AGENT10_CLINICAL_BATCH_SUMMARY.md
│   │   ├── AGENT10_SUMMARY.md
│   │   ├── AGENT11_THEME_CONSOLIDATION_COMPLETE.md
│   │   ├── AGENT16_ADDITIONAL_SCHEMA_ISSUES.md
│   │   ├── AGENT16_EXECUTIVE_SUMMARY.md
│   │   ├── AGENT16_FILES_AFFECTED.md
│   │   ├── AGENT16_INDEX.md
│   │   ├── AGENT16_PRISMA_SCHEMA_FIX_REPORT.md
│   │   ├── AGENT17_IMPLEMENTATION_SUMMARY.md
│   │   ├── AGENT17_MIGRATION_GUIDE.md
│   │   ├── AGENT17_MISSING_MODELS_IMPLEMENTATION.md
│   │   ├── AGENT2_COMPLETION_REPORT.md
│   │   ├── AGENT2_FINAL_REPORT.md
│   │   ├── AGENT22_BACKUP_DR_IMPLEMENTATION.md
│   │   ├── AGENT23_SESSION_SECURITY_COMPLETE.md
│   │   ├── AGENT4_COMPLETION_SUMMARY.md
│   │   ├── AGENT9_BATCH_1_COMPLETION.md
│   │   ├── AGENT9_FILE_INVENTORY.md
│   │   ├── AGENT9_QUICK_GUIDE.md
│   │   ├── AGENT9_SUMMARY.md
│   │   ├── AGENTS_9_10_12_COMPLETION_REPORT.md
│   │   ├── API_COST_ANALYSIS_2025.md
│   │   ├── AUTHENTICATION_BEFORE_AFTER.md
│   │   ├── AUTHENTICATION_QUICK_REFERENCE.md
│   │   ├── BATCH_10B_FILES_MODIFIED.txt
│   │   ├── BATCH_2_LOGGING_MIGRATION_REPORT.md
│   │   ├── BATCH_4_COMPLETION_REPORT.md
│   │   ├── BATCH_5_COMPLETION_REPORT.md
│   │   ├── BATCH_6A_COMPLETION_REPORT.md
│   │   ├── batch-logger-update.sh
│   │   ├── BROWSER_COMPATIBILITY_QUICKSTART.md
│   │   ├── BROWSER_COMPATIBILITY_TEST_MATRIX.md
│   │   ├── BROWSER_SPECIFIC_FIXES.md
│   │   ├── BULK_EXPORT_GUIDE.md
│   │   ├── CDSS_PERFORMANCE_COMPLETE.md
│   │   ├── CDSS_PERFORMANCE_QUICK_REFERENCE.md
│   │   ├── CDSS_PERFORMANCE_QUICKSTART.md
│   │   ├── COMMAND_CENTER_ADDITIONAL_POLISH.md
│   │   ├── COMMAND_CENTER_ENHANCEMENT_PHASE_2.md
│   │   ├── COMMAND_CENTER_FINAL_POLISH.md
│   │   ├── COMMAND_CENTER_INTEGRATION_COMPLETE.md
│   │   ├── COMMAND_CENTER_PHASE_3A_INTEGRATION.md
│   │   ├── COMMAND_CENTER_PHASE_3B_POLISH.md
│   │   ├── COMMAND_CENTER_README.md
│   │   ├── COMMAND_CENTER_UI_POLISH.md
│   │   ├── COMMUNICATIONS_SETUP.md
│   │   ├── COMPETITIVE_FEATURES_COMPLETE.md
│   │   ├── CONNECTION_POOLING.md
│   │   ├── CONTRAST_FIX_BATCH2_REPORT.md
│   │   ├── CONTRAST_FIX_QUICK_GUIDE.md
│   │   ├── CRON_JOBS_QUICK_REFERENCE.md
│   │   ├── CRON_SECURITY_SUMMARY.md
│   │   ├── DARK_MODE_FIX_QUICK_GUIDE.md
│   │   ├── DARK_MODE_QUICK_REFERENCE.md
│   │   ├── DARK_MODE_VARIABLES.md
│   │   ├── DASHBOARD_FIXES_COMPLETION_REPORT.md
│   │   ├── DATABASE_INDEXES.md
│   │   ├── DATABASE_SETUP.md
│   │   ├── DEEPGRAM_INTEGRATION_COMPLETE.md
│   │   ├── DEMO_ACCOUNTS.md
│   │   ├── DEPLOYMENT_CHECKLIST.md
│   │   ├── DEPLOYMENT_READY.md
│   │   ├── Dockerfile
│   │   ├── Dockerfile.prod
│   │   ├── ENV_VALIDATION_QUICK_REFERENCE.md
│   │   ├── ENV_VALIDATION.md
│   │   ├── environment-audit-report.json
│   │   ├── ERROR_HANDLING_AUDIT_REPORT.md
│   │   ├── ERROR_HANDLING_QUICK_GUIDE.md
│   │   ├── FINAL_POLISH_SESSION_COMPLETE.md
│   │   ├── GIT_SECRETS_SETUP.md
│   │   ├── HIPAA_COMPLIANCE_AUDIT_REPORT.md
│   │   ├── HIPAA_COMPLIANCE_CHECKLIST.md
│   │   ├── HIPAA_COMPLIANCE_QUICK_REFERENCE.md
│   │   ├── HIPAA_EXECUTIVE_SUMMARY.md
│   │   ├── HIPAA_REMEDIATION_TRACKER.md
│   │   ├── I18N-SETUP.md
│   │   ├── i18n.d.ts
│   │   ├── i18n.d.ts.map
│   │   ├── i18n.js
│   │   ├── i18n.js.disabled
│   │   ├── i18n.js.map
│   │   ├── i18n.ts.disabled
│   │   ├── IMPLEMENTATION_STATUS.md
│   │   ├── INSTALLATION_REQUIRED.md
│   │   ├── instrumentation.d.ts
│   │   ├── instrumentation.d.ts.map
│   │   ├── instrumentation.js
│   │   ├── instrumentation.js.map
│   │   ├── INTERNATIONAL_PREVENTION_PROTOCOLS.md
│   │   ├── INVITATION_QUICK_START.md
│   │   ├── INVITATION_SYSTEM_IMPLEMENTATION.md
│   │   ├── jest.config.js
│   │   ├── jest.sequencer.cjs
│   │   ├── jest.setup.js
│   │   ├── LAB_REFERENCE_RANGES_QUICK_START.md
│   │   ├── LAB_REFERENCE_RANGES_SUMMARY.md
│   │   ├── LAB_REFERENCE_RANGES_VALIDATION_REPORT.md
│   │   ├── LEGAL_DOCUMENTS_IMPLEMENTATION.md
│   │   ├── LOGGING_MIGRATION_QUICK_GUIDE.md
│   │   ├── LOGGING.md
│   │   ├── MARKETING_BRIEF_FOR_LLM.md
│   │   ├── MASTER_PLAN_COMPLETE.md
│   │   ├── MASTER_POLISH_COMPLETE.md
│   │   ├── MEDICAL_LICENSE_VERIFICATION.md
│   │   ├── middleware.ts
│   │   ├── MIGRATION-AI-USAGE.sql
│   │   ├── MOBILE_IMPLEMENTATION_ROADMAP.md
│   │   ├── MOBILE_QUICK_REFERENCE.md
│   │   ├── MOBILE_RESPONSIVENESS_AUDIT.md
│   │   ├── MOBILE_TESTING_CHECKLIST.md
│   │   ├── MONITORING_QUICKSTART.md
│   │   ├── next-env.d.ts
│   │   ├── next.config.js
│   │   ├── NOTIFICATION_SYSTEM.md
│   │   ├── P0_FIXES_COMPLETED.md
│   │   ├── package.json
│   │   ├── PHASE_1_DEPLOYMENT_SUMMARY.md
│   │   ├── PHASE_1_MVP_COMPLETE.md
│   │   ├── PHASE_2_WHATSAPP_COMPLETE.md
│   │   ├── PHASE_6_DEPLOYMENT_SUMMARY.md
│   │   ├── PHASE_6_DOCUMENTATION.md
│   │   ├── PHASE_6_QUICKSTART.md
│   │   ├── PHASE_6_README.md
│   │   ├── PHASE_7_COMPLETE_DOCUMENTATION.md
│   │   ├── PHASE_7_FEATURE_1_SUMMARY.md
│   │   ├── PHASE_7_PLAN.md
│   │   ├── playwright.config.ts
│   │   ├── postcss.config.js
│   │   ├── PREVENTION_GOAL_TRACKING_GUIDE.md
│   │   ├── PREVENTION_HUB_COMPLETE.md
│   │   ├── PREVENTION_HUB_DEMO.md
│   │   ├── PREVENTION_HUB_FINAL_UPDATE.md
│   │   ├── PREVENTION_HUB_SUMMARY.md
│   │   ├── PREVENTION_HUB_TESTING.md
│   │   ├── PREVENTION_PHASE1_COMPLETE.md
│   │   ├── PREVENTION_PHASE2_COMPLETE.md
│   │   ├── PREVENTION_PHASE3_ADVANCED_FEATURES.md
│   │   ├── PREVENTION_PHASE4_COLLABORATION_FEATURES.md
│   │   ├── PREVENTION_PHASE5_ANALYTICS_REPORTING.md
│   │   ├── PREVENTION_PLANS_HISTORY_GUIDE.md
│   │   ├── PREVENTION_PLANS.md
│   │   ├── PREVENTION_STATUS_MANAGEMENT_GUIDE.md
│   │   ├── PRISMA_QUICK_REFERENCE.md
│   │   ├── PRISMA_TROUBLESHOOTING_GUIDE.md
│   │   ├── PRODUCTION_DEPLOYMENT_CHECKLIST.md
│   │   ├── PROJECT_COMPLETION_SUMMARY.md
│   │   ├── PROTOCOL_PERSISTENCE_GUIDE.md
│   │   ├── RATE_LIMITING_RESTORED.md
│   │   ├── README_MOBILE_AUDIT.md
│   │   ├── RED_TEAM_ANALYSIS.md
│   │   ├── REDIS_RATE_LIMITING.md
│   │   ├── RXNAV_INTEGRATION.md
│   │   ├── RXNAV_QUICKSTART.md
│   │   ├── SCREEN_READER_TESTING_GUIDE.md
│   │   ├── SECURITY_AUDIT_HARDCODED_SECRETS.md
│   │   ├── SECURITY_AUDIT_SUMMARY.md
│   │   ├── SECURITY_HARDENING_COMPLETE.md
│   │   ├── SECURITY_QUICK_REFERENCE.md
│   │   ├── SECURITY_RED_TEAM_ANALYSIS.md
│   │   ├── sentry.edge.config.d.ts
│   │   ├── sentry.edge.config.d.ts.map
│   │   ├── sentry.edge.config.js
│   │   ├── sentry.edge.config.ts
│   │   ├── sentry.server.config.d.ts
│   │   ├── sentry.server.config.d.ts.map
│   │   ├── sentry.server.config.js
│   │   ├── sentry.server.config.ts
│   │   ├── server.js
│   │   ├── SESSION_ADDITIONAL_POLISH_COMPLETE.md
│   │   ├── SESSION_MASTER_PLAN_COMPLETE.md
│   │   ├── SESSION_PHASE_3_COMPLETE.md
│   │   ├── SESSION_SECURITY_QUICK_REFERENCE.md
│   │   ├── SESSION_SUMMARY_PHASE4.md
│   │   ├── SESSION_SUMMARY_PHASE5.md
│   │   ├── SESSION_SUMMARY_PHASE6.md
│   │   ├── SESSION_SUMMARY.md
│   │   ├── setup-agenda.sh
│   │   ├── tailwind.config.d.ts
│   │   ├── tailwind.config.d.ts.map
│   │   ├── tailwind.config.js
│   │   ├── tailwind.config.js.map
│   │   ├── tailwind.config.ts
│   │   ├── TASK_1_VERIFICATION.md
│   │   ├── TASK_2_COMPLETE.md
│   │   ├── test-ai-setup.d.ts
│   │   ├── test-ai-setup.d.ts.map
│   │   ├── test-ai-setup.js
│   │   ├── test-ai-setup.js.map
│   │   ├── test-ai-setup.ts
│   │   ├── TESTING_VERIFICATION_COMPLETE.md
│   │   ├── THEME_ARCHITECTURE_DIAGRAM.md
│   │   ├── THEME_QUICK_START.md
│   │   ├── THEME_SYSTEM_DOCUMENTATION.md
│   │   ├── TRANSLATION_ARCHITECTURE.md
│   │   ├── TRANSLATION_MANAGEMENT.md
│   │   ├── tsconfig.json
│   │   ├── vercel.json
│   │   ├── WHATSAPP_SETUP_GUIDE.md
│   │   └── WHITE_ON_WHITE_FIX_REPORT.md
│   └── .DS_Store
├── 📁 COMPLIANCE
│   └── DPIA-template.md
├── 📁 configs
│   ├── cortex-doc-automation.config.json
│   ├── cortex-doc-automation.core.config.json
│   ├── cortex-doc-automation.examples.config.json
│   ├── cortex-doc-automation.tracker-only.config.json
│   ├── policy-ar.yaml
│   ├── policy-br.yaml
│   ├── policy-mx.yaml
│   └── precision-budgets.json
├── 📁 data
│   └── 📁 clinical
│       ├── 📁 bundles
│       │   ├── .gitkeep
│       │   └── latest.json
│       └── 📁 sources
│           ├── contraindications-v1.json
│           ├── dosing-v1.json
│           └── interactions-v1.json
├── 📁 demos
│   ├── 📁 sample-fhir-bundles
│   │   └── external-ehr-lab-results.json
│   ├── fhir-e2e-demo.sh
│   ├── README.md
│   ├── RECORDING_GUIDE.md
│   └── smoke-tests.sh
├── 📁 docker
│   └── init-db.sql
├── 📁 docs
│   ├── 📁 adr
│   ├── 📁 agent-runs
│   │   └── 📁 demo-week
│   │       ├── agent5-final.md
│   │       ├── agent6-final.md
│   │       └── DEMO_DAY_CHECKLIST.md
│   ├── 📁 clinical
│   ├── 📁 deployment
│   │   └── blue-green-deployment.md
│   ├── 📁 disaster-recovery
│   │   ├── disaster-recovery-plan.md
│   │   └── test-results.md
│   ├── 📁 financial
│   ├── 📁 legal
│   ├── 📁 monitoring
│   │   ├── apm-setup.md
│   │   ├── business-metrics-dashboard.md
│   │   └── synthetic-monitoring.md
│   ├── 📁 performance
│   │   ├── database-read-replicas.md
│   │   └── load-testing-guide.md
│   ├── 📁 product
│   ├── 📁 runbooks
│   │   ├── API_SERVER_DOWN.md
│   │   ├── api-server-down.md
│   │   ├── audit-log-review.md
│   │   ├── backup-restoration.md
│   │   ├── DATA_BREACH_RESPONSE.md
│   │   ├── DATABASE_FAILURE.md
│   │   ├── database-connection-failure.md
│   │   ├── deployment-rollback.md
│   │   ├── DISASTER_RECOVERY_PLAN.md
│   │   ├── email-delivery-failure.md
│   │   ├── HIPAA_AUDIT_LOG_FAILURE.md
│   │   ├── hipaa-breach-notification.md
│   │   ├── key-rotation.md
│   │   ├── performance-degradation.md
│   │   ├── REDIS_FAILURE.md
│   │   ├── SECURITY_INCIDENT.md
│   │   └── security-incident-response.md
│   ├── 📁 security
│   │   └── security-audit-guide.md
│   ├── 📁 strategy
│   ├── AGENT_HANDOFF_CONTRACT.md
│   ├── ANTIGRAVITY_HANDOFF.md
│   ├── API_REFERENCE.md
│   ├── api-spec.yaml
│   ├── Asclepius-Protocol-V1.0.txt
│   ├── AUDIT_LOGGING_VERIFICATION.md
│   ├── BAA_VENDOR_OUTREACH_PLAN.md
│   ├── BEMI_AUDIT_SETUP.md
│   ├── BEMI_POSTGRESQL_SETUP.md
│   ├── CALENDAR_SYNC_SETUP.md
│   ├── CASBIN_RBAC_GUIDE.md
│   ├── CI-CD-SETUP.md
│   ├── CLINICAL_CONTENT_GOVERNANCE_V1.md
│   ├── CLINICAL_RULE_CHANGE_LOG_TEMPLATE.md
│   ├── CLINICAL_SIGNOFF_TEMPLATE.md
│   ├── CLINICAL_WORKFLOW_VERIFICATION.md
│   ├── CORTEX_BOARD_EXPORT_LAYOUT.md
│   ├── CORTEX_DELIVERY_BACKLOG_V1.md
│   ├── CORTEX_DEMO_WEEK_AGENT_LOCKMAP.md
│   ├── CORTEX_DEMO_WEEK_FINAL_RUNBOOK.md
│   ├── CORTEX_DOC_AUTOMATION_SETUP.md
│   ├── CORTEX_LATAM_EXECUTION_ROADMAP_2026.md
│   ├── CORTEX_MULTI_SITE_BOARD_AGGREGATION_TEMPLATE.csv
│   ├── CORTEX_PILOT_TRACKER_TEMPLATE.md
│   ├── CORTEX_PRODUCT_REQUIREMENTS_DOC_V1.md
│   ├── CORTEX_ROADMAP_STATUS_TRACKER.md
│   ├── CORTEX_SHEETS_ROLLUP_GUIDE.md
│   ├── CORTEX_WEEK1_BOARD_SCORECARD_EXAMPLE_BOLIVIA.md
│   ├── CORTEX_WEEK1_PILOT_TRACKER_EXAMPLE_BOLIVIA_SITE_A.md
│   ├── CORTEX_WEEK1_PILOT_TRACKER_EXAMPLE_BRAZIL_SITE_A.md
│   ├── CORTEX_WEEKLY_BOARD_SCORECARD_TEMPLATE.md
│   ├── DATABASE_TUNING.md
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── DEPLOYMENT-README.md
│   ├── DEPLOYMENT-VPS.md
│   ├── DEV_SETUP.md
│   ├── FHIR_PRIVACY_DESIGN.md
│   ├── HIPAA_COMPLIANCE_CHECKLIST.md
│   ├── HIPAA_FHIR_COMPLIANCE.md
│   ├── HIPAA_RISK_ASSESSMENT.md
│   ├── INCIDENT_RESPONSE_PLAN.md
│   ├── LOG_RETENTION_POLICY.md
│   ├── MEDPLUM_INTEGRATION.md
│   ├── ON_CALL_GUIDE.md
│   ├── OPEN_SOURCE_ACCELERATION_TOOLS.md
│   ├── OPS_MANUAL.md
│   ├── PHI_HANDLING.md
│   ├── PRODUCT_ROADMAP.md
│   ├── PRODUCTION_READINESS_STATUS.md
│   ├── RATE_LIMITING.md
│   ├── SECURITY_GUIDELINES.md
│   ├── SECURITY_HEADERS_GUIDE.md
│   ├── SECURITY_HEADERS.md
│   ├── SESSION_REVOCATION_GUIDE.md
│   ├── SYNTHEA_DEMO_DATA.md
│   ├── TEST_COVERAGE_PLAN.md
│   ├── TESTING_QUICK_START.md
│   ├── TESTING_TROUBLESHOOTING.md
│   ├── TOOL_REGISTRY.md
│   ├── TRANSPARENT_ENCRYPTION_GUIDE.md
│   ├── TYPESCRIPT_ERRORS_REMAINING.md
│   ├── WAL_ARCHIVING_PITR.md
│   ├── WHATS_LEFT_MASTER_PLAN.md
│   └── WORKFORCE_TRAINING_PLAN.md
├── 📁 Here is the 10
│   └── 📁 10 Regulatory Guardian persona.  I have renamed her Ruth. She is no longer just a "Compliance Officer"; she is your "Iron Dome" against existential risk. She connects the dots between Brazilian Law (LGPD
│       └── 📁 ANVISA), US Expansion (HIPAA
│           └── 📁 FDA), and the technical architecture.  File Path: .cursor
│               └── 📁 rules
│                   └── CLO_RUTH.md
├── 📁 Images to use for dashboard
│   ├── artificial-intelligence (1).svg
│   ├── artificial-intelligence.svg
│   ├── calendar (1).svg
│   ├── calendar.svg
│   ├── chart-cured-increasing (1).svg
│   ├── chart-cured-increasing.svg
│   ├── clinical-f (1).svg
│   ├── clinical-f.svg
│   ├── communication (1).svg
│   ├── communication.svg
│   ├── crisis-response_center_person.svg
│   ├── diagnostics (1).svg
│   ├── diagnostics.svg
│   ├── doctor (1).svg
│   ├── doctor-female (1).svg
│   ├── doctor-female.svg
│   ├── doctor-male (1).svg
│   ├── doctor-male.svg
│   ├── doctor.svg
│   ├── forum (1).svg
│   ├── forum.svg
│   ├── head (1).svg
│   ├── head.svg
│   ├── health (1).svg
│   ├── health (2).svg
│   ├── health (3).svg
│   ├── health-alt (1).svg
│   ├── health-alt.svg
│   ├── health-worker_form (1).svg
│   ├── health-worker_form.svg
│   ├── health.svg
│   ├── i-note_action (1).svg
│   ├── i-note_action.svg
│   ├── malnutrition (1).svg
│   ├── malnutrition.svg
│   ├── people (1).svg
│   ├── people.svg
│   ├── rx (1).svg
│   ├── rx.svg
│   ├── Sleek_DNA_Strand_H_Video_Generation.mp4
│   ├── speech-language_therapy (1).svg
│   ├── speech-language_therapy.svg
│   ├── stethoscope (1).svg
│   ├── stethoscope.svg
│   ├── telemedicine (1).svg
│   └── telemedicine.svg
├── 📁 infra
│   ├── 📁 deploy
│   │   ├── deploy-production.sh
│   │   ├── DEPLOYMENT_RUNBOOK.md
│   │   └── README.md
│   ├── 📁 docker
│   │   ├── docker-compose.dev.yml
│   │   └── docker-compose.yml
│   ├── 📁 migrations
│   │   └── 001_init_rls_and_audit.sql
│   ├── 📁 monitoring
│   │   ├── 📁 alerts
│   │   │   └── fhir-alerts.yml
│   │   ├── alertmanager.yml
│   │   ├── docker-compose.monitoring.yml
│   │   ├── grafana-dashboard-config.yml
│   │   ├── grafana-dashboard.json
│   │   ├── grafana-datasources.yml
│   │   ├── pagerduty-alerts.yaml
│   │   ├── prometheus.yml
│   │   └── README.md
│   └── .DS_Store
├── 📁 k6
│   ├── 📁 scenarios
│   │   ├── 01-login-surge.js
│   │   ├── 02-appointment-booking-peak.js
│   │   ├── 03-soap-note-generation.js
│   │   ├── 04-patient-portal-traffic.js
│   │   └── 05-api-stress-test.js
│   ├── .env.test.example
│   ├── config.json
│   ├── README.md
│   └── run-tests.sh
├── 📁 learning-content
│   ├── transcript_interactive_quiz.html
│   ├── transcript_learning_content.json
│   └── transcript_study_guide.md
├── 📁 legal
│   ├── BAA_TEMPLATE.md
│   ├── DPA_TEMPLATE.md
│   └── VENDOR_BAA_CHECKLIST.md
├── 📁 logs
├── 📁 Marketing
│   ├── 📁 Assets
│   │   ├── Gemini_Generated_Image_mccwy6mccwy6mccw.jpeg
│   │   ├── Gemini_Generated_Image_umwja9umwja9umwj (1).jpeg
│   │   ├── Gemini_Generated_Image_umwja9umwja9umwj.jpeg
│   │   ├── lab test demo .webp
│   │   ├── Landing Page Image 1.jpeg
│   │   ├── Landing Page Template.jpeg
│   │   ├── Logo + Color Palette_Holi Labs (4).png
│   │   ├── Logo 1_Dark (1).svg
│   │   ├── Logo 1_Dark.png
│   │   ├── Logo 1_Dark.svg
│   │   ├── Logo 1_Light (1).png
│   │   ├── Logo 1_Light.svg
│   │   ├── Mockup-of-a-consultation-note.png
│   │   └── Template-for-Discharge-Summary.ppm
│   ├── .DS_Store
│   └── Landing page holilabsv2.jpeg
├── 📁 monitoring
│   └── alert-config.yml
├── 📁 nginx
│   ├── 📁 ssl
│   │   ├── .gitignore
│   │   └── README.md
│   ├── .DS_Store
│   └── nginx.conf
├── 📁 p0-bug-fixes
│   ├── 📁 .claude
│   │   └── memory.md
│   ├── 📁 .github
│   │   ├── 📁 workflows
│   │   │   ├── cdss-performance-test.yml
│   │   │   ├── ci-cd.yml
│   │   │   ├── ci.yml
│   │   │   ├── coverage-report.yml
│   │   │   ├── dast-scan.yml
│   │   │   ├── database-backup.yml
│   │   │   ├── deploy-production.yml
│   │   │   ├── deploy-staging.yml
│   │   │   ├── deploy-vps.yml
│   │   │   ├── deploy.yml
│   │   │   ├── disaster-recovery-test.yml
│   │   │   ├── health-check.yml
│   │   │   ├── load-testing.yml
│   │   │   ├── pr-checks.yml
│   │   │   ├── security-enhanced.yml
│   │   │   ├── sign-and-verify-images.yml
│   │   │   └── test.yml
│   │   ├── dependabot.yml
│   │   └── PULL_REQUEST_TEMPLATE_SECURITY.md
│   ├── 📁 .husky
│   │   └── pre-commit
│   ├── 📁 .zap
│   │   └── rules.tsv
│   ├── 📁 apps
│   │   ├── 📁 api
│   │   │   ├── 📁 prisma
│   │   │   │   ├── 📁 migrations
│   │   │   │   │   ├── 📁 20251004060226_init
              └── ... (truncated)
│   │   │   │   │   └── migration_lock.toml
│   │   │   │   ├── schema.prisma
│   │   │   │   └── seed.ts
│   │   │   ├── 📁 scripts
│   │   │   │   ├── check-env.sh
│   │   │   │   └── healthcheck.sh
│   │   │   ├── 📁 src
│   │   │   │   ├── 📁 lib
│   │   │   │   │   ├── env-validation.ts
│   │   │   │   │   └── prisma-fhir-middleware.ts
│   │   │   │   ├── 📁 plugins
│   │   │   │   │   └── metrics-middleware.ts
│   │   │   │   ├── 📁 routes
│   │   │   │   │   ├── admin.d.ts
│   │   │   │   │   ├── admin.d.ts.map
│   │   │   │   │   ├── admin.js
│   │   │   │   │   ├── admin.js.map
│   │   │   │   │   ├── admin.ts
│   │   │   │   │   ├── ai.d.ts
│   │   │   │   │   ├── ai.d.ts.map
│   │   │   │   │   ├── ai.js
│   │   │   │   │   ├── ai.js.map
│   │   │   │   │   ├── ai.ts
│   │   │   │   │   ├── auth.d.ts
│   │   │   │   │   ├── auth.d.ts.map
│   │   │   │   │   ├── auth.js
│   │   │   │   │   ├── auth.js.map
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── exports.d.ts
│   │   │   │   │   ├── exports.d.ts.map
│   │   │   │   │   ├── exports.js
│   │   │   │   │   ├── exports.js.map
│   │   │   │   │   ├── exports.ts
│   │   │   │   │   ├── fhir-admin.ts
│   │   │   │   │   ├── fhir-export.ts
│   │   │   │   │   ├── fhir-ingress.ts
│   │   │   │   │   ├── monitoring.ts
│   │   │   │   │   ├── patients.d.ts
│   │   │   │   │   ├── patients.d.ts.map
│   │   │   │   │   ├── patients.js
│   │   │   │   │   ├── patients.js.map
│   │   │   │   │   ├── patients.ts
│   │   │   │   │   ├── upload.d.ts
│   │   │   │   │   ├── upload.d.ts.map
│   │   │   │   │   ├── upload.js
│   │   │   │   │   ├── upload.js.map
│   │   │   │   │   └── upload.ts
│   │   │   │   ├── 📁 services
│   │   │   │   │   ├── 📁 monitoring
              └── ... (truncated)
│   │   │   │   │   ├── fhir-audit-mirror.ts
│   │   │   │   │   ├── fhir-queue.ts
│   │   │   │   │   ├── fhir-reconciliation.ts
│   │   │   │   │   ├── fhir-sync-enhanced.ts
│   │   │   │   │   └── fhir-sync.ts
│   │   │   │   ├── index.d.ts
│   │   │   │   ├── index.d.ts.map
│   │   │   │   ├── index.js
│   │   │   │   ├── index.js.map
│   │   │   │   └── index.ts
│   │   │   ├── 📁 tests
│   │   │   │   ├── fhir-export.test.ts
│   │   │   │   ├── fhir-ingress.test.ts
│   │   │   │   ├── fhir-reconciliation.test.ts
│   │   │   │   └── setup.ts
│   │   │   ├── Dockerfile
│   │   │   ├── package.json
│   │   │   ├── tsconfig.json
│   │   │   └── vitest.config.ts
│   │   ├── 📁 messages
│   │   │   ├── en.json
│   │   │   ├── es.json
│   │   │   └── pt.json
│   │   ├── 📁 mobile
│   │   │   ├── 📁 assets
│   │   │   │   ├── generate_splash.py
│   │   │   │   ├── generate-assets.md
│   │   │   │   ├── icon-template.svg
│   │   │   │   ├── README.md
│   │   │   │   └── splash-template.svg
│   │   │   ├── 📁 src
│   │   │   │   ├── 📁 components
│   │   │   │   │   ├── 📁 ui
              └── ... (truncated)
│   │   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   │   ├── LoadingScreen.tsx
│   │   │   │   │   └── WebSocketStatus.tsx
│   │   │   │   ├── 📁 config
│   │   │   │   │   ├── api.d.ts
│   │   │   │   │   ├── api.d.ts.map
│   │   │   │   │   ├── api.js
│   │   │   │   │   ├── api.js.map
│   │   │   │   │   ├── api.ts
│   │   │   │   │   ├── appTheme.ts
│   │   │   │   │   ├── designTokens.ts
│   │   │   │   │   ├── queryClient.ts
│   │   │   │   │   ├── theme.d.ts
│   │   │   │   │   ├── theme.d.ts.map
│   │   │   │   │   ├── theme.js
│   │   │   │   │   ├── theme.js.map
│   │   │   │   │   └── theme.ts
│   │   │   │   ├── 📁 features
│   │   │   │   │   ├── 📁 auth
              └── ... (truncated)
│   │   │   │   │   ├── 📁 onboarding
              └── ... (truncated)
│   │   │   │   │   ├── 📁 patients
              └── ... (truncated)
│   │   │   │   │   ├── 📁 prevention
              └── ... (truncated)
│   │   │   │   │   ├── 📁 recording
              └── ... (truncated)
│   │   │   │   │   └── 📁 transcription
              └── ... (truncated)
│   │   │   │   ├── 📁 hooks
│   │   │   │   │   ├── useAccessibility.ts
│   │   │   │   │   ├── useBiometricAuth.ts
│   │   │   │   │   ├── useNotifications.ts
│   │   │   │   │   ├── useOfflineSync.ts
│   │   │   │   │   ├── useSplashScreen.ts
│   │   │   │   │   ├── useTheme.ts
│   │   │   │   │   └── useWebSocket.ts
│   │   │   │   ├── 📁 navigation
│   │   │   │   │   ├── AppNavigator.tsx
│   │   │   │   │   ├── AuthNavigator.d.ts
│   │   │   │   │   ├── AuthNavigator.d.ts.map
│   │   │   │   │   ├── AuthNavigator.js
│   │   │   │   │   ├── AuthNavigator.js.map
│   │   │   │   │   ├── AuthNavigator.tsx
│   │   │   │   │   ├── linking.ts
│   │   │   │   │   ├── MainNavigator.d.ts
│   │   │   │   │   ├── MainNavigator.d.ts.map
│   │   │   │   │   ├── MainNavigator.js
│   │   │   │   │   ├── MainNavigator.js.map
│   │   │   │   │   ├── MainNavigator.tsx
│   │   │   │   │   ├── RootNavigator.d.ts
│   │   │   │   │   ├── RootNavigator.d.ts.map
│   │   │   │   │   ├── RootNavigator.js
│   │   │   │   │   ├── RootNavigator.js.map
│   │   │   │   │   ├── RootNavigator.tsx
│   │   │   │   │   └── types.ts
│   │   │   │   ├── 📁 providers
│   │   │   │   │   └── WebSocketProvider.tsx
│   │   │   │   ├── 📁 screens
│   │   │   │   │   ├── AppointmentsScreen.tsx
│   │   │   │   │   ├── CoPilotScreen.tsx
│   │   │   │   │   ├── EnhancedLoginScreen.tsx
│   │   │   │   │   ├── HomeDashboardScreen.tsx
│   │   │   │   │   ├── MessagingScreen.tsx
│   │   │   │   │   ├── PatientDashboardScreen.tsx
│   │   │   │   │   ├── PatientSearchScreen.tsx
│   │   │   │   │   ├── PrivacyConsentScreen.tsx
│   │   │   │   │   ├── SettingsScreen.tsx
│   │   │   │   │   └── SmartDiagnosisScreen.tsx
│   │   │   │   ├── 📁 services
│   │   │   │   │   ├── analyticsService.tsx
│   │   │   │   │   ├── biometricAuth.ts
│   │   │   │   │   ├── haptics.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── notificationService.ts
│   │   │   │   │   └── websocket.ts
│   │   │   │   ├── 📁 shared
│   │   │   │   │   ├── 📁 components
              └── ... (truncated)
│   │   │   │   │   ├── 📁 contexts
              └── ... (truncated)
│   │   │   │   │   ├── 📁 services
              └── ... (truncated)
│   │   │   │   │   └── 📁 types
              └── ... (truncated)
│   │   │   │   ├── 📁 store
│   │   │   │   │   ├── authStore.d.ts
│   │   │   │   │   ├── authStore.d.ts.map
│   │   │   │   │   ├── authStore.js
│   │   │   │   │   ├── authStore.js.map
│   │   │   │   │   └── authStore.ts
│   │   │   │   └── 📁 stores
│   │   │   │       ├── appointmentStore.ts
│   │   │   │       ├── index.ts
│   │   │   │       ├── onboardingStore.ts
│   │   │   │       ├── patientStore.ts
│   │   │   │       ├── preventionStore.ts
│   │   │   │       └── recordingStore.ts
│   │   │   ├── .env.example
│   │   │   ├── .gitignore
│   │   │   ├── ACCESSIBILITY_GUIDE.md
│   │   │   ├── App.d.ts
│   │   │   ├── App.d.ts.map
│   │   │   ├── App.js
│   │   │   ├── App.js.map
│   │   │   ├── app.json
│   │   │   ├── App.tsx
│   │   │   ├── ARCHITECTURE_MASTER_PLAN.md
│   │   │   ├── babel.config.js
│   │   │   ├── BUGFIX_SESSION.md
│   │   │   ├── COMPONENT_EXAMPLES.md
│   │   │   ├── CURRENT_STATUS.md
│   │   │   ├── DEPLOYMENT.md
│   │   │   ├── DEVELOPMENT_PROGRESS.md
│   │   │   ├── eas.json
│   │   │   ├── EXPO_GO_QUICKSTART.md
│   │   │   ├── IMPLEMENTATION_COMPLETE.md
│   │   │   ├── index.js
│   │   │   ├── MOBILE_APP_SUMMARY.md
│   │   │   ├── NAVIGATION_GUIDE.md
│   │   │   ├── NEXT_STEPS.md
│   │   │   ├── NOTIFICATION_IMPLEMENTATION_GUIDE.md
│   │   │   ├── NOTIFICATION_PAYLOAD_REFERENCE.md
│   │   │   ├── ONBOARDING_TESTING.md
│   │   │   ├── package.json
│   │   │   ├── PATIENT_SEARCH_GUIDE.md
│   │   │   ├── PERFORMANCE.md
│   │   │   ├── PHASE_1_PREVENTION_IMPLEMENTATION.md
│   │   │   ├── PHASE_1_TESTING.md
│   │   │   ├── PHASE_7_MOBILE_API_REFERENCE.md
│   │   │   ├── PHASE_7_MOBILE_MIGRATION_STATUS.md
│   │   │   ├── PREVENTION_TROUBLESHOOTING.md
│   │   │   ├── PRODUCTION_CHECKLIST.md
│   │   │   ├── PROJECT_SUMMARY.md
│   │   │   ├── PUSH_NOTIFICATION_ARCHITECTURE.md
│   │   │   ├── QUICK_START.md
│   │   │   ├── README.md
│   │   │   ├── README.old.md
│   │   │   ├── SESSION_SUMMARY.md
│   │   │   ├── STORE_USAGE_GUIDE.md
│   │   │   ├── TESTING_GUIDE.md
│   │   │   ├── TESTING_QUICK_START.md
│   │   │   └── tsconfig.json
│   │   └── 📁 web
│   │       ├── 📁 .local-email-inbox
│   │       │   └── 2026-01-19T17-02-49-151Z-0137b408a9cee.json
│   │       ├── 📁 apps
│   │       │   └── 📁 web
│   │       │       ├── 📁 src
              └── ... (truncated)
│   │       │       └── config.yaml
│   │       ├── 📁 config
│   │       │   └── casbin-model.conf
│   │       ├── 📁 docs
│   │       │   ├── 📁 runbooks
│   │       │   │   ├── DISASTER_RECOVERY.md
│   │       │   │   └── ssl-certificate-renewal.md
│   │       │   ├── AI_MONETIZATION_STRATEGY.md
│   │       │   ├── ALERTING_RULES.md
│   │       │   ├── API_DOCUMENTATION.md
│   │       │   ├── BACKUP_AND_RECOVERY.md
│   │       │   ├── CDSS_PERFORMANCE_OPTIMIZATION.md
│   │       │   ├── CLOUDFLARE_R2_SETUP.md
│   │       │   ├── CRON_JOBS.md
│   │       │   ├── DATABASE_DEPLOYMENT.md
│   │       │   ├── DEMO_AUTH_REMOVAL.md
│   │       │   ├── DEPLOYMENT_GUIDE.md
│   │       │   ├── DEPLOYMENT_STATUS.md
│   │       │   ├── DEPLOYMENT_SUMMARY.md
│   │       │   ├── DNS_CONFIGURATION.md
│   │       │   ├── ENHANCED_FEATURES_PLAN.md
│   │       │   ├── ENVIRONMENT_VARIABLES.md
│   │       │   ├── FILE_UPLOAD_SYSTEM.md
│   │       │   ├── FORMS_SYSTEM_IMPLEMENTATION.md
│   │       │   ├── IMPLEMENTATION_COMPLETE.md
│   │       │   ├── IMPLEMENTATION_PROGRESS.md
│   │       │   ├── LANDING_PAGE_REDESIGN.md
│   │       │   ├── MANUAL_TESTING_CHECKLIST.md
│   │       │   ├── MONITORING_DASHBOARD.md
│   │       │   ├── MONITORING_STRATEGY.md
│   │       │   ├── PATIENT_CONTEXT_FORMATTER.md
│   │       │   ├── PHARMACY_INTEGRATION.md
│   │       │   ├── PRODUCTION_DEPLOYMENT_CHECKLIST.md
│   │       │   ├── PRODUCTION_READINESS.md
│   │       │   ├── PUSH_NOTIFICATIONS.md
│   │       │   ├── SECRETS_AUDIT.md
│   │       │   ├── SECRETS_MANAGEMENT.md
│   │       │   ├── SECURITY_TESTING.md
│   │       │   ├── SENTRY_SETUP.md
│   │       │   ├── SESSION_MANAGEMENT.md
│   │       │   ├── SMS_APPOINTMENT_REMINDERS.md
│   │       │   ├── SOAP_NOTE_GENERATION.md
│   │       │   ├── SSL_TLS_QUICK_REFERENCE.md
│   │       │   ├── SSL_TLS_SETUP.md
│   │       │   ├── STORAGE_COMPARISON.md
│   │       │   ├── TEST_SUMMARY.md
│   │       │   ├── TESTING.md
│   │       │   ├── TROUBLESHOOTING.md
│   │       │   ├── TYPESCRIPT_FIXES.md
│   │       │   └── UPSTASH_REDIS_SETUP.md
│   │       ├── 📁 locales
│   │       │   ├── 📁 en
│   │       │   │   └── common.json
│   │       │   ├── 📁 es
│   │       │   │   └── common.json
│   │       │   └── 📁 pt
│   │       │       └── common.json
│   │       ├── 📁 messages
│   │       │   ├── en.json
│   │       │   ├── es.json
│   │       │   └── pt.json
│   │       ├── 📁 pages
│   │       │   └── 📁 api
│   │       │       └── socketio.ts
│   │       ├── 📁 playwright-report
│   │       │   ├── 📁 data
│   │       │   │   ├── 134b08df46350408543840ce3dead8b60d5d2592.webm
│   │       │   │   ├── 93939cd377a73b6c856d28b7832b25efefe3b908.png
│   │       │   │   ├── d12ca40e742be22256847c90bc0729668cbc2ba2.md
│   │       │   │   └── e8f34cae6f695b4a1b90423546ffb6f00c6f2091.webm
│   │       │   ├── index.html
│   │       │   └── results.json
│   │       ├── 📁 prisma
│   │       │   ├── 📁 migrations
│   │       │   │   ├── 📁 20251205_web2_interop_foundation
              └── ... (truncated)
│   │       │   │   ├── 📁 20251214_cdss_performance_indexes
              └── ... (truncated)
│   │       │   │   ├── 📁 20251215_session_security_tokens
              └── ... (truncated)
│   │       │   │   └── migration_lock.toml
│   │       │   ├── 📁 seeds
│   │       │   │   ├── clinical-templates.d.ts
│   │       │   │   ├── clinical-templates.d.ts.map
│   │       │   │   ├── clinical-templates.js
│   │       │   │   ├── clinical-templates.ts
│   │       │   │   ├── prevention-templates.ts
│   │       │   │   └── test-clinical-data.ts
│   │       │   ├── consolidated_migration.sql
│   │       │   ├── migration_add_invitation_beta_models.sql
│   │       │   ├── schema.prisma
│   │       │   ├── seed-palliative-care.d.ts
│   │       │   ├── seed-palliative-care.d.ts.map
│   │       │   ├── seed-palliative-care.js
│   │       │   ├── seed-palliative-care.js.map
│   │       │   ├── seed-palliative-care.ts
│   │       │   ├── seed-patients.d.ts
│   │       │   ├── seed-patients.d.ts.map
│   │       │   ├── seed-patients.js
│   │       │   ├── seed-patients.js.map
│   │       │   ├── seed-patients.ts
│   │       │   ├── seed-production.d.ts
│   │       │   ├── seed-production.d.ts.map
│   │       │   ├── seed-production.js
│   │       │   ├── seed-production.js.map
│   │       │   ├── seed-production.ts
│   │       │   ├── seed-situations.d.ts
│   │       │   ├── seed-situations.d.ts.map
│   │       │   ├── seed-situations.js
│   │       │   ├── seed-situations.ts
│   │       │   ├── seed.d.ts
│   │       │   ├── seed.d.ts.map
│   │       │   ├── seed.js
│   │       │   ├── seed.js.map
│   │       │   └── seed.ts
│   │       ├── 📁 public
│   │       │   ├── 📁 .well-known
│   │       │   │   └── security.txt
│   │       │   ├── 📁 demo
│   │       │   │   ├── consult-note-sample.png
│   │       │   │   ├── discharge-summary-sample.png
│   │       │   │   ├── lab-cbc-sample.png
│   │       │   │   ├── lab-cbc.svg
│   │       │   │   ├── lab-report.svg
│   │       │   │   ├── xray-chest.svg
│   │       │   │   ├── xray-hand.svg
│   │       │   │   └── xray-knee.svg
│   │       │   ├── 📁 demo-files
│   │       │   │   ├── consultation_note_demo-patient-11_12.txt
│   │       │   │   ├── consultation_note_demo-patient-15_16.txt
│   │       │   │   ├── consultation_note_demo-patient-19_20.txt
│   │       │   │   ├── consultation_note_demo-patient-23_24.txt
│   │       │   │   ├── consultation_note_demo-patient-27_28.txt
│   │       │   │   ├── consultation_note_demo-patient-3_4.txt
│   │       │   │   ├── consultation_note_demo-patient-7_8.txt
│   │       │   │   ├── index.json
│   │       │   │   ├── lab_result_demo-patient-1_2.txt
│   │       │   │   ├── lab_result_demo-patient-13_14.txt
│   │       │   │   ├── lab_result_demo-patient-17_18.txt
│   │       │   │   ├── lab_result_demo-patient-21_22.txt
│   │       │   │   ├── lab_result_demo-patient-25_26.txt
│   │       │   │   ├── lab_result_demo-patient-29_30.txt
│   │       │   │   ├── lab_result_demo-patient-5_6.txt
│   │       │   │   ├── lab_result_demo-patient-9_10.txt
│   │       │   │   ├── medical_history_demo-patient-0_1.txt
│   │       │   │   ├── medical_history_demo-patient-12_13.txt
│   │       │   │   ├── medical_history_demo-patient-16_17.txt
│   │       │   │   ├── medical_history_demo-patient-20_21.txt
│   │       │   │   ├── medical_history_demo-patient-24_25.txt
│   │       │   │   ├── medical_history_demo-patient-28_29.txt
│   │       │   │   ├── medical_history_demo-patient-4_5.txt
│   │       │   │   ├── medical_history_demo-patient-8_9.txt
│   │       │   │   ├── prescription_demo-patient-10_11.txt
│   │       │   │   ├── prescription_demo-patient-14_15.txt
│   │       │   │   ├── prescription_demo-patient-18_19.txt
│   │       │   │   ├── prescription_demo-patient-2_3.txt
│   │       │   │   ├── prescription_demo-patient-22_23.txt
│   │       │   │   ├── prescription_demo-patient-26_27.txt
│   │       │   │   └── prescription_demo-patient-6_7.txt
│   │       │   ├── 📁 icons
│   │       │   │   ├── apple-calendar.svg
│   │       │   │   ├── artificial-intelligence (1).svg
│   │       │   │   ├── artificial-intelligence.svg
│   │       │   │   ├── calendar (1).svg
│   │       │   │   ├── calendar.svg
│   │       │   │   ├── chart-cured-increasing (1).svg
│   │       │   │   ├── chart-cured-increasing.svg
│   │       │   │   ├── clinical-f (1).svg
│   │       │   │   ├── clinical-f.svg
│   │       │   │   ├── communication (1).svg
│   │       │   │   ├── communication.svg
│   │       │   │   ├── crisis-response_center_person.svg
│   │       │   │   ├── diagnostics (1).svg
│   │       │   │   ├── diagnostics.svg
│   │       │   │   ├── doctor (1).svg
│   │       │   │   ├── doctor-female (1).svg
│   │       │   │   ├── doctor-female.svg
│   │       │   │   ├── doctor-male (1).svg
│   │       │   │   ├── doctor-male.svg
│   │       │   │   ├── doctor.svg
│   │       │   │   ├── forum (1).svg
│   │       │   │   ├── forum.svg
│   │       │   │   ├── google-calendar.svg
│   │       │   │   ├── head (1).svg
│   │       │   │   ├── head.svg
│   │       │   │   ├── health (1).svg
│   │       │   │   ├── health (2).svg
│   │       │   │   ├── health (3).svg
│   │       │   │   ├── health-alt (1).svg
│   │       │   │   ├── health-alt.svg
│   │       │   │   ├── health-worker_form (1).svg
│   │       │   │   ├── health-worker_form.svg
│   │       │   │   ├── health.svg
│   │       │   │   ├── i-note_action (1).svg
│   │       │   │   ├── i-note_action.svg
│   │       │   │   ├── malnutrition (1).svg
│   │       │   │   ├── malnutrition.svg
│   │       │   │   ├── microsoft-outlook.svg
│   │       │   │   ├── people (1).svg
│   │       │   │   ├── people.svg
│   │       │   │   ├── rx (1).svg
│   │       │   │   ├── rx.svg
│   │       │   │   ├── speech-language_therapy (1).svg
│   │       │   │   ├── speech-language_therapy.svg
│   │       │   │   ├── stethoscope (1).svg
│   │       │   │   ├── stethoscope.svg
│   │       │   │   ├── telemedicine (1).svg
│   │       │   │   └── telemedicine.svg
│   │       │   ├── 📁 legal
│   │       │   │   ├── 📁 consent-forms
              └── ... (truncated)
│   │       │   │   ├── business-associate-agreement.md
│   │       │   │   ├── hipaa-notice-of-privacy-practices.md
│   │       │   │   ├── privacy-policy.md
│   │       │   │   └── terms-of-service.md
│   │       │   ├── 📁 logos
│   │       │   │   ├── holi-dark.png
│   │       │   │   ├── holi-dark.svg
│   │       │   │   ├── holi-light.png
│   │       │   │   ├── holi-light.svg
│   │       │   │   ├── Logo + Color Palette_Holi Labs (4).png
│   │       │   │   ├── Logo 1_Dark (1).svg
│   │       │   │   ├── Logo 1_Dark.png
│   │       │   │   ├── Logo 1_Dark.svg
│   │       │   │   ├── Logo 1_Light (1).png
│   │       │   │   └── Logo 1_Light.svg
│   │       │   ├── 📁 worklets
│   │       │   │   └── audio-processor.js
│   │       │   ├── DESIGN_ASSETS.md
│   │       │   ├── favicon.ico
│   │       │   ├── icon-192x192.png
│   │       │   ├── icon-256x256.png
│   │       │   ├── icon-384x384.png
│   │       │   ├── icon-512x512.png
│   │       │   ├── icon.svg
│   │       │   ├── landing-hero.jpeg
│   │       │   ├── loading-video.mp4
│   │       │   ├── manifest.json
│   │       │   ├── robots.txt
│   │       │   ├── sw.js
│   │       │   ├── sw.js.map
│   │       │   ├── workbox-01fd22c6.js
│   │       │   └── workbox-01fd22c6.js.map
│   │       ├── 📁 scripts
│   │       │   ├── audit-environment.d.ts
│   │       │   ├── audit-environment.d.ts.map
│   │       │   ├── audit-environment.js
│   │       │   ├── audit-environment.ts
│   │       │   ├── backup-database.d.ts
│   │       │   ├── backup-database.d.ts.map
│   │       │   ├── backup-database.js
│   │       │   ├── backup-database.js.map
│   │       │   ├── backup-database.ts
│   │       │   ├── check-all-apis.ts
│   │       │   ├── check-health.ts
│   │       │   ├── check-mobile-responsiveness.sh
│   │       │   ├── cleanup-synthetic-names.ts
│   │       │   ├── create-demo-clinician.ts
│   │       │   ├── fix-encoding.js
│   │       │   ├── generate-demo-files.ts
│   │       │   ├── generate-production-secrets.sh
│   │       │   ├── phase6-cli.ts
│   │       │   ├── pre-deploy-check.sh
│   │       │   ├── replace-console-logs-api-routes.sh
│   │       │   ├── replace-console-logs-batch-1.sh
│   │       │   ├── seed-credentials.d.ts
│   │       │   ├── seed-credentials.d.ts.map
│   │       │   ├── seed-credentials.js
│   │       │   ├── seed-credentials.ts
│   │       │   ├── seed-prevention-templates.ts
│   │       │   ├── seed-soap-notes.d.ts
│   │       │   ├── seed-soap-notes.d.ts.map
│   │       │   ├── seed-soap-notes.js
│   │       │   ├── seed-soap-notes.js.map
│   │       │   ├── seed-soap-notes.ts
│   │       │   ├── seed-tasks.d.ts
│   │       │   ├── seed-tasks.d.ts.map
│   │       │   ├── seed-tasks.js
│   │       │   ├── seed-tasks.ts
│   │       │   ├── set-demo-password.ts
│   │       │   ├── setup-git-secrets.sh
│   │       │   ├── test-all-security.sh
│   │       │   ├── test-anonymize.ts
│   │       │   ├── test-cors.sh
│   │       │   ├── test-cron-security.ts
│   │       │   ├── test-csrf.sh
│   │       │   ├── test-env-validation.ts
│   │       │   ├── test-lab-reference-ranges.ts
│   │       │   ├── test-rxnav-integration.ts
│   │       │   ├── test-security-headers.sh
│   │       │   ├── test-soap-generation.ts
│   │       │   ├── validate-day1-setup.ts
│   │       │   ├── validate-env.ts
│   │       │   ├── validate-production.d.ts
│   │       │   ├── validate-production.d.ts.map
│   │       │   ├── validate-production.js
│   │       │   ├── validate-production.ts
│   │       │   ├── validate-translations.ts
│   │       │   ├── verify-ai-setup.ts
│   │       │   ├── verify-backups.ts
│   │       │   ├── verify-indexes.sql
│   │       │   ├── verify-phase6.ts
│   │       │   ├── verify-security-hardening.sh
│   │       │   └── verify-security-headers.ts
│   │       ├── 📁 src
│   │       │   ├── 📁 __tests__
│   │       │   │   └── 📁 soap-generator
              └── ... (truncated)
│   │       │   ├── 📁 app
│   │       │   │   ├── 📁 access
              └── ... (truncated)
│   │       │   │   ├── 📁 admin
              └── ... (truncated)
│   │       │   │   ├── 📁 api
              └── ... (truncated)
│   │       │   │   ├── 📁 auth
              └── ... (truncated)
│   │       │   │   ├── 📁 book
              └── ... (truncated)
│   │       │   │   ├── 📁 clinician
              └── ... (truncated)
│   │       │   │   ├── 📁 confirm
              └── ... (truncated)
│   │       │   │   ├── 📁 dashboard
              └── ... (truncated)
│   │       │   │   ├── 📁 find-doctor
              └── ... (truncated)
│   │       │   │   ├── 📁 legal
              └── ... (truncated)
│   │       │   │   ├── 📁 onboarding
              └── ... (truncated)
│   │       │   │   ├── 📁 portal
              └── ... (truncated)
│   │       │   │   ├── 📁 pricing
              └── ... (truncated)
│   │       │   │   ├── 📁 shared
              └── ... (truncated)
│   │       │   │   ├── 📁 sign-in
              └── ... (truncated)
│   │       │   │   ├── error.tsx
│   │       │   │   ├── global-error.tsx
│   │       │   │   ├── globals.css
│   │       │   │   ├── layout.tsx
│   │       │   │   ├── loading.tsx
│   │       │   │   ├── not-found.tsx
│   │       │   │   ├── page_old.tsx
│   │       │   │   └── page.tsx
│   │       │   ├── 📁 components
│   │       │   │   ├── 📁 access-grants
              └── ... (truncated)
│   │       │   │   ├── 📁 ai
              └── ... (truncated)
│   │       │   │   ├── 📁 appointments
              └── ... (truncated)
│   │       │   │   ├── 📁 calendar
              └── ... (truncated)
│   │       │   │   ├── 📁 chat
              └── ... (truncated)
│   │       │   │   ├── 📁 clinical
              └── ... (truncated)
│   │       │   │   ├── 📁 co-pilot
              └── ... (truncated)
│   │       │   │   ├── 📁 common
              └── ... (truncated)
│   │       │   │   ├── 📁 compliance
              └── ... (truncated)
│   │       │   │   ├── 📁 credentials
              └── ... (truncated)
│   │       │   │   ├── 📁 dashboard
              └── ... (truncated)
│   │       │   │   ├── 📁 demo
              └── ... (truncated)
│   │       │   │   ├── 📁 encounter
              └── ... (truncated)
│   │       │   │   ├── 📁 forms
              └── ... (truncated)
│   │       │   │   ├── 📁 imaging
              └── ... (truncated)
│   │       │   │   ├── 📁 invoices
              └── ... (truncated)
│   │       │   │   ├── 📁 lab-results
              └── ... (truncated)
│   │       │   │   ├── 📁 legal
              └── ... (truncated)
│   │       │   │   ├── 📁 mar
              └── ... (truncated)
│   │       │   │   ├── 📁 medications
              └── ... (truncated)
│   │       │   │   ├── 📁 messaging
              └── ... (truncated)
│   │       │   │   ├── 📁 notifications
              └── ... (truncated)
│   │       │   │   ├── 📁 onboarding
              └── ... (truncated)
│   │       │   │   ├── 📁 palliative
              └── ... (truncated)
│   │       │   │   ├── 📁 patient
              └── ... (truncated)
│   │       │   │   ├── 📁 patients
              └── ... (truncated)
│   │       │   │   ├── 📁 pdf
              └── ... (truncated)
│   │       │   │   ├── 📁 portal
              └── ... (truncated)
│   │       │   │   ├── 📁 prescriptions
              └── ... (truncated)
│   │       │   │   ├── 📁 prevention
              └── ... (truncated)
│   │       │   │   ├── 📁 print
              └── ... (truncated)
│   │       │   │   ├── 📁 privacy
              └── ... (truncated)
│   │       │   │   ├── 📁 qr
              └── ... (truncated)
│   │       │   │   ├── 📁 recordings
              └── ... (truncated)
│   │       │   │   ├── 📁 referrals
              └── ... (truncated)
│   │       │   │   ├── 📁 reschedule
              └── ... (truncated)
│   │       │   │   ├── 📁 scribe
              └── ... (truncated)
│   │       │   │   ├── 📁 search
              └── ... (truncated)
│   │       │   │   ├── 📁 shared
              └── ... (truncated)
│   │       │   │   ├── 📁 skeletons
              └── ... (truncated)
│   │       │   │   ├── 📁 spatial
              └── ... (truncated)
│   │       │   │   ├── 📁 sync
              └── ... (truncated)
│   │       │   │   ├── 📁 tasks
              └── ... (truncated)
│   │       │   │   ├── 📁 templates
              └── ... (truncated)
│   │       │   │   ├── 📁 ui
              └── ... (truncated)
│   │       │   │   ├── 📁 upload
              └── ... (truncated)
│   │       │   │   ├── 📁 video
              └── ... (truncated)
│   │       │   │   ├── 📁 voice
              └── ... (truncated)
│   │       │   │   ├── AICommandCenter.tsx
│   │       │   │   ├── CommandPalette.tsx
│   │       │   │   ├── ContextMenu.tsx
│   │       │   │   ├── CookieConsentBanner.tsx
│   │       │   │   ├── DarkModeShowcase.tsx
│   │       │   │   ├── DashboardLayout.tsx
│   │       │   │   ├── ErrorBoundary.tsx
│   │       │   │   ├── FeedbackWidget.tsx
│   │       │   │   ├── IntroAnimation.tsx
│   │       │   │   ├── IOSInstallPrompt.tsx
│   │       │   │   ├── LanguageSelector.tsx
│   │       │   │   ├── LoadingScreen.tsx
│   │       │   │   ├── LoadingSkeleton.tsx
│   │       │   │   ├── NotificationBadge.tsx
│   │       │   │   ├── NotificationPrompt.tsx
│   │       │   │   ├── OfflineDetector.tsx
│   │       │   │   ├── OfflineIndicator.tsx
│   │       │   │   ├── PatientSearch.tsx
│   │       │   │   ├── PrintButton.tsx
│   │       │   │   ├── Providers.tsx
│   │       │   │   ├── SessionTimeoutWarning.tsx
│   │       │   │   ├── SkipLink.tsx
│   │       │   │   ├── SupportContact.tsx
│   │       │   │   ├── ThemeToggle.tsx
│   │       │   │   └── WebVitalsTracker.tsx
│   │       │   ├── 📁 contexts
│   │       │   │   ├── ClinicalSessionContext.tsx
│   │       │   │   └── LanguageContext.tsx
│   │       │   ├── 📁 hooks
│   │       │   │   ├── use-audio-recorder.ts
│   │       │   │   ├── useAnalytics.ts
│   │       │   │   ├── useCSRF.ts
│   │       │   │   ├── useCsrfToken.ts
│   │       │   │   ├── useDebounce.ts
│   │       │   │   ├── useDeviceSync.ts
│   │       │   │   ├── useFeatureFlag.ts
│   │       │   │   ├── useJobStatus.ts
│   │       │   │   ├── useKeyboardShortcuts.ts
│   │       │   │   ├── useLanguage.ts
│   │       │   │   ├── useNotifications.ts
│   │       │   │   ├── usePatientContext.ts
│   │       │   │   ├── usePatientFilters.ts
│   │       │   │   ├── useRealtimePreventionUpdates.ts
│   │       │   │   ├── useSessionTimeout.ts
│   │       │   │   └── useVoiceCommands.ts
│   │       │   ├── 📁 i18n
│   │       │   │   └── shared.ts
│   │       │   ├── 📁 lib
│   │       │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │       │   │   ├── 📁 ai
              └── ... (truncated)
│   │       │   │   ├── 📁 analytics
              └── ... (truncated)
│   │       │   │   ├── 📁 api
              └── ... (truncated)
│   │       │   │   ├── 📁 appointments
              └── ... (truncated)
│   │       │   │   ├── 📁 audit
              └── ... (truncated)
│   │       │   │   ├── 📁 auth
              └── ... (truncated)
│   │       │   │   ├── 📁 aws
              └── ... (truncated)
│   │       │   │   ├── 📁 blockchain
              └── ... (truncated)
│   │       │   │   ├── 📁 brazil-interop
              └── ... (truncated)
│   │       │   │   ├── 📁 cache
              └── ... (truncated)
│   │       │   │   ├── 📁 calendar
              └── ... (truncated)
│   │       │   │   ├── 📁 cds
              └── ... (truncated)
│   │       │   │   ├── 📁 chat
              └── ... (truncated)
│   │       │   │   ├── 📁 client
              └── ... (truncated)
│   │       │   │   ├── 📁 clinical
              └── ... (truncated)
│   │       │   │   ├── 📁 clinical-notes
              └── ... (truncated)
│   │       │   │   ├── 📁 compliance
              └── ... (truncated)
│   │       │   │   ├── 📁 consent
              └── ... (truncated)
│   │       │   │   ├── 📁 cron
              └── ... (truncated)
│   │       │   │   ├── 📁 db
              └── ... (truncated)
│   │       │   │   ├── 📁 deid
              └── ... (truncated)
│   │       │   │   ├── 📁 deidentification
              └── ... (truncated)
│   │       │   │   ├── 📁 demo
              └── ... (truncated)
│   │       │   │   ├── 📁 ehr
              └── ... (truncated)
│   │       │   │   ├── 📁 email
              └── ... (truncated)
│   │       │   │   ├── 📁 export
              └── ... (truncated)
│   │       │   │   ├── 📁 facades
              └── ... (truncated)
│   │       │   │   ├── 📁 fhir
              └── ... (truncated)
│   │       │   │   ├── 📁 forms
              └── ... (truncated)
│   │       │   │   ├── 📁 hl7
              └── ... (truncated)
│   │       │   │   ├── 📁 imaging
              └── ... (truncated)
│   │       │   │   ├── 📁 integrations
              └── ... (truncated)
│   │       │   │   ├── 📁 invoices
              └── ... (truncated)
│   │       │   │   ├── 📁 jobs
              └── ... (truncated)
│   │       │   │   ├── 📁 logging
              └── ... (truncated)
│   │       │   │   ├── 📁 mar
              └── ... (truncated)
│   │       │   │   ├── 📁 medical
              └── ... (truncated)
│   │       │   │   ├── 📁 monitoring
              └── ... (truncated)
│   │       │   │   ├── 📁 notifications
              └── ... (truncated)
│   │       │   │   ├── 📁 nppes
              └── ... (truncated)
│   │       │   │   ├── 📁 openfda
              └── ... (truncated)
│   │       │   │   ├── 📁 patients
              └── ... (truncated)
│   │       │   │   ├── 📁 prevention
              └── ... (truncated)
│   │       │   │   ├── 📁 qr
              └── ... (truncated)
│   │       │   │   ├── 📁 queue
              └── ... (truncated)
│   │       │   │   ├── 📁 repositories
              └── ... (truncated)
│   │       │   │   ├── 📁 resilience
              └── ... (truncated)
│   │       │   │   ├── 📁 risk-scores
              └── ... (truncated)
│   │       │   │   ├── 📁 scheduling
              └── ... (truncated)
│   │       │   │   ├── 📁 schemas
              └── ... (truncated)
│   │       │   │   ├── 📁 scribe
              └── ... (truncated)
│   │       │   │   ├── 📁 search
              └── ... (truncated)
│   │       │   │   ├── 📁 secrets
              └── ... (truncated)
│   │       │   │   ├── 📁 security
              └── ... (truncated)
│   │       │   │   ├── 📁 services
              └── ... (truncated)
│   │       │   │   ├── 📁 sms
              └── ... (truncated)
│   │       │   │   ├── 📁 socket
              └── ... (truncated)
│   │       │   │   ├── 📁 storage
              └── ... (truncated)
│   │       │   │   ├── 📁 supabase
              └── ... (truncated)
│   │       │   │   ├── 📁 templates
              └── ... (truncated)
│   │       │   │   ├── 📁 transcription
              └── ... (truncated)
│   │       │   │   ├── 📁 utils
              └── ... (truncated)
│   │       │   │   ├── 📁 validation
              └── ... (truncated)
│   │       │   │   ├── 📁 validations
              └── ... (truncated)
│   │       │   │   ├── 📁 voice
              └── ... (truncated)
│   │       │   │   ├── audit.ts
│   │       │   │   ├── auth.ts
│   │       │   │   ├── csrf.ts
│   │       │   │   ├── email.ts
│   │       │   │   ├── encryption.ts
│   │       │   │   ├── env.ts
│   │       │   │   ├── featureFlags.ts
│   │       │   │   ├── logger.server.ts
│   │       │   │   ├── logger.ts
│   │       │   │   ├── medical-license-verification.ts
│   │       │   │   ├── notifications.ts
│   │       │   │   ├── offline-queue.ts
│   │       │   │   ├── posthog.ts
│   │       │   │   ├── presidio.ts
│   │       │   │   ├── prisma-replica.ts
│   │       │   │   ├── prisma.ts
│   │       │   │   ├── push-notifications.ts
│   │       │   │   ├── rate-limit.ts
│   │       │   │   ├── referral.ts
│   │       │   │   ├── request-id.ts
│   │       │   │   ├── search.ts
│   │       │   │   ├── security-headers.ts
│   │       │   │   ├── sms.ts
│   │       │   │   ├── socket-auth.ts
│   │       │   │   ├── socket-server.ts
│   │       │   │   ├── storage.ts
│   │       │   │   ├── translations.ts
│   │       │   │   ├── utils.ts
│   │       │   │   └── validation.ts
│   │       │   ├── 📁 providers
│   │       │   │   └── ThemeProvider.tsx
│   │       │   ├── 📁 scripts
│   │       │   │   └── theme-init.ts
│   │       │   ├── 📁 styles
│   │       │   │   ├── contrast-utils.ts
│   │       │   │   ├── design-tokens.ts
│   │       │   │   ├── mobile.css
│   │       │   │   ├── print.css
│   │       │   │   └── theme.ts
│   │       │   ├── 📁 types
│   │       │   │   ├── dcmjs.d.ts
│   │       │   │   ├── lucide-react.d.ts
│   │       │   │   ├── next-auth.d.ts
│   │       │   │   ├── next-link.d.ts
│   │       │   │   ├── react-pdf.d.ts
│   │       │   │   └── simple-hl7.d.ts
│   │       │   ├── i18n.ts
│   │       │   ├── instrumentation.ts
│   │       │   └── middleware.ts
│   │       ├── 📁 tests
│   │       │   ├── 📁 e2e
│   │       │   │   ├── accessibility-fixes.spec.ts
│   │       │   │   ├── appointment-scheduling.spec.ts
│   │       │   │   ├── critical-flows.spec.ts
│   │       │   │   ├── patient-portal.spec.ts
│   │       │   │   ├── prescription-safety.spec.ts
│   │       │   │   └── soap-note-generation.spec.ts
│   │       │   ├── 📁 load
│   │       │   │   ├── cdss-load-test.js
│   │       │   │   ├── README.md
│   │       │   │   └── run-load-test.sh
│   │       │   ├── 📁 results
│   │       │   │   ├── 📁 accessibility-fixes-Access-8db76-anding-Page---Public-Access-chromium
              └── ... (truncated)
│   │       │   │   └── .last-run.json
│   │       │   ├── README.md
│   │       │   ├── smoke.spec.d.ts
│   │       │   ├── smoke.spec.d.ts.map
│   │       │   ├── smoke.spec.js
│   │       │   ├── smoke.spec.js.map
│   │       │   └── smoke.spec.ts
│   │       ├── .browserslistrc
│   │       ├── .dockerignore
│   │       ├── .env.example
│   │       ├── .env.local.example
│   │       ├── .env.production.example
│   │       ├── .env.production.template
│   │       ├── .gitignore
│   │       ├── ACCESSIBILITY_TESTING_GUIDE.md
│   │       ├── AGENDA_SETUP_GUIDE.md
│   │       ├── AGENT_1_COMPLETION_REPORT.md
│   │       ├── AGENT_1_SUMMARY.md
│   │       ├── AGENT_10_BATCH_10A_DARK_MODE_FIX_REPORT.md
│   │       ├── AGENT_10_BATCH_10B_DARK_MODE_FIX_REPORT.md
│   │       ├── AGENT_10_BATCH_10C_FINAL_DARK_MODE_FIX_REPORT.md
│   │       ├── AGENT_10_BATCH_10D_FINAL_FIX_REPORT.md
│   │       ├── AGENT_10_BATCH_2_QUICK_SUMMARY.md
│   │       ├── AGENT_10_BATCH_4_QUICK_SUMMARY.md
│   │       ├── AGENT_10_BATCH_9_INDEX.md
│   │       ├── AGENT_10_BATCH_9_QUICK_SUMMARY.md
│   │       ├── AGENT_10_COMPLETE_SUMMARY.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_1_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_2_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_3_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_4_FINAL_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_5_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_6_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_7_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_8_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_9_FINAL_REPORT.md
│   │       ├── AGENT_10_CRITICAL_DISCOVERY_DARK_MODE_GAP.md
│   │       ├── AGENT_10_OVERALL_PROGRESS.md
│   │       ├── AGENT_13_COMPLETION_REPORT.md
│   │       ├── AGENT_13_FILE_INVENTORY.md
│   │       ├── AGENT_14_COMPLETION_REPORT.md
│   │       ├── AGENT_15_COMPLETION_REPORT.md
│   │       ├── AGENT_19_COMPLETION_REPORT.md
│   │       ├── AGENT_19_FINAL_VALIDATION_SUMMARY.md
│   │       ├── AGENT_20_CDSS_PERFORMANCE_AUDIT.md
│   │       ├── AGENT_20_COMPLETION_SUMMARY.md
│   │       ├── AGENT_21_FINAL_SUMMARY.md
│   │       ├── AGENT_21_MONITORING_SETUP_COMPLETE.md
│   │       ├── AGENT_27_COMPLETION_SUMMARY.md
│   │       ├── AGENT_28_MOBILE_AUDIT_COMPLETE.md
│   │       ├── AGENT_29_CROSS_BROWSER_COMPATIBILITY.md
│   │       ├── AGENT_3_COMPLETION_REPORT.md
│   │       ├── AGENT_5_SECURITY_HARDENING_COMPLETE.md
│   │       ├── AGENT_7_DARK_MODE_IMPLEMENTATION.md
│   │       ├── AGENT10_BATCH_1_COMPLETION.md
│   │       ├── AGENT10_BATCH_2_COMPLETION.md
│   │       ├── AGENT10_BATCH_3_COMPLETION.md
│   │       ├── AGENT10_CLINICAL_BATCH_SUMMARY.md
│   │       ├── AGENT10_SUMMARY.md
│   │       ├── AGENT11_THEME_CONSOLIDATION_COMPLETE.md
│   │       ├── AGENT16_ADDITIONAL_SCHEMA_ISSUES.md
│   │       ├── AGENT16_EXECUTIVE_SUMMARY.md
│   │       ├── AGENT16_FILES_AFFECTED.md
│   │       ├── AGENT16_INDEX.md
│   │       ├── AGENT16_PRISMA_SCHEMA_FIX_REPORT.md
│   │       ├── AGENT17_IMPLEMENTATION_SUMMARY.md
│   │       ├── AGENT17_MIGRATION_GUIDE.md
│   │       ├── AGENT17_MISSING_MODELS_IMPLEMENTATION.md
│   │       ├── AGENT2_COMPLETION_REPORT.md
│   │       ├── AGENT2_FINAL_REPORT.md
│   │       ├── AGENT22_BACKUP_DR_IMPLEMENTATION.md
│   │       ├── AGENT23_SESSION_SECURITY_COMPLETE.md
│   │       ├── AGENT4_COMPLETION_SUMMARY.md
│   │       ├── AGENT9_BATCH_1_COMPLETION.md
│   │       ├── AGENT9_FILE_INVENTORY.md
│   │       ├── AGENT9_QUICK_GUIDE.md
│   │       ├── AGENT9_SUMMARY.md
│   │       ├── AGENTS_9_10_12_COMPLETION_REPORT.md
│   │       ├── API_COST_ANALYSIS_2025.md
│   │       ├── AUTHENTICATION_BEFORE_AFTER.md
│   │       ├── AUTHENTICATION_QUICK_REFERENCE.md
│   │       ├── BATCH_10B_FILES_MODIFIED.txt
│   │       ├── BATCH_2_LOGGING_MIGRATION_REPORT.md
│   │       ├── BATCH_4_COMPLETION_REPORT.md
│   │       ├── BATCH_5_COMPLETION_REPORT.md
│   │       ├── BATCH_6A_COMPLETION_REPORT.md
│   │       ├── batch-logger-update.sh
│   │       ├── BROWSER_COMPATIBILITY_QUICKSTART.md
│   │       ├── BROWSER_COMPATIBILITY_TEST_MATRIX.md
│   │       ├── BROWSER_SPECIFIC_FIXES.md
│   │       ├── BULK_EXPORT_GUIDE.md
│   │       ├── CDSS_PERFORMANCE_COMPLETE.md
│   │       ├── CDSS_PERFORMANCE_QUICK_REFERENCE.md
│   │       ├── CDSS_PERFORMANCE_QUICKSTART.md
│   │       ├── COMMAND_CENTER_ADDITIONAL_POLISH.md
│   │       ├── COMMAND_CENTER_ENHANCEMENT_PHASE_2.md
│   │       ├── COMMAND_CENTER_FINAL_POLISH.md
│   │       ├── COMMAND_CENTER_INTEGRATION_COMPLETE.md
│   │       ├── COMMAND_CENTER_PHASE_3A_INTEGRATION.md
│   │       ├── COMMAND_CENTER_PHASE_3B_POLISH.md
│   │       ├── COMMAND_CENTER_README.md
│   │       ├── COMMAND_CENTER_UI_POLISH.md
│   │       ├── COMMUNICATIONS_SETUP.md
│   │       ├── COMPETITIVE_FEATURES_COMPLETE.md
│   │       ├── CONNECTION_POOLING.md
│   │       ├── CONTRAST_FIX_BATCH2_REPORT.md
│   │       ├── CONTRAST_FIX_QUICK_GUIDE.md
│   │       ├── CRON_JOBS_QUICK_REFERENCE.md
│   │       ├── CRON_SECURITY_SUMMARY.md
│   │       ├── DARK_MODE_FIX_QUICK_GUIDE.md
│   │       ├── DARK_MODE_QUICK_REFERENCE.md
│   │       ├── DARK_MODE_VARIABLES.md
│   │       ├── DASHBOARD_FIXES_COMPLETION_REPORT.md
│   │       ├── DATABASE_INDEXES.md
│   │       ├── DATABASE_SETUP.md
│   │       ├── DEEPGRAM_INTEGRATION_COMPLETE.md
│   │       ├── DEMO_ACCOUNTS.md
│   │       ├── DEPLOYMENT_CHECKLIST.md
│   │       ├── DEPLOYMENT_READY.md
│   │       ├── Dockerfile
│   │       ├── Dockerfile.prod
│   │       ├── ENV_VALIDATION_QUICK_REFERENCE.md
│   │       ├── ENV_VALIDATION.md
│   │       ├── environment-audit-report.json
│   │       ├── ERROR_HANDLING_AUDIT_REPORT.md
│   │       ├── ERROR_HANDLING_QUICK_GUIDE.md
│   │       ├── FINAL_POLISH_SESSION_COMPLETE.md
│   │       ├── GIT_SECRETS_SETUP.md
│   │       ├── HIPAA_COMPLIANCE_AUDIT_REPORT.md
│   │       ├── HIPAA_COMPLIANCE_CHECKLIST.md
│   │       ├── HIPAA_COMPLIANCE_QUICK_REFERENCE.md
│   │       ├── HIPAA_EXECUTIVE_SUMMARY.md
│   │       ├── HIPAA_REMEDIATION_TRACKER.md
│   │       ├── I18N-SETUP.md
│   │       ├── i18n.d.ts
│   │       ├── i18n.d.ts.map
│   │       ├── i18n.js
│   │       ├── i18n.js.disabled
│   │       ├── i18n.js.map
│   │       ├── i18n.ts.disabled
│   │       ├── IMPLEMENTATION_STATUS.md
│   │       ├── INSTALLATION_REQUIRED.md
│   │       ├── instrumentation.d.ts
│   │       ├── instrumentation.d.ts.map
│   │       ├── instrumentation.js
│   │       ├── instrumentation.js.map
│   │       ├── INTERNATIONAL_PREVENTION_PROTOCOLS.md
│   │       ├── INVITATION_QUICK_START.md
│   │       ├── INVITATION_SYSTEM_IMPLEMENTATION.md
│   │       ├── jest.config.js
│   │       ├── jest.sequencer.cjs
│   │       ├── jest.setup.js
│   │       ├── LAB_REFERENCE_RANGES_QUICK_START.md
│   │       ├── LAB_REFERENCE_RANGES_SUMMARY.md
│   │       ├── LAB_REFERENCE_RANGES_VALIDATION_REPORT.md
│   │       ├── LEGAL_DOCUMENTS_IMPLEMENTATION.md
│   │       ├── LOGGING_MIGRATION_QUICK_GUIDE.md
│   │       ├── LOGGING.md
│   │       ├── MARKETING_BRIEF_FOR_LLM.md
│   │       ├── MASTER_PLAN_COMPLETE.md
│   │       ├── MASTER_POLISH_COMPLETE.md
│   │       ├── MEDICAL_LICENSE_VERIFICATION.md
│   │       ├── middleware.ts
│   │       ├── MIGRATION-AI-USAGE.sql
│   │       ├── MOBILE_IMPLEMENTATION_ROADMAP.md
│   │       ├── MOBILE_QUICK_REFERENCE.md
│   │       ├── MOBILE_RESPONSIVENESS_AUDIT.md
│   │       ├── MOBILE_TESTING_CHECKLIST.md
│   │       ├── MONITORING_QUICKSTART.md
│   │       ├── next-env.d.ts
│   │       ├── next.config.js
│   │       ├── NOTIFICATION_SYSTEM.md
│   │       ├── P0_FIXES_COMPLETED.md
│   │       ├── package.json
│   │       ├── PHASE_1_DEPLOYMENT_SUMMARY.md
│   │       ├── PHASE_1_MVP_COMPLETE.md
│   │       ├── PHASE_2_WHATSAPP_COMPLETE.md
│   │       ├── PHASE_6_DEPLOYMENT_SUMMARY.md
│   │       ├── PHASE_6_DOCUMENTATION.md
│   │       ├── PHASE_6_QUICKSTART.md
│   │       ├── PHASE_6_README.md
│   │       ├── PHASE_7_COMPLETE_DOCUMENTATION.md
│   │       ├── PHASE_7_FEATURE_1_SUMMARY.md
│   │       ├── PHASE_7_PLAN.md
│   │       ├── playwright.config.ts
│   │       ├── postcss.config.js
│   │       ├── PREVENTION_GOAL_TRACKING_GUIDE.md
│   │       ├── PREVENTION_HUB_COMPLETE.md
│   │       ├── PREVENTION_HUB_DEMO.md
│   │       ├── PREVENTION_HUB_FINAL_UPDATE.md
│   │       ├── PREVENTION_HUB_SUMMARY.md
│   │       ├── PREVENTION_HUB_TESTING.md
│   │       ├── PREVENTION_PHASE1_COMPLETE.md
│   │       ├── PREVENTION_PHASE2_COMPLETE.md
│   │       ├── PREVENTION_PHASE3_ADVANCED_FEATURES.md
│   │       ├── PREVENTION_PHASE4_COLLABORATION_FEATURES.md
│   │       ├── PREVENTION_PHASE5_ANALYTICS_REPORTING.md
│   │       ├── PREVENTION_PLANS_HISTORY_GUIDE.md
│   │       ├── PREVENTION_PLANS.md
│   │       ├── PREVENTION_STATUS_MANAGEMENT_GUIDE.md
│   │       ├── PRISMA_QUICK_REFERENCE.md
│   │       ├── PRISMA_TROUBLESHOOTING_GUIDE.md
│   │       ├── PRODUCTION_DEPLOYMENT_CHECKLIST.md
│   │       ├── PROJECT_COMPLETION_SUMMARY.md
│   │       ├── PROTOCOL_PERSISTENCE_GUIDE.md
│   │       ├── RATE_LIMITING_RESTORED.md
│   │       ├── README_MOBILE_AUDIT.md
│   │       ├── RED_TEAM_ANALYSIS.md
│   │       ├── REDIS_RATE_LIMITING.md
│   │       ├── RXNAV_INTEGRATION.md
│   │       ├── RXNAV_QUICKSTART.md
│   │       ├── SCREEN_READER_TESTING_GUIDE.md
│   │       ├── SECURITY_AUDIT_HARDCODED_SECRETS.md
│   │       ├── SECURITY_AUDIT_SUMMARY.md
│   │       ├── SECURITY_HARDENING_COMPLETE.md
│   │       ├── SECURITY_QUICK_REFERENCE.md
│   │       ├── SECURITY_RED_TEAM_ANALYSIS.md
│   │       ├── sentry.edge.config.d.ts
│   │       ├── sentry.edge.config.d.ts.map
│   │       ├── sentry.edge.config.js
│   │       ├── sentry.edge.config.ts
│   │       ├── sentry.server.config.d.ts
│   │       ├── sentry.server.config.d.ts.map
│   │       ├── sentry.server.config.js
│   │       ├── sentry.server.config.ts
│   │       ├── server.js
│   │       ├── SESSION_ADDITIONAL_POLISH_COMPLETE.md
│   │       ├── SESSION_MASTER_PLAN_COMPLETE.md
│   │       ├── SESSION_PHASE_3_COMPLETE.md
│   │       ├── SESSION_SECURITY_QUICK_REFERENCE.md
│   │       ├── SESSION_SUMMARY_PHASE4.md
│   │       ├── SESSION_SUMMARY_PHASE5.md
│   │       ├── SESSION_SUMMARY_PHASE6.md
│   │       ├── SESSION_SUMMARY.md
│   │       ├── setup-agenda.sh
│   │       ├── tailwind.config.d.ts
│   │       ├── tailwind.config.d.ts.map
│   │       ├── tailwind.config.js
│   │       ├── tailwind.config.js.map
│   │       ├── tailwind.config.ts
│   │       ├── TASK_1_VERIFICATION.md
│   │       ├── TASK_2_COMPLETE.md
│   │       ├── test-ai-setup.d.ts
│   │       ├── test-ai-setup.d.ts.map
│   │       ├── test-ai-setup.js
│   │       ├── test-ai-setup.js.map
│   │       ├── test-ai-setup.ts
│   │       ├── TESTING_VERIFICATION_COMPLETE.md
│   │       ├── THEME_ARCHITECTURE_DIAGRAM.md
│   │       ├── THEME_QUICK_START.md
│   │       ├── THEME_SYSTEM_DOCUMENTATION.md
│   │       ├── TRANSLATION_ARCHITECTURE.md
│   │       ├── TRANSLATION_MANAGEMENT.md
│   │       ├── tsconfig.json
│   │       ├── vercel.json
│   │       ├── WHATSAPP_SETUP_GUIDE.md
│   │       └── WHITE_ON_WHITE_FIX_REPORT.md
│   ├── 📁 COMPLIANCE
│   │   └── DPIA-template.md
│   ├── 📁 configs
│   │   ├── policy-ar.yaml
│   │   ├── policy-br.yaml
│   │   ├── policy-mx.yaml
│   │   └── precision-budgets.json
│   ├── 📁 demos
│   │   ├── 📁 sample-fhir-bundles
│   │   │   └── external-ehr-lab-results.json
│   │   ├── fhir-e2e-demo.sh
│   │   ├── README.md
│   │   ├── RECORDING_GUIDE.md
│   │   └── smoke-tests.sh
│   ├── 📁 docker
│   │   └── init-db.sql
│   ├── 📁 docs
│   │   ├── 📁 deployment
│   │   │   └── blue-green-deployment.md
│   │   ├── 📁 disaster-recovery
│   │   │   ├── disaster-recovery-plan.md
│   │   │   └── test-results.md
│   │   ├── 📁 monitoring
│   │   │   ├── apm-setup.md
│   │   │   ├── business-metrics-dashboard.md
│   │   │   └── synthetic-monitoring.md
│   │   ├── 📁 performance
│   │   │   ├── database-read-replicas.md
│   │   │   └── load-testing-guide.md
│   │   ├── 📁 runbooks
│   │   │   ├── API_SERVER_DOWN.md
│   │   │   ├── api-server-down.md
│   │   │   ├── audit-log-review.md
│   │   │   ├── backup-restoration.md
│   │   │   ├── DATA_BREACH_RESPONSE.md
│   │   │   ├── DATABASE_FAILURE.md
│   │   │   ├── database-connection-failure.md
│   │   │   ├── deployment-rollback.md
│   │   │   ├── DISASTER_RECOVERY_PLAN.md
│   │   │   ├── email-delivery-failure.md
│   │   │   ├── HIPAA_AUDIT_LOG_FAILURE.md
│   │   │   ├── hipaa-breach-notification.md
│   │   │   ├── key-rotation.md
│   │   │   ├── performance-degradation.md
│   │   │   ├── REDIS_FAILURE.md
│   │   │   ├── SECURITY_INCIDENT.md
│   │   │   └── security-incident-response.md
│   │   ├── 📁 security
│   │   │   └── security-audit-guide.md
│   │   ├── Asclepius-Protocol-V1.0.txt
│   │   ├── AUDIT_LOGGING_VERIFICATION.md
│   │   ├── BAA_VENDOR_OUTREACH_PLAN.md
│   │   ├── BEMI_AUDIT_SETUP.md
│   │   ├── BEMI_POSTGRESQL_SETUP.md
│   │   ├── CALENDAR_SYNC_SETUP.md
│   │   ├── CASBIN_RBAC_GUIDE.md
│   │   ├── CI-CD-SETUP.md
│   │   ├── CLINICAL_WORKFLOW_VERIFICATION.md
│   │   ├── DATABASE_TUNING.md
│   │   ├── DEPLOYMENT_CHECKLIST.md
│   │   ├── DEPLOYMENT-README.md
│   │   ├── DEPLOYMENT-VPS.md
│   │   ├── DEV_SETUP.md
│   │   ├── FHIR_PRIVACY_DESIGN.md
│   │   ├── HIPAA_COMPLIANCE_CHECKLIST.md
│   │   ├── HIPAA_FHIR_COMPLIANCE.md
│   │   ├── HIPAA_RISK_ASSESSMENT.md
│   │   ├── INCIDENT_RESPONSE_PLAN.md
│   │   ├── LOG_RETENTION_POLICY.md
│   │   ├── MEDPLUM_INTEGRATION.md
│   │   ├── ON_CALL_GUIDE.md
│   │   ├── OPEN_SOURCE_ACCELERATION_TOOLS.md
│   │   ├── OPS_MANUAL.md
│   │   ├── PHI_HANDLING.md
│   │   ├── PRODUCTION_READINESS_STATUS.md
│   │   ├── RATE_LIMITING.md
│   │   ├── SECURITY_GUIDELINES.md
│   │   ├── SECURITY_HEADERS_GUIDE.md
│   │   ├── SECURITY_HEADERS.md
│   │   ├── SESSION_REVOCATION_GUIDE.md
│   │   ├── SYNTHEA_DEMO_DATA.md
│   │   ├── TEST_COVERAGE_PLAN.md
│   │   ├── TESTING_QUICK_START.md
│   │   ├── TESTING_TROUBLESHOOTING.md
│   │   ├── TRANSPARENT_ENCRYPTION_GUIDE.md
│   │   ├── TYPESCRIPT_ERRORS_REMAINING.md
│   │   ├── WAL_ARCHIVING_PITR.md
│   │   ├── WHATS_LEFT_MASTER_PLAN.md
│   │   └── WORKFORCE_TRAINING_PLAN.md
│   ├── 📁 Images to use for dashboard
│   │   ├── artificial-intelligence (1).svg
│   │   ├── artificial-intelligence.svg
│   │   ├── calendar (1).svg
│   │   ├── calendar.svg
│   │   ├── chart-cured-increasing (1).svg
│   │   ├── chart-cured-increasing.svg
│   │   ├── clinical-f (1).svg
│   │   ├── clinical-f.svg
│   │   ├── communication (1).svg
│   │   ├── communication.svg
│   │   ├── crisis-response_center_person.svg
│   │   ├── diagnostics (1).svg
│   │   ├── diagnostics.svg
│   │   ├── doctor (1).svg
│   │   ├── doctor-female (1).svg
│   │   ├── doctor-female.svg
│   │   ├── doctor-male (1).svg
│   │   ├── doctor-male.svg
│   │   ├── doctor.svg
│   │   ├── forum (1).svg
│   │   ├── forum.svg
│   │   ├── head (1).svg
│   │   ├── head.svg
│   │   ├── health (1).svg
│   │   ├── health (2).svg
│   │   ├── health (3).svg
│   │   ├── health-alt (1).svg
│   │   ├── health-alt.svg
│   │   ├── health-worker_form (1).svg
│   │   ├── health-worker_form.svg
│   │   ├── health.svg
│   │   ├── i-note_action (1).svg
│   │   ├── i-note_action.svg
│   │   ├── malnutrition (1).svg
│   │   ├── malnutrition.svg
│   │   ├── people (1).svg
│   │   ├── people.svg
│   │   ├── rx (1).svg
│   │   ├── rx.svg
│   │   ├── Sleek_DNA_Strand_H_Video_Generation.mp4
│   │   ├── speech-language_therapy (1).svg
│   │   ├── speech-language_therapy.svg
│   │   ├── stethoscope (1).svg
│   │   ├── stethoscope.svg
│   │   ├── telemedicine (1).svg
│   │   └── telemedicine.svg
│   ├── 📁 infra
│   │   ├── 📁 deploy
│   │   │   ├── deploy-production.sh
│   │   │   ├── DEPLOYMENT_RUNBOOK.md
│   │   │   └── README.md
│   │   ├── 📁 docker
│   │   │   ├── docker-compose.dev.yml
│   │   │   └── docker-compose.yml
│   │   ├── 📁 migrations
│   │   │   └── 001_init_rls_and_audit.sql
│   │   └── 📁 monitoring
│   │       ├── 📁 alerts
│   │       │   └── fhir-alerts.yml
│   │       ├── alertmanager.yml
│   │       ├── docker-compose.monitoring.yml
│   │       ├── grafana-dashboard-config.yml
│   │       ├── grafana-dashboard.json
│   │       ├── grafana-datasources.yml
│   │       ├── pagerduty-alerts.yaml
│   │       ├── prometheus.yml
│   │       └── README.md
│   ├── 📁 k6
│   │   ├── 📁 scenarios
│   │   │   ├── 01-login-surge.js
│   │   │   ├── 02-appointment-booking-peak.js
│   │   │   ├── 03-soap-note-generation.js
│   │   │   ├── 04-patient-portal-traffic.js
│   │   │   └── 05-api-stress-test.js
│   │   ├── .env.test.example
│   │   ├── config.json
│   │   ├── README.md
│   │   └── run-tests.sh
│   ├── 📁 learning-content
│   │   ├── transcript_interactive_quiz.html
│   │   ├── transcript_learning_content.json
│   │   └── transcript_study_guide.md
│   ├── 📁 legal
│   │   ├── BAA_TEMPLATE.md
│   │   ├── DPA_TEMPLATE.md
│   │   └── VENDOR_BAA_CHECKLIST.md
│   ├── 📁 Marketing
│   │   ├── 📁 Assets
│   │   │   ├── Gemini_Generated_Image_mccwy6mccwy6mccw.jpeg
│   │   │   ├── Gemini_Generated_Image_umwja9umwja9umwj (1).jpeg
│   │   │   ├── Gemini_Generated_Image_umwja9umwja9umwj.jpeg
│   │   │   ├── lab test demo .webp
│   │   │   ├── Landing Page Image 1.jpeg
│   │   │   ├── Landing Page Template.jpeg
│   │   │   ├── Logo + Color Palette_Holi Labs (4).png
│   │   │   ├── Logo 1_Dark (1).svg
│   │   │   ├── Logo 1_Dark.png
│   │   │   ├── Logo 1_Dark.svg
│   │   │   ├── Logo 1_Light (1).png
│   │   │   ├── Logo 1_Light.svg
│   │   │   ├── Mockup-of-a-consultation-note.png
│   │   │   └── Template-for-Discharge-Summary.ppm
│   │   └── Landing page holilabsv2.jpeg
│   ├── 📁 monitoring
│   │   └── alert-config.yml
│   ├── 📁 nginx
│   │   ├── 📁 ssl
│   │   │   ├── .gitignore
│   │   │   └── README.md
│   │   └── nginx.conf
│   ├── 📁 packages
│   │   ├── 📁 deid
│   │   │   ├── 📁 src
│   │   │   │   ├── dicom.d.ts
│   │   │   │   ├── dicom.d.ts.map
│   │   │   │   ├── dicom.js
│   │   │   │   ├── dicom.js.map
│   │   │   │   ├── dicom.ts
│   │   │   │   ├── differential-privacy.d.ts
│   │   │   │   ├── differential-privacy.d.ts.map
│   │   │   │   ├── differential-privacy.js
│   │   │   │   ├── differential-privacy.ts
│   │   │   │   ├── generalize.d.ts
│   │   │   │   ├── generalize.d.ts.map
│   │   │   │   ├── generalize.js
│   │   │   │   ├── generalize.js.map
│   │   │   │   ├── generalize.ts
│   │   │   │   ├── hybrid-deid.ts
│   │   │   │   ├── index.d.ts
│   │   │   │   ├── index.d.ts.map
│   │   │   │   ├── index.js
│   │   │   │   ├── index.js.map
│   │   │   │   ├── index.ts
│   │   │   │   ├── k-anonymity.d.ts
│   │   │   │   ├── k-anonymity.d.ts.map
│   │   │   │   ├── k-anonymity.js
│   │   │   │   ├── k-anonymity.ts
│   │   │   │   ├── nlp-redaction.d.ts
│   │   │   │   ├── nlp-redaction.d.ts.map
│   │   │   │   ├── nlp-redaction.js
│   │   │   │   ├── nlp-redaction.ts
│   │   │   │   ├── ocr.d.ts
│   │   │   │   ├── ocr.d.ts.map
│   │   │   │   ├── ocr.js
│   │   │   │   ├── ocr.js.map
│   │   │   │   ├── ocr.ts
│   │   │   │   ├── presidio-integration.ts
│   │   │   │   ├── privacy-budget.d.ts
│   │   │   │   ├── privacy-budget.d.ts.map
│   │   │   │   ├── privacy-budget.js
│   │   │   │   ├── privacy-budget.ts
│   │   │   │   ├── pseudonymization.ts
│   │   │   │   ├── pseudonymize.d.ts
│   │   │   │   ├── pseudonymize.d.ts.map
│   │   │   │   ├── pseudonymize.js
│   │   │   │   ├── pseudonymize.js.map
│   │   │   │   ├── pseudonymize.ts
│   │   │   │   ├── redact.d.ts
│   │   │   │   ├── redact.d.ts.map
│   │   │   │   ├── redact.js
│   │   │   │   ├── redact.js.map
│   │   │   │   ├── redact.ts
│   │   │   │   ├── types.d.ts
│   │   │   │   ├── types.d.ts.map
│   │   │   │   ├── types.js
│   │   │   │   ├── types.js.map
│   │   │   │   └── types.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── 📁 document-parser
│   │   │   ├── Dockerfile
│   │   │   ├── parse.py
│   │   │   └── requirements.txt
│   │   ├── 📁 dp
│   │   │   ├── 📁 src
│   │   │   │   ├── accountant.d.ts
│   │   │   │   ├── accountant.d.ts.map
│   │   │   │   ├── accountant.js
│   │   │   │   ├── accountant.js.map
│   │   │   │   ├── accountant.ts
│   │   │   │   ├── index.d.ts
│   │   │   │   ├── index.d.ts.map
│   │   │   │   ├── index.js
│   │   │   │   ├── index.js.map
│   │   │   │   ├── index.ts
│   │   │   │   ├── noise.d.ts
│   │   │   │   ├── noise.d.ts.map
│   │   │   │   ├── noise.js
│   │   │   │   ├── noise.js.map
│   │   │   │   ├── noise.ts
│   │   │   │   ├── receipt.d.ts
│   │   │   │   ├── receipt.d.ts.map
│   │   │   │   ├── receipt.js
│   │   │   │   ├── receipt.js.map
│   │   │   │   ├── receipt.ts
│   │   │   │   ├── types.d.ts
│   │   │   │   ├── types.d.ts.map
│   │   │   │   ├── types.js
│   │   │   │   ├── types.js.map
│   │   │   │   └── types.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── 📁 policy
│   │   │   ├── export_dp.rego
│   │   │   ├── purpose_binding.rego
│   │   │   └── residency.rego
│   │   ├── 📁 schemas
│   │   │   ├── 📁 src
│   │   │   │   ├── analytics.schema.ts
│   │   │   │   ├── appointment.schema.ts
│   │   │   │   ├── clinical.schema.ts
│   │   │   │   ├── compliance.schema.ts
│   │   │   │   ├── constants.ts
│   │   │   │   ├── index.d.ts
│   │   │   │   ├── index.d.ts.map
│   │   │   │   ├── index.js
│   │   │   │   ├── index.js.map
│   │   │   │   ├── index.ts
│   │   │   │   ├── patient.schema.ts
│   │   │   │   ├── prescription.schema.ts
│   │   │   │   └── user.schema.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   └── 📁 utils
│   │       ├── 📁 src
│   │       │   ├── canonical-serializer.ts
│   │       │   ├── crypto.d.ts
│   │       │   ├── crypto.d.ts.map
│   │       │   ├── crypto.js
│   │       │   ├── crypto.js.map
│   │       │   ├── crypto.ts
│   │       │   ├── index.d.ts
│   │       │   ├── index.d.ts.map
│   │       │   ├── index.js
│   │       │   ├── index.js.map
│   │       │   ├── index.ts
│   │       │   ├── logger.d.ts
│   │       │   ├── logger.d.ts.map
│   │       │   ├── logger.js
│   │       │   ├── logger.js.map
│   │       │   └── logger.ts
│   │       ├── package.json
│   │       └── tsconfig.json
│   ├── 📁 prisma
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── 📁 public
│   │   ├── 📁 images
│   │   │   ├── artificial-intelligence.svg
│   │   │   ├── bio-adaptive-hero-bg.jpeg
│   │   │   ├── futuristic-clinic-alt-1.jpg
│   │   │   ├── futuristic-clinic-alt-2.jpg
│   │   │   ├── futuristic-clinic-command-center.jpg
│   │   │   └── futuristic-health-command-center.jpeg
│   │   └── landing.html
│   ├── 📁 scripts
│   │   ├── 📁 blue-green
│   │   │   ├── get-active-environment.sh
│   │   │   ├── health-check.sh
│   │   │   ├── monitor-deployment.sh
│   │   │   ├── monitor-production.sh
│   │   │   ├── rollback.sh
│   │   │   └── switch-traffic.sh
│   │   ├── add-ts-ignore-missing-models.js
│   │   ├── backup-database.sh
│   │   ├── check-audit-coverage.sh
│   │   ├── check-translations.js
│   │   ├── comment-missing-models.js
│   │   ├── comment-out-missing-models.sh
│   │   ├── dr-test.sh
│   │   ├── encrypt-existing-phi.ts
│   │   ├── expo-go-qr.mjs
│   │   ├── fix-audit-detail-types.js
│   │   ├── fix-audit-details.js
│   │   ├── fix-audit-errors-pass2.js
│   │   ├── fix-audit-errors.js
│   │   ├── fix-audit-ipaddress.js
│   │   ├── fix-audit-logging.sh
│   │   ├── fix-audit-request-param.js
│   │   ├── fix-audit-syntax.js
│   │   ├── fix-audit-useragent-request.js
│   │   ├── fix-duplicate-properties.js
│   │   ├── fix-implicit-any-routes.js
│   │   ├── fix-orderby-timestamp.js
│   │   ├── generate-cosign-keys.sh
│   │   ├── generate-synthea-fhir-docker.sh
│   │   ├── generate-synthea-patients.sh
│   │   ├── generate-synthetic-data.ts
│   │   ├── init-casbin.ts
│   │   ├── install-pre-commit-hook.sh
│   │   ├── load-test-api.js
│   │   ├── pre-commit-hook.sh
│   │   ├── restore-database.sh
│   │   ├── run-dast-scan.sh
│   │   ├── seed-patients.ts
│   │   ├── seed-synthea-demo.sh
│   │   ├── setup-calendar-oauth.sh
│   │   ├── setup-git-secrets.sh
│   │   ├── setup-pgvector.sql
│   │   ├── setup-swap.sh
│   │   ├── setup-testing-tools.sh
│   │   ├── setup.sh
│   │   ├── test-cosign-signing.sh
│   │   ├── test-monitoring.sh
│   │   └── test-restore.sh
│   ├── 📁 test-files
│   │   └── test-lab-result.txt
│   ├── 📁 tests
│   │   ├── 📁 e2e
│   │   │   ├── 01-patient-registration.spec.ts
│   │   │   └── 02-prescription-creation.spec.ts
│   │   └── 📁 load
│   │       ├── api-baseline.js
│   │       └── prescription-load.js
│   ├── .commitlintrc.json
│   ├── .dockerignore
│   ├── .env.example
│   ├── .env.production.secrets.template
│   ├── .git-secrets-patterns.txt
│   ├── .gitallowed
│   ├── .gitignore
│   ├── .gitleaks.toml
│   ├── .lighthouserc.json
│   ├── AB_TESTING_DEPLOYMENT_CHECKLIST.md
│   ├── AB_TESTING_GUIDE.md
│   ├── AB_TESTING_READINESS.md
│   ├── ACCESSIBILITY_AUDIT.md
│   ├── AEGIS_ARCHITECTURE.md
│   ├── AGENT_26_COMPLETION_REPORT.md
│   ├── AGENT_26_FILE_TREE.md
│   ├── AI_CONFIDENCE_SCORING_IMPLEMENTATION.md
│   ├── AI_SCRIBE_PRIVACY_IMPLEMENTATION.md
│   ├── AI-INFRASTRUCTURE-DEPLOYMENT.md
│   ├── ANALYTICS_IMPLEMENTATION_COMPLETE.md
│   ├── ANALYTICS_MONITORING_COMPLETE.md
│   ├── ANALYTICS_SETUP.md
│   ├── app-spec.yaml
│   ├── APPOINTMENT_CONFLICT_DETECTION.md
│   ├── AUDIT_LOGGING_IMPROVEMENTS.md
│   ├── BAA_EMAIL_TEMPLATES_READY_TO_SEND.md
│   ├── BACKEND_APIS_COMPLETE.md
│   ├── BACKEND_COMPLETION_SUMMARY.md
│   ├── BACKEND_ROADMAP.md
│   ├── BLOCKING_TASKS_COMPLETE.md
│   ├── BRANCH_PROTECTION_SETUP.md
│   ├── BRAZILIAN-HEALTH-INTEROPERABILITY.md
│   ├── BUILD_REMEDIATION_REPORT.md
│   ├── BUILD_SUCCESS_TYPESCRIPT_FIXES.md
│   ├── CASE_STUDIES_HEALTH_3.0.md
│   ├── CDSS_IMPLEMENTATION_GUIDE.md
│   ├── check-appointments.sql
│   ├── CICD_PIPELINE_AUDIT.md
│   ├── CICD_QUICK_REFERENCE.md
│   ├── CLAUDE.md
│   ├── CLINICAL_NOTE_VERSIONING.md
│   ├── COMPLETE_APPOINTMENT_SYSTEM_SETUP.md
│   ├── COMPLETE_IMPLEMENTATION_CHECKLIST.md
│   ├── COMPLETE_IMPLEMENTATION_SUMMARY.md
│   ├── CONFIRMATION_SYSTEM_SETUP.md
│   ├── COSIGN_IMAGE_SIGNING_GUIDE.md
│   ├── COSIGN_IMPLEMENTATION_COMPLETE.md
│   ├── COSIGN_QUICK_REFERENCE.md
│   ├── cosign.pub
│   ├── CRITICAL_GAPS_AND_FIXES.md
│   ├── CURRENT_STATUS.md
│   ├── DAST_IMPLEMENTATION_COMPLETE.md
│   ├── DAST_QUICK_REFERENCE.md
│   ├── DAST_SECURITY_GUIDE.md
│   ├── DATA_SUPREMACY.md
│   ├── deploy-production.sh
│   ├── DEPLOY.md
│   ├── deploy.sh
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── DEPLOYMENT_FAILURE_PREVENTION.md
│   ├── DEPLOYMENT_FIX_SUMMARY.md
│   ├── DEPLOYMENT_FIX.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── DEPLOYMENT_INSTRUCTIONS.md
│   ├── DEPLOYMENT_QUICK_START.md
│   ├── DEPLOYMENT_READY_STATUS.md
│   ├── DEPLOYMENT_READY.md
│   ├── DEPLOYMENT_SECRETS_CHECKLIST.md
│   ├── DEPLOYMENT_SUCCESS.md
│   ├── DEPLOYMENT_SUMMARY.md
│   ├── DEPLOYMENT_VERIFICATION.md
│   ├── DEPLOYMENT-CHECKLIST.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT_SESSION_SUMMARY.md
│   ├── DICOM_METADATA_SUPPORT.md
│   ├── DIGITALOCEAN_DEPLOYMENT.md
│   ├── DIGITALOCEAN_DROPLET_DEPLOYMENT.md
│   ├── DIGITALOCEAN_ENV_SETUP.md
│   ├── DIGITALOCEAN_ENV_VARS.txt
│   ├── DOCKER_WORKFLOW.md
│   ├── docker-compose.presidio.yml
│   ├── docker-compose.prod.yml
│   ├── docker-compose.testing.yml
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── DOMAIN_MIGRATION_HOLILABS.xyz.md
│   ├── DROPLET_MASTER_PROMPT.md
│   ├── ENTERPRISE_COMPLETE_SUMMARY.md
│   ├── ENTERPRISE_READINESS_PROGRESS.md
│   ├── ENVIRONMENT_COMPARISON_MATRIX.md
│   ├── ENVIRONMENT_SETUP_README.md
│   ├── ENVIRONMENT_SETUP_SUMMARY.md
│   ├── ENVIRONMENT_STATUS.md
│   ├── EXECUTION_SUMMARY.md
│   ├── expo-connect.html
│   ├── expo-go-qr.png
│   ├── expo-go-url.txt
│   ├── expo-qr-code.html
│   ├── FEATURE_FLAGS_GUIDE.md
│   ├── FINAL_DEPLOYMENT_STATUS.md
│   ├── fix-error-exposure.sh
│   ├── FIXES_SUMMARY.md
│   ├── FUNNELS_AND_DASHBOARDS_GUIDE.md
│   ├── GETTING_STARTED.md
│   ├── GITHUB_BRANCH_PROTECTION_SETUP.md
│   ├── GITHUB_RESEARCH_PLAN.md
│   ├── gitleaks-report.json
│   ├── GOOGLE_CLOUD_SQL_DEPLOYMENT.md
│   ├── GOOGLE_OAUTH_SETUP.md
│   ├── GTM_COMPETITIVE_POSITIONING.md
│   ├── HIPAA_BAA_REQUIREMENTS.md
│   ├── HOLILABS_BRIEFING_DOCUMENT.md
│   ├── HOLILABS_XYZ_DEPLOYMENT.md
│   ├── HYBRID_DEID_IMPLEMENTATION.md
│   ├── IMMEDIATE_ACTION_PLAN.md
│   ├── IMMEDIATE_NEXT_ACTIONS.md
│   ├── IMMEDIATE_SECURITY_ACTIONS.md
│   ├── IMPLEMENTATION_NOTES.md
│   ├── IMPLEMENTATION_STATUS.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── IMPROVEMENTS_IMPLEMENTATION.md
│   ├── INDUSTRY_GRADE_GAPS.md
│   ├── INFRASTRUCTURE_AUTOMATION_DEPLOYMENT.md
│   ├── INTRO_AND_GOOGLE_AUTH_IMPLEMENTATION.md
│   ├── INVITATION_SYSTEM_GUIDE.md
│   ├── IPHONE_PWA_TEST_RESULTS.md
│   ├── K6_LOAD_TESTING_COMPLETE.md
│   ├── K6_QUICK_START.md
│   ├── LANDING_PAGE_UPGRADE_SUMMARY.md
│   ├── landing-page.html
│   ├── launch-expo-go.sh
│   ├── LIQUID_CLINICAL_REFACTOR_SUMMARY.md
│   ├── LOCAL_DEVELOPMENT_SETUP.md
│   ├── LOCAL_ENV_SETUP_GUIDE.md
│   ├── MAJOR_LANDING_PAGE_REDESIGN.md
│   ├── MEDICAL_LICENSE_VERIFICATION.md
│   ├── MIGRATION_SUMMARY.md
│   ├── MONETIZATION_STRATEGY.md
│   ├── MONITORING_QUICK_REFERENCE.md
│   ├── MONITORING_SETUP_GUIDE.md
│   ├── MONITORING_SETUP_INSTRUCTIONS.md
│   ├── MONITORING_SETUP.md
│   ├── NAVIGATION_IMPROVEMENTS.md
│   ├── NEXT_STEPS_IMPLEMENTATION.md
│   ├── NORDVPN_FLAGGING_IMMEDIATE_ACTIONS.md
│   ├── OPEN_SOURCE_RESEARCH_FINDINGS.md
│   ├── package.json
│   ├── PATIENT_PORTAL_IMPROVEMENTS.md
│   ├── PATIENT_PORTAL_README.md
│   ├── PEQUENO-COTOLENGO-PILOT.md
│   ├── PERFORMANCE_MONITORING.md
│   ├── PHASE_2_CLINICAL_DECISION_SUPPORT_COMPLETE.md
│   ├── PHASE_2_COMPLETED.md
│   ├── PHASE_2_COMPLETION.md
│   ├── PHASE_2_SMART_TEMPLATES_COMPLETE.md
│   ├── PHASE_3_2_QUICK_ACTIONS_COMPLETE.md
│   ├── PHASE_3_3_VOICE_COMMANDS_COMPLETE.md
│   ├── PHASE_3_PRIORITY_DASHBOARD_COMPLETE.md
│   ├── PHASE_4_MAR_COMPLETE.md
│   ├── PHASE_5_SCHEDULING_PLAN.md
│   ├── PHASE1_IMPLEMENTATION_SUMMARY.md
│   ├── PHASE2_QUICK_WINS_COMPLETE.md
│   ├── PINO_IMPLEMENTATION.md
│   ├── playwright.config.ts
│   ├── pnpm-lock.yaml
│   ├── pnpm-workspace.yaml
│   ├── POSTHOG_PRODUCTION_SETUP_GUIDE.md
│   ├── PRESIDIO_DEPLOYMENT_GUIDE.md
│   ├── PRESIDIO_HYBRID_DEID_GUIDE.md
│   ├── PREVENTION_HUB_IMPLEMENTATION.md
│   ├── PRICING_IMPLEMENTATION_SUMMARY.md
│   ├── PRIVACY_CONSENT_IMPLEMENTATION_COMPLETE.md
│   ├── PRODUCT_CAPABILITIES.md
│   ├── PRODUCT_ROADMAP_2025.md
│   ├── PRODUCT_ROADMAP.md
│   ├── PRODUCTION_DEPLOYMENT_GUIDE.md
│   ├── PRODUCTION_LAUNCH_CHECKLIST.md
│   ├── PRODUCTION_READINESS_CHECKLIST.md
│   ├── PRODUCTION_READINESS.md
│   ├── PRODUCTION_READY_SUMMARY.md
│   ├── PROJECT_SNAPSHOT.md
│   ├── PROJECT_SUMMARY.md
│   ├── PUSH_NOTIFICATION_DIAGRAMS.md
│   ├── QUICK_DEPLOYMENT_GUIDE.md
│   ├── QUICK_REFERENCE.md
│   ├── QUICK_START_GOOGLE_AUTH.md
│   ├── QUICK_START_INVITATION_SYSTEM.md
│   ├── QUICK_START_LOCAL.md
│   ├── QUICK_WINS_COMPLETE.md
│   ├── QUICK_WINS_IMPLEMENTED.md
│   ├── QUICKSTART_DIGITALOCEAN.md
│   ├── README_TRANSCRIPT_QUIZ.md
│   ├── README.md
│   ├── REALTIME_AND_OFFLINE_AI_IMPLEMENTATION.md
│   ├── RED_TEAM_AUDIT_REPORT.md
│   ├── RED_TEAM_REPORT.md
│   ├── REDIS_CACHING_IMPLEMENTATION.md
│   ├── REFERRAL_SYSTEM_COMPLETE.md
│   ├── RLHF_IMPLEMENTATION_GUIDE.md
│   ├── ROADMAP.md
│   ├── SCHEMA_MIGRATION_GUIDE.md
│   ├── SECRETS_GENERATION.md
│   ├── SECURITY_AUDIT_REPORT_2025-01-08.md
│   ├── SECURITY_AUDIT_REPORT.md
│   ├── SECURITY_DEPLOYMENT_CHECKLIST.md
│   ├── SECURITY_FIXES_SUMMARY_2025-01-08.md
│   ├── SECURITY_FIXES_SUMMARY.md
│   ├── SECURITY_HARDENING_REPORT.md
│   ├── SECURITY_QUICK_REFERENCE.md
│   ├── SECURITY_REVOCATION_ADVISORY.md
│   ├── SECURITY_SECRET_ROTATION_PLAN.md
│   ├── SECURITY.md
│   ├── SENTRY_SETUP.md
│   ├── SESSION_COMPLETE_SUMMARY.md
│   ├── SESSION_FINAL_SUMMARY_OCT_26.md
│   ├── SESSION_SUMMARY_JAN_15_2025.md
│   ├── SESSION_SUMMARY_OCT_26_2025.md
│   ├── SESSION_SUMMARY.md
│   ├── setup-git-secrets.sh
│   ├── setup-invitation-system.sh
│   ├── SOC2_PHASE1_COMPLETE.md
│   ├── SOC2_PHASE1_IMPLEMENTATION_SUMMARY.md
│   ├── SOC2_PHASE1_WEEK3_CASBIN_COMPLETE.md
│   ├── STABILIZATION_REPORT.md
│   ├── START_HERE.md
│   ├── start-expo.sh
│   ├── TECHNICAL_FIXES_SUMMARY.md
│   ├── Test
│   ├── test-quick-wins.sh
│   ├── test-whatsapp.sh
│   ├── TESTING_GUIDE_PHASE_2.md
│   ├── transcript-to-quiz.js
│   ├── tsconfig.json
│   ├── turbo.json
│   ├── TWILIO_SETUP_QUICKSTART.md
│   ├── update-env-keys.sh
│   ├── verify_deepgram_scribe.py
│   ├── VISION_AND_ROADMAP.md
│   ├── WEB_PUSH_NOTIFICATIONS_COMPLETE.md
│   ├── WEBSITE_SECURITY_FLAGGING_FIX.md
│   ├── WEEK-1-PROGRESS.md
│   └── WORKFLOW_EXPLAINED.md
├── 📁 p1-ai-validation
│   ├── 📁 .claude
│   │   └── memory.md
│   ├── 📁 .github
│   │   ├── 📁 workflows
│   │   │   ├── cdss-performance-test.yml
│   │   │   ├── ci-cd.yml
│   │   │   ├── ci.yml
│   │   │   ├── coverage-report.yml
│   │   │   ├── dast-scan.yml
│   │   │   ├── database-backup.yml
│   │   │   ├── deploy-production.yml
│   │   │   ├── deploy-staging.yml
│   │   │   ├── deploy-vps.yml
│   │   │   ├── deploy.yml
│   │   │   ├── disaster-recovery-test.yml
│   │   │   ├── health-check.yml
│   │   │   ├── load-testing.yml
│   │   │   ├── pr-checks.yml
│   │   │   ├── security-enhanced.yml
│   │   │   ├── sign-and-verify-images.yml
│   │   │   └── test.yml
│   │   ├── dependabot.yml
│   │   └── PULL_REQUEST_TEMPLATE_SECURITY.md
│   ├── 📁 .husky
│   │   └── pre-commit
│   ├── 📁 .zap
│   │   └── rules.tsv
│   ├── 📁 apps
│   │   ├── 📁 api
│   │   │   ├── 📁 prisma
│   │   │   │   ├── 📁 migrations
│   │   │   │   │   ├── 📁 20251004060226_init
              └── ... (truncated)
│   │   │   │   │   └── migration_lock.toml
│   │   │   │   ├── schema.prisma
│   │   │   │   └── seed.ts
│   │   │   ├── 📁 scripts
│   │   │   │   ├── check-env.sh
│   │   │   │   └── healthcheck.sh
│   │   │   ├── 📁 src
│   │   │   │   ├── 📁 lib
│   │   │   │   │   ├── env-validation.ts
│   │   │   │   │   └── prisma-fhir-middleware.ts
│   │   │   │   ├── 📁 plugins
│   │   │   │   │   └── metrics-middleware.ts
│   │   │   │   ├── 📁 routes
│   │   │   │   │   ├── admin.d.ts
│   │   │   │   │   ├── admin.d.ts.map
│   │   │   │   │   ├── admin.js
│   │   │   │   │   ├── admin.js.map
│   │   │   │   │   ├── admin.ts
│   │   │   │   │   ├── ai.d.ts
│   │   │   │   │   ├── ai.d.ts.map
│   │   │   │   │   ├── ai.js
│   │   │   │   │   ├── ai.js.map
│   │   │   │   │   ├── ai.ts
│   │   │   │   │   ├── auth.d.ts
│   │   │   │   │   ├── auth.d.ts.map
│   │   │   │   │   ├── auth.js
│   │   │   │   │   ├── auth.js.map
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── exports.d.ts
│   │   │   │   │   ├── exports.d.ts.map
│   │   │   │   │   ├── exports.js
│   │   │   │   │   ├── exports.js.map
│   │   │   │   │   ├── exports.ts
│   │   │   │   │   ├── fhir-admin.ts
│   │   │   │   │   ├── fhir-export.ts
│   │   │   │   │   ├── fhir-ingress.ts
│   │   │   │   │   ├── monitoring.ts
│   │   │   │   │   ├── patients.d.ts
│   │   │   │   │   ├── patients.d.ts.map
│   │   │   │   │   ├── patients.js
│   │   │   │   │   ├── patients.js.map
│   │   │   │   │   ├── patients.ts
│   │   │   │   │   ├── upload.d.ts
│   │   │   │   │   ├── upload.d.ts.map
│   │   │   │   │   ├── upload.js
│   │   │   │   │   ├── upload.js.map
│   │   │   │   │   └── upload.ts
│   │   │   │   ├── 📁 services
│   │   │   │   │   ├── 📁 monitoring
              └── ... (truncated)
│   │   │   │   │   ├── fhir-audit-mirror.ts
│   │   │   │   │   ├── fhir-queue.ts
│   │   │   │   │   ├── fhir-reconciliation.ts
│   │   │   │   │   ├── fhir-sync-enhanced.ts
│   │   │   │   │   └── fhir-sync.ts
│   │   │   │   ├── index.d.ts
│   │   │   │   ├── index.d.ts.map
│   │   │   │   ├── index.js
│   │   │   │   ├── index.js.map
│   │   │   │   └── index.ts
│   │   │   ├── 📁 tests
│   │   │   │   ├── fhir-export.test.ts
│   │   │   │   ├── fhir-ingress.test.ts
│   │   │   │   ├── fhir-reconciliation.test.ts
│   │   │   │   └── setup.ts
│   │   │   ├── Dockerfile
│   │   │   ├── package.json
│   │   │   ├── tsconfig.json
│   │   │   └── vitest.config.ts
│   │   ├── 📁 messages
│   │   │   ├── en.json
│   │   │   ├── es.json
│   │   │   └── pt.json
│   │   ├── 📁 mobile
│   │   │   ├── 📁 assets
│   │   │   │   ├── generate_splash.py
│   │   │   │   ├── generate-assets.md
│   │   │   │   ├── icon-template.svg
│   │   │   │   ├── README.md
│   │   │   │   └── splash-template.svg
│   │   │   ├── 📁 src
│   │   │   │   ├── 📁 components
│   │   │   │   │   ├── 📁 ui
              └── ... (truncated)
│   │   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   │   ├── LoadingScreen.tsx
│   │   │   │   │   └── WebSocketStatus.tsx
│   │   │   │   ├── 📁 config
│   │   │   │   │   ├── api.d.ts
│   │   │   │   │   ├── api.d.ts.map
│   │   │   │   │   ├── api.js
│   │   │   │   │   ├── api.js.map
│   │   │   │   │   ├── api.ts
│   │   │   │   │   ├── appTheme.ts
│   │   │   │   │   ├── designTokens.ts
│   │   │   │   │   ├── queryClient.ts
│   │   │   │   │   ├── theme.d.ts
│   │   │   │   │   ├── theme.d.ts.map
│   │   │   │   │   ├── theme.js
│   │   │   │   │   ├── theme.js.map
│   │   │   │   │   └── theme.ts
│   │   │   │   ├── 📁 features
│   │   │   │   │   ├── 📁 auth
              └── ... (truncated)
│   │   │   │   │   ├── 📁 onboarding
              └── ... (truncated)
│   │   │   │   │   ├── 📁 patients
              └── ... (truncated)
│   │   │   │   │   ├── 📁 prevention
              └── ... (truncated)
│   │   │   │   │   ├── 📁 recording
              └── ... (truncated)
│   │   │   │   │   └── 📁 transcription
              └── ... (truncated)
│   │   │   │   ├── 📁 hooks
│   │   │   │   │   ├── useAccessibility.ts
│   │   │   │   │   ├── useBiometricAuth.ts
│   │   │   │   │   ├── useNotifications.ts
│   │   │   │   │   ├── useOfflineSync.ts
│   │   │   │   │   ├── useSplashScreen.ts
│   │   │   │   │   ├── useTheme.ts
│   │   │   │   │   └── useWebSocket.ts
│   │   │   │   ├── 📁 navigation
│   │   │   │   │   ├── AppNavigator.tsx
│   │   │   │   │   ├── AuthNavigator.d.ts
│   │   │   │   │   ├── AuthNavigator.d.ts.map
│   │   │   │   │   ├── AuthNavigator.js
│   │   │   │   │   ├── AuthNavigator.js.map
│   │   │   │   │   ├── AuthNavigator.tsx
│   │   │   │   │   ├── linking.ts
│   │   │   │   │   ├── MainNavigator.d.ts
│   │   │   │   │   ├── MainNavigator.d.ts.map
│   │   │   │   │   ├── MainNavigator.js
│   │   │   │   │   ├── MainNavigator.js.map
│   │   │   │   │   ├── MainNavigator.tsx
│   │   │   │   │   ├── RootNavigator.d.ts
│   │   │   │   │   ├── RootNavigator.d.ts.map
│   │   │   │   │   ├── RootNavigator.js
│   │   │   │   │   ├── RootNavigator.js.map
│   │   │   │   │   ├── RootNavigator.tsx
│   │   │   │   │   └── types.ts
│   │   │   │   ├── 📁 providers
│   │   │   │   │   └── WebSocketProvider.tsx
│   │   │   │   ├── 📁 screens
│   │   │   │   │   ├── AppointmentsScreen.tsx
│   │   │   │   │   ├── CoPilotScreen.tsx
│   │   │   │   │   ├── EnhancedLoginScreen.tsx
│   │   │   │   │   ├── HomeDashboardScreen.tsx
│   │   │   │   │   ├── MessagingScreen.tsx
│   │   │   │   │   ├── PatientDashboardScreen.tsx
│   │   │   │   │   ├── PatientSearchScreen.tsx
│   │   │   │   │   ├── PrivacyConsentScreen.tsx
│   │   │   │   │   ├── SettingsScreen.tsx
│   │   │   │   │   └── SmartDiagnosisScreen.tsx
│   │   │   │   ├── 📁 services
│   │   │   │   │   ├── analyticsService.tsx
│   │   │   │   │   ├── biometricAuth.ts
│   │   │   │   │   ├── haptics.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── notificationService.ts
│   │   │   │   │   └── websocket.ts
│   │   │   │   ├── 📁 shared
│   │   │   │   │   ├── 📁 components
              └── ... (truncated)
│   │   │   │   │   ├── 📁 contexts
              └── ... (truncated)
│   │   │   │   │   ├── 📁 services
              └── ... (truncated)
│   │   │   │   │   └── 📁 types
              └── ... (truncated)
│   │   │   │   ├── 📁 store
│   │   │   │   │   ├── authStore.d.ts
│   │   │   │   │   ├── authStore.d.ts.map
│   │   │   │   │   ├── authStore.js
│   │   │   │   │   ├── authStore.js.map
│   │   │   │   │   └── authStore.ts
│   │   │   │   └── 📁 stores
│   │   │   │       ├── appointmentStore.ts
│   │   │   │       ├── index.ts
│   │   │   │       ├── onboardingStore.ts
│   │   │   │       ├── patientStore.ts
│   │   │   │       ├── preventionStore.ts
│   │   │   │       └── recordingStore.ts
│   │   │   ├── .env.example
│   │   │   ├── .gitignore
│   │   │   ├── ACCESSIBILITY_GUIDE.md
│   │   │   ├── App.d.ts
│   │   │   ├── App.d.ts.map
│   │   │   ├── App.js
│   │   │   ├── App.js.map
│   │   │   ├── app.json
│   │   │   ├── App.tsx
│   │   │   ├── ARCHITECTURE_MASTER_PLAN.md
│   │   │   ├── babel.config.js
│   │   │   ├── BUGFIX_SESSION.md
│   │   │   ├── COMPONENT_EXAMPLES.md
│   │   │   ├── CURRENT_STATUS.md
│   │   │   ├── DEPLOYMENT.md
│   │   │   ├── DEVELOPMENT_PROGRESS.md
│   │   │   ├── eas.json
│   │   │   ├── EXPO_GO_QUICKSTART.md
│   │   │   ├── IMPLEMENTATION_COMPLETE.md
│   │   │   ├── index.js
│   │   │   ├── MOBILE_APP_SUMMARY.md
│   │   │   ├── NAVIGATION_GUIDE.md
│   │   │   ├── NEXT_STEPS.md
│   │   │   ├── NOTIFICATION_IMPLEMENTATION_GUIDE.md
│   │   │   ├── NOTIFICATION_PAYLOAD_REFERENCE.md
│   │   │   ├── ONBOARDING_TESTING.md
│   │   │   ├── package.json
│   │   │   ├── PATIENT_SEARCH_GUIDE.md
│   │   │   ├── PERFORMANCE.md
│   │   │   ├── PHASE_1_PREVENTION_IMPLEMENTATION.md
│   │   │   ├── PHASE_1_TESTING.md
│   │   │   ├── PHASE_7_MOBILE_API_REFERENCE.md
│   │   │   ├── PHASE_7_MOBILE_MIGRATION_STATUS.md
│   │   │   ├── PREVENTION_TROUBLESHOOTING.md
│   │   │   ├── PRODUCTION_CHECKLIST.md
│   │   │   ├── PROJECT_SUMMARY.md
│   │   │   ├── PUSH_NOTIFICATION_ARCHITECTURE.md
│   │   │   ├── QUICK_START.md
│   │   │   ├── README.md
│   │   │   ├── README.old.md
│   │   │   ├── SESSION_SUMMARY.md
│   │   │   ├── STORE_USAGE_GUIDE.md
│   │   │   ├── TESTING_GUIDE.md
│   │   │   ├── TESTING_QUICK_START.md
│   │   │   └── tsconfig.json
│   │   └── 📁 web
│   │       ├── 📁 .local-email-inbox
│   │       │   └── 2026-01-19T17-02-49-151Z-0137b408a9cee.json
│   │       ├── 📁 apps
│   │       │   └── 📁 web
│   │       │       ├── 📁 src
              └── ... (truncated)
│   │       │       └── config.yaml
│   │       ├── 📁 config
│   │       │   └── casbin-model.conf
│   │       ├── 📁 docs
│   │       │   ├── 📁 runbooks
│   │       │   │   ├── DISASTER_RECOVERY.md
│   │       │   │   └── ssl-certificate-renewal.md
│   │       │   ├── AI_MONETIZATION_STRATEGY.md
│   │       │   ├── ALERTING_RULES.md
│   │       │   ├── API_DOCUMENTATION.md
│   │       │   ├── BACKUP_AND_RECOVERY.md
│   │       │   ├── CDSS_PERFORMANCE_OPTIMIZATION.md
│   │       │   ├── CLOUDFLARE_R2_SETUP.md
│   │       │   ├── CRON_JOBS.md
│   │       │   ├── DATABASE_DEPLOYMENT.md
│   │       │   ├── DEMO_AUTH_REMOVAL.md
│   │       │   ├── DEPLOYMENT_GUIDE.md
│   │       │   ├── DEPLOYMENT_STATUS.md
│   │       │   ├── DEPLOYMENT_SUMMARY.md
│   │       │   ├── DNS_CONFIGURATION.md
│   │       │   ├── ENHANCED_FEATURES_PLAN.md
│   │       │   ├── ENVIRONMENT_VARIABLES.md
│   │       │   ├── FILE_UPLOAD_SYSTEM.md
│   │       │   ├── FORMS_SYSTEM_IMPLEMENTATION.md
│   │       │   ├── IMPLEMENTATION_COMPLETE.md
│   │       │   ├── IMPLEMENTATION_PROGRESS.md
│   │       │   ├── LANDING_PAGE_REDESIGN.md
│   │       │   ├── MANUAL_TESTING_CHECKLIST.md
│   │       │   ├── MONITORING_DASHBOARD.md
│   │       │   ├── MONITORING_STRATEGY.md
│   │       │   ├── PATIENT_CONTEXT_FORMATTER.md
│   │       │   ├── PHARMACY_INTEGRATION.md
│   │       │   ├── PRODUCTION_DEPLOYMENT_CHECKLIST.md
│   │       │   ├── PRODUCTION_READINESS.md
│   │       │   ├── PUSH_NOTIFICATIONS.md
│   │       │   ├── SECRETS_AUDIT.md
│   │       │   ├── SECRETS_MANAGEMENT.md
│   │       │   ├── SECURITY_TESTING.md
│   │       │   ├── SENTRY_SETUP.md
│   │       │   ├── SESSION_MANAGEMENT.md
│   │       │   ├── SMS_APPOINTMENT_REMINDERS.md
│   │       │   ├── SOAP_NOTE_GENERATION.md
│   │       │   ├── SSL_TLS_QUICK_REFERENCE.md
│   │       │   ├── SSL_TLS_SETUP.md
│   │       │   ├── STORAGE_COMPARISON.md
│   │       │   ├── TEST_SUMMARY.md
│   │       │   ├── TESTING.md
│   │       │   ├── TROUBLESHOOTING.md
│   │       │   ├── TYPESCRIPT_FIXES.md
│   │       │   └── UPSTASH_REDIS_SETUP.md
│   │       ├── 📁 locales
│   │       │   ├── 📁 en
│   │       │   │   └── common.json
│   │       │   ├── 📁 es
│   │       │   │   └── common.json
│   │       │   └── 📁 pt
│   │       │       └── common.json
│   │       ├── 📁 messages
│   │       │   ├── en.json
│   │       │   ├── es.json
│   │       │   └── pt.json
│   │       ├── 📁 pages
│   │       │   └── 📁 api
│   │       │       └── socketio.ts
│   │       ├── 📁 playwright-report
│   │       │   ├── 📁 data
│   │       │   │   ├── 134b08df46350408543840ce3dead8b60d5d2592.webm
│   │       │   │   ├── 93939cd377a73b6c856d28b7832b25efefe3b908.png
│   │       │   │   ├── d12ca40e742be22256847c90bc0729668cbc2ba2.md
│   │       │   │   └── e8f34cae6f695b4a1b90423546ffb6f00c6f2091.webm
│   │       │   ├── index.html
│   │       │   └── results.json
│   │       ├── 📁 prisma
│   │       │   ├── 📁 migrations
│   │       │   │   ├── 📁 20251205_web2_interop_foundation
              └── ... (truncated)
│   │       │   │   ├── 📁 20251214_cdss_performance_indexes
              └── ... (truncated)
│   │       │   │   ├── 📁 20251215_session_security_tokens
              └── ... (truncated)
│   │       │   │   └── migration_lock.toml
│   │       │   ├── 📁 seeds
│   │       │   │   ├── clinical-templates.d.ts
│   │       │   │   ├── clinical-templates.d.ts.map
│   │       │   │   ├── clinical-templates.js
│   │       │   │   ├── clinical-templates.ts
│   │       │   │   ├── prevention-templates.ts
│   │       │   │   └── test-clinical-data.ts
│   │       │   ├── consolidated_migration.sql
│   │       │   ├── migration_add_invitation_beta_models.sql
│   │       │   ├── schema.prisma
│   │       │   ├── seed-palliative-care.d.ts
│   │       │   ├── seed-palliative-care.d.ts.map
│   │       │   ├── seed-palliative-care.js
│   │       │   ├── seed-palliative-care.js.map
│   │       │   ├── seed-palliative-care.ts
│   │       │   ├── seed-patients.d.ts
│   │       │   ├── seed-patients.d.ts.map
│   │       │   ├── seed-patients.js
│   │       │   ├── seed-patients.js.map
│   │       │   ├── seed-patients.ts
│   │       │   ├── seed-production.d.ts
│   │       │   ├── seed-production.d.ts.map
│   │       │   ├── seed-production.js
│   │       │   ├── seed-production.js.map
│   │       │   ├── seed-production.ts
│   │       │   ├── seed-situations.d.ts
│   │       │   ├── seed-situations.d.ts.map
│   │       │   ├── seed-situations.js
│   │       │   ├── seed-situations.ts
│   │       │   ├── seed.d.ts
│   │       │   ├── seed.d.ts.map
│   │       │   ├── seed.js
│   │       │   ├── seed.js.map
│   │       │   └── seed.ts
│   │       ├── 📁 public
│   │       │   ├── 📁 .well-known
│   │       │   │   └── security.txt
│   │       │   ├── 📁 demo
│   │       │   │   ├── consult-note-sample.png
│   │       │   │   ├── discharge-summary-sample.png
│   │       │   │   ├── lab-cbc-sample.png
│   │       │   │   ├── lab-cbc.svg
│   │       │   │   ├── lab-report.svg
│   │       │   │   ├── xray-chest.svg
│   │       │   │   ├── xray-hand.svg
│   │       │   │   └── xray-knee.svg
│   │       │   ├── 📁 demo-files
│   │       │   │   ├── consultation_note_demo-patient-11_12.txt
│   │       │   │   ├── consultation_note_demo-patient-15_16.txt
│   │       │   │   ├── consultation_note_demo-patient-19_20.txt
│   │       │   │   ├── consultation_note_demo-patient-23_24.txt
│   │       │   │   ├── consultation_note_demo-patient-27_28.txt
│   │       │   │   ├── consultation_note_demo-patient-3_4.txt
│   │       │   │   ├── consultation_note_demo-patient-7_8.txt
│   │       │   │   ├── index.json
│   │       │   │   ├── lab_result_demo-patient-1_2.txt
│   │       │   │   ├── lab_result_demo-patient-13_14.txt
│   │       │   │   ├── lab_result_demo-patient-17_18.txt
│   │       │   │   ├── lab_result_demo-patient-21_22.txt
│   │       │   │   ├── lab_result_demo-patient-25_26.txt
│   │       │   │   ├── lab_result_demo-patient-29_30.txt
│   │       │   │   ├── lab_result_demo-patient-5_6.txt
│   │       │   │   ├── lab_result_demo-patient-9_10.txt
│   │       │   │   ├── medical_history_demo-patient-0_1.txt
│   │       │   │   ├── medical_history_demo-patient-12_13.txt
│   │       │   │   ├── medical_history_demo-patient-16_17.txt
│   │       │   │   ├── medical_history_demo-patient-20_21.txt
│   │       │   │   ├── medical_history_demo-patient-24_25.txt
│   │       │   │   ├── medical_history_demo-patient-28_29.txt
│   │       │   │   ├── medical_history_demo-patient-4_5.txt
│   │       │   │   ├── medical_history_demo-patient-8_9.txt
│   │       │   │   ├── prescription_demo-patient-10_11.txt
│   │       │   │   ├── prescription_demo-patient-14_15.txt
│   │       │   │   ├── prescription_demo-patient-18_19.txt
│   │       │   │   ├── prescription_demo-patient-2_3.txt
│   │       │   │   ├── prescription_demo-patient-22_23.txt
│   │       │   │   ├── prescription_demo-patient-26_27.txt
│   │       │   │   └── prescription_demo-patient-6_7.txt
│   │       │   ├── 📁 icons
│   │       │   │   ├── apple-calendar.svg
│   │       │   │   ├── artificial-intelligence (1).svg
│   │       │   │   ├── artificial-intelligence.svg
│   │       │   │   ├── calendar (1).svg
│   │       │   │   ├── calendar.svg
│   │       │   │   ├── chart-cured-increasing (1).svg
│   │       │   │   ├── chart-cured-increasing.svg
│   │       │   │   ├── clinical-f (1).svg
│   │       │   │   ├── clinical-f.svg
│   │       │   │   ├── communication (1).svg
│   │       │   │   ├── communication.svg
│   │       │   │   ├── crisis-response_center_person.svg
│   │       │   │   ├── diagnostics (1).svg
│   │       │   │   ├── diagnostics.svg
│   │       │   │   ├── doctor (1).svg
│   │       │   │   ├── doctor-female (1).svg
│   │       │   │   ├── doctor-female.svg
│   │       │   │   ├── doctor-male (1).svg
│   │       │   │   ├── doctor-male.svg
│   │       │   │   ├── doctor.svg
│   │       │   │   ├── forum (1).svg
│   │       │   │   ├── forum.svg
│   │       │   │   ├── google-calendar.svg
│   │       │   │   ├── head (1).svg
│   │       │   │   ├── head.svg
│   │       │   │   ├── health (1).svg
│   │       │   │   ├── health (2).svg
│   │       │   │   ├── health (3).svg
│   │       │   │   ├── health-alt (1).svg
│   │       │   │   ├── health-alt.svg
│   │       │   │   ├── health-worker_form (1).svg
│   │       │   │   ├── health-worker_form.svg
│   │       │   │   ├── health.svg
│   │       │   │   ├── i-note_action (1).svg
│   │       │   │   ├── i-note_action.svg
│   │       │   │   ├── malnutrition (1).svg
│   │       │   │   ├── malnutrition.svg
│   │       │   │   ├── microsoft-outlook.svg
│   │       │   │   ├── people (1).svg
│   │       │   │   ├── people.svg
│   │       │   │   ├── rx (1).svg
│   │       │   │   ├── rx.svg
│   │       │   │   ├── speech-language_therapy (1).svg
│   │       │   │   ├── speech-language_therapy.svg
│   │       │   │   ├── stethoscope (1).svg
│   │       │   │   ├── stethoscope.svg
│   │       │   │   ├── telemedicine (1).svg
│   │       │   │   └── telemedicine.svg
│   │       │   ├── 📁 legal
│   │       │   │   ├── 📁 consent-forms
              └── ... (truncated)
│   │       │   │   ├── business-associate-agreement.md
│   │       │   │   ├── hipaa-notice-of-privacy-practices.md
│   │       │   │   ├── privacy-policy.md
│   │       │   │   └── terms-of-service.md
│   │       │   ├── 📁 logos
│   │       │   │   ├── holi-dark.png
│   │       │   │   ├── holi-dark.svg
│   │       │   │   ├── holi-light.png
│   │       │   │   ├── holi-light.svg
│   │       │   │   ├── Logo + Color Palette_Holi Labs (4).png
│   │       │   │   ├── Logo 1_Dark (1).svg
│   │       │   │   ├── Logo 1_Dark.png
│   │       │   │   ├── Logo 1_Dark.svg
│   │       │   │   ├── Logo 1_Light (1).png
│   │       │   │   └── Logo 1_Light.svg
│   │       │   ├── 📁 worklets
│   │       │   │   └── audio-processor.js
│   │       │   ├── DESIGN_ASSETS.md
│   │       │   ├── favicon.ico
│   │       │   ├── icon-192x192.png
│   │       │   ├── icon-256x256.png
│   │       │   ├── icon-384x384.png
│   │       │   ├── icon-512x512.png
│   │       │   ├── icon.svg
│   │       │   ├── landing-hero.jpeg
│   │       │   ├── loading-video.mp4
│   │       │   ├── manifest.json
│   │       │   ├── robots.txt
│   │       │   ├── sw.js
│   │       │   ├── sw.js.map
│   │       │   ├── workbox-01fd22c6.js
│   │       │   └── workbox-01fd22c6.js.map
│   │       ├── 📁 scripts
│   │       │   ├── audit-environment.d.ts
│   │       │   ├── audit-environment.d.ts.map
│   │       │   ├── audit-environment.js
│   │       │   ├── audit-environment.ts
│   │       │   ├── backup-database.d.ts
│   │       │   ├── backup-database.d.ts.map
│   │       │   ├── backup-database.js
│   │       │   ├── backup-database.js.map
│   │       │   ├── backup-database.ts
│   │       │   ├── check-all-apis.ts
│   │       │   ├── check-health.ts
│   │       │   ├── check-mobile-responsiveness.sh
│   │       │   ├── cleanup-synthetic-names.ts
│   │       │   ├── create-demo-clinician.ts
│   │       │   ├── fix-encoding.js
│   │       │   ├── generate-demo-files.ts
│   │       │   ├── generate-production-secrets.sh
│   │       │   ├── phase6-cli.ts
│   │       │   ├── pre-deploy-check.sh
│   │       │   ├── replace-console-logs-api-routes.sh
│   │       │   ├── replace-console-logs-batch-1.sh
│   │       │   ├── seed-credentials.d.ts
│   │       │   ├── seed-credentials.d.ts.map
│   │       │   ├── seed-credentials.js
│   │       │   ├── seed-credentials.ts
│   │       │   ├── seed-prevention-templates.ts
│   │       │   ├── seed-soap-notes.d.ts
│   │       │   ├── seed-soap-notes.d.ts.map
│   │       │   ├── seed-soap-notes.js
│   │       │   ├── seed-soap-notes.js.map
│   │       │   ├── seed-soap-notes.ts
│   │       │   ├── seed-tasks.d.ts
│   │       │   ├── seed-tasks.d.ts.map
│   │       │   ├── seed-tasks.js
│   │       │   ├── seed-tasks.ts
│   │       │   ├── set-demo-password.ts
│   │       │   ├── setup-git-secrets.sh
│   │       │   ├── test-all-security.sh
│   │       │   ├── test-anonymize.ts
│   │       │   ├── test-cors.sh
│   │       │   ├── test-cron-security.ts
│   │       │   ├── test-csrf.sh
│   │       │   ├── test-env-validation.ts
│   │       │   ├── test-lab-reference-ranges.ts
│   │       │   ├── test-rxnav-integration.ts
│   │       │   ├── test-security-headers.sh
│   │       │   ├── test-soap-generation.ts
│   │       │   ├── validate-day1-setup.ts
│   │       │   ├── validate-env.ts
│   │       │   ├── validate-production.d.ts
│   │       │   ├── validate-production.d.ts.map
│   │       │   ├── validate-production.js
│   │       │   ├── validate-production.ts
│   │       │   ├── validate-translations.ts
│   │       │   ├── verify-ai-setup.ts
│   │       │   ├── verify-backups.ts
│   │       │   ├── verify-indexes.sql
│   │       │   ├── verify-phase6.ts
│   │       │   ├── verify-security-hardening.sh
│   │       │   └── verify-security-headers.ts
│   │       ├── 📁 src
│   │       │   ├── 📁 __tests__
│   │       │   │   └── 📁 soap-generator
              └── ... (truncated)
│   │       │   ├── 📁 app
│   │       │   │   ├── 📁 access
              └── ... (truncated)
│   │       │   │   ├── 📁 admin
              └── ... (truncated)
│   │       │   │   ├── 📁 api
              └── ... (truncated)
│   │       │   │   ├── 📁 auth
              └── ... (truncated)
│   │       │   │   ├── 📁 book
              └── ... (truncated)
│   │       │   │   ├── 📁 clinician
              └── ... (truncated)
│   │       │   │   ├── 📁 confirm
              └── ... (truncated)
│   │       │   │   ├── 📁 dashboard
              └── ... (truncated)
│   │       │   │   ├── 📁 find-doctor
              └── ... (truncated)
│   │       │   │   ├── 📁 legal
              └── ... (truncated)
│   │       │   │   ├── 📁 onboarding
              └── ... (truncated)
│   │       │   │   ├── 📁 portal
              └── ... (truncated)
│   │       │   │   ├── 📁 pricing
              └── ... (truncated)
│   │       │   │   ├── 📁 shared
              └── ... (truncated)
│   │       │   │   ├── 📁 sign-in
              └── ... (truncated)
│   │       │   │   ├── error.tsx
│   │       │   │   ├── global-error.tsx
│   │       │   │   ├── globals.css
│   │       │   │   ├── layout.tsx
│   │       │   │   ├── loading.tsx
│   │       │   │   ├── not-found.tsx
│   │       │   │   ├── page_old.tsx
│   │       │   │   └── page.tsx
│   │       │   ├── 📁 components
│   │       │   │   ├── 📁 access-grants
              └── ... (truncated)
│   │       │   │   ├── 📁 ai
              └── ... (truncated)
│   │       │   │   ├── 📁 appointments
              └── ... (truncated)
│   │       │   │   ├── 📁 calendar
              └── ... (truncated)
│   │       │   │   ├── 📁 chat
              └── ... (truncated)
│   │       │   │   ├── 📁 clinical
              └── ... (truncated)
│   │       │   │   ├── 📁 co-pilot
              └── ... (truncated)
│   │       │   │   ├── 📁 common
              └── ... (truncated)
│   │       │   │   ├── 📁 compliance
              └── ... (truncated)
│   │       │   │   ├── 📁 credentials
              └── ... (truncated)
│   │       │   │   ├── 📁 dashboard
              └── ... (truncated)
│   │       │   │   ├── 📁 demo
              └── ... (truncated)
│   │       │   │   ├── 📁 encounter
              └── ... (truncated)
│   │       │   │   ├── 📁 forms
              └── ... (truncated)
│   │       │   │   ├── 📁 imaging
              └── ... (truncated)
│   │       │   │   ├── 📁 invoices
              └── ... (truncated)
│   │       │   │   ├── 📁 lab-results
              └── ... (truncated)
│   │       │   │   ├── 📁 legal
              └── ... (truncated)
│   │       │   │   ├── 📁 mar
              └── ... (truncated)
│   │       │   │   ├── 📁 medications
              └── ... (truncated)
│   │       │   │   ├── 📁 messaging
              └── ... (truncated)
│   │       │   │   ├── 📁 notifications
              └── ... (truncated)
│   │       │   │   ├── 📁 onboarding
              └── ... (truncated)
│   │       │   │   ├── 📁 palliative
              └── ... (truncated)
│   │       │   │   ├── 📁 patient
              └── ... (truncated)
│   │       │   │   ├── 📁 patients
              └── ... (truncated)
│   │       │   │   ├── 📁 pdf
              └── ... (truncated)
│   │       │   │   ├── 📁 portal
              └── ... (truncated)
│   │       │   │   ├── 📁 prescriptions
              └── ... (truncated)
│   │       │   │   ├── 📁 prevention
              └── ... (truncated)
│   │       │   │   ├── 📁 print
              └── ... (truncated)
│   │       │   │   ├── 📁 privacy
              └── ... (truncated)
│   │       │   │   ├── 📁 qr
              └── ... (truncated)
│   │       │   │   ├── 📁 recordings
              └── ... (truncated)
│   │       │   │   ├── 📁 referrals
              └── ... (truncated)
│   │       │   │   ├── 📁 reschedule
              └── ... (truncated)
│   │       │   │   ├── 📁 scribe
              └── ... (truncated)
│   │       │   │   ├── 📁 search
              └── ... (truncated)
│   │       │   │   ├── 📁 shared
              └── ... (truncated)
│   │       │   │   ├── 📁 skeletons
              └── ... (truncated)
│   │       │   │   ├── 📁 spatial
              └── ... (truncated)
│   │       │   │   ├── 📁 sync
              └── ... (truncated)
│   │       │   │   ├── 📁 tasks
              └── ... (truncated)
│   │       │   │   ├── 📁 templates
              └── ... (truncated)
│   │       │   │   ├── 📁 ui
              └── ... (truncated)
│   │       │   │   ├── 📁 upload
              └── ... (truncated)
│   │       │   │   ├── 📁 video
              └── ... (truncated)
│   │       │   │   ├── 📁 voice
              └── ... (truncated)
│   │       │   │   ├── AICommandCenter.tsx
│   │       │   │   ├── CommandPalette.tsx
│   │       │   │   ├── ContextMenu.tsx
│   │       │   │   ├── CookieConsentBanner.tsx
│   │       │   │   ├── DarkModeShowcase.tsx
│   │       │   │   ├── DashboardLayout.tsx
│   │       │   │   ├── ErrorBoundary.tsx
│   │       │   │   ├── FeedbackWidget.tsx
│   │       │   │   ├── IntroAnimation.tsx
│   │       │   │   ├── IOSInstallPrompt.tsx
│   │       │   │   ├── LanguageSelector.tsx
│   │       │   │   ├── LoadingScreen.tsx
│   │       │   │   ├── LoadingSkeleton.tsx
│   │       │   │   ├── NotificationBadge.tsx
│   │       │   │   ├── NotificationPrompt.tsx
│   │       │   │   ├── OfflineDetector.tsx
│   │       │   │   ├── OfflineIndicator.tsx
│   │       │   │   ├── PatientSearch.tsx
│   │       │   │   ├── PrintButton.tsx
│   │       │   │   ├── Providers.tsx
│   │       │   │   ├── SessionTimeoutWarning.tsx
│   │       │   │   ├── SkipLink.tsx
│   │       │   │   ├── SupportContact.tsx
│   │       │   │   ├── ThemeToggle.tsx
│   │       │   │   └── WebVitalsTracker.tsx
│   │       │   ├── 📁 contexts
│   │       │   │   ├── ClinicalSessionContext.tsx
│   │       │   │   └── LanguageContext.tsx
│   │       │   ├── 📁 hooks
│   │       │   │   ├── use-audio-recorder.ts
│   │       │   │   ├── useAnalytics.ts
│   │       │   │   ├── useCSRF.ts
│   │       │   │   ├── useCsrfToken.ts
│   │       │   │   ├── useDebounce.ts
│   │       │   │   ├── useDeviceSync.ts
│   │       │   │   ├── useFeatureFlag.ts
│   │       │   │   ├── useJobStatus.ts
│   │       │   │   ├── useKeyboardShortcuts.ts
│   │       │   │   ├── useLanguage.ts
│   │       │   │   ├── useNotifications.ts
│   │       │   │   ├── usePatientContext.ts
│   │       │   │   ├── usePatientFilters.ts
│   │       │   │   ├── useRealtimePreventionUpdates.ts
│   │       │   │   ├── useSessionTimeout.ts
│   │       │   │   └── useVoiceCommands.ts
│   │       │   ├── 📁 i18n
│   │       │   │   └── shared.ts
│   │       │   ├── 📁 lib
│   │       │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │       │   │   ├── 📁 ai
              └── ... (truncated)
│   │       │   │   ├── 📁 analytics
              └── ... (truncated)
│   │       │   │   ├── 📁 api
              └── ... (truncated)
│   │       │   │   ├── 📁 appointments
              └── ... (truncated)
│   │       │   │   ├── 📁 audit
              └── ... (truncated)
│   │       │   │   ├── 📁 auth
              └── ... (truncated)
│   │       │   │   ├── 📁 aws
              └── ... (truncated)
│   │       │   │   ├── 📁 blockchain
              └── ... (truncated)
│   │       │   │   ├── 📁 brazil-interop
              └── ... (truncated)
│   │       │   │   ├── 📁 cache
              └── ... (truncated)
│   │       │   │   ├── 📁 calendar
              └── ... (truncated)
│   │       │   │   ├── 📁 cds
              └── ... (truncated)
│   │       │   │   ├── 📁 chat
              └── ... (truncated)
│   │       │   │   ├── 📁 client
              └── ... (truncated)
│   │       │   │   ├── 📁 clinical
              └── ... (truncated)
│   │       │   │   ├── 📁 clinical-notes
              └── ... (truncated)
│   │       │   │   ├── 📁 compliance
              └── ... (truncated)
│   │       │   │   ├── 📁 consent
              └── ... (truncated)
│   │       │   │   ├── 📁 cron
              └── ... (truncated)
│   │       │   │   ├── 📁 db
              └── ... (truncated)
│   │       │   │   ├── 📁 deid
              └── ... (truncated)
│   │       │   │   ├── 📁 deidentification
              └── ... (truncated)
│   │       │   │   ├── 📁 demo
              └── ... (truncated)
│   │       │   │   ├── 📁 ehr
              └── ... (truncated)
│   │       │   │   ├── 📁 email
              └── ... (truncated)
│   │       │   │   ├── 📁 export
              └── ... (truncated)
│   │       │   │   ├── 📁 facades
              └── ... (truncated)
│   │       │   │   ├── 📁 fhir
              └── ... (truncated)
│   │       │   │   ├── 📁 forms
              └── ... (truncated)
│   │       │   │   ├── 📁 hl7
              └── ... (truncated)
│   │       │   │   ├── 📁 imaging
              └── ... (truncated)
│   │       │   │   ├── 📁 integrations
              └── ... (truncated)
│   │       │   │   ├── 📁 invoices
              └── ... (truncated)
│   │       │   │   ├── 📁 jobs
              └── ... (truncated)
│   │       │   │   ├── 📁 logging
              └── ... (truncated)
│   │       │   │   ├── 📁 mar
              └── ... (truncated)
│   │       │   │   ├── 📁 medical
              └── ... (truncated)
│   │       │   │   ├── 📁 monitoring
              └── ... (truncated)
│   │       │   │   ├── 📁 notifications
              └── ... (truncated)
│   │       │   │   ├── 📁 nppes
              └── ... (truncated)
│   │       │   │   ├── 📁 openfda
              └── ... (truncated)
│   │       │   │   ├── 📁 patients
              └── ... (truncated)
│   │       │   │   ├── 📁 prevention
              └── ... (truncated)
│   │       │   │   ├── 📁 qr
              └── ... (truncated)
│   │       │   │   ├── 📁 queue
              └── ... (truncated)
│   │       │   │   ├── 📁 repositories
              └── ... (truncated)
│   │       │   │   ├── 📁 resilience
              └── ... (truncated)
│   │       │   │   ├── 📁 risk-scores
              └── ... (truncated)
│   │       │   │   ├── 📁 scheduling
              └── ... (truncated)
│   │       │   │   ├── 📁 schemas
              └── ... (truncated)
│   │       │   │   ├── 📁 scribe
              └── ... (truncated)
│   │       │   │   ├── 📁 search
              └── ... (truncated)
│   │       │   │   ├── 📁 secrets
              └── ... (truncated)
│   │       │   │   ├── 📁 security
              └── ... (truncated)
│   │       │   │   ├── 📁 services
              └── ... (truncated)
│   │       │   │   ├── 📁 sms
              └── ... (truncated)
│   │       │   │   ├── 📁 socket
              └── ... (truncated)
│   │       │   │   ├── 📁 storage
              └── ... (truncated)
│   │       │   │   ├── 📁 supabase
              └── ... (truncated)
│   │       │   │   ├── 📁 templates
              └── ... (truncated)
│   │       │   │   ├── 📁 transcription
              └── ... (truncated)
│   │       │   │   ├── 📁 utils
              └── ... (truncated)
│   │       │   │   ├── 📁 validation
              └── ... (truncated)
│   │       │   │   ├── 📁 validations
              └── ... (truncated)
│   │       │   │   ├── 📁 voice
              └── ... (truncated)
│   │       │   │   ├── audit.ts
│   │       │   │   ├── auth.ts
│   │       │   │   ├── csrf.ts
│   │       │   │   ├── email.ts
│   │       │   │   ├── encryption.ts
│   │       │   │   ├── env.ts
│   │       │   │   ├── featureFlags.ts
│   │       │   │   ├── logger.server.ts
│   │       │   │   ├── logger.ts
│   │       │   │   ├── medical-license-verification.ts
│   │       │   │   ├── notifications.ts
│   │       │   │   ├── offline-queue.ts
│   │       │   │   ├── posthog.ts
│   │       │   │   ├── presidio.ts
│   │       │   │   ├── prisma-replica.ts
│   │       │   │   ├── prisma.ts
│   │       │   │   ├── push-notifications.ts
│   │       │   │   ├── rate-limit.ts
│   │       │   │   ├── referral.ts
│   │       │   │   ├── request-id.ts
│   │       │   │   ├── search.ts
│   │       │   │   ├── security-headers.ts
│   │       │   │   ├── sms.ts
│   │       │   │   ├── socket-auth.ts
│   │       │   │   ├── socket-server.ts
│   │       │   │   ├── storage.ts
│   │       │   │   ├── translations.ts
│   │       │   │   ├── utils.ts
│   │       │   │   └── validation.ts
│   │       │   ├── 📁 providers
│   │       │   │   └── ThemeProvider.tsx
│   │       │   ├── 📁 scripts
│   │       │   │   └── theme-init.ts
│   │       │   ├── 📁 styles
│   │       │   │   ├── contrast-utils.ts
│   │       │   │   ├── design-tokens.ts
│   │       │   │   ├── mobile.css
│   │       │   │   ├── print.css
│   │       │   │   └── theme.ts
│   │       │   ├── 📁 types
│   │       │   │   ├── dcmjs.d.ts
│   │       │   │   ├── lucide-react.d.ts
│   │       │   │   ├── next-auth.d.ts
│   │       │   │   ├── next-link.d.ts
│   │       │   │   ├── react-pdf.d.ts
│   │       │   │   └── simple-hl7.d.ts
│   │       │   ├── i18n.ts
│   │       │   ├── instrumentation.ts
│   │       │   └── middleware.ts
│   │       ├── 📁 tests
│   │       │   ├── 📁 e2e
│   │       │   │   ├── accessibility-fixes.spec.ts
│   │       │   │   ├── appointment-scheduling.spec.ts
│   │       │   │   ├── critical-flows.spec.ts
│   │       │   │   ├── patient-portal.spec.ts
│   │       │   │   ├── prescription-safety.spec.ts
│   │       │   │   └── soap-note-generation.spec.ts
│   │       │   ├── 📁 load
│   │       │   │   ├── cdss-load-test.js
│   │       │   │   ├── README.md
│   │       │   │   └── run-load-test.sh
│   │       │   ├── 📁 results
│   │       │   │   ├── 📁 accessibility-fixes-Access-8db76-anding-Page---Public-Access-chromium
              └── ... (truncated)
│   │       │   │   └── .last-run.json
│   │       │   ├── README.md
│   │       │   ├── smoke.spec.d.ts
│   │       │   ├── smoke.spec.d.ts.map
│   │       │   ├── smoke.spec.js
│   │       │   ├── smoke.spec.js.map
│   │       │   └── smoke.spec.ts
│   │       ├── .browserslistrc
│   │       ├── .dockerignore
│   │       ├── .env.example
│   │       ├── .env.local.example
│   │       ├── .env.production.example
│   │       ├── .env.production.template
│   │       ├── .gitignore
│   │       ├── ACCESSIBILITY_TESTING_GUIDE.md
│   │       ├── AGENDA_SETUP_GUIDE.md
│   │       ├── AGENT_1_COMPLETION_REPORT.md
│   │       ├── AGENT_1_SUMMARY.md
│   │       ├── AGENT_10_BATCH_10A_DARK_MODE_FIX_REPORT.md
│   │       ├── AGENT_10_BATCH_10B_DARK_MODE_FIX_REPORT.md
│   │       ├── AGENT_10_BATCH_10C_FINAL_DARK_MODE_FIX_REPORT.md
│   │       ├── AGENT_10_BATCH_10D_FINAL_FIX_REPORT.md
│   │       ├── AGENT_10_BATCH_2_QUICK_SUMMARY.md
│   │       ├── AGENT_10_BATCH_4_QUICK_SUMMARY.md
│   │       ├── AGENT_10_BATCH_9_INDEX.md
│   │       ├── AGENT_10_BATCH_9_QUICK_SUMMARY.md
│   │       ├── AGENT_10_COMPLETE_SUMMARY.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_1_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_2_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_3_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_4_FINAL_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_5_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_6_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_7_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_8_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_9_FINAL_REPORT.md
│   │       ├── AGENT_10_CRITICAL_DISCOVERY_DARK_MODE_GAP.md
│   │       ├── AGENT_10_OVERALL_PROGRESS.md
│   │       ├── AGENT_13_COMPLETION_REPORT.md
│   │       ├── AGENT_13_FILE_INVENTORY.md
│   │       ├── AGENT_14_COMPLETION_REPORT.md
│   │       ├── AGENT_15_COMPLETION_REPORT.md
│   │       ├── AGENT_19_COMPLETION_REPORT.md
│   │       ├── AGENT_19_FINAL_VALIDATION_SUMMARY.md
│   │       ├── AGENT_20_CDSS_PERFORMANCE_AUDIT.md
│   │       ├── AGENT_20_COMPLETION_SUMMARY.md
│   │       ├── AGENT_21_FINAL_SUMMARY.md
│   │       ├── AGENT_21_MONITORING_SETUP_COMPLETE.md
│   │       ├── AGENT_27_COMPLETION_SUMMARY.md
│   │       ├── AGENT_28_MOBILE_AUDIT_COMPLETE.md
│   │       ├── AGENT_29_CROSS_BROWSER_COMPATIBILITY.md
│   │       ├── AGENT_3_COMPLETION_REPORT.md
│   │       ├── AGENT_5_SECURITY_HARDENING_COMPLETE.md
│   │       ├── AGENT_7_DARK_MODE_IMPLEMENTATION.md
│   │       ├── AGENT10_BATCH_1_COMPLETION.md
│   │       ├── AGENT10_BATCH_2_COMPLETION.md
│   │       ├── AGENT10_BATCH_3_COMPLETION.md
│   │       ├── AGENT10_CLINICAL_BATCH_SUMMARY.md
│   │       ├── AGENT10_SUMMARY.md
│   │       ├── AGENT11_THEME_CONSOLIDATION_COMPLETE.md
│   │       ├── AGENT16_ADDITIONAL_SCHEMA_ISSUES.md
│   │       ├── AGENT16_EXECUTIVE_SUMMARY.md
│   │       ├── AGENT16_FILES_AFFECTED.md
│   │       ├── AGENT16_INDEX.md
│   │       ├── AGENT16_PRISMA_SCHEMA_FIX_REPORT.md
│   │       ├── AGENT17_IMPLEMENTATION_SUMMARY.md
│   │       ├── AGENT17_MIGRATION_GUIDE.md
│   │       ├── AGENT17_MISSING_MODELS_IMPLEMENTATION.md
│   │       ├── AGENT2_COMPLETION_REPORT.md
│   │       ├── AGENT2_FINAL_REPORT.md
│   │       ├── AGENT22_BACKUP_DR_IMPLEMENTATION.md
│   │       ├── AGENT23_SESSION_SECURITY_COMPLETE.md
│   │       ├── AGENT4_COMPLETION_SUMMARY.md
│   │       ├── AGENT9_BATCH_1_COMPLETION.md
│   │       ├── AGENT9_FILE_INVENTORY.md
│   │       ├── AGENT9_QUICK_GUIDE.md
│   │       ├── AGENT9_SUMMARY.md
│   │       ├── AGENTS_9_10_12_COMPLETION_REPORT.md
│   │       ├── API_COST_ANALYSIS_2025.md
│   │       ├── AUTHENTICATION_BEFORE_AFTER.md
│   │       ├── AUTHENTICATION_QUICK_REFERENCE.md
│   │       ├── BATCH_10B_FILES_MODIFIED.txt
│   │       ├── BATCH_2_LOGGING_MIGRATION_REPORT.md
│   │       ├── BATCH_4_COMPLETION_REPORT.md
│   │       ├── BATCH_5_COMPLETION_REPORT.md
│   │       ├── BATCH_6A_COMPLETION_REPORT.md
│   │       ├── batch-logger-update.sh
│   │       ├── BROWSER_COMPATIBILITY_QUICKSTART.md
│   │       ├── BROWSER_COMPATIBILITY_TEST_MATRIX.md
│   │       ├── BROWSER_SPECIFIC_FIXES.md
│   │       ├── BULK_EXPORT_GUIDE.md
│   │       ├── CDSS_PERFORMANCE_COMPLETE.md
│   │       ├── CDSS_PERFORMANCE_QUICK_REFERENCE.md
│   │       ├── CDSS_PERFORMANCE_QUICKSTART.md
│   │       ├── COMMAND_CENTER_ADDITIONAL_POLISH.md
│   │       ├── COMMAND_CENTER_ENHANCEMENT_PHASE_2.md
│   │       ├── COMMAND_CENTER_FINAL_POLISH.md
│   │       ├── COMMAND_CENTER_INTEGRATION_COMPLETE.md
│   │       ├── COMMAND_CENTER_PHASE_3A_INTEGRATION.md
│   │       ├── COMMAND_CENTER_PHASE_3B_POLISH.md
│   │       ├── COMMAND_CENTER_README.md
│   │       ├── COMMAND_CENTER_UI_POLISH.md
│   │       ├── COMMUNICATIONS_SETUP.md
│   │       ├── COMPETITIVE_FEATURES_COMPLETE.md
│   │       ├── CONNECTION_POOLING.md
│   │       ├── CONTRAST_FIX_BATCH2_REPORT.md
│   │       ├── CONTRAST_FIX_QUICK_GUIDE.md
│   │       ├── CRON_JOBS_QUICK_REFERENCE.md
│   │       ├── CRON_SECURITY_SUMMARY.md
│   │       ├── DARK_MODE_FIX_QUICK_GUIDE.md
│   │       ├── DARK_MODE_QUICK_REFERENCE.md
│   │       ├── DARK_MODE_VARIABLES.md
│   │       ├── DASHBOARD_FIXES_COMPLETION_REPORT.md
│   │       ├── DATABASE_INDEXES.md
│   │       ├── DATABASE_SETUP.md
│   │       ├── DEEPGRAM_INTEGRATION_COMPLETE.md
│   │       ├── DEMO_ACCOUNTS.md
│   │       ├── DEPLOYMENT_CHECKLIST.md
│   │       ├── DEPLOYMENT_READY.md
│   │       ├── Dockerfile
│   │       ├── Dockerfile.prod
│   │       ├── ENV_VALIDATION_QUICK_REFERENCE.md
│   │       ├── ENV_VALIDATION.md
│   │       ├── environment-audit-report.json
│   │       ├── ERROR_HANDLING_AUDIT_REPORT.md
│   │       ├── ERROR_HANDLING_QUICK_GUIDE.md
│   │       ├── FINAL_POLISH_SESSION_COMPLETE.md
│   │       ├── GIT_SECRETS_SETUP.md
│   │       ├── HIPAA_COMPLIANCE_AUDIT_REPORT.md
│   │       ├── HIPAA_COMPLIANCE_CHECKLIST.md
│   │       ├── HIPAA_COMPLIANCE_QUICK_REFERENCE.md
│   │       ├── HIPAA_EXECUTIVE_SUMMARY.md
│   │       ├── HIPAA_REMEDIATION_TRACKER.md
│   │       ├── I18N-SETUP.md
│   │       ├── i18n.d.ts
│   │       ├── i18n.d.ts.map
│   │       ├── i18n.js
│   │       ├── i18n.js.disabled
│   │       ├── i18n.js.map
│   │       ├── i18n.ts.disabled
│   │       ├── IMPLEMENTATION_STATUS.md
│   │       ├── INSTALLATION_REQUIRED.md
│   │       ├── instrumentation.d.ts
│   │       ├── instrumentation.d.ts.map
│   │       ├── instrumentation.js
│   │       ├── instrumentation.js.map
│   │       ├── INTERNATIONAL_PREVENTION_PROTOCOLS.md
│   │       ├── INVITATION_QUICK_START.md
│   │       ├── INVITATION_SYSTEM_IMPLEMENTATION.md
│   │       ├── jest.config.js
│   │       ├── jest.sequencer.cjs
│   │       ├── jest.setup.js
│   │       ├── LAB_REFERENCE_RANGES_QUICK_START.md
│   │       ├── LAB_REFERENCE_RANGES_SUMMARY.md
│   │       ├── LAB_REFERENCE_RANGES_VALIDATION_REPORT.md
│   │       ├── LEGAL_DOCUMENTS_IMPLEMENTATION.md
│   │       ├── LOGGING_MIGRATION_QUICK_GUIDE.md
│   │       ├── LOGGING.md
│   │       ├── MARKETING_BRIEF_FOR_LLM.md
│   │       ├── MASTER_PLAN_COMPLETE.md
│   │       ├── MASTER_POLISH_COMPLETE.md
│   │       ├── MEDICAL_LICENSE_VERIFICATION.md
│   │       ├── middleware.ts
│   │       ├── MIGRATION-AI-USAGE.sql
│   │       ├── MOBILE_IMPLEMENTATION_ROADMAP.md
│   │       ├── MOBILE_QUICK_REFERENCE.md
│   │       ├── MOBILE_RESPONSIVENESS_AUDIT.md
│   │       ├── MOBILE_TESTING_CHECKLIST.md
│   │       ├── MONITORING_QUICKSTART.md
│   │       ├── next-env.d.ts
│   │       ├── next.config.js
│   │       ├── NOTIFICATION_SYSTEM.md
│   │       ├── P0_FIXES_COMPLETED.md
│   │       ├── package.json
│   │       ├── PHASE_1_DEPLOYMENT_SUMMARY.md
│   │       ├── PHASE_1_MVP_COMPLETE.md
│   │       ├── PHASE_2_WHATSAPP_COMPLETE.md
│   │       ├── PHASE_6_DEPLOYMENT_SUMMARY.md
│   │       ├── PHASE_6_DOCUMENTATION.md
│   │       ├── PHASE_6_QUICKSTART.md
│   │       ├── PHASE_6_README.md
│   │       ├── PHASE_7_COMPLETE_DOCUMENTATION.md
│   │       ├── PHASE_7_FEATURE_1_SUMMARY.md
│   │       ├── PHASE_7_PLAN.md
│   │       ├── playwright.config.ts
│   │       ├── postcss.config.js
│   │       ├── PREVENTION_GOAL_TRACKING_GUIDE.md
│   │       ├── PREVENTION_HUB_COMPLETE.md
│   │       ├── PREVENTION_HUB_DEMO.md
│   │       ├── PREVENTION_HUB_FINAL_UPDATE.md
│   │       ├── PREVENTION_HUB_SUMMARY.md
│   │       ├── PREVENTION_HUB_TESTING.md
│   │       ├── PREVENTION_PHASE1_COMPLETE.md
│   │       ├── PREVENTION_PHASE2_COMPLETE.md
│   │       ├── PREVENTION_PHASE3_ADVANCED_FEATURES.md
│   │       ├── PREVENTION_PHASE4_COLLABORATION_FEATURES.md
│   │       ├── PREVENTION_PHASE5_ANALYTICS_REPORTING.md
│   │       ├── PREVENTION_PLANS_HISTORY_GUIDE.md
│   │       ├── PREVENTION_PLANS.md
│   │       ├── PREVENTION_STATUS_MANAGEMENT_GUIDE.md
│   │       ├── PRISMA_QUICK_REFERENCE.md
│   │       ├── PRISMA_TROUBLESHOOTING_GUIDE.md
│   │       ├── PRODUCTION_DEPLOYMENT_CHECKLIST.md
│   │       ├── PROJECT_COMPLETION_SUMMARY.md
│   │       ├── PROTOCOL_PERSISTENCE_GUIDE.md
│   │       ├── RATE_LIMITING_RESTORED.md
│   │       ├── README_MOBILE_AUDIT.md
│   │       ├── RED_TEAM_ANALYSIS.md
│   │       ├── REDIS_RATE_LIMITING.md
│   │       ├── RXNAV_INTEGRATION.md
│   │       ├── RXNAV_QUICKSTART.md
│   │       ├── SCREEN_READER_TESTING_GUIDE.md
│   │       ├── SECURITY_AUDIT_HARDCODED_SECRETS.md
│   │       ├── SECURITY_AUDIT_SUMMARY.md
│   │       ├── SECURITY_HARDENING_COMPLETE.md
│   │       ├── SECURITY_QUICK_REFERENCE.md
│   │       ├── SECURITY_RED_TEAM_ANALYSIS.md
│   │       ├── sentry.edge.config.d.ts
│   │       ├── sentry.edge.config.d.ts.map
│   │       ├── sentry.edge.config.js
│   │       ├── sentry.edge.config.ts
│   │       ├── sentry.server.config.d.ts
│   │       ├── sentry.server.config.d.ts.map
│   │       ├── sentry.server.config.js
│   │       ├── sentry.server.config.ts
│   │       ├── server.js
│   │       ├── SESSION_ADDITIONAL_POLISH_COMPLETE.md
│   │       ├── SESSION_MASTER_PLAN_COMPLETE.md
│   │       ├── SESSION_PHASE_3_COMPLETE.md
│   │       ├── SESSION_SECURITY_QUICK_REFERENCE.md
│   │       ├── SESSION_SUMMARY_PHASE4.md
│   │       ├── SESSION_SUMMARY_PHASE5.md
│   │       ├── SESSION_SUMMARY_PHASE6.md
│   │       ├── SESSION_SUMMARY.md
│   │       ├── setup-agenda.sh
│   │       ├── tailwind.config.d.ts
│   │       ├── tailwind.config.d.ts.map
│   │       ├── tailwind.config.js
│   │       ├── tailwind.config.js.map
│   │       ├── tailwind.config.ts
│   │       ├── TASK_1_VERIFICATION.md
│   │       ├── TASK_2_COMPLETE.md
│   │       ├── test-ai-setup.d.ts
│   │       ├── test-ai-setup.d.ts.map
│   │       ├── test-ai-setup.js
│   │       ├── test-ai-setup.js.map
│   │       ├── test-ai-setup.ts
│   │       ├── TESTING_VERIFICATION_COMPLETE.md
│   │       ├── THEME_ARCHITECTURE_DIAGRAM.md
│   │       ├── THEME_QUICK_START.md
│   │       ├── THEME_SYSTEM_DOCUMENTATION.md
│   │       ├── TRANSLATION_ARCHITECTURE.md
│   │       ├── TRANSLATION_MANAGEMENT.md
│   │       ├── tsconfig.json
│   │       ├── vercel.json
│   │       ├── WHATSAPP_SETUP_GUIDE.md
│   │       └── WHITE_ON_WHITE_FIX_REPORT.md
│   ├── 📁 COMPLIANCE
│   │   └── DPIA-template.md
│   ├── 📁 configs
│   │   ├── policy-ar.yaml
│   │   ├── policy-br.yaml
│   │   ├── policy-mx.yaml
│   │   └── precision-budgets.json
│   ├── 📁 demos
│   │   ├── 📁 sample-fhir-bundles
│   │   │   └── external-ehr-lab-results.json
│   │   ├── fhir-e2e-demo.sh
│   │   ├── README.md
│   │   ├── RECORDING_GUIDE.md
│   │   └── smoke-tests.sh
│   ├── 📁 docker
│   │   └── init-db.sql
│   ├── 📁 docs
│   │   ├── 📁 deployment
│   │   │   └── blue-green-deployment.md
│   │   ├── 📁 disaster-recovery
│   │   │   ├── disaster-recovery-plan.md
│   │   │   └── test-results.md
│   │   ├── 📁 monitoring
│   │   │   ├── apm-setup.md
│   │   │   ├── business-metrics-dashboard.md
│   │   │   └── synthetic-monitoring.md
│   │   ├── 📁 performance
│   │   │   ├── database-read-replicas.md
│   │   │   └── load-testing-guide.md
│   │   ├── 📁 runbooks
│   │   │   ├── API_SERVER_DOWN.md
│   │   │   ├── api-server-down.md
│   │   │   ├── audit-log-review.md
│   │   │   ├── backup-restoration.md
│   │   │   ├── DATA_BREACH_RESPONSE.md
│   │   │   ├── DATABASE_FAILURE.md
│   │   │   ├── database-connection-failure.md
│   │   │   ├── deployment-rollback.md
│   │   │   ├── DISASTER_RECOVERY_PLAN.md
│   │   │   ├── email-delivery-failure.md
│   │   │   ├── HIPAA_AUDIT_LOG_FAILURE.md
│   │   │   ├── hipaa-breach-notification.md
│   │   │   ├── key-rotation.md
│   │   │   ├── performance-degradation.md
│   │   │   ├── REDIS_FAILURE.md
│   │   │   ├── SECURITY_INCIDENT.md
│   │   │   └── security-incident-response.md
│   │   ├── 📁 security
│   │   │   └── security-audit-guide.md
│   │   ├── Asclepius-Protocol-V1.0.txt
│   │   ├── AUDIT_LOGGING_VERIFICATION.md
│   │   ├── BAA_VENDOR_OUTREACH_PLAN.md
│   │   ├── BEMI_AUDIT_SETUP.md
│   │   ├── BEMI_POSTGRESQL_SETUP.md
│   │   ├── CALENDAR_SYNC_SETUP.md
│   │   ├── CASBIN_RBAC_GUIDE.md
│   │   ├── CI-CD-SETUP.md
│   │   ├── CLINICAL_WORKFLOW_VERIFICATION.md
│   │   ├── DATABASE_TUNING.md
│   │   ├── DEPLOYMENT_CHECKLIST.md
│   │   ├── DEPLOYMENT-README.md
│   │   ├── DEPLOYMENT-VPS.md
│   │   ├── DEV_SETUP.md
│   │   ├── FHIR_PRIVACY_DESIGN.md
│   │   ├── HIPAA_COMPLIANCE_CHECKLIST.md
│   │   ├── HIPAA_FHIR_COMPLIANCE.md
│   │   ├── HIPAA_RISK_ASSESSMENT.md
│   │   ├── INCIDENT_RESPONSE_PLAN.md
│   │   ├── LOG_RETENTION_POLICY.md
│   │   ├── MEDPLUM_INTEGRATION.md
│   │   ├── ON_CALL_GUIDE.md
│   │   ├── OPEN_SOURCE_ACCELERATION_TOOLS.md
│   │   ├── OPS_MANUAL.md
│   │   ├── PHI_HANDLING.md
│   │   ├── PRODUCTION_READINESS_STATUS.md
│   │   ├── RATE_LIMITING.md
│   │   ├── SECURITY_GUIDELINES.md
│   │   ├── SECURITY_HEADERS_GUIDE.md
│   │   ├── SECURITY_HEADERS.md
│   │   ├── SESSION_REVOCATION_GUIDE.md
│   │   ├── SYNTHEA_DEMO_DATA.md
│   │   ├── TEST_COVERAGE_PLAN.md
│   │   ├── TESTING_QUICK_START.md
│   │   ├── TESTING_TROUBLESHOOTING.md
│   │   ├── TRANSPARENT_ENCRYPTION_GUIDE.md
│   │   ├── TYPESCRIPT_ERRORS_REMAINING.md
│   │   ├── WAL_ARCHIVING_PITR.md
│   │   ├── WHATS_LEFT_MASTER_PLAN.md
│   │   └── WORKFORCE_TRAINING_PLAN.md
│   ├── 📁 Images to use for dashboard
│   │   ├── artificial-intelligence (1).svg
│   │   ├── artificial-intelligence.svg
│   │   ├── calendar (1).svg
│   │   ├── calendar.svg
│   │   ├── chart-cured-increasing (1).svg
│   │   ├── chart-cured-increasing.svg
│   │   ├── clinical-f (1).svg
│   │   ├── clinical-f.svg
│   │   ├── communication (1).svg
│   │   ├── communication.svg
│   │   ├── crisis-response_center_person.svg
│   │   ├── diagnostics (1).svg
│   │   ├── diagnostics.svg
│   │   ├── doctor (1).svg
│   │   ├── doctor-female (1).svg
│   │   ├── doctor-female.svg
│   │   ├── doctor-male (1).svg
│   │   ├── doctor-male.svg
│   │   ├── doctor.svg
│   │   ├── forum (1).svg
│   │   ├── forum.svg
│   │   ├── head (1).svg
│   │   ├── head.svg
│   │   ├── health (1).svg
│   │   ├── health (2).svg
│   │   ├── health (3).svg
│   │   ├── health-alt (1).svg
│   │   ├── health-alt.svg
│   │   ├── health-worker_form (1).svg
│   │   ├── health-worker_form.svg
│   │   ├── health.svg
│   │   ├── i-note_action (1).svg
│   │   ├── i-note_action.svg
│   │   ├── malnutrition (1).svg
│   │   ├── malnutrition.svg
│   │   ├── people (1).svg
│   │   ├── people.svg
│   │   ├── rx (1).svg
│   │   ├── rx.svg
│   │   ├── Sleek_DNA_Strand_H_Video_Generation.mp4
│   │   ├── speech-language_therapy (1).svg
│   │   ├── speech-language_therapy.svg
│   │   ├── stethoscope (1).svg
│   │   ├── stethoscope.svg
│   │   ├── telemedicine (1).svg
│   │   └── telemedicine.svg
│   ├── 📁 infra
│   │   ├── 📁 deploy
│   │   │   ├── deploy-production.sh
│   │   │   ├── DEPLOYMENT_RUNBOOK.md
│   │   │   └── README.md
│   │   ├── 📁 docker
│   │   │   ├── docker-compose.dev.yml
│   │   │   └── docker-compose.yml
│   │   ├── 📁 migrations
│   │   │   └── 001_init_rls_and_audit.sql
│   │   └── 📁 monitoring
│   │       ├── 📁 alerts
│   │       │   └── fhir-alerts.yml
│   │       ├── alertmanager.yml
│   │       ├── docker-compose.monitoring.yml
│   │       ├── grafana-dashboard-config.yml
│   │       ├── grafana-dashboard.json
│   │       ├── grafana-datasources.yml
│   │       ├── pagerduty-alerts.yaml
│   │       ├── prometheus.yml
│   │       └── README.md
│   ├── 📁 k6
│   │   ├── 📁 scenarios
│   │   │   ├── 01-login-surge.js
│   │   │   ├── 02-appointment-booking-peak.js
│   │   │   ├── 03-soap-note-generation.js
│   │   │   ├── 04-patient-portal-traffic.js
│   │   │   └── 05-api-stress-test.js
│   │   ├── .env.test.example
│   │   ├── config.json
│   │   ├── README.md
│   │   └── run-tests.sh
│   ├── 📁 learning-content
│   │   ├── transcript_interactive_quiz.html
│   │   ├── transcript_learning_content.json
│   │   └── transcript_study_guide.md
│   ├── 📁 legal
│   │   ├── BAA_TEMPLATE.md
│   │   ├── DPA_TEMPLATE.md
│   │   └── VENDOR_BAA_CHECKLIST.md
│   ├── 📁 Marketing
│   │   ├── 📁 Assets
│   │   │   ├── Gemini_Generated_Image_mccwy6mccwy6mccw.jpeg
│   │   │   ├── Gemini_Generated_Image_umwja9umwja9umwj (1).jpeg
│   │   │   ├── Gemini_Generated_Image_umwja9umwja9umwj.jpeg
│   │   │   ├── lab test demo .webp
│   │   │   ├── Landing Page Image 1.jpeg
│   │   │   ├── Landing Page Template.jpeg
│   │   │   ├── Logo + Color Palette_Holi Labs (4).png
│   │   │   ├── Logo 1_Dark (1).svg
│   │   │   ├── Logo 1_Dark.png
│   │   │   ├── Logo 1_Dark.svg
│   │   │   ├── Logo 1_Light (1).png
│   │   │   ├── Logo 1_Light.svg
│   │   │   ├── Mockup-of-a-consultation-note.png
│   │   │   └── Template-for-Discharge-Summary.ppm
│   │   └── Landing page holilabsv2.jpeg
│   ├── 📁 monitoring
│   │   └── alert-config.yml
│   ├── 📁 nginx
│   │   ├── 📁 ssl
│   │   │   ├── .gitignore
│   │   │   └── README.md
│   │   └── nginx.conf
│   ├── 📁 packages
│   │   ├── 📁 deid
│   │   │   ├── 📁 src
│   │   │   │   ├── dicom.d.ts
│   │   │   │   ├── dicom.d.ts.map
│   │   │   │   ├── dicom.js
│   │   │   │   ├── dicom.js.map
│   │   │   │   ├── dicom.ts
│   │   │   │   ├── differential-privacy.d.ts
│   │   │   │   ├── differential-privacy.d.ts.map
│   │   │   │   ├── differential-privacy.js
│   │   │   │   ├── differential-privacy.ts
│   │   │   │   ├── generalize.d.ts
│   │   │   │   ├── generalize.d.ts.map
│   │   │   │   ├── generalize.js
│   │   │   │   ├── generalize.js.map
│   │   │   │   ├── generalize.ts
│   │   │   │   ├── hybrid-deid.ts
│   │   │   │   ├── index.d.ts
│   │   │   │   ├── index.d.ts.map
│   │   │   │   ├── index.js
│   │   │   │   ├── index.js.map
│   │   │   │   ├── index.ts
│   │   │   │   ├── k-anonymity.d.ts
│   │   │   │   ├── k-anonymity.d.ts.map
│   │   │   │   ├── k-anonymity.js
│   │   │   │   ├── k-anonymity.ts
│   │   │   │   ├── nlp-redaction.d.ts
│   │   │   │   ├── nlp-redaction.d.ts.map
│   │   │   │   ├── nlp-redaction.js
│   │   │   │   ├── nlp-redaction.ts
│   │   │   │   ├── ocr.d.ts
│   │   │   │   ├── ocr.d.ts.map
│   │   │   │   ├── ocr.js
│   │   │   │   ├── ocr.js.map
│   │   │   │   ├── ocr.ts
│   │   │   │   ├── presidio-integration.ts
│   │   │   │   ├── privacy-budget.d.ts
│   │   │   │   ├── privacy-budget.d.ts.map
│   │   │   │   ├── privacy-budget.js
│   │   │   │   ├── privacy-budget.ts
│   │   │   │   ├── pseudonymization.ts
│   │   │   │   ├── pseudonymize.d.ts
│   │   │   │   ├── pseudonymize.d.ts.map
│   │   │   │   ├── pseudonymize.js
│   │   │   │   ├── pseudonymize.js.map
│   │   │   │   ├── pseudonymize.ts
│   │   │   │   ├── redact.d.ts
│   │   │   │   ├── redact.d.ts.map
│   │   │   │   ├── redact.js
│   │   │   │   ├── redact.js.map
│   │   │   │   ├── redact.ts
│   │   │   │   ├── types.d.ts
│   │   │   │   ├── types.d.ts.map
│   │   │   │   ├── types.js
│   │   │   │   ├── types.js.map
│   │   │   │   └── types.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── 📁 document-parser
│   │   │   ├── Dockerfile
│   │   │   ├── parse.py
│   │   │   └── requirements.txt
│   │   ├── 📁 dp
│   │   │   ├── 📁 src
│   │   │   │   ├── accountant.d.ts
│   │   │   │   ├── accountant.d.ts.map
│   │   │   │   ├── accountant.js
│   │   │   │   ├── accountant.js.map
│   │   │   │   ├── accountant.ts
│   │   │   │   ├── index.d.ts
│   │   │   │   ├── index.d.ts.map
│   │   │   │   ├── index.js
│   │   │   │   ├── index.js.map
│   │   │   │   ├── index.ts
│   │   │   │   ├── noise.d.ts
│   │   │   │   ├── noise.d.ts.map
│   │   │   │   ├── noise.js
│   │   │   │   ├── noise.js.map
│   │   │   │   ├── noise.ts
│   │   │   │   ├── receipt.d.ts
│   │   │   │   ├── receipt.d.ts.map
│   │   │   │   ├── receipt.js
│   │   │   │   ├── receipt.js.map
│   │   │   │   ├── receipt.ts
│   │   │   │   ├── types.d.ts
│   │   │   │   ├── types.d.ts.map
│   │   │   │   ├── types.js
│   │   │   │   ├── types.js.map
│   │   │   │   └── types.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── 📁 policy
│   │   │   ├── export_dp.rego
│   │   │   ├── purpose_binding.rego
│   │   │   └── residency.rego
│   │   ├── 📁 schemas
│   │   │   ├── 📁 src
│   │   │   │   ├── analytics.schema.ts
│   │   │   │   ├── appointment.schema.ts
│   │   │   │   ├── clinical.schema.ts
│   │   │   │   ├── compliance.schema.ts
│   │   │   │   ├── constants.ts
│   │   │   │   ├── index.d.ts
│   │   │   │   ├── index.d.ts.map
│   │   │   │   ├── index.js
│   │   │   │   ├── index.js.map
│   │   │   │   ├── index.ts
│   │   │   │   ├── patient.schema.ts
│   │   │   │   ├── prescription.schema.ts
│   │   │   │   └── user.schema.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   └── 📁 utils
│   │       ├── 📁 src
│   │       │   ├── canonical-serializer.ts
│   │       │   ├── crypto.d.ts
│   │       │   ├── crypto.d.ts.map
│   │       │   ├── crypto.js
│   │       │   ├── crypto.js.map
│   │       │   ├── crypto.ts
│   │       │   ├── index.d.ts
│   │       │   ├── index.d.ts.map
│   │       │   ├── index.js
│   │       │   ├── index.js.map
│   │       │   ├── index.ts
│   │       │   ├── logger.d.ts
│   │       │   ├── logger.d.ts.map
│   │       │   ├── logger.js
│   │       │   ├── logger.js.map
│   │       │   └── logger.ts
│   │       ├── package.json
│   │       └── tsconfig.json
│   ├── 📁 prisma
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── 📁 public
│   │   ├── 📁 images
│   │   │   ├── artificial-intelligence.svg
│   │   │   ├── bio-adaptive-hero-bg.jpeg
│   │   │   ├── futuristic-clinic-alt-1.jpg
│   │   │   ├── futuristic-clinic-alt-2.jpg
│   │   │   ├── futuristic-clinic-command-center.jpg
│   │   │   └── futuristic-health-command-center.jpeg
│   │   └── landing.html
│   ├── 📁 scripts
│   │   ├── 📁 blue-green
│   │   │   ├── get-active-environment.sh
│   │   │   ├── health-check.sh
│   │   │   ├── monitor-deployment.sh
│   │   │   ├── monitor-production.sh
│   │   │   ├── rollback.sh
│   │   │   └── switch-traffic.sh
│   │   ├── add-ts-ignore-missing-models.js
│   │   ├── backup-database.sh
│   │   ├── check-audit-coverage.sh
│   │   ├── check-translations.js
│   │   ├── comment-missing-models.js
│   │   ├── comment-out-missing-models.sh
│   │   ├── dr-test.sh
│   │   ├── encrypt-existing-phi.ts
│   │   ├── expo-go-qr.mjs
│   │   ├── fix-audit-detail-types.js
│   │   ├── fix-audit-details.js
│   │   ├── fix-audit-errors-pass2.js
│   │   ├── fix-audit-errors.js
│   │   ├── fix-audit-ipaddress.js
│   │   ├── fix-audit-logging.sh
│   │   ├── fix-audit-request-param.js
│   │   ├── fix-audit-syntax.js
│   │   ├── fix-audit-useragent-request.js
│   │   ├── fix-duplicate-properties.js
│   │   ├── fix-implicit-any-routes.js
│   │   ├── fix-orderby-timestamp.js
│   │   ├── generate-cosign-keys.sh
│   │   ├── generate-synthea-fhir-docker.sh
│   │   ├── generate-synthea-patients.sh
│   │   ├── generate-synthetic-data.ts
│   │   ├── init-casbin.ts
│   │   ├── install-pre-commit-hook.sh
│   │   ├── load-test-api.js
│   │   ├── pre-commit-hook.sh
│   │   ├── restore-database.sh
│   │   ├── run-dast-scan.sh
│   │   ├── seed-patients.ts
│   │   ├── seed-synthea-demo.sh
│   │   ├── setup-calendar-oauth.sh
│   │   ├── setup-git-secrets.sh
│   │   ├── setup-pgvector.sql
│   │   ├── setup-swap.sh
│   │   ├── setup-testing-tools.sh
│   │   ├── setup.sh
│   │   ├── test-cosign-signing.sh
│   │   ├── test-monitoring.sh
│   │   └── test-restore.sh
│   ├── 📁 test-files
│   │   └── test-lab-result.txt
│   ├── 📁 tests
│   │   ├── 📁 e2e
│   │   │   ├── 01-patient-registration.spec.ts
│   │   │   └── 02-prescription-creation.spec.ts
│   │   └── 📁 load
│   │       ├── api-baseline.js
│   │       └── prescription-load.js
│   ├── .commitlintrc.json
│   ├── .dockerignore
│   ├── .env.example
│   ├── .env.production.secrets.template
│   ├── .git-secrets-patterns.txt
│   ├── .gitallowed
│   ├── .gitignore
│   ├── .gitleaks.toml
│   ├── .lighthouserc.json
│   ├── AB_TESTING_DEPLOYMENT_CHECKLIST.md
│   ├── AB_TESTING_GUIDE.md
│   ├── AB_TESTING_READINESS.md
│   ├── ACCESSIBILITY_AUDIT.md
│   ├── AEGIS_ARCHITECTURE.md
│   ├── AGENT_26_COMPLETION_REPORT.md
│   ├── AGENT_26_FILE_TREE.md
│   ├── AI_CONFIDENCE_SCORING_IMPLEMENTATION.md
│   ├── AI_SCRIBE_PRIVACY_IMPLEMENTATION.md
│   ├── AI-INFRASTRUCTURE-DEPLOYMENT.md
│   ├── ANALYTICS_IMPLEMENTATION_COMPLETE.md
│   ├── ANALYTICS_MONITORING_COMPLETE.md
│   ├── ANALYTICS_SETUP.md
│   ├── app-spec.yaml
│   ├── APPOINTMENT_CONFLICT_DETECTION.md
│   ├── AUDIT_LOGGING_IMPROVEMENTS.md
│   ├── BAA_EMAIL_TEMPLATES_READY_TO_SEND.md
│   ├── BACKEND_APIS_COMPLETE.md
│   ├── BACKEND_COMPLETION_SUMMARY.md
│   ├── BACKEND_ROADMAP.md
│   ├── BLOCKING_TASKS_COMPLETE.md
│   ├── BRANCH_PROTECTION_SETUP.md
│   ├── BRAZILIAN-HEALTH-INTEROPERABILITY.md
│   ├── BUILD_REMEDIATION_REPORT.md
│   ├── BUILD_SUCCESS_TYPESCRIPT_FIXES.md
│   ├── CASE_STUDIES_HEALTH_3.0.md
│   ├── CDSS_IMPLEMENTATION_GUIDE.md
│   ├── check-appointments.sql
│   ├── CICD_PIPELINE_AUDIT.md
│   ├── CICD_QUICK_REFERENCE.md
│   ├── CLAUDE.md
│   ├── CLINICAL_NOTE_VERSIONING.md
│   ├── COMPLETE_APPOINTMENT_SYSTEM_SETUP.md
│   ├── COMPLETE_IMPLEMENTATION_CHECKLIST.md
│   ├── COMPLETE_IMPLEMENTATION_SUMMARY.md
│   ├── CONFIRMATION_SYSTEM_SETUP.md
│   ├── COSIGN_IMAGE_SIGNING_GUIDE.md
│   ├── COSIGN_IMPLEMENTATION_COMPLETE.md
│   ├── COSIGN_QUICK_REFERENCE.md
│   ├── cosign.pub
│   ├── CRITICAL_GAPS_AND_FIXES.md
│   ├── CURRENT_STATUS.md
│   ├── DAST_IMPLEMENTATION_COMPLETE.md
│   ├── DAST_QUICK_REFERENCE.md
│   ├── DAST_SECURITY_GUIDE.md
│   ├── DATA_SUPREMACY.md
│   ├── deploy-production.sh
│   ├── DEPLOY.md
│   ├── deploy.sh
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── DEPLOYMENT_FAILURE_PREVENTION.md
│   ├── DEPLOYMENT_FIX_SUMMARY.md
│   ├── DEPLOYMENT_FIX.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── DEPLOYMENT_INSTRUCTIONS.md
│   ├── DEPLOYMENT_QUICK_START.md
│   ├── DEPLOYMENT_READY_STATUS.md
│   ├── DEPLOYMENT_READY.md
│   ├── DEPLOYMENT_SECRETS_CHECKLIST.md
│   ├── DEPLOYMENT_SUCCESS.md
│   ├── DEPLOYMENT_SUMMARY.md
│   ├── DEPLOYMENT_VERIFICATION.md
│   ├── DEPLOYMENT-CHECKLIST.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT_SESSION_SUMMARY.md
│   ├── DICOM_METADATA_SUPPORT.md
│   ├── DIGITALOCEAN_DEPLOYMENT.md
│   ├── DIGITALOCEAN_DROPLET_DEPLOYMENT.md
│   ├── DIGITALOCEAN_ENV_SETUP.md
│   ├── DIGITALOCEAN_ENV_VARS.txt
│   ├── DOCKER_WORKFLOW.md
│   ├── docker-compose.presidio.yml
│   ├── docker-compose.prod.yml
│   ├── docker-compose.testing.yml
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── DOMAIN_MIGRATION_HOLILABS.xyz.md
│   ├── DROPLET_MASTER_PROMPT.md
│   ├── ENTERPRISE_COMPLETE_SUMMARY.md
│   ├── ENTERPRISE_READINESS_PROGRESS.md
│   ├── ENVIRONMENT_COMPARISON_MATRIX.md
│   ├── ENVIRONMENT_SETUP_README.md
│   ├── ENVIRONMENT_SETUP_SUMMARY.md
│   ├── ENVIRONMENT_STATUS.md
│   ├── EXECUTION_SUMMARY.md
│   ├── expo-connect.html
│   ├── expo-go-qr.png
│   ├── expo-go-url.txt
│   ├── expo-qr-code.html
│   ├── FEATURE_FLAGS_GUIDE.md
│   ├── FINAL_DEPLOYMENT_STATUS.md
│   ├── fix-error-exposure.sh
│   ├── FIXES_SUMMARY.md
│   ├── FUNNELS_AND_DASHBOARDS_GUIDE.md
│   ├── GETTING_STARTED.md
│   ├── GITHUB_BRANCH_PROTECTION_SETUP.md
│   ├── GITHUB_RESEARCH_PLAN.md
│   ├── gitleaks-report.json
│   ├── GOOGLE_CLOUD_SQL_DEPLOYMENT.md
│   ├── GOOGLE_OAUTH_SETUP.md
│   ├── GTM_COMPETITIVE_POSITIONING.md
│   ├── HIPAA_BAA_REQUIREMENTS.md
│   ├── HOLILABS_BRIEFING_DOCUMENT.md
│   ├── HOLILABS_XYZ_DEPLOYMENT.md
│   ├── HYBRID_DEID_IMPLEMENTATION.md
│   ├── IMMEDIATE_ACTION_PLAN.md
│   ├── IMMEDIATE_NEXT_ACTIONS.md
│   ├── IMMEDIATE_SECURITY_ACTIONS.md
│   ├── IMPLEMENTATION_NOTES.md
│   ├── IMPLEMENTATION_STATUS.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── IMPROVEMENTS_IMPLEMENTATION.md
│   ├── INDUSTRY_GRADE_GAPS.md
│   ├── INFRASTRUCTURE_AUTOMATION_DEPLOYMENT.md
│   ├── INTRO_AND_GOOGLE_AUTH_IMPLEMENTATION.md
│   ├── INVITATION_SYSTEM_GUIDE.md
│   ├── IPHONE_PWA_TEST_RESULTS.md
│   ├── K6_LOAD_TESTING_COMPLETE.md
│   ├── K6_QUICK_START.md
│   ├── LANDING_PAGE_UPGRADE_SUMMARY.md
│   ├── landing-page.html
│   ├── launch-expo-go.sh
│   ├── LIQUID_CLINICAL_REFACTOR_SUMMARY.md
│   ├── LOCAL_DEVELOPMENT_SETUP.md
│   ├── LOCAL_ENV_SETUP_GUIDE.md
│   ├── MAJOR_LANDING_PAGE_REDESIGN.md
│   ├── MEDICAL_LICENSE_VERIFICATION.md
│   ├── MIGRATION_SUMMARY.md
│   ├── MONETIZATION_STRATEGY.md
│   ├── MONITORING_QUICK_REFERENCE.md
│   ├── MONITORING_SETUP_GUIDE.md
│   ├── MONITORING_SETUP_INSTRUCTIONS.md
│   ├── MONITORING_SETUP.md
│   ├── NAVIGATION_IMPROVEMENTS.md
│   ├── NEXT_STEPS_IMPLEMENTATION.md
│   ├── NORDVPN_FLAGGING_IMMEDIATE_ACTIONS.md
│   ├── OPEN_SOURCE_RESEARCH_FINDINGS.md
│   ├── package.json
│   ├── PATIENT_PORTAL_IMPROVEMENTS.md
│   ├── PATIENT_PORTAL_README.md
│   ├── PEQUENO-COTOLENGO-PILOT.md
│   ├── PERFORMANCE_MONITORING.md
│   ├── PHASE_2_CLINICAL_DECISION_SUPPORT_COMPLETE.md
│   ├── PHASE_2_COMPLETED.md
│   ├── PHASE_2_COMPLETION.md
│   ├── PHASE_2_SMART_TEMPLATES_COMPLETE.md
│   ├── PHASE_3_2_QUICK_ACTIONS_COMPLETE.md
│   ├── PHASE_3_3_VOICE_COMMANDS_COMPLETE.md
│   ├── PHASE_3_PRIORITY_DASHBOARD_COMPLETE.md
│   ├── PHASE_4_MAR_COMPLETE.md
│   ├── PHASE_5_SCHEDULING_PLAN.md
│   ├── PHASE1_IMPLEMENTATION_SUMMARY.md
│   ├── PHASE2_QUICK_WINS_COMPLETE.md
│   ├── PINO_IMPLEMENTATION.md
│   ├── playwright.config.ts
│   ├── pnpm-lock.yaml
│   ├── pnpm-workspace.yaml
│   ├── POSTHOG_PRODUCTION_SETUP_GUIDE.md
│   ├── PRESIDIO_DEPLOYMENT_GUIDE.md
│   ├── PRESIDIO_HYBRID_DEID_GUIDE.md
│   ├── PREVENTION_HUB_IMPLEMENTATION.md
│   ├── PRICING_IMPLEMENTATION_SUMMARY.md
│   ├── PRIVACY_CONSENT_IMPLEMENTATION_COMPLETE.md
│   ├── PRODUCT_CAPABILITIES.md
│   ├── PRODUCT_ROADMAP_2025.md
│   ├── PRODUCT_ROADMAP.md
│   ├── PRODUCTION_DEPLOYMENT_GUIDE.md
│   ├── PRODUCTION_LAUNCH_CHECKLIST.md
│   ├── PRODUCTION_READINESS_CHECKLIST.md
│   ├── PRODUCTION_READINESS.md
│   ├── PRODUCTION_READY_SUMMARY.md
│   ├── PROJECT_SNAPSHOT.md
│   ├── PROJECT_SUMMARY.md
│   ├── PUSH_NOTIFICATION_DIAGRAMS.md
│   ├── QUICK_DEPLOYMENT_GUIDE.md
│   ├── QUICK_REFERENCE.md
│   ├── QUICK_START_GOOGLE_AUTH.md
│   ├── QUICK_START_INVITATION_SYSTEM.md
│   ├── QUICK_START_LOCAL.md
│   ├── QUICK_WINS_COMPLETE.md
│   ├── QUICK_WINS_IMPLEMENTED.md
│   ├── QUICKSTART_DIGITALOCEAN.md
│   ├── README_TRANSCRIPT_QUIZ.md
│   ├── README.md
│   ├── REALTIME_AND_OFFLINE_AI_IMPLEMENTATION.md
│   ├── RED_TEAM_AUDIT_REPORT.md
│   ├── RED_TEAM_REPORT.md
│   ├── REDIS_CACHING_IMPLEMENTATION.md
│   ├── REFERRAL_SYSTEM_COMPLETE.md
│   ├── RLHF_IMPLEMENTATION_GUIDE.md
│   ├── ROADMAP.md
│   ├── SCHEMA_MIGRATION_GUIDE.md
│   ├── SECRETS_GENERATION.md
│   ├── SECURITY_AUDIT_REPORT_2025-01-08.md
│   ├── SECURITY_AUDIT_REPORT.md
│   ├── SECURITY_DEPLOYMENT_CHECKLIST.md
│   ├── SECURITY_FIXES_SUMMARY_2025-01-08.md
│   ├── SECURITY_FIXES_SUMMARY.md
│   ├── SECURITY_HARDENING_REPORT.md
│   ├── SECURITY_QUICK_REFERENCE.md
│   ├── SECURITY_REVOCATION_ADVISORY.md
│   ├── SECURITY_SECRET_ROTATION_PLAN.md
│   ├── SECURITY.md
│   ├── SENTRY_SETUP.md
│   ├── SESSION_COMPLETE_SUMMARY.md
│   ├── SESSION_FINAL_SUMMARY_OCT_26.md
│   ├── SESSION_SUMMARY_JAN_15_2025.md
│   ├── SESSION_SUMMARY_OCT_26_2025.md
│   ├── SESSION_SUMMARY.md
│   ├── setup-git-secrets.sh
│   ├── setup-invitation-system.sh
│   ├── SOC2_PHASE1_COMPLETE.md
│   ├── SOC2_PHASE1_IMPLEMENTATION_SUMMARY.md
│   ├── SOC2_PHASE1_WEEK3_CASBIN_COMPLETE.md
│   ├── STABILIZATION_REPORT.md
│   ├── START_HERE.md
│   ├── start-expo.sh
│   ├── TECHNICAL_FIXES_SUMMARY.md
│   ├── Test
│   ├── test-quick-wins.sh
│   ├── test-whatsapp.sh
│   ├── TESTING_GUIDE_PHASE_2.md
│   ├── transcript-to-quiz.js
│   ├── tsconfig.json
│   ├── turbo.json
│   ├── TWILIO_SETUP_QUICKSTART.md
│   ├── update-env-keys.sh
│   ├── verify_deepgram_scribe.py
│   ├── VISION_AND_ROADMAP.md
│   ├── WEB_PUSH_NOTIFICATIONS_COMPLETE.md
│   ├── WEBSITE_SECURITY_FLAGGING_FIX.md
│   ├── WEEK-1-PROGRESS.md
│   └── WORKFLOW_EXPLAINED.md
├── 📁 p1-model-routing
│   ├── 📁 .claude
│   │   ├── memory.md
│   │   └── settings.local.json
│   ├── 📁 .github
│   │   ├── 📁 workflows
│   │   │   ├── cdss-performance-test.yml
│   │   │   ├── ci-cd.yml
│   │   │   ├── ci.yml
│   │   │   ├── coverage-report.yml
│   │   │   ├── dast-scan.yml
│   │   │   ├── database-backup.yml
│   │   │   ├── deploy-production.yml
│   │   │   ├── deploy-staging.yml
│   │   │   ├── deploy-vps.yml
│   │   │   ├── deploy.yml
│   │   │   ├── disaster-recovery-test.yml
│   │   │   ├── health-check.yml
│   │   │   ├── load-testing.yml
│   │   │   ├── pr-checks.yml
│   │   │   ├── security-enhanced.yml
│   │   │   ├── sign-and-verify-images.yml
│   │   │   └── test.yml
│   │   ├── dependabot.yml
│   │   └── PULL_REQUEST_TEMPLATE_SECURITY.md
│   ├── 📁 .husky
│   │   └── pre-commit
│   ├── 📁 .zap
│   │   └── rules.tsv
│   ├── 📁 apps
│   │   ├── 📁 api
│   │   │   ├── 📁 prisma
│   │   │   │   ├── 📁 migrations
│   │   │   │   │   ├── 📁 20251004060226_init
              └── ... (truncated)
│   │   │   │   │   └── migration_lock.toml
│   │   │   │   ├── schema.prisma
│   │   │   │   └── seed.ts
│   │   │   ├── 📁 scripts
│   │   │   │   ├── check-env.sh
│   │   │   │   └── healthcheck.sh
│   │   │   ├── 📁 src
│   │   │   │   ├── 📁 lib
│   │   │   │   │   ├── env-validation.ts
│   │   │   │   │   └── prisma-fhir-middleware.ts
│   │   │   │   ├── 📁 plugins
│   │   │   │   │   └── metrics-middleware.ts
│   │   │   │   ├── 📁 routes
│   │   │   │   │   ├── admin.d.ts
│   │   │   │   │   ├── admin.d.ts.map
│   │   │   │   │   ├── admin.js
│   │   │   │   │   ├── admin.js.map
│   │   │   │   │   ├── admin.ts
│   │   │   │   │   ├── ai.d.ts
│   │   │   │   │   ├── ai.d.ts.map
│   │   │   │   │   ├── ai.js
│   │   │   │   │   ├── ai.js.map
│   │   │   │   │   ├── ai.ts
│   │   │   │   │   ├── auth.d.ts
│   │   │   │   │   ├── auth.d.ts.map
│   │   │   │   │   ├── auth.js
│   │   │   │   │   ├── auth.js.map
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── exports.d.ts
│   │   │   │   │   ├── exports.d.ts.map
│   │   │   │   │   ├── exports.js
│   │   │   │   │   ├── exports.js.map
│   │   │   │   │   ├── exports.ts
│   │   │   │   │   ├── fhir-admin.ts
│   │   │   │   │   ├── fhir-export.ts
│   │   │   │   │   ├── fhir-ingress.ts
│   │   │   │   │   ├── monitoring.ts
│   │   │   │   │   ├── patients.d.ts
│   │   │   │   │   ├── patients.d.ts.map
│   │   │   │   │   ├── patients.js
│   │   │   │   │   ├── patients.js.map
│   │   │   │   │   ├── patients.ts
│   │   │   │   │   ├── upload.d.ts
│   │   │   │   │   ├── upload.d.ts.map
│   │   │   │   │   ├── upload.js
│   │   │   │   │   ├── upload.js.map
│   │   │   │   │   └── upload.ts
│   │   │   │   ├── 📁 services
│   │   │   │   │   ├── 📁 monitoring
              └── ... (truncated)
│   │   │   │   │   ├── fhir-audit-mirror.ts
│   │   │   │   │   ├── fhir-queue.ts
│   │   │   │   │   ├── fhir-reconciliation.ts
│   │   │   │   │   ├── fhir-sync-enhanced.ts
│   │   │   │   │   └── fhir-sync.ts
│   │   │   │   ├── index.d.ts
│   │   │   │   ├── index.d.ts.map
│   │   │   │   ├── index.js
│   │   │   │   ├── index.js.map
│   │   │   │   └── index.ts
│   │   │   ├── 📁 tests
│   │   │   │   ├── fhir-export.test.ts
│   │   │   │   ├── fhir-ingress.test.ts
│   │   │   │   ├── fhir-reconciliation.test.ts
│   │   │   │   └── setup.ts
│   │   │   ├── Dockerfile
│   │   │   ├── package.json
│   │   │   ├── tsconfig.json
│   │   │   └── vitest.config.ts
│   │   ├── 📁 messages
│   │   │   ├── en.json
│   │   │   ├── es.json
│   │   │   └── pt.json
│   │   ├── 📁 mobile
│   │   │   ├── 📁 assets
│   │   │   │   ├── generate_splash.py
│   │   │   │   ├── generate-assets.md
│   │   │   │   ├── icon-template.svg
│   │   │   │   ├── README.md
│   │   │   │   └── splash-template.svg
│   │   │   ├── 📁 src
│   │   │   │   ├── 📁 components
│   │   │   │   │   ├── 📁 ui
              └── ... (truncated)
│   │   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   │   ├── LoadingScreen.tsx
│   │   │   │   │   └── WebSocketStatus.tsx
│   │   │   │   ├── 📁 config
│   │   │   │   │   ├── api.d.ts
│   │   │   │   │   ├── api.d.ts.map
│   │   │   │   │   ├── api.js
│   │   │   │   │   ├── api.js.map
│   │   │   │   │   ├── api.ts
│   │   │   │   │   ├── appTheme.ts
│   │   │   │   │   ├── designTokens.ts
│   │   │   │   │   ├── queryClient.ts
│   │   │   │   │   ├── theme.d.ts
│   │   │   │   │   ├── theme.d.ts.map
│   │   │   │   │   ├── theme.js
│   │   │   │   │   ├── theme.js.map
│   │   │   │   │   └── theme.ts
│   │   │   │   ├── 📁 features
│   │   │   │   │   ├── 📁 auth
              └── ... (truncated)
│   │   │   │   │   ├── 📁 onboarding
              └── ... (truncated)
│   │   │   │   │   ├── 📁 patients
              └── ... (truncated)
│   │   │   │   │   ├── 📁 prevention
              └── ... (truncated)
│   │   │   │   │   ├── 📁 recording
              └── ... (truncated)
│   │   │   │   │   └── 📁 transcription
              └── ... (truncated)
│   │   │   │   ├── 📁 hooks
│   │   │   │   │   ├── useAccessibility.ts
│   │   │   │   │   ├── useBiometricAuth.ts
│   │   │   │   │   ├── useNotifications.ts
│   │   │   │   │   ├── useOfflineSync.ts
│   │   │   │   │   ├── useSplashScreen.ts
│   │   │   │   │   ├── useTheme.ts
│   │   │   │   │   └── useWebSocket.ts
│   │   │   │   ├── 📁 navigation
│   │   │   │   │   ├── AppNavigator.tsx
│   │   │   │   │   ├── AuthNavigator.d.ts
│   │   │   │   │   ├── AuthNavigator.d.ts.map
│   │   │   │   │   ├── AuthNavigator.js
│   │   │   │   │   ├── AuthNavigator.js.map
│   │   │   │   │   ├── AuthNavigator.tsx
│   │   │   │   │   ├── linking.ts
│   │   │   │   │   ├── MainNavigator.d.ts
│   │   │   │   │   ├── MainNavigator.d.ts.map
│   │   │   │   │   ├── MainNavigator.js
│   │   │   │   │   ├── MainNavigator.js.map
│   │   │   │   │   ├── MainNavigator.tsx
│   │   │   │   │   ├── RootNavigator.d.ts
│   │   │   │   │   ├── RootNavigator.d.ts.map
│   │   │   │   │   ├── RootNavigator.js
│   │   │   │   │   ├── RootNavigator.js.map
│   │   │   │   │   ├── RootNavigator.tsx
│   │   │   │   │   └── types.ts
│   │   │   │   ├── 📁 providers
│   │   │   │   │   └── WebSocketProvider.tsx
│   │   │   │   ├── 📁 screens
│   │   │   │   │   ├── AppointmentsScreen.tsx
│   │   │   │   │   ├── CoPilotScreen.tsx
│   │   │   │   │   ├── EnhancedLoginScreen.tsx
│   │   │   │   │   ├── HomeDashboardScreen.tsx
│   │   │   │   │   ├── MessagingScreen.tsx
│   │   │   │   │   ├── PatientDashboardScreen.tsx
│   │   │   │   │   ├── PatientSearchScreen.tsx
│   │   │   │   │   ├── PrivacyConsentScreen.tsx
│   │   │   │   │   ├── SettingsScreen.tsx
│   │   │   │   │   └── SmartDiagnosisScreen.tsx
│   │   │   │   ├── 📁 services
│   │   │   │   │   ├── analyticsService.tsx
│   │   │   │   │   ├── biometricAuth.ts
│   │   │   │   │   ├── haptics.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── notificationService.ts
│   │   │   │   │   └── websocket.ts
│   │   │   │   ├── 📁 shared
│   │   │   │   │   ├── 📁 components
              └── ... (truncated)
│   │   │   │   │   ├── 📁 contexts
              └── ... (truncated)
│   │   │   │   │   ├── 📁 services
              └── ... (truncated)
│   │   │   │   │   └── 📁 types
              └── ... (truncated)
│   │   │   │   ├── 📁 store
│   │   │   │   │   ├── authStore.d.ts
│   │   │   │   │   ├── authStore.d.ts.map
│   │   │   │   │   ├── authStore.js
│   │   │   │   │   ├── authStore.js.map
│   │   │   │   │   └── authStore.ts
│   │   │   │   └── 📁 stores
│   │   │   │       ├── appointmentStore.ts
│   │   │   │       ├── index.ts
│   │   │   │       ├── onboardingStore.ts
│   │   │   │       ├── patientStore.ts
│   │   │   │       ├── preventionStore.ts
│   │   │   │       └── recordingStore.ts
│   │   │   ├── .env.example
│   │   │   ├── .gitignore
│   │   │   ├── ACCESSIBILITY_GUIDE.md
│   │   │   ├── App.d.ts
│   │   │   ├── App.d.ts.map
│   │   │   ├── App.js
│   │   │   ├── App.js.map
│   │   │   ├── app.json
│   │   │   ├── App.tsx
│   │   │   ├── ARCHITECTURE_MASTER_PLAN.md
│   │   │   ├── babel.config.js
│   │   │   ├── BUGFIX_SESSION.md
│   │   │   ├── COMPONENT_EXAMPLES.md
│   │   │   ├── CURRENT_STATUS.md
│   │   │   ├── DEPLOYMENT.md
│   │   │   ├── DEVELOPMENT_PROGRESS.md
│   │   │   ├── eas.json
│   │   │   ├── EXPO_GO_QUICKSTART.md
│   │   │   ├── IMPLEMENTATION_COMPLETE.md
│   │   │   ├── index.js
│   │   │   ├── MOBILE_APP_SUMMARY.md
│   │   │   ├── NAVIGATION_GUIDE.md
│   │   │   ├── NEXT_STEPS.md
│   │   │   ├── NOTIFICATION_IMPLEMENTATION_GUIDE.md
│   │   │   ├── NOTIFICATION_PAYLOAD_REFERENCE.md
│   │   │   ├── ONBOARDING_TESTING.md
│   │   │   ├── package.json
│   │   │   ├── PATIENT_SEARCH_GUIDE.md
│   │   │   ├── PERFORMANCE.md
│   │   │   ├── PHASE_1_PREVENTION_IMPLEMENTATION.md
│   │   │   ├── PHASE_1_TESTING.md
│   │   │   ├── PHASE_7_MOBILE_API_REFERENCE.md
│   │   │   ├── PHASE_7_MOBILE_MIGRATION_STATUS.md
│   │   │   ├── PREVENTION_TROUBLESHOOTING.md
│   │   │   ├── PRODUCTION_CHECKLIST.md
│   │   │   ├── PROJECT_SUMMARY.md
│   │   │   ├── PUSH_NOTIFICATION_ARCHITECTURE.md
│   │   │   ├── QUICK_START.md
│   │   │   ├── README.md
│   │   │   ├── README.old.md
│   │   │   ├── SESSION_SUMMARY.md
│   │   │   ├── STORE_USAGE_GUIDE.md
│   │   │   ├── TESTING_GUIDE.md
│   │   │   ├── TESTING_QUICK_START.md
│   │   │   └── tsconfig.json
│   │   └── 📁 web
│   │       ├── 📁 .swc
│   │       │   └── 📁 plugins
│   │       │       └── 📁 v7_macos_aarch64_0.106.15
              └── ... (truncated)
│   │       ├── 📁 apps
│   │       │   └── 📁 web
│   │       │       ├── 📁 src
              └── ... (truncated)
│   │       │       └── config.yaml
│   │       ├── 📁 config
│   │       │   └── casbin-model.conf
│   │       ├── 📁 docs
│   │       │   ├── 📁 runbooks
│   │       │   │   ├── DISASTER_RECOVERY.md
│   │       │   │   └── ssl-certificate-renewal.md
│   │       │   ├── AI_MONETIZATION_STRATEGY.md
│   │       │   ├── ALERTING_RULES.md
│   │       │   ├── API_DOCUMENTATION.md
│   │       │   ├── BACKUP_AND_RECOVERY.md
│   │       │   ├── CDSS_PERFORMANCE_OPTIMIZATION.md
│   │       │   ├── CLOUDFLARE_R2_SETUP.md
│   │       │   ├── CRON_JOBS.md
│   │       │   ├── DATABASE_DEPLOYMENT.md
│   │       │   ├── DEMO_AUTH_REMOVAL.md
│   │       │   ├── DEPLOYMENT_GUIDE.md
│   │       │   ├── DEPLOYMENT_STATUS.md
│   │       │   ├── DEPLOYMENT_SUMMARY.md
│   │       │   ├── DNS_CONFIGURATION.md
│   │       │   ├── ENHANCED_FEATURES_PLAN.md
│   │       │   ├── ENVIRONMENT_VARIABLES.md
│   │       │   ├── FILE_UPLOAD_SYSTEM.md
│   │       │   ├── FORMS_SYSTEM_IMPLEMENTATION.md
│   │       │   ├── IMPLEMENTATION_COMPLETE.md
│   │       │   ├── IMPLEMENTATION_PROGRESS.md
│   │       │   ├── LANDING_PAGE_REDESIGN.md
│   │       │   ├── MANUAL_TESTING_CHECKLIST.md
│   │       │   ├── MONITORING_DASHBOARD.md
│   │       │   ├── MONITORING_STRATEGY.md
│   │       │   ├── PATIENT_CONTEXT_FORMATTER.md
│   │       │   ├── PHARMACY_INTEGRATION.md
│   │       │   ├── PRODUCTION_DEPLOYMENT_CHECKLIST.md
│   │       │   ├── PRODUCTION_READINESS.md
│   │       │   ├── PUSH_NOTIFICATIONS.md
│   │       │   ├── SECRETS_AUDIT.md
│   │       │   ├── SECRETS_MANAGEMENT.md
│   │       │   ├── SECURITY_TESTING.md
│   │       │   ├── SENTRY_SETUP.md
│   │       │   ├── SESSION_MANAGEMENT.md
│   │       │   ├── SMS_APPOINTMENT_REMINDERS.md
│   │       │   ├── SOAP_NOTE_GENERATION.md
│   │       │   ├── SSL_TLS_QUICK_REFERENCE.md
│   │       │   ├── SSL_TLS_SETUP.md
│   │       │   ├── STORAGE_COMPARISON.md
│   │       │   ├── TEST_SUMMARY.md
│   │       │   ├── TESTING.md
│   │       │   ├── TROUBLESHOOTING.md
│   │       │   ├── TYPESCRIPT_FIXES.md
│   │       │   └── UPSTASH_REDIS_SETUP.md
│   │       ├── 📁 locales
│   │       │   ├── 📁 en
│   │       │   │   └── common.json
│   │       │   ├── 📁 es
│   │       │   │   └── common.json
│   │       │   └── 📁 pt
│   │       │       └── common.json
│   │       ├── 📁 messages
│   │       │   ├── en.json
│   │       │   ├── es.json
│   │       │   └── pt.json
│   │       ├── 📁 pages
│   │       │   └── 📁 api
│   │       │       └── socketio.ts
│   │       ├── 📁 playwright-report
│   │       │   ├── 📁 data
│   │       │   │   ├── 134b08df46350408543840ce3dead8b60d5d2592.webm
│   │       │   │   ├── 93939cd377a73b6c856d28b7832b25efefe3b908.png
│   │       │   │   ├── d12ca40e742be22256847c90bc0729668cbc2ba2.md
│   │       │   │   └── e8f34cae6f695b4a1b90423546ffb6f00c6f2091.webm
│   │       │   ├── index.html
│   │       │   └── results.json
│   │       ├── 📁 prisma
│   │       │   ├── 📁 migrations
│   │       │   │   ├── 📁 20251205_web2_interop_foundation
              └── ... (truncated)
│   │       │   │   ├── 📁 20251214_cdss_performance_indexes
              └── ... (truncated)
│   │       │   │   ├── 📁 20251215_session_security_tokens
              └── ... (truncated)
│   │       │   │   └── migration_lock.toml
│   │       │   ├── 📁 seed
│   │       │   │   └── clinical-protocols.ts
│   │       │   ├── 📁 seeds
│   │       │   │   ├── clinical-templates.d.ts
│   │       │   │   ├── clinical-templates.d.ts.map
│   │       │   │   ├── clinical-templates.js
│   │       │   │   ├── clinical-templates.ts
│   │       │   │   ├── prevention-templates.ts
│   │       │   │   └── test-clinical-data.ts
│   │       │   ├── consolidated_migration.sql
│   │       │   ├── migration_add_invitation_beta_models.sql
│   │       │   ├── schema.prisma
│   │       │   ├── seed-palliative-care.d.ts
│   │       │   ├── seed-palliative-care.d.ts.map
│   │       │   ├── seed-palliative-care.js
│   │       │   ├── seed-palliative-care.js.map
│   │       │   ├── seed-palliative-care.ts
│   │       │   ├── seed-patients.d.ts
│   │       │   ├── seed-patients.d.ts.map
│   │       │   ├── seed-patients.js
│   │       │   ├── seed-patients.js.map
│   │       │   ├── seed-patients.ts
│   │       │   ├── seed-production.d.ts
│   │       │   ├── seed-production.d.ts.map
│   │       │   ├── seed-production.js
│   │       │   ├── seed-production.js.map
│   │       │   ├── seed-production.ts
│   │       │   ├── seed-situations.d.ts
│   │       │   ├── seed-situations.d.ts.map
│   │       │   ├── seed-situations.js
│   │       │   ├── seed-situations.ts
│   │       │   ├── seed.d.ts
│   │       │   ├── seed.d.ts.map
│   │       │   ├── seed.js
│   │       │   ├── seed.js.map
│   │       │   └── seed.ts
│   │       ├── 📁 public
│   │       │   ├── 📁 .well-known
│   │       │   │   └── security.txt
│   │       │   ├── 📁 demo
│   │       │   │   ├── lab-cbc.svg
│   │       │   │   ├── lab-report.svg
│   │       │   │   ├── xray-chest.svg
│   │       │   │   ├── xray-hand.svg
│   │       │   │   └── xray-knee.svg
│   │       │   ├── 📁 demo-files
│   │       │   │   ├── consultation_note_demo-patient-11_12.txt
│   │       │   │   ├── consultation_note_demo-patient-15_16.txt
│   │       │   │   ├── consultation_note_demo-patient-19_20.txt
│   │       │   │   ├── consultation_note_demo-patient-23_24.txt
│   │       │   │   ├── consultation_note_demo-patient-27_28.txt
│   │       │   │   ├── consultation_note_demo-patient-3_4.txt
│   │       │   │   ├── consultation_note_demo-patient-7_8.txt
│   │       │   │   ├── index.json
│   │       │   │   ├── lab_result_demo-patient-1_2.txt
│   │       │   │   ├── lab_result_demo-patient-13_14.txt
│   │       │   │   ├── lab_result_demo-patient-17_18.txt
│   │       │   │   ├── lab_result_demo-patient-21_22.txt
│   │       │   │   ├── lab_result_demo-patient-25_26.txt
│   │       │   │   ├── lab_result_demo-patient-29_30.txt
│   │       │   │   ├── lab_result_demo-patient-5_6.txt
│   │       │   │   ├── lab_result_demo-patient-9_10.txt
│   │       │   │   ├── medical_history_demo-patient-0_1.txt
│   │       │   │   ├── medical_history_demo-patient-12_13.txt
│   │       │   │   ├── medical_history_demo-patient-16_17.txt
│   │       │   │   ├── medical_history_demo-patient-20_21.txt
│   │       │   │   ├── medical_history_demo-patient-24_25.txt
│   │       │   │   ├── medical_history_demo-patient-28_29.txt
│   │       │   │   ├── medical_history_demo-patient-4_5.txt
│   │       │   │   ├── medical_history_demo-patient-8_9.txt
│   │       │   │   ├── prescription_demo-patient-10_11.txt
│   │       │   │   ├── prescription_demo-patient-14_15.txt
│   │       │   │   ├── prescription_demo-patient-18_19.txt
│   │       │   │   ├── prescription_demo-patient-2_3.txt
│   │       │   │   ├── prescription_demo-patient-22_23.txt
│   │       │   │   ├── prescription_demo-patient-26_27.txt
│   │       │   │   └── prescription_demo-patient-6_7.txt
│   │       │   ├── 📁 icons
│   │       │   │   ├── apple-calendar.svg
│   │       │   │   ├── artificial-intelligence (1).svg
│   │       │   │   ├── artificial-intelligence.svg
│   │       │   │   ├── calendar (1).svg
│   │       │   │   ├── calendar.svg
│   │       │   │   ├── chart-cured-increasing (1).svg
│   │       │   │   ├── chart-cured-increasing.svg
│   │       │   │   ├── clinical-f (1).svg
│   │       │   │   ├── clinical-f.svg
│   │       │   │   ├── communication (1).svg
│   │       │   │   ├── communication.svg
│   │       │   │   ├── crisis-response_center_person.svg
│   │       │   │   ├── diagnostics (1).svg
│   │       │   │   ├── diagnostics.svg
│   │       │   │   ├── doctor (1).svg
│   │       │   │   ├── doctor-female (1).svg
│   │       │   │   ├── doctor-female.svg
│   │       │   │   ├── doctor-male (1).svg
│   │       │   │   ├── doctor-male.svg
│   │       │   │   ├── doctor.svg
│   │       │   │   ├── forum (1).svg
│   │       │   │   ├── forum.svg
│   │       │   │   ├── google-calendar.svg
│   │       │   │   ├── head (1).svg
│   │       │   │   ├── head.svg
│   │       │   │   ├── health (1).svg
│   │       │   │   ├── health (2).svg
│   │       │   │   ├── health (3).svg
│   │       │   │   ├── health-alt (1).svg
│   │       │   │   ├── health-alt.svg
│   │       │   │   ├── health-worker_form (1).svg
│   │       │   │   ├── health-worker_form.svg
│   │       │   │   ├── health.svg
│   │       │   │   ├── i-note_action (1).svg
│   │       │   │   ├── i-note_action.svg
│   │       │   │   ├── malnutrition (1).svg
│   │       │   │   ├── malnutrition.svg
│   │       │   │   ├── microsoft-outlook.svg
│   │       │   │   ├── people (1).svg
│   │       │   │   ├── people.svg
│   │       │   │   ├── rx (1).svg
│   │       │   │   ├── rx.svg
│   │       │   │   ├── speech-language_therapy (1).svg
│   │       │   │   ├── speech-language_therapy.svg
│   │       │   │   ├── stethoscope (1).svg
│   │       │   │   ├── stethoscope.svg
│   │       │   │   ├── telemedicine (1).svg
│   │       │   │   └── telemedicine.svg
│   │       │   ├── 📁 legal
│   │       │   │   ├── 📁 consent-forms
              └── ... (truncated)
│   │       │   │   ├── business-associate-agreement.md
│   │       │   │   ├── hipaa-notice-of-privacy-practices.md
│   │       │   │   ├── privacy-policy.md
│   │       │   │   └── terms-of-service.md
│   │       │   ├── 📁 logos
│   │       │   │   ├── holi-dark.png
│   │       │   │   ├── holi-dark.svg
│   │       │   │   ├── holi-light.png
│   │       │   │   ├── holi-light.svg
│   │       │   │   ├── Logo + Color Palette_Holi Labs (4).png
│   │       │   │   ├── Logo 1_Dark (1).svg
│   │       │   │   ├── Logo 1_Dark.png
│   │       │   │   ├── Logo 1_Dark.svg
│   │       │   │   ├── Logo 1_Light (1).png
│   │       │   │   └── Logo 1_Light.svg
│   │       │   ├── DESIGN_ASSETS.md
│   │       │   ├── favicon.ico
│   │       │   ├── icon-192x192.png
│   │       │   ├── icon-256x256.png
│   │       │   ├── icon-384x384.png
│   │       │   ├── icon-512x512.png
│   │       │   ├── icon.svg
│   │       │   ├── landing-hero.jpeg
│   │       │   ├── loading-video.mp4
│   │       │   ├── manifest.json
│   │       │   ├── robots.txt
│   │       │   ├── sw.js
│   │       │   ├── sw.js.map
│   │       │   ├── workbox-01fd22c6.js
│   │       │   └── workbox-01fd22c6.js.map
│   │       ├── 📁 scripts
│   │       │   ├── audit-environment.d.ts
│   │       │   ├── audit-environment.d.ts.map
│   │       │   ├── audit-environment.js
│   │       │   ├── audit-environment.ts
│   │       │   ├── backup-database.d.ts
│   │       │   ├── backup-database.d.ts.map
│   │       │   ├── backup-database.js
│   │       │   ├── backup-database.js.map
│   │       │   ├── backup-database.ts
│   │       │   ├── check-all-apis.ts
│   │       │   ├── check-health.ts
│   │       │   ├── check-mobile-responsiveness.sh
│   │       │   ├── cleanup-synthetic-names.ts
│   │       │   ├── create-demo-clinician.ts
│   │       │   ├── fix-encoding.js
│   │       │   ├── generate-demo-files.ts
│   │       │   ├── generate-production-secrets.sh
│   │       │   ├── phase6-cli.ts
│   │       │   ├── pre-deploy-check.sh
│   │       │   ├── replace-console-logs-api-routes.sh
│   │       │   ├── replace-console-logs-batch-1.sh
│   │       │   ├── seed-credentials.d.ts
│   │       │   ├── seed-credentials.d.ts.map
│   │       │   ├── seed-credentials.js
│   │       │   ├── seed-credentials.ts
│   │       │   ├── seed-prevention-templates.ts
│   │       │   ├── seed-soap-notes.d.ts
│   │       │   ├── seed-soap-notes.d.ts.map
│   │       │   ├── seed-soap-notes.js
│   │       │   ├── seed-soap-notes.js.map
│   │       │   ├── seed-soap-notes.ts
│   │       │   ├── seed-tasks.d.ts
│   │       │   ├── seed-tasks.d.ts.map
│   │       │   ├── seed-tasks.js
│   │       │   ├── seed-tasks.ts
│   │       │   ├── set-demo-password.ts
│   │       │   ├── setup-git-secrets.sh
│   │       │   ├── test-all-security.sh
│   │       │   ├── test-anonymize.ts
│   │       │   ├── test-cors.sh
│   │       │   ├── test-cron-security.ts
│   │       │   ├── test-csrf.sh
│   │       │   ├── test-env-validation.ts
│   │       │   ├── test-lab-reference-ranges.ts
│   │       │   ├── test-rxnav-integration.ts
│   │       │   ├── test-security-headers.sh
│   │       │   ├── test-soap-generation.ts
│   │       │   ├── validate-day1-setup.ts
│   │       │   ├── validate-env.ts
│   │       │   ├── validate-production.d.ts
│   │       │   ├── validate-production.d.ts.map
│   │       │   ├── validate-production.js
│   │       │   ├── validate-production.ts
│   │       │   ├── validate-translations.ts
│   │       │   ├── verify-ai-setup.ts
│   │       │   ├── verify-backups.ts
│   │       │   ├── verify-indexes.sql
│   │       │   ├── verify-phase6.ts
│   │       │   ├── verify-security-hardening.sh
│   │       │   └── verify-security-headers.ts
│   │       ├── 📁 src
│   │       │   ├── 📁 __tests__
│   │       │   │   └── 📁 soap-generator
              └── ... (truncated)
│   │       │   ├── 📁 app
│   │       │   │   ├── 📁 access
              └── ... (truncated)
│   │       │   │   ├── 📁 admin
              └── ... (truncated)
│   │       │   │   ├── 📁 api
              └── ... (truncated)
│   │       │   │   ├── 📁 auth
              └── ... (truncated)
│   │       │   │   ├── 📁 book
              └── ... (truncated)
│   │       │   │   ├── 📁 clinician
              └── ... (truncated)
│   │       │   │   ├── 📁 confirm
              └── ... (truncated)
│   │       │   │   ├── 📁 dashboard
              └── ... (truncated)
│   │       │   │   ├── 📁 find-doctor
              └── ... (truncated)
│   │       │   │   ├── 📁 legal
              └── ... (truncated)
│   │       │   │   ├── 📁 onboarding
              └── ... (truncated)
│   │       │   │   ├── 📁 portal
              └── ... (truncated)
│   │       │   │   ├── 📁 pricing
              └── ... (truncated)
│   │       │   │   ├── 📁 shared
              └── ... (truncated)
│   │       │   │   ├── 📁 sign-in
              └── ... (truncated)
│   │       │   │   ├── error.tsx
│   │       │   │   ├── global-error.tsx
│   │       │   │   ├── globals.css
│   │       │   │   ├── layout.tsx
│   │       │   │   ├── loading.tsx
│   │       │   │   ├── not-found.tsx
│   │       │   │   ├── page_old.tsx
│   │       │   │   └── page.tsx
│   │       │   ├── 📁 components
│   │       │   │   ├── 📁 access-grants
              └── ... (truncated)
│   │       │   │   ├── 📁 ai
              └── ... (truncated)
│   │       │   │   ├── 📁 appointments
              └── ... (truncated)
│   │       │   │   ├── 📁 calendar
              └── ... (truncated)
│   │       │   │   ├── 📁 chat
              └── ... (truncated)
│   │       │   │   ├── 📁 clinical
              └── ... (truncated)
│   │       │   │   ├── 📁 co-pilot
              └── ... (truncated)
│   │       │   │   ├── 📁 common
              └── ... (truncated)
│   │       │   │   ├── 📁 compliance
              └── ... (truncated)
│   │       │   │   ├── 📁 credentials
              └── ... (truncated)
│   │       │   │   ├── 📁 dashboard
              └── ... (truncated)
│   │       │   │   ├── 📁 demo
              └── ... (truncated)
│   │       │   │   ├── 📁 forms
              └── ... (truncated)
│   │       │   │   ├── 📁 imaging
              └── ... (truncated)
│   │       │   │   ├── 📁 invoices
              └── ... (truncated)
│   │       │   │   ├── 📁 lab-results
              └── ... (truncated)
│   │       │   │   ├── 📁 legal
              └── ... (truncated)
│   │       │   │   ├── 📁 mar
              └── ... (truncated)
│   │       │   │   ├── 📁 medications
              └── ... (truncated)
│   │       │   │   ├── 📁 messaging
              └── ... (truncated)
│   │       │   │   ├── 📁 notifications
              └── ... (truncated)
│   │       │   │   ├── 📁 onboarding
              └── ... (truncated)
│   │       │   │   ├── 📁 palliative
              └── ... (truncated)
│   │       │   │   ├── 📁 patient
              └── ... (truncated)
│   │       │   │   ├── 📁 patients
              └── ... (truncated)
│   │       │   │   ├── 📁 pdf
              └── ... (truncated)
│   │       │   │   ├── 📁 portal
              └── ... (truncated)
│   │       │   │   ├── 📁 prescriptions
              └── ... (truncated)
│   │       │   │   ├── 📁 prevention
              └── ... (truncated)
│   │       │   │   ├── 📁 print
              └── ... (truncated)
│   │       │   │   ├── 📁 privacy
              └── ... (truncated)
│   │       │   │   ├── 📁 qr
              └── ... (truncated)
│   │       │   │   ├── 📁 recordings
              └── ... (truncated)
│   │       │   │   ├── 📁 referrals
              └── ... (truncated)
│   │       │   │   ├── 📁 reschedule
              └── ... (truncated)
│   │       │   │   ├── 📁 scribe
              └── ... (truncated)
│   │       │   │   ├── 📁 search
              └── ... (truncated)
│   │       │   │   ├── 📁 shared
              └── ... (truncated)
│   │       │   │   ├── 📁 skeletons
              └── ... (truncated)
│   │       │   │   ├── 📁 spatial
              └── ... (truncated)
│   │       │   │   ├── 📁 tasks
              └── ... (truncated)
│   │       │   │   ├── 📁 templates
              └── ... (truncated)
│   │       │   │   ├── 📁 ui
              └── ... (truncated)
│   │       │   │   ├── 📁 upload
              └── ... (truncated)
│   │       │   │   ├── 📁 video
              └── ... (truncated)
│   │       │   │   ├── 📁 voice
              └── ... (truncated)
│   │       │   │   ├── AICommandCenter.tsx
│   │       │   │   ├── CommandPalette.tsx
│   │       │   │   ├── ContextMenu.tsx
│   │       │   │   ├── CookieConsentBanner.tsx
│   │       │   │   ├── DarkModeShowcase.tsx
│   │       │   │   ├── DashboardLayout.tsx
│   │       │   │   ├── ErrorBoundary.tsx
│   │       │   │   ├── FeedbackWidget.tsx
│   │       │   │   ├── IntroAnimation.tsx
│   │       │   │   ├── IOSInstallPrompt.tsx
│   │       │   │   ├── LanguageSelector.tsx
│   │       │   │   ├── LoadingScreen.tsx
│   │       │   │   ├── LoadingSkeleton.tsx
│   │       │   │   ├── NotificationBadge.tsx
│   │       │   │   ├── NotificationPrompt.tsx
│   │       │   │   ├── OfflineDetector.tsx
│   │       │   │   ├── OfflineIndicator.tsx
│   │       │   │   ├── PatientSearch.tsx
│   │       │   │   ├── PrintButton.tsx
│   │       │   │   ├── Providers.tsx
│   │       │   │   ├── SessionTimeoutWarning.tsx
│   │       │   │   ├── SkipLink.tsx
│   │       │   │   ├── SupportContact.tsx
│   │       │   │   ├── ThemeToggle.tsx
│   │       │   │   └── WebVitalsTracker.tsx
│   │       │   ├── 📁 contexts
│   │       │   │   ├── ClinicalSessionContext.tsx
│   │       │   │   └── LanguageContext.tsx
│   │       │   ├── 📁 hooks
│   │       │   │   ├── useAnalytics.ts
│   │       │   │   ├── useCSRF.ts
│   │       │   │   ├── useCsrfToken.ts
│   │       │   │   ├── useDeviceSync.ts
│   │       │   │   ├── useFeatureFlag.ts
│   │       │   │   ├── useKeyboardShortcuts.ts
│   │       │   │   ├── useLanguage.ts
│   │       │   │   ├── useNotifications.ts
│   │       │   │   ├── usePatientContext.ts
│   │       │   │   ├── usePatientFilters.ts
│   │       │   │   ├── useRealtimePreventionUpdates.ts
│   │       │   │   ├── useSessionTimeout.ts
│   │       │   │   └── useVoiceCommands.ts
│   │       │   ├── 📁 lib
│   │       │   │   ├── 📁 __mocks__
              └── ... (truncated)
│   │       │   │   ├── 📁 __tests__
              └── ... (truncated)
│   │       │   │   ├── 📁 ai
              └── ... (truncated)
│   │       │   │   ├── 📁 analytics
              └── ... (truncated)
│   │       │   │   ├── 📁 api
              └── ... (truncated)
│   │       │   │   ├── 📁 appointments
              └── ... (truncated)
│   │       │   │   ├── 📁 audit
              └── ... (truncated)
│   │       │   │   ├── 📁 auth
              └── ... (truncated)
│   │       │   │   ├── 📁 aws
              └── ... (truncated)
│   │       │   │   ├── 📁 blockchain
              └── ... (truncated)
│   │       │   │   ├── 📁 brazil-interop
              └── ... (truncated)
│   │       │   │   ├── 📁 cache
              └── ... (truncated)
│   │       │   │   ├── 📁 calendar
              └── ... (truncated)
│   │       │   │   ├── 📁 cds
              └── ... (truncated)
│   │       │   │   ├── 📁 chat
              └── ... (truncated)
│   │       │   │   ├── 📁 client
              └── ... (truncated)
│   │       │   │   ├── 📁 clinical
              └── ... (truncated)
│   │       │   │   ├── 📁 clinical-notes
              └── ... (truncated)
│   │       │   │   ├── 📁 compliance
              └── ... (truncated)
│   │       │   │   ├── 📁 consent
              └── ... (truncated)
│   │       │   │   ├── 📁 cron
              └── ... (truncated)
│   │       │   │   ├── 📁 db
              └── ... (truncated)
│   │       │   │   ├── 📁 deid
              └── ... (truncated)
│   │       │   │   ├── 📁 deidentification
              └── ... (truncated)
│   │       │   │   ├── 📁 demo
              └── ... (truncated)
│   │       │   │   ├── 📁 email
              └── ... (truncated)
│   │       │   │   ├── 📁 export
              └── ... (truncated)
│   │       │   │   ├── 📁 fhir
              └── ... (truncated)
│   │       │   │   ├── 📁 forms
              └── ... (truncated)
│   │       │   │   ├── 📁 hl7
              └── ... (truncated)
│   │       │   │   ├── 📁 imaging
              └── ... (truncated)
│   │       │   │   ├── 📁 integrations
              └── ... (truncated)
│   │       │   │   ├── 📁 invoices
              └── ... (truncated)
│   │       │   │   ├── 📁 jobs
              └── ... (truncated)
│   │       │   │   ├── 📁 logging
              └── ... (truncated)
│   │       │   │   ├── 📁 mar
              └── ... (truncated)
│   │       │   │   ├── 📁 medical
              └── ... (truncated)
│   │       │   │   ├── 📁 monitoring
              └── ... (truncated)
│   │       │   │   ├── 📁 notifications
              └── ... (truncated)
│   │       │   │   ├── 📁 nppes
              └── ... (truncated)
│   │       │   │   ├── 📁 openfda
              └── ... (truncated)
│   │       │   │   ├── 📁 patients
              └── ... (truncated)
│   │       │   │   ├── 📁 prevention
              └── ... (truncated)
│   │       │   │   ├── 📁 qr
              └── ... (truncated)
│   │       │   │   ├── 📁 queue
              └── ... (truncated)
│   │       │   │   ├── 📁 resilience
              └── ... (truncated)
│   │       │   │   ├── 📁 risk-scores
              └── ... (truncated)
│   │       │   │   ├── 📁 scheduling
              └── ... (truncated)
│   │       │   │   ├── 📁 schemas
              └── ... (truncated)
│   │       │   │   ├── 📁 scribe
              └── ... (truncated)
│   │       │   │   ├── 📁 search
              └── ... (truncated)
│   │       │   │   ├── 📁 secrets
              └── ... (truncated)
│   │       │   │   ├── 📁 security
              └── ... (truncated)
│   │       │   │   ├── 📁 services
              └── ... (truncated)
│   │       │   │   ├── 📁 sms
              └── ... (truncated)
│   │       │   │   ├── 📁 socket
              └── ... (truncated)
│   │       │   │   ├── 📁 storage
              └── ... (truncated)
│   │       │   │   ├── 📁 supabase
              └── ... (truncated)
│   │       │   │   ├── 📁 templates
              └── ... (truncated)
│   │       │   │   ├── 📁 transcription
              └── ... (truncated)
│   │       │   │   ├── 📁 utils
              └── ... (truncated)
│   │       │   │   ├── 📁 validation
              └── ... (truncated)
│   │       │   │   ├── 📁 validations
              └── ... (truncated)
│   │       │   │   ├── 📁 voice
              └── ... (truncated)
│   │       │   │   ├── audit.ts
│   │       │   │   ├── auth.ts
│   │       │   │   ├── csrf.ts
│   │       │   │   ├── email.ts
│   │       │   │   ├── encryption.ts
│   │       │   │   ├── env.ts
│   │       │   │   ├── featureFlags.ts
│   │       │   │   ├── logger.ts
│   │       │   │   ├── medical-license-verification.ts
│   │       │   │   ├── notifications.ts
│   │       │   │   ├── offline-queue.ts
│   │       │   │   ├── posthog.ts
│   │       │   │   ├── presidio.ts
│   │       │   │   ├── prisma-replica.ts
│   │       │   │   ├── prisma.ts
│   │       │   │   ├── push-notifications.ts
│   │       │   │   ├── rate-limit.ts
│   │       │   │   ├── referral.ts
│   │       │   │   ├── request-id.ts
│   │       │   │   ├── search.ts
│   │       │   │   ├── security-headers.ts
│   │       │   │   ├── sms.ts
│   │       │   │   ├── socket-auth.ts
│   │       │   │   ├── socket-server.ts
│   │       │   │   ├── storage.ts
│   │       │   │   ├── translations.ts
│   │       │   │   ├── utils.ts
│   │       │   │   └── validation.ts
│   │       │   ├── 📁 providers
│   │       │   │   └── ThemeProvider.tsx
│   │       │   ├── 📁 scripts
│   │       │   │   └── theme-init.ts
│   │       │   ├── 📁 styles
│   │       │   │   ├── contrast-utils.ts
│   │       │   │   ├── design-tokens.ts
│   │       │   │   ├── mobile.css
│   │       │   │   ├── print.css
│   │       │   │   └── theme.ts
│   │       │   ├── 📁 types
│   │       │   │   ├── dcmjs.d.ts
│   │       │   │   ├── lucide-react.d.ts
│   │       │   │   ├── next-auth.d.ts
│   │       │   │   ├── next-link.d.ts
│   │       │   │   ├── react-pdf.d.ts
│   │       │   │   └── simple-hl7.d.ts
│   │       │   ├── i18n.ts
│   │       │   ├── instrumentation.ts
│   │       │   └── middleware.ts
│   │       ├── 📁 tests
│   │       │   ├── 📁 e2e
│   │       │   │   ├── accessibility-fixes.spec.ts
│   │       │   │   ├── appointment-scheduling.spec.ts
│   │       │   │   ├── critical-flows.spec.ts
│   │       │   │   ├── patient-portal.spec.ts
│   │       │   │   ├── prescription-safety.spec.ts
│   │       │   │   └── soap-note-generation.spec.ts
│   │       │   ├── 📁 load
│   │       │   │   ├── cdss-load-test.js
│   │       │   │   ├── README.md
│   │       │   │   └── run-load-test.sh
│   │       │   ├── 📁 results
│   │       │   │   ├── 📁 accessibility-fixes-Access-8db76-anding-Page---Public-Access-chromium
              └── ... (truncated)
│   │       │   │   └── .last-run.json
│   │       │   ├── README.md
│   │       │   ├── smoke.spec.d.ts
│   │       │   ├── smoke.spec.d.ts.map
│   │       │   ├── smoke.spec.js
│   │       │   ├── smoke.spec.js.map
│   │       │   └── smoke.spec.ts
│   │       ├── .browserslistrc
│   │       ├── .dockerignore
│   │       ├── .env.example
│   │       ├── .env.local.example
│   │       ├── .env.production.example
│   │       ├── .env.production.template
│   │       ├── .gitignore
│   │       ├── ACCESSIBILITY_TESTING_GUIDE.md
│   │       ├── AGENDA_SETUP_GUIDE.md
│   │       ├── AGENT_1_COMPLETION_REPORT.md
│   │       ├── AGENT_1_SUMMARY.md
│   │       ├── AGENT_10_BATCH_10A_DARK_MODE_FIX_REPORT.md
│   │       ├── AGENT_10_BATCH_10B_DARK_MODE_FIX_REPORT.md
│   │       ├── AGENT_10_BATCH_10C_FINAL_DARK_MODE_FIX_REPORT.md
│   │       ├── AGENT_10_BATCH_10D_FINAL_FIX_REPORT.md
│   │       ├── AGENT_10_BATCH_2_QUICK_SUMMARY.md
│   │       ├── AGENT_10_BATCH_4_QUICK_SUMMARY.md
│   │       ├── AGENT_10_BATCH_9_INDEX.md
│   │       ├── AGENT_10_BATCH_9_QUICK_SUMMARY.md
│   │       ├── AGENT_10_COMPLETE_SUMMARY.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_1_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_2_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_3_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_4_FINAL_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_5_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_6_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_7_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_8_REPORT.md
│   │       ├── AGENT_10_COMPONENTS_BATCH_9_FINAL_REPORT.md
│   │       ├── AGENT_10_CRITICAL_DISCOVERY_DARK_MODE_GAP.md
│   │       ├── AGENT_10_OVERALL_PROGRESS.md
│   │       ├── AGENT_13_COMPLETION_REPORT.md
│   │       ├── AGENT_13_FILE_INVENTORY.md
│   │       ├── AGENT_14_COMPLETION_REPORT.md
│   │       ├── AGENT_15_COMPLETION_REPORT.md
│   │       ├── AGENT_19_COMPLETION_REPORT.md
│   │       ├── AGENT_19_FINAL_VALIDATION_SUMMARY.md
│   │       ├── AGENT_20_CDSS_PERFORMANCE_AUDIT.md
│   │       ├── AGENT_20_COMPLETION_SUMMARY.md
│   │       ├── AGENT_21_FINAL_SUMMARY.md
│   │       ├── AGENT_21_MONITORING_SETUP_COMPLETE.md
│   │       ├── AGENT_27_COMPLETION_SUMMARY.md
│   │       ├── AGENT_28_MOBILE_AUDIT_COMPLETE.md
│   │       ├── AGENT_29_CROSS_BROWSER_COMPATIBILITY.md
│   │       ├── AGENT_3_COMPLETION_REPORT.md
│   │       ├── AGENT_5_SECURITY_HARDENING_COMPLETE.md
│   │       ├── AGENT_7_DARK_MODE_IMPLEMENTATION.md
│   │       ├── AGENT10_BATCH_1_COMPLETION.md
│   │       ├── AGENT10_BATCH_2_COMPLETION.md
│   │       ├── AGENT10_BATCH_3_COMPLETION.md
│   │       ├── AGENT10_CLINICAL_BATCH_SUMMARY.md
│   │       ├── AGENT10_SUMMARY.md
│   │       ├── AGENT11_THEME_CONSOLIDATION_COMPLETE.md
│   │       ├── AGENT16_ADDITIONAL_SCHEMA_ISSUES.md
│   │       ├── AGENT16_EXECUTIVE_SUMMARY.md
│   │       ├── AGENT16_FILES_AFFECTED.md
│   │       ├── AGENT16_INDEX.md
│   │       ├── AGENT16_PRISMA_SCHEMA_FIX_REPORT.md
│   │       ├── AGENT17_IMPLEMENTATION_SUMMARY.md
│   │       ├── AGENT17_MIGRATION_GUIDE.md
│   │       ├── AGENT17_MISSING_MODELS_IMPLEMENTATION.md
│   │       ├── AGENT2_COMPLETION_REPORT.md
│   │       ├── AGENT2_FINAL_REPORT.md
│   │       ├── AGENT22_BACKUP_DR_IMPLEMENTATION.md
│   │       ├── AGENT23_SESSION_SECURITY_COMPLETE.md
│   │       ├── AGENT4_COMPLETION_SUMMARY.md
│   │       ├── AGENT9_BATCH_1_COMPLETION.md
│   │       ├── AGENT9_FILE_INVENTORY.md
│   │       ├── AGENT9_QUICK_GUIDE.md
│   │       ├── AGENT9_SUMMARY.md
│   │       ├── AGENTS_9_10_12_COMPLETION_REPORT.md
│   │       ├── API_COST_ANALYSIS_2025.md
│   │       ├── AUTHENTICATION_BEFORE_AFTER.md
│   │       ├── AUTHENTICATION_QUICK_REFERENCE.md
│   │       ├── BATCH_10B_FILES_MODIFIED.txt
│   │       ├── BATCH_2_LOGGING_MIGRATION_REPORT.md
│   │       ├── BATCH_4_COMPLETION_REPORT.md
│   │       ├── BATCH_5_COMPLETION_REPORT.md
│   │       ├── BATCH_6A_COMPLETION_REPORT.md
│   │       ├── batch-logger-update.sh
│   │       ├── BROWSER_COMPATIBILITY_QUICKSTART.md
│   │       ├── BROWSER_COMPATIBILITY_TEST_MATRIX.md
│   │       ├── BROWSER_SPECIFIC_FIXES.md
│   │       ├── BULK_EXPORT_GUIDE.md
│   │       ├── CDSS_PERFORMANCE_COMPLETE.md
│   │       ├── CDSS_PERFORMANCE_QUICK_REFERENCE.md
│   │       ├── CDSS_PERFORMANCE_QUICKSTART.md
│   │       ├── COMMAND_CENTER_ADDITIONAL_POLISH.md
│   │       ├── COMMAND_CENTER_ENHANCEMENT_PHASE_2.md
│   │       ├── COMMAND_CENTER_FINAL_POLISH.md
│   │       ├── COMMAND_CENTER_INTEGRATION_COMPLETE.md
│   │       ├── COMMAND_CENTER_PHASE_3A_INTEGRATION.md
│   │       ├── COMMAND_CENTER_PHASE_3B_POLISH.md
│   │       ├── COMMAND_CENTER_README.md
│   │       ├── COMMAND_CENTER_UI_POLISH.md
│   │       ├── COMMUNICATIONS_SETUP.md
│   │       ├── COMPETITIVE_FEATURES_COMPLETE.md
│   │       ├── CONNECTION_POOLING.md
│   │       ├── CONTRAST_FIX_BATCH2_REPORT.md
│   │       ├── CONTRAST_FIX_QUICK_GUIDE.md
│   │       ├── CRON_JOBS_QUICK_REFERENCE.md
│   │       ├── CRON_SECURITY_SUMMARY.md
│   │       ├── DARK_MODE_FIX_QUICK_GUIDE.md
│   │       ├── DARK_MODE_QUICK_REFERENCE.md
│   │       ├── DARK_MODE_VARIABLES.md
│   │       ├── DASHBOARD_FIXES_COMPLETION_REPORT.md
│   │       ├── DATABASE_INDEXES.md
│   │       ├── DATABASE_SETUP.md
│   │       ├── DEEPGRAM_INTEGRATION_COMPLETE.md
│   │       ├── DEMO_ACCOUNTS.md
│   │       ├── DEPLOYMENT_CHECKLIST.md
│   │       ├── DEPLOYMENT_READY.md
│   │       ├── Dockerfile
│   │       ├── Dockerfile.prod
│   │       ├── ENV_VALIDATION_QUICK_REFERENCE.md
│   │       ├── ENV_VALIDATION.md
│   │       ├── environment-audit-report.json
│   │       ├── ERROR_HANDLING_AUDIT_REPORT.md
│   │       ├── ERROR_HANDLING_QUICK_GUIDE.md
│   │       ├── FINAL_POLISH_SESSION_COMPLETE.md
│   │       ├── GIT_SECRETS_SETUP.md
│   │       ├── HIPAA_COMPLIANCE_AUDIT_REPORT.md
│   │       ├── HIPAA_COMPLIANCE_CHECKLIST.md
│   │       ├── HIPAA_COMPLIANCE_QUICK_REFERENCE.md
│   │       ├── HIPAA_EXECUTIVE_SUMMARY.md
│   │       ├── HIPAA_REMEDIATION_TRACKER.md
│   │       ├── I18N-SETUP.md
│   │       ├── i18n.d.ts
│   │       ├── i18n.d.ts.map
│   │       ├── i18n.js.disabled
│   │       ├── i18n.js.map
│   │       ├── i18n.ts.disabled
│   │       ├── IMPLEMENTATION_STATUS.md
│   │       ├── INSTALLATION_REQUIRED.md
│   │       ├── instrumentation.d.ts
│   │       ├── instrumentation.d.ts.map
│   │       ├── instrumentation.js
│   │       ├── instrumentation.js.map
│   │       ├── INTERNATIONAL_PREVENTION_PROTOCOLS.md
│   │       ├── INVITATION_QUICK_START.md
│   │       ├── INVITATION_SYSTEM_IMPLEMENTATION.md
│   │       ├── jest.config.js
│   │       ├── jest.sequencer.cjs
│   │       ├── jest.setup.js
│   │       ├── LAB_REFERENCE_RANGES_QUICK_START.md
│   │       ├── LAB_REFERENCE_RANGES_SUMMARY.md
│   │       ├── LAB_REFERENCE_RANGES_VALIDATION_REPORT.md
│   │       ├── LEGAL_DOCUMENTS_IMPLEMENTATION.md
│   │       ├── LOGGING_MIGRATION_QUICK_GUIDE.md
│   │       ├── LOGGING.md
│   │       ├── MARKETING_BRIEF_FOR_LLM.md
│   │       ├── MASTER_PLAN_COMPLETE.md
│   │       ├── MASTER_POLISH_COMPLETE.md
│   │       ├── MEDICAL_LICENSE_VERIFICATION.md
│   │       ├── MIGRATION-AI-USAGE.sql
│   │       ├── MOBILE_IMPLEMENTATION_ROADMAP.md
│   │       ├── MOBILE_QUICK_REFERENCE.md
│   │       ├── MOBILE_RESPONSIVENESS_AUDIT.md
│   │       ├── MOBILE_TESTING_CHECKLIST.md
│   │       ├── MONITORING_QUICKSTART.md
│   │       ├── next-env.d.ts
│   │       ├── next.config.js
│   │       ├── NOTIFICATION_SYSTEM.md
│   │       ├── P0_FIXES_COMPLETED.md
│   │       ├── package.json
│   │       ├── PHASE_1_DEPLOYMENT_SUMMARY.md
│   │       ├── PHASE_1_MVP_COMPLETE.md
│   │       ├── PHASE_2_WHATSAPP_COMPLETE.md
│   │       ├── PHASE_6_DEPLOYMENT_SUMMARY.md
│   │       ├── PHASE_6_DOCUMENTATION.md
│   │       ├── PHASE_6_QUICKSTART.md
│   │       ├── PHASE_6_README.md
│   │       ├── PHASE_7_COMPLETE_DOCUMENTATION.md
│   │       ├── PHASE_7_FEATURE_1_SUMMARY.md
│   │       ├── PHASE_7_PLAN.md
│   │       ├── playwright.config.ts
│   │       ├── postcss.config.js
│   │       ├── PREVENTION_GOAL_TRACKING_GUIDE.md
│   │       ├── PREVENTION_HUB_COMPLETE.md
│   │       ├── PREVENTION_HUB_DEMO.md
│   │       ├── PREVENTION_HUB_FINAL_UPDATE.md
│   │       ├── PREVENTION_HUB_SUMMARY.md
│   │       ├── PREVENTION_HUB_TESTING.md
│   │       ├── PREVENTION_PHASE1_COMPLETE.md
│   │       ├── PREVENTION_PHASE2_COMPLETE.md
│   │       ├── PREVENTION_PHASE3_ADVANCED_FEATURES.md
│   │       ├── PREVENTION_PHASE4_COLLABORATION_FEATURES.md
│   │       ├── PREVENTION_PHASE5_ANALYTICS_REPORTING.md
│   │       ├── PREVENTION_PLANS_HISTORY_GUIDE.md
│   │       ├── PREVENTION_PLANS.md
│   │       ├── PREVENTION_STATUS_MANAGEMENT_GUIDE.md
│   │       ├── PRISMA_QUICK_REFERENCE.md
│   │       ├── PRISMA_TROUBLESHOOTING_GUIDE.md
│   │       ├── PRODUCTION_DEPLOYMENT_CHECKLIST.md
│   │       ├── PROJECT_COMPLETION_SUMMARY.md
│   │       ├── PROTOCOL_PERSISTENCE_GUIDE.md
│   │       ├── RATE_LIMITING_RESTORED.md
│   │       ├── README_MOBILE_AUDIT.md
│   │       ├── RED_TEAM_ANALYSIS.md
│   │       ├── REDIS_RATE_LIMITING.md
│   │       ├── RXNAV_INTEGRATION.md
│   │       ├── RXNAV_QUICKSTART.md
│   │       ├── SCREEN_READER_TESTING_GUIDE.md
│   │       ├── SECURITY_AUDIT_HARDCODED_SECRETS.md
│   │       ├── SECURITY_AUDIT_SUMMARY.md
│   │       ├── SECURITY_HARDENING_COMPLETE.md
│   │       ├── SECURITY_QUICK_REFERENCE.md
│   │       ├── SECURITY_RED_TEAM_ANALYSIS.md
│   │       ├── sentry.edge.config.d.ts
│   │       ├── sentry.edge.config.d.ts.map
│   │       ├── sentry.edge.config.js
│   │       ├── sentry.edge.config.ts
│   │       ├── sentry.server.config.d.ts
│   │       ├── sentry.server.config.d.ts.map
│   │       ├── sentry.server.config.js
│   │       ├── sentry.server.config.ts
│   │       ├── server.js
│   │       ├── SESSION_ADDITIONAL_POLISH_COMPLETE.md
│   │       ├── SESSION_MASTER_PLAN_COMPLETE.md
│   │       ├── SESSION_PHASE_3_COMPLETE.md
│   │       ├── SESSION_SECURITY_QUICK_REFERENCE.md
│   │       ├── SESSION_SUMMARY_PHASE4.md
│   │       ├── SESSION_SUMMARY_PHASE5.md
│   │       ├── SESSION_SUMMARY_PHASE6.md
│   │       ├── SESSION_SUMMARY.md
│   │       ├── setup-agenda.sh
│   │       ├── tailwind.config.d.ts
│   │       ├── tailwind.config.d.ts.map
│   │       ├── tailwind.config.js
│   │       ├── tailwind.config.js.map
│   │       ├── tailwind.config.ts
│   │       ├── TASK_1_VERIFICATION.md
│   │       ├── TASK_2_COMPLETE.md
│   │       ├── test-ai-setup.d.ts
│   │       ├── test-ai-setup.d.ts.map
│   │       ├── test-ai-setup.js
│   │       ├── test-ai-setup.js.map
│   │       ├── test-ai-setup.ts
│   │       ├── TESTING_VERIFICATION_COMPLETE.md
│   │       ├── THEME_ARCHITECTURE_DIAGRAM.md
│   │       ├── THEME_QUICK_START.md
│   │       ├── THEME_SYSTEM_DOCUMENTATION.md
│   │       ├── TRANSLATION_ARCHITECTURE.md
│   │       ├── TRANSLATION_MANAGEMENT.md
│   │       ├── tsconfig.json
│   │       ├── vercel.json
│   │       ├── WHATSAPP_SETUP_GUIDE.md
│   │       └── WHITE_ON_WHITE_FIX_REPORT.md
│   ├── 📁 COMPLIANCE
│   │   └── DPIA-template.md
│   ├── 📁 configs
│   │   ├── policy-ar.yaml
│   │   ├── policy-br.yaml
│   │   ├── policy-mx.yaml
│   │   └── precision-budgets.json
│   ├── 📁 demos
│   │   ├── 📁 sample-fhir-bundles
│   │   │   └── external-ehr-lab-results.json
│   │   ├── fhir-e2e-demo.sh
│   │   ├── README.md
│   │   ├── RECORDING_GUIDE.md
│   │   └── smoke-tests.sh
│   ├── 📁 docker
│   │   └── init-db.sql
│   ├── 📁 docs
│   │   ├── 📁 deployment
│   │   │   └── blue-green-deployment.md
│   │   ├── 📁 disaster-recovery
│   │   │   ├── disaster-recovery-plan.md
│   │   │   └── test-results.md
│   │   ├── 📁 monitoring
│   │   │   ├── apm-setup.md
│   │   │   ├── business-metrics-dashboard.md
│   │   │   └── synthetic-monitoring.md
│   │   ├── 📁 performance
│   │   │   ├── database-read-replicas.md
│   │   │   └── load-testing-guide.md
│   │   ├── 📁 runbooks
│   │   │   ├── API_SERVER_DOWN.md
│   │   │   ├── api-server-down.md
│   │   │   ├── audit-log-review.md
│   │   │   ├── backup-restoration.md
│   │   │   ├── DATA_BREACH_RESPONSE.md
│   │   │   ├── DATABASE_FAILURE.md
│   │   │   ├── database-connection-failure.md
│   │   │   ├── deployment-rollback.md
│   │   │   ├── DISASTER_RECOVERY_PLAN.md
│   │   │   ├── email-delivery-failure.md
│   │   │   ├── HIPAA_AUDIT_LOG_FAILURE.md
│   │   │   ├── hipaa-breach-notification.md
│   │   │   ├── key-rotation.md
│   │   │   ├── performance-degradation.md
│   │   │   ├── REDIS_FAILURE.md
│   │   │   ├── SECURITY_INCIDENT.md
│   │   │   └── security-incident-response.md
│   │   ├── 📁 security
│   │   │   └── security-audit-guide.md
│   │   ├── Asclepius-Protocol-V1.0.txt
│   │   ├── AUDIT_LOGGING_VERIFICATION.md
│   │   ├── BAA_VENDOR_OUTREACH_PLAN.md
│   │   ├── BEMI_AUDIT_SETUP.md
│   │   ├── BEMI_POSTGRESQL_SETUP.md
│   │   ├── CALENDAR_SYNC_SETUP.md
│   │   ├── CASBIN_RBAC_GUIDE.md
│   │   ├── CI-CD-SETUP.md
│   │   ├── CLINICAL_WORKFLOW_VERIFICATION.md
│   │   ├── DATABASE_TUNING.md
│   │   ├── DEPLOYMENT_CHECKLIST.md
│   │   ├── DEPLOYMENT-README.md
│   │   ├── DEPLOYMENT-VPS.md
│   │   ├── DEV_SETUP.md
│   │   ├── FHIR_PRIVACY_DESIGN.md
│   │   ├── HIPAA_COMPLIANCE_CHECKLIST.md
│   │   ├── HIPAA_FHIR_COMPLIANCE.md
│   │   ├── HIPAA_RISK_ASSESSMENT.md
│   │   ├── INCIDENT_RESPONSE_PLAN.md
│   │   ├── LOG_RETENTION_POLICY.md
│   │   ├── MEDPLUM_INTEGRATION.md
│   │   ├── ON_CALL_GUIDE.md
│   │   ├── OPEN_SOURCE_ACCELERATION_TOOLS.md
│   │   ├── OPS_MANUAL.md
│   │   ├── PHI_HANDLING.md
│   │   ├── PRODUCTION_READINESS_STATUS.md
│   │   ├── RATE_LIMITING.md
│   │   ├── SECURITY_GUIDELINES.md
│   │   ├── SECURITY_HEADERS_GUIDE.md
│   │   ├── SECURITY_HEADERS.md
│   │   ├── SESSION_REVOCATION_GUIDE.md
│   │   ├── SYNTHEA_DEMO_DATA.md
│   │   ├── TEST_COVERAGE_PLAN.md
│   │   ├── TESTING_QUICK_START.md
│   │   ├── TESTING_TROUBLESHOOTING.md
│   │   ├── TRANSPARENT_ENCRYPTION_GUIDE.md
│   │   ├── TYPESCRIPT_ERRORS_REMAINING.md
│   │   ├── WAL_ARCHIVING_PITR.md
│   │   ├── WHATS_LEFT_MASTER_PLAN.md
│   │   └── WORKFORCE_TRAINING_PLAN.md
│   ├── 📁 Images to use for dashboard
│   │   ├── artificial-intelligence (1).svg
│   │   ├── artificial-intelligence.svg
│   │   ├── calendar (1).svg
│   │   ├── calendar.svg
│   │   ├── chart-cured-increasing (1).svg
│   │   ├── chart-cured-increasing.svg
│   │   ├── clinical-f (1).svg
│   │   ├── clinical-f.svg
│   │   ├── communication (1).svg
│   │   ├── communication.svg
│   │   ├── crisis-response_center_person.svg
│   │   ├── diagnostics (1).svg
│   │   ├── diagnostics.svg
│   │   ├── doctor (1).svg
│   │   ├── doctor-female (1).svg
│   │   ├── doctor-female.svg
│   │   ├── doctor-male (1).svg
│   │   ├── doctor-male.svg
│   │   ├── doctor.svg
│   │   ├── forum (1).svg
│   │   ├── forum.svg
│   │   ├── head (1).svg
│   │   ├── head.svg
│   │   ├── health (1).svg
│   │   ├── health (2).svg
│   │   ├── health (3).svg
│   │   ├── health-alt (1).svg
│   │   ├── health-alt.svg
│   │   ├── health-worker_form (1).svg
│   │   ├── health-worker_form.svg
│   │   ├── health.svg
│   │   ├── i-note_action (1).svg
│   │   ├── i-note_action.svg
│   │   ├── malnutrition (1).svg
│   │   ├── malnutrition.svg
│   │   ├── people (1).svg
│   │   ├── people.svg
│   │   ├── rx (1).svg
│   │   ├── rx.svg
│   │   ├── Sleek_DNA_Strand_H_Video_Generation.mp4
│   │   ├── speech-language_therapy (1).svg
│   │   ├── speech-language_therapy.svg
│   │   ├── stethoscope (1).svg
│   │   ├── stethoscope.svg
│   │   ├── telemedicine (1).svg
│   │   └── telemedicine.svg
│   ├── 📁 infra
│   │   ├── 📁 deploy
│   │   │   ├── deploy-production.sh
│   │   │   ├── DEPLOYMENT_RUNBOOK.md
│   │   │   └── README.md
│   │   ├── 📁 docker
│   │   │   ├── docker-compose.dev.yml
│   │   │   └── docker-compose.yml
│   │   ├── 📁 migrations
│   │   │   └── 001_init_rls_and_audit.sql
│   │   └── 📁 monitoring
│   │       ├── 📁 alerts
│   │       │   └── fhir-alerts.yml
│   │       ├── alertmanager.yml
│   │       ├── docker-compose.monitoring.yml
│   │       ├── grafana-dashboard-config.yml
│   │       ├── grafana-dashboard.json
│   │       ├── grafana-datasources.yml
│   │       ├── pagerduty-alerts.yaml
│   │       ├── prometheus.yml
│   │       └── README.md
│   ├── 📁 k6
│   │   ├── 📁 scenarios
│   │   │   ├── 01-login-surge.js
│   │   │   ├── 02-appointment-booking-peak.js
│   │   │   ├── 03-soap-note-generation.js
│   │   │   ├── 04-patient-portal-traffic.js
│   │   │   └── 05-api-stress-test.js
│   │   ├── .env.test.example
│   │   ├── config.json
│   │   ├── README.md
│   │   └── run-tests.sh
│   ├── 📁 learning-content
│   │   ├── transcript_interactive_quiz.html
│   │   ├── transcript_learning_content.json
│   │   └── transcript_study_guide.md
│   ├── 📁 legal
│   │   ├── BAA_TEMPLATE.md
│   │   ├── DPA_TEMPLATE.md
│   │   └── VENDOR_BAA_CHECKLIST.md
│   ├── 📁 Marketing
│   │   ├── 📁 Assets
│   │   │   ├── Gemini_Generated_Image_mccwy6mccwy6mccw.jpeg
│   │   │   ├── Gemini_Generated_Image_umwja9umwja9umwj (1).jpeg
│   │   │   ├── Gemini_Generated_Image_umwja9umwja9umwj.jpeg
│   │   │   ├── Landing Page Image 1.jpeg
│   │   │   ├── Landing Page Template.jpeg
│   │   │   ├── Logo + Color Palette_Holi Labs (4).png
│   │   │   ├── Logo 1_Dark (1).svg
│   │   │   ├── Logo 1_Dark.png
│   │   │   ├── Logo 1_Dark.svg
│   │   │   ├── Logo 1_Light (1).png
│   │   │   └── Logo 1_Light.svg
│   │   └── Landing page holilabsv2.jpeg
│   ├── 📁 monitoring
│   │   └── alert-config.yml
│   ├── 📁 nginx
│   │   ├── 📁 ssl
│   │   │   ├── .gitignore
│   │   │   └── README.md
│   │   └── nginx.conf
│   ├── 📁 packages
│   │   ├── 📁 deid
│   │   │   ├── 📁 src
│   │   │   │   ├── dicom.d.ts
│   │   │   │   ├── dicom.d.ts.map
│   │   │   │   ├── dicom.js
│   │   │   │   ├── dicom.js.map
│   │   │   │   ├── dicom.ts
│   │   │   │   ├── differential-privacy.d.ts
│   │   │   │   ├── differential-privacy.d.ts.map
│   │   │   │   ├── differential-privacy.js
│   │   │   │   ├── differential-privacy.ts
│   │   │   │   ├── generalize.d.ts
│   │   │   │   ├── generalize.d.ts.map
│   │   │   │   ├── generalize.js
│   │   │   │   ├── generalize.js.map
│   │   │   │   ├── generalize.ts
│   │   │   │   ├── hybrid-deid.ts
│   │   │   │   ├── index.d.ts
│   │   │   │   ├── index.d.ts.map
│   │   │   │   ├── index.js
│   │   │   │   ├── index.js.map
│   │   │   │   ├── index.ts
│   │   │   │   ├── k-anonymity.d.ts
│   │   │   │   ├── k-anonymity.d.ts.map
│   │   │   │   ├── k-anonymity.js
│   │   │   │   ├── k-anonymity.ts
│   │   │   │   ├── nlp-redaction.d.ts
│   │   │   │   ├── nlp-redaction.d.ts.map
│   │   │   │   ├── nlp-redaction.js
│   │   │   │   ├── nlp-redaction.ts
│   │   │   │   ├── ocr.d.ts
│   │   │   │   ├── ocr.d.ts.map
│   │   │   │   ├── ocr.js
│   │   │   │   ├── ocr.js.map
│   │   │   │   ├── ocr.ts
│   │   │   │   ├── presidio-integration.ts
│   │   │   │   ├── privacy-budget.d.ts
│   │   │   │   ├── privacy-budget.d.ts.map
│   │   │   │   ├── privacy-budget.js
│   │   │   │   ├── privacy-budget.ts
│   │   │   │   ├── pseudonymization.ts
│   │   │   │   ├── pseudonymize.d.ts
│   │   │   │   ├── pseudonymize.d.ts.map
│   │   │   │   ├── pseudonymize.js
│   │   │   │   ├── pseudonymize.js.map
│   │   │   │   ├── pseudonymize.ts
│   │   │   │   ├── redact.d.ts
│   │   │   │   ├── redact.d.ts.map
│   │   │   │   ├── redact.js
│   │   │   │   ├── redact.js.map
│   │   │   │   ├── redact.ts
│   │   │   │   ├── types.d.ts
│   │   │   │   ├── types.d.ts.map
│   │   │   │   ├── types.js
│   │   │   │   ├── types.js.map
│   │   │   │   └── types.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── 📁 dp
│   │   │   ├── 📁 src
│   │   │   │   ├── accountant.d.ts
│   │   │   │   ├── accountant.d.ts.map
│   │   │   │   ├── accountant.js
│   │   │   │   ├── accountant.js.map
│   │   │   │   ├── accountant.ts
│   │   │   │   ├── index.d.ts
│   │   │   │   ├── index.d.ts.map
│   │   │   │   ├── index.js
│   │   │   │   ├── index.js.map
│   │   │   │   ├── index.ts
│   │   │   │   ├── noise.d.ts
│   │   │   │   ├── noise.d.ts.map
│   │   │   │   ├── noise.js
│   │   │   │   ├── noise.js.map
│   │   │   │   ├── noise.ts
│   │   │   │   ├── receipt.d.ts
│   │   │   │   ├── receipt.d.ts.map
│   │   │   │   ├── receipt.js
│   │   │   │   ├── receipt.js.map
│   │   │   │   ├── receipt.ts
│   │   │   │   ├── types.d.ts
│   │   │   │   ├── types.d.ts.map
│   │   │   │   ├── types.js
│   │   │   │   ├── types.js.map
│   │   │   │   └── types.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── 📁 policy
│   │   │   ├── export_dp.rego
│   │   │   ├── purpose_binding.rego
│   │   │   └── residency.rego
│   │   ├── 📁 schemas
│   │   │   ├── 📁 src
│   │   │   │   ├── analytics.schema.ts
│   │   │   │   ├── appointment.schema.ts
│   │   │   │   ├── clinical.schema.ts
│   │   │   │   ├── compliance.schema.ts
│   │   │   │   ├── constants.ts
│   │   │   │   ├── index.d.ts
│   │   │   │   ├── index.d.ts.map
│   │   │   │   ├── index.js
│   │   │   │   ├── index.js.map
│   │   │   │   ├── index.ts
│   │   │   │   ├── patient.schema.ts
│   │   │   │   ├── prescription.schema.ts
│   │   │   │   └── user.schema.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── 📁 types
│   │   │   ├── 📁 src
│   │   │   │   └── index.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   └── 📁 utils
│   │       ├── 📁 src
│   │       │   ├── canonical-serializer.ts
│   │       │   ├── crypto.d.ts
│   │       │   ├── crypto.d.ts.map
│   │       │   ├── crypto.js
│   │       │   ├── crypto.js.map
│   │       │   ├── crypto.ts
│   │       │   ├── index.d.ts
│   │       │   ├── index.d.ts.map
│   │       │   ├── index.js
│   │       │   ├── index.js.map
│   │       │   ├── index.ts
│   │       │   ├── logger.d.ts
│   │       │   ├── logger.d.ts.map
│   │       │   ├── logger.js
│   │       │   ├── logger.js.map
│   │       │   └── logger.ts
│   │       ├── package.json
│   │       └── tsconfig.json
│   ├── 📁 prisma
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── 📁 public
│   │   ├── 📁 images
│   │   │   ├── artificial-intelligence.svg
│   │   │   ├── bio-adaptive-hero-bg.jpeg
│   │   │   ├── futuristic-clinic-alt-1.jpg
│   │   │   ├── futuristic-clinic-alt-2.jpg
│   │   │   ├── futuristic-clinic-command-center.jpg
│   │   │   └── futuristic-health-command-center.jpeg
│   │   └── landing.html
│   ├── 📁 scripts
│   │   ├── 📁 blue-green
│   │   │   ├── get-active-environment.sh
│   │   │   ├── health-check.sh
│   │   │   ├── monitor-deployment.sh
│   │   │   ├── monitor-production.sh
│   │   │   ├── rollback.sh
│   │   │   └── switch-traffic.sh
│   │   ├── add-ts-ignore-missing-models.js
│   │   ├── backup-database.sh
│   │   ├── check-audit-coverage.sh
│   │   ├── check-translations.js
│   │   ├── comment-missing-models.js
│   │   ├── comment-out-missing-models.sh
│   │   ├── dr-test.sh
│   │   ├── encrypt-existing-phi.ts
│   │   ├── expo-go-qr.mjs
│   │   ├── fix-audit-detail-types.js
│   │   ├── fix-audit-details.js
│   │   ├── fix-audit-errors-pass2.js
│   │   ├── fix-audit-errors.js
│   │   ├── fix-audit-ipaddress.js
│   │   ├── fix-audit-logging.sh
│   │   ├── fix-audit-request-param.js
│   │   ├── fix-audit-syntax.js
│   │   ├── fix-audit-useragent-request.js
│   │   ├── fix-duplicate-properties.js
│   │   ├── fix-implicit-any-routes.js
│   │   ├── fix-orderby-timestamp.js
│   │   ├── generate-cosign-keys.sh
│   │   ├── generate-synthea-fhir-docker.sh
│   │   ├── generate-synthea-patients.sh
│   │   ├── generate-synthetic-data.ts
│   │   ├── init-casbin.ts
│   │   ├── install-pre-commit-hook.sh
│   │   ├── load-test-api.js
│   │   ├── pre-commit-hook.sh
│   │   ├── restore-database.sh
│   │   ├── run-dast-scan.sh
│   │   ├── seed-patients.ts
│   │   ├── seed-synthea-demo.sh
│   │   ├── setup-calendar-oauth.sh
│   │   ├── setup-git-secrets.sh
│   │   ├── setup-pgvector.sql
│   │   ├── setup-swap.sh
│   │   ├── setup-testing-tools.sh
│   │   ├── setup.sh
│   │   ├── test-cosign-signing.sh
│   │   ├── test-monitoring.sh
│   │   └── test-restore.sh
│   ├── 📁 test-files
│   │   └── test-lab-result.txt
│   ├── 📁 tests
│   │   ├── 📁 e2e
│   │   │   ├── 01-patient-registration.spec.ts
│   │   │   └── 02-prescription-creation.spec.ts
│   │   └── 📁 load
│   │       ├── api-baseline.js
│   │       └── prescription-load.js
│   ├── 📁 todos
│   │   ├── 001-complete-p1-gemini-api-key-in-url.md
│   │   ├── 002-complete-p1-phi-logging-risk.md
│   │   ├── 003-complete-p1-prompt-injection-risk.md
│   │   ├── 004-complete-p1-missing-authorization-checks.md
│   │   ├── 005-pending-p2-duplicate-routing-systems.md
│   │   ├── 006-pending-p2-missing-timeouts-and-retries.md
│   │   ├── 007-pending-p2-silent-byok-fallback.md
│   │   ├── 008-pending-p2-race-conditions-provider-init.md
│   │   ├── 009-pending-p2-availability-checks-every-request.md
│   │   ├── 010-pending-p3-test-code-duplication.md
│   │   ├── 011-pending-p3-dead-code-removal.md
│   │   └── 012-pending-p3-type-conflicts-interfaces.md
│   ├── .commitlintrc.json
│   ├── .context.md
│   ├── .dockerignore
│   ├── .env.example
│   ├── .env.production.secrets.template
│   ├── .git-secrets-patterns.txt
│   ├── .gitallowed
│   ├── .gitignore
│   ├── .gitleaks.toml
│   ├── .lighthouserc.json
│   ├── .worktree-config.json
│   ├── AB_TESTING_DEPLOYMENT_CHECKLIST.md
│   ├── AB_TESTING_GUIDE.md
│   ├── AB_TESTING_READINESS.md
│   ├── ACCESSIBILITY_AUDIT.md
│   ├── AEGIS_ARCHITECTURE.md
│   ├── AGENT_26_COMPLETION_REPORT.md
│   ├── AGENT_26_FILE_TREE.md
│   ├── AI_CONFIDENCE_SCORING_IMPLEMENTATION.md
│   ├── AI_SCRIBE_PRIVACY_IMPLEMENTATION.md
│   ├── AI-INFRASTRUCTURE-DEPLOYMENT.md
│   ├── ANALYTICS_IMPLEMENTATION_COMPLETE.md
│   ├── ANALYTICS_MONITORING_COMPLETE.md
│   ├── ANALYTICS_SETUP.md
│   ├── APPOINTMENT_CONFLICT_DETECTION.md
│   ├── AUDIT_LOGGING_IMPROVEMENTS.md
│   ├── BAA_EMAIL_TEMPLATES_READY_TO_SEND.md
│   ├── BACKEND_APIS_COMPLETE.md
│   ├── BACKEND_COMPLETION_SUMMARY.md
│   ├── BACKEND_ROADMAP.md
│   ├── BLOCKING_TASKS_COMPLETE.md
│   ├── BRANCH_PROTECTION_SETUP.md
│   ├── BRAZILIAN-HEALTH-INTEROPERABILITY.md
│   ├── BUILD_REMEDIATION_REPORT.md
│   ├── BUILD_SUCCESS_TYPESCRIPT_FIXES.md
│   ├── CASE_STUDIES_HEALTH_3.0.md
│   ├── CDSS_IMPLEMENTATION_GUIDE.md
│   ├── check-appointments.sql
│   ├── CICD_PIPELINE_AUDIT.md
│   ├── CICD_QUICK_REFERENCE.md
│   ├── CLAUDE.md
│   ├── CLINICAL_NOTE_VERSIONING.md
│   ├── COMPLETE_APPOINTMENT_SYSTEM_SETUP.md
│   ├── COMPLETE_IMPLEMENTATION_CHECKLIST.md
│   ├── COMPLETE_IMPLEMENTATION_SUMMARY.md
│   ├── CONFIRMATION_SYSTEM_SETUP.md
│   ├── COSIGN_IMAGE_SIGNING_GUIDE.md
│   ├── COSIGN_IMPLEMENTATION_COMPLETE.md
│   ├── COSIGN_QUICK_REFERENCE.md
│   ├── cosign.pub
│   ├── CRITICAL_GAPS_AND_FIXES.md
│   ├── CURRENT_STATUS.md
│   ├── DAST_IMPLEMENTATION_COMPLETE.md
│   ├── DAST_QUICK_REFERENCE.md
│   ├── DAST_SECURITY_GUIDE.md
│   ├── DATA_SUPREMACY.md
│   ├── deploy-production.sh
│   ├── DEPLOY.md
│   ├── deploy.sh
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── DEPLOYMENT_FAILURE_PREVENTION.md
│   ├── DEPLOYMENT_FIX_SUMMARY.md
│   ├── DEPLOYMENT_FIX.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── DEPLOYMENT_INSTRUCTIONS.md
│   ├── DEPLOYMENT_QUICK_START.md
│   ├── DEPLOYMENT_READY_STATUS.md
│   ├── DEPLOYMENT_READY.md
│   ├── DEPLOYMENT_SECRETS_CHECKLIST.md
│   ├── DEPLOYMENT_SUCCESS.md
│   ├── DEPLOYMENT_SUMMARY.md
│   ├── DEPLOYMENT_VERIFICATION.md
│   ├── DEPLOYMENT-CHECKLIST.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT_SESSION_SUMMARY.md
│   ├── DICOM_METADATA_SUPPORT.md
│   ├── DIGITALOCEAN_DEPLOYMENT.md
│   ├── DIGITALOCEAN_DROPLET_DEPLOYMENT.md
│   ├── DIGITALOCEAN_ENV_SETUP.md
│   ├── DIGITALOCEAN_ENV_VARS.txt
│   ├── DOCKER_WORKFLOW.md
│   ├── docker-compose.presidio.yml
│   ├── docker-compose.prod.yml
│   ├── docker-compose.testing.yml
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── DOMAIN_MIGRATION_HOLILABS.xyz.md
│   ├── DROPLET_MASTER_PROMPT.md
│   ├── ENTERPRISE_COMPLETE_SUMMARY.md
│   ├── ENTERPRISE_READINESS_PROGRESS.md
│   ├── ENVIRONMENT_COMPARISON_MATRIX.md
│   ├── ENVIRONMENT_SETUP_README.md
│   ├── ENVIRONMENT_SETUP_SUMMARY.md
│   ├── ENVIRONMENT_STATUS.md
│   ├── EXECUTION_SUMMARY.md
│   ├── expo-connect.html
│   ├── expo-go-qr.png
│   ├── expo-go-url.txt
│   ├── expo-qr-code.html
│   ├── FEATURE_FLAGS_GUIDE.md
│   ├── FINAL_DEPLOYMENT_STATUS.md
│   ├── fix-error-exposure.sh
│   ├── FIXES_SUMMARY.md
│   ├── FUNNELS_AND_DASHBOARDS_GUIDE.md
│   ├── GETTING_STARTED.md
│   ├── GITHUB_BRANCH_PROTECTION_SETUP.md
│   ├── GITHUB_RESEARCH_PLAN.md
│   ├── gitleaks-report.json
│   ├── GOOGLE_CLOUD_SQL_DEPLOYMENT.md
│   ├── GOOGLE_OAUTH_SETUP.md
│   ├── GTM_COMPETITIVE_POSITIONING.md
│   ├── HIPAA_BAA_REQUIREMENTS.md
│   ├── HOLILABS_BRIEFING_DOCUMENT.md
│   ├── HOLILABS_XYZ_DEPLOYMENT.md
│   ├── HYBRID_DEID_IMPLEMENTATION.md
│   ├── IMMEDIATE_ACTION_PLAN.md
│   ├── IMMEDIATE_NEXT_ACTIONS.md
│   ├── IMMEDIATE_SECURITY_ACTIONS.md
│   ├── IMPLEMENTATION_NOTES.md
│   ├── IMPLEMENTATION_STATUS.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── IMPROVEMENTS_IMPLEMENTATION.md
│   ├── INDUSTRY_GRADE_GAPS.md
│   ├── INFRASTRUCTURE_AUTOMATION_DEPLOYMENT.md
│   ├── INTRO_AND_GOOGLE_AUTH_IMPLEMENTATION.md
│   ├── INVITATION_SYSTEM_GUIDE.md
│   ├── IPHONE_PWA_TEST_RESULTS.md
│   ├── K6_LOAD_TESTING_COMPLETE.md
│   ├── K6_QUICK_START.md
│   ├── LANDING_PAGE_UPGRADE_SUMMARY.md
│   ├── landing-page.html
│   ├── launch-expo-go.sh
│   ├── LIQUID_CLINICAL_REFACTOR_SUMMARY.md
│   ├── LOCAL_DEVELOPMENT_SETUP.md
│   ├── LOCAL_ENV_SETUP_GUIDE.md
│   ├── MAJOR_LANDING_PAGE_REDESIGN.md
│   ├── MEDICAL_LICENSE_VERIFICATION.md
│   ├── MIGRATION_SUMMARY.md
│   ├── MONETIZATION_STRATEGY.md
│   ├── MONITORING_QUICK_REFERENCE.md
│   ├── MONITORING_SETUP_GUIDE.md
│   ├── MONITORING_SETUP_INSTRUCTIONS.md
│   ├── MONITORING_SETUP.md
│   ├── NAVIGATION_IMPROVEMENTS.md
│   ├── NEXT_STEPS_IMPLEMENTATION.md
│   ├── NORDVPN_FLAGGING_IMMEDIATE_ACTIONS.md
│   ├── OPEN_SOURCE_RESEARCH_FINDINGS.md
│   ├── package.json
│   ├── PATIENT_PORTAL_IMPROVEMENTS.md
│   ├── PATIENT_PORTAL_README.md
│   ├── PEQUENO-COTOLENGO-PILOT.md
│   ├── PERFORMANCE_MONITORING.md
│   ├── PHASE_2_CLINICAL_DECISION_SUPPORT_COMPLETE.md
│   ├── PHASE_2_COMPLETED.md
│   ├── PHASE_2_COMPLETION.md
│   ├── PHASE_2_SMART_TEMPLATES_COMPLETE.md
│   ├── PHASE_3_2_QUICK_ACTIONS_COMPLETE.md
│   ├── PHASE_3_3_VOICE_COMMANDS_COMPLETE.md
│   ├── PHASE_3_PRIORITY_DASHBOARD_COMPLETE.md
│   ├── PHASE_4_MAR_COMPLETE.md
│   ├── PHASE_5_SCHEDULING_PLAN.md
│   ├── PHASE1_IMPLEMENTATION_SUMMARY.md
│   ├── PHASE2_QUICK_WINS_COMPLETE.md
│   ├── PINO_IMPLEMENTATION.md
│   ├── playwright.config.ts
│   ├── pnpm-lock.yaml
│   ├── pnpm-workspace.yaml
│   ├── POSTHOG_PRODUCTION_SETUP_GUIDE.md
│   ├── PRESIDIO_DEPLOYMENT_GUIDE.md
│   ├── PRESIDIO_HYBRID_DEID_GUIDE.md
│   ├── PREVENTION_HUB_IMPLEMENTATION.md
│   ├── PRICING_IMPLEMENTATION_SUMMARY.md
│   ├── PRIVACY_CONSENT_IMPLEMENTATION_COMPLETE.md
│   ├── PRODUCT_CAPABILITIES.md
│   ├── PRODUCT_ROADMAP_2025.md
│   ├── PRODUCT_ROADMAP.md
│   ├── PRODUCTION_DEPLOYMENT_GUIDE.md
│   ├── PRODUCTION_LAUNCH_CHECKLIST.md
│   ├── PRODUCTION_READINESS_CHECKLIST.md
│   ├── PRODUCTION_READINESS.md
│   ├── PRODUCTION_READY_SUMMARY.md
│   ├── PROJECT_SNAPSHOT.md
│   ├── PROJECT_SUMMARY.md
│   ├── PUSH_NOTIFICATION_DIAGRAMS.md
│   ├── QUICK_DEPLOYMENT_GUIDE.md
│   ├── QUICK_REFERENCE.md
│   ├── QUICK_START_GOOGLE_AUTH.md
│   ├── QUICK_START_INVITATION_SYSTEM.md
│   ├── QUICK_START_LOCAL.md
│   ├── QUICK_WINS_COMPLETE.md
│   ├── QUICK_WINS_IMPLEMENTED.md
│   ├── QUICKSTART_DIGITALOCEAN.md
│   ├── README_TRANSCRIPT_QUIZ.md
│   ├── README.md
│   ├── REALTIME_AND_OFFLINE_AI_IMPLEMENTATION.md
│   ├── RED_TEAM_AUDIT_REPORT.md
│   ├── RED_TEAM_REPORT.md
│   ├── REDIS_CACHING_IMPLEMENTATION.md
│   ├── REFERRAL_SYSTEM_COMPLETE.md
│   ├── RLHF_IMPLEMENTATION_GUIDE.md
│   ├── ROADMAP.md
│   ├── SCHEMA_MIGRATION_GUIDE.md
│   ├── SECRETS_GENERATION.md
│   ├── SECURITY_AUDIT_REPORT_2025-01-08.md
│   ├── SECURITY_AUDIT_REPORT.md
│   ├── SECURITY_DEPLOYMENT_CHECKLIST.md
│   ├── SECURITY_FIXES_SUMMARY_2025-01-08.md
│   ├── SECURITY_FIXES_SUMMARY.md
│   ├── SECURITY_HARDENING_REPORT.md
│   ├── SECURITY_QUICK_REFERENCE.md
│   ├── SECURITY_REVOCATION_ADVISORY.md
│   ├── SECURITY_SECRET_ROTATION_PLAN.md
│   ├── SECURITY.md
│   ├── SENTRY_SETUP.md
│   ├── SESSION_COMPLETE_SUMMARY.md
│   ├── SESSION_FINAL_SUMMARY_OCT_26.md
│   ├── SESSION_SUMMARY_JAN_15_2025.md
│   ├── SESSION_SUMMARY_OCT_26_2025.md
│   ├── SESSION_SUMMARY.md
│   ├── setup-git-secrets.sh
│   ├── setup-invitation-system.sh
│   ├── SOC2_PHASE1_COMPLETE.md
│   ├── SOC2_PHASE1_IMPLEMENTATION_SUMMARY.md
│   ├── SOC2_PHASE1_WEEK3_CASBIN_COMPLETE.md
│   ├── STABILIZATION_REPORT.md
│   ├── START_HERE.md
│   ├── start-expo.sh
│   ├── TECHNICAL_FIXES_SUMMARY.md
│   ├── Test
│   ├── test-quick-wins.sh
│   ├── test-whatsapp.sh
│   ├── TESTING_GUIDE_PHASE_2.md
│   ├── transcript-to-quiz.js
│   ├── tsconfig.json
│   ├── turbo.json
│   ├── TWILIO_SETUP_QUICKSTART.md
│   ├── update-env-keys.sh
│   ├── verify_deepgram_scribe.py
│   ├── VISION_AND_ROADMAP.md
│   ├── WEB_PUSH_NOTIFICATIONS_COMPLETE.md
│   ├── WEBSITE_SECURITY_FLAGGING_FIX.md
│   ├── WEEK-1-PROGRESS.md
│   └── WORKFLOW_EXPLAINED.md
├── 📁 packages
│   ├── 📁 deid
│   │   ├── 📁 src
│   │   │   ├── dicom.d.ts
│   │   │   ├── dicom.d.ts.map
│   │   │   ├── dicom.js
│   │   │   ├── dicom.js.map
│   │   │   ├── dicom.ts
│   │   │   ├── differential-privacy.d.ts
│   │   │   ├── differential-privacy.d.ts.map
│   │   │   ├── differential-privacy.js
│   │   │   ├── differential-privacy.ts
│   │   │   ├── generalize.d.ts
│   │   │   ├── generalize.d.ts.map
│   │   │   ├── generalize.js
│   │   │   ├── generalize.js.map
│   │   │   ├── generalize.ts
│   │   │   ├── hybrid-deid.ts
│   │   │   ├── index.d.ts
│   │   │   ├── index.d.ts.map
│   │   │   ├── index.js
│   │   │   ├── index.js.map
│   │   │   ├── index.ts
│   │   │   ├── k-anonymity.d.ts
│   │   │   ├── k-anonymity.d.ts.map
│   │   │   ├── k-anonymity.js
│   │   │   ├── k-anonymity.ts
│   │   │   ├── nlp-redaction.d.ts
│   │   │   ├── nlp-redaction.d.ts.map
│   │   │   ├── nlp-redaction.js
│   │   │   ├── nlp-redaction.ts
│   │   │   ├── ocr.d.ts
│   │   │   ├── ocr.d.ts.map
│   │   │   ├── ocr.js
│   │   │   ├── ocr.js.map
│   │   │   ├── ocr.ts
│   │   │   ├── presidio-integration.ts
│   │   │   ├── privacy-budget.d.ts
│   │   │   ├── privacy-budget.d.ts.map
│   │   │   ├── privacy-budget.js
│   │   │   ├── privacy-budget.ts
│   │   │   ├── pseudonymization.ts
│   │   │   ├── pseudonymize.d.ts
│   │   │   ├── pseudonymize.d.ts.map
│   │   │   ├── pseudonymize.js
│   │   │   ├── pseudonymize.js.map
│   │   │   ├── pseudonymize.ts
│   │   │   ├── redact.d.ts
│   │   │   ├── redact.d.ts.map
│   │   │   ├── redact.js
│   │   │   ├── redact.js.map
│   │   │   ├── redact.ts
│   │   │   ├── types.d.ts
│   │   │   ├── types.d.ts.map
│   │   │   ├── types.js
│   │   │   ├── types.js.map
│   │   │   └── types.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── 📁 document-parser
│   │   ├── Dockerfile
│   │   ├── parse.py
│   │   └── requirements.txt
│   ├── 📁 dp
│   │   ├── 📁 src
│   │   │   ├── accountant.d.ts
│   │   │   ├── accountant.d.ts.map
│   │   │   ├── accountant.js
│   │   │   ├── accountant.js.map
│   │   │   ├── accountant.ts
│   │   │   ├── index.d.ts
│   │   │   ├── index.d.ts.map
│   │   │   ├── index.js
│   │   │   ├── index.js.map
│   │   │   ├── index.ts
│   │   │   ├── noise.d.ts
│   │   │   ├── noise.d.ts.map
│   │   │   ├── noise.js
│   │   │   ├── noise.js.map
│   │   │   ├── noise.ts
│   │   │   ├── receipt.d.ts
│   │   │   ├── receipt.d.ts.map
│   │   │   ├── receipt.js
│   │   │   ├── receipt.js.map
│   │   │   ├── receipt.ts
│   │   │   ├── types.d.ts
│   │   │   ├── types.d.ts.map
│   │   │   ├── types.js
│   │   │   ├── types.js.map
│   │   │   └── types.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── 📁 policy
│   │   ├── export_dp.rego
│   │   ├── purpose_binding.rego
│   │   └── residency.rego
│   ├── 📁 schemas
│   │   ├── 📁 src
│   │   │   ├── analytics.schema.ts
│   │   │   ├── appointment.schema.ts
│   │   │   ├── clinical.schema.ts
│   │   │   ├── compliance.schema.ts
│   │   │   ├── constants.ts
│   │   │   ├── index.d.ts
│   │   │   ├── index.d.ts.map
│   │   │   ├── index.js
│   │   │   ├── index.js.map
│   │   │   ├── index.ts
│   │   │   ├── patient.schema.ts
│   │   │   ├── prescription.schema.ts
│   │   │   └── user.schema.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── 📁 shared-kernel
│   │   └── index.d.ts
│   ├── 📁 shared-types
│   │   ├── 📁 src
│   │   │   ├── ai.ts
│   │   │   ├── clinical.ts
│   │   │   ├── index.ts
│   │   │   ├── patient.ts
│   │   │   ├── quality.ts
│   │   │   ├── rules.ts
│   │   │   └── schemas.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── 📁 utils
│   │   ├── 📁 src
│   │   │   ├── canonical-serializer.ts
│   │   │   ├── crypto.d.ts
│   │   │   ├── crypto.d.ts.map
│   │   │   ├── crypto.js
│   │   │   ├── crypto.js.map
│   │   │   ├── crypto.ts
│   │   │   ├── index.d.ts
│   │   │   ├── index.d.ts.map
│   │   │   ├── index.js
│   │   │   ├── index.js.map
│   │   │   ├── index.ts
│   │   │   ├── logger.d.ts
│   │   │   ├── logger.d.ts.map
│   │   │   ├── logger.js
│   │   │   ├── logger.js.map
│   │   │   └── logger.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── .DS_Store
├── 📁 prisma
│   ├── schema.prisma
│   └── seed.ts
├── 📁 public
│   ├── 📁 images
│   │   ├── artificial-intelligence.svg
│   │   ├── bio-adaptive-hero-bg.jpeg
│   │   ├── futuristic-clinic-alt-1.jpg
│   │   ├── futuristic-clinic-alt-2.jpg
│   │   ├── futuristic-clinic-command-center.jpg
│   │   └── futuristic-health-command-center.jpeg
│   ├── 📁 logos
│   │   └── .DS_Store
│   ├── .DS_Store
│   └── landing.html
├── 📁 scripts
│   ├── 📁 blue-green
│   │   ├── get-active-environment.sh
│   │   ├── health-check.sh
│   │   ├── monitor-deployment.sh
│   │   ├── monitor-production.sh
│   │   ├── rollback.sh
│   │   └── switch-traffic.sh
│   ├── 📁 clinical
│   │   └── build-content-bundle.ts
│   ├── add-ts-ignore-missing-models.js
│   ├── backup-database.sh
│   ├── check-audit-coverage.sh
│   ├── check-translations.js
│   ├── comment-missing-models.js
│   ├── comment-out-missing-models.sh
│   ├── cortex-export-helper.js
│   ├── dr-test.sh
│   ├── encrypt-existing-phi.ts
│   ├── expo-go-qr.mjs
│   ├── fix-audit-detail-types.js
│   ├── fix-audit-details.js
│   ├── fix-audit-errors-pass2.js
│   ├── fix-audit-errors.js
│   ├── fix-audit-ipaddress.js
│   ├── fix-audit-logging.sh
│   ├── fix-audit-request-param.js
│   ├── fix-audit-syntax.js
│   ├── fix-audit-useragent-request.js
│   ├── fix-duplicate-properties.js
│   ├── fix-implicit-any-routes.js
│   ├── fix-orderby-timestamp.js
│   ├── generate-cosign-keys.sh
│   ├── generate-project-map.js
│   ├── generate-synthea-fhir-docker.sh
│   ├── generate-synthea-patients.sh
│   ├── generate-synthetic-data.ts
│   ├── init-casbin.ts
│   ├── install-pre-commit-hook.sh
│   ├── load-test-api.js
│   ├── pre-commit-hook.sh
│   ├── restore-database.sh
│   ├── run-dast-scan.sh
│   ├── seed-patients.ts
│   ├── seed-synthea-demo.sh
│   ├── setup-calendar-oauth.sh
│   ├── setup-git-secrets.sh
│   ├── setup-pgvector.sql
│   ├── setup-swap.sh
│   ├── setup-testing-tools.sh
│   ├── setup.sh
│   ├── test-cosign-signing.sh
│   ├── test-monitoring.sh
│   ├── test-restore.sh
│   └── update-cortex-docs-metadata.js
├── 📁 synthea
│   └── synthea-with-dependencies.jar
├── 📁 synthea-output
│   ├── 📁 fhir
│   │   ├── Adan632_Marks830_51e11e9f-5090-969f-0a4a-af8e1d8f9069.json
│   │   ├── Alethea978_Julee121_Dibbert990_106005fc-8cb4-7a3e-e7dd-b5ee4f98a604.json
│   │   ├── Alex454_Reichel38_cad447c7-a68f-857b-9460-7e652dabd23a.json
│   │   ├── Allen322_Hauck852_53e65a60-171f-e103-8ad9-337272325780.json
│   │   ├── Angelyn934_September423_Russel238_2cc1f87b-5fd4-3dae-6103-5ff3d85b32fb.json
│   │   ├── Ashli227_Jody426_Klocko335_c90eac50-9009-8fce-92f4-38f9dcdccd48.json
│   │   ├── Barton704_Eichmann909_2f0db416-be59-bd40-b698-1905d3223085.json
│   │   ├── Bernarda685_Annabell933_Boyle917_dcd3cd4c-56cc-a743-fe2c-1520e9d51f14.json
│   │   ├── Berry486_Streich926_2d2c5dcd-6bb7-86c7-8459-593c064ed41a.json
│   │   ├── Brock407_Howe413_ccac6ba2-fa5a-347b-05b7-05f36efce062.json
│   │   ├── Brock407_Schoen8_93693dd5-5705-75f9-4d56-a603bf585fe0.json
│   │   ├── Buddy254_Glover433_ba463416-bf75-750c-ec38-39a4c5c3753e.json
│   │   ├── Carmine137_Armstrong51_e3238a5b-6ac5-bd70-8bb8-0afd12f7e62c.json
│   │   ├── Cherly215_Louis204_Jenkins714_1b0809cf-9d92-452d-5762-06413dc70fc4.json
│   │   ├── Chieko845_Lockman863_b16f232d-e615-52e1-4451-ba1f053b7300.json
│   │   ├── Chrystal576_Dietrich576_e7537a1a-78fa-da99-92d4-e8d916b31b0a.json
│   │   ├── Clement78_Schinner682_76436f86-fbc4-f5b8-2f19-5eae83012543.json
│   │   ├── Cleo27_Ebert178_bfd89d43-56dc-0554-5a7a-5ce2c2198054.json
│   │   ├── Clifford177_Kiehn525_6b31c0ee-4559-5c6b-f83b-f478f2860020.json
│   │   ├── Codi873_Ling534_Glover433_5bd51316-2632-a94a-42a8-3d01d28ca547.json
│   │   ├── Detra426_Mitzi535_Dicki44_91fcddf9-f269-295a-ba67-6c2bdd5e23e4.json
│   │   ├── Dong972_Miller503_3ced65dc-c6f9-6133-950e-585a5c88d08e.json
│   │   ├── Earlene410_Carlyn477_Harvey63_576d6026-2cc3-2a5e-a702-c06849ab8e1a.json
│   │   ├── Earnest658_Rau926_031e5359-6e28-2d87-d97b-322fed6d106b.json
│   │   ├── Edgar153_Collins926_930864dc-e60b-7a45-4394-f15fcdd285d8.json
│   │   ├── Edra310_Yundt842_c1597303-21d8-dc8c-954e-0f8aa2eaebf0.json
│   │   ├── Elease461_Corrin41_Stoltenberg489_5792de23-4823-bc2e-58d5-5cc299a94791.json
│   │   ├── Ernie189_Barrows492_900bf09d-6fd9-a8bb-f70f-6a6e4f54d3f4.json
│   │   ├── Gerardo48_Bravo546_c91a0b23-79ae-63e3-317f-b163c367e131.json
│   │   ├── Gerardo48_Burgos636_c278cc0a-96ab-e15f-57ee-ce07ec0a9843.json
│   │   ├── Glayds212_Treena759_Grimes165_981595e3-fa0a-d9c9-3300-a47dc011798a.json
│   │   ├── Heath320_Haley279_573a63d0-e334-2aa7-464a-4381ac3182f6.json
│   │   ├── Horace32_Mosciski958_bc236487-aa64-cf2c-7ef6-e3c7d3e1b7af.json
│   │   ├── hospitalInformation1768431649566.json
│   │   ├── Hugo693_Valle770_0f37a11b-c1ec-5d33-0b4c-eeab71319dd3.json
│   │   ├── Hyman89_Ankunding277_25a65b64-9dc0-197e-2a67-2ad32d39e8e7.json
│   │   ├── Inell560_Ledner144_65e78fda-b587-260f-4bf8-4af3c53a2b42.json
│   │   ├── Jamila16_Jolie499_Denesik803_84867ed8-1ec5-a4c2-ec4a-230012a3b63e.json
│   │   ├── Jane262_Corkery305_e81347df-a115-53ba-a3ac-e9068a07bb75.json
│   │   ├── Jeffery551_Dooley940_a2e11b79-01b9-caa9-bd70-a5b97508286f.json
│   │   ├── Jimmie93_Predovic534_d2b617a1-c184-1a4d-dbf1-4cce4e5d00d5.json
│   │   ├── Juan_Carlos348_Corona300_c07a80cc-a61e-3903-a717-6f74a8adf5f8.json
│   │   ├── Kelly223_Barton704_f343c537-8e1a-a9bf-c74c-d56732888fd2.json
│   │   ├── Kizzie166_McClure239_5f84bd31-d870-ebf3-158f-d4daa0892361.json
│   │   ├── Lang846_Reichert620_3c8e96ef-af7e-7107-2336-25e9bbbeb127.json
│   │   ├── Laverne101_Volkman526_19d3481e-b60d-8192-3307-96816db8494e.json
│   │   ├── Lawerence6_Bednar518_31597b21-a502-1384-2c6b-8bf4088a2d65.json
│   │   ├── Leo278_Loida499_Grady603_460430ae-79b9-aeac-62ca-8c400ecdfe8a.json
│   │   ├── Marge692_Ka422_Wintheiser220_98f5745e-31d8-94f3-a061-8591df96929d.json
│   │   ├── Nadene309_Jacobson885_ca4f5ef5-6e02-84fd-427b-7bd38a182718.json
│   │   ├── Nannette779_Jame231_Jenkins714_ba6cce62-0d7b-e34e-8ab3-ea379116859f.json
│   │   ├── Natacha644_Arica110_Jones311_f466f848-ef6e-9824-1ff8-96698977a270.json
│   │   ├── Ocie984_Kuvalis369_19cf6920-2d0e-44c5-36f7-59c03ec3b12c.json
│   │   ├── Olen518_Moore224_af9e21bf-2613-a75d-c5e4-d89deb415a35.json
│   │   ├── Pauletta164_Mraz590_edb394e2-a57c-8fd8-2539-9abf1f863e02.json
│   │   ├── practitionerInformation1768431649566.json
│   │   ├── Providencia986_Veronika907_Feil794_8bd63220-aade-d290-9cb2-5f71422281e4.json
│   │   ├── Raphael767_Lang846_b443a4e2-e470-44a5-ae24-a89b147061e0.json
│   │   ├── Rigoberto443_Bartell116_e56512de-287f-7414-ce89-0d337450259c.json
│   │   ├── Rob341_Abernathy524_c3ce4a6c-8e92-1c0b-c909-8815931433f3.json
│   │   ├── Rodrigo242_Lomeli256_333365a6-6ec3-db15-e3db-146c5532571f.json
│   │   ├── Sebastian508_Green467_25e2fbf1-f36b-eebb-302a-976d3b6ab6b9.json
│   │   ├── Shannan727_Dawna21_Jast432_3d314738-9019-9caf-9ccb-f2d60078650c.json
│   │   ├── Sharleen176_Tammy740_Nitzsche158_9e03275b-3063-6f25-dfa4-7287c51d9aa6.json
│   │   ├── Tama137_Anita473_Wunsch504_c4bc9d05-0931-f296-7217-d0fc7243fb27.json
│   │   ├── Tory770_Zulauf375_5b99a9ae-7585-5146-651c-b69f3a56b759.json
│   │   ├── Trinidad33_Rogahn59_0e973eec-01ab-a613-fef9-e00bed76d67c.json
│   │   ├── Truman805_Bergnaum523_d41f2e70-85bd-0171-c442-a00289013e76.json
│   │   ├── Twila243_Cronin387_9c8b8f65-633c-bc8e-7117-e9938756b244.json
│   │   └── Waylon572_Schmidt332_d5808eee-e54b-fa5a-d7e5-8bc97b8befd3.json
│   ├── 📁 metadata
│   │   └── 2026_01_14T23_00_49Z_50_Massachusetts_38dbb0f2_fe5d_4b48_a686_c68bcd6f2028.json
│   └── GENERATION_REPORT.md
├── 📁 test-files
│   └── test-lab-result.txt
├── 📁 tests
│   ├── 📁 e2e
│   │   ├── 01-patient-registration.spec.ts
│   │   └── 02-prescription-creation.spec.ts
│   └── 📁 load
│       ├── api-baseline.js
│       └── prescription-load.js
├── 📁 Users
│   └── 📁 nicolacapriroloteran
│       └── 📁 prototypes
│           └── 📁 holilabsv2
│               └── 📁 synthea-output
│                   ├── 📁 fhir
              └── ... (truncated)
│                   └── 📁 metadata
              └── ... (truncated)
├── .commitlintrc.json
├── .cursorrules
├── .dockerignore
├── .DS_Store
├── .env
├── .env.example
├── .env.local
├── .env.local.secret
├── .env.production
├── .env.production.secrets.template
├── .git-secrets-patterns.txt
├── .gitallowed
├── .gitignore
├── .gitleaks.toml
├── .lighthouserc.json
├── AB_TESTING_DEPLOYMENT_CHECKLIST.md
├── AB_TESTING_GUIDE.md
├── AB_TESTING_READINESS.md
├── ACCESSIBILITY_AUDIT.md
├── AEGIS_ARCHITECTURE.md
├── AGENT_26_COMPLETION_REPORT.md
├── AGENT_26_FILE_TREE.md
├── AI_CONFIDENCE_SCORING_IMPLEMENTATION.md
├── AI_SCRIBE_PRIVACY_IMPLEMENTATION.md
├── AI-INFRASTRUCTURE-DEPLOYMENT.md
├── ANALYTICS_IMPLEMENTATION_COMPLETE.md
├── ANALYTICS_MONITORING_COMPLETE.md
├── ANALYTICS_SETUP.md
├── app-spec.yaml
├── APPOINTMENT_CONFLICT_DETECTION.md
├── ARCHITECTURE_MAP.mermaid
├── AUDIT_LOGGING_IMPROVEMENTS.md
├── BAA_EMAIL_TEMPLATES_READY_TO_SEND.md
├── BACKEND_APIS_COMPLETE.md
├── BACKEND_COMPLETION_SUMMARY.md
├── BACKEND_ROADMAP.md
├── BLOCKING_TASKS_COMPLETE.md
├── BRANCH_PROTECTION_SETUP.md
├── BRAZILIAN-HEALTH-INTEROPERABILITY.md
├── BUILD_REMEDIATION_REPORT.md
├── BUILD_SUCCESS_TYPESCRIPT_FIXES.md
├── CASE_STUDIES_HEALTH_3.0.md
├── CDSS_IMPLEMENTATION_GUIDE.md
├── CHANGELOG.md
├── check-appointments.sql
├── CICD_PIPELINE_AUDIT.md
├── CICD_QUICK_REFERENCE.md
├── CLAUDE.md
├── CLINICAL_NOTE_VERSIONING.md
├── COMPLETE_APPOINTMENT_SYSTEM_SETUP.md
├── COMPLETE_IMPLEMENTATION_CHECKLIST.md
├── COMPLETE_IMPLEMENTATION_SUMMARY.md
├── CONFIRMATION_SYSTEM_SETUP.md
├── COSIGN_IMAGE_SIGNING_GUIDE.md
├── COSIGN_IMPLEMENTATION_COMPLETE.md
├── COSIGN_QUICK_REFERENCE.md
├── cosign.key
├── cosign.pub
├── CRITICAL_GAPS_AND_FIXES.md
├── CURRENT_STATUS.md
├── DAST_IMPLEMENTATION_COMPLETE.md
├── DAST_QUICK_REFERENCE.md
├── DAST_SECURITY_GUIDE.md
├── DATA_SUPREMACY.md
├── deploy-production.sh
├── DEPLOY.md
├── deploy.sh
├── DEPLOYMENT_CHECKLIST.md
├── DEPLOYMENT_FAILURE_PREVENTION.md
├── DEPLOYMENT_FIX_SUMMARY.md
├── DEPLOYMENT_FIX.md
├── DEPLOYMENT_GUIDE.md
├── DEPLOYMENT_INSTRUCTIONS.md
├── DEPLOYMENT_QUICK_START.md
├── DEPLOYMENT_READY_STATUS.md
├── DEPLOYMENT_READY.md
├── DEPLOYMENT_SECRETS_CHECKLIST.md
├── DEPLOYMENT_SUCCESS.md
├── DEPLOYMENT_SUMMARY.md
├── DEPLOYMENT_VERIFICATION.md
├── DEPLOYMENT-CHECKLIST.md
├── DEPLOYMENT.md
├── DEVELOPMENT_SESSION_SUMMARY.md
├── DICOM_METADATA_SUPPORT.md
├── DIGITALOCEAN_DEPLOYMENT.md
├── DIGITALOCEAN_DROPLET_DEPLOYMENT.md
├── DIGITALOCEAN_ENV_SETUP.md
├── DIGITALOCEAN_ENV_VARS.txt
├── DOCKER_WORKFLOW.md
├── docker-compose.presidio.yml
├── docker-compose.prod.yml
├── docker-compose.testing.yml
├── docker-compose.yml
├── Dockerfile
├── DOMAIN_MIGRATION_HOLILABS.xyz.md
├── DROPLET_MASTER_PROMPT.md
├── ENTERPRISE_COMPLETE_SUMMARY.md
├── ENTERPRISE_READINESS_PROGRESS.md
├── ENVIRONMENT_COMPARISON_MATRIX.md
├── ENVIRONMENT_SETUP_README.md
├── ENVIRONMENT_SETUP_SUMMARY.md
├── ENVIRONMENT_STATUS.md
├── EXECUTION_SUMMARY.md
├── expo-connect.html
├── expo-go-qr.png
├── expo-go-url.txt
├── expo-qr-code.html
├── FEATURE_FLAGS_GUIDE.md
├── FINAL_DEPLOYMENT_STATUS.md
├── fix-error-exposure.sh
├── FIXES_SUMMARY.md
├── FUNNELS_AND_DASHBOARDS_GUIDE.md
├── GAMMA_PRESENTATION_BRIEF.md
├── GETTING_STARTED.md
├── GITHUB_BRANCH_PROTECTION_SETUP.md
├── GITHUB_RESEARCH_PLAN.md
├── gitleaks-report.json
├── GOOGLE_CLOUD_SQL_DEPLOYMENT.md
├── GOOGLE_OAUTH_SETUP.md
├── GTM_COMPETITIVE_POSITIONING.md
├── HIPAA_BAA_REQUIREMENTS.md
├── HOLILABS_BRIEFING_DOCUMENT.md
├── HOLILABS_XYZ_DEPLOYMENT.md
├── HYBRID_DEID_IMPLEMENTATION.md
├── IMMEDIATE_ACTION_PLAN.md
├── IMMEDIATE_NEXT_ACTIONS.md
├── IMMEDIATE_SECURITY_ACTIONS.md
├── IMPLEMENTATION_NOTES.md
├── IMPLEMENTATION_STATUS.md
├── IMPLEMENTATION_SUMMARY.md
├── IMPROVEMENTS_IMPLEMENTATION.md
├── INDUSTRY_GRADE_GAPS.md
├── INFRASTRUCTURE_AUTOMATION_DEPLOYMENT.md
├── INTRO_AND_GOOGLE_AUTH_IMPLEMENTATION.md
├── INVITATION_SYSTEM_GUIDE.md
├── IPHONE_PWA_TEST_RESULTS.md
├── K6_LOAD_TESTING_COMPLETE.md
├── K6_QUICK_START.md
├── LANDING_PAGE_TRUTH_SET_AND_OPERATIONAL_OVERVIEW.md
├── LANDING_PAGE_UPGRADE_SUMMARY.md
├── landing-page.html
├── launch-expo-go.sh
├── LIQUID_CLINICAL_REFACTOR_SUMMARY.md
├── LOCAL_DEVELOPMENT_SETUP.md
├── LOCAL_ENV_SETUP_GUIDE.md
├── MAJOR_LANDING_PAGE_REDESIGN.md
├── MEDICAL_LICENSE_VERIFICATION.md
├── MIGRATION_SCRIPT.sh
├── MIGRATION_SUMMARY.md
├── MONETIZATION_STRATEGY.md
├── MONITORING_QUICK_REFERENCE.md
├── MONITORING_SETUP_GUIDE.md
├── MONITORING_SETUP_INSTRUCTIONS.md
├── MONITORING_SETUP.md
├── NAVIGATION_IMPROVEMENTS.md
├── NEXT_STEPS_IMPLEMENTATION.md
├── NORDVPN_FLAGGING_IMMEDIATE_ACTIONS.md
├── OPEN_SOURCE_RESEARCH_FINDINGS.md
├── package.json
├── PATIENT_PORTAL_IMPROVEMENTS.md
├── PATIENT_PORTAL_README.md
├── PEQUENO-COTOLENGO-PILOT.md
├── PERFORMANCE_MONITORING.md
├── PHASE_2_CLINICAL_DECISION_SUPPORT_COMPLETE.md
├── PHASE_2_COMPLETED.md
├── PHASE_2_COMPLETION.md
├── PHASE_2_SMART_TEMPLATES_COMPLETE.md
├── PHASE_3_2_QUICK_ACTIONS_COMPLETE.md
├── PHASE_3_3_VOICE_COMMANDS_COMPLETE.md
├── PHASE_3_PRIORITY_DASHBOARD_COMPLETE.md
├── PHASE_4_MAR_COMPLETE.md
├── PHASE_5_SCHEDULING_PLAN.md
├── PHASE1_IMPLEMENTATION_SUMMARY.md
├── PHASE2_QUICK_WINS_COMPLETE.md
├── PINO_IMPLEMENTATION.md
├── playwright.config.ts
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── POSTHOG_PRODUCTION_SETUP_GUIDE.md
├── PRESIDIO_DEPLOYMENT_GUIDE.md
├── PRESIDIO_HYBRID_DEID_GUIDE.md
├── PREVENTION_HUB_IMPLEMENTATION.md
├── PRICING_IMPLEMENTATION_SUMMARY.md
├── PRIVACY_CONSENT_IMPLEMENTATION_COMPLETE.md
├── PRODUCT_CAPABILITIES.md
├── PRODUCT_ROADMAP_2025.md
├── PRODUCT_ROADMAP.md
├── PRODUCTION_DEPLOYMENT_GUIDE.md
├── PRODUCTION_LAUNCH_CHECKLIST.md
├── PRODUCTION_READINESS_CHECKLIST.md
├── PRODUCTION_READINESS.md
├── PRODUCTION_READY_SUMMARY.md
├── PROJECT_SNAPSHOT.md
├── PROJECT_SUMMARY.md
├── PUSH_NOTIFICATION_DIAGRAMS.md
├── QUICK_DEPLOYMENT_GUIDE.md
├── QUICK_REFERENCE.md
├── QUICK_START_GOOGLE_AUTH.md
├── QUICK_START_INVITATION_SYSTEM.md
├── QUICK_START_LOCAL.md
├── QUICK_WINS_COMPLETE.md
├── QUICK_WINS_IMPLEMENTED.md
├── QUICKSTART_DIGITALOCEAN.md
├── README_TRANSCRIPT_QUIZ.md
├── README.md
├── REALTIME_AND_OFFLINE_AI_IMPLEMENTATION.md
├── RED_TEAM_AUDIT_REPORT.md
├── RED_TEAM_REPORT.md
├── REDIS_CACHING_IMPLEMENTATION.md
├── REFERRAL_SYSTEM_COMPLETE.md
├── RLHF_IMPLEMENTATION_GUIDE.md
├── ROADMAP.md
├── SCHEMA_MIGRATION_GUIDE.md
├── SECRETS_GENERATION.md
├── SECURITY_AUDIT_REPORT_2025-01-08.md
├── SECURITY_AUDIT_REPORT.md
├── SECURITY_DEPLOYMENT_CHECKLIST.md
├── SECURITY_FIXES_SUMMARY_2025-01-08.md
├── SECURITY_FIXES_SUMMARY.md
├── SECURITY_HARDENING_REPORT.md
├── SECURITY_QUICK_REFERENCE.md
├── SECURITY_REVOCATION_ADVISORY.md
├── SECURITY_SECRET_ROTATION_PLAN.md
├── SECURITY.md
├── SENTRY_SETUP.md
├── SESSION_COMPLETE_SUMMARY.md
├── SESSION_FINAL_SUMMARY_OCT_26.md
├── SESSION_SUMMARY_JAN_15_2025.md
├── SESSION_SUMMARY_OCT_26_2025.md
├── SESSION_SUMMARY.md
├── setup-git-secrets.sh
├── setup-invitation-system.sh
├── SOC2_PHASE1_COMPLETE.md
├── SOC2_PHASE1_IMPLEMENTATION_SUMMARY.md
├── SOC2_PHASE1_WEEK3_CASBIN_COMPLETE.md
├── STABILIZATION_REPORT.md
├── START_HERE.md
├── start-expo.sh
├── SWARM_CONTEXT_CLINIC.md
├── SWARM_CONTEXT_ENTERPRISE.md
├── SWARM_CONTEXT_SHARED.md
├── SWARM_MANIFEST.md
├── TECHNICAL_FIXES_SUMMARY.md
├── Test
├── test-quick-wins.sh
├── test-whatsapp.sh
├── TESTING_GUIDE_PHASE_2.md
├── transcript-to-quiz.js
├── tsconfig.json
├── turbo.json
├── TWILIO_SETUP_QUICKSTART.md
├── update-env-keys.sh
├── verify_deepgram_scribe.py
├── VISION_AND_ROADMAP.md
├── WEB_PUSH_NOTIFICATIONS_COMPLETE.md
├── WEBSITE_SECURITY_FLAGGING_FIX.md
├── WEEK-1-PROGRESS.md
└── WORKFLOW_EXPLAINED.md

```

## Key Directories

| Directory | Owner | Purpose |
|-----------|-------|---------|
| `apps/web/` (→ `apps/clinic/`) | SWARM-C (Clinic Bot) | Next.js SaaS application — UI, pages, clinic API routes |
| `apps/enterprise/` | SWARM-E (Enterprise Bot) | Prediction platform — TISS ingestion, ML, insurer dashboards |
| `apps/sidecar/` | Maintenance | Electron desktop companion |
| `apps/api/` | SWARM-I (Infra Bot) | Fastify API gateway |
| `packages/shared-kernel/` | SWARM-K (Kernel Guardian) | Clinical Protocol Engine, Auth, Governance, Types |
| `packages/deid/` | SWARM-K | De-identification library |
| `packages/schemas/` | SWARM-K | Zod validation schemas |
| `packages/shared-types/` | SWARM-K | TypeScript interfaces |
| `packages/dp/` | SWARM-E | Differential Privacy |
| `packages/utils/` | SWARM-K | Logger, crypto utilities |
| `packages/policy/` | SWARM-K | OPA/Rego policy rules |
| `data/clinical/` | SWARM-K | Clinical content bundles & source rules |
| `docs/` | All agents | Documentation archives |
| `scripts/` | SWARM-I | Build, deploy, automation scripts |
| `.cursor/rules/` | Human CEO | Agent persona definitions |

## Dependency Rule
```
apps/* ──depends-on──▶ packages/*
packages/* ──NEVER──▶ apps/*
apps/clinic ──NEVER──▶ apps/enterprise
apps/enterprise ──NEVER──▶ apps/clinic
```

---

## Database Environments

| Environment | Location | DATABASE_URL | Status |
|-------------|----------|--------------|--------|
| **Production** | DigitalOcean (remote) | Root `.env` | Out of sync with schema.prisma (missing `organizationId`, table name mismatches via `@@map`) |
| **Local Dev** | `localhost:5432/holi_labs` | `apps/web/.env` | Mostly in sync; missing `lab_results.sampleCollectedAt`, `Medication.notes` columns |

**Critical:** Root `DATABASE_URL` points to **production**. Always use `apps/web/` context for local development work.

**Prisma Schemas:**

| Schema | Models | Purpose |
|--------|--------|---------|
| `apps/web/prisma/schema.prisma` | 120+ models | Primary clinical app (Patient, GovernanceLog, AssuranceEvent, etc.) |
| `apps/api/prisma/schema.prisma` | 11 models | FHIR-compliant API gateway (Org, User, Encounter, Observation, etc.) |
| `apps/edge/prisma/schema.prisma` | SQLite | Offline-first edge sync (clinic tablets) |

---

## Core Data Models (apps/web)

### Clinical Domain
| Model | Table (@@map) | Key Fields | Purpose |
|-------|---------------|------------|---------|
| `Patient` | `patients` | `mrn` (unique), `tokenId` (unique), `firstName`, `lastName`, `dateOfBirth`, `cns`, `cpf` | Core patient record with LGPD-compliant encryption |
| `Medication` | `medications` | `patientId`, `name`, `dosage`, `frequency` | Active medication list |
| `LabResult` | `lab_results` | `patientId`, `testName`, `value`, `unit`, `collectedAt` | Laboratory results |
| `VitalSign` | `vital_signs` | `patientId`, `type`, `value`, `measuredAt` | Weight, BP, heart rate |
| `Diagnosis` | `diagnoses` | `patientId`, `icdCode`, `description` | ICD-10 coded diagnoses |
| `Allergy` | `allergies` | `patientId`, `allergen`, `severity`, `reaction` | Known allergies |

### Governance & Safety
| Model | Table (@@map) | Key Fields | Purpose |
|-------|---------------|------------|---------|
| `GovernanceLog` | `governance_logs` | `sessionId`, `inputPrompt`, `rawModelOutput`, `sanitizedOutput`, `safetyScore`, `overrideReason` | Flight recorder for every LLM interaction |
| `GovernanceEvent` | `governance_events` | `logId`, `ruleId`, `ruleName`, `severity` (HARD_BLOCK/SOFT_NUDGE/INFO), `actionTaken` (BLOCKED/FLAGGED/PASSED) | Individual rule evaluation outcome |
| `AuditLog` | `audit_logs` | `userId`, `action`, `resource`, `details` | General audit trail |
| `ClinicalRule` | `clinical_rules` | `ruleId`, `name`, `severity`, `condition` | Rule definitions for safety engine |

### RLHF Data Capture (Assurance Platform)
| Model | Table (@@map) | Key Fields | Purpose |
|-------|---------------|------------|---------|
| `AssuranceEvent` | `assurance_events` | `patientIdHash` (SHA256), `eventType`, `inputContextSnapshot`, `aiRecommendation`, `aiConfidence`, `humanDecision`, `humanOverride`, `overrideReason` | AI vs Human divergence capture for training |
| `HumanFeedback` | `human_feedback` | `assuranceEventId`, `feedbackType`, `rating` | Clinician feedback on AI recommendations |
| `OutcomeGroundTruth` | `outcome_ground_truths` | `assuranceEventId`, `outcomeType`, `outcomeData` | Real-world outcome linked back to AI decision |
| `RuleVersion` | `rule_versions` | `version`, `ruleSetHash`, `changelog` | Rule versioning for regression tracking |
| `OverrideCluster` | `override_clusters` | `pattern`, `count`, `clinicId` | Grouped override patterns for RLHF |
| `RuleProposal` | `rule_proposals` | `proposedBy`, `ruleDefinition`, `status` | Data-driven rule change proposals |

---

## DOAC Safety Engine — Clinical Decision Logic

### Rule Engine Classification
```
IF (medication == DOAC) AND (creatinineClearance < threshold) THEN
  severity = "BLOCK"  → Contraindicated (FDA/ESC guideline)
ELSE IF (drug_interaction_detected OR beers_criteria_triggered) THEN
  severity = "FLAG"   → Caution required (pharmacist review)
ELSE IF (missing_lab_data OR stale_lab_data) THEN
  severity = "ATTESTATION_REQUIRED" → Clinician must provide data
ELSE
  severity = "PASS"   → Safe dosing confirmed
```

### CrCl Thresholds (Cockcroft-Gault)
| DOAC | BLOCK Threshold | Formula |
|------|-----------------|---------|
| Rivaroxaban | CrCl < 30 ml/min | FDA label |
| Edoxaban | CrCl < 15 ml/min | FDA label |
| Dabigatran | CrCl < 30 ml/min | FDA label |
| Apixaban | CrCl < 15 ml/min (dose reduce < 25) | FDA label |

### Billing Code Mapping (Bolivia TUSS)
| Classification | TUSS Code | Rate (BOB) | Description |
|---------------|-----------|------------|-------------|
| BLOCK | `4.01.01.01` | 4,500 | Specialized DOAC Review (Contraindicated) |
| FLAG | `4.01.01.01` | 3,750 | Specialized Drug Interaction Review |
| ATTESTATION_REQUIRED | `4.01.01.01` | 3,000 | Specialized DOAC Review (Data Completion) |
| PASS | `1.01.01.01` | 1,250 | Standard DOAC Verification |

---

## Pilot Reports (reports/)

Generated artifacts from FRR Phase 1 and Operation Black Box:

| File | Author | Purpose |
|------|--------|---------|
| `CLINICAL_FRR_PHASE1.md` | Dr. Elena García (CMO) | Clinical safety validation — 18 patients, 100% accuracy, P-001 vs P-002 cliff comparison |
| `CLINICAL_FRR_v1.md` | Dr. Elena García (CMO) | Earlier clinical FRR draft |
| `REVENUE_AUDIT_PHASE1.md` | Victor Mercado (VP Finance) | Revenue integrity — TPV: 42,750 BOB, zero leakage, TUSS code validation |
| `REVENUE_AUDIT.md` | Victor Mercado (VP Finance) | Earlier revenue audit draft |
| `LEGAL_TRACE_PHASE1.json` | Ruth Valdivia (CLO) | Governance log extraction for P-005, SHA-256 hashed patient IDs, HIPAA/LGPD compliance proof |
| `LEGAL_TRACE.json` | Ruth Valdivia (CLO) | Earlier legal trace draft |
| `WEEKLY_BUSINESS_REVIEW_v1.json` | All C-Suite | Week 1 aggregate: $28k revenue + $425k cost avoidance = 55.6x ROI, 447 interactions, 85% adherence |
| `VC_EMAIL_DRAFT.md` | Victor Mercado | Investor email to a16z/Kaszek — Series B ask ($5M), 55.6x Week 1 ROI |
| `UX_COPY_REVIEW.md` | Paul (CPO) | UX copy review for pilot interfaces |

---

## Pilot Cohort (18 Synthetic Patients)

Seeded via `apps/web/prisma/seed-pilot-data.ts` (run with `cd apps/web && pnpm exec tsx prisma/seed-pilot-data.ts`).

### Patient Distribution by Risk Category

| Category | Count | Patient IDs | Key Scenarios |
|----------|-------|-------------|---------------|
| **BLOCK** | 3 | P-001, P-015, P-018 | CrCl cliff (29), stress renal (18), pre-dialysis (15) |
| **FLAG** | 4 | P-005, P-006, P-007, P-019 | Triple anticoag, CYP3A4 inhibition, Beers Criteria (age 89), dual anticoag |
| **ATTESTATION** | 2 | P-003, P-004 | Missing weight, stale creatinine (>120h) |
| **PASS** | 9 | P-002, P-008–P-010, P-013–P-014, P-016–P-017, P-020 | CrCl cliff (31), normal, mild impairment, no research consent, control |

### Critical Boundary Tests
- **P-001 vs P-002:** CrCl=29 (BLOCK) vs CrCl=31 (PASS) — 1-point cliff proves rule precision
- **P-007:** Age 89, CrCl 25, Wt 55kg — Beers Criteria + renal + low weight triple risk
- **P-008:** CrCl=29 initially → physician override (hydration protocol) → CrCl improved to 34 at T+24h — RLHF training signal
- **P-012:** Consent revoked via WhatsApp — PII purged in <60s, anonymized governance log retained
- **P-013:** No research consent but clinical valid — still billable (research exclusion ≠ clinical exclusion)

---

## Architecture Decisions

### Concurrency Model (Operation Greenlight)
- **Pattern:** Server-authoritative data with optimistic UI rollback
- **Scenario:** Nurse updates weight (48→44kg) while doctor submits prescription with stale (48kg) data
- **Resolution:** Server always uses database-current weight, recalculates CrCl, returns corrected clinical context
- **Authorization:** RBAC with `renal_override_level: NEPHROLOGY_ONLY` — GP override attempts denied, logged to governance trail

### RLHF Pipeline (Operation Ouroboros)
```
Production DB ──▶ Anonymizer (SHA-256 + HIPAA Safe Harbor) ──▶ Research Lake
                        │
                        ├── Air Gap: No bi-directional links
                        ├── LGPD Article 11: Secondary use requires anonymization
                        └── HIPAA Safe Harbor: 15-element de-identification checklist
```

**Temporal Reconciliation:**
- Override event at T=0 linked to lab outcome at T+24h/T+72h via fuzzy matching
- Quality weighting: Labs (100%), EHR Notes (70%), WhatsApp Survey (40%)
- Adjudication: CASE_A (AI correct), CASE_B (Doctor correct → training signal), CASE_C (Neutral)

### Technology Stack
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | Clinic web app |
| Mobile | Expo (React Native) | Clinician mobile app |
| Edge | Express + SQLite | Offline-first clinic tablets |
| API | Fastify | FHIR-compliant gateway |
| Database | PostgreSQL | Primary store (Prisma ORM) |
| Auth | NextAuth.js | Session management + magic links |
| Messaging | WhatsApp Business API | Patient adherence + consent |
| Infrastructure | DigitalOcean | Production hosting |
| CI/CD | GitHub Actions | Build, test, deploy |

---

## Version Control Protocol

Per `CLAUDE.md`:
- AI agents are **forbidden** from executing `git commit` or `git push`
- AI may use `git add` only with explicit user approval
- AI drafts commit messages; human executes the command
- Only human operator pushes to production

---

## Week 1 Pilot Metrics (El Alto Clinic, Bolivia)

| Metric | Value |
|--------|-------|
| Patients | 18 |
| Interactions | 447 |
| Revenue (BOB) | 487,500 |
| Revenue (USD) | $28,031 |
| Cost Avoidance (USD) | $425,000 (17 SAEs prevented) |
| Operational Costs (USD) | $8,000 |
| **ROI** | **55.6x** |
| Adherence | 85% (vs 50-70% baseline) |
| Uptime | 99.7% |
| Safety Record | Zero adverse events |
| Data Integrity | 447 transactions, zero corruption |
