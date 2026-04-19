'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield, CheckCircle2, XCircle, ExternalLink, Clock, User,
  Loader2, AlertCircle, FileText, MapPin, Phone, Mail,
} from 'lucide-react';

type ClaimStatus = 'UNCLAIMED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'SUSPENDED';
type StatusFilter = ClaimStatus | 'ALL';

interface Claimant {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

interface Claim {
  id: string;
  physicianName: string;
  country: string;
  registryId: string;
  registryState: string | null;
  registrySource: string;
  claimStatus: ClaimStatus;
  claimedAt: string | null;
  licenseDocUrl: string | null;
  city: string | null;
  state: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  publicProfileEnabled: boolean;
  isRegistryActive: boolean;
  claimant: Claimant | null;
}

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING_VERIFICATION');
  const [error, setError] = useState<string | null>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: statusFilter, limit: '100' });
      const res = await fetch(`/api/admin/claims?${params}`);
      if (res.status === 401) {
        window.location.href = `/sign-in?next=${encodeURIComponent('/admin/claims')}`;
        return;
      }
      if (res.status === 403) {
        setError('You do not have permission to view this page.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load claims');
      const data = await res.json();
      setClaims(data.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load claims');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  const approve = async (id: string) => {
    setActionTargetId(id);
    try {
      const res = await fetch(`/api/admin/claims/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Approval failed');
      }
      await fetchClaims();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setActionTargetId(null);
    }
  };

  const reject = async (id: string) => {
    const reason = (rejectReasonById[id] || '').trim();
    if (reason.length < 5) {
      setError('Rejection reason must be at least 5 characters.');
      return;
    }
    setActionTargetId(id);
    try {
      const res = await fetch(`/api/admin/claims/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Rejection failed');
      }
      setRejectReasonById((prev) => ({ ...prev, [id]: '' }));
      await fetchClaims();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rejection failed');
    } finally {
      setActionTargetId(null);
    }
  };

  const statusCounts = claims.reduce<Record<string, number>>((acc, c) => {
    acc[c.claimStatus] = (acc[c.claimStatus] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-1">
            <Shield className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900">Provider Claim Review</h1>
          </div>
          <p className="text-sm text-slate-500">
            Review and verify physician license documents before granting profile access.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['PENDING_VERIFICATION', 'VERIFIED', 'ALL'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s === 'PENDING_VERIFICATION' ? 'Pending review' : s === 'VERIFIED' ? 'Verified' : 'All'}
              {statusFilter === s && Object.keys(statusCounts).length > 0 && (
                <span className="ml-2 text-xs opacity-75">({claims.length})</span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : claims.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No claims to review</h3>
            <p className="text-sm text-slate-500">
              {statusFilter === 'PENDING_VERIFICATION'
                ? 'All pending claims have been handled.'
                : 'No claims match this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                isActing={actionTargetId === claim.id}
                rejectReason={rejectReasonById[claim.id] || ''}
                onRejectReasonChange={(v) =>
                  setRejectReasonById((prev) => ({ ...prev, [claim.id]: v }))
                }
                onApprove={() => approve(claim.id)}
                onReject={() => reject(claim.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClaimCard({
  claim, isActing, rejectReason, onRejectReasonChange, onApprove, onReject,
}: {
  claim: Claim;
  isActing: boolean;
  rejectReason: string;
  onRejectReasonChange: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-slate-900">{claim.physicianName}</h3>
                <StatusBadge status={claim.claimStatus} />
              </div>
              <p className="text-sm text-slate-500">
                {claim.registrySource} {claim.registryId}
                {claim.registryState && ` / ${claim.registryState}`}
                {' · '}{claim.country}
              </p>
            </div>
            <Link
              href={`/find-doctor/${claim.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
            >
              View profile <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <InfoLine icon={<User className="w-4 h-4" />} label="Claimant">
              {claim.claimant ? (
                <>
                  <div className="text-slate-900 font-medium">
                    {claim.claimant.firstName} {claim.claimant.lastName}
                  </div>
                  <div className="text-slate-500 text-xs">{claim.claimant.email}</div>
                  <div className="text-slate-400 text-xs">
                    Account since {new Date(claim.claimant.createdAt).toLocaleDateString()}
                  </div>
                </>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </InfoLine>

            <InfoLine icon={<Clock className="w-4 h-4" />} label="Submitted">
              {claim.claimedAt
                ? new Date(claim.claimedAt).toLocaleString()
                : <span className="text-slate-400">—</span>}
            </InfoLine>

            <InfoLine icon={<FileText className="w-4 h-4" />} label="License document">
              {claim.licenseDocUrl ? (
                <a
                  href={claim.licenseDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 break-all"
                >
                  View document <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </InfoLine>

            <InfoLine icon={<MapPin className="w-4 h-4" />} label="Location">
              {[claim.city, claim.state].filter(Boolean).join(', ') || <span className="text-slate-400">—</span>}
            </InfoLine>

            {claim.contactPhone && (
              <InfoLine icon={<Phone className="w-4 h-4" />} label="Registry phone">
                {claim.contactPhone}
              </InfoLine>
            )}
            {claim.contactEmail && (
              <InfoLine icon={<Mail className="w-4 h-4" />} label="Registry email">
                {claim.contactEmail}
              </InfoLine>
            )}
          </dl>
        </div>

        {claim.claimStatus === 'PENDING_VERIFICATION' && (
          <div className="lg:w-80 flex-shrink-0 space-y-3">
            <button
              onClick={onApprove}
              disabled={isActing}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve & verify
            </button>

            <div className="space-y-2">
              <textarea
                value={rejectReason}
                onChange={(e) => onRejectReasonChange(e.target.value)}
                placeholder="Rejection reason (min 5 chars, shown in audit log)"
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900"
              />
              <button
                onClick={onReject}
                disabled={isActing || rejectReason.trim().length < 5}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors text-sm"
              >
                {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoLine({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <dt className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</dt>
        <dd className="text-sm text-slate-700 mt-0.5">{children}</dd>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  const config = {
    UNCLAIMED: { label: 'Unclaimed', cls: 'bg-slate-100 text-slate-600' },
    PENDING_VERIFICATION: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
    VERIFIED: { label: 'Verified', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    SUSPENDED: { label: 'Suspended', cls: 'bg-red-50 text-red-700 border border-red-200' },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
      {config.label}
    </span>
  );
}
