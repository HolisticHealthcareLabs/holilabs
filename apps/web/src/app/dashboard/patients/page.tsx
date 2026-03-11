'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  MoreHorizontal, X, User, UserPlus, AlertTriangle,
  Heart, Shield, FlaskConical, FileText, Stethoscope,
  Play, Clock, ChevronsUpDown,
} from 'lucide-react';
import { filterRecordsForOrganization } from '../../../../../../packages/shared-kernel/src/types/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Sex = 'M' | 'F' | 'O';
type RiskLevel = 'critical' | 'high' | 'moderate' | 'low';
type StatusFlag =
  | 'High Risk'
  | 'Missing Consent'
  | 'Pending Labs'
  | 'Follow-up Overdue'
  | 'New Patient';

interface RegistryPatient {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
  sex: Sex;
  primaryDiagnosis: string;
  icd10: string;
  lastVisitDate: string;
  riskLevel: RiskLevel;
  statusFlags: StatusFlag[];
  latestBP: string;
  medications: string[];
  allergies: string[];
  payer: string;
}

// ---------------------------------------------------------------------------
// Mock data (VICTOR: clinically coherent, LATAM-realistic panel)
// ---------------------------------------------------------------------------

const PATIENTS: RegistryPatient[] = [
  {
    organizationId: 'org-demo-clinic',
    id: 'P001', firstName: 'Robert', lastName: 'Chen', mrn: 'MRN-001',
    dateOfBirth: '1958-03-15', sex: 'M',
    primaryDiagnosis: 'Essential Hypertension', icd10: 'I10',
    lastVisitDate: '2026-03-05', riskLevel: 'high',
    statusFlags: ['High Risk', 'Follow-up Overdue'],
    latestBP: '162/95 mmHg', medications: ['Lisinopril 10 mg', 'Atorvastatin 40 mg', 'Aspirin 81 mg'],
    allergies: ['Penicillin', 'Shellfish'], payer: 'Unimed',
  },
  {
    organizationId: 'org-demo-clinic',
    id: 'P002', firstName: 'Maria', lastName: 'Santos', mrn: 'MRN-002',
    dateOfBirth: '1972-07-22', sex: 'F',
    primaryDiagnosis: 'Type 2 Diabetes Mellitus', icd10: 'E11.9',
    lastVisitDate: '2026-03-04', riskLevel: 'moderate',
    statusFlags: ['Pending Labs'],
    latestBP: '128/82 mmHg', medications: ['Metformin 500 mg', 'Metoprolol 25 mg'],
    allergies: ['Sulfonamides'], payer: 'Bradesco Saude',
  },
  {
    organizationId: 'org-demo-clinic',
    id: 'P003', firstName: 'James', lastName: "O'Brien", mrn: 'MRN-003',
    dateOfBirth: '1945-11-08', sex: 'M',
    primaryDiagnosis: 'Atrial Fibrillation', icd10: 'I48.91',
    lastVisitDate: '2026-03-05', riskLevel: 'critical',
    statusFlags: ['High Risk', 'Missing Consent'],
    latestBP: '148/88 mmHg', medications: ['Warfarin 5 mg', 'Furosemide 40 mg', 'Digoxin 0.125 mg'],
    allergies: ['Codeine', 'Latex'], payer: 'Amil',
  },
  {
    organizationId: 'org-demo-clinic',
    id: 'P004', firstName: 'Sofia', lastName: 'Reyes', mrn: 'MRN-004',
    dateOfBirth: '1985-02-14', sex: 'F',
    primaryDiagnosis: 'Hypothyroidism', icd10: 'E03.9',
    lastVisitDate: '2026-03-03', riskLevel: 'low',
    statusFlags: [],
    latestBP: '118/74 mmHg', medications: ['Levothyroxine 100 mcg', 'Omeprazole 20 mg'],
    allergies: [], payer: 'SulAmerica',
  },
  {
    organizationId: 'org-demo-clinic',
    id: 'P005', firstName: 'Juliana', lastName: 'Costa Lima', mrn: 'MRN-005',
    dateOfBirth: '1988-09-03', sex: 'F',
    primaryDiagnosis: 'Supraventricular Tachycardia', icd10: 'I47.1',
    lastVisitDate: '2026-02-20', riskLevel: 'moderate',
    statusFlags: ['New Patient'],
    latestBP: '122/78 mmHg', medications: ['Metoprolol 50 mg'],
    allergies: [], payer: 'Unimed',
  },
  {
    organizationId: 'org-demo-clinic',
    id: 'P006', firstName: 'Fernando', lastName: 'Augusto Vieira', mrn: 'MRN-006',
    dateOfBirth: '1963-04-17', sex: 'M',
    primaryDiagnosis: 'Coronary Artery Disease', icd10: 'I25.10',
    lastVisitDate: '2026-03-01', riskLevel: 'high',
    statusFlags: ['High Risk', 'Pending Labs'],
    latestBP: '140/90 mmHg', medications: ['Clopidogrel 75 mg', 'Aspirin 100 mg', 'Atorvastatin 80 mg', 'Ramipril 5 mg'],
    allergies: ['Contrast Dye'], payer: 'Bradesco Saude',
  },
  {
    organizationId: 'org-partner-hospital',
    id: 'P007', firstName: 'Lucia', lastName: 'Helena Barbosa', mrn: 'MRN-007',
    dateOfBirth: '1968-12-21', sex: 'F',
    primaryDiagnosis: 'Heart Failure (HFrEF)', icd10: 'I50.20',
    lastVisitDate: '2026-02-28', riskLevel: 'critical',
    statusFlags: ['High Risk', 'Follow-up Overdue', 'Pending Labs'],
    latestBP: '156/92 mmHg', medications: ['Sacubitril/Valsartan 97/103 mg', 'Carvedilol 25 mg', 'Spironolactone 25 mg', 'Furosemide 80 mg'],
    allergies: ['ACE Inhibitors'], payer: 'Amil',
  },
  {
    organizationId: 'org-partner-hospital',
    id: 'P008', firstName: 'Carlos', lastName: 'Eduardo Mendes', mrn: 'MRN-008',
    dateOfBirth: '1955-06-10', sex: 'M',
    primaryDiagnosis: 'CKD Stage 3b + T2DM', icd10: 'N18.32',
    lastVisitDate: '2026-02-15', riskLevel: 'high',
    statusFlags: ['Pending Labs', 'Follow-up Overdue'],
    latestBP: '144/86 mmHg', medications: ['Insulin Glargine 20 U', 'Empagliflozin 10 mg', 'Losartan 100 mg'],
    allergies: [], payer: 'SulAmerica',
  },
  {
    organizationId: 'org-partner-hospital',
    id: 'P009', firstName: 'Ana', lastName: 'Beatriz Oliveira', mrn: 'MRN-009',
    dateOfBirth: '1990-01-28', sex: 'F',
    primaryDiagnosis: 'Mitral Valve Prolapse', icd10: 'I34.1',
    lastVisitDate: '2026-03-06', riskLevel: 'low',
    statusFlags: [],
    latestBP: '110/70 mmHg', medications: ['Propranolol 40 mg PRN'],
    allergies: ['Aspirin'], payer: 'Unimed',
  },
  {
    organizationId: 'org-partner-hospital',
    id: 'P010', firstName: 'Ricardo', lastName: 'Almeida Pinto', mrn: 'MRN-010',
    dateOfBirth: '1971-08-05', sex: 'M',
    primaryDiagnosis: 'Dyslipidemia', icd10: 'E78.5',
    lastVisitDate: '2026-02-10', riskLevel: 'low',
    statusFlags: ['Pending Labs'],
    latestBP: '124/78 mmHg', medications: ['Rosuvastatin 20 mg', 'Ezetimibe 10 mg'],
    allergies: [], payer: 'Bradesco Saude',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const RISK_STYLES: Record<RiskLevel, { bg: string; text: string; dot: string }> = {
  critical: { bg: 'bg-red-50 dark:bg-red-500/10',     text: 'text-red-700 dark:text-red-400',     dot: 'bg-red-500' },
  high:     { bg: 'bg-amber-50 dark:bg-amber-500/10',  text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  moderate: { bg: 'bg-blue-50 dark:bg-blue-500/10',    text: 'text-blue-700 dark:text-blue-400',   dot: 'bg-blue-500' },
  low:      { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

const FLAG_STYLES: Record<StatusFlag, string> = {
  'High Risk':         'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  'Missing Consent':   'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'Pending Labs':      'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  'Follow-up Overdue': 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  'New Patient':       'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
};

const AVATAR_COLORS = [
  'bg-cyan-600', 'bg-violet-600', 'bg-rose-600',
  'bg-teal-600', 'bg-amber-600', 'bg-indigo-600',
  'bg-pink-600', 'bg-emerald-600', 'bg-orange-600', 'bg-blue-600',
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

type SortKey = 'name' | 'age' | 'lastVisit' | 'risk' | 'diagnosis';
type SortDir = 'asc' | 'desc';

const RISK_ORDER: Record<RiskLevel, number> = { critical: 0, high: 1, moderate: 2, low: 3 };

function sortPatients(list: RegistryPatient[], key: SortKey, dir: SortDir): RegistryPatient[] {
  const sorted = [...list].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'name':
        cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
        break;
      case 'age':
        cmp = calcAge(a.dateOfBirth) - calcAge(b.dateOfBirth);
        break;
      case 'lastVisit':
        cmp = new Date(a.lastVisitDate).getTime() - new Date(b.lastVisitDate).getTime();
        break;
      case 'risk':
        cmp = RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel];
        break;
      case 'diagnosis':
        cmp = a.primaryDiagnosis.localeCompare(b.primaryDiagnosis);
        break;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Column Header
// ---------------------------------------------------------------------------

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className = '',
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentKey === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`
        flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider
        text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
        transition-colors select-none ${className}
      `}
    >
      {label}
      {isActive ? (
        currentDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      ) : (
        <ChevronsUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Quick Look Drawer
// ---------------------------------------------------------------------------

function QuickLookDrawer({
  patient,
  onClose,
}: {
  patient: RegistryPatient;
  onClose: () => void;
}) {
  const router = useRouter();
  const age = calcAge(patient.dateOfBirth);
  const risk = RISK_STYLES[patient.riskLevel];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        className="
          fixed top-0 right-0 h-full w-[400px] max-w-[90vw] z-50
          flex flex-col
          bg-white dark:bg-gray-900
          border-l border-gray-200 dark:border-gray-800
          shadow-2xl
          animate-in slide-in-from-right duration-200
        "
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${avatarColor(patient.id)}`}>
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                {patient.firstName} {patient.lastName}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {age}{patient.sex} / {patient.mrn}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Risk + Flags */}
          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${risk.bg} ${risk.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
              {patient.riskLevel.charAt(0).toUpperCase() + patient.riskLevel.slice(1)} Risk
            </span>
            {patient.statusFlags.map((flag) => (
              <span key={flag} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${FLAG_STYLES[flag]}`}>
                {flag}
              </span>
            ))}
          </div>

          {/* Primary Dx */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Primary Diagnosis</span>
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
              {patient.primaryDiagnosis}
              <span className="ml-2 text-xs font-mono text-gray-400 dark:text-gray-500">{patient.icd10}</span>
            </p>
          </section>

          {/* Latest BP */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Latest Blood Pressure</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-gray-800 dark:text-gray-200">{patient.latestBP}</p>
          </section>

          {/* Medications */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Active Medications</span>
            </div>
            {patient.medications.length === 0 ? (
              <p className="text-xs text-gray-400 italic">None on file</p>
            ) : (
              <div className="space-y-1.5">
                {patient.medications.map((med, i) => (
                  <div key={i} className="text-sm text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    {med}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Allergies */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Allergies</span>
            </div>
            {patient.allergies.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No known allergies (NKA)</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {patient.allergies.map((a) => (
                  <span key={a} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                    {a}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Payer */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Insurance / Payer</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{patient.payer}</p>
          </section>

          {/* Last Visit */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Last Visit</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(patient.lastVisitDate)}</p>
          </section>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => router.push(`/dashboard/clinical-command?patientId=${patient.id}`)}
            className="
              w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
              bg-gray-900 dark:bg-white text-white dark:text-gray-900
              hover:bg-gray-800 dark:hover:bg-gray-100
              transition-colors
            "
          >
            <Play className="w-3.5 h-3.5" />
            Begin Visit
          </button>
        </div>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Kebab Menu
// ---------------------------------------------------------------------------

function KebabMenu({
  patient,
  onClose,
}: {
  patient: RegistryPatient;
  onClose: () => void;
}) {
  const router = useRouter();

  const actions = [
    { label: 'Begin Visit', action: () => router.push(`/dashboard/clinical-command?patientId=${patient.id}`) },
    { label: 'Send Pre-Authorization', action: () => router.push(`/dashboard/billing?action=prior-auth&patientId=${patient.id}&patientName=${encodeURIComponent(patient.firstName + ' ' + patient.lastName)}`) },
    { label: 'Edit Demographics', action: () => {} },
    { label: 'View Full Chart', action: () => router.push(`/dashboard/patients/${patient.id}`) },
    { label: 'Print Summary', action: () => {} },
  ];

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 z-40 w-48 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl py-1">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={(e) => { e.stopPropagation(); a.action(); onClose(); }}
            className="w-full text-left px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {a.label}
          </button>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type RiskFilter = 'all' | RiskLevel;

export default function PatientsPage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [quickLookPatient, setQuickLookPatient] = useState<RegistryPatient | null>(null);
  const [kebabOpenId, setKebabOpenId] = useState<string | null>(null);
  const [roster, setRoster] = useState<RegistryPatient[]>(PATIENTS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newSex, setNewSex] = useState<Sex>('M');
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const activeOrganizationId = session?.user.organizationId ?? 'org-demo-clinic';
  const organizationScopedRoster = useMemo(
    () => filterRecordsForOrganization(roster, activeOrganizationId),
    [roster, activeOrganizationId]
  );

  function handleAddPatient() {
    if (!newFirstName.trim() || !newLastName.trim()) return;
    const id = `P${String(roster.length + 1).padStart(3, '0')}`;
    const newPatient: RegistryPatient = {
      id,
      organizationId: activeOrganizationId,
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      mrn: `MRN-${String(roster.length + 1).padStart(3, '0')}`,
      dateOfBirth: newDob || '1990-01-01',
      sex: newSex,
      primaryDiagnosis: newDiagnosis.trim() || 'New Patient - Pending Assessment',
      icd10: 'Z00.00',
      lastVisitDate: new Date().toISOString().split('T')[0],
      riskLevel: 'low',
      statusFlags: ['New Patient'],
      latestBP: 'Pending',
      medications: [],
      allergies: [],
      payer: 'Pending Verification',
    };
    setRoster((prev) => [newPatient, ...prev]);
    setShowAddForm(false);
    setNewFirstName('');
    setNewLastName('');
    setNewDob('');
    setNewSex('M');
    setNewDiagnosis('');
    setPage(1);
  }

  const handleSort = useCallback((key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }, [sortKey]);

  const processedPatients = useMemo(() => {
    let list = [...organizationScopedRoster];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.mrn.toLowerCase().includes(q) ||
          p.primaryDiagnosis.toLowerCase().includes(q),
      );
    }

    if (riskFilter !== 'all') {
      list = list.filter((p) => p.riskLevel === riskFilter);
    }

    return sortPatients(list, sortKey, sortDir);
  }, [organizationScopedRoster, search, riskFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processedPatients.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, processedPatients.length);
  const visiblePatients = processedPatients.slice(pageStart, pageEnd);

  const RISK_FILTERS: { value: RiskFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'low', label: 'Low' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Patient Registry
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {organizationScopedRoster.length} patients in panel
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="
            inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
            bg-gray-900 dark:bg-white text-white dark:text-gray-900
            hover:bg-gray-800 dark:hover:bg-gray-100
            transition-colors
          "
        >
          <UserPlus className="w-4 h-4" />
          {t('dashboard.patients.addPatient')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('dashboard.patients.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="
              w-full pl-9 pr-3 py-2 text-sm rounded-xl
              bg-white dark:bg-gray-900
              border border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-300
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-gray-400
              transition-colors
            "
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {RISK_FILTERS.map((f) => {
            const isActive = riskFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => { setRiskFilter(f.value); setPage(1); }}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${isActive
                    ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_40px] gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <SortableHeader label={t('dashboard.patients.patient')} sortKey="name" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
          <SortableHeader label={t('dashboard.patients.ageSex')} sortKey="age" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
          <SortableHeader label={t('dashboard.patients.primaryDx')} sortKey="diagnosis" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
          <SortableHeader label={t('dashboard.patients.lastVisit')} sortKey="lastVisit" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
          <SortableHeader label={t('dashboard.patients.risk')} sortKey="risk" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
          <span />
        </div>

        {/* Rows */}
        {visiblePatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-4">
              <User className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              {t('dashboard.patients.noPatients')}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center max-w-xs mb-4">
              Adjust your search or filters, or add a new patient to your panel.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <UserPlus className="w-3 h-3" />
              {t('dashboard.patients.registerNewPatient')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {visiblePatients.map((p) => {
              const age = calcAge(p.dateOfBirth);
              const risk = RISK_STYLES[p.riskLevel];
              return (
                <div
                  key={p.id}
                  onClick={() => setQuickLookPatient(p)}
                  className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_40px] gap-4 px-5 py-3.5 items-center hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer group"
                >
                  {/* Patient identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0 ${avatarColor(p.id)}`}>
                      {p.firstName[0]}{p.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">{p.mrn}</p>
                    </div>
                  </div>

                  {/* Age / Sex */}
                  <span className="text-sm text-gray-600 dark:text-gray-400">{age}{p.sex}</span>

                  {/* Primary Dx */}
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{p.primaryDiagnosis}</p>
                    <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{p.icd10}</p>
                  </div>

                  {/* Last Visit */}
                  <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">{formatDate(p.lastVisitDate)}</span>

                  {/* Risk badge + flags */}
                  <div className="flex flex-wrap gap-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${risk.bg} ${risk.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
                      {p.riskLevel.charAt(0).toUpperCase() + p.riskLevel.slice(1)}
                    </span>
                    {p.statusFlags.slice(0, 1).map((flag) => (
                      <span key={flag} className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${FLAG_STYLES[flag]}`}>
                        {flag}
                      </span>
                    ))}
                    {p.statusFlags.length > 1 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        +{p.statusFlags.length - 1}
                      </span>
                    )}
                  </div>

                  {/* Kebab */}
                  <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setKebabOpenId(kebabOpenId === p.id ? null : p.id)}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {kebabOpenId === p.id && (
                      <KebabMenu patient={p} onClose={() => setKebabOpenId(null)} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination footer */}
        {processedPatients.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing {pageStart + 1}-{pageEnd} of {processedPatients.length} patients
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`
                    w-7 h-7 rounded-lg text-xs font-medium transition-colors
                    ${n === safePage
                      ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {showAddForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('dashboard.patients.registerNewPatient')}</h2>
                <button onClick={() => setShowAddForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">First Name *</label>
                    <input
                      type="text"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      placeholder="e.g. Maria"
                      autoFocus
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Last Name *</label>
                    <input
                      type="text"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      placeholder="e.g. Santos"
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      value={newDob}
                      onChange={(e) => setNewDob(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Sex</label>
                    <select
                      value={newSex}
                      onChange={(e) => setNewSex(e.target.value as Sex)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Presenting Concern (optional)</label>
                  <input
                    type="text"
                    value={newDiagnosis}
                    onChange={(e) => setNewDiagnosis(e.target.value)}
                    placeholder="e.g. Chest pain, palpitations"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddPatient(); }}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPatient}
                  disabled={!newFirstName.trim() || !newLastName.trim()}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Register Patient
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick Look Drawer */}
      {quickLookPatient && (
        <QuickLookDrawer
          patient={quickLookPatient}
          onClose={() => setQuickLookPatient(null)}
        />
      )}
    </div>
  );
}
