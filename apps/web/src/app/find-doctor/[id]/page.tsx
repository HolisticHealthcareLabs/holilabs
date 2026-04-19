'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, MapPin, Star, Shield, Phone, Mail, Globe, Building2,
  Leaf, Heart, Sparkles, Activity, GraduationCap, Languages, DollarSign,
  Clock, ChevronRight, MessageCircle, Send, Loader2, AlertCircle, CheckCircle2,
  X, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type SystemType = 'CONVENTIONAL' | 'INTEGRATIVE' | 'TRADITIONAL' | 'COMPLEMENTARY';

interface ProviderSpecialty {
  slug: string;
  displayEn: string;
  displayPt: string;
  displayEs: string;
  isCam: boolean;
  systemType: SystemType;
  isAreaOfExpertise: boolean;
  isPrimary: boolean;
  rqeNumber: string | null;
  parent: { slug: string; displayEn: string; displayPt: string; displayEs: string } | null;
}

interface Establishment {
  id: string;
  name: string;
  tradeName: string | null;
  type: string;
  city: string;
  state: string;
  street: string | null;
  cep: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
}

interface InsurancePlan {
  slug: string;
  operator: string;
  plan: string;
  country: string;
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
}

interface ProviderProfile {
  id: string;
  name: string;
  country: string;
  registryId: string;
  registryState: string;
  registrySource: string;
  photoUrl: string | null;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  claimStatus: string;
  avgRating: number | null;
  reviewCount: number;
  bio: string | null;
  languages: string[];
  education: string[];
  consultationFee: number | null;
  consultationCurrency: string | null;
  websiteUrl: string | null;
  phone: string | null;
  email: string | null;
  specialties: ProviderSpecialty[];
  establishments: Establishment[];
  insurancePlans: InsurancePlan[];
  reviews: Review[];
}

