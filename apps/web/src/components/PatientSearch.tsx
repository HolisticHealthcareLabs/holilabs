'use client';

import { useState } from 'react';
import Link from 'next/link';

const PATIENTS = [
  {
    id: 'pt-001',
    name: 'María González',
    age: '45-54',
    condition: 'Diabetes Tipo 2',
    lastVisit: '2025-01-15',
    token: 'VBQ-MG-4554-T2D',
    emoji: '👩',
    viewCount: 24,
  },
  {
    id: 'pt-002',
    name: 'Carlos Silva',
    age: '60-69',
    condition: 'Post-IAM',
    lastVisit: '2025-01-10',
    token: 'VBQ-CS-6069-PIM',
    emoji: '👨',
    viewCount: 18,
  },
  {
    id: 'pt-003',
    name: 'Ana Rodríguez',
    age: '30-39',
    condition: 'Asma',
    lastVisit: '2025-01-20',
    token: 'VBQ-AR-3039-ASM',
    emoji: '👩‍🦰',
    viewCount: 12,
  },
];

interface PatientSearchProps {
  onSelectPatient?: (patientId: string) => void;
  showMostViewed?: boolean;
}

export default function PatientSearch({ onSelectPatient, showMostViewed = true }: PatientSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPatients = PATIENTS.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.condition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mostViewedPatients = [...PATIENTS].sort((a, b) => b.viewCount - a.viewCount).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {/* Decorative - low contrast intentional for visual hierarchy */}
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search patients by name, token, or condition..."
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
        />
      </div>

      {/* Most Viewed Section */}
      {showMostViewed && !searchQuery && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-accent" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            Most Viewed Patients
          </h3>
          <div className="grid gap-3">
            {mostViewedPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => onSelectPatient?.(patient.id)}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">{patient.emoji}</div>
                  <div>
                    <p className="font-semibold text-gray-900">{patient.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{patient.token}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="px-3 py-1 bg-accent/10 text-primary rounded-full text-xs font-medium">
                    {patient.condition}
                  </span>
                  {/* Decorative - low contrast intentional for meta info */}
                  <span className="text-xs text-gray-400">{patient.viewCount} views</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchQuery && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Search Results ({filteredPatients.length})
          </h3>
          <div className="grid gap-3">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => onSelectPatient?.(patient.id)}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">{patient.emoji}</div>
                    <div>
                      <p className="font-semibold text-gray-900">{patient.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{patient.token}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="px-3 py-1 bg-accent/10 text-primary rounded-full text-xs font-medium">
                      {patient.condition}
                    </span>
                    <Link
                      href={`/dashboard/patients/${patient.id}`}
                      className="text-primary hover:text-accent font-medium text-sm"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                {/* Decorative - low contrast intentional for visual hierarchy */}
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2">No patients found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
