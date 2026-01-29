# Product Roadmap: Safe Scale Strategy

**Clinical Assurance Platform - Strategic Development Constitution**

**Version:** 2.0.0
**Last Updated:** January 29, 2026
**Status:** Approved for Antigravity Handoff

---

## Executive Summary

This document serves as the **Constitution** for all future development on the Clinical Assurance Platform. It enforces the **"Safe Scale"** strategy: building a product that is not just intelligent, but **deployable, compliant, and stable** in hostile hospital IT environments.

The roadmap assumes Phases 1-6 are complete:
- Phase 1: RLHF Data Capture Infrastructure
- Phase 2: Traffic Light & Revenue Integrity
- Phase 3: Edge-to-Cloud Sync Architecture
- Phase 4: Sidecar Desktop Overlay
- Phase 5: Agent-Native Improvements (216 MCP Tools)
- Phase 6: Production Hardening

**Current State:** 216 MCP tools, 84.7% Agent-Native score, production-ready architecture.

---

## Strategic Phases Overview

| Phase | Name | Strategic Goal | Priority |
|-------|------|----------------|----------|
| **7** | Trusted Partner Pipeline | Win the CISO to win the User | P0 - Distribution |
| **8** | Intelligence Flywheel | Turn frustration into precision | P1 - R&D |
| **9** | Safety-First Scribe | Own the encounter safely | P2 - Expansion |
| **10** | The Watchtower | Know before the client calls | P1 - Observability |

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      THE 'SAFE SCALE' STRATEGY                          │
│                                                                         │
│   Phase 7          Phase 8           Phase 9          Phase 10          │
│   ┌──────┐        ┌──────┐          ┌──────┐         ┌──────┐          │
│   │Trust │   →    │Intel │    →     │Safety│   →     │Watch │          │
│   │Partner│        │Fly-  │          │First │         │Tower │          │
│   │      │        │wheel │          │Scribe│         │      │          │
│   └──────┘        └──────┘          └──────┘         └──────┘          │
│                                                                         │
│   Distribution    Curated R&D       Vertical         Observability      │
│   & Trust         & Learning        Expansion        & Reliability      │
│                                                                         │
│   "Win CISO"      "Learn from       "Own the         "Know before       │
│                    overrides"        encounter"       they call"        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 7: The 'Trusted Partner' Pipeline

### Strategic Goal
**Win the CISO to win the User.**

Hospital IT departments are gatekeepers. A brilliant product that fails SmartScreen or requires manual installation on 500 workstations is dead on arrival. This phase transforms our Sidecar from a developer prototype into an enterprise-grade deployment artifact.

### Context
Brazilian hospitals run Windows 10/11 with strict Group Policy controls. IT teams deploy software via:
- Microsoft SCCM/Intune
- GPO (Group Policy Objects)
- Manual MSI installation with admin approval

Our Sidecar currently builds as a standalone `.exe`. This triggers:
- Windows SmartScreen warnings ("Unknown publisher")
- Manual installation requirement per workstation
- IT re-approval for every update

### Technical Strategy

#### 7.1 Enterprise Build Configuration
**File:** `apps/sidecar/electron-builder.yml`

```yaml
# Enterprise deployment configuration
appId: com.holilabs.sidecar
productName: HoliLabs Clinical Assurance
copyright: Copyright © 2026 HoliLabs

# MSI for Group Policy deployment
win:
  target:
    - target: msi
      arch: [x64]
    - target: nsis
      arch: [x64]

  # Certificate for EV signing (see 7.2)
  certificateSubjectName: "HoliLabs Healthcare Technology Ltda"
  certificateSha1: "${WIN_CERT_SHA1}"

  # Sign all executables
  signAndEditExecutable: true
  signDlls: true

msi:
  # GPO-friendly options
  oneClick: false
  perMachine: true
  createDesktopShortcut: false
  createStartMenuShortcut: true

  # Silent install support
  # msiexec /i HoliLabs.msi /qn ALLUSERS=1
  runAfterFinish: false

# Auto-update configuration (see 7.3)
publish:
  provider: generic
  url: https://updates.holilabs.com/sidecar
  channel: stable
```