const SYSTEM_TYPE_CONFIG: Record<SystemType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  CONVENTIONAL: { label: 'Conventional', icon: <Activity className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  INTEGRATIVE: { label: 'Integrative', icon: <Heart className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  TRADITIONAL: { label: 'Traditional', icon: <Leaf className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  COMPLEMENTARY: { label: 'Complementary', icon: <Sparkles className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
};

export default function ProviderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownReview, setOwnReview] = useState<Review | null | 'unauthenticated' | 'none'>(null);
  const [showReferralModal, setShowReferralModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/providers/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Provider not found');
        return r.json();
      })
      .then((res) => setProvider(res.data))
      .catch(() => setError('Provider not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/providers/${id}/reviews`)
      .then((r) => {
        if (r.status === 401) { setOwnReview('unauthenticated'); return null; }
        if (!r.ok) return null;
        return r.json();
      })
      .then((res) => {
        if (res === null) return;
        setOwnReview(res.data ?? 'none');
      })
      .catch(() => setOwnReview('unauthenticated'));
  }, [id]);

  const handleReviewSubmitted = (review: Review) => {
    setOwnReview(review);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-48 mb-8" />
            <div className="bg-white rounded-xl border border-slate-200 p-8">
              <div className="flex gap-6">
                <div className="w-24 h-24 bg-slate-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-7 bg-slate-200 rounded w-64 mb-3" />
                  <div className="h-5 bg-slate-100 rounded w-40 mb-2" />
                  <div className="h-5 bg-slate-100 rounded w-32" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Provider Not Found</h1>
          <p className="text-slate-500 mb-6">This provider profile is not available.</p>
          <Link
            href="/find-doctor"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const primarySpecialty = provider.specialties.find((s) => s.isPrimary) || provider.specialties[0];
  const initials = provider.name
    .split(' ')
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const groupedInsurance = provider.insurancePlans.reduce<Record<string, InsurancePlan[]>>((acc, plan) => {
    if (!acc[plan.operator]) acc[plan.operator] = [];
    acc[plan.operator].push(plan);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50">
      {showReferralModal && (
        <ReferralComposerModal
          recipientId={provider.id}
          recipientName={provider.name}
          recipientCity={provider.city}
          recipientState={provider.state}
          onClose={() => setShowReferralModal(false)}
        />
      )}
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link
            href="/find-doctor"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to search
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Profile header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            {provider.photoUrl ? (
              <img
                src={provider.photoUrl}
                alt={provider.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center border-4 border-emerald-50 flex-shrink-0">
                <span className="text-2xl font-bold text-emerald-700">{initials}</span>
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{provider.name}</h1>
                    {provider.claimStatus === 'VERIFIED' && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-medium text-emerald-700">Verified</span>
                      </div>
                    )}
                  </div>
                  {primarySpecialty && (
                    <p className="text-lg text-slate-500">{primarySpecialty.displayEn}</p>
                  )}
                </div>

                {/* Rating */}
                {provider.avgRating && Number(provider.avgRating) > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <span className="text-lg font-bold text-slate-900">
                      {Number(provider.avgRating).toFixed(1)}
                    </span>
                    <span className="text-sm text-slate-500">
                      ({provider.reviewCount} {provider.reviewCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                )}
              </div>

              {/* Location + registry */}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                {(provider.city || provider.state) && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {[provider.city, provider.state, provider.country].filter(Boolean).join(', ')}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  {provider.registrySource} {provider.registryId}
                  {provider.registryState && ` (${provider.registryState})`}
                </div>
              </div>

              {/* Contact info (verified only) */}
              {(provider.phone || provider.email || provider.websiteUrl) && (
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  {provider.phone && (
                    <a href={`tel:${provider.phone}`} className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700">
                      <Phone className="w-4 h-4" />
                      {provider.phone}
                    </a>
                  )}
                  {provider.email && (
                    <a href={`mailto:${provider.email}`} className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700">
                      <Mail className="w-4 h-4" />
                      {provider.email}
                    </a>
                  )}
                  {provider.websiteUrl && (
                    <a href={provider.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700">
                      <Globe className="w-4 h-4" />
                      Website
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            {provider.bio && (
              <Section title="About">
                <p className="text-slate-600 whitespace-pre-line">{provider.bio}</p>
              </Section>
            )}

            {/* Specialties */}
            {provider.specialties.length > 0 && (
              <Section title="Specialties & Disciplines">
                <div className="space-y-3">
                  {provider.specialties.map((s) => {
                    const config = SYSTEM_TYPE_CONFIG[s.systemType];
                    return (
                      <div key={s.slug} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                        <div className={`p-2 rounded-lg border ${config.bg}`}>
                          {config.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{s.displayEn}</span>
                            {s.isPrimary && (
                              <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                                Primary
                              </span>
                            )}
                            {s.isCam && (
                              <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium flex items-center gap-0.5">
                                <Leaf className="w-3 h-3" />
                                CAM
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs ${config.color}`}>{config.label} Medicine</span>
                            {s.rqeNumber && (
                              <span className="text-xs text-slate-400">RQE: {s.rqeNumber}</span>
                            )}
                            {s.parent && (
                              <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                <ChevronRight className="w-3 h-3" />
                                {s.parent.displayEn}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Establishments */}
            {provider.establishments.length > 0 && (
              <Section title="Practice Locations">
                <div className="space-y-3">
                  {provider.establishments.map((est) => (
                    <div key={est.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                      <div className="flex items-start gap-3">
                        <Building2 className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-slate-900">{est.tradeName || est.name}</p>
                          {est.tradeName && est.name !== est.tradeName && (
                            <p className="text-xs text-slate-400">{est.name}</p>
                          )}
                          <p className="text-sm text-slate-500 mt-1">
                            {[est.street, est.city, est.state].filter(Boolean).join(', ')}
                            {est.cep && ` - ${est.cep}`}
                          </p>
                          {est.phone && (
                            <a href={`tel:${est.phone}`} className="flex items-center gap-1 text-sm text-emerald-600 mt-1">
                              <Phone className="w-3.5 h-3.5" />
                              {est.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Reviews */}
            {provider.reviews.length > 0 && (
              <Section title={`Reviews (${provider.reviews.length})`}>
                <div className="space-y-4">
                  {provider.reviews.map((review) => (
                    <div key={review.id} className="p-4 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.title && (
                        <p className="font-medium text-slate-900 mb-1">{review.title}</p>
                      )}
                      {review.body && (
                        <p className="text-sm text-slate-600">{review.body}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Submit a review */}
            <ReviewSubmissionSection
              providerId={provider.id}
              providerName={provider.name}
              ownReview={ownReview}
              onSubmitted={handleReviewSubmitted}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Quick Info</h3>
              <div className="space-y-3">
                {provider.consultationFee && (
                  <InfoRow icon={<DollarSign className="w-4 h-4" />} label="Consultation">
                    {provider.consultationCurrency || 'BRL'}{' '}
                    {provider.consultationFee.toFixed(2)}
                  </InfoRow>
                )}
                {provider.languages && provider.languages.length > 0 && (
                  <InfoRow icon={<Languages className="w-4 h-4" />} label="Languages">
                    {provider.languages.join(', ')}
                  </InfoRow>
                )}
                {provider.education && provider.education.length > 0 && (
                  <InfoRow icon={<GraduationCap className="w-4 h-4" />} label="Education">
                    <ul className="space-y-1">
                      {provider.education.map((edu, i) => (
                        <li key={i} className="text-sm text-slate-600">{edu}</li>
                      ))}
                    </ul>
                  </InfoRow>
                )}
              </div>
            </div>

            {/* Insurance plans */}
            {Object.keys(groupedInsurance).length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    Accepted Insurance
                  </div>
                </h3>
                <div className="space-y-4">
                  {Object.entries(groupedInsurance).map(([operator, plans]) => (
                    <div key={operator}>
                      <p className="text-sm font-medium text-slate-700 mb-1">{operator}</p>
                      <div className="space-y-1">
                        {plans.map((plan) => (
                          <p key={plan.slug} className="text-sm text-slate-500 pl-3 border-l-2 border-slate-200">
                            {plan.plan}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Referral CTA — visible regardless of claim status, for logged-in physicians */}
            <div className="bg-gradient-to-br from-purple-50 to-emerald-50 rounded-xl border border-emerald-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                Refer a patient here
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Send a clinical referral with transparent disclosure. Cross-modality referrals
                (e.g., conventional → acupuncture) are tracked and count toward your care-network badge.
              </p>
              <button
                onClick={() => setShowReferralModal(true)}
                className="block w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
              >
                Compose referral
              </button>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Requires a claimed physician profile.
              </p>
            </div>

            {/* Claim CTA */}
            {provider.claimStatus === 'UNCLAIMED' && (
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 p-6">
                <h3 className="font-semibold text-emerald-900 mb-2">Is this your profile?</h3>
                <p className="text-sm text-emerald-700 mb-4">
                  Claim your profile to manage your information, respond to reviews, and appear higher in search results.
                </p>
                <Link
                  href={`/find-doctor/${provider.id}/claim`}
                  className="block w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm text-center"
                >
                  Claim this profile
                </Link>
              </div>
            )}
            {provider.claimStatus === 'PENDING_VERIFICATION' && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
                <h3 className="font-semibold text-amber-900 mb-2">Claim under review</h3>
                <p className="text-sm text-amber-700">
                  A claim for this profile has been submitted and is being verified by our team.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <div className="text-sm text-slate-700 mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function ReviewSubmissionSection({
  providerId, providerName, ownReview, onSubmitted,
}: {
  providerId: string;
  providerName: string;
  ownReview: Review | null | 'unauthenticated' | 'none';
  onSubmitted: (r: Review) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ownReview === null) {
    return null;
  }

  if (ownReview === 'unauthenticated') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">Share your experience</h3>
            <p className="text-sm text-slate-500 mb-4">
              Sign in to leave a review for {providerName}. Reviews are moderated before publishing.
            </p>
            <Link
              href={`/sign-in?next=${encodeURIComponent(`/find-doctor/${providerId}`)}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm transition-colors"
            >
              Sign in to write a review
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (ownReview !== 'none') {
    const existing = ownReview;
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Your review
        </h3>
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < existing.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'
                  }`}
                />
              ))}
            </div>
            <StatusPill status={existing.status} />
          </div>
          {existing.title && <p className="font-medium text-slate-900 mb-1">{existing.title}</p>}
          {existing.body && <p className="text-sm text-slate-600">{existing.body}</p>}
          <p className="text-xs text-slate-400 mt-2">
            Submitted {new Date(existing.createdAt).toLocaleDateString()}
          </p>
        </div>
        {existing.status === 'PENDING' && (
          <p className="text-xs text-slate-500 mt-3">
            Your review is in moderation and will appear publicly once approved.
          </p>
        )}
      </div>
    );
  }

  const canSubmit = rating > 0 && (title.trim().length > 0 || body.trim().length > 0);

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/providers/${providerId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          title: title.trim() || undefined,
          body: body.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Failed to submit review');
      onSubmitted(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-emerald-600" />
        Write a review
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        Share your experience with {providerName}. Reviews are moderated before publishing.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Rating <span className="text-red-500">*</span>
        </label>
        <div
          className="flex items-center gap-1"
          role="radiogroup"
          aria-label="Star rating"
        >
          {[1, 2, 3, 4, 5].map((v) => {
            const active = (hoverRating || rating) >= v;
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={rating === v}
                aria-label={`${v} star${v === 1 ? '' : 's'}`}
                onClick={() => setRating(v)}
                onMouseEnter={() => setHoverRating(v)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 rounded hover:bg-slate-50 transition-colors"
              >
                <Star
                  className={`w-7 h-7 transition-colors ${
                    active ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                  }`}
                />
              </button>
            );
          })}
          {rating > 0 && (
            <span className="ml-2 text-sm text-slate-500">
              {rating}/5
            </span>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="review-title" className="block text-sm font-medium text-slate-700 mb-2">
          Title <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Summarize your experience"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="review-body" className="block text-sm font-medium text-slate-700 mb-2">
          Your review <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="What went well, what could be better, and any detail that would help other patients."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
        />
        <p className="mt-1 text-xs text-slate-400">{body.length}/2000</p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Please do not include personal health information.
        </p>
        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? 'Submitting…' : 'Submit review'}
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls = {
    PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    REJECTED: 'bg-red-50 text-red-700 border border-red-200',
    FLAGGED: 'bg-orange-50 text-orange-700 border border-orange-200',
  }[status] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status === 'PENDING' ? 'In review' : status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

type InitiationSource = 'DOCTOR_VISIT' | 'ASYNC_MESSAGING' | 'PATIENT_REQUEST' | 'AI_SUGGESTION';

const INITIATION_LABEL: Record<InitiationSource, string> = {
  DOCTOR_VISIT: 'During a patient visit',
  ASYNC_MESSAGING: 'Asynchronous / messaging',
  PATIENT_REQUEST: 'Patient-requested',
  AI_SUGGESTION: 'Surfaced by the CAM AI preset',
};

function ReferralComposerModal({
  recipientId, recipientName, recipientCity, recipientState, onClose,
}: {
  recipientId: string;
  recipientName: string;
  recipientCity: string | null;
  recipientState: string | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [initiationSource, setInitiationSource] = useState<InitiationSource>('DOCTOR_VISIT');
  const [patientId, setPatientId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; isCrossModality: boolean; disclosureText: string } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const submit = async () => {
    if (reason.trim().length < 5) {
      setError('Reason must be at least 5 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toPhysicianId: recipientId,
          reason: reason.trim(),
          initiationSource,
          patientId: patientId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = `/sign-in?next=${encodeURIComponent(`/find-doctor/${recipientId}`)}`;
        return;
      }
      if (res.status === 403) {
        throw new Error('You need a claimed physician profile to send referrals.');
      }
      if (!res.ok) throw new Error(data.error ?? 'Referral could not be created');
      setSuccess({
        id: data.data.id,
        isCrossModality: data.data.isCrossModality,
        disclosureText: data.data.disclosureText,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Referral failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="referral-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg flex-shrink-0">
              <Send className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 id="referral-modal-title" className="text-xl font-bold text-slate-900 mb-1">
                Refer a patient to
              </h2>
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">{recipientName}</span>
                {(recipientCity || recipientState) && (
                  <span className="text-slate-400">
                    {' · '}{[recipientCity, recipientState].filter(Boolean).join(', ')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {success ? (
          <div className="p-8">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Referral sent</h3>
              <p className="text-slate-600 max-w-md">
                {recipientName} has received the referral and will respond in their clinical-referrals inbox.
                {success.isCrossModality && (
                  <> This is a <strong>cross-modality referral</strong>, which counts toward your network badge.</>
                )}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 mb-6">
              <p className="text-xs font-medium text-slate-400 uppercase mb-1">Disclosure shown to patient</p>
              <p className="text-sm text-slate-700">{success.disclosureText}</p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
              >
                Close
              </button>
              <Link
                href="/dashboard/clinical-referrals"
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm"
              >
                View inbox <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-8">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Reason for referral <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Describe the clinical reason. Do not include personal health information in plain text — use the patient record ID below instead."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
                <p className="mt-1 text-xs text-slate-400">{reason.length}/2000</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  How is this referral being initiated?
                </label>
                <select
                  value={initiationSource}
                  onChange={(e) => setInitiationSource(e.target.value as InitiationSource)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                >
                  {(Object.keys(INITIATION_LABEL) as InitiationSource[]).map((k) => (
                    <option key={k} value={k}>{INITIATION_LABEL[k]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Patient record ID <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="Leave blank to send without patient context"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
                <p className="mt-1 text-xs text-slate-400">
                  When attached, care points accrue on the patient&apos;s wallet once the visit completes.
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>Disclosure to patient (shown verbatim):</strong>{' '}
                  You are being referred based on clinical judgment. No financial compensation or benefit
                  is exchanged between providers for this referral. You may choose any qualified practitioner
                  and are free to decline this suggestion.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || reason.trim().length < 5}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 font-medium text-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Sending…' : 'Send referral'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
