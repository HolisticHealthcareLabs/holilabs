'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Stethoscope, CalendarClock, ClipboardList, Activity,
  FileText, CheckCircle2, Clock, Hospital, ExternalLink, Loader2,
  HeartPulse, Sparkles, TrendingUp,
} from 'lucide-react';

type Phase = 'PRE_OP' | 'INTRA_OP' | 'POST_OP' | 'FOLLOW_UP';
type TaskKind =
  | 'SYMPTOM_CHECK' | 'MOBILIZATION' | 'DIETARY' | 'WOUND_CARE'
  | 'MEDICATION' | 'PROM_ASSESSMENT' | 'APPOINTMENT' | 'EDUCATION';

interface TemplateTask {
  id: string;
  orderIndex: number;
  phase: Phase;
  dayOffset: number;
  kind: TaskKind;
  title: string;
  instructions: string;
  promInstrumentSlug: string | null;
}

interface CarePlanTemplate {
  id: string;
  slug: string;
  procedureName: string;
  description: string;
  protocolSource: string;
  citationUrl: string | null;
  version: string;
  tasks: TemplateTask[];
}

interface PromInstrument {
  id: string;
  slug: string;
  name: string;
  displayEn: string;
  displayPt: string | null;
  displayEs: string | null;
  description: string;
  version: string;
  licensingNote: string | null;
  citationPmid: string | null;
  itemCount: number;
}