**Deliverables:**
- [ ] MSI installer for SCCM/Intune deployment
- [ ] NSIS installer for manual installation
- [ ] Silent install support (`/qn` flag)
- [ ] Per-machine installation (not per-user)

#### 7.2 Reputation: EV Code Signing
**Goal:** Pass Windows SmartScreen on first launch.

**Background:**
- Standard code signing certificates ($200/year) still trigger SmartScreen for new publishers
- Extended Validation (EV) certificates ($400/year) provide immediate SmartScreen reputation
- EV requires hardware token (USB) and legal entity verification

**Implementation:**
```bash
# Sign with EV certificate (DigiCert, Sectigo, or GlobalSign)
# Requires USB token connected to build machine

# Windows SDK signtool
signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 \
  /sha1 ${WIN_CERT_SHA1} \
  dist/HoliLabs-Sidecar-Setup.msi

# Verify signature
signtool verify /pa /v dist/HoliLabs-Sidecar-Setup.msi
```

**CI/CD Integration:**
```yaml
# GitHub Actions signing step
- name: Sign Windows Installer
  if: matrix.os == 'windows-latest'
  env:
    WIN_CERT_SHA1: ${{ secrets.WIN_CERT_SHA1 }}
  run: |
    # Import certificate from Azure Key Vault or USB token
    signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 \
      /sha1 $WIN_CERT_SHA1 \
      dist/*.msi dist/*.exe
```

**Deliverables:**
- [ ] EV Code Signing Certificate (DigiCert recommended)
- [ ] Hardware token secure storage procedure
- [ ] CI/CD pipeline integration for automated signing
- [ ] SmartScreen reputation verified (0 warnings on clean Windows)

#### 7.3 Silent Updates: Zero IT Friction
**Goal:** Push hotfixes without IT re-approval.

**Background:**
Hospital IT approves software once, then expects it to "just work." If every bug fix requires a new approval cycle:
- 2-week delay per update (minimum)
- IT fatigue → deprioritization → churn

**Implementation:**
**File:** `apps/sidecar/src/main/auto-updater.ts`

```typescript
import { autoUpdater, UpdateInfo } from 'electron-updater';
import { app } from 'electron';
import log from 'electron-log';

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Silent update configuration
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Update channels: stable | beta | alpha
autoUpdater.channel = process.env.UPDATE_CHANNEL || 'stable';

// Check for updates every 4 hours
const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000;

export function initAutoUpdater(): void {
  // Check on startup (after 30 second delay to not block UI)
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 30_000);

  // Periodic checks
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, UPDATE_CHECK_INTERVAL);

  // Event handlers
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info('Update available:', info.version);
    // Silent download - no user prompt
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log.info('Update downloaded:', info.version);

    // For critical security updates, install immediately
    if (info.releaseNotes?.includes('[SECURITY]')) {
      log.warn('Security update - installing immediately');
      autoUpdater.quitAndInstall(true, true);
      return;
    }

    // Normal updates: install on next app quit
    // User won't even notice
  });

  autoUpdater.on('error', (error) => {
    log.error('Auto-updater error:', error);
    // Don't crash - just log and retry next interval
  });
}
```

**Deliverables:**
- [ ] Auto-updater integrated into Sidecar main process
- [ ] Update server deployed (S3 + CloudFront recommended)
- [ ] Release channels configured (stable/beta/alpha)
- [ ] Security update fast-path (immediate install)
- [ ] Rollback capability (downgrade to previous version)

### Success Metrics - Phase 7

| Metric | Target | Measurement |
|--------|--------|-------------|
| SmartScreen Warnings | 0 | Clean Windows 11 test |
| Time to Deploy (500 workstations) | < 1 hour | GPO push timing |
| Update Adoption Rate | > 95% in 48h | Telemetry |
| IT Support Tickets (install-related) | < 5/month | Zendesk |

---

## Phase 8: The Intelligence Flywheel

### Strategic Goal
**Turn user frustration into product precision.**

