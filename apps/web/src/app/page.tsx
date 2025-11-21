'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import confetti from 'canvas-confetti';

export default function Home() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: '' }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: '¡Éxito! Revisa tu email para acceso instantáneo'
        });
        setEmail('');

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00ff88', '#00cc6a', '#00aa55']
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error. Por favor reintenta' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Falló la conexión. Verifica tu red' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black relative">
      {/* FROSTED GLASS NAVIGATION - APPLE CLINICAL */}
      <header className="fixed top-0 left-0 right-0 z-50 nav-frosted">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          {/* Brand (Left) - Holi Labs Logo + Text */}
          <Link href="/" className="flex items-center space-x-3 group">
            <Image
              src="/logos/Logo 1_Light.svg"
              alt="Holi Labs"
              width={32}
              height={32}
              style={{ width: 'auto', height: '32px' }}
              className="transition-transform group-hover:scale-110"
            />
            <span className="text-gray-900 font-semibold text-lg tracking-tight">
              Holi Labs
            </span>
          </Link>

          {/* Links (Center) - Spanish Navigation */}
          <div className="hidden md:flex items-center space-x-8 text-sm">
            <Link
              href="#problema"
              className="text-gray-600 hover:text-gray-900 transition font-medium"
            >
              El Problema
            </Link>
            <Link
              href="#solucion"
              className="text-gray-600 hover:text-gray-900 transition font-medium"
            >
              Solución
            </Link>
            <Link
              href="#plataforma"
              className="text-gray-600 hover:text-gray-900 transition font-medium"
            >
              Plataforma
            </Link>
          </div>

          {/* CTA Button (Right) - Brand Green Pill */}
          <a
            href="#acceso"
            className="bg-brand-green text-white px-6 py-2 rounded-full font-semibold text-sm hover:bg-green-600 transition active:scale-95"
          >
            Ver demostración
          </a>
        </nav>
      </header>

      {/* HERO SECTION - DOCTOR-FOCUSED */}
      <section className="relative pt-32 pb-20 px-6 min-h-screen flex items-center">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-6 text-center">
            {/* Platform Label */}
            <div className="inline-flex items-center space-x-2 border border-gray-200 px-4 py-1.5 rounded-full bg-gray-50">
              <div className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse"></div>
              <span className="text-xs uppercase tracking-wider text-gray-600 font-medium">
                IA Médica para Latinoamérica
              </span>
            </div>

            {/* Massive Headline - SPANISH */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold leading-tight tracking-tight">
              Toda tu clínica,
              <br />
              <span className="text-brand-green">automatizada</span>
            </h1>

            {/* Value Proposition - REAL BENEFITS */}
            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto">
              Reduce tu papeleo un 80%. Notas clínicas, agenda y facturación en una sola plataforma hecha para Latinoamérica.
            </p>

            {/* CTA Row - SPANISH */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <a
                href="#acceso"
                className="inline-flex items-center justify-center bg-brand-green text-white px-10 py-5 rounded-full text-lg font-bold hover:bg-green-600 transition active:scale-95 group shadow-lg hover:shadow-xl"
              >
                Prueba Gratis
                <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
              </a>
              <a
                href="#solucion"
                className="inline-flex items-center justify-center card-elevated text-gray-900 px-8 py-4 rounded-full font-semibold hover:shadow-md transition active:scale-95"
              >
                Ver Demo (2 min)
              </a>
            </div>

            {/* Trust Signals - REAL DATA */}
            <div className="flex flex-wrap items-center justify-center gap-8 pt-12 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-brand-green rounded-full"></div>
                <span className="font-medium">50+ Clínicas</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-brand-green rounded-full"></div>
                <span className="font-medium">HIPAA / LGPD</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-brand-green rounded-full"></div>
                <span className="font-medium">Configuración 48hrs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section id="problema" className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Te volviste doctor para <span className="text-electric">ayudar pacientes</span>,
            <br />
            no para ahogarte en papeleo
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            El 40% de tu día se va en documentación. Las soluciones gringas cuestan $200-300 USD/mes y no entienden español. Ya es hora de cambiar eso.
          </p>
        </div>
      </section>

      {/* 4 PILLARS BENTO GRID - REAL VALUE PROPS */}
      <section id="plataforma" className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-bold mb-4">
              La Plataforma Completa
            </h2>
            <p className="text-xl text-gray-600">
              Todo lo que necesitas en un solo lugar
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Pillar 1: AI Medical Scribe - THE TIME SAVER */}
            <div className="md:row-span-2 card-elevated p-12 rounded-3xl relative overflow-hidden hover:shadow-md transition-shadow">
              {/* Waveform Icon Background */}
              <div className="absolute inset-0 opacity-[0.02]">
                <svg className="w-full h-full text-gray-900" viewBox="0 0 400 400">
                  <path d="M0,200 Q50,150 100,200 T200,200 T300,200 T400,200" fill="none" stroke="currentColor" strokeWidth="4"/>
                  <path d="M0,200 Q50,250 100,200 T200,200 T300,200 T400,200" fill="none" stroke="currentColor" strokeWidth="4"/>
                </svg>
              </div>

              <div className="relative z-10 h-full flex flex-col justify-between gap-6">
                <div className="flex flex-col gap-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-4xl font-bold text-gray-900">Notas Clínicas con IA</h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Convierte consultas de 20 minutos en notas SOAP perfectas en segundos. IA nativa en español y portugués que entiende acentos locales.
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  <span className="text-brand-green font-semibold">↗ 95-98%</span> precisión
                </div>
              </div>
            </div>

            {/* Pillar 2: WhatsApp Integration - THE REVENUE SAVER */}
            <div className="card-elevated p-12 rounded-3xl hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                    Reduce Ausentismo
                  </span>
                </div>
                <div className="text-7xl font-bold text-gray-900">
                  -40%
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Recordatorios automáticos por WhatsApp con 97% de tasa de apertura
                </p>
              </div>
            </div>

            {/* Pillar 3: Cost Disruptor - THE PRICE ADVANTAGE */}
            <div className="card-elevated p-12 rounded-3xl hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-6">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  Precio Justo
                </div>
                <div className="text-7xl font-bold text-gray-900">
                  10x
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Más barato que competidores gringos. Tecnología de nivel hospitalario a precio local ($10-25 USD/mes).
                </p>
              </div>
            </div>

            {/* Pillar 4: Security & Compliance - THE TRUST SHIELD */}
            <div className="md:col-span-2 card-elevated p-12 rounded-3xl hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 flex flex-col gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                      Seguridad & Cumplimiento
                    </span>
                  </div>
                  <h3 className="text-4xl font-bold text-gray-900">Seguridad Total</h3>
                  <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
                    Cumplimiento HIPAA, GDPR y LGPD. Encriptación de extremo a extremo y auditorías blockchain-verificadas. Tus pacientes están protegidos.
                  </p>
                  <div className="text-sm text-gray-500">
                    Portal de pacientes con verificación de credenciales médicas
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 bg-gray-100 rounded-3xl flex items-center justify-center">
                    <div className="text-6xl">🔒</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTION SECTION */}
      <section id="solucion" className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Plataforma Completa, No Solo Scribe
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Los competidores cobran $200-300 USD/mes solo por IA de notas. Nosotros te damos todo el EHR por $10-25 USD/mes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="card-elevated p-8 rounded-2xl hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-4 items-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">⚡</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">IA Médica</h3>
                <p className="text-gray-600 leading-relaxed">
                  Scribe con IA, detección de interacciones medicamentosas, alertas de alergias, diagnóstico asistido
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="card-elevated p-8 rounded-2xl hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-4 items-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">📱</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Portal Pacientes</h3>
                <p className="text-gray-600 leading-relaxed">
                  Acceso a expedientes, citas en línea, mensajería segura, historial médico completo
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="card-elevated p-8 rounded-2xl hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-4 items-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">💰</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Facturación</h3>
                <p className="text-gray-600 leading-relaxed">
                  Pix, SPEI, efectivo. Facturación automática, recordatorios de pago, reportes financieros
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="card-elevated p-8 rounded-2xl hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-4 items-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">📋</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Recetas Digitales</h3>
                <p className="text-gray-600 leading-relaxed">
                  E-prescriptions con firma blockchain, envío directo a farmacias, tracking de surtido
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="card-elevated p-8 rounded-2xl hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-4 items-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">📅</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Agenda Inteligente</h3>
                <p className="text-gray-600 leading-relaxed">
                  Sincronización con Google/Outlook, detección de conflictos, recordatorios WhatsApp
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="card-elevated p-8 rounded-2xl hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-4 items-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">🌐</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Modo Offline</h3>
                <p className="text-gray-600 leading-relaxed">
                  PWA que funciona sin internet. Perfecto para clínicas rurales con conectividad inestable
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BETA ACCESS FORM */}
      <section id="acceso" className="py-20 px-6">
        <div className="container mx-auto max-w-2xl">
          <div className="flex flex-col gap-8 text-center">
            <div className="flex flex-col gap-4">
              <h2 className="text-5xl md:text-7xl font-bold text-gray-900">
                Empieza Hoy
              </h2>
              <p className="text-xl text-gray-600">
                Únete a 50+ clínicas ahorrando 10+ horas semanales
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu.email@clinica.com"
                  required
                  className="flex-1 px-6 py-4 bg-gray-50 border border-gray-200 text-gray-900 rounded-full placeholder:text-gray-400 focus:border-brand-green focus:ring-2 focus:ring-brand-green focus:ring-offset-2 focus:outline-none transition"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-green text-white px-10 py-5 rounded-full text-lg font-bold hover:bg-green-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg hover:shadow-xl"
                >
                  {isSubmitting ? 'Procesando...' : 'Acceso Gratis →'}
                </button>
              </div>

              {message && (
                <div className={`p-4 rounded-2xl font-medium text-sm ${
                  message.type === 'success'
                    ? 'bg-brand-green/10 text-gray-900 border border-brand-green/20'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  {message.text}
                </div>
              )}
            </form>

            <p className="text-center text-xs uppercase tracking-wider text-gray-500 font-semibold">
              Sin tarjeta • Cancela cuando quieras • HIPAA/LGPD compliant
            </p>
          </div>
        </div>
      </section>

      {/* FLOATING WHATSAPP */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <a
          href="https://wa.me/5511974487888?text=Quiero%20probar%20Holi%20Labs"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative"
        >
          <div className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center hover:glow-green transition shadow-xl">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
        </a>

        <a
          href="mailto:support@holilabs.xyz"
          className="group relative"
        >
          <div className="w-14 h-14 bg-white border border-black/10 rounded-full flex items-center justify-center hover:border-black/20 transition shadow-xl">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </a>
      </div>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-black/5 bg-black text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-2">
              <Image
                src="/logos/Logo 1_Light.svg"
                alt="Holi Labs"
                width={24}
                height={24}
                style={{ width: 'auto', height: '24px' }}
              />
              <span className="font-bold text-sm">HOLI LABS</span>
            </div>

            <div className="flex gap-8 text-sm font-medium text-white/70">
              <Link href="/dashboard" className="hover:text-white transition">Dashboard</Link>
              <Link href="/portal/dashboard" className="hover:text-white transition">Portal</Link>
            </div>
          </div>

          <div className="mt-8 text-center metric-display text-xs text-white/50">
            © 2024 HOLI LABS • HIPAA/GDPR/LGPD Compliant
          </div>
        </div>
      </footer>
    </div>
  );
}
