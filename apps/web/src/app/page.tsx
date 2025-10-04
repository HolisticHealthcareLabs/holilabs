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
  const [activeDemo, setActiveDemo] = useState<'scribe' | 'rx' | 'docs'>('scribe');
  const [whatsappStep, setWhatsappStep] = useState(0);
  const [prescriptionText, setPrescriptionText] = useState('');
  const [showPrescriptionResult, setShowPrescriptionResult] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // WhatsApp demo animation
  useEffect(() => {
    const interval = setInterval(() => {
      setWhatsappStep((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
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

  const handlePrescriptionInput = () => {
    if (prescriptionText) {
      setShowPrescriptionResult(true);
      setTimeout(() => {
        setShowPrescriptionResult(false);
        setPrescriptionText('');
      }, 5000);
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
                src="/logos/holi-light.svg"
                alt="Holi Labs"
                width={36}
                height={36}
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
            <a href="#confianza" className="text-gray-300 hover:text-white transition-colors font-medium">
              Confianza
            </a>
            <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors font-medium">
              Plataforma
            </Link>
            <Link
              href="#waitlist"
              className="bg-white text-black px-6 py-2.5 rounded-full hover:bg-gray-200 transition-all font-semibold shadow-lg shadow-white/20 hover:shadow-white/40"
            >
              Solicitar Acceso
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Parallax Background Elements */}
        <div
          className="absolute inset-0 opacity-30"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        >
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div
              className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 backdrop-blur-md px-6 py-3 rounded-full mb-8 hover:bg-white/10 transition-all"
              style={{ transform: `translateY(${scrollY * -0.1}px)` }}
            >
              <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-semibold text-gray-300">HIPAA • GDPR • LGPD</span>
            </div>

            {/* Main Headline */}
            <h1
              className="text-5xl md:text-7xl font-bold mb-8 leading-tight"
              style={{ transform: `translateY(${scrollY * -0.05}px)` }}
            >
              El Co-Piloto de IA para Médicos.
              <br />
              <span className="bg-gradient-to-r from-accent via-primary to-purple-400 bg-clip-text text-transparent">
                Elimine el "Pajama Time".
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
              style={{ transform: `translateY(${scrollY * -0.08}px)` }}
            >
              Automatice la documentación, optimice las prescripciones y resuelva la crisis de adherencia.
              Holi Labs ofrece la automatización inteligente que su EHR no pudo proporcionar.
            </p>

            {/* CTA Buttons */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
              style={{ transform: `translateY(${scrollY * -0.1}px)` }}
            >
              <Link
                href="#waitlist"
                className="group relative bg-white text-black px-10 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-2xl shadow-white/20"
              >
                <span className="relative z-10">Solicitar Acceso Anticipado →</span>
                <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-xl" />
              </Link>
              <Link
                href="/dashboard"
                className="bg-white/5 text-white border border-white/20 backdrop-blur-md px-10 py-4 rounded-full font-bold text-lg hover:bg-white/10 hover:border-white/30 transition-all"
              >
                Ver Plataforma
              </Link>
            </div>

            {/* Trust Indicators */}
            <div
              className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500"
              style={{ transform: `translateY(${scrollY * -0.12}px)` }}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Sin tarjeta de crédito</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Acceso anticipado</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Soporte de configuración</span>
              </div>
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

      {/* Problem Section - La Crisis Administrativa */}
      <section id="problema" className="relative py-32 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                La Crisis Administrativa
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                El sistema de salud está fallando a sus médicos. Y los médicos están respondiendo con "Shadow IT".
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="relative bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 backdrop-blur-md p-8 rounded-2xl">
                <div className="text-7xl font-bold text-red-400 mb-4">2:1</div>
                <h3 className="text-2xl font-bold mb-3">Burnout Clínico</h3>
                <p className="text-gray-400">
                  Por cada hora de atención al paciente, los médicos pasan 2 horas en tareas administrativas.
                  El temido "Pajama Time".
                </p>
              </div>

              <div className="relative bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 backdrop-blur-md p-8 rounded-2xl">
                <div className="text-7xl font-bold text-orange-400 mb-4">80%</div>
                <h3 className="text-2xl font-bold mb-3">Crisis de Adherencia</h3>
                <p className="text-gray-400">
                  Más del 80% de los pacientes con enfermedades crónicas no siguen sus planes de tratamiento.
                  Hospitalizaciones evitables.
                </p>
              </div>

              <div className="relative bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 backdrop-blur-md p-8 rounded-2xl">
                <div className="text-5xl font-bold text-yellow-400 mb-4">WhatsApp + ChatGPT</div>
                <h3 className="text-2xl font-bold mb-3">Shadow IT</h3>
                <p className="text-gray-400">
                  Los EHR son tan torpes que los médicos están forzados a hackear soluciones usando
                  herramientas no conformes.
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-md p-10 rounded-2xl">
              <blockquote className="text-2xl md:text-3xl font-light italic text-center text-gray-300">
                "Todo mundo piensa en la clínica y pacientes, pero{' '}
                <span className="text-accent font-semibold">nadie piensa en el médico</span>."
              </blockquote>
              <p className="text-center text-gray-500 mt-4">— Hallazgo de investigación, LATAM 2024</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Intro */}
      <section id="solucion" className="relative py-20 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              La Capa de Orquestación Clínica Inteligente
            </h2>
            <p className="text-xl text-gray-400 leading-relaxed">
              Estamos profesionalizando las herramientas que los médicos ya usan.
              WhatsApp + IA, ahora <span className="text-accent font-semibold">seguro, integrado y conforme</span>.
            </p>
          </div>
        </div>
      </section>

      {/* Module A: Automating the Consultation */}
      <section className="relative py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Automatizando la Consulta
              </h2>
              <p className="text-xl text-gray-400">
                Recupere el Control de su Tiempo
              </p>
            </div>

            {/* Tab Selector */}
            <div className="flex flex-wrap gap-4 mb-8">
              <button
                onClick={() => setActiveDemo('scribe')}
                className={`px-6 py-3 rounded-full font-semibold transition-all ${
                  activeDemo === 'scribe'
                    ? 'bg-accent text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Notas Clínicas Automáticas
              </button>
              <button
                onClick={() => setActiveDemo('rx')}
                className={`px-6 py-3 rounded-full font-semibold transition-all ${
                  activeDemo === 'rx'
                    ? 'bg-accent text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Prescripción Inteligente
              </button>
              <button
                onClick={() => setActiveDemo('docs')}
                className={`px-6 py-3 rounded-full font-semibold transition-all ${
                  activeDemo === 'docs'
                    ? 'bg-accent text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Inteligencia de Documentos
              </button>
            </div>

            {/* Demo Content */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                {activeDemo === 'scribe' && (
                  <>
                    <h3 className="text-3xl font-bold mb-4">Ambient Scribing</h3>
                    <p className="text-lg text-gray-400 mb-6">
                      Enfóquese en su paciente, no en la pantalla. Complete historias clínicas en minutos.
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start space-x-3">
                        <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Transcripción automática de consultas en tiempo real</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Estructuración automática en formato SOAP</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Revisión y aprobación rápida</span>
                      </li>
                    </ul>
                  </>
                )}

                {activeDemo === 'rx' && (
                  <>
                    <h3 className="text-3xl font-bold mb-4">Flujo de Prescripción Inteligente</h3>
                    <p className="text-lg text-gray-400 mb-6">
                      Prescriba de forma más rápida y segura. Con Entrada de Lenguaje Natural y Renovaciones con Un Clic.
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start space-x-3">
                        <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Entrada de lenguaje natural: "Rx Metformina 500mg BID, 90 días"</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Alertas de seguridad impulsadas por IA (interacciones detectadas)</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Renovación con un clic</span>
                      </li>
                    </ul>
                  </>
                )}

                {activeDemo === 'docs' && (
                  <>
                    <h3 className="text-3xl font-bold mb-4">Inteligencia de Documentos</h3>
                    <p className="text-lg text-gray-400 mb-6">
                      Comprenda instantáneamente el historial fragmentado del paciente. IA que resume y estructura PDFs y laboratorios.
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start space-x-3">
                        <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Arrastrar y soltar PDFs, imágenes, resultados de laboratorio</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Resumen conciso y cronológico generado por IA</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-300">Fin de la búsqueda manual de datos</span>
                      </li>
                    </ul>
                  </>
                )}
              </div>

              {/* Interactive Demo Visual */}
              <div className="relative">
                {activeDemo === 'scribe' && (
                  <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-xl rounded-2xl p-8">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm text-gray-400">Grabando consulta...</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-accent rounded-full mt-2" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Audio en tiempo real</p>
                          <div className="flex space-x-1">
                            {[...Array(20)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-accent rounded-full animate-pulse"
                                style={{
                                  height: `${Math.random() * 40 + 10}px`,
                                  animationDelay: `${i * 0.05}s`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 bg-black/40 rounded-lg p-4 border border-accent/30">
                        <p className="text-xs text-accent mb-2 font-bold">Nota SOAP Generada:</p>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          <strong>S:</strong> Paciente refiere dolor torácico opresivo...<br />
                          <strong>O:</strong> TA 140/90, FC 88, SatO2 97%...<br />
                          <strong>A:</strong> Sospecha de angina estable...<br />
                          <strong>P:</strong> Solicitar ECG y troponinas...
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeDemo === 'rx' && (
                  <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-xl rounded-2xl p-8">
                    <div className="mb-6">
                      <label className="text-sm text-gray-400 mb-2 block">Entrada de Lenguaje Natural</label>
                      <div className="bg-black/40 border border-white/20 rounded-lg p-4 focus-within:border-accent transition-all">
                        <input
                          type="text"
                          value={prescriptionText}
                          onChange={(e) => setPrescriptionText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handlePrescriptionInput()}
                          placeholder="Ej: Rx Metformina 500mg BID, 90 días"
                          className="w-full bg-transparent text-white outline-none placeholder-gray-600"
                        />
                      </div>
                      <button
                        onClick={handlePrescriptionInput}
                        className="mt-3 bg-accent text-black px-6 py-2 rounded-full font-semibold hover:scale-105 transition-transform"
                      >
                        Procesar
                      </button>
                    </div>

                    {showPrescriptionResult && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                          <p className="text-sm text-green-300 font-semibold mb-2">✓ Prescripción Estructurada</p>
                          <div className="text-sm text-gray-300 space-y-1">
                            <p>• Medicamento: Metformina</p>
                            <p>• Dosis: 500mg</p>
                            <p>• Frecuencia: BID (dos veces al día)</p>
                            <p>• Duración: 90 días</p>
                          </div>
                        </div>

                        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <p className="text-sm text-yellow-300 font-semibold mb-1">Alerta de Seguridad</p>
                              <p className="text-xs text-gray-400">Confianza: 92% • <a href="#" className="text-accent hover:underline">Ver guía clínica</a></p>
                              <p className="text-sm text-gray-300 mt-2">Contraindicado en pacientes con disfunción renal severa (TFG &lt;30)</p>
                            </div>
                          </div>
                        </div>

                        <button className="w-full bg-accent text-black py-3 rounded-lg font-semibold hover:scale-105 transition-transform">
                          Renovación con Un Clic
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeDemo === 'docs' && (
                  <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-xl rounded-2xl p-8">
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center hover:border-accent transition-colors cursor-pointer">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-400 mb-2">Arrastrar PDFs, imágenes o resultados de laboratorio</p>
                      <p className="text-sm text-gray-600">PDF, JPG, PNG hasta 10MB</p>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-black/40 rounded-lg border border-white/10">
                        <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">Laboratorios_15Nov.pdf</p>
                          <p className="text-xs text-gray-500">Procesado</p>
                        </div>
                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>

                      <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                        <p className="text-xs text-accent font-bold mb-2">Resumen de IA:</p>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          HbA1c: 7.2% (↑ desde 6.8%), Glucosa: 156 mg/dL, Creatinina: 1.1 mg/dL (normal).
                          Progresión de control glucémico subóptimo. Considerar ajuste de dosis.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Module B: Adherence Engine */}
      <section className="relative py-32 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                El Motor de Adherencia Proactiva
              </h2>
              <p className="text-xl text-gray-400">
                Cerrando el Ciclo de Atención
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* WhatsApp Bot Demo */}
              <div>
                <h3 className="text-2xl font-bold mb-4">Bots de Adherencia Integrados con WhatsApp</h3>
                <p className="text-gray-400 mb-6">
                  Mejore drásticamente la adherencia sin esfuerzo manual. Compromiso seguro y automatizado
                  a través del canal que sus pacientes ya utilizan.
                </p>

                {/* WhatsApp Mockup */}
                <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 backdrop-blur-xl rounded-2xl p-6">
                  <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-white/10">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold">Holi AI</p>
                      <p className="text-xs text-gray-500">en línea</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {whatsappStep >= 0 && (
                      <div className="flex justify-start animate-fade-in">
                        <div className="bg-white/10 backdrop-blur-md rounded-lg rounded-tl-none px-4 py-2 max-w-xs">
                          <p className="text-sm">Buenos días, María. ¿Ha tomado sus medicamentos de la mañana?</p>
                          <p className="text-xs text-gray-500 mt-1">09:00</p>
                        </div>
                      </div>
                    )}

                    {whatsappStep >= 1 && (
                      <div className="flex justify-end animate-fade-in">
                        <div className="bg-green-500/30 backdrop-blur-md rounded-lg rounded-tr-none px-4 py-2 max-w-xs">
                          <p className="text-sm">Tomados ✓</p>
                          <p className="text-xs text-gray-400 mt-1">09:15</p>
                        </div>
                      </div>
                    )}

                    {whatsappStep >= 2 && (
                      <div className="flex justify-start animate-fade-in">
                        <div className="bg-white/10 backdrop-blur-md rounded-lg rounded-tl-none px-4 py-2 max-w-xs">
                          <p className="text-sm">¡Excelente! Por favor, ingrese su peso esta mañana.</p>
                          <p className="text-xs text-gray-500 mt-1">09:16</p>
                        </div>
                      </div>
                    )}

                    {whatsappStep >= 3 && (
                      <div className="flex justify-end animate-fade-in">
                        <div className="bg-green-500/30 backdrop-blur-md rounded-lg rounded-tr-none px-4 py-2 max-w-xs">
                          <p className="text-sm">72kg</p>
                          <p className="text-xs text-gray-400 mt-1">09:18</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Biometric Alerts & CRM */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-bold mb-4">Bucles de Retroalimentación Biométrica</h3>
                  <p className="text-gray-400 mb-6">
                    Monitoreo proactivo para prevenir re-hospitalizaciones costosas.
                    Rastree biomarcadores clave sin esfuerzo.
                  </p>

                  <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-xl rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <svg className="w-6 h-6 text-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                      </svg>
                      <h4 className="font-bold">Panel de Alertas del Médico</h4>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-red-300 mb-1">Alerta de Retención de Líquidos</p>
                            <p className="text-sm text-gray-300">Paciente VBQ-MG-4554-T2D aumentó 1.5kg en 24 horas</p>
                            <div className="flex gap-2 mt-3">
                              <button className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold hover:bg-red-600 transition">
                                Revisar Datos
                              </button>
                              <button className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-full font-semibold hover:bg-white/20 transition">
                                Ajustar Dosis
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-yellow-300 mb-1">Adherencia Parcial Detectada</p>
                            <p className="text-sm text-gray-300">Paciente VBQ-CS-6069-PIM faltó 2 de 7 dosis esta semana</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">CRM Clínico Ligero</h3>
                  <p className="text-gray-400 mb-6">
                    No deje que ningún paciente se pierda. Seguimiento automatizado de pacientes
                    que necesitan revisión o contacto.
                  </p>

                  <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-xl rounded-2xl p-6">
                    <h4 className="font-bold mb-4">Tareas Pendientes</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-black/40 rounded-lg border border-white/10">
                        <input type="checkbox" className="w-4 h-4 text-accent rounded" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold">Seguimiento post-hospitalización</p>
                          <p className="text-xs text-gray-500">Paciente VBQ-AR-3039-ASM • Vence hoy</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-black/40 rounded-lg border border-white/10">
                        <input type="checkbox" className="w-4 h-4 text-accent rounded" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold">Revisión de laboratorios</p>
                          <p className="text-xs text-gray-500">Paciente VBQ-MG-4554-T2D • Vence mañana</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-black/40 rounded-lg border border-white/10">
                        <input type="checkbox" className="w-4 h-4 text-accent rounded" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold">Ajuste de medicación</p>
                          <p className="text-xs text-gray-500">Paciente VBQ-CS-6069-PIM • Vence en 3 días</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Workflow */}
      <section className="relative py-32 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Cómo Funciona
              </h2>
              <p className="text-xl text-gray-400">
                Cuatro pasos simples para transformar su práctica clínica
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  step: '1',
                  title: 'Escuchar',
                  description: 'Ambient scribing captura la consulta en tiempo real',
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  ),
                },
                {
                  step: '2',
                  title: 'Automatizar',
                  description: 'La IA estructura notas, prescripciones y documentos',
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  ),
                },
                {
                  step: '3',
                  title: 'Decidir',
                  description: 'Revisión médica con capa de confianza y transparencia',
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                },
                {
                  step: '4',
                  title: 'Interactuar',
                  description: 'Seguimiento automatizado vía WhatsApp seguro',
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  ),
                },
              ].map((item, index) => (
                <div key={index} className="relative">
                  <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-md rounded-2xl p-6 h-full hover:border-accent/50 transition-all">
                    <div className="w-14 h-14 bg-gradient-to-br from-accent/20 to-primary/20 rounded-xl flex items-center justify-center mb-4">
                      {item.icon}
                    </div>
                    <div className="text-4xl font-bold text-accent mb-3">{item.step}</div>
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-400">{item.description}</p>
                  </div>
                  {index < 3 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-accent">
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Architecture */}
      <section id="confianza" className="relative py-32 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                IA de Grado Clínico
              </h2>
              <p className="text-xl text-gray-400">
                Basada en Confianza y Transparencia
              </p>
            </div>

            {/* Trust Principles */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-md rounded-2xl p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-primary/20 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4">Humano en el Ciclo</h3>
                <p className="text-gray-400">
                  La IA asiste y aumenta, pero el médico siempre toma la decisión final.
                  Control absoluto del profesional clínico.
                </p>
              </div>

              <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-md rounded-2xl p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-primary/20 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4">Puntajes de Confianza</h3>
                <p className="text-gray-400">
                  Transparencia total. Cada sugerencia de la IA muestra su nivel de confianza
                  y la evidencia de origen.
                </p>
              </div>

              <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-md rounded-2xl p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-primary/20 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4">Registros de Decisión</h3>
                <p className="text-gray-400">
                  Auditable y defendible. Mantenemos un registro inmutable de todas las
                  interacciones de la IA y las acciones del médico.
                </p>
              </div>
            </div>

            {/* Anatomy of an AI Suggestion */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-xl rounded-2xl p-8 md:p-12">
              <h3 className="text-3xl font-bold mb-8 text-center">Anatomía de una Sugerencia de IA</h3>

              <div className="max-w-3xl mx-auto">
                <div className="bg-black/40 border border-yellow-500/50 rounded-lg p-6 mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-lg font-bold text-yellow-300">Sugerencia de IA</h4>
                        <span className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-3 py-1 rounded-full">
                          Interacción Detectada
                        </span>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4 mb-3 border border-white/10">
                        <p className="text-sm font-semibold text-accent mb-2">📊 Puntaje de Confianza (Registro de Probabilidad)</p>
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 bg-black/40 rounded-full h-2">
                            <div className="bg-accent h-2 rounded-full" style={{ width: '92%' }} />
                          </div>
                          <span className="text-lg font-bold text-accent">92%</span>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4 mb-3 border border-white/10">
                        <p className="text-sm font-semibold text-primary mb-2">📚 Evidencia de Origen</p>
                        <a href="#" className="text-sm text-accent hover:underline flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span>Guía Clínica ADA 2024 - Interacciones Metformina</span>
                        </a>
                      </div>

                      <p className="text-sm text-gray-300 mb-4">
                        Contraindicado en pacientes con disfunción renal severa (TFG &lt;30 mL/min).
                        Suspender antes de procedimientos con contraste yodado.
                      </p>

                      <div className="flex gap-3">
                        <button className="flex-1 bg-accent text-black py-3 rounded-lg font-semibold hover:scale-105 transition-transform">
                          ✓ Acción del Médico: Aceptar
                        </button>
                        <button className="flex-1 bg-white/10 text-white py-3 rounded-lg font-semibold hover:bg-white/20 transition-all border border-white/20">
                          Modificar
                        </button>
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Registro de Auditoría: Decisión registrada de forma segura e inmutable</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security & Compliance */}
            <div className="mt-16 grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-md rounded-2xl p-8">
                <h3 className="text-2xl font-bold mb-6">Seguridad de Grado Empresarial</h3>
                <ul className="space-y-4">
                  <li className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold">Cifrado End-to-End</p>
                      <p className="text-sm text-gray-400">AES-256 en reposo, TLS 1.3 en tránsito</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold">Cumplimiento HIPAA</p>
                      <p className="text-sm text-gray-400">BAA firmado, auditorías regulares</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold">GDPR & LGPD</p>
                      <p className="text-sm text-gray-400">Conformidad total para Europa y Brasil</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-md rounded-2xl p-8">
                <h3 className="text-2xl font-bold mb-6">Claude 3.5 Sonnet</h3>
                <p className="text-gray-400 mb-6">
                  Impulsado por el modelo de IA más avanzado de Anthropic, con ajuste fino médico
                  para precisión clínica y seguridad.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                    <div>
                      <p className="font-semibold">Razonamiento Médico</p>
                      <p className="text-sm text-gray-400">Entrenado en literatura clínica</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold">Privacidad Diferencial</p>
                      <p className="text-sm text-gray-400">ε = 1.0, δ = 1e-5</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-accent flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold">Multilenguaje</p>
                      <p className="text-sm text-gray-400">ES, PT, EN con precisión nativa</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="relative py-32 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Lo Que Dicen Nuestros Design Partners
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  quote: "Recuperé 10 horas a la semana. Ahora puedo ver más pacientes o simplemente tener una vida.",
                  author: "Dra. María González",
                  role: "Cardióloga, São Paulo",
                },
                {
                  quote: "Mis pacientes diabéticos finalmente están alcanzando sus objetivos de HbA1c. El bot de WhatsApp funciona.",
                  author: "Dr. Carlos Mendoza",
                  role: "Endocrinólogo, Ciudad de México",
                },
                {
                  quote: "Las alertas de retención de líquidos salvaron a tres pacientes de rehospitalización este mes.",
                  author: "Dr. Jorge Silva",
                  role: "Medicina Interna, Buenos Aires",
                },
              ].map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-md rounded-2xl p-8"
                >
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6 italic leading-relaxed">"{testimonial.quote}"</p>
                  <div>
                    <p className="font-bold">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section id="waitlist" className="relative py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-2xl rounded-3xl p-12 overflow-hidden">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />

              <div className="relative z-10">
                <div className="text-center mb-12">
                  <h2 className="text-5xl font-bold mb-6">
                    Solicitar Acceso Anticipado
                  </h2>
                  <p className="text-xl text-gray-400">
                    Únase a los Design Partners construyendo el futuro de la atención clínica.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Nombre Completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="px-6 py-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                    <input
                      type="email"
                      placeholder="Correo Electrónico *"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="px-6 py-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Organización/Clínica"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="px-6 py-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="px-6 py-4 rounded-xl bg-white/5 border border-white/20 text-gray-400 focus:outline-none focus:border-accent focus:bg-white/10 transition-all backdrop-blur-md"
                    >
                      <option value="" className="bg-black">Seleccionar Rol</option>
                      <option value="doctor" className="bg-black">Médico</option>
                      <option value="nurse" className="bg-black">Enfermera</option>
                      <option value="researcher" className="bg-black">Investigador</option>
                      <option value="admin" className="bg-black">Administrador</option>
                      <option value="engineer" className="bg-black">Ingeniero</option>
                      <option value="other" className="bg-black">Otro</option>
                    </select>
                  </div>

                  {message && (
                    <div className={`p-4 rounded-xl backdrop-blur-md ${
                      message.type === 'success'
                        ? 'bg-accent/20 border border-accent/50 text-white'
                        : 'bg-red-500/20 border border-red-500/50 text-white'
                    }`}>
                      {message.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-white text-black px-8 py-5 rounded-xl text-lg font-bold hover:scale-105 transition-transform shadow-2xl shadow-white/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isSubmitting ? 'Enviando...' : 'Solicitar Acceso Anticipado →'}
                  </button>

                  <p className="text-center text-gray-500 text-sm">
                    Sin tarjeta de crédito requerida. Nos pondremos en contacto pronto con acceso beta.
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
                  src="/logos/holi-light.svg"
                  alt="Holi Labs"
                  width={32}
                  height={32}
                />
                <h3 className="text-xl font-bold">Holi Labs</h3>
              </div>
              <p className="text-gray-500 text-sm">
                Co-Piloto de IA para médicos. Elimine el "Pajama Time".
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Producto</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li><Link href="/dashboard" className="hover:text-accent transition">Plataforma</Link></li>
                <li><a href="#solucion" className="hover:text-accent transition">Características</a></li>
                <li><a href="#waitlist" className="hover:text-accent transition">Acceso Beta</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Cumplimiento</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li>HIPAA Conforme</li>
                <li>GDPR Conforme</li>
                <li>LGPD (Brasil)</li>
                <li>Método Safe Harbor</li>
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
            <p>© 2025 Holi Labs. Todos los derechos reservados. HIPAA/GDPR/LGPD Conforme.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