Every time a clinician overrides our recommendation, they're teaching us. This phase builds the infrastructure to systematically learn from disagreement and improve rule accuracy over time.

### Context
The RLHF data capture from Phase 1 gives us:
- `AssuranceEvent`: What AI/rules recommended
- `HumanFeedback`: What clinician actually did
- `OutcomeGroundTruth`: What happened (glosa, readmission, success)

But raw data is useless without:
1. **Clustering**: Finding patterns in overrides
2. **Promotion**: Turning patterns into rules
3. **Validation**: Human review before deployment

### Technical Strategy

#### 8.1 Cluster Engine (Pattern Discovery)
**Goal:** Group similar override events to identify systematic rule failures.

**File:** `apps/web/src/jobs/override-clustering.job.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { createEmbedding } from '@/lib/ai/embeddings';
import { kmeans } from '@/lib/ml/clustering';

interface OverrideCluster {
  id: string;
  centroid: number[];
  events: string[];  // AssuranceEvent IDs

  // Cluster metadata
  commonRuleId: string | null;
  commonOverrideReason: string | null;
  frequency: number;

  // Confidence metrics
  silhouetteScore: number;  // Cluster cohesion (0-1)
  actionRate: number;       // % of similar events where users agreed
}

export async function runOverrideClustering(): Promise<OverrideCluster[]> {
  // 1. Fetch recent override events (last 30 days)
  const overrides = await prisma.assuranceEvent.findMany({
    where: {
      humanOverride: true,
      createdAt: { gte: subDays(new Date(), 30) },
    },
    include: { feedback: true },
    take: 10_000,  // Batch limit
  });

  // 2. Generate embeddings for each override context
  const embeddings = await Promise.all(
    overrides.map(async (event) => {
      const text = JSON.stringify({
        inputContext: event.inputContextSnapshot,
        aiRecommendation: event.aiRecommendation,
        overrideReason: event.overrideReason,
      });
      return createEmbedding(text);
    })
  );

  // 3. Cluster using k-means (k = sqrt(n/2) heuristic)
  const k = Math.max(5, Math.floor(Math.sqrt(overrides.length / 2)));
  const clusters = kmeans(embeddings, k);

  // 4. Analyze each cluster for patterns
  // 5. Store clusters for review
  return clusters;
}

// Schedule: Run daily at 3 AM
// cron: 0 3 * * *
```

**Deliverables:**
- [ ] Embedding generation for override contexts
- [ ] K-means clustering implementation
- [ ] Cluster storage and visualization
- [ ] Daily job scheduling (cron)

#### 8.2 The 'Human' Gate: Rule Promotion Workflow
**Goal:** High-confidence patterns draft rules, but humans approve before merging.

**File:** `apps/web/src/services/rule-promotion.service.ts`

```typescript
export class RulePromotionService {
  /**
   * Analyze a cluster and propose a rule if confidence is high enough
   * Creates a PR that requires Clinical Review approval before merging
   */
  async analyzeClusterForPromotion(clusterId: string): Promise<RuleProposal | null> {
    const cluster = await prisma.overrideCluster.findUnique({ where: { id: clusterId } });

    // Confidence thresholds
    const MIN_FREQUENCY = 50;        // At least 50 events
    const MIN_SILHOUETTE = 0.6;      // Good cluster cohesion
    const MAX_ACTION_RATE = 0.3;     // Users disagree > 70% of time

    if (!meetsThresholds(cluster)) return null;

    // Generate rule proposal
    const proposal = await this.generateRuleFromCluster(cluster);

    // Create GitHub PR with clinical-review-required label
    const prUrl = await this.createReviewPR(proposal);

    return { ...proposal, prUrl, status: 'pending_review' };
  }

  /**
   * Handle PR approval (webhook from GitHub)
   * Only clinicians with clinical-reviewer role can approve
   */
  async handlePRApproval(prNumber: number, approver: string): Promise<void> {
    const hasPermission = await this.verifyClinicianApprover(approver);
    if (!hasPermission) {
      throw new Error('Approver lacks clinical review permissions');
    }

    // Mark approved - merge triggers deployment
    await prisma.ruleProposal.update({
      where: { prNumber },
      data: { status: 'approved', reviewedBy: approver },
    });
  }
}
```

