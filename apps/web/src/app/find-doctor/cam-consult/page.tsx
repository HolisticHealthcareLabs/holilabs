'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Sparkles, AlertTriangle, Loader2, AlertCircle, ExternalLink,
  Leaf, Heart, Activity, ChevronDown, MapPin, Stethoscope, ShieldAlert,
  BrainCircuit, BookOpen, FileText,
} from 'lucide-react';

type SystemType = 'CONVENTIONAL' | 'INTEGRATIVE' | 'TRADITIONAL' | 'COMPLEMENTARY';
type EvidenceTier = 'A' | 'B' | 'C' | 'D';

interface Modality {
  modalitySlug: string;
  displayName: string;
  systemType: SystemType;
  evidenceTier: EvidenceTier;
  summary: string;
  citations: { source: string; pmid?: string; doi?: string }[];
  indicationTags: string[];
  matchedTagCount: number;
}

interface Contraindication {
  herbalSlug: string;
  commonName: string;
  scientificName: string;
  withMedClass: string;
  concern: string;
  mechanism: string;
  holdDaysPreOp: number;
  citationPmid: string | null;
}

interface Practitioner {
  id: string;
  name: string;
  systemType: SystemType;
  primarySpecialty: string | null;
  city: string | null;
  state: string | null;
  country: string;
  avgRating: number;
  reviewCount: number;
  claimStatus: string;
  profileUrl: string;
}

interface ConsultResult {
  matchedTags: string[];
  modalities: Modality[];
  contraindications: Contraindication[];
  practitioners: Practitioner[];
  disclaimer: string;
  ragActive: boolean;
  expertContributors: string[];
  meta: { knowledgeBaseVersion: string; generatedAt: string };
}

const MED_CLASSES = [
  { value: 'ANTIPLATELET', label: 'Antiplatelet' },
  { value: 'ANTICOAGULANT', label: 'Anticoagulant' },
  { value: 'WARFARIN', label: 'Warfarin' },
  { value: 'NSAID', label: 'NSAID' },
  { value: 'SSRI', label: 'SSRI / SNRI' },
  { value: 'MAO_INHIBITOR', label: 'MAO inhibitor' },
  { value: 'BENZODIAZEPINE', label: 'Benzodiazepine' },
  { value: 'OPIOID', label: 'Opioid' },
  { value: 'HYPOGLYCEMIC', label: 'Oral hypoglycemic' },
  { value: 'INSULIN', label: 'Insulin' },
  { value: 'DIURETIC', label: 'Diuretic' },
  { value: 'DIGOXIN', label: 'Digoxin' },
  { value: 'BETA_BLOCKER', label: 'Beta-blocker' },
  { value: 'ANTIHYPERTENSIVE', label: 'Antihypertensive' },
  { value: 'IMMUNOSUPPRESSANT', label: 'Immunosuppressant' },
  { value: 'CORTICOSTEROID', label: 'Corticosteroid' },
  { value: 'CYP3A4_SUBSTRATE', label: 'CYP3A4 substrate' },
];

const SYSTEM_TYPES: SystemType[] = ['CONVENTIONAL', 'INTEGRATIVE', 'TRADITIONAL', 'COMPLEMENTARY'];

const SYSTEM_ICON: Record<SystemType, React.ReactNode> = {
  CONVENTIONAL:  <Activity className="w-3.5 h-3.5" />,
  INTEGRATIVE:   <Heart className="w-3.5 h-3.5" />,
  TRADITIONAL:   <Leaf className="w-3.5 h-3.5" />,
  COMPLEMENTARY: <Sparkles className="w-3.5 h-3.5" />,
};
const SYSTEM_COLOR: Record<SystemType, string> = {
  CONVENTIONAL:  'bg-blue-50 text-blue-700 border-blue-200',
  INTEGRATIVE:   'bg-purple-50 text-purple-700 border-purple-200',
  TRADITIONAL:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  COMPLEMENTARY: 'bg-amber-50 text-amber-700 border-amber-200',
};
const EVIDENCE_COLOR: Record<EvidenceTier, string> = {
  A: 'bg-emerald-100 text-emerald-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-amber-100 text-amber-800',
  D: 'bg-slate-100 text-slate-700',
};

