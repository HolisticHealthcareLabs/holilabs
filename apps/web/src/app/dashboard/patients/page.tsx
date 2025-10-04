'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const PATIENTS = [
  {
    id: 'pt-001',
    name: 'María González',
    age: '45-54',
    condition: 'Diabetes Tipo 2',
    lastVisit: '2025-01-15',
    status: 'active',
    emoji: '👩',
    documents: 3,
    chats: 12,
  },
  {
    id: 'pt-002',
    name: 'Carlos Silva',
    age: '60-69',
    condition: 'Post-IAM',
    lastVisit: '2025-01-10',
    status: 'monitoring',
    emoji: '👨',
    documents: 5,
    chats: 8,
  },
  {
    id: 'pt-003',
    name: 'Ana Rodríguez',
    age: '30-39',
    condition: 'Asma',
    lastVisit: '2025-01-20',
    status: 'stable',
    emoji: '👩‍🦰',
    documents: 2,
    chats: 6,
  },
];

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPatients = PATIENTS.filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-3">
                <Image src="/logos/holi-light.svg" alt="Holi Labs" width={40} height={40} className="h-10 w-auto" />
                <span className="text-xl font-bold">VidaBanq</span>
              </Link>
              <span className="text-sm opacity-80">/ Pacientes</span>
            </div>
            <Link
              href="/dashboard/upload"
              className="bg-white text-primary px-4 py-2 rounded-lg hover:bg-gray-100 font-medium"
            >
              + Nuevo Paciente
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar paciente por nombre..."
            className="w-full max-w-2xl px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Patient Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <Link
              key={patient.id}
              href={`/dashboard/patients/${patient.id}`}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6"
            >
              <div className="flex items-start space-x-4">
                <div className="text-5xl">{patient.emoji}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{patient.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{patient.condition}</p>
                  <p className="text-xs text-gray-500 mb-3">{patient.age} años</p>

                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <span>📄</span>
                      <span>{patient.documents} docs</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>💬</span>
                      <span>{patient.chats} chats</span>
                    </div>
                  </div>

                  <div className={`mt-3 inline-block px-3 py-1 rounded-full text-xs ${
                    patient.status === 'active' ? 'bg-green-100 text-green-700' :
                    patient.status === 'monitoring' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {patient.status === 'active' ? 'Activo' : patient.status === 'monitoring' ? 'Monitoreo' : 'Estable'}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
