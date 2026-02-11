'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type OnboardingProfile = import('@/app/api/onboarding/profile/route').OnboardingProfile;

const LS_KEY = 'holilabs:onboardingProfile:v1';

async function loadProfile(): Promise<OnboardingProfile | null> {
  // Try server first (best for IT/admin multi-user)
  const res = await fetch('/api/onboarding/profile', { cache: 'no-store' }).catch(() => null);
  if (res && res.ok) {
    const json = await res.json().catch(() => null);
    return (json?.data as OnboardingProfile) ?? null;
  }

  // Fallback: local-only
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as OnboardingProfile) : null;
  } catch {
    return null;
  }
}

async function saveProfile(profile: OnboardingProfile) {
  // Best-effort server write; local cache is always updated for continuity.
  const res = await fetch('/api/onboarding/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile }),
  }).catch(() => null);

  try {
    localStorage.setItem(LS_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }

  return Boolean(res && res.ok);
}

export function IntroQuestionnaireModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (profile: OnboardingProfile) => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');
  const [openField, setOpenField] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<OnboardingProfile>({
    persona: 'HOSPITAL_IT',
    orgSize: '6-25',
    deployment: 'UNKNOWN',
    osMix: 'MIXED',
    ehr: 'UNKNOWN',
    goal: 'PILOT',
    complianceCountry: 'UNKNOWN',
    insurerFocus: '',
    protocolMode: 'HYBRID_70_30',
  });

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSaveError('');
    setOpenField(null);
    loadProfile()
      .then((p) => {
        if (p) setProfile((prev) => ({ ...prev, ...p }));
      })
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-visible">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      60 seconds
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Tailor your Cortex rollout
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Optional. Helps us show the right install path (manual vs MDM) and the right compliance checklist.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Skip
                  </button>
                </div>
              </div>

              <div className="px-6 py-6 space-y-5">
                {loading ? (
                  <div className="text-sm text-gray-600 dark:text-gray-300">Loading…</div>
                ) : (
                  <>
                    <SelectField
                      fieldKey="persona"
                      label="Who are you?"
                      value={profile.persona || 'OTHER'}
                      onChange={(v) => setProfile((p) => ({ ...p, persona: v as any }))}
                      openField={openField}
                      onOpenChange={setOpenField}
                      options={[
                        ['HOSPITAL_IT', 'Hospital IT / Security'],
                        ['CLINIC_OWNER', 'Clinic Owner / Admin'],
                        ['CLINICIAN', 'Clinician'],
                        ['OTHER', 'Other'],
                      ]}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SelectField
                        fieldKey="orgSize"
                        label="Org size"
                        value={profile.orgSize || '6-25'}
                        onChange={(v) => setProfile((p) => ({ ...p, orgSize: v as any }))}
                        openField={openField}
                        onOpenChange={setOpenField}
                        options={[
                          ['1-5', '1–5'],
                          ['6-25', '6–25'],
                          ['26-100', '26–100'],
                          ['101-500', '101–500'],
                          ['500+', '500+'],
                        ]}
                      />
                      <SelectField
                        fieldKey="osMix"
                        label="OS mix"
                        value={profile.osMix || 'MIXED'}
                        onChange={(v) => setProfile((p) => ({ ...p, osMix: v as any }))}
                        openField={openField}
                        onOpenChange={setOpenField}
                        options={[
                          ['MOSTLY_MAC', 'Mostly macOS'],
                          ['MOSTLY_WINDOWS', 'Mostly Windows'],
                          ['MIXED', 'Mixed'],
                          ['UNKNOWN', 'Not sure'],
                        ]}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SelectField
                        fieldKey="deployment"
                        label="Deployment preference"
                        value={profile.deployment || 'UNKNOWN'}
                        onChange={(v) => setProfile((p) => ({ ...p, deployment: v as any }))}
                        openField={openField}
                        onOpenChange={setOpenField}
                        options={[
                          ['MDM', 'MDM / GPO / Jamf / Intune'],
                          ['MANUAL', 'Manual installs'],
                          ['UNKNOWN', 'Not sure'],
                        ]}
                      />
                      <SelectField
                        fieldKey="ehr"
                        label="Primary EHR"
                        value={profile.ehr || 'UNKNOWN'}
                        onChange={(v) => setProfile((p) => ({ ...p, ehr: v as any }))}
                        openField={openField}
                        onOpenChange={setOpenField}
                        options={[
                          ['TASY', 'Tasy'],
                          ['MV_SOUL', 'MV Soul'],
                          ['WARELINE', 'Wareline'],
                          ['PHILIPS_TASY', 'Philips Tasy'],
                          ['EPIC', 'Epic'],
                          ['CERNER', 'Cerner'],
                          ['OTHER', 'Other'],
                          ['UNKNOWN', 'Not sure'],
                        ]}
                      />
                    </div>

                    <SelectField
                      fieldKey="goal"
                      label="Goal for this week"
                      value={profile.goal || 'PILOT'}
                      onChange={(v) => setProfile((p) => ({ ...p, goal: v as any }))}
                      openField={openField}
                      onOpenChange={setOpenField}
                      options={[
                        ['PILOT', 'Pilot on 1–3 workstations'],
                        ['ROLL_OUT', 'Roll out to a department'],
                        ['EVALUATE', 'Evaluate feasibility/compliance'],
                        ['UNKNOWN', 'Not sure'],
                      ]}
                    />

                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 md:p-5 space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Operational context
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                          Used to tailor compliance, insurer, and deterministic policy defaults in downstream workflows.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SelectField
                          fieldKey="complianceCountry"
                          label="Compliance country"
                          value={profile.complianceCountry || 'UNKNOWN'}
                          onChange={(v) => setProfile((p) => ({ ...p, complianceCountry: v as any }))}
                          openField={openField}
                          onOpenChange={setOpenField}
                          options={[
                            ['BOLIVIA', 'Bolivia'],
                            ['BRAZIL', 'Brazil'],
                            ['ARGENTINA', 'Argentina'],
                            ['MEXICO', 'Mexico'],
                            ['COLOMBIA', 'Colombia'],
                            ['CHILE', 'Chile'],
                            ['PERU', 'Peru'],
                            ['OTHER', 'Other'],
                            ['UNKNOWN', 'Not sure'],
                          ]}
                        />
                        <SelectField
                          fieldKey="protocolMode"
                          label="Protocol mode preference"
                          value={profile.protocolMode || 'HYBRID_70_30'}
                          onChange={(v) => setProfile((p) => ({ ...p, protocolMode: v as any }))}
                          openField={openField}
                          onOpenChange={setOpenField}
                          options={[
                            ['DETERMINISTIC_100', 'Deterministic-first (100% deterministic checks)'],
                            ['HYBRID_70_30', 'Hybrid (70% deterministic / 30% probabilistic)'],
                            ['UNKNOWN', 'Not sure'],
                          ]}
                        />
                      </div>
                      <TextField
                        label="Insurance company / payer focus (optional)"
                        value={profile.insurerFocus || ''}
                        onChange={(v) => setProfile((p) => ({ ...p, insurerFocus: v }))}
                        placeholder="e.g., CNS, SUS, private payer list"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-3">
                {saveError && (
                  <p className="mr-auto text-xs font-medium text-amber-700 dark:text-amber-300">
                    {saveError}
                  </p>
                )}
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Not now
                </button>
                <button
                  onClick={async () => {
                    setSaving(true);
                    setSaveError('');
                    const serverSaved = await saveProfile(profile);
                    if (!serverSaved) {
                      setSaveError('Saved locally. Server sync will retry on next open.');
                    }
                    onSaved?.(profile);
                    setSaving(false);
                    onClose();
                  }}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-600/20"
                >
                  {saving ? 'Saving…' : 'Save & continue'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SelectField({
  fieldKey,
  label,
  value,
  onChange,
  openField,
  onOpenChange,
  options,
}: {
  fieldKey: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  openField: string | null;
  onOpenChange: (fieldKey: string | null) => void;
  options: Array<[string, string]>;
}) {
  const open = openField === fieldKey;
  const selectedLabel = options.find(([v]) => v === value)?.[1] ?? options[0]?.[1] ?? value;

  return (
    <label className="block relative">
      <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{label}</div>
      <button
        type="button"
        onClick={() => onOpenChange(open ? null : fieldKey)}
        className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-left flex items-center justify-between"
      >
        <span>{selectedLabel}</span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="close"
            className="fixed inset-0 z-[10000]"
            onClick={() => onOpenChange(null)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 z-[10001] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl max-h-56 overflow-auto">
            {options.map(([v, text]) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  onChange(v);
                  onOpenChange(null);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  value === v ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold' : ''
                }`}
              >
                {text}
              </button>
            ))}
          </div>
        </>
      )}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white"
      />
    </label>
  );
}

