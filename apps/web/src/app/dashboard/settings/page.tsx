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
  ChevronRight,
  Plus,
  CheckCircle2,
  User,
  Lock,
  Search,
  Shield,
  Settings,
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

function SecuritySection() {
  const t = useTranslations('dashboard.settings');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwStatus, setPwStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [totpStep, setTotpStep] = useState<'idle' | 'scanning' | 'confirming' | 'done'>('idle');
  const [qrCode, setQrCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpError, setTotpError] = useState('');

  const pwValid = pwNew.length >= 8 && /[A-Z]/.test(pwNew) && /[0-9]/.test(pwNew);
  const pwMatch = pwNew === pwConfirm && pwNew.length > 0;

  const handleChangePassword = async () => {
    if (!pwValid || !pwMatch) return;
    setPwLoading(true);
    setPwStatus(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwStatus({ type: 'success', msg: t('secPasswordUpdated') });
        setPwCurrent(''); setPwNew(''); setPwConfirm('');
      } else {
        setPwStatus({ type: 'error', msg: data.error || 'Failed to update password' });
      }
    } catch {
      setPwStatus({ type: 'error', msg: 'Network error' });
    } finally {
      setPwLoading(false);
    }
  };

  const handleTotpSetup = async () => {
    try {
      const res = await fetch('/api/auth/totp/setup', { method: 'POST' });
      const data = await res.json();
      setQrCode(data.qrCode);
      setTotpSecret(data.secret);
      setTotpStep('scanning');
    } catch {
      setTotpError('Failed to initialize 2FA setup');
    }
  };

  const handleTotpVerify = async () => {
    setTotpError('');
    try {
      const res = await fetch('/api/auth/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: totpToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setBackupCodes(data.backupCodes);
        setTotpStep('done');
      } else {
        setTotpError(data.error || 'Invalid code');
      }
    } catch {
      setTotpError('Network error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Password */}
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t('secPassword')}</p>
        <p className="mt-1.5 text-[13px] text-white/35">{t('secPasswordHint')}</p>
        <div className="mt-6 space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">{t('secCurrentPassword')}</label>
            <input
              type="password"
              value={pwCurrent}
              onChange={e => setPwCurrent(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
              placeholder={t('secCurrentPasswordPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">{t('secNewPassword')}</label>
            <input
              type="password"
              value={pwNew}
              onChange={e => setPwNew(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
              placeholder={t('secNewPasswordPlaceholder')}
            />
            {pwNew.length > 0 && (
              <div className="mt-2 flex gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${pwNew.length >= 8 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/30'}`}>{t('sec8Chars')}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${/[A-Z]/.test(pwNew) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/30'}`}>{t('secUppercase')}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${/[0-9]/.test(pwNew) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/30'}`}>{t('secNumber')}</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">{t('secConfirmPassword')}</label>
            <input
              type="password"
              value={pwConfirm}
              onChange={e => setPwConfirm(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
              placeholder={t('secConfirmPlaceholder')}
            />
            {pwConfirm.length > 0 && !pwMatch && (
              <p className="mt-1.5 text-[12px] text-red-400">{t('secPasswordsMismatch')}</p>
            )}
          </div>
          <button
            onClick={handleChangePassword}
            disabled={!pwValid || !pwMatch || pwLoading}
            className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-colors"
          >
            {pwLoading ? t('secUpdating') : t('secUpdatePassword')}
          </button>
          {pwStatus && (
            <p className={`text-sm ${pwStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {pwStatus.msg}
            </p>
          )}
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t('secTwoFactor')}</p>
            <p className="mt-1.5 text-[13px] text-white/35">{t('secTwoFactorDesc')}</p>
          </div>
          {totpStep === 'idle' && (
            <button
              onClick={handleTotpSetup}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors"
            >
              {t('secEnable2FA')}
            </button>
          )}
          {totpStep === 'done' && (
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[12px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {t('secEnabled')}
            </span>
          )}
        </div>

        {totpStep === 'scanning' && (
          <div className="mt-6 max-w-sm">
            <p className="text-sm text-white/70 mb-4">{t('secScanQR')}</p>
            {qrCode && (
              <div className="bg-white rounded-2xl p-4 inline-block mb-4">
                <img src={qrCode} alt="TOTP QR Code" className="w-48 h-48" />
              </div>
            )}
            <div className="mb-4">
              <p className="text-[12px] text-white/40 mb-1">{t('secManualKey')}</p>
              <code className="block text-sm font-mono text-white/80 bg-white/[0.04] rounded-lg px-3 py-2 break-all select-all">{totpSecret}</code>
            </div>
            <button
              onClick={() => setTotpStep('confirming')}
              className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              {t('secScanned')}
            </button>
          </div>
        )}

        {totpStep === 'confirming' && (
          <div className="mt-6 max-w-sm">
            <p className="text-sm text-white/70 mb-4">{t('secEnterCode')}</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={totpToken}
              onChange={e => setTotpToken(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-2xl font-mono tracking-[0.3em] text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
              placeholder="000000"
              autoFocus
            />
            {totpError && <p className="mt-2 text-sm text-red-400">{totpError}</p>}
            <button
              onClick={handleTotpVerify}
              disabled={totpToken.length !== 6}
              className="mt-4 w-full px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
            >
              {t('secVerifyEnable')}
            </button>
          </div>
        )}

        {totpStep === 'done' && backupCodes.length > 0 && (
          <div className="mt-6 max-w-sm">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400 mb-2">{t('secSaveBackupCodes')}</p>
              <p className="text-[12px] text-white/50 mb-3">{t('secBackupCodesDesc')}</p>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <code key={i} className="text-sm font-mono text-white/80 bg-white/[0.04] rounded-lg px-3 py-1.5 text-center select-all">{code}</code>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WebAuthn / Passkeys */}
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t('secPasskeys')}</p>
            <p className="mt-1.5 text-[13px] text-white/35">{t('secPasskeysDesc')}</p>
          </div>
          <a
            href="/dashboard/settings/seguranca"
            className="px-4 py-2 rounded-xl border border-white/10 text-sm font-medium text-white/60 hover:text-white hover:border-white/20 transition-colors"
          >
            {t('secManage')}
          </a>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t('secActiveSessions')}</p>
        <p className="mt-1.5 text-[13px] text-white/35">{t('secActiveSessionsDesc')}</p>
        <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{t('secCurrentSession')}</p>
              <p className="text-[12px] text-white/40">{t('secThisBrowser')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const t = useTranslations('dashboard.settings');
  const { data: session } = useSession();
  const userRole = String((((session?.user as any)) as { role?: string } | undefined)?.role ?? '').toUpperCase();
  const tenantRole = String((((session?.user as any)) as { tenantRole?: string } | undefined)?.tenantRole ?? 'CLINICIAN').toUpperCase();
  const organizationId = (((session?.user as any)) as { organizationId?: string } | undefined)?.organizationId ?? 'org-demo-clinic';
  const organizationName = (((session?.user as any)) as { organizationName?: string } | undefined)?.organizationName ?? 'Demo Clinic';
  const organizationType = (((session?.user as any)) as { organizationType?: string } | undefined)?.organizationType ?? 'CLINIC';
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
    icon: typeof User;
    accent: string;
    available: boolean;
  }> = [
    { id: 'home', label: t('home'), icon: User, accent: 'bg-blue-100 text-blue-700', available: true },
    { id: 'personal', label: t('personalInfo'), icon: User, accent: 'bg-emerald-100 text-emerald-700', available: true },
    { id: 'security', label: t('securitySignIn'), icon: Shield, accent: 'bg-sky-100 text-sky-700', available: true },
    { id: 'license', label: t('clinicalLicense'), icon: CheckCircle2, accent: 'bg-amber-100 text-amber-700', available: false },
    { id: 'integrations', label: t('thirdPartyApps'), icon: Settings, accent: 'bg-indigo-100 text-indigo-700', available: true },
    { id: 'privacy', label: t('dataPrivacy'), icon: Lock, accent: 'bg-violet-100 text-violet-700', available: true },
    { id: 'team', label: t('peopleSharing'), icon: Plus, accent: 'bg-pink-100 text-pink-700', available: canManageClinic },
    { id: 'billing', label: t('walletSubscriptions'), icon: Settings, accent: 'bg-orange-100 text-orange-700', available: false },
  ];

  const saveFeedbackTone = saveMessage.includes('✅')
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-red-200 bg-red-50 text-red-700';

  return (
    <div className="min-h-screen bg-[#1f1f1c] text-white">
      <div className="mx-auto flex w-full max-w-7xl gap-8 px-6 py-8">
        <aside className="hidden w-[280px] shrink-0 xl:block">
          <div className="sticky top-8 space-y-2">
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
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-[#014751] text-5xl font-semibold text-white shadow-lg">
                {(((session?.user as any))?.name || ((session?.user as any))?.email || 'C').charAt(0).toUpperCase()}
              </div>
              <h1 className="text-5xl font-semibold tracking-tight text-white">
                {((session?.user as any))?.name || t('yourAccount')}
              </h1>
              <p className="mt-2 text-lg text-white/65">
                {((session?.user as any))?.email || t('noEmail')}
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
                            {t('securityReviewDesc')}
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
                    {visibleTeamMembers.filter((m) => m.status === 'PENDING').length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {visibleTeamMembers.filter((m) => m.status === 'PENDING').map((m) => (
                          <p key={m.id} className="text-sm text-white/55 truncate">{m.email}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-white/55">{t('noPendingInvites')}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'personal' && (
              <div className="space-y-5">
                {/* Identity */}
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Identity</p>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">Full name</p>
                      <p className="mt-2 text-lg font-semibold text-white">{((session?.user as any))?.name || '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">Email</p>
                      <p className="mt-2 text-base font-semibold text-white break-all">{((session?.user as any))?.email || '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">Username</p>
                      <p className="mt-2 text-base font-medium text-white">{((session?.user as any))?.username || '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">Role</p>
                      <p className="mt-2 text-base font-semibold text-white">{tenantRole}</p>
                    </div>
                  </div>
                </div>

                {/* Professional Credentials */}
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Professional Credentials</p>
                  <p className="mt-1.5 text-[13px] text-white/35">Required for prescribing, signing, and clinical workflows</p>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">Specialty</p>
                      <p className="mt-2 text-base font-medium text-white">{(((session?.user as any)) as any)?.specialty || 'Not set'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">License Number (CRM / CRO)</p>
                      <p className="mt-2 text-base font-mono text-white">{((session?.user as any))?.licenseNumber || 'Not set'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">NPI (US only)</p>
                      <p className="mt-2 text-base font-mono text-white">{((session?.user as any))?.npi || '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">Signing PIN</p>
                      <p className="mt-2 text-base text-white">{((session?.user as any))?.mfaEnabled ? '••••••' : 'Not configured'}</p>
                    </div>
                  </div>
                </div>

                {/* Organization & Workspace */}
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Organization</p>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">Organization ID</p>
                      <p className="mt-2 font-mono text-sm text-white">{organizationId}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">Workspace Role</p>
                      <p className="mt-2 text-base font-semibold text-white">{tenantRole}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">Permissions</p>
                      <p className="mt-2 text-sm text-white/70">{((session?.user as any))?.permissions?.length ? `${((session?.user as any))?.permissions?.length} active` : 'Default role permissions'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">Account Status</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <p className="text-base font-medium text-emerald-400">Active</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Overview */}
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Security Overview</p>
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">MFA</p>
                      <p className="mt-2 text-base font-medium text-white">{((session?.user as any))?.mfaEnabled ? 'Enabled' : 'Not enabled'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">Last Login</p>
                      <p className="mt-2 text-sm font-medium text-white">{((session?.user as any))?.lastLoginAt ? new Date(((session?.user as any)).lastLoginAt).toLocaleDateString() : 'Current session'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm text-white/50">Member Since</p>
                      <p className="mt-2 text-sm font-medium text-white">{((session?.user as any))?.createdAt ? new Date(((session?.user as any)).createdAt).toLocaleDateString() : '—'}</p>
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
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white/75">
                          {t('complianceCountry')}
                          {!canEditRolloutContext && <Lock className="w-3 h-3 text-white/30" />}
                        </label>
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
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white/75">
                          {t('protocolMode')}
                          {!canEditRolloutContext && <Lock className="w-3 h-3 text-white/30" />}
                        </label>
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
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white/75">
                        {t('insurerFocus')}
                        {!canEditRolloutContext && <Lock className="w-3 h-3 text-white/30" />}
                      </label>
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

                    {/* Read-only warning removed — phone/channel are always editable. Admin-only fields show inline lock. */}

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

            {activeTab === 'security' && (
              <SecuritySection />
            )}

            {(activeTab === 'license' || activeTab === 'billing') && (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  {activeTab === 'license' ? t('clinicalLicense') : t('walletSubscriptions')}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{t('comingSoon')}</h2>
                <p className="mt-2 text-sm text-white/60">{t('comingSoonDesc')}</p>
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
