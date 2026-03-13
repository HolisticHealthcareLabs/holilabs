'use client';


/**
 * Settings Page - API Configuration & Preferences
 * Replaces manual .env editing with UI configuration
 *
 * Industry-grade settings management
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  FileBadge2,
  Home,
  Link2,
  Lock,
  Search,
  ShieldCheck,
  UserCircle2,
  Users2,
} from 'lucide-react';

type OnboardingProfile = import('@/app/api/onboarding/profile/route').OnboardingProfile;
type ProtocolMode = NonNullable<OnboardingProfile['protocolMode']>;
type ComplianceCountry = NonNullable<OnboardingProfile['complianceCountry']>;

function normalizeProtocolMode(value: unknown): ProtocolMode {
  if (typeof value !== 'string') return 'HYBRID_70_30';
  const normalized = value.trim().toUpperCase();
  if (normalized === 'DETERMINISTIC_100' || normalized === 'DETERMINISTIC-FIRST') {
    return 'DETERMINISTIC_100';
  }
  if (normalized === 'UNKNOWN') {
    return 'UNKNOWN';
  }
  return 'HYBRID_70_30';
}

type TeamMemberRole = 'ORG_ADMIN' | 'CLINICIAN' | 'BILLING';
type TeamMemberStatus = 'ACTIVE' | 'PENDING';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  organizationId: string;
}

const ROLE_OPTIONS: Array<{ value: TeamMemberRole; label: string }> = [
  { value: 'CLINICIAN', label: 'Clinician' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'ORG_ADMIN', label: 'Admin' },
];

const ROLE_STYLES: Record<TeamMemberRole, string> = {
  ORG_ADMIN: 'bg-slate-900 text-white',
  CLINICIAN: 'bg-blue-100 text-blue-700',
  BILLING: 'bg-violet-100 text-violet-700',
};

const STATUS_STYLES: Record<TeamMemberStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
};

type SettingsSection =
  | 'home'
  | 'personal'
  | 'security'
  | 'license'
  | 'integrations'
  | 'privacy'
  | 'team'
  | 'billing';

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function humanizeInviteName(email: string): string {
  const localPart = email.split('@')[0] ?? 'Pending Invite';
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || 'Pending Invite';
}

function buildInitialTeamMembers(activeOrganizationId: string): TeamMember[] {
  return [
    {
      id: 'team-001',
      email: 'admin@holilabs.xyz',
      name: 'Nicola Caprirolo Teran',
      role: 'ORG_ADMIN',
      status: 'ACTIVE',
      organizationId: activeOrganizationId,
    },
    {
      id: 'team-002',
      email: 'dr.silva@holilabs.xyz',
      name: 'Ricardo Silva',
      role: 'CLINICIAN',
      status: 'ACTIVE',
      organizationId: activeOrganizationId,
    },
    {
      id: 'team-003',
      email: 'billing@holilabs.xyz',
      name: 'Billing Desk',
      role: 'BILLING',
      status: 'ACTIVE',
      organizationId: activeOrganizationId,
    },
    {
      id: 'team-004',
      email: 'new.clinician@holilabs.xyz',
      name: 'New Clinician',
      role: 'CLINICIAN',
      status: 'PENDING',
      organizationId: activeOrganizationId,
    },
  ];
}

export default function SettingsPage() {
  const t = useTranslations('dashboard.settings');
  const { data: session } = useSession();
  const userRole = String((session?.user as { role?: string } | undefined)?.role ?? '').toUpperCase();
  const tenantRole = String((session?.user as { tenantRole?: string } | undefined)?.tenantRole ?? 'CLINICIAN').toUpperCase();
  const organizationId = (session?.user as { organizationId?: string } | undefined)?.organizationId ?? 'org-demo-clinic';
  const organizationName = (session?.user as { organizationName?: string } | undefined)?.organizationName ?? 'Demo Clinic';
  const organizationType = (session?.user as { organizationType?: string } | undefined)?.organizationType ?? 'CLINIC';
  const canManageClinic = tenantRole === 'ORG_ADMIN';
  const canEditRolloutContext = canManageClinic;

  const [activeTab, setActiveTab] = useState<SettingsSection>('home');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() =>
    buildInitialTeamMembers(organizationId)
  );
  const [teamMessage, setTeamMessage] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMemberRole>('CLINICIAN');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // AI Settings
  const [aiConfig, setAiConfig] = useState({
    provider: 'gemini', // Default: Gemini (per user request)
    useCustomApiKey: false, // BYOK toggle
    protocolMode: 'HYBRID_70_30' as ProtocolMode,
    geminiApiKey: '',
    anthropicKey: '',
    openaiKey: '',
    deepgramApiKey: '', // Transcription
  });
  const [rolloutContext, setRolloutContext] = useState<{
    complianceCountry: ComplianceCountry;
    insurerFocus: string;
    protocolMode: ProtocolMode;
  }>({
    complianceCountry: 'UNKNOWN',
    insurerFocus: '',
    protocolMode: 'HYBRID_70_30',
  });

  // Communications Settings
  const [commsConfig, setCommsConfig] = useState({
    contactPhone: '',
    contactEmail: '',
    preferredChannel: 'whatsapp',
    remindersEnabled: true,
  });

  // Load current settings
  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then((res) => res.json()).catch(() => null),
      fetch('/api/onboarding/profile', { cache: 'no-store' }).then((res) => res.json()).catch(() => null),
    ])
      .then(([settingsData, profileData]) => {
        if (settingsData?.success) {
          const loadedAi = settingsData?.data?.ai ?? {};
          const loadedComms = settingsData?.data?.communications ?? {};
          setAiConfig((prev) => ({
            ...prev,
            ...loadedAi,
            protocolMode: normalizeProtocolMode(loadedAi.protocolMode ?? prev.protocolMode),
          }));
          setCommsConfig((prev) => ({ ...prev, ...loadedComms }));
        }

        const profile = profileData?.data as OnboardingProfile | null | undefined;
        if (profile) {
          const protocolMode = normalizeProtocolMode(profile.protocolMode);
          setRolloutContext((prev) => ({
            complianceCountry: (profile.complianceCountry ?? prev.complianceCountry) as ComplianceCountry,
            insurerFocus: typeof profile.insurerFocus === 'string' ? profile.insurerFocus : prev.insurerFocus,
            protocolMode,
          }));
          setAiConfig((prev) => ({ ...prev, protocolMode }));
        }
      })
      .catch((err) => console.error('Failed to load settings:', err));
  }, []);

  useEffect(() => {
    setTeamMembers(buildInitialTeamMembers(organizationId));
  }, [organizationId]);

  useEffect(() => {
    if (!teamMessage) return;
    const timeoutId = window.setTimeout(() => setTeamMessage(''), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [teamMessage]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const profilePayload: OnboardingProfile = {
        complianceCountry: rolloutContext.complianceCountry,
        insurerFocus: rolloutContext.insurerFocus.trim(),
        protocolMode: rolloutContext.protocolMode,
      };

      const profileResponse = await fetch('/api/onboarding/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: profilePayload }),
      }).catch(() => null);
      const profileSaved = Boolean(profileResponse?.ok);

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai: {
            ...aiConfig,
            protocolMode: rolloutContext.protocolMode,
            deterministicFirst: rolloutContext.protocolMode === 'DETERMINISTIC_100',
          },
          communications: commsConfig,
        }),
      }).catch(() => null);

      const data = response ? await response.json().catch(() => null) : null;
      const settingsSaved = Boolean(response?.ok && data?.success);

      if (profileSaved && settingsSaved) {
        setSaveMessage(`✅ ${t('configSaved')}`);
      } else if (profileSaved) {
        setSaveMessage(`✅ ${t('rolloutSaved')}`);
      } else {
        setSaveMessage(`❌ ${t('saveError')}`);
      }
      setTimeout(() => setSaveMessage(''), 4000);
    } catch (error) {
      setSaveMessage(`❌ ${t('connectionError')}`);
    } finally {
      setIsSaving(false);
    }
  };

  const visibleTeamMembers = teamMembers.filter(
    (member) => member.organizationId === organizationId
  );

  const handleInviteMember = async () => {
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setTeamMessage(t('validEmailRequired'));
      return;
    }

    setIsSendingInvite(true);
    setTeamMessage('');

    await new Promise((resolve) => window.setTimeout(resolve, 900));

    const newMember: TeamMember = {
      id: `team-${Date.now()}`,
      email: normalizedEmail,
      name: humanizeInviteName(normalizedEmail),
      role: inviteRole,
      status: 'PENDING',
      organizationId,
    };

    setTeamMembers((prev) => [newMember, ...prev]);
    setInviteEmail('');
    setInviteRole('CLINICIAN');
    setIsSendingInvite(false);
    setIsInviteModalOpen(false);
    setTeamMessage(t('inviteSentTo', { email: normalizedEmail }));
  };

  const navigationItems: Array<{
    id: SettingsSection;
    label: string;
    icon: typeof Home;
    accent: string;
    available: boolean;
  }> = [
    { id: 'home', label: t('home'), icon: Home, accent: 'bg-blue-100 text-blue-700', available: true },
    { id: 'personal', label: t('personalInfo'), icon: UserCircle2, accent: 'bg-emerald-100 text-emerald-700', available: true },
    { id: 'security', label: t('securitySignIn'), icon: ShieldCheck, accent: 'bg-sky-100 text-sky-700', available: false },
    { id: 'license', label: t('clinicalLicense'), icon: FileBadge2, accent: 'bg-amber-100 text-amber-700', available: false },
    { id: 'integrations', label: t('thirdPartyApps'), icon: Link2, accent: 'bg-indigo-100 text-indigo-700', available: true },
    { id: 'privacy', label: t('dataPrivacy'), icon: Lock, accent: 'bg-violet-100 text-violet-700', available: true },
    { id: 'team', label: t('peopleSharing'), icon: Users2, accent: 'bg-pink-100 text-pink-700', available: canManageClinic },
    { id: 'billing', label: t('walletSubscriptions'), icon: CreditCard, accent: 'bg-orange-100 text-orange-700', available: false },
  ];

  const saveFeedbackTone = saveMessage.includes('✅')
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-red-200 bg-red-50 text-red-700';

  return (
    <div className="min-h-screen bg-[#1f1f1c] text-white">
      <div className="mx-auto flex w-full max-w-7xl gap-8 px-6 py-8">
        <aside className="hidden w-[280px] shrink-0 xl:block">
          <div className="sticky top-8 space-y-2">
            <div className="mb-6 px-4 text-[28px] font-semibold tracking-tight text-white">
              {t('cortexAccount')}
            </div>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-white/8 text-white'
                      : 'text-white/72 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.accent}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {item.label}
                  </span>
                  {!item.available && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/55">
                      {t('comingSoon')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-white/55">
              <Search className="h-5 w-5 shrink-0" />
              <input
                type="text"
                value=""
                readOnly
                aria-label="Search account settings"
                placeholder={t('searchCortex')}
                className="w-full bg-transparent text-base text-white/85 outline-none placeholder:text-white/38"
              />
            </div>

            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-[#014751] text-5xl font-semibold text-white shadow-lg">
                {(session?.user?.name || session?.user?.email || 'C').charAt(0).toUpperCase()}
              </div>
              <h1 className="text-5xl font-semibold tracking-tight text-white">
                {session?.user?.name || t('yourAccount')}
              </h1>
              <p className="mt-2 text-lg text-white/65">
                {session?.user?.email || t('noEmail')}
              </p>
            </div>

            {activeTab === 'home' && (
              <div className="space-y-6">
                <div className="rounded-[32px] border border-red-500/20 bg-[#a61d18] px-8 py-7 shadow-xl">
                  <div className="flex items-center justify-between gap-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">
                          <AlertTriangle className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-lg font-semibold text-white">{t('securityReview')}</p>
                          <p className="mt-1 text-sm text-white/80">
                            Review organization access, team invites, and privacy settings before rollout.
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('privacy')}
                      className="shrink-0 rounded-full bg-white/85 px-5 py-3 text-sm font-semibold text-[#7f1612] transition-colors hover:bg-white"
                    >
                      {t('reviewSettings')}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t('organization')}</p>
                    <p className="mt-3 text-xl font-semibold text-white">{organizationName}</p>
                    <p className="mt-1 text-sm text-white/55">{organizationType}</p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t('role')}</p>
                    <p className="mt-3 text-xl font-semibold text-white">{tenantRole}</p>
                    <p className="mt-1 text-sm text-white/55">{t('scopedToWorkspace')}</p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t('pendingInvites')}</p>
                    <p className="mt-3 text-xl font-semibold text-white">
                      {visibleTeamMembers.filter((member) => member.status === 'PENDING').length}
                    </p>
                    <p className="mt-1 text-sm text-white/55">{t('awaitingOnboarding')}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'personal' && (
              <div className="space-y-4">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t('personalInfo')}</p>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">{t('fullName')}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{session?.user?.name || t('unknown')}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">{t('email')}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{session?.user?.email || t('unknown')}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">{t('organizationIdLabel')}</p>
                      <p className="mt-2 font-mono text-sm text-white">{organizationId}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">{t('tenantRoleLabel')}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{tenantRole}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t('thirdPartyApps')}</p>
                      <h2 className="mt-3 text-2xl font-semibold text-white">{t('aiProviderSettings')}</h2>
                      <p className="mt-2 text-sm text-white/60">
                        {t('aiProviderDesc')}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/70">
                      {aiConfig.useCustomApiKey ? t('byokEnabled') : t('sharedMode')}
                    </span>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-base font-semibold text-white">{t('bringYourOwnKey')}</p>
                          <p className="mt-1 text-sm text-white/55">
                            {t('byokDesc')}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={aiConfig.useCustomApiKey}
                            onChange={(e) =>
                              setAiConfig({ ...aiConfig, useCustomApiKey: e.target.checked })
                            }
                            className="sr-only peer"
                          />
                          <div className="h-6 w-11 rounded-full bg-white/15 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full" />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/75">
                        {t('preferredProvider')}
                      </label>
                      <select
                        value={aiConfig.provider}
                        onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value })}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                      >
                        <option value="gemini" className="bg-[#1f1f1c]">Google Gemini 1.5 Flash</option>
                        <option value="claude" className="bg-[#1f1f1c]">Claude 3.5 Sonnet</option>
                        <option value="openai" className="bg-[#1f1f1c]">OpenAI GPT-4 Turbo</option>
                      </select>
                    </div>

                    {aiConfig.useCustomApiKey && (
                      <div className="grid gap-4">
                        <input
                          type="password"
                          value={aiConfig.geminiApiKey}
                          onChange={(e) => setAiConfig({ ...aiConfig, geminiApiKey: e.target.value })}
                          placeholder={t('geminiApiKey')}
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                        />
                        <input
                          type="password"
                          value={aiConfig.anthropicKey}
                          onChange={(e) => setAiConfig({ ...aiConfig, anthropicKey: e.target.value })}
                          placeholder={t('anthropicApiKey')}
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                        />
                        <input
                          type="password"
                          value={aiConfig.openaiKey}
                          onChange={(e) => setAiConfig({ ...aiConfig, openaiKey: e.target.value })}
                          placeholder={t('openaiApiKey')}
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                        />
                        <input
                          type="password"
                          value={aiConfig.deepgramApiKey}
                          onChange={(e) => setAiConfig({ ...aiConfig, deepgramApiKey: e.target.value })}
                          placeholder={t('deepgramApiKey')}
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                        />
                      </div>
                    )}

                    {saveMessage && (
                      <div className={`rounded-2xl border px-4 py-3 text-sm ${saveFeedbackTone}`}>
                        {saveMessage}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#1f1f1c] transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSaving ? t('saving') : t('saveChanges')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t('dataPrivacy')}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{t('workspacePrivacy')}</h2>
                  <p className="mt-2 text-sm text-white/60">
                    {t('privacyDesc')}
                  </p>

                  <div className="mt-6 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/75">{t('phoneOnFile')}</label>
                        <input
                          type="tel"
                          value={commsConfig.contactPhone}
                          onChange={(e) => setCommsConfig({ ...commsConfig, contactPhone: e.target.value })}
                          placeholder="+59170000000"
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/75">{t('preferredChannel')}</label>
                        <select
                          value={commsConfig.preferredChannel}
                          onChange={(e) => setCommsConfig({ ...commsConfig, preferredChannel: e.target.value })}
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                        >
                          <option value="whatsapp" className="bg-[#1f1f1c]">WhatsApp</option>
                          <option value="email" className="bg-[#1f1f1c]">Email</option>
                        </select>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <label className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-base font-semibold text-white">{t('automatedReminders')}</p>
                          <p className="mt-1 text-sm text-white/55">
                            {t('automatedRemindersDesc')}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={commsConfig.remindersEnabled}
                          onChange={(e) => setCommsConfig({ ...commsConfig, remindersEnabled: e.target.checked })}
                          className="h-4 w-4 rounded border-white/20 bg-transparent text-white focus:ring-white/20"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/75">{t('complianceCountry')}</label>
                        <select
                          value={rolloutContext.complianceCountry}
                          disabled={!canEditRolloutContext}
                          onChange={(e) =>
                            setRolloutContext((prev) => ({
                              ...prev,
                              complianceCountry: e.target.value as ComplianceCountry,
                            }))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10 disabled:opacity-50"
                        >
                          <option value="BOLIVIA" className="bg-[#1f1f1c]">Bolivia</option>
                          <option value="BRAZIL" className="bg-[#1f1f1c]">Brazil</option>
                          <option value="ARGENTINA" className="bg-[#1f1f1c]">Argentina</option>
                          <option value="MEXICO" className="bg-[#1f1f1c]">Mexico</option>
                          <option value="COLOMBIA" className="bg-[#1f1f1c]">Colombia</option>
                          <option value="CHILE" className="bg-[#1f1f1c]">Chile</option>
                          <option value="PERU" className="bg-[#1f1f1c]">Peru</option>
                          <option value="OTHER" className="bg-[#1f1f1c]">Other</option>
                          <option value="UNKNOWN" className="bg-[#1f1f1c]">Not sure</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/75">{t('protocolMode')}</label>
                        <select
                          value={rolloutContext.protocolMode}
                          disabled={!canEditRolloutContext}
                          onChange={(e) => {
                            const nextProtocolMode = normalizeProtocolMode(e.target.value);
                            setRolloutContext((prev) => ({ ...prev, protocolMode: nextProtocolMode }));
                            setAiConfig((prev) => ({ ...prev, protocolMode: nextProtocolMode }));
                          }}
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10 disabled:opacity-50"
                        >
                          <option value="DETERMINISTIC_100" className="bg-[#1f1f1c]">Deterministic-first (100%)</option>
                          <option value="HYBRID_70_30" className="bg-[#1f1f1c]">Hybrid (70/30)</option>
                          <option value="UNKNOWN" className="bg-[#1f1f1c]">Unknown</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/75">{t('insurerFocus')}</label>
                      <input
                        type="text"
                        value={rolloutContext.insurerFocus}
                        disabled={!canEditRolloutContext}
                        onChange={(e) =>
                          setRolloutContext((prev) => ({ ...prev, insurerFocus: e.target.value }))
                        }
                        placeholder="e.g., CNS, SUS, private payer list"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10 disabled:opacity-50"
                      />
                    </div>

                    {!canEditRolloutContext && (
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                        {t('readOnlyAccess', { role: tenantRole || userRole || 'UNKNOWN' })}
                      </div>
                    )}

                    {saveMessage && (
                      <div className={`rounded-2xl border px-4 py-3 text-sm ${saveFeedbackTone}`}>
                        {saveMessage}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#1f1f1c] transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSaving ? t('saving') : t('saveChanges')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="space-y-6">
                {canManageClinic ? (
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t('peopleSharing')}</p>
                        <h2 className="mt-3 text-2xl font-semibold text-white">{t('teamMembersTitle')}</h2>
                        <p className="mt-2 text-sm text-white/60">
                          {t('teamDesc')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsInviteModalOpen(true)}
                        className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#1f1f1c] transition-colors hover:bg-white/90"
                      >
                        {t('inviteMember')}
                      </button>
                    </div>

                    {teamMessage && (
                      <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                        teamMessage.toLowerCase().includes('valid')
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}>
                        {teamMessage}
                      </div>
                    )}

                    <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
                      <div className="grid grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-4 bg-white/[0.03] px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                        <span>{t('memberCol')}</span>
                        <span>{t('role')}</span>
                        <span>{t('statusCol')}</span>
                      </div>
                      <div className="divide-y divide-white/8">
                        {visibleTeamMembers.map((member) => (
                          <div
                            key={member.id}
                            className="grid grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-4 px-5 py-4"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#014751] text-sm font-semibold text-white">
                                {getInitials(member.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                                <p className="truncate text-sm text-white/55">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_STYLES[member.role]}`}>
                                {member.role === 'ORG_ADMIN' ? t('roleAdmin') : member.role === 'CLINICIAN' ? t('roleClinician') : t('roleBilling')}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[member.status]}`}>
                                {member.status === 'ACTIVE' ? t('statusActive') : t('statusPending')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t('peopleSharing')}</p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">{t('teamManagement')}</h2>
                    <p className="mt-2 text-sm text-white/60">
                      {t('teamComingSoon')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {(activeTab === 'security' || activeTab === 'license' || activeTab === 'billing') && (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  {activeTab === 'security'
                    ? t('securitySignIn')
                    : activeTab === 'license'
                      ? t('clinicalLicense')
                      : t('walletSubscriptions')}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{t('comingSoon')}</h2>
                <p className="mt-2 text-sm text-white/60">
                  {t('comingSoonDesc')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {canManageClinic && isInviteModalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => {
              if (isSendingInvite) return;
              setIsInviteModalOpen(false);
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-semibold text-slate-900">{t('inviteMemberTitle')}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t('inviteMemberDesc', { org: organizationName })}
                </p>
              </div>
              <div className="space-y-4 px-5 py-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('emailAddress')}
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="clinician@clinic.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={isSendingInvite}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('role')}
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as TeamMemberRole)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={isSendingInvite}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {t('inviteStamped')} <span className="font-mono text-slate-900">{organizationId}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                  disabled={isSendingInvite}
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleInviteMember}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSendingInvite}
                >
                  {isSendingInvite ? t('sendingInvite') : t('sendInvite')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
