'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search, Filter, X, MapPin, Phone, ExternalLink, Activity, Star } from 'lucide-react';
import type { PhysicianResult } from './page';
import { cn } from '@/lib/utils';

// Leaflet must be loaded client-side only
const DirectoryMap = dynamic(() => import('./DirectoryMap'), { ssr: false });

const COUNTRY_LABELS: Record<string, string> = {
  BR: '🇧🇷 Brasil',
  AR: '🇦🇷 Argentina',
  UY: '🇺🇾 Uruguai',
  PY: '🇵🇾 Paraguai',
};

interface Props {
  initialPhysicians: PhysicianResult[];
  specialties: Array<{ slug: string; displayPt: string; displayEs: string }>;
}

export function DirectoryClient({ initialPhysicians, specialties }: Props) {
  const [physicians, setPhysicians] = useState(initialPhysicians);
  const [selected, setSelected] = useState<PhysicianResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(initialPhysicians.length);

  // Filters
  const [q, setQ] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [country, setCountry] = useState('');
  const [inNetwork, setInNetwork] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedRef = useRef(false);

  const search = useCallback(async (params: {
    q: string; specialty: string; country: string; inNetwork: boolean;
  }) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (params.q) sp.set('q', params.q);
      if (params.specialty) sp.set('specialty', params.specialty);
      if (params.country) sp.set('country', params.country);
      if (params.inNetwork) sp.set('inNetwork', 'true');
      sp.set('limit', '200');

      const res = await fetch(`/api/directory/search?${sp}`);
      if (!res.ok) return; // don't overwrite good server data with an error response
      const data = await res.json() as { physicians?: PhysicianResult[]; pagination?: { total: number } };
      if (data.physicians) {
        setPhysicians(data.physicians);
        setTotal(data.pagination?.total ?? data.physicians.length);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search — skips initial mount so server-rendered data is preserved
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search({ q, specialty, country, inNetwork });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, specialty, country, inNetwork, search]);

  const hasFilters = q || specialty || country || inNetwork;

  function clearFilters() {
    setQ('');
    setSpecialty('');
    setCountry('');
    setInNetwork(false);
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-4 py-3 flex-shrink-0">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
                <Activity className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-900">Holi Network</span>
            </Link>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-sm font-medium text-slate-700">Diretório Médico Mercosul</span>
              <span className="ml-2 inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                {total.toLocaleString('pt-BR')} médicos
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex flex-1 max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar médico por nome..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {q && (
                <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                hasFilters
                  ? 'border-brand-300 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Filtros
              {hasFilters && (
                <span className="ml-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-brand-600 text-[10px] text-white font-bold">
                  {[specialty, country, inNetwork].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter row */}
        {showFilters && (
          <div className="mx-auto max-w-[1400px] mt-3 flex flex-wrap items-center gap-3">
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Todas as especialidades</option>
              {specialties.map((s) => (
                <option key={s.slug} value={s.slug}>{s.displayPt}</option>
              ))}
            </select>

            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Todos os países</option>
              <option value="BR">🇧🇷 Brasil</option>
              <option value="AR">🇦🇷 Argentina</option>
              <option value="UY">🇺🇾 Uruguai</option>
              <option value="PY">🇵🇾 Paraguai</option>
            </select>

            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={inNetwork}
                onChange={(e) => setInNetwork(e.target.checked)}
                className="rounded text-brand-600"
              />
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Apenas na rede Holi
            </label>

            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-slate-800 underline">
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main content: map + list */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: physician list */}
        <div className="w-96 flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
          {loading && (
            <div className="flex h-16 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          )}
          {!loading && physicians.length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center text-center px-6">
              <p className="text-sm font-medium text-slate-600">Nenhum médico encontrado</p>
              <p className="mt-1 text-xs text-slate-400">Tente ajustar os filtros de busca</p>
            </div>
          )}
          <div className="divide-y divide-slate-100">
            {physicians.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors',
                  selected?.id === p.id && 'bg-brand-50 border-l-2 border-brand-600'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-base font-medium text-slate-600">
                    {p.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                      <span className="flex-shrink-0 text-xs text-slate-400">{COUNTRY_LABELS[p.country]?.split(' ')[0]}</span>
                    </div>
                    {p.specialties[0] && (
                      <p className="mt-0.5 text-xs text-slate-500">{p.specialties[0].namePt}</p>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      {p.city && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="h-3 w-3" />{p.city}{p.state ? `, ${p.state}` : ''}
                        </span>
                      )}
                      {p.isInNetwork && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                          <Star className="h-2.5 w-2.5 fill-green-500 text-green-500" />
                          Rede Holi
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Map */}
        <div className="flex-1 relative">
          <DirectoryMap
            physicians={physicians}
            selected={selected}
            onSelect={setSelected}
          />

          {/* Doctor detail panel */}
          {selected && (
            <div className="absolute bottom-4 right-4 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-start justify-between p-4 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
                    {selected.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 leading-tight">{selected.name}</h3>
                    {selected.specialties[0] && (
                      <p className="text-sm text-slate-500">{selected.specialties[0].namePt}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {COUNTRY_LABELS[selected.country]} {selected.registryState ? `· CRM-${selected.registryState} ${selected.registryId}` : `· ${selected.registryId}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 ml-2">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {selected.city && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    {selected.city}{selected.state ? `, ${selected.state}` : ''}
                  </div>
                )}
                {selected.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    {selected.phone}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Link
                    href={`/api/directory/${selected.id}`}
                    target="_blank"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver perfil completo
                  </Link>

                  {selected.isInNetwork ? (
                    <button className="flex-1 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-medium text-white hover:bg-[#1ea855] transition-colors">
                      Agendar via WhatsApp
                    </button>
                  ) : (
                    <Link
                      href={`/directory/claim/${selected.id}`}
                      className="flex-1 inline-flex items-center justify-center rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
                    >
                      Seja parceiro Holi
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
