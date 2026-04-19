'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, MapPin, Stethoscope, Star, Shield, ChevronDown,
  Leaf, Heart, Sparkles, Activity, Filter, X, Building2,
  Info, BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import HoliPublicHeader from '@/components/public/HoliPublicHeader';

type SystemType = 'CONVENTIONAL' | 'INTEGRATIVE' | 'TRADITIONAL' | 'COMPLEMENTARY';

interface Specialty {
  slug: string;
  displayPt: string;
  displayEs: string;
  displayEn: string;
  isCam: boolean;
  systemType: SystemType;
  _count: { physicians: number };
}

interface ProviderSpecialty {
  slug: string;
  displayEn: string;
  displayPt: string;
  displayEs: string;
  isCam: boolean;
  systemType: SystemType;
  isPrimary: boolean;
}

interface ProviderEstablishment {
  name: string;
  type: string;
  city: string;
  state: string;
}

interface Provider {
  id: string;
  name: string;
  country: string;
  registryId: string;
  registryState: string;
  photoUrl: string | null;
  city: string;
  state: string;
  claimStatus: string;
  avgRating: number | null;
  reviewCount: number;
  bio: string | null;
  languages: string[];
  specialties: ProviderSpecialty[];
  establishments: ProviderEstablishment[];
}

interface SearchResponse {
  data: Provider[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SystemTypeInfo {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  subtitle: string;
  description: string;
  examples: string[];
}

const SYSTEM_TYPE_CONFIG: Record<SystemType, SystemTypeInfo> = {
  CONVENTIONAL: {
    label: 'Conventional',
    icon: <Activity className="w-4 h-4" />,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    subtitle: 'Biomedical / allopathic',
    description:
      'Mainstream medicine practiced in most hospitals worldwide — evidence-based biomedicine regulated by national medical councils (CFM, CONACEM, ReTHUS). Diagnosis, pharmacotherapy, surgery, and rehabilitation through formally recognised specialties.',
    examples: ['Cardiology', 'Internal Medicine', 'Pediatrics', 'Surgery', 'Oncology'],
  },
  INTEGRATIVE: {
    label: 'Integrative',
    icon: <Heart className="w-4 h-4" />,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    subtitle: 'Biomedicine + evidence-based complements',
    description:
      'Conventional medicine combined with evidence-based complementary therapies. Clinicians hold a medical degree and add training in functional medicine, orthomolecular nutrition, or protocol-driven integrative care.',
    examples: ['Integrative Medicine', 'Functional Medicine', 'Orthomolecular Medicine', 'Nutrology'],
  },
  TRADITIONAL: {
    label: 'Traditional',
    icon: <Leaf className="w-4 h-4" />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    subtitle: 'Whole-system traditional medicine',
    description:
      'Complete healing systems with centuries of codified theory and practice, recognised by the World Health Organization and (in Brazil) by the PNPIC/SUS policy. Practitioners are trained in the full system, not isolated techniques.',
    examples: ['Traditional Chinese Medicine', 'Ayurveda', 'Anthroposophic Medicine'],
  },
  COMPLEMENTARY: {
    label: 'Complementary',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    subtitle: 'Standalone complementary practices',
    description:
      'Focused therapeutic modalities used alongside conventional care. Many are PNPIC-recognised in Brazil and practised by both MDs and licensed non-MD professionals depending on the modality and country.',
    examples: ['Acupuncture', 'Homeopathy', 'Naturopathy', 'Chiropractic', 'Osteopathy', 'Phytotherapy'],
  },
};

const SYSTEM_TYPES: SystemType[] = ['CONVENTIONAL', 'INTEGRATIVE', 'TRADITIONAL', 'COMPLEMENTARY'];

export default function FindDoctorPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [specialties, setSpecialties] = useState<Record<SystemType, Specialty[]>>({
    CONVENTIONAL: [], INTEGRATIVE: [], TRADITIONAL: [], COMPLEMENTARY: [],
  });
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [query, setQuery] = useState('');
  const [selectedSystemType, setSelectedSystemType] = useState<SystemType | ''>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [sort, setSort] = useState<'relevance' | 'rating' | 'name'>('relevance');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showAboutCam, setShowAboutCam] = useState(false);

