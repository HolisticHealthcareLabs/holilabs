'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Send, Inbox, CheckCircle2, XCircle, Clock, Loader2, AlertCircle,
  Leaf, Heart, Sparkles, Activity, ExternalLink, ArrowRight, MapPin,
} from 'lucide-react';
import { MetricCard, Alert, EmptyState, SectionHeader } from '@/components/ui/premium';

type SystemType = 'CONVENTIONAL' | 'INTEGRATIVE' | 'TRADITIONAL' | 'COMPLEMENTARY';
type Status = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'EXPIRED';
type InboxTab = 'received' | 'sent';

interface Physician {
  id: string;
  name: string;
  country: string;
  addressCity: string | null;
  addressState: string | null;
}
interface Referral {
  id: string;
  from: Physician;
  to: Physician;
  reason: string;
  fromSystemType: SystemType;
  toSystemType: SystemType;
  isCrossModality: boolean;
  initiationSource: string;
  status: Status;
  acceptedAt: string | null;
  completedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  scheduledFor: string | null;
  outcomeSummary: string | null;
  createdAt: string;
  youAre: 'sender' | 'recipient';
}

const SYSTEM_ICON: Record<SystemType, React.ReactNode> = {
  CONVENTIONAL:  <Activity className="w-3.5 h-3.5" />,
  INTEGRATIVE:   <Heart className="w-3.5 h-3.5" />,
  TRADITIONAL:   <Leaf className="w-3.5 h-3.5" />,
  COMPLEMENTARY: <Sparkles className="w-3.5 h-3.5" />,
};
const SYSTEM_COLOR: Record<SystemType, string> = {
  CONVENTIONAL:  'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20',
  INTEGRATIVE:   'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20',
  TRADITIONAL:   'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
  COMPLEMENTARY: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
};

export default function ClinicalReferralsInboxPage() {
  const [tab, setTab] = useState<InboxTab>('received');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [declineReasonById, setDeclineReasonById] = useState<Record<string, string>>({});
  const [outcomeById, setOutcomeById] = useState<Record<string, string>>({});

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/referrals?as=${tab === 'received' ? 'recipient' : 'sender'}&limit=50`);
      if (res.status === 401) {
        window.location.href = '/sign-in?next=/dashboard/clinical-referrals';
        return;
      }
      if (res.status === 403) {
        setError('Your account needs a claimed physician profile to use clinical referrals.');
        return;
      }
      if (!res.ok) throw new Error('Unable to load referrals');
      const data = await res.json();
      setReferrals(data.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load referrals');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchReferrals(); }, [fetchReferrals]);

  const doAction = async (
    url: string,
    method: 'POST',
    body: Record<string, unknown>,
    id: string,
  ) => {
    setActingId(id);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Action failed');
      await fetchReferrals();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActingId(null);
    }
  };

  const counts = {
    pending: referrals.filter((r) => r.status === 'PENDING').length,
    accepted: referrals.filter((r) => r.status === 'ACCEPTED').length,
    completed: referrals.filter((r) => r.status === 'COMPLETED').length,
    crossModality: referrals.filter((r) => r.isCrossModality).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-6xl mx-auto px-6 py-8 lg:py-10 space-y-6">
        {/* Page header */}
        <SectionHeader
          eyebrow="Clinical network"
          title="Referrals"
          description="Track patients you refer to — and patients referred to you. Cross-modality referrals between conventional, integrative, traditional, and complementary systems appear here with a disclosure trail and completion tracking."
          action={
            <Link
              href="/dashboard/find-doctor"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold shadow-sm hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
            >
              <Send className="w-4 h-4" />
              New referral
            </Link>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Clock}         label="Pending review"  value={counts.pending}       accent="amber"   index={0} />
          <MetricCard icon={CheckCircle2}  label="Accepted"        value={counts.accepted}      accent="sky"     index={1} />
          <MetricCard icon={CheckCircle2}  label="Completed"       value={counts.completed}     accent="emerald" index={2} />
          <MetricCard icon={Heart}         label="Cross-modality"  value={counts.crossModality} accent="violet"  index={3} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl w-fit">
          {([
            { key: 'received', label: 'Received', icon: Inbox },
            { key: 'sent',     label: 'Sent',     icon: Send },
          ] as const).map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                aria-pressed={active}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                {t.label}
              </button>
            );
          })}
        </div>

        {error && (
          <Alert
            tone={error.toLowerCase().includes('physician profile') ? 'warning' : 'danger'}
            title={error.toLowerCase().includes('physician profile') ? 'Claim your physician profile to unlock referrals' : 'Something went wrong'}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-slate-400 dark:text-slate-500 animate-spin" strokeWidth={1.5} />
          </div>
        ) : referrals.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-900/60">
            <EmptyState
              icon={Inbox}
              accent="slate"
              title={tab === 'received' ? 'Your inbox is empty' : 'No referrals sent yet'}
              description={
                tab === 'received'
                  ? 'When colleagues refer patients to you, they will appear here. Cross-modality referrals are highlighted.'
                  : 'Send your first referral from any provider profile in the directory. Cross-modality referrals accrue toward your care-network badge.'
              }
              action={{ label: tab === 'received' ? 'Browse directory' : 'Find a provider', href: '/dashboard/find-doctor' }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {referrals.map((r) => (
              <ReferralCard
                key={r.id}
                referral={r}
                isActing={actingId === r.id}
                declineReason={declineReasonById[r.id] ?? ''}
                onDeclineReasonChange={(v) =>
                  setDeclineReasonById((prev) => ({ ...prev, [r.id]: v }))
                }
                outcome={outcomeById[r.id] ?? ''}
                onOutcomeChange={(v) =>
                  setOutcomeById((prev) => ({ ...prev, [r.id]: v }))
                }
                onAccept={() => doAction(`/api/referrals/${r.id}/accept`, 'POST', {}, r.id)}
                onDecline={() => {
                  const reason = (declineReasonById[r.id] ?? '').trim();
                  if (reason.length < 5) {
                    setError('Decline reason must be at least 5 characters.');
                    return;
                  }
                  doAction(`/api/referrals/${r.id}/decline`, 'POST', { reason }, r.id);
                }}
                onComplete={() => {
                  const summary = (outcomeById[r.id] ?? '').trim();
                  if (summary.length < 5) {
                    setError('Outcome summary must be at least 5 characters.');
                    return;
                  }
                  doAction(`/api/referrals/${r.id}/complete`, 'POST', { outcomeSummary: summary }, r.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const cfg = {
    PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    ACCEPTED: { label: 'Accepted', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    DECLINED: { label: 'Declined', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    COMPLETED: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    EXPIRED: { label: 'Expired', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  }[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function SystemBadge({ systemType }: { systemType: SystemType }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${SYSTEM_COLOR[systemType]}`}
    >
      {SYSTEM_ICON[systemType]}
      {systemType.charAt(0) + systemType.slice(1).toLowerCase()}
    </span>
  );
}

