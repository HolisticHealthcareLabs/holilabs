'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Eye, Upload } from 'lucide-react';
import type { DrawerImagingStudy } from '../_data/demo-facesheet';

const MODALITY_ICONS: Record<string, string> = {
  'X-Ray': 'XR',
  'CT': 'CT',
  'MRI': 'MR',
  'Ultrasound': 'US',
  'Mammography': 'MG',
  'PET': 'PT',
};

const STATUS_STYLES: Record<DrawerImagingStudy['status'], string> = {
  COMPLETED:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  REPORTED:    'bg-violet-500/15  text-violet-400  border-violet-500/30',
  SCHEDULED:   'bg-blue-500/15    text-blue-400    border-blue-500/30',
  IN_PROGRESS: 'bg-amber-500/15   text-amber-400   border-amber-500/30',
};

function formatStudyDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

interface DrawerImagingPanelProps {
  studies: DrawerImagingStudy[];
  onSwitchToDocuments: () => void;
  onStudySelect?: (study: DrawerImagingStudy) => void;
}

export function DrawerImagingPanel({ studies, onSwitchToDocuments, onStudySelect }: DrawerImagingPanelProps) {
  const t = useTranslations('dashboard.clinicalCommand');

  if (studies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center mb-4">
          <Eye className="w-5 h-5 text-slate-600" />
        </div>
        <p className="text-sm font-medium text-slate-400 mb-1">{t('noImagingStudies')}</p>
        <p className="text-xs text-slate-600 text-center mb-4">{t('uploadDicomCta')}</p>
        <button
          onClick={onSwitchToDocuments}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                     text-cyan-400 bg-cyan-500/10 border border-cyan-500/25
                     hover:bg-cyan-500/20 transition-colors"
        >
          <Upload className="w-3 h-3" />
          {t('uploadRecordsCta')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {studies.map((study, i) => (
        <motion.button
          key={study.id}
          type="button"
          onClick={() => onStudySelect?.(study)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.15 }}
          className="w-full text-left grid grid-cols-[64px_1fr] gap-3 px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700/60 hover:border-cyan-500/30 hover:bg-slate-800/80 transition-all cursor-pointer group"
        >
          {/* Thumbnail — 64×64 rounded */}
          <div className="w-16 h-16 rounded-lg overflow-hidden relative ring-1 ring-white/5 group-hover:ring-cyan-500/20 transition-all self-start">
            <img src={study.thumbnailUrl || ''} alt="" className="w-full h-full object-cover" />
            <span className="absolute bottom-0 right-0 text-[7px] font-bold bg-black/70 text-white px-1 py-px rounded-tl">
              {MODALITY_ICONS[study.modality] ?? study.modality.slice(0, 2).toUpperCase()}
            </span>
          </div>

          {/* Info — aligned right column */}
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-medium text-slate-200 truncate group-hover:text-white transition-colors">{study.description}</span>
              {study.isAbnormal && (
                <span className="shrink-0 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">ABN</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span>{study.bodyPart}</span>
              <span className="text-slate-700">&middot;</span>
              <span>{formatStudyDate(study.studyDate)}</span>
              <span className="text-slate-700">&middot;</span>
              <span className={`font-bold uppercase px-1 py-px rounded border ${STATUS_STYLES[study.status]}`}>
                {study.status.replace('_', ' ')}
              </span>
            </div>
            {/* Physicians — amber for doctors */}
            {(study.reportingPhysician || study.radiologist || study.orderingPhysician) && (
              <div className="flex items-center gap-1.5 text-[10px]">
                {(study.reportingPhysician || study.radiologist) && (
                  <span className="text-amber-400 truncate">{study.reportingPhysician || study.radiologist}</span>
                )}
                {(study.reportingPhysician || study.radiologist) && study.orderingPhysician && (
                  <span className="text-slate-700">&middot;</span>
                )}
                {study.orderingPhysician && (
                  <span className="text-amber-400/70 truncate">ord. {study.orderingPhysician}</span>
                )}
              </div>
            )}
            {/* Findings — one-line truncated */}
            {study.findings && (
              <p className="text-[10px] text-slate-500 truncate leading-tight">{study.findings}</p>
            )}
          </div>
        </motion.button>
      ))}
    </div>
  );
}
