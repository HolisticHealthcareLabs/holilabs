'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Shield, CheckCircle2, Upload, Phone,
  FileText, AlertCircle, Loader2, Clock,
} from 'lucide-react';

type Step = 'confirm' | 'documents' | 'review' | 'success';

interface ClaimStatus {
  providerId: string;
  providerName: string;
  claimStatus: 'UNCLAIMED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'SUSPENDED';
  claimedByCurrentUser: boolean;
  claimedAt: string | null;
}

export default function ClaimProfilePage() {
  const params = useParams();
  const router = useRouter();
  const providerId = params.id as string;

  const [step, setStep] = useState<Step>('confirm');
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [licenseDocUrl, setLicenseDocUrl] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [verificationNote, setVerificationNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!providerId) return;
    fetch(`/api/providers/${providerId}/claim`)
      .then(async (r) => {
        if (r.status === 401) {
          router.push(`/sign-in?next=${encodeURIComponent(`/find-doctor/${providerId}/claim`)}`);
          return null;
        }
        if (!r.ok) throw new Error('Failed to load claim status');
        return r.json();
      })
      .then((res) => {
        if (!res) return;
        setClaimStatus(res.data);
        if (res.data.claimedByCurrentUser) {
          setStep('success');
        }
      })
      .catch(() => setError('Unable to load claim information'))
      .finally(() => setLoading(false));
  }, [providerId, router]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/providers/${providerId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseDocUrl: licenseDocUrl.trim(),
          contactPhone: contactPhone.trim() || undefined,
          verificationNote: verificationNote.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Failed to submit claim');
      }

      setStep('success');
      setClaimStatus({
        providerId: data.data.providerId,
        providerName: data.data.providerName,
        claimStatus: data.data.claimStatus,
        claimedByCurrentUser: true,
        claimedAt: data.data.claimedAt,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!claimStatus) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Provider not found
          </h1>
          <Link href="/find-doctor" className="text-emerald-600 hover:underline">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  // Blocked states
  if (
    claimStatus.claimStatus === 'VERIFIED' ||
    (claimStatus.claimStatus === 'PENDING_VERIFICATION' && !claimStatus.claimedByCurrentUser) ||
    claimStatus.claimStatus === 'SUSPENDED'
  ) {
    return (
      <BlockedState claimStatus={claimStatus} providerId={providerId} />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link
            href={`/find-doctor/${providerId}`}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to profile
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Claim your profile
          </h1>
          <p className="text-slate-500">
            Verify that you are <span className="font-medium text-slate-700">{claimStatus.providerName}</span> to
            manage this profile, respond to reviews, and appear higher in search results.
          </p>
        </div>

        {/* Progress stepper */}
        <Stepper currentStep={step} />

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="mt-6">
          {step === 'confirm' && (
            <ConfirmStep
              providerName={claimStatus.providerName}
              confirmed={confirmed}
              onConfirmedChange={setConfirmed}
              onNext={() => setStep('documents')}
            />
          )}
          {step === 'documents' && (
            <DocumentsStep
              licenseDocUrl={licenseDocUrl}
              onLicenseDocUrlChange={setLicenseDocUrl}
              contactPhone={contactPhone}
              onContactPhoneChange={setContactPhone}
              onBack={() => setStep('confirm')}
              onNext={() => setStep('review')}
            />
          )}
          {step === 'review' && (
            <ReviewStep
              providerName={claimStatus.providerName}
              licenseDocUrl={licenseDocUrl}
              contactPhone={contactPhone}
              verificationNote={verificationNote}
              onVerificationNoteChange={setVerificationNote}
              onBack={() => setStep('documents')}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
          {step === 'success' && (
            <SuccessStep
              providerName={claimStatus.providerName}
              providerId={providerId}
              claimedAt={claimStatus.claimedAt}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: Step }) {
  const steps = [
    { key: 'confirm', label: 'Confirm' },
    { key: 'documents', label: 'Documents' },
    { key: 'review', label: 'Review' },
  ];
  const currentIndex = steps.findIndex((s) => s.key === currentStep);
  return (
    <div className="flex items-center justify-between max-w-md">
      {steps.map((s, i) => {
        const isActive = i === currentIndex;
        const isComplete = i < currentIndex || currentStep === 'success';
        return (
          <React.Fragment key={s.key}>
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isComplete
                    ? 'bg-emerald-600 text-white'
                    : isActive
                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-600'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isComplete ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-sm font-medium ${
                  isActive ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${isComplete ? 'bg-emerald-600' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ConfirmStep({
  providerName, confirmed, onConfirmedChange, onNext,
}: {
  providerName: string;
  confirmed: boolean;
  onConfirmedChange: (v: boolean) => void;
  onNext: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-emerald-50 rounded-lg">
          <Shield className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Identity check
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Confirm you are the medical professional named on this profile.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-900">
          <strong>Important:</strong> Fraudulent claims are a violation of our
          Terms of Service and may be reported to the relevant medical regulatory body
          (CFM, CONACEM, ReTHUS, etc.). Only the named professional should proceed.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmedChange(e.target.checked)}
          className="w-5 h-5 mt-0.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
        />
        <span className="text-sm text-slate-700">
          I confirm that I am <strong>{providerName}</strong> and that I am legally
          authorized to manage this profile. I understand my claim will be reviewed against
          a valid license document and public registry records.
        </span>
      </label>

      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          disabled={!confirmed}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function DocumentsStep({
  licenseDocUrl, onLicenseDocUrlChange, contactPhone, onContactPhoneChange, onBack, onNext,
}: {
  licenseDocUrl: string;
  onLicenseDocUrlChange: (v: string) => void;
  contactPhone: string;
  onContactPhoneChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const isValidUrl = (() => {
    try {
      new URL(licenseDocUrl);
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-emerald-50 rounded-lg">
          <FileText className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            License document
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Provide a link to a scan or photo of your current medical license (CRM, Cédula, Tarjeta Profesional).
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            License document URL <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Upload className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="url"
              value={licenseDocUrl}
              onChange={(e) => onLicenseDocUrlChange(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Upload your license to a cloud provider (Google Drive, Dropbox, etc.) and paste the shareable link here.
            Make sure the link is viewable.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Contact phone <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => onContactPhoneChange(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Our team may reach out if we need additional verification.
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValidUrl}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function ReviewStep({
  providerName, licenseDocUrl, contactPhone, verificationNote, onVerificationNoteChange, onBack, onSubmit, submitting,
}: {
  providerName: string;
  licenseDocUrl: string;
  contactPhone: string;
  verificationNote: string;
  onVerificationNoteChange: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-1">
        Review your submission
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Verify the details below before we send your claim to our review team.
      </p>

      <dl className="space-y-3 mb-6">
        <ReviewRow label="Claiming profile">{providerName}</ReviewRow>
        <ReviewRow label="License document">
          <a href={licenseDocUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline break-all">
            {licenseDocUrl}
          </a>
        </ReviewRow>
        {contactPhone && <ReviewRow label="Contact phone">{contactPhone}</ReviewRow>}
      </dl>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Note to the review team <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={verificationNote}
          onChange={(e) => onVerificationNoteChange(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Any context that helps us verify faster — e.g., hospital affiliation, CRM state of current registration, etc."
          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
        />
        <p className="mt-1 text-xs text-slate-400">{verificationNote.length}/1000</p>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={onBack}
          disabled={submitting}
          className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors disabled:opacity-40"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 font-medium transition-colors"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Submitting…' : 'Submit claim'}
        </button>
      </div>
    </div>
  );
}

function SuccessStep({
  providerName, providerId, claimedAt,
}: {
  providerName: string;
  providerId: string;
  claimedAt: string | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Claim submitted</h2>
      <p className="text-slate-600 mb-6 max-w-md mx-auto">
        Your claim for <strong>{providerName}</strong> is now pending review. Our team
        will verify your license document within 2 business days and email you once verified.
      </p>
      {claimedAt && (
        <p className="text-xs text-slate-400 mb-6">
          Submitted {new Date(claimedAt).toLocaleString()}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={`/find-doctor/${providerId}`}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
        >
          View profile
        </Link>
        <Link
          href="/find-doctor"
          className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
        >
          Back to search
        </Link>
      </div>
    </div>
  );
}

function BlockedState({ claimStatus, providerId }: { claimStatus: ClaimStatus; providerId: string }) {
  let title = 'Unable to claim this profile';
  let message = 'This profile cannot be claimed at this time.';
  let icon = <AlertCircle className="w-8 h-8 text-slate-400" />;

  if (claimStatus.claimStatus === 'VERIFIED') {
    title = 'This profile has already been claimed';
    message = 'If you believe this is your profile and there has been an error, please contact support.';
    icon = <Shield className="w-8 h-8 text-emerald-600" />;
  } else if (claimStatus.claimStatus === 'PENDING_VERIFICATION') {
    title = 'This profile has a pending claim';
    message = 'Another user has submitted a claim for this profile and is currently under review. Contact support if this is your profile.';
    icon = <Clock className="w-8 h-8 text-amber-500" />;
  } else if (claimStatus.claimStatus === 'SUSPENDED') {
    title = 'This profile is suspended';
    message = 'This profile has been suspended. Contact support for more information.';
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
          {icon}
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">{title}</h1>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/find-doctor/${providerId}`}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
          >
            View profile
          </Link>
          <Link
            href="/find-doctor"
            className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
          >
            Back to search
          </Link>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3">
      <dt className="text-sm font-medium text-slate-500 w-full sm:w-40 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  );
}