**Deliverables:**
- [ ] Rule proposal generation from clusters
- [ ] GitHub PR creation with clinical review workflow
- [ ] Approval webhook handler
- [ ] Clinician permission verification
- [ ] Deployment pipeline integration

#### 8.3 Metric: Action Rate (Not Just Accuracy)
**Goal:** Measure "did they listen?" not just "were we right?"

**Background:**
Traditional accuracy metrics (precision, recall) are misleading for clinical AI:
- A 99% accurate system that clinicians ignore is useless
- A 70% accurate system that clinicians trust and verify is valuable

**Action Rate** measures: *Of all recommendations shown, what % did users act on?*

```typescript
interface ActionRateMetrics {
  actionRate: number;  // (accepted + modified) / total
  accepted: number;    // Used recommendation as-is
  modified: number;    // Used with minor changes
  overridden: number;  // Rejected completely
  ignored: number;     // No decision recorded
}
```

**Deliverables:**
- [ ] Action Rate calculation service
- [ ] Dashboard widget showing action rate trends
- [ ] Alerts when action rate drops below threshold
- [ ] A/B testing framework for rule changes

### Success Metrics - Phase 8

| Metric | Target | Measurement |
|--------|--------|-------------|
| Override Clusters Identified | > 20/month | Clustering job |
| Rule Proposals Generated | > 5/month | Proposal count |
| Rule Approval Rate | > 60% | PR merge rate |
| Action Rate Improvement | +5% per quarter | Telemetry |
| Time from Pattern to Rule | < 2 weeks | Workflow tracking |

---

## Phase 9: The 'Safety-First' Scribe

### Strategic Goal
**Own the encounter without crashing the hardware or violating LGPD.**

Clinical transcription is high-value (doctors save 2+ hours/day) but high-risk:
- **Hardware risk:** Transcription is CPU/RAM intensive. Crashing the EHR = patient safety issue.
- **Privacy risk:** Audio contains PHI. LGPD Article 20 requires explicit consent and secure processing.

### Context
Brazilian hospital workstations are typically:
- 4-8 GB RAM
- Intel i5 (4-6 cores)
- Running Tasy/MV Soul + multiple browser tabs
- No GPU acceleration

### Technical Strategy

#### 9.1 Resource Guard: System Protection
**Goal:** Never degrade host system performance by more than 1%.

**File:** `apps/sidecar/src/main/resource-guard.ts`

```typescript
export class ResourceGuard extends EventEmitter {
  private config = {
    cpuThreshold: 70,      // 70% CPU triggers throttle
    memoryThreshold: 70,   // 70% RAM triggers throttle
    checkIntervalMs: 1000,
    cooldownMs: 30000,
  };

  canRunLocalTranscription(): boolean {
    return !this.isThrottled && this.availableMemoryMB > 2048;
  }
}

// Integration with transcription service
export class AdaptiveTranscriptionService {
  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    if (this.resourceGuard.canRunLocalTranscription()) {
      return await this.localWhisper.transcribe(audioBuffer);
    }
    // System overloaded - fallback to cloud
    return await this.cloudTranscription.transcribe(audioBuffer);
  }
}
```

**Key Behavior:**
- Monitor CPU and RAM every second
- If load > 70%, disable local transcription
- Automatically fallback to Cloud transcription
- Resume local when resources recover

**Deliverables:**
- [ ] Resource monitoring service (CPU, RAM)
- [ ] Automatic cloud fallback when load > 70%
- [ ] UI indicator showing transcription mode
- [ ] Performance logging for analysis

#### 9.2 Privacy by Design: Ephemeral Processing
**Goal:** Audio is processed in RAM, never saved to disk.

**LGPD Compliance:**
- Article 6: Data minimization principle
- Article 46: Security measures for processing
- Audio containing PHI must not persist beyond immediate use

**File:** `apps/sidecar/src/audio/ephemeral-processor.ts`