export default function CamConsultPage() {
  const [complaint, setComplaint] = useState('');
  const [meds, setMeds] = useState<string[]>([]);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [preferredSystems, setPreferredSystems] = useState<SystemType[]>([]);
  const [patientInterested, setPatientInterested] = useState(true);
  const [showMeds, setShowMeds] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ConsultResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleMed = (v: string) =>
    setMeds((prev) => (prev.includes(v) ? prev.filter((m) => m !== v) : [...prev, v]));
  const toggleSystem = (v: SystemType) =>
    setPreferredSystems((prev) => (prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v]));

  const submit = async () => {
    if (complaint.trim().length < 3) {
      setError('Describe the complaint in at least a few words.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/cam/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chiefComplaint: complaint.trim(),
          activeMedClasses: meds.length ? meds : undefined,
          patientInterestedInCam: patientInterested,
          country: country || undefined,
          city: city.trim() || undefined,
          preferredSystemTypes: preferredSystems.length ? preferredSystems : undefined,
        }),
      });
      if (res.status === 401) {
        window.location.href = '/sign-in?next=/find-doctor/cam-consult';
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Consult failed');
      setResult(data.data);
      window.scrollTo({ top: 300, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to run consult');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/find-doctor" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" />
            Back to directory
          </Link>
          <span className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5" />
            Clinician decision-support — not autonomous CDS
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-start gap-3">
          <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
            <BrainCircuit className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-3xl font-bold text-slate-900">CAM consult</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                Rule-based MVP
              </span>
            </div>
            <p className="text-slate-600 max-w-2xl">
              Quickly surface evidence-tiered complementary & alternative medicine options for a
              patient complaint, together with herb-drug contraindications from the pre-op engine
              and in-network practitioner suggestions from the directory.
            </p>
            <div className="mt-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 p-3 text-xs text-slate-700 max-w-2xl">
              <span className="font-semibold text-purple-800">Coming soon — RAG:</span> this
              tool will be augmented with curated content from world-class advisors
              (first: Dr. Ahmed El Tassa). The rule-based MVP stays as the deterministic floor.
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 mb-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Chief complaint <span className="text-red-500">*</span>
            </label>
            <textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="e.g. Chronic low back pain, not responding to conventional therapy. Pt interested in complementary approaches."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
            />
            <p className="mt-1 text-xs text-slate-400">
              Free text in English, Portuguese, or Spanish. Do not paste full chart notes — complaint summary only.
            </p>
          </div>

          {/* Patient interest */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={patientInterested}
              onChange={(e) => setPatientInterested(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-700">
              Patient has expressed interest in CAM or cross-modality alternatives
            </span>
          </label>

          {/* Meds */}
          <div>
            <button
              type="button"
              onClick={() => setShowMeds((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showMeds ? 'rotate-0' : '-rotate-90'}`} />
              Patient's active medication classes
              <span className="text-xs text-slate-400 font-normal">(improves contraindication accuracy)</span>
              {meds.length > 0 && <span className="ml-auto text-xs text-emerald-700">{meds.length} selected</span>}
            </button>
            {showMeds && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 pl-6">
                {MED_CLASSES.map((m) => (
                  <label
                    key={m.value}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors ${
                      meds.includes(m.value)
                        ? 'bg-emerald-50 text-emerald-900'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={meds.includes(m.value)}
                      onChange={() => toggleMed(m.value)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Location + system preference */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
              >
                <option value="">Any</option>
                <option value="BR">Brazil</option>
                <option value="MX">Mexico</option>
                <option value="CO">Colombia</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Optional — narrows practitioner list"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Filter by medical system (optional)</p>
            <div className="flex flex-wrap gap-2">
              {SYSTEM_TYPES.map((s) => {
                const active = preferredSystems.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSystem(s)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active ? SYSTEM_COLOR[s] : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {SYSTEM_ICON[s]}
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 font-medium"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
              {submitting ? 'Running…' : 'Run CAM consult'}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {result.matchedTags.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm text-amber-900">
                  No recognized complaint category. Try rephrasing the chief complaint with more
                  specific clinical terminology.
                </p>
              </div>
            )}

            {result.modalities.length > 0 && (
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    Recommended modalities
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ordered by evidence tier then relevance. Tags matched: {result.matchedTags.join(', ')}
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {result.modalities.map((m) => (
                    <div key={m.modalitySlug} className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900">{m.displayName}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${SYSTEM_COLOR[m.systemType]}`}>
                              {SYSTEM_ICON[m.systemType]}
                              {m.systemType.charAt(0) + m.systemType.slice(1).toLowerCase()}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EVIDENCE_COLOR[m.evidenceTier]}`}>
                              Evidence {m.evidenceTier}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{m.summary}</p>
                      <details className="text-xs text-slate-500">
                        <summary className="cursor-pointer hover:text-slate-700">
                          Citations ({m.citations.length})
                        </summary>
                        <ul className="mt-2 space-y-1">
                          {m.citations.map((c, i) => (
                            <li key={i} className="flex items-baseline gap-2">
                              <span>•</span>
                              <span>{c.source}</span>
                              {c.pmid && (
                                <a
                                  href={`https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:underline inline-flex items-center gap-0.5"
                                >
                                  PMID {c.pmid} <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {result.contraindications.length > 0 && (
              <section className="bg-white rounded-xl border border-red-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-red-200 bg-red-50">
                  <h2 className="font-semibold text-red-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Herb-drug contraindications ({result.contraindications.length})
                  </h2>
                  <p className="text-xs text-red-700 mt-0.5">
                    Based on the patient's active medications. Pre-op holds may apply.
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {result.contraindications.map((c, i) => (
                    <div key={`${c.herbalSlug}-${c.withMedClass}-${i}`} className="p-5">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">{c.commonName}</h3>
                          <p className="text-xs text-slate-500 italic">{c.scientificName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ↔ {c.withMedClass.replace(/_/g, ' ').toLowerCase()}
                          </span>
                          {c.holdDaysPreOp > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              Stop {c.holdDaysPreOp}d pre-op
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 mt-2">{c.concern}</p>
                      <details className="mt-2 text-xs text-slate-500">
                        <summary className="cursor-pointer hover:text-slate-700">Mechanism</summary>
                        <p className="mt-1 pl-3 border-l-2 border-slate-200">{c.mechanism}</p>
                        {c.citationPmid && (
                          <a
                            href={`https://pubmed.ncbi.nlm.nih.gov/${c.citationPmid}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:underline inline-flex items-center gap-0.5 mt-1"
                          >
                            PMID {c.citationPmid} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </details>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {result.practitioners.length > 0 && (
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-emerald-600" />
                    In-network practitioners ({result.practitioners.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Top matches from the Holi Labs directory for the candidate systems.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                  {result.practitioners.map((p) => (
                    <div key={p.id} className="p-5">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link href={p.profileUrl} className="font-semibold text-slate-900 hover:text-emerald-700">
                          {p.name}
                        </Link>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${SYSTEM_COLOR[p.systemType]}`}>
                          {SYSTEM_ICON[p.systemType]}
                          {p.systemType.charAt(0) + p.systemType.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {p.primarySpecialty}
                        {(p.city || p.state) && ` · ${[p.city, p.state].filter(Boolean).join(', ')}`}
                      </p>
                      {p.reviewCount > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                          ★ {p.avgRating.toFixed(1)} · {p.reviewCount} reviews
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs text-slate-500 flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  {result.disclaimer}
                  {' '}
                  <span className="text-slate-400">
                    Knowledge base: {result.meta.knowledgeBaseVersion}
                  </span>
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
