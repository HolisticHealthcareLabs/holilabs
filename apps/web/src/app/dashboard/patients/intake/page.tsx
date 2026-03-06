'use client';

/**
 * Patient Intake & Pre-Authorization Wizard
 *
 * 5-step multi-step form:
 *   1. Demographics
 *   2. Medical History
 *   3. Pre-Authorization Request
 *   4. Granular LGPD Consent (RUTH invariant: each type is a separate checkbox)
 *   5. Review + Physician Sign-Off
 *
 * On submit → POST /api/patients/[id]/intake
 */

import { useState } from 'react';
import { CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Demographics {
  firstName:   string;
  lastName:    string;
  dateOfBirth: string;
  email:       string;
  phone:       string;
  cpf:         string;
  address:     string;
}

interface MedicalHistory {
  allergies:         string;
  currentMedications: string;
  chronicConditions:  string;
  surgicalHistory:    string;
}

interface PreAuth {
  procedureName:       string;
  icd10Codes:          string;
  insurancePayer:      string;
  clinicalJustification: string;
}

interface Consents {
  generalConsultation:  boolean; // GENERAL_CONSULTATION
  aiAnalysis:           boolean; // DATA_RESEARCH
  crossBorderTransfer:  boolean; // DATA_SHARING_CONSENT
  privacyPolicy:        boolean; // PRIVACY_POLICY
}

interface SignOff {
  notes:     string;
  signature: string;
}

const STEPS = [
  'Demographics',
  'Medical History',
  'Pre-Authorization',
  'Consent',
  'Sign & Submit',
];

const INITIAL_DEMOGRAPHICS: Demographics = {
  firstName: '', lastName: '', dateOfBirth: '', email: '',
  phone: '', cpf: '', address: '',
};
const INITIAL_MEDICAL: MedicalHistory = {
  allergies: '', currentMedications: '', chronicConditions: '', surgicalHistory: '',
};
const INITIAL_PREAUTH: PreAuth = {
  procedureName: '', icd10Codes: '', insurancePayer: '', clinicalJustification: '',
};
const INITIAL_CONSENTS: Consents = {
  generalConsultation: false,
  aiAnalysis:          false,
  crossBorderTransfer: false,
  privacyPolicy:       false,
};
const INITIAL_SIGNOFF: SignOff = { notes: '', signature: '' };

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition';

const textareaClass =
  'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white resize-none ' +
  'focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition';

// ─── Step components ──────────────────────────────────────────────────────────

function StepDemographics({
  data, onChange,
}: { data: Demographics; onChange: (d: Demographics) => void }) {
  const set = (k: keyof Demographics) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...data, [k]: e.target.value });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="First Name" required>
        <input className={inputClass} value={data.firstName} onChange={set('firstName')} placeholder="Maria" />
      </Field>
      <Field label="Last Name" required>
        <input className={inputClass} value={data.lastName} onChange={set('lastName')} placeholder="Silva" />
      </Field>
      <Field label="Date of Birth" required>
        <input type="date" className={inputClass} value={data.dateOfBirth} onChange={set('dateOfBirth')} />
      </Field>
      <Field label="Email" required>
        <input type="email" className={inputClass} value={data.email} onChange={set('email')} placeholder="patient@example.com" />
      </Field>
      <Field label="Phone">
        <input type="tel" className={inputClass} value={data.phone} onChange={set('phone')} placeholder="+55 11 99999-9999" />
      </Field>
      <Field label="CPF (Brazil)">
        <input className={inputClass} value={data.cpf} onChange={set('cpf')} placeholder="000.000.000-00" />
      </Field>
      <Field label="Address">
        <textarea className={textareaClass} rows={2} value={data.address} onChange={set('address')} placeholder="Rua Exemplo, 123 — São Paulo, SP" />
      </Field>
    </div>
  );
}

