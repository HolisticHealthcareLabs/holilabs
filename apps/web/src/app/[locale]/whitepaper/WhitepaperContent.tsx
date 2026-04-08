'use client';

import { useEffect } from 'react';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Newsreader:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --bg: #fafaf9;
    --bg-white: #ffffff;
    --bg-warm: #f5f4f0;
    --bg-code: #f0efeb;
    --bg-dark: #1a1a1a;
    --bg-dark-card: #242424;
    --accent: #2d6a4f;
    --accent-light: #40916c;
    --accent-bg: rgba(45,106,79,0.06);
    --accent-border: rgba(45,106,79,0.15);
    --red: #c1292e;
    --amber: #b07d1e;
    --text: #1a1a1a;
    --text-2: #4a4a4a;
    --text-3: #7a7a7a;
    --text-inv: #f5f4f0;
    --border: #e5e3de;
    --border-strong: #d0cec8;
    --radius: 8px;
  }

  .wp-root * { margin: 0; padding: 0; box-sizing: border-box; }

  .wp-root {
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 16px;
    line-height: 1.75;
    -webkit-font-smoothing: antialiased;
  }

  @media print {
    .wp-root { font-size: 11pt; }
    .wp-root .toc-sidebar, .wp-root .progress-line, .wp-root .scroll-top { display: none !important; }
    .wp-root .hero-section { page-break-after: always; }
    .wp-root section { page-break-inside: avoid; }
  }

  /* PROGRESS */
  .wp-root .progress-line {
    position: fixed; top: 0; left: 0; height: 2px;
    background: var(--accent); z-index: 1000;
    width: 0%; transition: width 0.05s linear;
  }

  /* TOC SIDEBAR */
  .wp-root .toc-sidebar {
    position: fixed; left: 0; top: 0; width: 260px;
    height: 100vh; background: var(--bg-white);
    border-right: 1px solid var(--border);
    padding: 32px 0; overflow-y: auto; z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  .wp-root .toc-sidebar.open { transform: translateX(0); }
  .wp-root .toc-brand {
    padding: 0 24px 24px; border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
  }
  .wp-root .toc-brand-name {
    font-weight: 700; font-size: 15px; color: var(--text);
    letter-spacing: -0.3px;
  }
  .wp-root .toc-brand-sub { font-size: 12px; color: var(--text-3); margin-top: 2px; }
  .wp-root .toc-section-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1.5px; color: var(--text-3);
    padding: 12px 24px 4px;
  }
  .wp-root .toc-link {
    display: block; padding: 6px 24px; font-size: 13px;
    color: var(--text-2); text-decoration: none;
    border-left: 2px solid transparent;
    transition: all 0.15s;
  }
  .wp-root .toc-link:hover { color: var(--text); background: var(--bg-warm); }
  .wp-root .toc-link.active { color: var(--accent); border-left-color: var(--accent); background: var(--accent-bg); }

  .wp-root .toc-toggle {
    position: fixed; top: 16px; left: 16px; z-index: 101;
    width: 36px; height: 36px; border-radius: 8px;
    background: var(--bg-white); border: 1px solid var(--border);
    cursor: pointer; display: flex; align-items: center;
    justify-content: center; font-size: 16px; color: var(--text-2);
    transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .wp-root .toc-toggle:hover { border-color: var(--accent); color: var(--accent); }

  /* SCROLL TO TOP */
  .wp-root .scroll-top {
    position: fixed; bottom: 24px; right: 24px; z-index: 100;
    width: 40px; height: 40px; border-radius: 50%;
    background: var(--bg-white); border: 1px solid var(--border);
    cursor: pointer; font-size: 18px; color: var(--text-3);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.3s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .wp-root .scroll-top.visible { opacity: 1; }
  .wp-root .scroll-top:hover { border-color: var(--accent); color: var(--accent); }

  /* DOCUMENT BODY */
  .wp-root .document { max-width: 720px; margin: 0 auto; padding: 0 32px; }

  /* HERO */
  .wp-root .hero-section {
    padding: 120px 32px 80px; text-align: center;
    max-width: 720px; margin: 0 auto;
  }
  .wp-root .hero-version {
    display: inline-block; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 1.5px;
    color: var(--accent); border: 1px solid var(--accent-border);
    padding: 4px 14px; border-radius: 100px; margin-bottom: 32px;
  }
  .wp-root .hero-title {
    font-family: 'Newsreader', Georgia, serif;
    font-size: clamp(36px, 5vw, 52px); font-weight: 700;
    line-height: 1.15; color: var(--text);
    letter-spacing: -0.5px; margin-bottom: 20px;
  }
  .wp-root .hero-subtitle {
    font-size: 18px; color: var(--text-2);
    line-height: 1.7; font-weight: 400;
    max-width: 560px; margin: 0 auto 40px;
  }
  .wp-root .hero-meta {
    display: flex; gap: 24px; justify-content: center;
    flex-wrap: wrap; font-size: 12px; color: var(--text-3);
    font-weight: 500;
  }
  .wp-root .hero-meta span { display: flex; align-items: center; gap: 6px; }
  .wp-root .hero-meta .dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--accent);
  }
  .wp-root .hero-rule {
    width: 48px; height: 1px; background: var(--border-strong);
    margin: 60px auto 0;
  }

  /* SECTION */
  .wp-root section { padding: 64px 0; }
  .wp-root section + section { border-top: 1px solid var(--border); }

  .wp-root .section-number {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; font-weight: 500; color: var(--text-3);
    margin-bottom: 8px; letter-spacing: 0.5px;
  }
  .wp-root h2 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 32px; font-weight: 700; line-height: 1.25;
    color: var(--text); margin-bottom: 20px;
    letter-spacing: -0.3px;
  }
  .wp-root h3 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 22px; font-weight: 600; line-height: 1.35;
    color: var(--text); margin-top: 40px; margin-bottom: 12px;
  }
  .wp-root h4 {
    font-size: 13px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1px; color: var(--accent); margin-bottom: 16px;
  }
  .wp-root p { color: var(--text-2); margin-bottom: 16px; }
  .wp-root p strong { color: var(--text); font-weight: 600; }
  .wp-root .lead {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 20px; line-height: 1.7; color: var(--text-2);
    font-weight: 400;
  }

  /* PULLQUOTE */
  .wp-root .pullquote {
    margin: 40px 0; padding: 0 0 0 24px;
    border-left: 2px solid var(--accent);
  }
  .wp-root .pullquote p {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 22px; font-style: italic;
    color: var(--text); line-height: 1.6;
    margin: 0;
  }

  /* STAT STRIP */
  .wp-root .stat-strip {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1px; background: var(--border);
    border: 1px solid var(--border); border-radius: var(--radius);
    overflow: hidden; margin: 32px 0;
  }
  .wp-root .stat-strip-item {
    background: var(--bg-white); padding: 24px;
    text-align: center;
  }
  .wp-root .stat-strip-val {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 32px; font-weight: 700; color: var(--text);
    line-height: 1;
  }
  .wp-root .stat-strip-label {
    font-size: 11px; color: var(--text-3);
    text-transform: uppercase; letter-spacing: 1px;
    margin-top: 6px;
  }

  /* CARDS */
  .wp-root .card-row {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px; margin: 32px 0;
  }
  .wp-root .card {
    background: var(--bg-white); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 24px;
    transition: border-color 0.2s;
  }
  .wp-root .card:hover { border-color: var(--accent); }
  .wp-root .card-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1.5px; color: var(--text-3); margin-bottom: 8px;
  }
  .wp-root .card h3 { font-size: 17px; margin: 0 0 8px; font-family: 'Inter', sans-serif; font-weight: 600; }
  .wp-root .card p { font-size: 14px; color: var(--text-3); margin: 0; line-height: 1.6; }

  /* DARK BLOCK */
  .wp-root .dark-block {
    background: var(--bg-dark); color: var(--text-inv);
    border-radius: var(--radius); padding: 40px;
    margin: 32px 0;
  }
  .wp-root .dark-block h3 { color: var(--text-inv); margin-top: 0; }
  .wp-root .dark-block p { color: rgba(245,244,240,0.7); }
  .wp-root .dark-block .layer {
    display: flex; align-items: flex-start; gap: 16px;
    padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .wp-root .dark-block .layer:last-child { border-bottom: none; }
  .wp-root .dark-block .layer-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; color: var(--accent-light);
    background: rgba(45,106,79,0.15);
    width: 28px; height: 28px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-weight: 600;
  }
  .wp-root .dark-block .layer-title {
    font-weight: 600; font-size: 15px; color: var(--text-inv);
    margin-bottom: 2px;
  }
  .wp-root .dark-block .layer-desc {
    font-size: 13px; color: rgba(245,244,240,0.55); margin: 0;
    line-height: 1.6;
  }

  /* CALLOUT */
  .wp-root .callout {
    background: var(--accent-bg); border: 1px solid var(--accent-border);
    border-radius: var(--radius); padding: 20px 24px;
    margin: 24px 0; font-size: 14px;
  }
  .wp-root .callout-title {
    font-weight: 700; font-size: 12px; text-transform: uppercase;
    letter-spacing: 1px; color: var(--accent); margin-bottom: 6px;
  }
  .wp-root .callout p { margin: 0; color: var(--text-2); font-size: 14px; line-height: 1.65; }
  .wp-root .callout.warn {
    background: rgba(176,125,30,0.06); border-color: rgba(176,125,30,0.2);
  }
  .wp-root .callout.warn .callout-title { color: var(--amber); }

  /* TABLE */
  .wp-root .doc-table {
    width: 100%; border-collapse: collapse;
    margin: 24px 0; font-size: 14px;
  }
  .wp-root .doc-table th {
    text-align: left; padding: 10px 16px;
    font-size: 11px; text-transform: uppercase;
    letter-spacing: 1px; color: var(--text-3);
    border-bottom: 2px solid var(--border);
    font-weight: 600;
  }
  .wp-root .doc-table td {
    padding: 10px 16px; border-bottom: 1px solid var(--border);
    color: var(--text-2); vertical-align: top;
  }
  .wp-root .doc-table tr:last-child td { border-bottom: none; }
  .wp-root .doc-table .accent { color: var(--accent); font-weight: 600; }

  /* INLINE CODE */
  .wp-root code {
    font-family: 'JetBrains Mono', monospace; font-size: 13px;
    background: var(--bg-code); padding: 2px 6px;
    border-radius: 4px; color: var(--red);
  }

  /* TIMELINE */
  .wp-root .timeline { margin: 32px 0; }
  .wp-root .tl-item {
    display: grid; grid-template-columns: 100px 1fr;
    gap: 24px; padding: 20px 0;
    border-bottom: 1px solid var(--border);
  }
  .wp-root .tl-item:last-child { border-bottom: none; }
  .wp-root .tl-period {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; font-weight: 500; color: var(--accent);
    padding-top: 2px;
  }
  .wp-root .tl-title { font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .wp-root .tl-desc { font-size: 14px; color: var(--text-3); margin: 0; line-height: 1.6; }

  /* FLOW */
  .wp-root .flow-line {
    display: flex; align-items: center; justify-content: center;
    gap: 8px; flex-wrap: wrap; margin: 24px 0; padding: 32px 24px;
    background: var(--bg-white); border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .wp-root .flow-step {
    background: var(--bg-warm); border: 1px solid var(--border);
    border-radius: 6px; padding: 10px 20px;
    font-size: 13px; font-weight: 600; color: var(--text);
  }
  .wp-root .flow-step.highlight { background: var(--accent-bg); border-color: var(--accent-border); color: var(--accent); }
  .wp-root .flow-arr { color: var(--text-3); font-size: 16px; }

  /* TAGS */
  .wp-root .tag-row { display: flex; gap: 6px; flex-wrap: wrap; margin: 16px 0; }
  .wp-root .tag {
    font-size: 11px; font-weight: 600; padding: 3px 10px;
    border-radius: 100px; border: 1px solid var(--border);
    color: var(--text-3);
  }
  .wp-root .tag.green { color: var(--accent); border-color: var(--accent-border); background: var(--accent-bg); }

  /* FOOTER */
  .wp-root .footer {
    text-align: center; padding: 64px 32px;
    border-top: 1px solid var(--border);
    margin-top: 32px;
  }
  .wp-root .footer-brand {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 20px; font-weight: 700; color: var(--text);
    margin-bottom: 8px;
  }
  .wp-root .footer p { font-size: 13px; color: var(--text-3); margin: 0; }
  .wp-root .footer .legal { margin-top: 24px; font-size: 11px; color: var(--text-3); max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.6; }

  /* RESPONSIVE */
  @media (max-width: 640px) {
    .wp-root .hero-section { padding: 80px 20px 60px; }
    .wp-root .document { padding: 0 20px; }
    .wp-root h2 { font-size: 26px; }
    .wp-root .stat-strip { grid-template-columns: repeat(2, 1fr); }
    .wp-root .tl-item { grid-template-columns: 1fr; gap: 4px; }
    .wp-root .dark-block { padding: 24px; }
  }
`;

const BODY_HTML = `
<div class="progress-line" id="progress"></div>

<button class="toc-toggle" id="tocToggle" aria-label="Table of contents">&#9776;</button>

<nav class="toc-sidebar" id="tocSidebar">
  <div class="toc-brand">
    <div class="toc-brand-name">Holi Labs</div>
    <div class="toc-brand-sub">White Paper v1.0 &middot; April 2026</div>
  </div>
  <div class="toc-section-label">Prologue</div>
  <a class="toc-link" href="#abstract">Abstract</a>
  <a class="toc-link" href="#problem">The Problem</a>
  <div class="toc-section-label">Protocol</div>
  <a class="toc-link" href="#vision">Vision</a>
  <a class="toc-link" href="#architecture">Architecture</a>
  <a class="toc-link" href="#safety">Safety Engine</a>
  <a class="toc-link" href="#prevention">Prevention Hub</a>
  <a class="toc-link" href="#governance">Governance Console</a>
  <div class="toc-section-label">Ownership</div>
  <a class="toc-link" href="#sovereignty">Data Sovereignty</a>
  <a class="toc-link" href="#human-promise">The Human Promise</a>
  <a class="toc-link" href="#compliance">Regulatory Framework</a>
  <div class="toc-section-label">Business</div>
  <a class="toc-link" href="#economics">Economics</a>
  <a class="toc-link" href="#competitive">Competitive Landscape</a>
  <a class="toc-link" href="#roadmap">Roadmap</a>
  <a class="toc-link" href="#conclusion">Conclusion</a>
</nav>

<button class="scroll-top" id="scrollTop" aria-label="Back to top">&uarr;</button>

<!-- HERO -->
<header class="hero-section">
  <div class="hero-version">White Paper v1.0 &middot; April 2026</div>
  <h1 class="hero-title">Clinical Safety Infrastructure<br>for Latin America</h1>
  <p class="hero-subtitle">
    We are building the infrastructure for a world where patients truly own their health data,
    clinicians practice medicine instead of managing paperwork, and every clinical decision
    is an act of documented, human trust.
  </p>
  <div class="hero-meta">
    <span><span class="dot"></span> Holi Labs</span>
    <span><span class="dot"></span> FHIR R4 / RNDS</span>
    <span><span class="dot"></span> LGPD Compliant</span>
    <span><span class="dot"></span> ANVISA Class I</span>
  </div>
  <div class="hero-rule"></div>
</header>

<!-- ABSTRACT -->
<div class="document">
<section id="abstract">
  <div class="section-number">01</div>
  <h2>Abstract</h2>
  <p class="lead">
    Latin American healthcare loses over $12 billion annually to adverse drug events, preventable readmissions,
    billing denials, and clinical workflow failures. The root cause is not clinical knowledge but
    workflow reliability in fragmented EHR environments.
  </p>
  <p>
    Cortex is a deterministic clinical safety protocol-layer: infrastructure that validates, documents, and
    governs every clinical decision passing through it. Built natively for LATAM regulatory frameworks (LGPD, ANVISA,
    COFEPRIS), Cortex uses deterministic logic for safety-critical decisions and AI only for documentation and
    context-gathering where hallucination risk is acceptable.
  </p>
  <p>
    This paper presents the architecture of the Cortex protocol, its three integrated engines (Safety, Prevention,
    Governance), the regulatory strategy that enables rapid market entry, and our vision for patient health data
    sovereignty&mdash;a future where patients own, control, and benefit from the data generated by their own bodies.
  </p>

  <div class="stat-strip">
    <div class="stat-strip-item"><div class="stat-strip-val">$12B+</div><div class="stat-strip-label">Annual waste</div></div>
    <div class="stat-strip-item"><div class="stat-strip-val">7 min</div><div class="stat-strip-label">Avg consult</div></div>
    <div class="stat-strip-item"><div class="stat-strip-val">82%</div><div class="stat-strip-label">Loss ratios</div></div>
    <div class="stat-strip-item"><div class="stat-strip-val">70%</div><div class="stat-strip-label">Fragmented records</div></div>
  </div>
</section>

<!-- THE PROBLEM -->
<section id="problem">
  <div class="section-number">02</div>
  <h2>The Problem</h2>
  <p>
    A cardiologist in S&atilde;o Paulo manages 40 patients daily. Lab results arrive three days late.
    Drug formularies change monthly without notification. There are no automated interaction checks.
    Discharge follow-up happens over personal WhatsApp&mdash;or doesn't happen at all.
  </p>
  <p>
    This is not negligence. It is the natural outcome of a system built without safety infrastructure.
    Clinical knowledge is abundant; what's missing is the <strong>reliability layer</strong> that ensures
    that knowledge is applied consistently, at the point of care, every single time.
  </p>

  <div class="card-row">
    <div class="card">
      <div class="card-label">Data</div>
      <h3>Fragmented Records</h3>
      <p>Patient histories scattered across 5+ institutions. No unified longitudinal view. Clinicians make decisions with incomplete information.</p>
    </div>
    <div class="card">
      <div class="card-label">Safety</div>
      <h3>No Guard Rails</h3>
      <p>Drug interactions calculated mentally. Renal dose adjustments estimated. Errors propagate silently through the system.</p>
    </div>
    <div class="card">
      <div class="card-label">Revenue</div>
      <h3>Billing Denials</h3>
      <p>Glosas from coding errors consume billions in administrative overhead. No pre-submission risk scoring exists in most facilities.</p>
    </div>
  </div>

  <p>
    Hospital insurers operate with sinistralidade (loss ratios) at 82&ndash;84%. Every percentage point
    costs millions. And patients have zero visibility into the decisions being made about their care,
    zero control over their data, and zero benefit from its commercial use.
  </p>
</section>

<!-- VISION -->
<section id="vision">
  <div class="section-number">03</div>
  <h2>Vision</h2>

  <div class="pullquote">
    <p>What HTTPS did for web trust, Cortex does for clinical decisions. Every interaction verified,
    every recommendation traceable, every patient in control of their own story.</p>
  </div>

  <p>
    Cortex is not an EHR replacement. It is the trust layer that sits between the clinician
    and the patient record&mdash;invisible when working correctly, indispensable when it catches
    a critical interaction. But the vision is larger than guard rails and audit trails.
  </p>

  <h3>Restoring the Doctor-Patient Relationship</h3>
  <p>
    A physician becomes a doctor to heal. Not to navigate incompatible software, reconcile
    lab results that arrive three days late, or spend the last hour of every shift on documentation.
    Today, the average LATAM clinician spends <strong>40% of their time on administrative tasks</strong>&mdash;time
    stolen from patients. Cortex gives it back. When safety checks are automated, documentation
    is AI-assisted, and billing risk is scored before submission, the clinician can return to
    what they trained for: the relationship. The diagnosis. The judgment call that no rule engine
    can make. The screen stops being the patient.
  </p>

  <h3>Centering the Patient</h3>
  <p>
    In the current system, patients are passive. They give samples, answer questions, receive
    prescriptions, and wait. Their health data is generated by their own bodies, stored in
    institutions they have never visited, used in ways they never consented to, and monetized
    by parties they have never met. We believe this is fundamentally wrong&mdash;and technically
    correctable. Cortex is building toward a world where a patient in S&atilde;o Paulo can see every
    decision ever made about their care, understand every risk score assigned to their health,
    contribute their anonymized data to research they choose to support, and capture real value
    from data their body generates. <strong>Health data sovereignty is not a regulatory checkbox.
    It is a human right.</strong>
  </p>

  <h3>The Systemic Bet</h3>
  <p>
    By 2031, Cortex aims to be the clinical safety standard for Latin American healthcare&mdash;processing
    millions of clinical decisions annually with full auditability. If LATAM insurers reduce sinistralidade
    by just two percentage points through governed workflows, that represents <strong>$2.4 billion in
    annual savings</strong>. Cortex captures 1&ndash;3% of that value. But the compounding prize is larger:
    a federated, patient-consented health data layer that makes LATAM&rsquo;s 640 million people
    active participants in the next generation of medical research&mdash;on their own terms.
  </p>
</section>

<!-- ARCHITECTURE -->
<section id="architecture">
  <div class="section-number">04</div>
  <h2>Architecture</h2>
  <p class="lead">
    Three integrated engines share a common data layer, audit trail, and consent boundary.
    The critical design insight: AI handles documentation. Deterministic rules handle safety.
    The clinician always decides.
  </p>

  <div class="callout">
    <div class="callout-title">Design Principle</div>
    <p>
      <strong>AI is never used for safety-critical decisions.</strong> All prescribing, dosing, and compliance checks
      use deterministic JSON-Logic rules with full provenance metadata. This earns regulatory trust (ANVISA
      classifies deterministic CDS as Class I) and clinician trust (100% auditable, 100% explainable).
    </p>
  </div>

  <div class="dark-block">
    <h3 style="font-family:'Inter',sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(245,244,240,0.5);margin-bottom:20px;">Protocol Stack</h3>
    <div class="layer">
      <div class="layer-num">1</div>
      <div>
        <div class="layer-title">Safety Engine</div>
        <div class="layer-desc">Real-time drug interactions (RxNorm/DCB), renal dose adjustment (eGFR), formulary compliance, billing risk scoring. Deterministic JSON-Logic. Traffic-light alerts (RED / YELLOW / GREEN).</div>
      </div>
    </div>
    <div class="layer">
      <div class="layer-num">2</div>
      <div>
        <div class="layer-title">Prevention Hub</div>
        <div class="layer-desc">Longitudinal care across 7 health domains. 50+ evidence-based protocols (WHO, NHS, ESC, RACGP, USPSTF). AI-powered risk scoring. Automated screening reminders. WebSocket real-time condition detection.</div>
      </div>
    </div>
    <div class="layer">
      <div class="layer-num">3</div>
      <div>
        <div class="layer-title">Governance Console</div>
        <div class="layer-desc">Live validation stream. Global trust score (0&ndash;100). Override pattern detection. Tamper-evident hash-chain audit trail (Bemi/PostgreSQL WAL). Fleet management for multi-site deployments.</div>
      </div>
    </div>
    <div class="layer">
      <div class="layer-num">&darr;</div>
      <div>
        <div class="layer-title">FHIR / RNDS Interoperability Layer</div>
        <div class="layer-desc">Native FHIR R4. Brazil's RNDS national network. Ontology mappings: ICD-10, SNOMED CT, LOINC, RxNorm, DCB (drugs), TUSS (billing). Trilingual: EN / ES / PT.</div>
      </div>
    </div>
  </div>
</section>

<!-- SAFETY -->
<section id="safety">
  <div class="section-number">05</div>
  <h2>Safety Engine</h2>
  <p>
    When a clinician enters a prescription, the Safety Engine evaluates it in real time against a comprehensive
    rule set. Drug-drug interactions via RxNorm and DCB ontologies. Renal dose adjustments calculated from the
    latest eGFR values. Formulary compliance with cost-saving alternatives. Billing risk scoring before claim submission.
  </p>

  <div class="flow-line">
    <div class="flow-step">Prescription</div>
    <div class="flow-arr">&rarr;</div>
    <div class="flow-step highlight">Rule Evaluation</div>
    <div class="flow-arr">&rarr;</div>
    <div class="flow-step highlight">Interaction + Dose Check</div>
    <div class="flow-arr">&rarr;</div>
    <div class="flow-step">Alert + Audit</div>
  </div>

  <p>
    Every alert uses a traffic-light system. <strong style="color:var(--red)">RED</strong> is a hard brake
    (contraindication). <strong style="color:var(--amber)">YELLOW</strong> is a soft warning (review recommended).
    <strong style="color:var(--accent)">GREEN</strong> is safe to proceed. When a clinician overrides, they must
    provide a structured justification that becomes part of the immutable audit trail.
  </p>
  <p>
    Every rule carries full provenance metadata: source authority (WHO, NHS, ESC), evidence tier classification,
    citation URL, and last-reviewed date. No black boxes. No unexplainable recommendations.
  </p>
</section>

<!-- PREVENTION -->
<section id="prevention">
  <div class="section-number">06</div>
  <h2>Prevention Hub</h2>
  <p>
    The Prevention Hub transforms episodic care into longitudinal health management across seven clinical domains:
    Cardiometabolic, Oncology, Musculoskeletal, Neurocognitive, Gut Health, Immune Function, and Hormonal Balance.
  </p>
  <p>
    AI-powered risk scoring (0&ndash;100 per domain) identifies patients drifting toward adverse outcomes before
    symptoms present. Collaborative clinical templates with version control enable multi-provider care coordination.
    When a lab result shifts a patient's risk profile, the responsible clinician is notified immediately via
    WebSocket streaming&mdash;not at the next scheduled visit.
  </p>

  <div class="tag-row">
    <span class="tag green">WHO</span>
    <span class="tag green">NHS</span>
    <span class="tag green">ESC</span>
    <span class="tag green">RACGP</span>
    <span class="tag green">USPSTF</span>
    <span class="tag">50+ Protocols</span>
    <span class="tag">7 Domains</span>
  </div>
</section>

<!-- GOVERNANCE -->
<section id="governance">
  <div class="section-number">07</div>
  <h2>Governance Console</h2>
  <p>
    The Governance Console gives hospital leadership real-time visibility into clinical decision quality.
    A live validation stream shows every clinical decision as it happens. A global trust score (0&ndash;100)
    aggregates safety metrics with trend analysis.
  </p>
  <p>
    Override reason ranking detects concerning patterns&mdash;a department systematically bypassing interaction alerts,
    for instance. Fleet management enables centralized protocol deployment and comparative analytics across facilities.
  </p>

  <h3>Tamper-Evident Audit Trail</h3>
  <p>
    The audit trail uses a hash-chain architecture built on Bemi (PostgreSQL WAL-level auditing). Each entry
    references the cryptographic hash of the previous entry. Any attempt to alter, delete, or reorder records
    is immediately detectable. The chain is retained per LGPD Article 37&mdash;even erasure requests cannot
    remove audit records.
  </p>
</section>

<!-- DATA SOVEREIGNTY -->
<section id="sovereignty">
  <div class="section-number">08</div>
  <h2>Data Sovereignty</h2>

  <div class="pullquote">
    <p>In the current system, hospitals monetize patient data while patients receive nothing.
    Cortex inverts the model: patients are the data custodians, and they decide who benefits.</p>
  </div>

  <h3>The Problem of Invisible Ownership</h3>
  <p>
    When a patient gets a blood draw in Brazil, that data enters a system they cannot see. It may be used
    in a study they were never asked about. It may be shared with a pharmaceutical company they will never
    know about. It may inform a risk score that affects their insurance premium. This is not a bug in
    health IT. This is the design of every current system in LATAM. The patient is the source;
    the institution is the owner. Cortex inverts this relationship entirely.
  </p>

  <h3>Granular Consent</h3>
  <p>
    Consent in health IT today is binary: you sign a form and lose control of your data. Cortex implements
    three distinct consent types that can never be collapsed into a single checkbox:
    <strong>Service</strong> (clinical care), <strong>Research</strong> (anonymized data for studies),
    and <strong>Marketing</strong> (health communications). Each is independently grantable, time-bounded,
    and revocable. A patient can consent to sharing their cardiogram with their cardiologist but not their
    insurer. They can approve their data for a specific diabetes study but revoke it if the study
    parameters change. Every access is logged. Every grant is auditable. Consent is not a legal fiction.
    It is lived, verifiable, and real.
  </p>

  <h3>The Health Identity</h3>
  <p>
    Today, a patient&rsquo;s health record is fragmented across institutions. Move from Medell&iacute;n to
    Monterrey and your cardiologist&rsquo;s notes stay behind. Your eGFR, allergy list, surgical
    history&mdash;all stranded. You must reconstruct your medical history from memory for every new provider,
    as if you are a new patient, even though you are not.
  </p>
  <p>
    Cortex&rsquo;s FHIR R4 architecture enables a portable, longitudinal, cryptographically verified health
    identity that follows the person, not the institution. When a patient moves between cities or countries,
    their cardiologist&rsquo;s notes, their latest eGFR, their allergy list, and their current medications
    move with them&mdash;not as a PDF export, but as a live, structured, interoperable data stream.
    <strong>The health identity belongs to the person, not the provider.</strong>
  </p>

  <h3>The Ownership Model</h3>
  <p>
    Under Cortex, patients retain cryptographic ownership of their health data. All patient data is encrypted
    with patient-controlled keys. An anonymization proxy (Microsoft Presidio) strips PII before any data
    leaves the consent boundary. Consent contracts enforce terms automatically&mdash;when a grant expires,
    access revokes without manual intervention. A patient can, at any time, see every entity that holds
    access to their data and revoke it without legal friction. This is not a feature request to existing
    EHRs. It is a fundamental architectural commitment.
  </p>

  <h3>Economic Participation</h3>
  <p>
    The pharmaceutical industry spends $50 billion annually on clinical trials. The bottleneck is not
    money&mdash;it is consented, structured, longitudinal patient data. A diabetic patient in Bras&iacute;lia
    whose continuous glucose monitor data contributes to an insulin resistance study should not be invisible
    to the benefit chain. Should not be uncompensated, untracked, and unrecognized.
  </p>
  <p>
    As the platform scales, we are building toward a patient-controlled data marketplace where patients
    contribute anonymized health data to research studies and pharmaceutical trials on their own terms.
    This is not tokenomics. It is data ownership economics: patients generate the data, patients set the
    terms, patients capture the value. With Cortex&rsquo;s consent framework, they are named&mdash;if
    pseudonymous&mdash;participants in the knowledge economy of their own health.
  </p>

  <div class="flow-line">
    <div class="flow-step highlight">Patient Owns</div>
    <div class="flow-arr">&rarr;</div>
    <div class="flow-step">Consent + Anonymize</div>
    <div class="flow-arr">&rarr;</div>
    <div class="flow-step">Research Access</div>
    <div class="flow-arr">&rarr;</div>
    <div class="flow-step highlight">Value Returns</div>
  </div>

  <div class="callout">
    <div class="callout-title">The Sovereignty Principle</div>
    <p>
      Every architectural decision in Cortex&mdash;where we store data, how we encrypt it, who holds the
      keys, what audit trails we keep, how quickly we revoke access&mdash;is a downstream consequence of
      a single upstream conviction: <strong>health data belongs to the person whose body generated it.</strong>
    </p>
  </div>
</section>

<!-- THE HUMAN PROMISE -->
<section id="human-promise">
  <div class="section-number">09</div>
  <h2>The Human Promise</h2>
  <p>
    Infrastructure is only meaningful if it changes the human experience at the point of care.
    Cortex is not built to optimize uptime. It is built to restore the moment when a doctor
    can look at a patient and think about care, not compliance. When a patient can leave a
    healthcare interaction understanding their own health.
  </p>

  <h3>For the Clinician</h3>
  <p>
    The experience of a doctor using Cortex is immediate. The interaction check fires before harm,
    not after. The discharge note writes itself from the structured care plan, not from a six-minute
    typing session at the end of an already-full day. The billing flag catches the glosa before
    submission&mdash;before the claim is rejected, before the administrative back-and-forth begins.
    They look up from the screen. They have time. Time to sit with a patient and explain a diagnosis
    without an eye on the clock. Time to answer a question that is not in the protocol. Time to make
    the judgment call that no algorithm can replace. The screen stops being the patient.
  </p>

  <h3>For the Patient</h3>
  <p>
    The patient receives a WhatsApp message the day after discharge. Not to sell them something.
    Because their cardiologist&rsquo;s protocol says day-1 follow-up matters, and the protocol is
    embedded in the workflow automatically. They open their health summary and see their own risk
    trajectory for the first time&mdash;not as a black box, but as an explainable, human-readable
    statement: their glucose trend, their ejection fraction, their next recommended screening.
    They are not a passive recipient. They are a participant in their own care. They leave not just
    with a prescription but with understanding.
  </p>

  <div class="pullquote">
    <p>The measure of success is not uptime or audit coverage. It is whether a doctor
    can look their patient in the eye&mdash;and whether a patient leaves understanding
    their own health.</p>
  </div>
</section>

<!-- COMPLIANCE -->
<section id="compliance">
  <div class="section-number">10</div>
  <h2>Regulatory Framework</h2>
  <p>
    Cortex treats regulation as a competitive moat, not an obstacle. The architecture was designed for
    compliance from the first commit&mdash;not retrofitted after launch.
  </p>

  <h3>LGPD (Brazil)</h3>
  <p>
    Granular consent management. Right to Be Forgotten with audited erasure workflows. Data minimization
    at the API level. Cross-border transfers compliant with Article 33. Anonymization proxy for all external
    AI providers.
  </p>

  <h3>ANVISA RDC 657/2022</h3>
  <p>
    By using deterministic JSON-Logic rules for all safety-critical decisions, Cortex qualifies as
    <strong>Class I Clinical Decision Support</strong> under Brazilian regulations. This avoids the SaMD
    classification that would require multi-year clinical trials. All marketing copy is audited to ensure
    no diagnose/detect/prevent/treat language that could trigger reclassification.
  </p>

  <h3>HIPAA (US Expansion)</h3>
  <p>
    Session security with 15-minute idle timeout and 8-hour absolute expiry. Encrypted PHI with versioned
    keys. BAA framework ready. De-identification workflows via Presidio.
  </p>

  <div class="callout warn">
    <div class="callout-title">Explainability Guarantee</div>
    <p>
      All high-stakes risk scores return contributing factors. No black-box AI on safety-critical paths.
      Every recommendation traces to a clinical source authority with full provenance metadata.
    </p>
  </div>
</section>

<!-- ECONOMICS -->
<section id="economics">
  <div class="section-number">11</div>
  <h2>Protocol Economics</h2>
  <p class="lead">
    A Y-split strategy: Cortex Clinic (SMB SaaS) generates immediate cash flow while Cortex Enterprise
    captures high-value contracts with hospital systems and insurers.
  </p>

  <div class="card-row" style="grid-template-columns: 1fr 1fr;">
    <div class="card">
      <div class="card-label">Track A</div>
      <h3>Cortex Clinic</h3>
      <p>2&ndash;10 doctor private clinics. $25&ndash;$75/practitioner/month. 3-month sales cycle. Gross margin: 78&ndash;83%.</p>
    </div>
    <div class="card">
      <div class="card-label">Track B</div>
      <h3>Cortex Enterprise</h3>
      <p>Hospital systems and insurers. $500+/user/month. 9&ndash;18 month sales cycle. Gross margin: 85%+.</p>
    </div>
  </div>

  <div class="stat-strip">
    <div class="stat-strip-item"><div class="stat-strip-val">9:1</div><div class="stat-strip-label">LTV:CAC</div></div>
    <div class="stat-strip-item"><div class="stat-strip-val">83.8%</div><div class="stat-strip-label">Gross margin</div></div>
    <div class="stat-strip-item"><div class="stat-strip-val">5.3 mo</div><div class="stat-strip-label">CAC payback</div></div>
    <div class="stat-strip-item"><div class="stat-strip-val">$2,700</div><div class="stat-strip-label">LTV (36 mo)</div></div>
  </div>

  <h3>Market Opportunity</h3>
  <table class="doc-table">
    <tr><th>Segment</th><th>Size</th><th>Note</th></tr>
    <tr><td>TAM &mdash; LATAM Health IT</td><td><strong>$18B</strong></td><td>by 2028</td></tr>
    <tr><td>SAM &mdash; CDS + Governance + Prevention</td><td><strong>$3.2B</strong></td><td>&mdash;</td></tr>
    <tr><td>SOM &mdash; Pilot countries (Yr 1&ndash;3)</td><td><strong>$480M</strong></td><td>3,000 practitioners</td></tr>
  </table>
  <p>
    Break-even at 27 clinics (R$2,500/month). Bear case: 40 clinics, break-even Q1 2028.
    Brazil has 350,000+ physician practices. 1% capture in three years at R$2,500/month = R$105M ARR.
  </p>
</section>

<!-- COMPETITIVE -->
<section id="competitive">
  <div class="section-number">12</div>
  <h2>Competitive Landscape</h2>
  <p>
    Cortex builds four compounding moats: regulatory compliance barrier (12&ndash;18 months for competitors to replicate),
    clinical data network effects, deterministic trust architecture, and WhatsApp-native patient engagement.
  </p>

  <table class="doc-table">
    <tr><th>Dimension</th><th>Legacy EHR</th><th>LATAM Point Solutions</th><th>Cortex</th></tr>
    <tr><td>LGPD Compliance</td><td>Retrofitted</td><td>Partial</td><td class="accent">Native</td></tr>
    <tr><td>Clinical Safety</td><td>US-centric rules</td><td>Narrow</td><td class="accent">Full-stack CDS</td></tr>
    <tr><td>Deployment</td><td>18+ months</td><td>3&ndash;6 months</td><td class="accent">Weeks</td></tr>
    <tr><td>Cost per User</td><td>$500&ndash;$1,000/mo</td><td>$100&ndash;$300/mo</td><td class="accent">$25&ndash;$75/mo</td></tr>
    <tr><td>Patient Channel</td><td>Portal (low adoption)</td><td>None</td><td class="accent">WhatsApp</td></tr>
    <tr><td>Audit Trail</td><td>Basic logging</td><td>None</td><td class="accent">Hash-chain immutable</td></tr>
    <tr><td>Data Ownership</td><td>Institution</td><td>Institution</td><td class="accent">Patient</td></tr>
    <tr><td>Languages</td><td>English</td><td>PT or ES</td><td class="accent">EN / ES / PT</td></tr>
  </table>
</section>

<!-- ROADMAP -->
<section id="roadmap">
  <div class="section-number">13</div>
  <h2>Roadmap</h2>

  <div class="timeline">
    <div class="tl-item">
      <div class="tl-period">H1 2026</div>
      <div>
        <div class="tl-title">Clinical Safety Foundation</div>
        <div class="tl-desc">
          Cortex Clinic launch. Inpatient cardiology wedge (DOAC safety + discharge follow-up).
          Bolivia pilot. 50 practitioners. $5K MRR. Johns Hopkins research partnership active.
        </div>
      </div>
    </div>
    <div class="tl-item">
      <div class="tl-period">H2 2026</div>
      <div>
        <div class="tl-title">Prevention + Brazil Expansion</div>
        <div class="tl-desc">
          Prevention Hub with 7 health domains. Brazil Wave 2. RNDS integration certified.
          200 practitioners. $19.9K MRR. First enterprise pilot.
        </div>
      </div>
    </div>
    <div class="tl-item">
      <div class="tl-period">H1 2027</div>
      <div>
        <div class="tl-title">Governance + Argentina</div>
        <div class="tl-desc">
          Full Governance Console with fleet management. Argentina Wave 3.
          600 practitioners. $55K MRR. Enterprise contracts signed.
        </div>
      </div>
    </div>
    <div class="tl-item">
      <div class="tl-period">H2 2027+</div>
      <div>
        <div class="tl-title">Data Sovereignty Layer</div>
        <div class="tl-desc">
          Patient-controlled data marketplace. 1,500 practitioners.
          $107.5K MRR ($1.29M ARR). Self-sustaining unit economics.
        </div>
      </div>
    </div>
  </div>
</section>

<!-- CONCLUSION -->
<section id="conclusion">
  <div class="section-number">14</div>
  <h2>Conclusion</h2>
  <p class="lead">
    Latin America stands at an inflection point. LGPD enforcement is accelerating. ANVISA&rsquo;s CDS framework
    creates compliance demand. WhatsApp saturation means 96% of the population is already on the coordination
    platform. AI cost collapse makes intelligent documentation affordable for clinics of any size.
    The conditions for transformation are in place.
  </p>
  <p>
    Cortex is purpose-built for this moment. A clinical safety protocol-layer that is deterministic where it
    matters, intelligent where it helps, and governed throughout. Every prescription checked. Every protocol
    auditable. Every patient in control of their data.
  </p>
  <p>
    But infrastructure is not the destination. It is the foundation. What gets built on top&mdash;when
    640 million people in Latin America can see their own health trajectories, when a clinician in
    Cochabamba has the same safety infrastructure as one in Boston, when a patient&rsquo;s anonymized
    data funds the research that saves their grandchildren&mdash;that is the destination.
  </p>
  <p class="lead">
    We are building the moment when the doctor looks up from the screen and back at the patient.
    When the patient leaves not just with a prescription but with understanding.
    When every clinical interaction is an act of verified, documented, mutual trust.
  </p>

  <div class="pullquote" style="margin-top:40px;">
    <p>We are not building another EHR. We are building the infrastructure for a healthcare system
    worthy of the people it serves.</p>
  </div>
</section>
</div>

<!-- FOOTER -->
<footer class="footer">
  <div class="footer-brand">Holi Labs</div>
  <p>holilabs.xyz &nbsp;&middot;&nbsp; nicola@holilabs.xyz</p>
  <div class="legal">
    Cortex Protocol White Paper v1.0 &middot; April 2026<br>
    Confidential. This document does not constitute medical advice, a securities offering, or a guarantee
    of regulatory approval. Cortex is classified as Class I Clinical Decision Support under ANVISA RDC 657/2022.
  </div>
</footer>
`;

export default function WhitepaperContent() {
  useEffect(() => {
    const tocToggleBtn = document.getElementById('tocToggle');
    const tocSidebar = document.getElementById('tocSidebar');
    if (tocToggleBtn && tocSidebar) {
      const handleToggle = () => tocSidebar.classList.toggle('open');
      tocToggleBtn.addEventListener('click', handleToggle);
    }

    const scrollTopBtn = document.getElementById('scrollTop');
    if (scrollTopBtn) {
      scrollTopBtn.addEventListener('click', () =>
        window.scrollTo({ top: 0, behavior: 'smooth' })
      );
    }

    // Progress bar
    const handleProgressScroll = () => {
      const el = document.getElementById('progress');
      if (!el) return;
      const pct =
        (window.scrollY /
          (document.documentElement.scrollHeight - window.innerHeight)) *
        100;
      el.style.width = pct + '%';
    };
    window.addEventListener('scroll', handleProgressScroll);

    // Scroll-to-top button
    const handleScrollTopVisibility = () => {
      const btn = document.getElementById('scrollTop');
      if (!btn) return;
      btn.classList.toggle('visible', window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScrollTopVisibility);

    // IntersectionObserver for TOC active links
    const sections = document.querySelectorAll('section[id]');
    const links = document.querySelectorAll('.toc-link');
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((l) => l.classList.remove('active'));
            const a = document.querySelector(
              `.toc-link[href="#${e.target.id}"]`
            );
            if (a) a.classList.add('active');
          }
        });
      },
      { threshold: 0.3 }
    );
    sections.forEach((s) => obs.observe(s));

    return () => {
      window.removeEventListener('scroll', handleProgressScroll);
      window.removeEventListener('scroll', handleScrollTopVisibility);
      obs.disconnect();
    };
  }, []);

  return (
    <div className="wp-root">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
    </div>
  );
}
