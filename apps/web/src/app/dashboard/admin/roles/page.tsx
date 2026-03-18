'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Shield, Star, User, CheckCircle2, X, Plus } from 'lucide-react';

type RoleId = 'LICENSE_OWNER' | 'ADMIN' | 'COMPLIANCE_ADMIN' | 'PHYSICIAN' | 'NURSE' | 'RECEPTIONIST' | 'STAFF';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  assignedBy?: string;
  assignedAt?: string;
}

const ROLE_CONFIG: Record<RoleId, { labelKey: string; descKey: string; color: string; icon: typeof Star }> = {
  LICENSE_OWNER: { labelKey: 'licenseOwner', descKey: 'licenseOwnerDesc', color: 'text-violet-600 dark:text-violet-400', icon: Star },
  ADMIN: { labelKey: 'clinicAdmin', descKey: 'clinicAdminDesc', color: 'text-blue-600 dark:text-blue-400', icon: Shield },
  COMPLIANCE_ADMIN: { labelKey: 'complianceAdmin', descKey: 'complianceAdminDesc', color: 'text-amber-600 dark:text-amber-400', icon: Shield },
  PHYSICIAN: { labelKey: 'physician', descKey: 'physicianDesc', color: 'text-emerald-600 dark:text-emerald-400', icon: User },
  NURSE: { labelKey: 'nurse', descKey: 'nurseDesc', color: 'text-teal-600 dark:text-teal-400', icon: User },
  RECEPTIONIST: { labelKey: 'receptionist', descKey: 'receptionistDesc', color: 'text-gray-600 dark:text-gray-400', icon: User },
  STAFF: { labelKey: 'staff', descKey: 'staffDesc', color: 'text-gray-500 dark:text-gray-500', icon: User },
};

const MOCK_TEAM: TeamMember[] = [
  { id: 'U001', name: 'Dr. Ricardo Silva', email: 'dr.silva@holilabs.xyz', role: 'LICENSE_OWNER' },
  { id: 'U002', name: 'Ana Ribeiro', email: 'ana.ribeiro@holilabs.xyz', role: 'PHYSICIAN', assignedBy: 'Dr. Ricardo Silva', assignedAt: '2026-02-15' },
  { id: 'U003', name: 'Camila Santos', email: 'camila@holilabs.xyz', role: 'NURSE', assignedBy: 'Dr. Ricardo Silva', assignedAt: '2026-02-20' },
  { id: 'U004', name: 'Lucas Ferreira', email: 'lucas@holilabs.xyz', role: 'RECEPTIONIST', assignedBy: 'Dr. Ricardo Silva', assignedAt: '2026-01-10' },
  { id: 'U005', name: 'Patricia Alves', email: 'patricia@holilabs.xyz', role: 'COMPLIANCE_ADMIN', assignedBy: 'Dr. Ricardo Silva', assignedAt: '2026-03-01' },
];

export default function RolesAdminPage() {
  const { data: session } = useSession();
  const t = useTranslations('dashboard.admin');
  // TODO: Replace MOCK_TEAM with a real GET /api/admin/team call
  const [team, setTeam] = useState<TeamMember[]>(MOCK_TEAM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('STAFF');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isOwner = session?.user?.role === 'LICENSE_OWNER' || session?.user?.role === 'ADMIN';

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteMessage(null);
    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          createdBy: session?.user?.id,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setInviteMessage({ type: 'success', text: `Invitation sent to ${inviteEmail}` });
        setInviteEmail('');
        setInviteRole('STAFF');
        setTimeout(() => {
          setShowInvite(false);
          setInviteMessage(null);
        }, 2000);
      } else {
        setInviteMessage({ type: 'error', text: data.error || 'Failed to send invitation' });
      }
    } catch {
      setInviteMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-violet-600" />
            {t('roleManagement')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('roleManagementDescription')}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('inviteMember')}
        </button>
      </div>

      {/* Role hierarchy overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['LICENSE_OWNER', 'ADMIN', 'COMPLIANCE_ADMIN', 'PHYSICIAN'] as RoleId[]).map((roleId) => {
          const cfg = ROLE_CONFIG[roleId];
          const count = team.filter((m) => m.role === roleId).length;
          const Icon = cfg.icon;
          return (
            <div key={roleId} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${cfg.color}`} />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t(cfg.labelKey)}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{t(cfg.descKey)}</p>
            </div>
          );
        })}
      </div>

      {/* Team members */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('teamMembers')}</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {team.map((member) => {
            const cfg = ROLE_CONFIG[member.role];
            const Icon = cfg.icon;
            const isEditing = editingId === member.id;
            return (
              <div key={member.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{member.name}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      member.role === 'LICENSE_OWNER' ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300 border border-violet-200 dark:border-violet-500/20' :
                      member.role === 'COMPLIANCE_ADMIN' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20' :
                      'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                    }`}>
                      {t(cfg.labelKey)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{member.email}</p>
                </div>

                {isOwner && member.role !== 'LICENSE_OWNER' && (
                  <div className="shrink-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={member.role}
                          onChange={(e) => {
                            const newRole = e.target.value as RoleId;
                            setTeam((prev) => prev.map((m) => m.id === member.id ? { ...m, role: newRole } : m));
                            setEditingId(null);
                          }}
                          className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                        >
                          {Object.entries(ROLE_CONFIG).filter(([k]) => k !== 'LICENSE_OWNER').map(([k, v]) => (
                            <option key={k} value={k}>{t(v.labelKey)}</option>
                          ))}
                        </select>
                        <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingId(member.id)}
                        className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors"
                      >
                        {t('changeRole')}
                      </button>
                    )}
                  </div>
                )}

                {member.role === 'LICENSE_OWNER' && (
                  <span className="text-[10px] text-violet-500 dark:text-violet-400 font-medium">{t('root')}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite modal placeholder */}
      {showInvite && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowInvite(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('inviteTeamMember')}</h3>
                <button onClick={() => setShowInvite(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {inviteMessage && (
                <div className={`mb-3 px-3 py-2 rounded-lg text-sm ${inviteMessage.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'}`}>
                  {inviteMessage.text}
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{t('email')}</label>
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@clinic.com" className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{t('role')}</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                    {Object.entries(ROLE_CONFIG).filter(([k]) => k !== 'LICENSE_OWNER').map(([k, v]) => (
                      <option key={k} value={k}>{t(v.labelKey)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => { setShowInvite(false); setInviteMessage(null); }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">{t('cancel')}</button>
                <button onClick={handleSendInvitation} disabled={inviteLoading || !inviteEmail.trim()} className="px-4 py-2 text-sm font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{inviteLoading ? 'Sending...' : t('sendInvitation')}</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
