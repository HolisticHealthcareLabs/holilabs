'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// Mock documents in patient's digital wallet
const MOCK_DOCUMENTS = {
  'pt-001': [
    { id: 'd1', name: 'Análisis de Sangre - Enero 2025', type: 'PDF', size: '1.2 MB', date: '2025-01-15', status: 'verified' },
    { id: 'd2', name: 'Ecografía Abdominal', type: 'DICOM', size: '45.8 MB', date: '2025-01-10', status: 'verified' },
    { id: 'd3', name: 'Receta Metformina', type: 'PDF', size: '0.3 MB', date: '2025-01-15', status: 'pending' },
  ],
  'pt-002': [
    { id: 'd4', name: 'ECG Post-IAM', type: 'PDF', size: '0.8 MB', date: '2025-01-10', status: 'verified' },
    { id: 'd5', name: 'Ecocardiograma', type: 'DICOM', size: '78.3 MB', date: '2025-01-08', status: 'verified' },
    { id: 'd6', name: 'Plan de Rehabilitación', type: 'PDF', size: '1.5 MB', date: '2025-01-10', status: 'verified' },
    { id: 'd7', name: 'Laboratorio Enzimas Cardiacas', type: 'CSV', size: '0.1 MB', date: '2025-01-07', status: 'verified' },
    { id: 'd8', name: 'Receta Atorvastatina', type: 'PDF', size: '0.2 MB', date: '2025-01-10', status: 'verified' },
  ],
  'pt-003': [
    { id: 'd9', name: 'Espirometría', type: 'PDF', size: '0.9 MB', date: '2025-01-20', status: 'verified' },
    { id: 'd10', name: 'Plan de Tratamiento Asma', type: 'PDF', size: '0.5 MB', date: '2025-01-20', status: 'verified' },
  ],
};

const PATIENTS = {
  'pt-001': { name: 'María González', emoji: '👩', condition: 'Diabetes Tipo 2' },
  'pt-002': { name: 'Carlos Silva', emoji: '👨', condition: 'Post-IAM' },
  'pt-003': { name: 'Ana Rodríguez', emoji: '👩‍🦰', condition: 'Asma' },
};

export default function WalletPage() {
  const params = useParams();
  const patientId = (params?.id as string) || '';
  const patient = PATIENTS[patientId as keyof typeof PATIENTS];
  const documents = MOCK_DOCUMENTS[patientId as keyof typeof MOCK_DOCUMENTS] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/patients" className="flex items-center space-x-3">
                <Image src="/logos/holi-light.svg" alt="Holi Labs" width={40} height={40} className="h-10 w-auto" />
                <span className="text-xl font-bold">Pacientes</span>
              </Link>
              <span className="text-sm opacity-80">/ {patient?.name} / Billetera Digital</span>
            </div>
            <Link
              href="/dashboard/upload"
              className="bg-white text-primary px-4 py-2 rounded-lg hover:bg-gray-100 font-medium"
            >
              + Subir Documento
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Patient Header */}
        <div className="bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-6xl">{patient?.emoji}</div>
            <div>
              <h1 className="text-3xl font-bold">{patient?.name}</h1>
              <p className="text-lg opacity-90">{patient?.condition}</p>
              <p className="text-sm opacity-75 mt-1">ID: {patientId}</p>
            </div>
          </div>
        </div>

        {/* Wallet Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-3xl mb-2">📄</div>
            <div className="text-2xl font-bold">{documents.length}</div>
            <div className="text-sm text-gray-600">Documentos Totales</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-3xl mb-2">✓</div>
            <div className="text-2xl font-bold text-green-600">
              {documents.filter((d) => d.status === 'verified').length}
            </div>
            <div className="text-sm text-gray-600">Verificados</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-2xl font-bold text-yellow-600">
              {documents.filter((d) => d.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-3xl mb-2">💾</div>
            <div className="text-2xl font-bold">
              {documents.reduce((sum, d) => sum + parseFloat(d.size), 0).toFixed(1)} MB
            </div>
            <div className="text-sm text-gray-600">Almacenamiento</div>
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-blue-900 mb-2">🔒 Seguridad y Privacidad</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Todos los documentos están des-identificados según HIPAA Safe Harbor</li>
            <li>✓ Almacenamiento cifrado AES-256 en MinIO</li>
            <li>✓ Pseudónimo criptográfico protege identidad real</li>
            <li>✓ Auditoría inmutable de todos los accesos</li>
          </ul>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold">Documentos en Billetera Digital</h2>
          </div>

          {documents.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">📭</div>
              <p>No hay documentos en esta billetera</p>
              <Link
                href="/dashboard/upload"
                className="inline-block mt-4 text-primary hover:underline"
              >
                Subir primer documento →
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="text-4xl">
                        {doc.type === 'PDF' ? '📄' : doc.type === 'DICOM' ? '🩻' : '📊'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold">{doc.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span>{doc.type}</span>
                          <span>·</span>
                          <span>{doc.size}</span>
                          <span>·</span>
                          <span>{doc.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        doc.status === 'verified'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {doc.status === 'verified' ? '✓ Verificado' : '⏳ Pendiente'}
                      </span>

                      <div className="flex space-x-2">
                        <button className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90 text-sm">
                          Ver
                        </button>
                        <button className="px-3 py-1 border rounded hover:bg-gray-100 text-sm">
                          Descargar
                        </button>
                        <button className="px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 text-sm">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Blockchain Info (Future) */}
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-bold text-purple-900 mb-2">🔗 Próximamente: Integración Blockchain</h3>
          <p className="text-sm text-purple-800">
            Los documentos en esta billetera digital podrán ser registrados en blockchain para inmutabilidad
            y portabilidad entre proveedores de salud.
          </p>
        </div>
      </div>
    </div>
  );
}
