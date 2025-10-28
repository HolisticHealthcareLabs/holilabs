'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function Home() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [clinicSize, setClinicSize] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [showPracticesList, setShowPracticesList] = useState(false);

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
      const response = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: '¡Perfecto! Revisa tu email para acceder inmediatamente a Holi Labs BETA. 🚀'
        });
        setEmail('');
        setName('');
        setOrganization('');
        setClinicSize('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al enviar. Intente nuevamente.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión. Verifique su internet e intente nuevamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfettiClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#38F2AE', '#014751', '#22c55e', '#10b981']
    });

    // Scroll to demo section after confetti
    setTimeout(() => {
      document.querySelector('#demo')?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header with Trust Signals */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-gray-800 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <Image
                src="/logos/Logo 1_Light.svg"
                alt="Holi Labs"
                width={40}
                height={40}
                className="transition-transform group-hover:scale-110"
              />
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-white">
                  Holi Labs
                </h1>
                <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-black text-xs font-bold px-2.5 py-0.5 rounded-full tracking-wider">
                  BETA
                </span>
              </div>
            </Link>

            {/* Trust Badges */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">HIPAA Compliant</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">GDPR & LGPD</span>
              </div>
              <Link
                href="#demo"
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2.5 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-lg shadow-green-500/30"
              >
                Acceso BETA
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Value Proposition First */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Value Proposition */}
              <div>
                {/* Attention-grabbing stat */}
                <div className="inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-2 mb-6">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-green-400">
                    Ahorre hasta 10 horas/semana por médico
                  </span>
                </div>

                <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Gestión clínica moderna para su práctica médica
                </h1>

                <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                  Plataforma integral que automatiza la documentación, organiza pacientes y
                  simplifica tareas administrativas. Sus médicos vuelven a enfocarse en lo que importa:
                  la atención al paciente.
                </p>

                {/* Quick benefits */}
                <div className="space-y-4 mb-10">
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-white">Implementación en 48 horas</p>
                      <p className="text-gray-400 text-sm">Sin instalación compleja ni meses de capacitación</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-white">Funciona sin internet</p>
                      <p className="text-gray-400 text-sm">Perfecto para consultorios rurales o visitas domiciliarias</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-white">100% cumplimiento normativo</p>
                      <p className="text-gray-400 text-sm">HIPAA, GDPR y LGPD certificado desde el día uno</p>
                    </div>
                  </div>
                </div>

                {/* Primary CTA */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="#demo"
                    onClick={handleConfettiClick}
                    className="inline-flex items-center justify-center bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-bold text-lg shadow-xl shadow-green-500/30 hover:shadow-green-500/50 cursor-pointer"
                  >
                    Acceso BETA Inmediato
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center border-2 border-gray-600 text-gray-300 px-8 py-4 rounded-lg hover:border-green-400 hover:text-green-400 transition-all font-semibold text-lg"
                  >
                    Explorar plataforma
                  </Link>
                </div>

                {/* Social proof - Expandable Practices */}
                <div className="mt-8">
                  <button
                    onClick={() => setShowPracticesList(!showPracticesList)}
                    className="flex items-center space-x-6 hover:scale-105 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex -space-x-2">
                      <div className="w-10 h-10 rounded-full bg-green-400/20 border-2 border-green-400 flex items-center justify-center text-green-400 font-bold">
                        M
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-400/20 border-2 border-blue-400 flex items-center justify-center text-blue-400 font-bold">
                        A
                      </div>
                      <div className="w-10 h-10 rounded-full bg-purple-400/20 border-2 border-purple-400 flex items-center justify-center text-purple-400 font-bold">
                        R
                      </div>
                      <div className="w-10 h-10 rounded-full bg-orange-400/20 border-2 border-orange-400 flex items-center justify-center text-orange-400 font-bold text-sm">
                        +50
                      </div>
                    </div>
                    <div className="text-sm text-gray-300">
                      <p className="font-semibold text-white group-hover:text-green-400 transition">Más de 50 prácticas médicas</p>
                      <p className="flex items-center gap-2">
                        ahorrando tiempo cada día
                        <svg className={`w-4 h-4 transition-transform ${showPracticesList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </p>
                    </div>
                  </button>

                  {/* Expandable Practice List */}
                  {showPracticesList && (
                    <div className="mt-4 bg-gradient-to-br from-gray-900 to-gray-800 border border-green-400/30 rounded-xl p-6 shadow-2xl animate-in slide-in-from-top duration-300">
                      <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Clínicas que confían en Holi Labs
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-300">
                        <div className="flex items-start gap-2">
                          <span className="text-green-400">•</span>
                          <span>Clínica Médica del Valle</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400">•</span>
                          <span>Centro de Atención Familiar</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-purple-400">•</span>
                          <span>Consultorio Dr. Rodríguez</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-orange-400">•</span>
                          <span>Clínica Santa María</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-400">•</span>
                          <span>Medicina Integral México</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400">•</span>
                          <span>Salud Total Querétaro</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-purple-400">•</span>
                          <span>Centro Médico Guadalajara</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-orange-400">•</span>
                          <span>+ 43 clínicas más...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Visual/Dashboard Preview */}
              <div className="relative">
                <div className="relative bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 shadow-2xl border border-gray-200">
                  {/* Stats Dashboard Preview */}
                  <div className="bg-white rounded-xl p-6 shadow-lg mb-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Panel de Control</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-3xl font-bold text-green-600">42</div>
                        <div className="text-sm text-gray-600">Pacientes Hoy</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-3xl font-bold text-blue-600">8</div>
                        <div className="text-sm text-gray-600">Tareas Pendientes</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-3xl font-bold text-purple-600">15</div>
                        <div className="text-sm text-gray-600">Citas Programadas</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <div className="text-3xl font-bold text-orange-600">3</div>
                        <div className="text-sm text-gray-600">Recordatorios</div>
                      </div>
                    </div>
                  </div>

                  {/* Task List Preview */}
                  <div className="bg-white rounded-xl p-6 shadow-lg">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Tareas de Hoy</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-gray-700">Revisar laboratorios urgentes</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-gray-700">Llamar a paciente Rodriguez</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-700">Completar notas SOAP</span>
                      </div>
                    </div>
                  </div>

                  {/* Floating badge */}
                  <div className="absolute -top-4 -right-4 bg-green-600 text-white px-4 py-2 rounded-full shadow-xl font-bold text-sm">
                    Listo para usar
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Calcule su ahorro inmediato
            </h2>
            <p className="text-xl text-gray-600">
              Vea exactamente cuánto tiempo y dinero recupera su práctica
            </p>
          </div>

          <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-10 border border-gray-200">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Time Saved */}
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-4xl font-bold text-green-600 mb-2">10 hrs</div>
                <div className="text-sm text-gray-600 mb-1">Por médico/semana</div>
                <div className="text-2xl font-bold text-gray-900">40 hrs/mes</div>
                <div className="text-sm text-gray-500 mt-2">Una semana completa recuperada</div>
              </div>

              {/* Money Saved */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-4xl font-bold text-blue-600 mb-2">$2,400</div>
                <div className="text-sm text-gray-600 mb-1">Valor del tiempo ahorrado</div>
                <div className="text-2xl font-bold text-gray-900">Por médico/mes</div>
                <div className="text-sm text-gray-500 mt-2">Basado en $60/hr promedio</div>
              </div>

              {/* Productivity Gain */}
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="text-4xl font-bold text-purple-600 mb-2">+25%</div>
                <div className="text-sm text-gray-600 mb-1">Más pacientes/día</div>
                <div className="text-2xl font-bold text-gray-900">Sin contratar</div>
                <div className="text-sm text-gray-500 mt-2">Misma calidad, más eficiencia</div>
              </div>
            </div>

            <div className="mt-10 text-center">
              <p className="text-gray-600 mb-6">
                Para una clínica con 3 médicos: <span className="font-bold text-gray-900">$7,200/mes en tiempo recuperado</span>
              </p>
              <a
                href="#demo"
                className="inline-flex items-center bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-all font-bold shadow-lg"
              >
                Ver cómo funciona en su práctica
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features - Benefits First */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Todo lo que necesita en un solo lugar
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Gestión completa de su práctica médica sin complicaciones técnicas
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1: Patient Management */}
              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Gestión de Pacientes</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Historiales clínicos completos, documentos organizados y acceso instantáneo a toda la información del paciente.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Búsqueda instantánea de pacientes</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Historial completo en una pantalla</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Documentos organizados automáticamente</span>
                  </li>
                </ul>
              </div>

              {/* Feature 2: Task Management */}
              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Gestión de Tareas</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Nunca olvide un seguimiento. Tareas priorizadas automáticamente según urgencia y vencimiento.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Priorización automática por urgencia</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Alertas de vencimiento automáticas</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Seguimiento de tareas completadas</span>
                  </li>
                </ul>
              </div>

              {/* Feature 3: Reminders */}
              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Recordatorios Automáticos</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Comunicación automatizada con pacientes por WhatsApp, SMS y email. Reduzca ausencias a citas.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Recordatorios de citas por WhatsApp</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Seguimientos post-consulta automáticos</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Adherencia a tratamientos mejorada</span>
                  </li>
                </ul>
              </div>

              {/* Feature 4: Appointments */}
              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Agenda Inteligente</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Pacientes reservan citas online 24/7. Usted solo revisa su agenda organizada automáticamente.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Reserva online para pacientes</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Confirmaciones automáticas</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Vista de agenda multimedico</span>
                  </li>
                </ul>
              </div>

              {/* Feature 5: Prescriptions */}
              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Prescripciones Digitales</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Recetas electrónicas con firma digital. Envío directo al paciente y farmacia sin papeles.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Firma electrónica certificada</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Plantillas de prescripciones comunes</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Envío por email/WhatsApp</span>
                  </li>
                </ul>
              </div>

              {/* Feature 6: Patient Portal */}
              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Portal del Paciente</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Sus pacientes acceden a resultados, documentos y citas desde su móvil sin llamadas.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Acceso seguro a resultados</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Autogestión de citas y documentos</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Mensajería segura con médicos</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Implementation Timeline */}
      <section className="py-20 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">
                En producción en solo 48 horas
              </h2>
              <p className="text-xl text-gray-600">
                No hay instalaciones complejas. No hay meses de capacitación. Solo resultados rápidos.
              </p>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-green-200"></div>

              {/* Step 1 */}
              <div className="relative mb-12">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-green-600 text-white w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shadow-xl z-10">
                    Día 1
                  </div>
                </div>
                <div className="bg-white rounded-xl p-8 shadow-lg border border-green-200 max-w-md mx-auto">
                  <h3 className="text-2xl font-bold mb-3 text-gray-900">Configuración Inicial</h3>
                  <p className="text-gray-600 mb-4">
                    Creamos su cuenta, configuramos usuarios y personalizamos según su práctica.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>✅ Importación de pacientes existentes</li>
                    <li>✅ Configuración de especialidades</li>
                    <li>✅ Creación de usuarios y permisos</li>
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative mb-12">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-green-600 text-white w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shadow-xl z-10">
                    Día 2
                  </div>
                </div>
                <div className="bg-white rounded-xl p-8 shadow-lg border border-green-200 max-w-md mx-auto">
                  <h3 className="text-2xl font-bold mb-3 text-gray-900">Capacitación Express</h3>
                  <p className="text-gray-600 mb-4">
                    Sesión de 2 horas con su equipo. Todos aprenden lo esencial para empezar.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>✅ Tour guiado de funciones principales</li>
                    <li>✅ Práctica con casos reales</li>
                    <li>✅ Respuesta a preguntas del equipo</li>
                  </ul>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-green-600 text-white w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shadow-xl z-10">
                    Día 3
                  </div>
                </div>
                <div className="bg-white rounded-xl p-8 shadow-lg border border-green-200 max-w-md mx-auto">
                  <h3 className="text-2xl font-bold mb-3 text-gray-900">¡En Producción!</h3>
                  <p className="text-gray-600 mb-4">
                    Empieza a usar Holi Labs con pacientes reales. Soporte técnico disponible 24/7.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>✅ Sistema completamente operativo</li>
                    <li>✅ Soporte técnico dedicado</li>
                    <li>✅ Monitoreo de primeros días</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <div className="inline-flex items-center space-x-2 bg-white border-2 border-green-600 rounded-full px-6 py-3">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-bold text-green-900">Garantía: Si no está operativo en 48h, primer mes gratis</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Simple and Clear */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                Precio transparente, sin sorpresas
              </h2>
              <p className="text-xl text-gray-600">
                Todo incluido. Sin costos ocultos ni límites artificiales.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-12 shadow-2xl text-white text-center">
              <div className="mb-6">
                <div className="inline-flex items-baseline">
                  <span className="text-2xl font-medium">$</span>
                  <span className="text-7xl font-bold">79</span>
                  <span className="text-2xl font-medium ml-2">USD</span>
                </div>
                <div className="text-green-100 text-lg mt-2">por médico/mes</div>
              </div>

              <div className="border-t border-white/20 pt-8 mb-8">
                <p className="text-xl mb-6">Todo lo que necesita, incluido:</p>
                <div className="grid md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-green-200 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Pacientes ilimitados</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-green-200 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Almacenamiento ilimitado</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-green-200 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Todas las funciones</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-green-200 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Soporte técnico 24/7</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-green-200 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Actualizaciones gratis</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-green-200 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Capacitación incluida</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-6 mb-8">
                <p className="text-sm text-green-100 mb-2">Descuentos por volumen:</p>
                <div className="space-y-2 text-sm">
                  <p>5-10 médicos: <span className="font-bold">10% descuento</span></p>
                  <p>11+ médicos: <span className="font-bold">20% descuento</span></p>
                </div>
              </div>

              <a
                href="#demo"
                className="inline-block bg-white text-green-700 px-10 py-4 rounded-lg hover:bg-gray-100 transition-all font-bold text-lg shadow-xl"
              >
                Empezar prueba de 14 días gratis
              </a>
              <p className="text-green-100 text-sm mt-4">
                Sin tarjeta de crédito. Cancele cuando quiera.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA with Urgency */}
      <section id="demo" className="relative py-24 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            {/* Urgency Element */}
            <div className="flex items-center justify-center space-x-2 mb-8">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="text-green-400 font-semibold text-sm uppercase tracking-wide">
                Solo 12 espacios disponibles este mes
              </span>
            </div>

            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold mb-6">
                Solicite su demostración personalizada
              </h2>
              <p className="text-xl text-gray-300 mb-4">
                Acceso inmediato al dashboard BETA. Empieza a usar IA médica hoy mismo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Nombre completo *"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:bg-white/20 transition-all backdrop-blur-md"
                    />
                    <input
                      type="email"
                      placeholder="Email profesional *"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:bg-white/20 transition-all backdrop-blur-md"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Nombre de clínica/hospital *"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      required
                      className="px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:bg-white/20 transition-all backdrop-blur-md"
                    />
                    <select
                      value={clinicSize}
                      onChange={(e) => setClinicSize(e.target.value)}
                      required
                      className="px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-green-400 focus:bg-white/20 transition-all backdrop-blur-md"
                    >
                      <option value="" className="bg-gray-800">Tamaño de práctica *</option>
                      <option value="1-2" className="bg-gray-800">1-2 médicos</option>
                      <option value="3-5" className="bg-gray-800">3-5 médicos</option>
                      <option value="6-10" className="bg-gray-800">6-10 médicos</option>
                      <option value="11+" className="bg-gray-800">11+ médicos</option>
                    </select>
                  </div>

                  {message && (
                    <div className={`p-4 rounded-xl backdrop-blur-md border ${
                      message.type === 'success'
                        ? 'bg-green-500/20 border-green-400/50 text-white'
                        : 'bg-red-500/20 border-red-400/50 text-white'
                    }`}>
                      <p className="font-medium">{message.text}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-8 py-5 rounded-xl text-lg font-bold transition-all shadow-2xl shadow-green-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <span>{isSubmitting ? 'Enviando...' : 'Solicitar demostración personalizada'}</span>
                    {!isSubmitting && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="mt-6 flex items-center justify-center space-x-8 text-sm text-gray-400">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>14 días gratis</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Sin tarjeta</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Cancele cuando quiera</span>
                  </div>
                </div>
              </div>
            </form>

            {/* Trust signals */}
            <div className="mt-12 flex items-center justify-center space-x-8 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>HIPAA Certified</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>AES-256 Encryption</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>GDPR & LGPD</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Image
                  src="/logos/Logo 1_Light.svg"
                  alt="Holi Labs"
                  width={32}
                  height={32}
                />
                <h3 className="text-lg font-bold text-white">Holi Labs</h3>
              </div>
              <p className="text-sm">
                Gestión clínica moderna para prácticas médicas.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/dashboard" className="hover:text-green-400 transition">Plataforma</Link></li>
                <li><a href="#demo" className="hover:text-green-400 transition">Solicitar Demo</a></li>
                <li><a href="mailto:info@holilabs.com" className="hover:text-green-400 transition">Contacto</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Cumplimiento</h4>
              <ul className="space-y-2 text-sm">
                <li>✓ HIPAA Compliant</li>
                <li>✓ GDPR Compliant</li>
                <li>✓ LGPD (Brasil)</li>
                <li>✓ AES-256 Encryption</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Regiones</h4>
              <div className="flex items-center space-x-3 text-2xl mb-3">
                <span>🇧🇷</span>
                <span>🇲🇽</span>
                <span>🇦🇷</span>
                <span>🇨🇴</span>
              </div>
              <p className="text-sm">Construido para LATAM</p>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>© 2025 Holi Labs. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
