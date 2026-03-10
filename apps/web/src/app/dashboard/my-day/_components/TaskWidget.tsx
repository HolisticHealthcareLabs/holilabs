'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ChevronRight, FileSignature, ShieldCheck, FlaskConical, CheckCircle2, X, Bell } from 'lucide-react';
import { nudgeProvider } from '@/app/actions/schedule';

export interface TaskItem {
  id: string;
  label: string;
  count: number;
  icon: 'signature' | 'auth' | 'lab' | 'generic';
  urgency: 'high' | 'medium' | 'low';
  href?: string;
}

const ICON_MAP = {
  signature:  FileSignature,
  auth:       ShieldCheck,
  lab:        FlaskConical,
  generic:    CheckCircle2,
};

const URGENCY_STYLE = {
  high:   { badge: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',   ring: 'ring-red-200 dark:ring-red-500/20' },
  medium: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', ring: 'ring-amber-200 dark:ring-amber-500/20' },
  low:    { badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300', ring: 'ring-slate-200 dark:ring-slate-600' },
};

const ADMIN_ROLES = ['ADMIN', 'ORG_ADMIN', 'FRONT_DESK', 'RECEPTIONIST', 'STAFF'];

const MOCK_UNSIGNED_NOTES = [
  { noteId: 'note-001', patientName: "James O'Brien", provider: 'Dr. Ricardo Silva', date: 'Mar 5, 2026', encounter: 'Chest tightness, bilateral ankle edema' },
  { noteId: 'note-002', patientName: 'Robert Chen', provider: 'Dr. Ricardo Silva', date: 'Mar 4, 2026', encounter: 'Warfarin INR check, atrial fibrillation management' },
];

interface TaskWidgetProps {
  tasks: TaskItem[];
  userRole?: string;
}

export function TaskWidget({ tasks, userRole = 'CLINICIAN' }: TaskWidgetProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [nudgeStatus, setNudgeStatus] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const normalizedRole = userRole.toUpperCase();
  const isAdminView = ADMIN_ROLES.includes(normalizedRole);

  function handleNudge(noteId: string, providerName: string) {
    startTransition(async () => {
      const result = await nudgeProvider({ noteId, providerName });
      if (result.success) {
        setNudgeStatus((prev) => ({ ...prev, [noteId]: 'sent' }));
      }
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6">
        <div className="w-12 h-12 rounded-full flex items-center justify-center
                        bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 mb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
          All caught up
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-[200px]">
          No pending tasks or unsigned notes. Great work.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {tasks.map((task) => {
          const Icon = ICON_MAP[task.icon];
          const urgency = URGENCY_STYLE[task.urgency];
          const href = task.href || '/dashboard/my-day';

          const isUnsignedNotes = task.icon === 'signature';

          if (isAdminView && isUnsignedNotes) {
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="
                  w-full flex items-center gap-3 px-4 py-3.5
                  hover:bg-slate-50 dark:hover:bg-slate-800/40
                  transition-colors group cursor-pointer text-left
                "
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ${urgency.ring} bg-white dark:bg-slate-800`}>
                  <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{task.label}</p>
                </div>
                <span className={`inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 rounded-full text-[11px] font-bold flex-shrink-0 ${urgency.badge}`}>
                  {task.count}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
              </button>
            );
          }

          return (
            <Link
              key={task.id}
              href={href}
              prefetch
              className="
                flex items-center gap-3 px-4 py-3.5
                hover:bg-slate-50 dark:hover:bg-slate-800/40
                transition-colors group cursor-pointer
              "
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ${urgency.ring} bg-white dark:bg-slate-800`}>
                <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{task.label}</p>
              </div>
              <span className={`inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 rounded-full text-[11px] font-bold flex-shrink-0 ${urgency.badge}`}>
                {task.count}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
            </Link>
          );
        })}
      </div>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <aside className="fixed top-0 right-0 h-full w-[380px] max-w-[90vw] z-50 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Unsigned SOAP Notes</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Send a reminder to the provider</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {MOCK_UNSIGNED_NOTES.map((note) => (
                <div key={note.noteId} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{note.patientName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{note.encounter}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{note.provider} - {note.date}</p>
                    </div>
                    {nudgeStatus[note.noteId] === 'sent' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Sent
                      </span>
                    ) : (
                      <button
                        onClick={() => handleNudge(note.noteId, note.provider)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30 dark:hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
                      >
                        <Bell className="w-3 h-3" />
                        Nudge Provider
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