function ReferralCard({
  referral, isActing, declineReason, onDeclineReasonChange, outcome, onOutcomeChange,
  onAccept, onDecline, onComplete,
}: {
  referral: Referral;
  isActing: boolean;
  declineReason: string;
  onDeclineReasonChange: (v: string) => void;
  outcome: string;
  onOutcomeChange: (v: string) => void;
  onAccept: () => void;
  onDecline: () => void;
  onComplete: () => void;
}) {
  const r = referral;
  const canAct = r.youAre === 'recipient';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* Header with direction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Link
              href={`/find-doctor/${r.from.id}`}
              className="font-semibold text-slate-900 hover:text-emerald-700"
            >
              {r.from.name}
            </Link>
            <SystemBadge systemType={r.fromSystemType} />
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="flex items-center gap-2">
            <Link
              href={`/find-doctor/${r.to.id}`}
              className="font-semibold text-slate-900 hover:text-emerald-700"
            >
              {r.to.name}
            </Link>
            <SystemBadge systemType={r.toSystemType} />
          </div>
          {r.isCrossModality && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
              <Heart className="w-3 h-3" />
              Cross-modality
            </span>
          )}
        </div>
        <StatusPill status={r.status} />
      </div>

      {/* Body */}
      <div className="text-sm text-slate-700 mb-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Reason</p>
        <p>{r.reason}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-4">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(r.createdAt).toLocaleDateString()}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {r.to.addressCity ?? r.to.country}
        </span>
        <span>Via {r.initiationSource.replace(/_/g, ' ').toLowerCase()}</span>
      </div>

      {/* Completion context */}
      {r.status === 'DECLINED' && r.declineReason && (
        <div className="p-3 rounded-lg bg-slate-50 text-sm">
          <p className="text-xs font-medium text-slate-500 uppercase mb-1">Declined</p>
          <p className="text-slate-700">{r.declineReason}</p>
        </div>
      )}
      {r.status === 'COMPLETED' && r.outcomeSummary && (
        <div className="p-3 rounded-lg bg-emerald-50 text-sm">
          <p className="text-xs font-medium text-emerald-700 uppercase mb-1">Outcome</p>
          <p className="text-slate-700">{r.outcomeSummary}</p>
        </div>
      )}
      {r.scheduledFor && r.status === 'ACCEPTED' && (
        <p className="text-xs text-emerald-700">
          Scheduled for {new Date(r.scheduledFor).toLocaleString()}
        </p>
      )}

      {/* Action buttons for recipients */}
      {canAct && r.status === 'PENDING' && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-start gap-3 flex-col sm:flex-row">
            <button
              onClick={onAccept}
              disabled={isActing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium text-sm"
            >
              {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Accept
            </button>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={declineReason}
                onChange={(e) => onDeclineReasonChange(e.target.value)}
                placeholder="Decline reason (required)"
                maxLength={500}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                onClick={onDecline}
                disabled={isActing || declineReason.trim().length < 5}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-40 font-medium text-sm"
              >
                <XCircle className="w-4 h-4" />
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      {canAct && r.status === 'ACCEPTED' && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
          <p className="text-xs text-slate-500">Mark the visit as complete:</p>
          <textarea
            value={outcome}
            onChange={(e) => onOutcomeChange(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Short outcome summary (required)"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={onComplete}
            disabled={isActing || outcome.trim().length < 5}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 font-medium text-sm"
          >
            {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Mark completed
          </button>
        </div>
      )}
    </div>
  );
}
