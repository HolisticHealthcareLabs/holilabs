'use client';

import { useEffect, useMemo, useState } from 'react';
 
 type HealthDomain =
   | 'cardiometabolic'
   | 'oncology'
   | 'musculoskeletal'
   | 'neurocognitive'
   | 'gut'
   | 'immune'
   | 'hormonal';
 
 type InterventionStatus = 'due' | 'overdue' | 'completed' | 'scheduled' | 'declined';
 
 type InterventionType =
   | 'screening'
   | 'lab'
   | 'lifestyle'
   | 'supplement'
   | 'diet'
   | 'exercise'
   | 'medication'
   | 'referral'
   | 'education';
 
 type HubRiskScore = {
   id: string;
   name: string;
   score: number;
   level: 'low' | 'moderate' | 'high' | 'very-high';
   lastCalculated: Date;
   nextDue: Date;
 };
 
 type HubIntervention = {
   id: string;
   name: string;
   domain: HealthDomain;
   type: InterventionType;
   status: InterventionStatus;
   dueDate?: Date;
   completedDate?: Date;
   scheduledDate?: Date;
   description: string;
   evidence: string;
   aiRecommendation?: string;
 };
 
 type HubSummary = {
   overdueCount: number;
   dueCount: number;
   scheduledCount: number;
   completedCount: number;
   totalActive: number;
 };
 
 type HubPayload = {
   patient: { id: string; age: number; gender: string; firstName?: string; lastName?: string };
   riskScores: HubRiskScore[];
   activeInterventions: HubIntervention[];
   completedInterventions: HubIntervention[];
   summary: HubSummary;
   processingTimeMs: number;
 };
 
 function domainToSpecialty(domain: HealthDomain): string {
   const map: Record<HealthDomain, string> = {
     cardiometabolic: 'Cardiology',
     oncology: 'Oncology',
     musculoskeletal: 'Orthopedics',
     neurocognitive: 'Neurology',
     gut: 'Gastroenterology',
     immune: 'Immunology',
     hormonal: 'Endocrinology',
   };
   return map[domain] || 'Internal Medicine';
 }
 
 function formatDate(d?: Date) {
   if (!d) return '';
   try {
     return d.toLocaleDateString();
   } catch {
     return '';
   }
 }
 
 export function CoPilotPreventionHubMini({
   patientId,
   refreshToken,
   onOpenFullHub,
 }: {
   patientId: string;
   /** Change this value to trigger a refetch (e.g., last realtime update ms). */
   refreshToken?: number | string | null;
   onOpenFullHub: () => void;
 }) {
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string>('');
   const [data, setData] = useState<HubPayload | null>(null);
   const [expanded, setExpanded] = useState(true);
   const [busyId, setBusyId] = useState<string | null>(null);
 
   const riskTop = useMemo(() => (data?.riskScores || []).slice(0, 3), [data?.riskScores]);
   const dueList = useMemo(() => {
     const items = (data?.activeInterventions || []).slice();
     const rank = (s: InterventionStatus) => (s === 'overdue' ? 0 : s === 'due' ? 1 : s === 'scheduled' ? 2 : 3);
     items.sort((a, b) => rank(a.status) - rank(b.status));
     return items.slice(0, 6);
   }, [data?.activeInterventions]);
 
   const fetchHub = async () => {
     setLoading(true);
     setError('');
     try {
       const res = await fetch(`/api/prevention/hub/${patientId}`, { cache: 'no-store' });
       const json = await res.json().catch(() => ({}));
       if (!res.ok) throw new Error(json?.error || `Failed to load prevention hub (${res.status})`);
       if (!json?.success || !json?.data) throw new Error('Invalid prevention hub response');
 
       const raw = json.data as any;
       const mapped: HubPayload = {
         patient: raw.patient,
         summary: raw.summary,
         processingTimeMs: raw.processingTimeMs,
         riskScores: (raw.riskScores || []).map((r: any) => ({
           ...r,
           lastCalculated: new Date(r.lastCalculated),
           nextDue: new Date(r.nextDue),
         })),
         activeInterventions: (raw.activeInterventions || []).map((i: any) => ({
           ...i,
           dueDate: i.dueDate ? new Date(i.dueDate) : undefined,
           completedDate: i.completedDate ? new Date(i.completedDate) : undefined,
           scheduledDate: i.scheduledDate ? new Date(i.scheduledDate) : undefined,
         })),
         completedInterventions: (raw.completedInterventions || []).map((i: any) => ({
           ...i,
           dueDate: i.dueDate ? new Date(i.dueDate) : undefined,
           completedDate: i.completedDate ? new Date(i.completedDate) : undefined,
           scheduledDate: i.scheduledDate ? new Date(i.scheduledDate) : undefined,
         })),
       };
       setData(mapped);
     } catch (e: any) {
       setError(e?.message || 'Failed to load prevention hub');
       setData(null);
     } finally {
       setLoading(false);
     }
   };
 
   useEffect(() => {
     void fetchHub();
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [patientId]);
 
   useEffect(() => {
     if (!refreshToken) return;
     void fetchHub();
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [refreshToken]);
 
   const markComplete = async (interventionId: string) => {
     setBusyId(interventionId);
     setError('');
     try {
       const res = await fetch('/api/prevention/hub/mark-complete', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ interventionId }),
       });
       const json = await res.json().catch(() => ({}));
       if (!res.ok) throw new Error(json?.error || 'Failed to mark complete');
       await fetchHub();
     } catch (e: any) {
       setError(e?.message || 'Failed to mark complete');
     } finally {
       setBusyId(null);
     }
   };
 
   const createOrder = async (i: HubIntervention) => {
     setBusyId(i.id);
     setError('');
     try {
       const orderType: 'lab' | 'imaging' | 'procedure' =
         i.type === 'lab' ? 'lab' : i.type === 'screening' ? 'imaging' : 'procedure';
       const res = await fetch('/api/prevention/hub/create-order', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           patientId,
           orderType,
           orderDetails: { code: i.id, display: i.name },
           priority: i.status === 'overdue' ? 'urgent' : 'routine',
           linkedInterventionId: i.id,
           notes: i.description,
         }),
       });
       const json = await res.json().catch(() => ({}));
       if (!res.ok) throw new Error(json?.error || 'Failed to create order');
     } catch (e: any) {
       setError(e?.message || 'Failed to create order');
     } finally {
       setBusyId(null);
     }
   };
 
   const createReferral = async (i: HubIntervention) => {
     setBusyId(i.id);
     setError('');
     try {
       const res = await fetch('/api/prevention/hub/create-referral', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           patientId,
           specialty: domainToSpecialty(i.domain),
           reason: i.name,
           urgency: i.status === 'overdue' ? 'urgent' : 'routine',
           linkedInterventionId: i.id,
           notes: i.description,
         }),
       });
       const json = await res.json().catch(() => ({}));
       if (!res.ok) throw new Error(json?.error || 'Failed to create referral');
     } catch (e: any) {
       setError(e?.message || 'Failed to create referral');
     } finally {
       setBusyId(null);
     }
   };
 
   const createTask = async (i: HubIntervention) => {
     setBusyId(i.id);
     setError('');
     try {
       const res = await fetch('/api/prevention/hub/create-patient-task', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           patientId,
           title: i.name,
           description: i.description || i.evidence || 'Follow prevention guidance',
           taskType: 'self_care',
           linkedInterventionId: i.id,
         }),
       });
       const json = await res.json().catch(() => ({}));
       if (!res.ok) throw new Error(json?.error || 'Failed to create task');
     } catch (e: any) {
       setError(e?.message || 'Failed to create task');
     } finally {
       setBusyId(null);
     }
   };
 
   return (
     <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-800/40 bg-white/80 dark:bg-gray-800/70 backdrop-blur-xl shadow-lg overflow-hidden">
       <div className="px-5 py-4 flex items-center justify-between border-b border-emerald-200/50 dark:border-emerald-800/30">
         <div className="flex items-center gap-3">
           <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
             <span className="text-lg">🧭</span>
           </div>
           <div>
             <div className="text-sm font-bold text-gray-900 dark:text-white">Prevention Hub</div>
             <div className="text-xs text-gray-600 dark:text-gray-300">
               {loading ? 'Loading…' : data?.summary ? `${data.summary.overdueCount} overdue • ${data.summary.dueCount} due` : '—'}
             </div>
           </div>
         </div>
         <div className="flex items-center gap-2">
           <button
             onClick={onOpenFullHub}
             className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
           >
             View full hub
           </button>
           <button
             onClick={() => setExpanded((v) => !v)}
             className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200"
           >
             {expanded ? 'Hide' : 'Show'}
           </button>
         </div>
       </div>
 
       {expanded ? (
         <div className="p-5 space-y-4">
           {error ? (
             <div className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-3">
               {error}
             </div>
           ) : null}
 
           <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
             <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/30 p-4">
               <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Overdue</div>
               <div className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">
                 {data?.summary?.overdueCount ?? '—'}
               </div>
             </div>
             <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/30 p-4">
               <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Due</div>
               <div className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">
                 {data?.summary?.dueCount ?? '—'}
               </div>
             </div>
             <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/30 p-4">
               <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Scheduled</div>
               <div className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                 {data?.summary?.scheduledCount ?? '—'}
               </div>
             </div>
           </div>
 
           {riskTop.length ? (
             <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/30 p-4">
               <div className="flex items-center justify-between mb-2">
                 <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Risk scores</div>
               </div>
               <div className="space-y-2">
                 {riskTop.map((r) => (
                   <div key={r.id} className="flex items-center justify-between text-sm">
                     <div className="text-gray-900 dark:text-white font-medium truncate">{r.name}</div>
                     <div className="text-gray-700 dark:text-gray-200 font-semibold">{Math.round(r.score)}%</div>
                   </div>
                 ))}
               </div>
             </div>
           ) : null}
 
           <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/30 p-4">
             <div className="flex items-center justify-between mb-2">
               <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Next interventions</div>
               <button
                 onClick={() => void fetchHub()}
                 className="text-xs font-semibold text-gray-700 dark:text-gray-200 hover:underline"
               >
                 Refresh
               </button>
             </div>
             {loading ? (
               <div className="text-sm text-gray-600 dark:text-gray-300">Loading…</div>
             ) : dueList.length ? (
               <div className="space-y-3">
                 {dueList.map((i) => {
                   const busy = busyId === i.id;
                   const badge =
                     i.status === 'overdue'
                       ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                       : i.status === 'due'
                         ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                         : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
 
                   return (
                     <div key={i.id} className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-900/40 p-3">
                       <div className="flex items-start justify-between gap-3">
                         <div className="min-w-0">
                           <div className="flex items-center gap-2">
                             <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badge}`}>
                               {i.status.toUpperCase()}
                             </span>
                             <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{i.name}</div>
                           </div>
                           <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                             {i.dueDate ? `Due ${formatDate(i.dueDate)}` : i.scheduledDate ? `Scheduled ${formatDate(i.scheduledDate)}` : ''}
                           </div>
                         </div>
                         <div className="flex items-center gap-1 flex-shrink-0">
                           <button
                             disabled={busy}
                             onClick={() => void createOrder(i)}
                             className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                             title="Create order"
                           >
                             Order
                           </button>
                           <button
                             disabled={busy}
                             onClick={() => void createReferral(i)}
                             className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                             title="Create referral"
                           >
                             Refer
                           </button>
                           <button
                             disabled={busy}
                             onClick={() => void createTask(i)}
                             className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                             title="Assign patient task"
                           >
                             Task
                           </button>
                           <button
                             disabled={busy}
                             onClick={() => void markComplete(i.id)}
                             className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                             title="Mark complete"
                           >
                             {busy ? '…' : 'Done'}
                           </button>
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
             ) : (
               <div className="text-sm text-gray-700 dark:text-gray-200">No active interventions found.</div>
             )}
           </div>
         </div>
       ) : null}
     </div>
   );
 }
 
