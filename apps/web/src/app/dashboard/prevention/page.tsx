'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Heart, Shield, Baby, Stethoscope, Ribbon, Droplets,
  ChevronRight, Search, Filter,
} from 'lucide-react';

interface ProtocolTemplate {
  id: string;
  name: string;
  specialty: string;
  Icon: React.FC<{ className?: string }>;
  description: string;
  interventionCount: number;
  screeningCount: number;
  accent: string;
  border: string;
  iconBg: string;
}

const PROTOCOLS: ProtocolTemplate[] = [
  {
    id: 'cardiovascular',
    name: 'Cardiovascular Prevention',
    specialty: 'Cardiology',
    Icon: Heart,
    description: 'Comprehensive protocol for cardiovascular disease prevention, risk stratification, and lipid management.',
    interventionCount: 5,
    screeningCount: 4,
    accent: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200/60 dark:border-rose-500/20',
    iconBg: 'bg-rose-50 dark:bg-rose-500/10',
  },
  {
    id: 'diabetes',
    name: 'Diabetes Prevention',
    specialty: 'Endocrinology',
    Icon: Stethoscope,
    description: 'Type 2 diabetes prevention and management with HbA1c monitoring, retinopathy screening, and foot care.',
    interventionCount: 5,
    screeningCount: 5,
    accent: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200/60 dark:border-emerald-500/20',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    id: 'cancer-screening',
    name: 'Cancer Screening',
    specialty: 'Oncology',
    Icon: Ribbon,
    description: 'Evidence-based early detection protocols for breast, cervical, colorectal, and prostate cancers.',
    interventionCount: 5,
    screeningCount: 5,
    accent: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200/60 dark:border-violet-500/20',
    iconBg: 'bg-violet-50 dark:bg-violet-500/10',
  },
  {
    id: 'hypertension',
    name: 'Hypertension Management',
    specialty: 'Internal Medicine',
    Icon: Droplets,
    description: 'Comprehensive blood pressure control with ambulatory monitoring, medication optimization, and DASH diet guidance.',
    interventionCount: 5,
    screeningCount: 5,
    accent: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200/60 dark:border-amber-500/20',
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  {
    id: 'pediatrics',
    name: 'Preventive Pediatrics',
    specialty: 'Pediatrics',
    Icon: Baby,
    description: 'Vaccination schedules, developmental milestones tracking, growth monitoring, and accident prevention.',
    interventionCount: 5,
    screeningCount: 5,
    accent: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-200/60 dark:border-pink-500/20',
    iconBg: 'bg-pink-50 dark:bg-pink-500/10',
  },
  {
    id: 'womens-health',
    name: "Women's Health",
    specialty: 'Gynecology',
    Icon: Shield,
    description: 'Annual gynecological exam, cervical cytology, mammography, family planning, and osteoporosis screening.',
    interventionCount: 5,
    screeningCount: 5,
    accent: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-200/60 dark:border-teal-500/20',
    iconBg: 'bg-teal-50 dark:bg-teal-500/10',
  },
];

export default function PreventionPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');

  const specialties = Array.from(new Set(PROTOCOLS.map((p) => p.specialty)));

  const filtered = PROTOCOLS.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty =
      selectedSpecialty === 'all' || p.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Prevention Protocols
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Evidence-based preventive care protocols and screening guidelines
          </p>
        </div>
        <Link
          href="/dashboard/prevention/hub"
          className="
            inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
            bg-gray-900 dark:bg-white text-white dark:text-gray-900
            hover:bg-gray-800 dark:hover:bg-gray-100
            transition-colors
          "
        >
          Open Prevention Hub
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search protocols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              w-full pl-9 pr-3 py-2 text-sm rounded-xl
              bg-white dark:bg-gray-900
              border border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-300
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500
              transition-colors
            "
          />
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="
              px-3 py-2 text-sm rounded-xl
              bg-white dark:bg-gray-900
              border border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-300
              focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500
            "
          >
            <option value="all">All Specialties</option>
            {specialties.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Protocol Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((protocol) => {
          const Icon = protocol.Icon;
          return (
            <div
              key={protocol.id}
              className={`
                rounded-2xl border bg-white dark:bg-gray-900 p-5
                hover:shadow-md transition-shadow cursor-pointer group
                ${protocol.border}
              `}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${protocol.iconBg}`}>
                  <Icon className={`w-5 h-5 ${protocol.accent}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {protocol.name}
                  </h3>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                    {protocol.specialty}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 line-clamp-2">
                {protocol.description}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                <span>{protocol.interventionCount} interventions</span>
                <span className="w-0.5 h-0.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span>{protocol.screeningCount} screenings</span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Shield className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No protocols match your search
          </p>
        </div>
      )}
    </div>
  );
}
