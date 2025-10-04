import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
              V
            </div>
            <h1 className="text-2xl font-bold text-gray-900">VidaBanq</h1>
          </div>
          <nav className="flex space-x-6">
            <Link href="/login" className="text-gray-600 hover:text-primary transition">
              Iniciar Sesión
            </Link>
            <Link href="/register" className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition">
              Registrarse
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Plataforma de IA Médica con Privacidad Garantizada
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Des-identificación automática según HIPAA Safe Harbor + GDPR.
            Privacidad diferencial para investigación. Compatible con LGPD.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/dashboard"
              className="bg-primary text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-primary/90 transition shadow-lg"
            >
              Comenzar
            </Link>
            <Link
              href="/docs"
              className="bg-white text-primary px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-50 transition border-2 border-primary"
            >
              Documentación
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Des-identificación Automática</h3>
            <p className="text-gray-600">
              18 identificadores HIPAA Safe Harbor. NLP multilingüe (ES/PT/EN). DICOM y OCR incluidos.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-900 mb-2">IA Clínica Segura</h3>
            <p className="text-gray-600">
              Sanitización de entrada. Limpieza de salida. Modo de cuidado con guardrails CDS.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Exportaciones con DP</h3>
            <p className="text-gray-600">
              Privacidad diferencial con contabilidad ε/δ. Recibos criptográficos. Períodos de enfriamiento.
            </p>
          </div>
        </div>

        {/* Regional compliance */}
        <div className="mt-12 bg-white p-8 rounded-lg shadow-md">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Cumplimiento Regional</h3>
          <div className="flex justify-center space-x-8 text-center">
            <div>
              <div className="text-3xl mb-2">🇧🇷</div>
              <div className="font-semibold">Brasil</div>
              <div className="text-sm text-gray-600">LGPD</div>
            </div>
            <div>
              <div className="text-3xl mb-2">🇲🇽</div>
              <div className="font-semibold">México</div>
              <div className="text-sm text-gray-600">LFPDPPP</div>
            </div>
            <div>
              <div className="text-3xl mb-2">🇦🇷</div>
              <div className="font-semibold">Argentina</div>
              <div className="text-sm text-gray-600">PDPA</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 VidaBanq. HIPAA/GDPR/LGPD Compliant.</p>
        </div>
      </footer>
    </div>
  );
}