  useEffect(() => {
    fetch('/api/providers/specialties')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setSpecialties(res.data);
      })
      .catch(() => {});
  }, []);

  const searchProviders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedSpecialty) params.set('specialty', selectedSpecialty);
    if (selectedSystemType) params.set('systemType', selectedSystemType);
    if (city) params.set('city', city);
    if (state) params.set('state', state);
    params.set('sort', sort);
    params.set('page', page.toString());
    params.set('limit', '12');

    try {
      const res = await fetch(`/api/providers/search?${params}`);
      const data: SearchResponse = await res.json();
      setProviders(data.data);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch {
      setProviders([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [query, selectedSpecialty, selectedSystemType, city, state, sort, page]);

  useEffect(() => {
    searchProviders();
  }, [searchProviders]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    searchProviders();
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedSystemType('');
    setSelectedSpecialty('');
    setCity('');
    setState('');
    setSort('relevance');
    setPage(1);
  };

  const hasActiveFilters = query || selectedSystemType || selectedSpecialty || city || state;

  const filteredSpecialties = selectedSystemType
    ? specialties[selectedSystemType] || []
    : Object.values(specialties).flat();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface-secondary, #f8fafc)' }}>
      <HoliPublicHeader />

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0b1220 0%, #111f2b 55%, #0e4f3d 100%)' }}>
        {/* Ambient orbs — subtle, not flashy */}
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none">
          <div className="absolute top-0 left-0 w-[520px] h-[520px] bg-emerald-400 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-20 w-[560px] h-[560px] bg-sky-400 rounded-full blur-[140px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-12 md:pt-16 pb-14 md:pb-20">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.16em] uppercase text-emerald-200/90 mb-5">
            <Sparkles className="w-3 h-3" /> Latin America&apos;s CAM-native directory
          </div>

          <h1 className="text-[2.6rem] md:text-[3.4rem] leading-[1.05] font-semibold tracking-tight text-white mb-4 max-w-3xl">
            Care across every system of medicine.
          </h1>
          <p className="text-lg md:text-[1.15rem] text-slate-300/90 leading-relaxed max-w-2xl">
            Verified clinicians spanning conventional biomedicine, integrative care, whole-system
            traditional medicine, and evidence-based complementary therapies — across Brazil,
            Mexico, Colombia and beyond.
          </p>

          {/* Pre-op tools strip */}
          <div className="mt-7 flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
              Pre-op toolkit
            </span>
            <Link
              href="/find-doctor/preop-calculators"
              className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-white text-sm font-medium hover:bg-white/15 transition-colors"
            >
              <Heart className="w-3.5 h-3.5 text-rose-300" />
              Risk calculators
              <span className="text-white/50 group-hover:text-white/90 group-hover:translate-x-0.5 transition-all">→</span>
            </Link>
            <Link
              href="/find-doctor/preop-screening"
              className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-100 text-sm font-medium hover:bg-amber-400/20 transition-colors"
            >
              <Leaf className="w-3.5 h-3.5" />
              Supplement screening
              <span className="text-amber-200/50 group-hover:text-amber-100 group-hover:translate-x-0.5 transition-all">→</span>
            </Link>
          </div>

          {/* System type pills */}
          <div className="mt-10 flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedSystemType(''); setSelectedSpecialty(''); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !selectedSystemType
                  ? 'bg-white text-slate-900 shadow-lg shadow-black/10'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
            >
              All disciplines
            </button>
            {SYSTEM_TYPES.map((st) => {
              const config = SYSTEM_TYPE_CONFIG[st];
              const count = (specialties[st] || []).reduce((acc, s) => acc + s._count.physicians, 0);
              const active = selectedSystemType === st;
              return (
                <button
                  key={st}
                  onClick={() => {
                    setSelectedSystemType(active ? '' : st);
                    setSelectedSpecialty('');
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    active
                      ? 'bg-white text-slate-900 shadow-lg shadow-black/10'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  }`}
                >
                  {config.icon}
                  {config.label}
                  {count > 0 && (
                    <span className={`text-xs ${active ? 'text-slate-500' : 'text-white/50'}`}>{count}</span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowAboutCam(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-transparent text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              <Info className="w-4 h-4" />
              What do these mean?
            </button>
          </div>

          {/* Trust strip — bottom of hero */}
          <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-emerald-400/80" />
              CFM · CONACEM · ReTHUS verified
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 text-emerald-400/80" />
              WHO · PNPIC · NCCIH · NUCC aligned
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400/80" />
              47 specialties · 4 systems of medicine
            </span>
          </div>
        </div>
      </div>

      {showAboutCam && <CamExplainerModal onClose={() => setShowAboutCam(false)} />}

      {/* Search bar */}
      <div className="max-w-7xl mx-auto px-6 -mt-6">
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 md:p-6"
        >
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
              />
            </div>

            <div className="relative flex-1">
              <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={selectedSpecialty}
                onChange={(e) => { setSelectedSpecialty(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-8 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none text-slate-900 bg-white"
              >
                <option value="">All specialties</option>
                {filteredSpecialties.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.displayEn} {s.isCam ? '(CAM)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                showFilters || hasActiveFilters
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              type="submit"
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Search
            </button>
          </div>

          {/* Expandable filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="City..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="State / region..."
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value as typeof sort); setPage(1); }}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="rating">Sort: Highest Rated</option>
                  <option value="name">Sort: Name A-Z</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                >
                  <X className="w-3 h-3" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Results header */}
        {!initialLoad && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-slate-600">
              <span className="font-semibold text-slate-900">{total}</span>{' '}
              {total === 1 ? 'provider' : 'providers'} found
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-slate-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-4 bg-slate-100 rounded w-full mb-2" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : providers.length === 0 && !initialLoad ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No providers found</h3>
            <p className="text-slate-500 mb-6">
              Try adjusting your search criteria or browse by discipline above.
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          page === pageNum
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  const primarySpecialty = provider.specialties.find((s) => s.isPrimary) || provider.specialties[0];
  const otherSpecialties = provider.specialties.filter((s) => s !== primarySpecialty);
  const initials = provider.name
    .split(' ')
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Link
      href={`/find-doctor/${provider.id}`}
      className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all group block"
    >
      <div className="flex items-start gap-4 mb-4">
        {provider.photoUrl ? (
          <img
            src={provider.photoUrl}
            alt={provider.name}
            className="w-14 h-14 rounded-full object-cover border-2 border-slate-100"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center border-2 border-emerald-100">
            <span className="text-lg font-bold text-emerald-700">{initials}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
              {provider.name}
            </h3>
            {provider.claimStatus === 'VERIFIED' && (
              <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
          </div>
          {primarySpecialty && (
            <p className="text-sm text-slate-500 truncate">{primarySpecialty.displayEn}</p>
          )}
        </div>
      </div>

      {/* Specialty badges */}
      {provider.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {provider.specialties.slice(0, 3).map((s) => {
            const config = SYSTEM_TYPE_CONFIG[s.systemType];
            return (
              <span
                key={s.slug}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}
              >
                {s.isCam && <Leaf className="w-3 h-3" />}
                {s.displayEn}
              </span>
            );
          })}
          {otherSpecialties.length > 2 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
              +{otherSpecialties.length - 2} more
            </span>
          )}
        </div>
      )}

      {/* Rating + location */}
      <div className="flex items-center gap-4 text-sm text-slate-500">
        {provider.avgRating && provider.avgRating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="font-medium text-slate-700">
              {Number(provider.avgRating).toFixed(1)}
            </span>
            {provider.reviewCount > 0 && (
              <span>({provider.reviewCount})</span>
            )}
          </div>
        )}
        {(provider.city || provider.state) && (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span className="truncate">
              {[provider.city, provider.state].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Bio preview */}
      {provider.bio && (
        <p className="mt-3 text-sm text-slate-500 line-clamp-2">{provider.bio}</p>
      )}

      {/* Establishment */}
      {provider.establishments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{provider.establishments[0].name}</span>
          </div>
        </div>
      )}
    </Link>
  );
}

function CamExplainerModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cam-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl"
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
              <BookOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 id="cam-modal-title" className="text-2xl font-bold text-slate-900 mb-2">
                How we classify medical care
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Healthcare worldwide covers more than just conventional biomedicine. We group
                practitioners into four systems so you can find the right care for your situation —
                whether that means a cardiologist, an acupuncturist, or a clinician who combines both.
                Every provider is verified against their country's official registry.
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 pt-6 space-y-6">
          {SYSTEM_TYPES.map((st) => {
            const cfg = SYSTEM_TYPE_CONFIG[st];
            return (
              <div key={st} className="flex items-start gap-4">
                <div className={`p-3 rounded-lg border flex-shrink-0 ${cfg.bg}`}>
                  <div className={cfg.color}>{cfg.icon}</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap mb-1">
                    <h3 className={`text-lg font-semibold ${cfg.color}`}>{cfg.label}</h3>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">
                      {cfg.subtitle}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-2">
                    {cfg.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cfg.examples.map((ex) => (
                      <span
                        key={ex}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-8 pb-8">
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-slate-50 border border-emerald-100 p-5">
            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4 text-emerald-600" />
              A note on integrative care
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Many complementary and traditional therapies are most effective when coordinated with
              conventional care — especially around surgery, pregnancy, cancer treatment, and chronic
              disease management. Some herbs and supplements interact with prescription medications
              and must be adjusted before procedures. Our directory helps clinicians refer patients
              across systems transparently, with a disclosed, non-commercial referral protocol.
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-4 leading-relaxed">
            References: WHO Traditional Medicine Strategy 2014-2023 · Brazil PNPIC (Portaria 971/2006 &amp; 849/2017) ·
            NCCIH classification framework · NUCC healthcare provider taxonomy.
          </p>
        </div>
      </div>
    </div>
  );
}