function StepMedicalHistory({
  data, onChange,
}: { data: MedicalHistory; onChange: (d: MedicalHistory) => void }) {
  const set = (k: keyof MedicalHistory) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    onChange({ ...data, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <Field label="Allergies">
        <textarea className={textareaClass} rows={2} value={data.allergies} onChange={set('allergies')} placeholder="Penicillin, NSAIDs, latex…" />
      </Field>
      <Field label="Current Medications">
        <textarea className={textareaClass} rows={3} value={data.currentMedications} onChange={set('currentMedications')} placeholder="Metformin 1000mg bid, Atorvastatin 40mg qd…" />
      </Field>
      <Field label="Chronic Conditions">
        <textarea className={textareaClass} rows={2} value={data.chronicConditions} onChange={set('chronicConditions')} placeholder="Type 2 Diabetes, CKD Stage 3…" />
      </Field>
      <Field label="Surgical History">
        <textarea className={textareaClass} rows={2} value={data.surgicalHistory} onChange={set('surgicalHistory')} placeholder="Appendectomy 2015, Knee arthroscopy 2019…" />
      </Field>
    </div>
  );
}

function StepPreAuth({
  data, onChange,
}: { data: PreAuth; onChange: (d: PreAuth) => void }) {
  const set = (k: keyof PreAuth) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...data, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <Field label="Procedure Name" required>
        <input className={inputClass} value={data.procedureName} onChange={set('procedureName')} placeholder="Coronary angiography" />
      </Field>
      <Field label="ICD-10 Codes" required>
        <input className={inputClass} value={data.icd10Codes} onChange={set('icd10Codes')} placeholder="I50.9, E11.65, N18.3" />
      </Field>
      <Field label="Insurance / Payer">
        <input className={inputClass} value={data.insurancePayer} onChange={set('insurancePayer')} placeholder="Unimed SP, Bradesco Saúde…" />
      </Field>
      <Field label="Clinical Justification" required>
        <textarea className={textareaClass} rows={4} value={data.clinicalJustification} onChange={set('clinicalJustification')} placeholder="Patient presents with NYHA Class III heart failure…" />
      </Field>
    </div>
  );
}

