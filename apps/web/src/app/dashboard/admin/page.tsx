'use client';
export const dynamic = 'force-dynamic';


import DashboardLayout from '@/components/DashboardLayout';

export default function AdminPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Administración</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sistema</p>
                <p className="text-2xl font-bold text-primary">Activo</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Almacenamiento</p>
                <p className="text-2xl font-bold text-primary">2.4 GB</p>
              </div>
              <svg className="w-12 h-12 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Usuarios Activos</p>
                <p className="text-2xl font-bold text-primary">8</p>
              </div>
              <svg className="w-12 h-12 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security & Compliance */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Seguridad y Cumplimiento
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">HIPAA Compliance</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Activo</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">GDPR Compliance</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Activo</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">LGPD Compliance (Brasil)</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Activo</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Cifrado End-to-End</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Activo</span>
              </div>
            </div>
          </div>

          {/* De-identification Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Configuración de Des-identificación
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium">Método Safe Harbor</span>
                <span className="px-3 py-1 bg-primary text-white rounded-full text-xs font-bold">Activo</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">18 Identificadores HIPAA</span>
                <span className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-xs font-bold">Supresos</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Pseudonimización</span>
                <span className="px-3 py-1 bg-primary text-white rounded-full text-xs font-bold">Habilitado</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Generalización de Datos</span>
                <span className="px-3 py-1 bg-primary text-white rounded-full text-xs font-bold">Habilitado</span>
              </div>
            </div>
          </div>

          {/* AI Model Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 7H7v6h6V7z" />
                <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
              </svg>
              Modelos de IA
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Claude 3.5 Sonnet</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Activo</span>
                </div>
                <div className="text-xs text-gray-600">Consultas médicas generales</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Differential Privacy Engine</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Activo</span>
                </div>
                <div className="text-xs text-gray-600">ε = 1.0, δ = 1e-5</div>
              </div>
            </div>
          </div>

          {/* Audit Log */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Registro de Auditoría
            </h3>
            <div className="space-y-2">
              <div className="p-3 border-l-4 border-green-500 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Hoy, 14:32</div>
                <div className="text-sm font-medium">Documento subido exitosamente</div>
                <div className="text-xs text-gray-600">Dr. Rossi → Paciente VBQ-MG-4554-T2D</div>
              </div>
              <div className="p-3 border-l-4 border-blue-500 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Hoy, 13:15</div>
                <div className="text-sm font-medium">Consulta de IA realizada</div>
                <div className="text-xs text-gray-600">Dr. Rossi → Paciente VBQ-CS-6069-PIM</div>
              </div>
              <div className="p-3 border-l-4 border-purple-500 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Hoy, 11:47</div>
                <div className="text-sm font-medium">Acceso a billetera digital</div>
                <div className="text-xs text-gray-600">Dr. Rossi → Paciente VBQ-AR-3039-ASM</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
