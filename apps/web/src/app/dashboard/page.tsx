'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation - Dentalink inspired */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary font-bold">
                V
              </div>
              <h1 className="text-xl font-bold">VidaBanq</h1>
            </div>

            {/* Global Search */}
            <div className="flex-1 max-w-2xl mx-8">
              <input
                type="text"
                placeholder="Buscar paciente por dni, nombre, apellido..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <button className="hover:bg-primary/80 px-3 py-2 rounded">
                🔔 Novedades
              </button>
              <button className="hover:bg-primary/80 px-3 py-2 rounded">
                ⚙️ Configuración
              </button>
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary font-bold">
                A
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <div className="bg-primary/90 border-t border-white/20">
          <div className="container mx-auto px-4">
            <nav className="flex space-x-6">
              <Link href="/dashboard" className="px-4 py-3 text-white border-b-2 border-white font-semibold">
                📊 Panel
              </Link>
              <Link href="/dashboard/patients" className="px-4 py-3 text-white/80 hover:text-white hover:bg-primary/80 transition">
                👥 Pacientes
              </Link>
              <Link href="/dashboard/upload" className="px-4 py-3 text-white/80 hover:text-white hover:bg-primary/80 transition">
                📤 Subir Datos
              </Link>
              <Link href="/dashboard/ai" className="px-4 py-3 text-white/80 hover:text-white hover:bg-primary/80 transition">
                🤖 IA
              </Link>
              <Link href="/dashboard/admin" className="px-4 py-3 text-white/80 hover:text-white hover:bg-primary/80 transition">
                🔧 Administración
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Overview Dashboard */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Recent Uploads */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Subidas Recientes</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">dataset-2025-01.csv</div>
                  <div className="text-sm text-gray-500">Hace 2 horas</div>
                </div>
                <div className="text-green-600">✓</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">imaging-study.dcm</div>
                  <div className="text-sm text-gray-500">Hace 5 horas</div>
                </div>
                <div className="text-green-600">✓</div>
              </div>
            </div>
          </div>

          {/* Pending AI Jobs */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">IA Pendientes</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                <div>
                  <div className="font-medium">Análisis Clínico #4321</div>
                  <div className="text-sm text-gray-500">Paciente: [TOKEN-892]</div>
                </div>
                <div className="text-blue-600">⏳</div>
              </div>
              <button className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-gray-500 hover:border-primary hover:text-primary transition">
                + Nuevo Análisis IA
              </button>
            </div>
          </div>

          {/* Compliance Alerts */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Alertas de Cumplimiento</h3>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <div className="font-medium text-green-800">✓ Auditoría Aprobada</div>
                <div className="text-sm text-green-600">Todos los sistemas OK</div>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="font-medium text-yellow-800">⚠ Uso de ε: 7.2/10</div>
                <div className="text-sm text-yellow-600">Acercándose al límite</div>
              </div>
            </div>
          </div>
        </div>

        {/* DP Usage Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Uso de Privacidad Diferencial (ε)</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <div>Gráfico de uso de ε por organización</div>
              <div className="text-sm">(Implementar con Chart.js o Recharts)</div>
            </div>
          </div>
        </div>

        {/* Cost Estimate Widget */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Estimación de Costos</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded">
              <div className="text-sm text-gray-600">Almacenamiento</div>
              <div className="text-2xl font-bold text-blue-600">$45.20</div>
              <div className="text-sm text-gray-500">/ mes</div>
            </div>
            <div className="p-4 bg-green-50 rounded">
              <div className="text-sm text-gray-600">Egreso de Datos</div>
              <div className="text-2xl font-bold text-green-600">$12.80</div>
              <div className="text-sm text-gray-500">/ mes</div>
            </div>
            <div className="p-4 bg-purple-50 rounded">
              <div className="text-sm text-gray-600">Total Estimado</div>
              <div className="text-2xl font-bold text-purple-600">$58.00</div>
              <div className="text-sm text-gray-500">/ mes</div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating AI Chat Button - Dentalink inspired */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:bg-primary/90 transition">
        🤖
      </button>
    </div>
  );
}
