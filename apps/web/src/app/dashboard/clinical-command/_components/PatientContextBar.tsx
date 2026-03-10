'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  Search, User, X, Eye, Heart, AlertTriangle, Clock, FileText,
  Upload, Stethoscope, Calendar, UserPlus,
} from 'lucide-react';
import { filterRecordsForOrganization } from '../../../../../../../packages/shared-kernel/src/types/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Patient {
  id: string;
  organizationId: string;
  name: string;
  dob: string;
  mrn: string;
}

interface Problem    { description: string; status: 'active' | 'chronic' | 'resolved'; onset: string }
interface Medication { name: string; dose: string; frequency: string }
interface Allergy    { allergen: string; reaction: string; severity: 'mild' | 'moderate' | 'severe' }
interface Diagnosis  { description: string; icd10: string; year: number }
interface Encounter  { date: string; type: string; provider: string; summary: string }

interface FacesheetData {
  problems:    Problem[];
  medications: Medication[];
  allergies:   Allergy[];
  diagnoses:   Diagnosis[];
  encounters:  Encounter[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo roster
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_PATIENTS: Patient[] = [
  { id: 'P001', organizationId: 'org-demo-clinic', name: 'Robert Chen',    dob: '03/15/1958', mrn: 'MRN-001' },
  { id: 'P002', organizationId: 'org-demo-clinic', name: 'Maria Santos',   dob: '07/22/1972', mrn: 'MRN-002' },
  { id: 'P003', organizationId: 'org-demo-clinic', name: "James O'Brien",  dob: '11/08/1945', mrn: 'MRN-003' },
  { id: 'P004', organizationId: 'org-partner-hospital', name: 'Sofia Reyes',    dob: '02/14/1985', mrn: 'MRN-004' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic facesheet data (industry-standard EHR sections)
// ─────────────────────────────────────────────────────────────────────────────

const FACESHEET: Record<string, FacesheetData> = {
  P001: {
    problems: [
      { description: 'Acute Chest Pain',         status: 'active',   onset: '2026-03-05' },
      { description: 'Essential Hypertension',   status: 'chronic',  onset: '2015-06-12' },
      { description: 'Hyperlipidemia',           status: 'chronic',  onset: '2018-02-20' },
      { description: 'Type 2 Diabetes Mellitus', status: 'chronic',  onset: '2020-09-07' },
    ],
    medications: [
      { name: 'Atorvastatin',       dose: '40 mg',   frequency: 'Once daily'  },
      { name: 'Lisinopril',         dose: '10 mg',   frequency: 'Once daily'  },
      { name: 'Aspirin (low-dose)', dose: '81 mg',   frequency: 'Once daily'  },
    ],
    allergies: [
      { allergen: 'Penicillin', reaction: 'Urticaria',   severity: 'moderate' },
      { allergen: 'Shellfish',  reaction: 'Anaphylaxis', severity: 'severe'   },
    ],
    diagnoses: [
      { description: 'Essential Hypertension',   icd10: 'I10',   year: 2015 },
      { description: 'Hyperlipidemia',           icd10: 'E78.5', year: 2018 },
      { description: 'Type 2 Diabetes Mellitus', icd10: 'E11.9', year: 2020 },
    ],
    encounters: [
      { date: '2026-02-18', type: 'Office Visit',    provider: 'Dr. A. Lopes',   summary: 'Annual physical. HTN well-controlled. A1C 7.1.' },
      { date: '2025-11-04', type: 'Cardiology',      provider: 'Dr. R. Alvarez', summary: 'Echo normal. Continued current regimen.' },
      { date: '2025-07-22', type: 'Lab Follow-up',   provider: 'Dr. A. Lopes',   summary: 'Lipid panel improved. Statin dose maintained.' },
    ],
  },
  P002: {
    problems: [
      { description: 'Type 2 Diabetes Mellitus', status: 'chronic', onset: '2019-04-15' },
      { description: 'Essential Hypertension',   status: 'chronic', onset: '2021-01-30' },
    ],
    medications: [
      { name: 'Metformin',  dose: '500 mg', frequency: 'Twice daily' },
      { name: 'Metoprolol', dose: '25 mg',  frequency: 'Twice daily' },
    ],
    allergies: [
      { allergen: 'Sulfonamides', reaction: 'Maculopapular rash', severity: 'mild' },
    ],
    diagnoses: [
      { description: 'Type 2 Diabetes Mellitus', icd10: 'E11.9', year: 2019 },
      { description: 'Essential Hypertension',   icd10: 'I10',   year: 2021 },
    ],
    encounters: [
      { date: '2026-01-10', type: 'Endocrinology', provider: 'Dr. P. Costa',   summary: 'HbA1c 6.8%. Metformin dose unchanged.' },
      { date: '2025-09-14', type: 'Office Visit',  provider: 'Dr. M. Ferreira', summary: 'BP 128/82. Medication compliance confirmed.' },
    ],
  },
  P003: {
    problems: [
      { description: 'Atrial Fibrillation',             status: 'chronic',  onset: '2012-11-08' },
      { description: 'Congestive Heart Failure',        status: 'chronic',  onset: '2014-03-22' },
      { description: 'Chronic Kidney Disease, Stage 3', status: 'chronic',  onset: '2017-08-01' },
    ],
    medications: [
      { name: 'Warfarin',   dose: '5 mg',     frequency: 'Once daily' },
      { name: 'Furosemide', dose: '40 mg',    frequency: 'Once daily' },
      { name: 'Digoxin',    dose: '0.125 mg', frequency: 'Once daily' },
    ],
    allergies: [
      { allergen: 'Codeine', reaction: 'Respiratory depression', severity: 'severe'   },
      { allergen: 'Latex',   reaction: 'Contact dermatitis',     severity: 'moderate' },
    ],
    diagnoses: [
      { description: 'Atrial Fibrillation',             icd10: 'I48.91', year: 2012 },
      { description: 'Congestive Heart Failure',        icd10: 'I50.9',  year: 2014 },
      { description: 'Chronic Kidney Disease, Stage 3', icd10: 'N18.3',  year: 2017 },
    ],
    encounters: [
      { date: '2026-02-28', type: 'Cardiology',     provider: 'Dr. R. Alvarez', summary: 'INR 2.4. Warfarin dose stable. Fluid weight stable.' },
      { date: '2025-12-11', type: 'Nephrology',     provider: 'Dr. J. Sousa',   summary: 'eGFR 48. Dietary restriction counselling.' },
      { date: '2025-10-03', type: 'ED Visit',       provider: 'Dr. T. Mendes',  summary: 'AF with RVR. Cardioverted. Discharged 48h.' },
    ],
  },
  P004: {
    problems: [
      { description: 'Hypothyroidism',                   status: 'chronic',  onset: '2016-05-19' },
      { description: 'Gastroesophageal Reflux Disease',  status: 'chronic',  onset: '2020-11-03' },
    ],
    medications: [
      { name: 'Levothyroxine', dose: '100 mcg', frequency: 'Once daily (fasting)' },
      { name: 'Omeprazole',    dose: '20 mg',   frequency: 'Once daily'           },
    ],
    allergies: [],
    diagnoses: [
      { description: 'Hypothyroidism',                  icd10: 'E03.9', year: 2016 },
      { description: 'Gastroesophageal Reflux Disease', icd10: 'K21.0', year: 2020 },
    ],
    encounters: [
      { date: '2026-01-22', type: 'Endocrinology', provider: 'Dr. P. Costa',    summary: 'TSH 2.1 mU/L. Levothyroxine dose maintained.' },
      { date: '2025-08-30', type: 'Office Visit',  provider: 'Dr. M. Ferreira', summary: 'GERD symptoms improved with PPI. Lifestyle counselling.' },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Severity badge
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<Allergy['severity'], string> = {
  mild:     'bg-amber-500/15  text-amber-400  border-amber-500/30',
  moderate: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  severe:   'bg-red-500/15    text-red-400    border-red-500/30',
};

function SeverityBadge({ severity }: { severity: Allergy['severity'] }) {
  return (
    <span className={`
      text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border
      ${SEVERITY_STYLES[severity]}
    `}>
      {severity}
    </span>
  );
}

const PROBLEM_STATUS_STYLES: Record<Problem['status'], string> = {
  active:   'bg-red-500/15    text-red-400    border-red-500/30',
  chronic:  'bg-amber-500/15  text-amber-400  border-amber-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

function StatusBadge({ status }: { status: Problem['status'] }) {
  return (
    <span className={`
      text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border
      ${PROBLEM_STATUS_STYLES[status]}
    `}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section heading helper
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeading({
  icon: Icon,
  label,
  iconColor = 'text-cyan-400',
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </h3>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// External Records drag-and-drop zone
// ─────────────────────────────────────────────────────────────────────────────

function ExternalRecordsZone() {
  const [isDragging, setIsDragging] = useState(false);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault(); // required to allow drop
  }
  function handleDragLeave(e: React.DragEvent) {
    // Only reset when the cursor truly leaves the zone (not its children)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    // In production: process e.dataTransfer.files
  }

  return (
    <motion.div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      whileHover={{ borderColor: 'rgb(34 211 238 / 0.45)' }}
      animate={isDragging
        ? { borderColor: 'rgb(34 211 238 / 0.8)', backgroundColor: 'rgb(8 145 178 / 0.08)' }
        : { borderColor: 'rgb(51 65 85 / 0.7)',   backgroundColor: 'rgb(15 23 42 / 0.5)'   }
      }
      transition={{ duration: 0.15 }}
      className="border-2 border-dashed rounded-xl p-7 flex flex-col items-center justify-center gap-3
                 cursor-pointer select-none"
      aria-label="Drop zone for external records"
      role="button"
      tabIndex={0}
    >
      <motion.div
        animate={isDragging ? { scale: 1.15, y: -3 } : { scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      >
        <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-cyan-400' : 'text-slate-600'}`} />
      </motion.div>

      <div className="text-center">
        <p className={`text-xs font-medium transition-colors ${isDragging ? 'text-cyan-400' : 'text-slate-500'}`}>
          Drag and drop external records or PDFs here
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">
          PDF, JPEG, PNG · max 25 MB
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient Chart Drawer
// ─────────────────────────────────────────────────────────────────────────────

function PatientChartDrawer({
  patient,
  onClose,
  scrollToRecords = false,
}: {
  patient: Patient;
  onClose: () => void;
  /** When true, the drawer scrolls to and highlights the External Records zone. */
  scrollToRecords?: boolean;
}) {
  const facesheet = FACESHEET[patient.id] ?? {
    problems: [], medications: [], allergies: [], diagnoses: [], encounters: [],
  };

  // Ref for the External Records section — used when scrollToRecords is true.
  const recordsSectionRef = useRef<HTMLElement>(null);

  // ── Escape key to close ─────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // ── Auto-scroll to External Records when opened via "Attach Document" ──
  useEffect(() => {
    if (!scrollToRecords || !recordsSectionRef.current) return;
    // Delay slightly so the spring slide-in animation completes first.
    const id = setTimeout(() => {
      recordsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 380);
    return () => clearTimeout(id);
  }, [scrollToRecords]);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <motion.aside
        key="drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="
          fixed top-0 right-0 h-full w-[440px] z-50
          flex flex-col
          bg-slate-900 border-l border-slate-800
          shadow-2xl
        "
        aria-label="Patient chart drawer"
        role="complementary"
      >
        {/* ── Drawer header ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h2 className="text-base font-semibold text-white">Patient Facesheet</h2>
            </div>
            <p className="text-sm font-medium text-slate-300">{patient.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              DOB {patient.dob} · {patient.mrn}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close chart drawer"
            className="
              mt-0.5 p-1.5 rounded-lg text-slate-500 hover:text-white
              hover:bg-slate-800 transition-colors flex-shrink-0
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
            "
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Problem List */}
          <section>
            <SectionHeading icon={Stethoscope} label="Problem List" iconColor="text-cyan-400" />
            {facesheet.problems.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No active problems on file.</p>
            ) : (
              <div className="space-y-2">
                {facesheet.problems.map((prob, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.16 }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl
                               bg-slate-800 border border-slate-700/60"
                  >
                    <div>
                      <span className="text-sm font-medium text-slate-200">{prob.description}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Since {prob.onset}</p>
                    </div>
                    <StatusBadge status={prob.status} />
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Active Medications */}
          <section>
            <SectionHeading icon={Heart} label="Active Medications" iconColor="text-cyan-400" />
            {facesheet.medications.length === 0 ? (
              <p className="text-xs text-slate-600 italic">None on file.</p>
            ) : (
              <div className="space-y-2">
                {facesheet.medications.map((med, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.16 }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl
                               bg-slate-800 border border-slate-700/60"
                  >
                    <span className="text-sm font-medium text-slate-200">{med.name}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono">{med.dose}</span>
                      <span>·</span>
                      <span>{med.frequency}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Allergies */}
          <section>
            <SectionHeading icon={AlertTriangle} label="Allergies" iconColor="text-amber-400" />
            {facesheet.allergies.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No known allergies (NKA).</p>
            ) : (
              <div className="space-y-2">
                {facesheet.allergies.map((allergy, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.16 }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl
                               bg-slate-800 border border-slate-700/60"
                  >
                    <div>
                      <span className="text-sm font-medium text-slate-200">{allergy.allergen}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{allergy.reaction}</p>
                    </div>
                    <SeverityBadge severity={allergy.severity} />
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Encounters */}
          <section>
            <SectionHeading icon={Calendar} label="Recent Encounters" iconColor="text-cyan-400" />
            {facesheet.encounters.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No recent encounters on file.</p>
            ) : (
              <div className="space-y-2">
                {facesheet.encounters.map((enc, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.16 }}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700/60"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200">{enc.type}</span>
                        <span className="text-[10px] text-slate-600">·</span>
                        <span className="text-[10px] text-slate-500">{enc.provider}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-600">{enc.date}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{enc.summary}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* External Records — drag-and-drop upload zone */}
          <section ref={recordsSectionRef}>
            <SectionHeading icon={Upload} label="External Records" iconColor="text-cyan-400" />
            <motion.div
              animate={scrollToRecords
                ? { boxShadow: ['0 0 0 0px rgb(34 211 238 / 0)', '0 0 0 3px rgb(34 211 238 / 0.4)', '0 0 0 0px rgb(34 211 238 / 0)'] }
                : {}}
              transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
              className="rounded-xl"
            >
              <ExternalRecordsZone />
            </motion.div>
          </section>
        </div>

        {/* ── Drawer footer ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-slate-800">
          <p className="text-[10px] text-slate-600 text-center">
            Facesheet data is read-only. Edit records in the EHR system.
          </p>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PatientContextBar
// ─────────────────────────────────────────────────────────────────────────────

interface PatientContextBarProps {
  onSelectPatient: (patient: Patient | null) => void;
  /** When provided, auto-selects the matching patient on mount (deep link from My Day). */
  initialPatientId?: string | null;
}

export function PatientContextBar({ onSelectPatient, initialPatientId }: PatientContextBarProps) {
  const { data: session } = useSession();
  const [query,       setQuery]       = useState('');
  const [open,        setOpen]        = useState(false);
  const [selected,    setSelected]    = useState<Patient | null>(null);
  const [chartOpen,   setChartOpen]   = useState(false);
  const [attachMode,  setAttachMode]  = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientDob,  setNewPatientDob]  = useState('');
  const [roster, setRoster] = useState<Patient[]>(DEMO_PATIENTS);
  const activeOrganizationId = session?.user.organizationId ?? 'org-demo-clinic';
  const organizationScopedRoster = filterRecordsForOrganization(roster, activeOrganizationId);

  useEffect(() => {
    if (!initialPatientId || selected) return;
    const match = organizationScopedRoster.find((p) => p.id === initialPatientId);
    if (match) {
      setSelected(match);
      onSelectPatient(match);
    }
  }, [initialPatientId, onSelectPatient, organizationScopedRoster, selected]);

  const filtered = query.trim()
    ? organizationScopedRoster.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.mrn.toLowerCase().includes(query.toLowerCase())
      )
    : organizationScopedRoster;

  function handleAddPatient() {
    if (!newPatientName.trim()) return;
    const id = `P${String(roster.length + 1).padStart(3, '0')}`;
    const newPatient: Patient = {
      id,
      organizationId: activeOrganizationId,
      name: newPatientName.trim(),
      dob: newPatientDob || 'N/A',
      mrn: `MRN-${String(roster.length + 1).padStart(3, '0')}`,
    };
    setRoster((prev) => [...prev, newPatient]);
    select(newPatient);
    setShowNewPatientForm(false);
    setNewPatientName('');
    setNewPatientDob('');
  }

  function select(p: Patient) {
    setSelected(p);
    setQuery('');
    setOpen(false);
    onSelectPatient(p);
  }

  function clear() {
    setSelected(null);
    setQuery('');
    setChartOpen(false);
    setAttachMode(false);
    onSelectPatient(null);
  }

  function handleCloseDrawer() {
    setChartOpen(false);
    setAttachMode(false);
  }

  function openAttachDocument() {
    setAttachMode(true);
    setChartOpen(true);
  }

  return (
    <>
      <div className="
        flex-shrink-0 px-4 py-2.5 border-b
        bg-slate-50 dark:bg-slate-800/50
        border-slate-200 dark:border-slate-700/60
      ">
        <div className="flex items-center gap-3 max-w-2xl">
          <span className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0
                           text-slate-500 dark:text-slate-400">
            Patient
          </span>

          <div className="relative flex-1 max-w-xs">
            {selected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                             bg-cyan-50 dark:bg-cyan-900/25
                             border border-cyan-200 dark:border-cyan-700/50">
                <User className="w-3 h-3 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {selected.name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-500">
                  {selected.dob} · {selected.mrn}
                </span>
                <button
                  onClick={clear}
                  aria-label="Clear patient selection"
                  className="ml-1 flex-shrink-0 rounded text-slate-400 hover:text-slate-600
                             dark:hover:text-slate-200 transition-colors
                             focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2
                                     w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    role="combobox"
                    aria-label="Search patients"
                    aria-controls="patient-search-results"
                    aria-expanded={open}
                    aria-autocomplete="list"
                    placeholder="Search patients..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    className="
                      w-full pl-8 pr-3 py-1.5 text-xs rounded-xl
                      bg-white dark:bg-slate-900
                      border border-slate-200 dark:border-slate-600
                      text-slate-700 dark:text-slate-300
                      placeholder-slate-400 dark:placeholder-slate-500
                      focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent
                      transition-colors
                    "
                  />
                </div>

                {open && filtered.length > 0 && (
                  <ul
                    id="patient-search-results"
                    role="listbox"
                    aria-label="Patient search results"
                    className="
                      absolute top-full left-0 right-0 mt-1 z-50 rounded-xl overflow-hidden
                      bg-white dark:bg-slate-800
                      border border-slate-200 dark:border-slate-700
                      shadow-xl
                    "
                  >
                    {filtered.map((p) => (
                      <li
                        key={p.id}
                        role="option"
                        aria-selected={false}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => select(p)}
                        className="
                          flex items-center gap-2.5 px-3 py-2.5 cursor-pointer
                          hover:bg-slate-50 dark:hover:bg-slate-700/60
                          transition-colors
                        "
                      >
                        <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          DOB {p.dob} · {p.mrn}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {selected && (
            <>
              {/* View Chart */}
              <motion.button
                onClick={() => { setAttachMode(false); setChartOpen(true); }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                aria-label="View patient chart"
                className="
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold
                  text-cyan-700 dark:text-cyan-400
                  bg-cyan-50 dark:bg-cyan-500/10
                  border border-cyan-200 dark:border-cyan-500/25
                  hover:bg-cyan-100 dark:hover:bg-cyan-500/20
                  transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                  focus-visible:ring-offset-1
                "
              >
                <Eye className="w-3 h-3" />
                View Chart
              </motion.button>

              {/* Attach Document — opens drawer and scrolls to External Records */}
              <motion.button
                onClick={openAttachDocument}
                whileHover={{
                  backgroundColor: 'rgb(30 41 59 / 0.9)', // slate-800
                  transition: { duration: 0.12 },
                }}
                whileTap={{ scale: 0.95 }}
                aria-label="Attach document to patient chart"
                className="
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold
                  text-slate-500 dark:text-slate-400
                  bg-transparent
                  border border-slate-200 dark:border-slate-700/60
                  transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                  focus-visible:ring-offset-1
                "
              >
                <Upload className="w-3 h-3" />
                Attach Document
              </motion.button>
            </>
          )}

          {!selected && !showNewPatientForm && (
            <button
              onClick={() => setShowNewPatientForm(true)}
              className="
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold
                text-slate-600 dark:text-slate-400
                border border-dashed border-slate-300 dark:border-slate-600
                hover:border-cyan-400 dark:hover:border-cyan-500
                hover:text-cyan-600 dark:hover:text-cyan-400
                transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
              "
            >
              <UserPlus className="w-3 h-3" />
              Add Patient
            </button>
          )}

          {showNewPatientForm && !selected && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Full name"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddPatient(); }}
                autoFocus
                className="
                  px-2.5 py-1.5 text-xs rounded-lg w-36
                  bg-white dark:bg-slate-900
                  border border-slate-200 dark:border-slate-600
                  text-slate-700 dark:text-slate-300
                  placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-cyan-400
                "
              />
              <input
                type="text"
                placeholder="DOB (MM/DD/YYYY)"
                value={newPatientDob}
                onChange={(e) => setNewPatientDob(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddPatient(); }}
                className="
                  px-2.5 py-1.5 text-xs rounded-lg w-32
                  bg-white dark:bg-slate-900
                  border border-slate-200 dark:border-slate-600
                  text-slate-700 dark:text-slate-300
                  placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-cyan-400
                "
              />
              <button
                onClick={handleAddPatient}
                disabled={!newPatientName.trim()}
                className="
                  px-2.5 py-1.5 text-[11px] font-semibold rounded-lg
                  bg-cyan-600 text-white hover:bg-cyan-500
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                Add
              </button>
              <button
                onClick={() => { setShowNewPatientForm(false); setNewPatientName(''); setNewPatientDob(''); }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {!selected && !showNewPatientForm && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block">
              Select a patient to enable recording &amp; CDSS sync.
            </p>
          )}
        </div>
      </div>

      {chartOpen && selected && (
        <PatientChartDrawer
          patient={selected}
          onClose={handleCloseDrawer}
          scrollToRecords={attachMode}
        />
      )}
    </>
  );
}
