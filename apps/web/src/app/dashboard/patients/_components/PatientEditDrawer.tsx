'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Save, User, Phone, Shield, Heart, Building2, AlertTriangle } from 'lucide-react';

interface PatientData {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
  sex: 'M' | 'F' | 'O';
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  cpf?: string;
  cns?: string;
  rg?: string;
  payer?: string;
  primaryContactName?: string;
  primaryContactPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  primaryDiagnosis?: string;
  icd10?: string;
  allergies?: string[];
  medications?: string[];
}

interface PatientEditDrawerProps {
  patient: PatientData;
  onClose: () => void;
  onSave: (updated: PatientData) => void;
}

type TabId = 'personal' | 'contact' | 'ids' | 'insurance' | 'emergency' | 'clinical';

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: 'personal', label: 'personal', icon: User },
  { id: 'contact', label: 'contact', icon: Phone },
  { id: 'ids', label: 'ids', icon: Shield },
  { id: 'insurance', label: 'insurance', icon: Building2 },
  { id: 'emergency', label: 'emergency', icon: AlertTriangle },
  { id: 'clinical', label: 'clinical', icon: Heart },
];

function Field({ label, value, onChange, type = 'text', placeholder, required }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-colors"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function PatientEditDrawer({ patient, onClose, onSave }: PatientEditDrawerProps) {
  const t = useTranslations('dashboard.patientEdit');
  const [activeTab, setActiveTab] = useState<TabId>('personal');
  const [form, setForm] = useState<PatientData>({ ...patient });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof PatientData>(key: K, value: PatientData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Access-Reason': 'CLINICAL_CARE' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        onSave(form);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('editPatient')}</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              {form.firstName} {form.lastName} &middot; {form.mrn}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-3 h-3" />
                {t(tab.label)}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {activeTab === 'personal' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('firstName')} value={form.firstName} onChange={(v) => update('firstName', v)} required />
                <Field label={t('lastName')} value={form.lastName} onChange={(v) => update('lastName', v)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('dateOfBirth')} value={form.dateOfBirth} onChange={(v) => update('dateOfBirth', v)} type="date" />
                <SelectField label={t('sex')} value={form.sex} onChange={(v) => update('sex', v as 'M' | 'F' | 'O')} options={[
                  { value: 'M', label: t('male') },
                  { value: 'F', label: t('female') },
                  { value: 'O', label: t('other') },
                ]} />
              </div>
              <Field label={t('email')} value={form.email ?? ''} onChange={(v) => update('email', v)} type="email" placeholder="patient@email.com" />
            </>
          )}

          {activeTab === 'contact' && (
            <>
              <Field label={t('phone')} value={form.phone ?? ''} onChange={(v) => update('phone', v)} type="tel" placeholder="+55 11 99999-9999" />
              <Field label={t('address')} value={form.address ?? ''} onChange={(v) => update('address', v)} placeholder={t('streetPlaceholder')} />
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('city')} value={form.city ?? ''} onChange={(v) => update('city', v)} />
                <Field label={t('state')} value={form.state ?? ''} onChange={(v) => update('state', v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('postalCode')} value={form.postalCode ?? ''} onChange={(v) => update('postalCode', v)} />
                <SelectField label={t('country')} value={form.country ?? 'BR'} onChange={(v) => update('country', v)} options={[
                  { value: 'BR', label: 'Brazil' },
                  { value: 'AR', label: 'Argentina' },
                  { value: 'BO', label: 'Bolivia' },
                  { value: 'US', label: 'United States' },
                  { value: 'CO', label: 'Colombia' },
                  { value: 'MX', label: 'Mexico' },
                ]} />
              </div>
            </>
          )}

          {activeTab === 'ids' && (
            <>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">{t('brazilianIds')}</p>
              <Field label={t('cpf')} value={form.cpf ?? ''} onChange={(v) => update('cpf', v)} placeholder="000.000.000-00" />
              <Field label={t('cnsSus')} value={form.cns ?? ''} onChange={(v) => update('cns', v)} placeholder="000 0000 0000 0000" />
              <Field label={t('rg')} value={form.rg ?? ''} onChange={(v) => update('rg', v)} placeholder="00.000.000-0" />
            </>
          )}

          {activeTab === 'insurance' && (
            <>
              <Field label={t('primaryPayer')} value={form.payer ?? ''} onChange={(v) => update('payer', v)} placeholder="e.g. Unimed, Bradesco Saude" />
            </>
          )}

          {activeTab === 'emergency' && (
            <>
              <Field label={t('primaryContactName')} value={form.primaryContactName ?? ''} onChange={(v) => update('primaryContactName', v)} />
              <Field label={t('primaryContactPhone')} value={form.primaryContactPhone ?? ''} onChange={(v) => update('primaryContactPhone', v)} type="tel" />
              <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />
              <Field label={t('emergencyContactName')} value={form.emergencyContactName ?? ''} onChange={(v) => update('emergencyContactName', v)} />
              <Field label={t('emergencyContactPhone')} value={form.emergencyContactPhone ?? ''} onChange={(v) => update('emergencyContactPhone', v)} type="tel" />
            </>
          )}

          {activeTab === 'clinical' && (
            <>
              <Field label={t('primaryDiagnosis')} value={form.primaryDiagnosis ?? ''} onChange={(v) => update('primaryDiagnosis', v)} />
              <Field label={t('icd10Code')} value={form.icd10 ?? ''} onChange={(v) => update('icd10', v)} placeholder="e.g. I10" />
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{t('allergies')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {(form.allergies ?? []).map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                      {a}
                    </span>
                  ))}
                  {(form.allergies ?? []).length === 0 && <span className="text-xs text-gray-400">{t('noKnownAllergies')}</span>}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{t('activeMedications')}</label>
                <div className="space-y-1">
                  {(form.medications ?? []).map((m) => (
                    <div key={m} className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      {m}
                    </div>
                  ))}
                  {(form.medications ?? []).length === 0 && <span className="text-xs text-gray-400">{t('noActiveMedications')}</span>}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.firstName.trim() || !form.lastName.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saved ? (
              <span className="text-emerald-200">{t('saved')}</span>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                {t('saveChanges')}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