const PHASE_META: Record<Phase, { label: string; color: string; order: number }> = {
  PRE_OP:    { label: 'Pre-op',    color: 'bg-amber-50 text-amber-800 border-amber-200', order: 0 },
  INTRA_OP:  { label: 'Intra-op',  color: 'bg-rose-50 text-rose-800 border-rose-200',    order: 1 },
  POST_OP:   { label: 'Post-op',   color: 'bg-blue-50 text-blue-800 border-blue-200',    order: 2 },
  FOLLOW_UP: { label: 'Follow-up', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', order: 3 },
};

const KIND_META: Record<TaskKind, { label: string; icon: React.ReactNode }> = {
  SYMPTOM_CHECK:   { label: 'Symptoms',    icon: <HeartPulse className="w-3.5 h-3.5" /> },
  MOBILIZATION:    { label: 'Mobilize',    icon: <TrendingUp className="w-3.5 h-3.5" /> },
  DIETARY:         { label: 'Diet',        icon: <Sparkles className="w-3.5 h-3.5" /> },
  WOUND_CARE:      { label: 'Wound',       icon: <FileText className="w-3.5 h-3.5" /> },
  MEDICATION:      { label: 'Medication',  icon: <Activity className="w-3.5 h-3.5" /> },
  PROM_ASSESSMENT: { label: 'PROM',        icon: <ClipboardList className="w-3.5 h-3.5" /> },
  APPOINTMENT:     { label: 'Appointment', icon: <CalendarClock className="w-3.5 h-3.5" /> },
  EDUCATION:       { label: 'Education',   icon: <FileText className="w-3.5 h-3.5" /> },
};

export default function RecoveryDashboardPage() {
  const [templates, setTemplates] = useState<CarePlanTemplate[]>([]);
  const [instruments, setInstruments] = useState<PromInstrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTemplateSlug, setExpandedTemplateSlug] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/care-plans/templates').then((r) => r.json()),
      fetch('/api/proms/instruments').then((r) => r.json()),
    ])
      .then(([tpl, inst]) => {
        setTemplates(tpl.data ?? []);
        setInstruments(inst.data ?? []);
        if (tpl.data?.[0]) setExpandedTemplateSlug(tpl.data[0].slug);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/find-doctor/preop-screening"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg font-medium"
            >
              Supplement screener
            </Link>
            <Link
              href="/find-doctor/preop-calculators"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium"
            >
              Risk calculators
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-start gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg flex-shrink-0">
            <Hospital className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Recovery tracker</h1>
            <p className="text-slate-600 max-w-3xl">
              ERAS care-plan templates that auto-schedule longitudinal PROM assessments at baseline,
              day 7, day 30, and day 90. Built from the ERAS Society protocols and HealthMeasures
              PROMIS-29 v2.1. Assign a template to a patient and every task + questionnaire is
              materialized around their surgery date.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Templates (main column) ── */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                Care-plan templates ({templates.length})
              </h2>

              {templates.map((t) => {
                const expanded = expandedTemplateSlug === t.slug;
                const tasksByPhase = groupByPhase(t.tasks);
                return (
                  <div key={t.id} className="bg-white rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setExpandedTemplateSlug(expanded ? null : t.slug)}
                      className="w-full text-left p-6 flex items-start justify-between gap-3"
                    >
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-1">{t.procedureName}</h3>
                        <p className="text-sm text-slate-500">{t.protocolSource}</p>
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          <span className="text-xs text-slate-400">
                            {t.tasks.length} tasks · v{t.version}
                          </span>
                          {t.citationUrl && (
                            <a
                              href={t.citationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 text-xs text-emerald-600 hover:underline"
                            >
                              Protocol source <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">{expanded ? '—' : '+'}</span>
                    </button>

                    {expanded && (
                      <div className="px-6 pb-6 border-t border-slate-100">
                        <p className="text-sm text-slate-600 my-4">{t.description}</p>
                        <div className="space-y-5">
                          {(Object.keys(PHASE_META) as Phase[])
                            .filter((ph) => tasksByPhase[ph]?.length)
                            .sort((a, b) => PHASE_META[a].order - PHASE_META[b].order)
                            .map((ph) => (
                              <div key={ph}>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PHASE_META[ph].color}`}>
                                    {PHASE_META[ph].label}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {tasksByPhase[ph].length} task{tasksByPhase[ph].length === 1 ? '' : 's'}
                                  </span>
                                </div>
                                <ul className="space-y-2">
                                  {tasksByPhase[ph].map((task) => (
                                    <li
                                      key={task.id}
                                      className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
                                    >
                                      <div className="flex-shrink-0 mt-1 text-slate-500">
                                        {KIND_META[task.kind].icon}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                          <span className="text-xs font-semibold text-slate-900 tabular-nums">
                                            {formatDay(task.dayOffset)}
                                          </span>
                                          <span className="text-sm font-medium text-slate-900">
                                            {task.title}
                                          </span>
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                            {KIND_META[task.kind].label}
                                          </span>
                                          {task.promInstrumentSlug && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                              → {task.promInstrumentSlug}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                          {task.instructions}
                                        </p>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {templates.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <p className="text-sm text-slate-500">No templates available yet.</p>
                </div>
              )}
            </div>

            {/* ── Instruments sidebar ── */}
            <aside className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                PROM instruments ({instruments.length})
              </h2>

              {instruments.map((i) => (
                <div key={i.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-900 mb-1">{i.displayEn}</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    {i.version} · {i.itemCount} items
                  </p>
                  <p className="text-sm text-slate-600 mb-3 line-clamp-3">{i.description}</p>
                  {i.citationPmid && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${i.citationPmid}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-xs text-emerald-600 hover:underline"
                    >
                      PMID {i.citationPmid} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {i.licensingNote && (
                    <p className="text-[10px] text-slate-400 mt-3 italic leading-relaxed">
                      {i.licensingNote}
                    </p>
                  )}
                </div>
              ))}

              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
                <h3 className="font-semibold text-emerald-900 mb-1 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Wired end-to-end
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Assigning an ERAS template to a patient auto-creates scheduled PROMIS-29
                  assessments at baseline, day 7, day 30, and day 90. One call
                  (<code className="text-[10px]">POST /api/care-plans/assign</code>) materializes
                  the full recovery pathway.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function groupByPhase(tasks: TemplateTask[]): Record<Phase, TemplateTask[]> {
  return tasks.reduce<Record<Phase, TemplateTask[]>>(
    (acc, t) => {
      (acc[t.phase] ??= []).push(t);
      return acc;
    },
    { PRE_OP: [], INTRA_OP: [], POST_OP: [], FOLLOW_UP: [] },
  );
}

function formatDay(offset: number): string {
  if (offset === 0) return 'POD 0';
  if (offset > 0) return `POD +${offset}`;
  return `Day ${offset}`;
}