```typescript
export class EphemeralAudioProcessor {
  private audioBuffer: Buffer | null = null;
  private encryptionKey: Buffer;

  // Store audio encrypted in memory only
  async store(audioStream: Readable): Promise<string> {
    // Encrypt in RAM with session key
    // Never write to disk
    // Auto-wipe after 60 seconds
  }

  // Secure wipe: overwrite with random data then zeros
  wipe(): void {
    if (this.audioBuffer) {
      crypto.randomFillSync(this.audioBuffer);
      this.audioBuffer.fill(0);
      this.audioBuffer = null;
    }
  }
}

// CRITICAL: Zero disk writes for audio
// Enforced by:
// 1. No fs.writeFile in audio pipeline
// 2. Electron temp path never used for audio
// 3. Audit log tracks disk write attempts
```

**Deliverables:**
- [ ] In-memory encrypted audio buffer
- [ ] Automatic wipe after processing
- [ ] Zero disk writes for audio (verified by audit)
- [ ] LGPD compliance documentation

### Success Metrics - Phase 9

| Metric | Target | Measurement |
|--------|--------|-------------|
| Host CPU Impact | < 1% (idle) | Resource monitoring |
| Host RAM Impact | < 100MB | Resource monitoring |
| Cloud Fallback Rate | < 5% | Transcription logs |
| Audio Disk Writes | 0 | Security audit |
| Transcription Latency | < 3s | End-to-end timing |

---

## Phase 10: The Watchtower

### Strategic Goal
**Know about a crash before the client calls.**

In enterprise software, the worst scenario is:
1. Your product crashes
2. Client discovers it 2 hours later
3. Client calls support
4. Support escalates to engineering
5. Engineering asks "what logs do you have?"
6. Client: "I don't know how to get logs"

This phase builds proactive observability: we know about issues before the client does.

### Technical Strategy

#### 10.1 Edge Telemetry Service
**Goal:** Batch and send error logs/heartbeats from Edge Node to Cloud.

**File:** `apps/edge/src/telemetry/telemetry-service.ts`

```typescript
export class TelemetryService {
  private queue: TelemetryEvent[] = [];
  private batchIntervalMs = 60_000;  // 1 minute batches

  // Track errors with full context
  trackError(error: Error, context: Partial<TelemetryEvent>): void {
    this.queue.push({
      type: 'error',
      errorCode: error.name,
      errorMessage: error.message,
      stackTrace: error.stack,
      timestamp: new Date(),
      ...context,
    });
  }

  // Heartbeat every 5 minutes
  private startHeartbeat(): void {
    setInterval(() => {
      this.track({ type: 'heartbeat', source: 'edge' });
    }, 5 * 60 * 1000);
  }

  // Batch compress and send
  async flush(): Promise<void> {
    const compressed = lz4.compress(JSON.stringify(this.queue));
    await fetch(`${cloudEndpoint}/telemetry/ingest`, {
      method: 'POST',
      headers: { 'Content-Encoding': 'lz4' },
      body: compressed,
    });
  }
}
```

**Deliverables:**
- [ ] Edge telemetry service with batching
- [ ] LZ4 compression for bandwidth efficiency
- [ ] Retry queue for failed sends
- [ ] Heartbeat every 5 minutes

#### 10.2 Cloud Telemetry Ingestion
**File:** `apps/web/src/app/api/telemetry/ingest/route.ts`

```typescript
export async function POST(request: NextRequest): Promise<NextResponse> {
  const events = decompressAndParse(request);

  // Store events
  await prisma.telemetryEvent.createMany({ data: events });

  // Check for critical errors - alert immediately
  const critical = events.filter(e => isCriticalError(e.errorCode));
  if (critical.length > 0) {
    await alertOnCriticalError(clinicId, critical);
  }

  return NextResponse.json({ received: events.length });
}

function isCriticalError(code: string): boolean {
  return ['DATABASE_CONNECTION_FAILED', 'RULE_ENGINE_CRASH',
          'SIDECAR_UNRESPONSIVE', 'OUT_OF_MEMORY'].includes(code);
}
```

