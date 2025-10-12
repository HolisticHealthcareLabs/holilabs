'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, organization, role }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: '¡Éxito! Revise su correo electrónico para la confirmación.' });
        setEmail('');
        setName('');
        setOrganization('');
        setRole('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Algo salió mal. Inténtelo de nuevo.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de red. Inténtelo de nuevo.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <Image
                src="/logos/Logo 1_Light.svg"
                alt="Holi Labs"
                width={40}
                height={40}
                className="transition-transform group-hover:scale-110"
              />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Holi Labs
            </h1>
          </Link>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#problema" className="text-gray-300 hover:text-white transition-colors font-medium">
              El Problema
            </a>
            <a href="#solucion" className="text-gray-300 hover:text-white transition-colors font-medium">
              Solución
            </a>
            <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors font-medium">
              Plataforma
            </Link>
            <Link
              href="#waitlist"
              className="bg-white text-black px-6 py-2.5 rounded-full hover:bg-gray-200 transition-all font-semibold shadow-lg shadow-white/20 hover:shadow-white/40"
            >
              Ver demostración
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Subtle Background Elements */}
        <div
          className="absolute inset-0 opacity-20"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        >
          <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main Headline */}
            <h1
              className="text-7xl md:text-8xl lg:text-9xl font-bold mb-8 leading-[0.95]"
              style={{ transform: `translateY(${scrollY * -0.05}px)` }}
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                El doble
              </span>{' '}
              de riesgo.
            </h1>

            {/* Subheadline */}
            <p
              className="text-2xl md:text-3xl text-gray-300 mb-12 leading-relaxed max-w-3xl mx-auto"
              style={{ transform: `translateY(${scrollY * -0.08}px)` }}
            >
              El agotamiento médico, impulsado por el trabajo administrativo, duplica el riesgo de errores.{' '}
              <span className="text-white">Es hora de cambiar el enfoque de la pantalla al paciente.</span>
            </p>

            {/* CTA Button */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center mb-20"
              style={{ transform: `translateY(${scrollY * -0.1}px)` }}
            >
              <Link
                href="#waitlist"
                className="bg-gradient-to-r from-red-500 to-orange-600 text-white px-12 py-5 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-2xl shadow-red-500/30"
              >
                Reducir el riesgo.
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Problem Section - The Statistical Chain */}
      <section id="problema" className="relative py-32 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                La crisis del trabajo administrativo es una crisis de seguridad del paciente.
              </h2>
            </div>

            {/* Three Data Points with Human Impact */}
            <div className="space-y-16">
              {/* Data Point 1: The Cause */}
              <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-12">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="md:w-1/3">
                    <div className="text-8xl font-bold text-red-400 mb-2">10.6</div>
                    <div className="text-2xl font-semibold text-gray-300">horas por semana</div>
                  </div>
                  <div className="md:w-2/3">
                    <h3 className="text-2xl font-bold mb-4">La causa: trabajo administrativo.</h3>
                    <p className="text-lg text-gray-300 leading-relaxed">
                      El médico promedio pasa 10.6 horas semanales en documentación y tareas administrativas fuera del horario clínico.
                      Este tiempo no es opcional. Es obligatorio, no remunerado, y se roba directamente de la vida familiar del médico.
                      Lo llamamos "pajama time" porque sucede después de que los niños están dormidos.
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>

              {/* Data Point 2: The Consequence */}
              <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-12">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="md:w-1/3">
                    <div className="text-8xl font-bold text-orange-400 mb-2">53%</div>
                    <div className="text-2xl font-semibold text-gray-300">de médicos</div>
                  </div>
                  <div className="md:w-2/3">
                    <h3 className="text-2xl font-bold mb-4">La consecuencia: agotamiento profesional.</h3>
                    <p className="text-lg text-gray-300 leading-relaxed">
                      Más de la mitad de todos los médicos reportan síntomas de burnout. No es una crisis de resiliencia individual.
                      Es una crisis de diseño de sistemas. Cuando construimos sistemas que requieren que los profesionales trabajen
                      gratis cada noche, el agotamiento no es una sorpresa. Es el resultado predecible.
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>

              {/* Data Point 3: The Risk */}
              <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/30 rounded-2xl p-12">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="md:w-1/3">
                    <div className="text-8xl font-bold text-red-400 mb-2">2x</div>
                    <div className="text-2xl font-semibold text-gray-300">riesgo de error</div>
                  </div>
                  <div className="md:w-2/3">
                    <h3 className="text-2xl font-bold mb-4 text-red-300">El riesgo definitivo: daño al paciente.</h3>
                    <p className="text-lg text-gray-300 leading-relaxed">
                      Los médicos con burnout tienen el doble de probabilidad de cometer errores médicos. Esta no es una estadística abstracta.
                      Son diagnósticos perdidos. Dosis incorrectas. Signos vitales críticos no detectados. El trabajo administrativo no es
                      solo una molestia para los médicos. Es un riesgo de seguridad activo para los pacientes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Conclusion Statement */}
            <div className="mt-20 text-center">
              <p className="text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                No puede resolver el burnout con resiliencia. Debe resolver el trabajo administrativo con tecnología.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solucion" className="relative py-32 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                Menos administración. Mejor medicina.
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Holilabs no es un EHR. No es un sistema de facturación. Es una herramienta de productividad clínica
                que se integra con su flujo de trabajo existente y elimina el trabajo administrativo que causa burnout.
              </p>
            </div>

            {/* Three Solution Pillars */}
            <div className="space-y-12">
              {/* Pillar 1: The Consultation */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-10">
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold mb-3">La consulta: cero distracciones.</h3>
                    <p className="text-lg text-gray-300 leading-relaxed mb-6">
                      Nuestro scribe clínico con IA escucha la consulta y genera automáticamente notas SOAP estructuradas en tiempo real.
                      No hay necesidad de escribir durante la consulta. No hay necesidad de recordar detalles más tarde. Solo tú y tu paciente.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Transcripción en tiempo real con formato SOAP automático</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Soporte completo para español, portugués e inglés médico</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Contexto completo del paciente cargado automáticamente (historial, medicamentos, alergias)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pillar 2: The Practice */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-10">
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold mb-3">La práctica: consistencia sin conexión.</h3>
                    <p className="text-lg text-gray-300 leading-relaxed mb-6">
                      Construido como una Progressive Web App que funciona sin conexión a internet. Perfecto para consultorios rurales,
                      visitas domiciliarias o cualquier situación donde la conectividad no es confiable. Todo se sincroniza automáticamente
                      cuando vuelve la conexión.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Funcionalidad offline completa con sincronización automática</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Instalable en cualquier dispositivo (iPhone, Android, iPad, laptop)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Carga de documentos del paciente con cifrado AES-256 (laboratorios, imágenes, prescripciones)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pillar 3: The Physician */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-10">
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold mb-3">El médico: seguridad profesional.</h3>
                    <p className="text-lg text-gray-300 leading-relaxed mb-6">
                      Cada interacción auditada. Cada decisión documentada. Cada sugerencia de IA con nivel de confianza visible.
                      Holilabs no solo ahorra tiempo. Proporciona la capa de documentación defensiva que los médicos necesitan en
                      el entorno legal actual.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Auditoría completa conforme a HIPAA/GDPR/LGPD</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Exportación de facturación en un clic (CSV con códigos ICD-10/CPT)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Formularios de consentimiento del paciente con firma electrónica</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section id="waitlist" className="relative py-32 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-2xl rounded-3xl p-12 overflow-hidden">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-400/10 rounded-full blur-3xl" />

              <div className="relative z-10">
                <div className="text-center mb-12">
                  <h2 className="text-5xl font-bold mb-6">
                    ¿Listo para ofrecer una medicina más segura y humana?
                  </h2>
                  <p className="text-xl text-gray-400">
                    Únase a los médicos que están rompiendo el ciclo de agotamiento.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Nombre Completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="px-6 py-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-green-400 focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                    <input
                      type="email"
                      placeholder="Correo Electrónico *"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="px-6 py-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-green-400 focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Organización/Clínica"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="px-6 py-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-green-400 focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="px-6 py-4 rounded-xl bg-white/5 border border-white/20 text-gray-400 focus:outline-none focus:border-green-400 focus:bg-white/10 transition-all backdrop-blur-md"
                    >
                      <option value="" className="bg-black">Seleccionar Rol</option>
                      <option value="doctor" className="bg-black">Médico</option>
                      <option value="nurse" className="bg-black">Enfermera</option>
                      <option value="admin" className="bg-black">Administrador</option>
                      <option value="other" className="bg-black">Otro</option>
                    </select>
                  </div>

                  {message && (
                    <div className={`p-4 rounded-xl backdrop-blur-md ${
                      message.type === 'success'
                        ? 'bg-green-400/20 border border-green-400/50 text-white'
                        : 'bg-red-500/20 border border-red-500/50 text-white'
                    }`}>
                      {message.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white px-8 py-5 rounded-xl text-lg font-bold hover:scale-105 transition-transform shadow-2xl shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isSubmitting ? 'Enviando...' : 'Ver la demostración.'}
                  </button>

                  <p className="text-center text-gray-500 text-sm">
                    Sin tarjeta de crédito requerida. Nos pondremos en contacto pronto con acceso.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Image
                  src="/logos/Logo 1_Light.svg"
                  alt="Holi Labs"
                  width={36}
                  height={36}
                />
                <h3 className="text-xl font-bold">Holi Labs</h3>
              </div>
              <p className="text-gray-500 text-sm">
                Herramienta de productividad clínica para médicos.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Producto</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li><Link href="/dashboard" className="hover:text-green-400 transition">Plataforma</Link></li>
                <li><a href="#problema" className="hover:text-green-400 transition">El Problema</a></li>
                <li><a href="#solucion" className="hover:text-green-400 transition">Solución</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Cumplimiento</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li>HIPAA Conforme</li>
                <li>GDPR Conforme</li>
                <li>LGPD (Brasil)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Regiones</h4>
              <div className="flex items-center space-x-4 text-3xl mb-4">
                <span>🇧🇷</span>
                <span>🇲🇽</span>
                <span>🇦🇷</span>
              </div>
              <p className="text-sm text-gray-500">Construido para LATAM</p>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-8 text-center text-gray-500 text-sm">
            <p>© 2025 Holi Labs. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