function StepConsent({
  data, onChange,
}: { data: Consents; onChange: (d: Consents) => void }) {
  const toggle = (k: keyof Consents) => () => onChange({ ...data, [k]: !data[k] });

  const items: Array<{ key: keyof Consents; title: string; description: string }> = [
    {
      key:         'generalConsultation',
      title:       'Data Processing Consent',
      description: 'I authorise Holi Labs to process my personal and health data for the purpose of direct patient care, in accordance with LGPD Art. 11, § 2, I.',
    },
    {
      key:         'aiAnalysis',
      title:       'AI Analysis Consent',
      description: 'I consent to my de-identified data being used to improve AI clinical decision-support models. Data is anonymised before any model training (LGPD Art. 7, IX).',
    },
    {
      key:         'crossBorderTransfer',
      title:       'Cross-Border Data Transfer Consent',
      description: 'I authorise transfer of my data to cloud infrastructure outside Brazil where adequate protection measures are in place (LGPD Art. 33, II).',
    },
    {
      key:         'privacyPolicy',
      title:       'LGPD / HIPAA Privacy Notice',
      description: 'I acknowledge receipt and understanding of the Holi Labs Privacy Notice and HIPAA Notice of Privacy Practices.',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
        All four consents are required before proceeding. Each is separately recorded and anchored to an immutable audit entry.
      </p>
      {items.map(({ key, title, description }) => (
        <label
          key={key}
          className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
            data[key]
              ? 'border-gray-900 bg-gray-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          {/* Custom checkbox */}
          <div className="relative w-5 h-5 shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={data[key]}
              onChange={toggle(key)}
              className="peer sr-only"
            />
            <span className="block w-5 h-5 rounded border-2 border-gray-300 peer-checked:bg-gray-900 peer-checked:border-gray-900 transition-colors" />
            {data[key] && (
              <svg className="absolute inset-0 w-5 h-5 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
          </div>
        </label>
      ))}
    </div>
  );
}

function StepSignOff({
  demo, medical, preauth, signOff, allConsentsChecked, submitting, error, onSignOffChange, onSubmit,
}: {
  demo:              Demographics;
  medical:           MedicalHistory;
  preauth:           PreAuth;
  signOff:           SignOff;
  allConsentsChecked: boolean;
  submitting:        boolean;
  error:             string | null;
  onSignOffChange:   (s: SignOff) => void;
  onSubmit:          () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Read-only summary */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Patient Summary (read-only)</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-gray-500">Name</dt>
            <dd className="text-gray-900 font-medium">{demo.firstName} {demo.lastName}</dd>
          </div>
          <div>
            <dt className="text-gray-500">DOB</dt>
            <dd className="text-gray-900 font-medium">{demo.dateOfBirth || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">CPF</dt>
            <dd className="text-gray-900 font-medium">{demo.cpf || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Procedure</dt>
            <dd className="text-gray-900 font-medium">{preauth.procedureName || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">ICD-10</dt>
            <dd className="text-gray-900 font-medium">{preauth.icd10Codes || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Allergies</dt>
            <dd className="text-gray-900 font-medium truncate">{medical.allergies || '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Clinical justification / sign-off notes */}
      <Field label="Clinical Justification / Sign-Off Notes" required>
        <textarea
          className={textareaClass}
          rows={4}
          value={signOff.notes}
          onChange={(e) => onSignOffChange({ ...signOff, notes: e.target.value })}
          placeholder="Clinician's attestation, observations, or additional context for the record…"
        />
      </Field>

      {/* Typed signature */}
      <Field label="Physician Signature (type full name)" required>
        <input
          className={`${inputClass} font-[cursive] text-lg tracking-wide`}
          style={{ fontFamily: 'cursive' }}
          value={signOff.signature}
          onChange={(e) => onSignOffChange({ ...signOff, signature: e.target.value })}
          placeholder="Dr. Ana Lima"
        />
      </Field>

      {!allConsentsChecked && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Return to Step 4 and complete all four consent checkboxes before signing.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={
          !allConsentsChecked ||
          !signOff.notes.trim() ||
          !signOff.signature.trim() ||
          submitting
        }
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity={0.25} strokeWidth={2} />
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth={2}
                      strokeDasharray={2 * Math.PI * 6} strokeDashoffset={2 * Math.PI * 6 * 0.75}
                      strokeLinecap="round" />
            </svg>
            Submitting…
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Sign &amp; Submit Intake
          </>
        )}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientIntakePage() {
  const [step,       setStep]       = useState(0);
  const [demo,       setDemo]       = useState<Demographics>(INITIAL_DEMOGRAPHICS);
  const [medical,    setMedical]    = useState<MedicalHistory>(INITIAL_MEDICAL);
  const [preauth,    setPreauth]    = useState<PreAuth>(INITIAL_PREAUTH);
  const [consents,   setConsents]   = useState<Consents>(INITIAL_CONSENTS);
  const [signOff,    setSignOff]    = useState<SignOff>(INITIAL_SIGNOFF);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [success,    setSuccess]    = useState(false);

  const allConsentsChecked =
    consents.generalConsultation &&
    consents.aiAnalysis &&
    consents.crossBorderTransfer &&
    consents.privacyPolicy;

  // Step validation
  function canAdvance(): boolean {
    if (step === 0) return !!(demo.firstName && demo.lastName && demo.dateOfBirth && demo.email);
    if (step === 2) return !!(preauth.procedureName && preauth.icd10Codes && preauth.clinicalJustification);
    if (step === 3) return allConsentsChecked;
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      // patientId is unknown for new patients — pass 'new' and let the API handle upsert
      const res = await fetch('/api/patients/new/intake', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId:         'new',
          intakeData:        { demographics: demo, medicalHistory: medical, preAuth: preauth },
          consents:          Object.entries(consentTypeMap)
                               .filter(([k]) => consents[k as keyof Consents])
                               .map(([, v]) => v),
          signOffNotes:      signOff.notes,
          clinicianSignature: signOff.signature,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `HTTP ${res.status}`);
      } else {
        setSuccess(true);
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const consentTypeMap: Record<keyof Consents, string> = {
    generalConsultation: 'GENERAL_CONSULTATION',
    aiAnalysis:          'DATA_RESEARCH',
    crossBorderTransfer: 'DATA_SHARING_CONSENT',
    privacyPolicy:       'PRIVACY_POLICY',
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Intake Submitted</h2>
        <p className="text-gray-500 text-sm">
          The intake form has been signed and a hash-chained audit entry has been recorded.
          Consent records are now individually anchored to the patient file.
        </p>
        <button
          onClick={() => {
            setStep(0);
            setDemo(INITIAL_DEMOGRAPHICS);
            setMedical(INITIAL_MEDICAL);
            setPreauth(INITIAL_PREAUTH);
            setConsents(INITIAL_CONSENTS);
            setSignOff(INITIAL_SIGNOFF);
            setSuccess(false);
          }}
          className="mt-6 px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-xl transition-colors"
        >
          New Intake
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Patient Intake</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pre-authorization request with granular LGPD consent and physician sign-off
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        {/* Numbered step pills */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
          {STEPS.map((name, i) => (
            <div key={name} className="flex items-center gap-2 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step  ? 'bg-green-600 text-white' :
                i === step ? 'bg-gray-900 text-white' :
                             'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${
                i === step ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {name}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />}
            </div>
          ))}
        </div>

        {/* Thin progress bar */}
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-none">
        <h2 className="text-base font-semibold text-gray-900 mb-5">{STEPS[step]}</h2>

        {step === 0 && <StepDemographics   data={demo}    onChange={setDemo}    />}
        {step === 1 && <StepMedicalHistory  data={medical} onChange={setMedical} />}
        {step === 2 && <StepPreAuth         data={preauth} onChange={setPreauth} />}
        {step === 3 && <StepConsent         data={consents} onChange={setConsents} />}
        {step === 4 && (
          <StepSignOff
            demo={demo}
            medical={medical}
            preauth={preauth}
            signOff={signOff}
            allConsentsChecked={allConsentsChecked}
            submitting={submitting}
            error={error}
            onSignOffChange={setSignOff}
            onSubmit={handleSubmit}
          />
        )}

        {/* Navigation */}
        {step < 4 && (
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 4 && step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="mt-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Consent
          </button>
        )}
      </div>
    </div>
  );
}