#### 10.3 Alert Triggers

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Missing heartbeat | 15 minutes | PagerDuty alert |
| Error rate spike | > 5% in 5 min | Slack notification |
| Critical error | Immediate | PagerDuty + Slack |
| Disk usage | > 90% | Warning email |

**Deliverables:**
- [ ] Cloud ingestion endpoint
- [ ] Missing heartbeat detection job
- [ ] Critical error alerting (PagerDuty/Slack)
- [ ] Admin monitoring dashboard

### Success Metrics - Phase 10

| Metric | Target | Measurement |
|--------|--------|-------------|
| Error Detection Time | < 5 minutes | Alert latency |
| Heartbeat Coverage | 100% of Edge nodes | Monitoring |
| False Positive Alerts | < 1/week | Alert review |
| MTTR (Mean Time to Resolution) | < 2 hours | Incident tracking |
| Proactive vs Reactive Issues | > 80% proactive | Support ticket analysis |

---

## Implementation Timeline

| Phase | Duration | Dependencies | Team |
|-------|----------|--------------|------|
| **Phase 7** | 3 weeks | EV Certificate procurement | DevOps + Security |
| **Phase 8** | 6 weeks | Phase 1 RLHF data | ML + Backend |
| **Phase 9** | 4 weeks | Sidecar audio pipeline | Electron + ML |
| **Phase 10** | 3 weeks | Edge Node deployed | Backend + DevOps |

**Recommended Order:**
1. **Phase 10** (Watchtower) - Start immediately, enables monitoring for other phases
2. **Phase 7** (Trusted Partner) - Critical for distribution
3. **Phase 9** (Scribe) - High user value
4. **Phase 8** (Flywheel) - Requires data accumulation

---

## Risk Register

| Risk | Phase | Mitigation |
|------|-------|------------|
| EV Certificate delays | 7 | Start procurement now (2-4 week lead time) |
| Hospital firewall blocks telemetry | 10 | Use HTTPS/443, same as rule updates |
| Clustering produces noise | 8 | Set high confidence thresholds, manual review |
| Local transcription too slow | 9 | Cloud fallback is always available |
| GitHub webhook fails | 8 | Manual approval fallback, retry queue |

---

## Success Criteria (Overall)

| Metric | Current | Phase 7-10 Target |
|--------|---------|-------------------|
| Deployment Time | Manual | < 1 hour (500 workstations) |
| SmartScreen Warnings | Unknown | 0 |
| Action Rate | N/A | > 70% |
| Host Performance Impact | N/A | < 1% |
| Proactive Issue Detection | 0% | > 80% |
| Time to Rule Deployment | N/A | < 2 weeks |

---

## Appendix A: Key File Locations

| Component | File Path |
|-----------|-----------|
| Electron Builder Config | `apps/sidecar/electron-builder.yml` |
| Auto Updater | `apps/sidecar/src/main/auto-updater.ts` |
| Resource Guard | `apps/sidecar/src/main/resource-guard.ts` |
| Ephemeral Processor | `apps/sidecar/src/audio/ephemeral-processor.ts` |
| Cluster Engine | `apps/web/src/jobs/override-clustering.job.ts` |
| Rule Promotion | `apps/web/src/services/rule-promotion.service.ts` |
| Telemetry Service | `apps/edge/src/telemetry/telemetry-service.ts` |
| Telemetry Ingestion | `apps/web/src/app/api/telemetry/ingest/route.ts` |

---

## Appendix B: External Dependencies

| Dependency | Purpose | Cost Estimate |
|------------|---------|---------------|
| DigiCert EV Certificate | Code signing | $400/year |
| AWS S3 + CloudFront | Update hosting | ~$50/month |
| PagerDuty | Alerting | $20/user/month |
| OpenAI Embeddings API | Clustering | ~$100/month |

---

*Document prepared as the Strategic Constitution for the Clinical Assurance Platform.*
*All future development must align with the Safe Scale principles defined herein.*

**Document Version:** 2.0.0
**Last Updated:** January 29, 2026
**Next Review:** April 2026
**Status:** Ready for Antigravity Handoff
