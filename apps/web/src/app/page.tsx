'use client';
export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { IntroAnimation } from '@/components/IntroAnimation';
import { AICommandCenter, AICommandButton, FeedbackButton } from '@/components/AICommandCenter';
import { useLanguage } from '@/hooks/useLanguage';
import { Language, languageCodes } from '@/lib/translations';

// --- CONFIGURATION ---
const BRAND_GREEN_HEX = '#00FF88';
const THEME_KEY = 'holilabs_theme';

// --- HOOKS ---
function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark';
    if (localStorage.getItem(THEME_KEY) === 'light') return 'light';
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return { theme, toggleTheme };
}

// --- COMPONENTS ---

// Integrated Nav Theme Toggle
function ThemeToggle({ theme, toggleTheme }: { theme: 'light' | 'dark'; toggleTheme: () => void }) {
  return (
    <button
      onClick={toggleTheme}
      className="ml-4 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ease-out border focus:outline-none relative overflow-hidden"
      aria-label="Toggle Theme"
      style={{
        background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        boxShadow: theme === 'dark' ? '0 0 15px rgba(0,255,136,0.1)' : 'none',
      }}
    >
      <div className="relative w-5 h-5">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute inset-0 transform transition-transform duration-500 ${
            theme === 'dark' ? 'rotate-0 opacity-100 text-[#00FF88]' : 'rotate-90 opacity-0'
          }`}
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute inset-0 transform transition-transform duration-500 ${
            theme === 'dark' ? '-rotate-90 opacity-0' : 'rotate-0 opacity-100 text-gray-700'
          }`}
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </div>
    </button>
  );
}

// --- MAIN PAGE ---

export default function Home() {
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteField, setShowInviteField] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [showAICommand, setShowAICommand] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          name: '', 
          inviteCode: inviteCode || undefined 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        let successMessage = data.message || t.signup.success;

        if (data.isFirst100) {
          successMessage = t.signup.successFirst100.replace('{number}', data.signupNumber);
        } else if (data.hasFreeYear) {
          successMessage = t.signup.successFreeYear;
        }

        setMessage({ type: 'success', text: successMessage });
        setEmail('');
        setInviteCode('');
        confetti({
          particleCount: data.isFirst100 ? 200 : 100,
          spread: data.isFirst100 ? 90 : 70,
          origin: { y: 0.6 },
          colors: data.hasFreeYear ? ['#f59e0b', '#fbbf24', '#fcd34d'] : [BRAND_GREEN_HEX, '#00cc6a', '#00aa55'],
        });
      } else {
        setMessage({ type: 'error', text: data.error || t.signup.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t.signup.networkError });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} duration={1500} />}
      <AICommandCenter isOpen={showAICommand} onClose={() => setShowAICommand(false)} />
      <AICommandButton onClick={() => setShowAICommand(true)} />
      <FeedbackButton />
      
      <div className="min-h-screen font-sans tracking-tight text-gray-900 transition-colors duration-300 overflow-x-hidden selection:bg-[#00FF88]/30" style={{ background: 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 20%, #ffffff 100%)' }}>
        
        {/* Subtle background pattern */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* NAVIGATION - PIPEFY STYLE WITH GAP */}
      <header className="fixed top-4 left-0 right-0 z-50 px-4">
        <nav className="container mx-auto max-w-[1400px] bg-white rounded-2xl shadow-lg border border-gray-200/50 px-8 py-4 flex items-center justify-between">
          
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-10 h-10 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logos/Logo 1_Dark.svg"
                alt="Holi Labs"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span
              className="text-xl font-semibold tracking-tight"
              style={{ color: '#014751' }}
            >
              Holi Labs
            </span>
          </Link>

          {/* DESKTOP LINKS */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
            {[
              { labelKey: 'platform', href: '#plataforma' },
              { labelKey: 'cases', href: '#casos' },
              { labelKey: 'pricing', href: '#precios' }
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                {t.nav[item.labelKey as keyof typeof t.nav]}
              </Link>
            ))}
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-4">
            {/* Globe Icon with Language Dropdown - Pipefy Style */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                aria-label="Language"
              >
                <svg 
                  className="w-5 h-5 text-gray-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </button>
              
              {/* Language Dropdown */}
              {showLanguageMenu && (
                <div className="absolute top-12 right-0 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[120px] z-50">
                  {(['en', 'es', 'pt'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                        language === lang ? 'font-semibold text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      {languageCodes[lang]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <a
              href="/dashboard"
              className="hidden md:block text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors px-4 py-2"
            >
              {t.nav.signIn}
            </a>
            <a
              href="#demo"
              style={{ backgroundColor: '#014751' }}
              className="hover:opacity-90 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              {t.nav.demo}
            </a>
          </div>
        </nav>
      </header>

      <section className="relative h-screen min-h-screen flex items-center overflow-hidden pt-24">

        {/* Full Screen Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/landing-hero.jpeg"
            alt="Health 3.0 Platform"
            fill
            className="object-cover"
            priority
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </div>

        {/* Content Overlay */}
        <div className="container mx-auto px-10 md:px-16 relative z-10 max-w-7xl">
          <div className="max-w-3xl">

            {/* Vision Badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/90 backdrop-blur-sm border border-white/20 mb-8 shadow-lg">
              <span className="text-sm font-semibold tracking-wide" style={{ color: '#014751' }}>{t.hero.badge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-8 text-white drop-shadow-2xl">
              {t.hero.headline}
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-white/95 leading-relaxed font-light mb-12 drop-shadow-lg">
              {t.hero.subheadline}
            </p>

            {/* CTA Button */}
            <div className="flex items-start">
              <a
                href="/auth/register"
                className="inline-flex items-center justify-center px-12 py-5 rounded-xl text-xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                }}
              >
                {t.hero.ctaPrimary}
              </a>
            </div>

          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>

      </section>

      {/* PROBLEM/SOLUTION CONTRAST - HEALTH 3.0 */}
      <section id="problema" className="py-16 px-6 bg-white border-t border-gray-200">
        <div className="container mx-auto max-w-6xl">
          
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-bold uppercase tracking-widest mb-6" style={{ color: '#014751' }}>
              {t.paradigm.badge}
            </span>
            <h2 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              {t.paradigm.headline} <span style={{ color: '#014751' }}>{t.paradigm.headlineHighlight}</span>
            </h2>
            <p className="text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
              {t.paradigm.subheadline}
            </p>
          </div>

          {/* Before/After Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* BEFORE - Traditional */}
            <div className="rounded-[2rem] p-10 bg-gradient-to-br from-red-50/80 to-pink-50/60 border-2 border-red-200/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-3xl shadow-sm">
                  📝
                </div>
                <h3 className="text-3xl font-bold text-gray-900">{t.paradigm.legacyTitle}</h3>
              </div>
              <ul className="space-y-5">
                {t.paradigm.legacyItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-4 text-lg text-gray-700">
                    <span className="text-red-500 text-xl mt-0.5">❌</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AFTER - Health 3.0 */}
            <div className="rounded-[2rem] p-10 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 border-2 border-emerald-200/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm bg-emerald-100">
                  <div className="relative w-10 h-10">
                    <Image
                      src="/logos/Logo 1_Dark.svg"
                      alt="Holi Labs"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900">{t.paradigm.health3Title}</h3>
              </div>
              <ul className="space-y-5">
                {t.paradigm.health3Items.map((item, i) => (
                  <li key={i} className="flex items-start gap-4 text-lg text-gray-800 font-medium">
                    <span className="text-xl mt-0.5" style={{ color: '#014751' }}>✅</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <p className="text-2xl text-gray-700 mb-4">
              <span className="font-bold text-gray-900">{language === 'en' ? 'Result:' : language === 'pt' ? 'Resultado:' : 'Resultado:'}</span> {t.paradigm.result}
            </p>
          </div>
        </div>
      </section>


      {/* ONE PLATFORM - PLANHAT STYLE */}
      <section className="py-16 px-6 bg-white">
        <div className="container mx-auto max-w-7xl">
          
          {/* Section Header */}
          <div className="text-center mb-20">
            <span className="text-xs font-bold uppercase tracking-[0.3em] mb-6 block" style={{ color: '#014751' }}>
              {t.onePlatform.badge}
            </span>
            <h2 className="text-6xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              {t.onePlatform.headline}
            </h2>
            <p className="text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
              {t.onePlatform.subheadline}
            </p>
          </div>

          {/* Three Feature Pillars - Planhat Style */}
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Pillar 1: AI Automation */}
            <div className="rounded-[2rem] bg-gradient-to-br from-purple-50/40 to-indigo-50/40 p-8 border border-purple-200/50 hover:shadow-xl transition-all group">
              <div className="mb-6 aspect-[4/3] rounded-[1.5rem] bg-gradient-to-br from-purple-500 to-indigo-600 p-8 flex items-center justify-center shadow-lg overflow-hidden relative">
                {/* Chat Interface Mockup */}
                <div className="absolute inset-4 bg-white/95 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-sm">👤</div>
                    <div className="flex-1 bg-gray-100 rounded-2xl px-3 py-2 text-xs text-gray-700">
                      Generar nota SOAP para paciente diabético...
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: 'rgba(1, 71, 81, 0.1)' }}>✨</div>
                    <div className="flex-1 rounded-2xl px-3 py-2 text-xs text-white" style={{ backgroundColor: '#014751' }}>
                      Nota generada con HbA1c, plan de tx...
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Automation</h3>
              <p className="text-gray-700 leading-relaxed">
                Conecta cualquier LLM a nuestra plataforma líder en datos médicos y usa tus datos como contexto para automatizar transcripciones, generar notas SOAP, y acelerar flujos clínicos.
              </p>
            </div>

            {/* Pillar 2: Value-Based Care Tracking */}
            <div className="rounded-[2rem] bg-gradient-to-br from-blue-50/40 to-cyan-50/40 p-8 border border-blue-200/50 hover:shadow-xl transition-all group">
              <div className="mb-6 aspect-[4/3] rounded-[1.5rem] bg-gradient-to-br from-blue-600 to-cyan-600 p-6 flex items-center justify-center shadow-lg overflow-hidden relative">
                {/* Dashboard Chart Mockup */}
                <div className="absolute inset-4 bg-white/95 rounded-2xl p-4">
                  <div className="flex flex-col gap-2">
                    <div className="h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full" style={{ width: '85%' }}></div>
                    <div className="h-2 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full" style={{ width: '72%' }}></div>
                    <div className="h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" style={{ width: '90%' }}></div>
                  </div>
                  <div className="mt-4 text-xs text-gray-600 font-semibold">HbA1c Control: 85%</div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Value-Based Care</h3>
              <p className="text-gray-700 leading-relaxed">
                Rastrea los resultados clínicos en tiempo real. Visualiza métricas de calidad, adherencia al tratamiento y desempeño poblacional para demostrar un valor tangible.
              </p>
            </div>

            {/* Pillar 3: Prevention Hub */}
            <div className="rounded-[2rem] bg-gradient-to-br from-emerald-50/40 to-teal-50/40 p-8 border border-emerald-200/50 hover:shadow-xl transition-all group">
              <div className="mb-6 aspect-[4/3] rounded-[1.5rem] p-6 flex items-center justify-center shadow-lg overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #014751, #10b981)' }}>
                {/* Protocol Cards */}
                <div className="absolute inset-4 flex flex-col gap-2">
                  <div className="bg-white/95 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 flex items-center gap-2">
                    <span className="text-green-500">✓</span> WHO NCD Protocol
                  </div>
                  <div className="bg-white/95 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 flex items-center gap-2">
                    <span className="text-blue-500">✓</span> USPSTF Screenings
                  </div>
                  <div className="bg-white/95 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 flex items-center gap-2">
                    <span className="text-purple-500">✓</span> PAHO Guidelines
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Prevention Hub</h3>
              <p className="text-gray-700 leading-relaxed">
                Accede a protocolos de prevención de WHO, PAHO, y USPSTF. Rastrea adherencia a tratamientos preventivos y genera alertas automáticas para screenings vencidos.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* DISCOVER YOUR CO-PILOT SECTION */}
      <section className="py-16 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto max-w-7xl">
          
          {/* Section Header */}
          <div className="text-center mb-20">
            <span className="text-xs font-bold uppercase tracking-[0.3em] mb-6 block" style={{ color: '#014751' }}>
              DESCUBRE TU CO-PILOT
            </span>
            <h2 className="text-6xl md:text-7xl font-bold mb-8 leading-tight" style={{ color: '#014751' }}>
              Una biblioteca de soluciones inteligentes<br/>disponibles para automatizar tu práctica
            </h2>
            <p className="text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
              Crea, ajusta y gestiona soluciones de IA para automatizar tus procesos clínicos rápidamente.
            </p>
          </div>

          {/* Four Solution Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            
            {/* 1. Gobernanza Corporativa */}
            <div className="rounded-[2rem] bg-white border-2 border-gray-200 p-10 hover:border-gray-300 hover:shadow-xl transition-all">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm" style={{ backgroundColor: 'rgba(1, 71, 81, 0.1)' }}>
                  🏛️
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Gobernanza Corporativa Flexible</h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    Implemente gobernanza bajo sus términos. Garantice conformidad regulatoria, protección de datos y control total a escala hospitalaria.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-6">
                <span className="px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-sm font-semibold text-blue-700">HIPAA/LGPD</span>
                <span className="px-4 py-2 rounded-full bg-purple-50 border border-purple-200 text-sm font-semibold text-purple-700">Audit Logs</span>
                <span className="px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-700">Role-Based Access</span>
              </div>
            </div>

            {/* 2. Value-Based Care Outcomes */}
            <div className="rounded-[2rem] bg-white border-2 border-gray-200 p-10 hover:border-gray-300 hover:shadow-xl transition-all">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center text-3xl shadow-sm">
                  📊
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Rastreo de Outcomes Basados en Valor</h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    Dashboard extensivo que muestra outcomes tangibles: control de HbA1c, reducción de hospitalizaciones, adherencia a tratamientos, y métricas de calidad para contratos de valor.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-6">
                <span className="px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-sm font-semibold text-blue-700">HEDIS Measures</span>
                <span className="px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-sm font-semibold text-indigo-700">Quality Metrics</span>
                <span className="px-4 py-2 rounded-full bg-cyan-50 border border-cyan-200 text-sm font-semibold text-cyan-700">Population Health</span>
              </div>
            </div>

            {/* 3. Prevention Hub WHO/PAHO */}
            <div className="rounded-[2rem] bg-white border-2 border-gray-200 p-10 hover:border-gray-300 hover:shadow-xl transition-all">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-3xl shadow-sm">
                  🎯
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Hub de Prevención con Protocolos Globales</h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    Accede a protocolos de prevención establecidos por WHO, PAHO, y USPSTF. Rastrea adherencia a tratamientos preventivos y genera recordatorios automáticos para screenings.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-6">
                <span className="px-4 py-2 rounded-full bg-green-50 border border-green-200 text-sm font-semibold text-green-700">WHO NCD</span>
                <span className="px-4 py-2 rounded-full bg-teal-50 border border-teal-200 text-sm font-semibold text-teal-700">PAHO LATAM</span>
                <span className="px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-700">USPSTF A/B</span>
              </div>
            </div>

            {/* 4. AI Command Center */}
            <div className="rounded-[2rem] bg-white border-2 border-gray-200 p-10 hover:border-gray-300 hover:shadow-xl transition-all">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-3xl shadow-sm">
                  🤖
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Navegación Inteligente Predictiva</h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    Co-Pilot que predice qué herramientas necesitas según hora del día, tipo de paciente, y tus patrones de uso. Acceso instantáneo a cualquier función con comandos de voz.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-6">
                <span className="px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-sm font-semibold text-amber-700">Voice Commands</span>
                <span className="px-4 py-2 rounded-full bg-orange-50 border border-orange-200 text-sm font-semibold text-orange-700">Smart Navigation</span>
                <span className="px-4 py-2 rounded-full bg-yellow-50 border border-yellow-200 text-sm font-semibold text-yellow-700">Predictive UI</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* COLLABORATION SECTION - PLANHAT STYLE */}
      <section className="py-16 px-6 bg-gradient-to-b from-white to-emerald-50/30">
        <div className="container mx-auto max-w-7xl">
          
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.3em] mb-6 block" style={{ color: '#014751' }}>
              COLABORACIÓN
            </span>
            <h2 className="text-6xl md:text-7xl font-bold mb-8 leading-tight" style={{ color: '#014751' }}>
              Elimina Silos,<br/>Maximiza Colaboración.
            </h2>
            <p className="text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
              Consolida tu información clínica y alinea a tu equipo médico alrededor de procesos que generan impacto real en la salud de tus pacientes.
            </p>
          </div>

          {/* Collaboration Features Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Feature: Multi-User EHR */}
            <div className="rounded-[2rem] bg-white/80 backdrop-blur-sm border border-gray-200 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">EHR Multi-Usuario con Permisos</h3>
              <p className="text-gray-700 text-base">
                Médicos, enfermeras, y staff acceden al mismo expediente con roles diferenciados. Control granular de quién ve qué información.
              </p>
            </div>

            {/* Feature: Real-Time Messaging */}
            <div className="rounded-[2rem] bg-white/80 backdrop-blur-sm border border-gray-200 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Mensajería HIPAA en Tiempo Real</h3>
              <p className="text-gray-700 text-base">
                Integra WhatsApp, Teams y comunicación interna directamente en los flujos clínicos. Centraliza comunicaciones con rastreabilidad y gobernanza de TI.
              </p>
            </div>

            {/* Feature: Shared Care Plans */}
            <div className="rounded-[2rem] bg-white/80 backdrop-blur-sm border border-gray-200 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Planes de Cuidado Compartidos</h3>
              <p className="text-gray-700 text-base">
                Construye experiencias de atención coordinada. Todo el equipo ve las mismas metas, intervenciones, y progreso del paciente en tiempo real.
              </p>
            </div>

            {/* Feature: Team Analytics */}
            <div className="rounded-[2rem] bg-white/80 backdrop-blur-sm border border-gray-200 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Analytics de Equipo</h3>
              <p className="text-gray-700 text-base">
                Monitorea productividad, carga de trabajo, y outcomes por proveedor. Identifica oportunidades de mejora y distribuye casos equitativamente.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* DATA MANAGEMENT SECTION - PLANHAT STYLE */}
      <section className="py-16 px-6 bg-gradient-to-b from-blue-50/30 to-white">
        <div className="container mx-auto max-w-7xl">
          
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.3em] mb-6 block" style={{ color: '#014751' }}>
              DATA
            </span>
            <h2 className="text-6xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              Gestión de Datos<br/>Líder en el Mercado
            </h2>
            <p className="text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
              Conecta tus datos, personaliza cómo los ves, y luego automatiza acciones. La forma correcta de aprovechar IA a nivel hospitalario.
            </p>
          </div>

          {/* Three Data Pillars */}
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Pillar 1: Native Integrations */}
            <div className="rounded-[2rem] bg-white border border-gray-200 p-8 hover:shadow-lg transition-all">
              <div className="mb-6">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="aspect-square rounded-xl bg-blue-50 flex items-center justify-center text-xl">💊</div>
                  <div className="aspect-square rounded-xl bg-purple-50 flex items-center justify-center text-xl">🏥</div>
                  <div className="aspect-square rounded-xl bg-emerald-50 flex items-center justify-center text-xl">🧪</div>
                  <div className="aspect-square rounded-xl bg-pink-50 flex items-center justify-center text-xl">📅</div>
                  <div className="aspect-square rounded-xl bg-cyan-50 flex items-center justify-center text-xl">💬</div>
                  <div className="aspect-square rounded-xl bg-amber-50 flex items-center justify-center text-xl">📊</div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Integraciones Nativas</h3>
              <p className="text-gray-700 leading-relaxed">
                Conecta instantáneamente con labs, farmacias, y sistemas existentes. Sincroniza datos en minutos con 50+ integraciones nativas sin código.
              </p>
            </div>

            {/* Pillar 2: Custom Connections */}
            <div className="rounded-[2rem] bg-white border border-gray-200 p-8 hover:shadow-lg transition-all">
              <div className="mb-6 aspect-[4/3] rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 flex items-center justify-center text-white text-sm font-mono shadow-lg">
                <div className="text-center">
                  API Webhooks<br/>FHIR R4<br/>HL7 | DICOM
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Conexiones Personalizadas</h3>
              <p className="text-gray-700 leading-relaxed">
                Construye conexiones personalizadas a miles de herramientas usando nuestra API potente e intuitiva. Webhooks, FHIR, HL7, todo lo que necesites.
              </p>
            </div>

            {/* Pillar 3: Transform & Automate */}
            <div className="rounded-[2rem] bg-white border border-gray-200 p-8 hover:shadow-lg transition-all">
              <div className="mb-6 aspect-[4/3] rounded-2xl p-6 flex flex-col gap-2" style={{ background: 'linear-gradient(135deg, #014751, #10b981)' }}>
                <div className="bg-white/90 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800">Lab Result → Auto-Flag → Care Plan</div>
                <div className="bg-white/90 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800">HbA1c ≥5.7% → Diabetes Prevention</div>
                <div className="bg-white/90 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800">Missed Screening → Alert + Schedule</div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Combina y Transforma</h3>
              <p className="text-gray-700 leading-relaxed">
                Toma control transformando tus datos clínicos en lo que tu equipo necesita: workflows automatizados, fórmulas predictivas, y alertas inteligentes.
              </p>
            </div>

          </div>

          {/* Integrations Showcase */}
          <div className="mt-20 rounded-[2rem] bg-white border-2 border-gray-200 p-12">
            <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">Integraciones Disponibles</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {/* Medical Systems */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase mb-4 tracking-wide">Sistemas Médicos</p>
                <div className="space-y-3">
                  <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800">FHIR R4</div>
                  <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800">HL7</div>
                  <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800">DICOM</div>
                  <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800">RNDS Brasil</div>
                </div>
              </div>

              {/* Pharmacies */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase mb-4 tracking-wide">Farmacias</p>
                <div className="space-y-3">
                  <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm font-semibold text-blue-800">Guadalajara</div>
                  <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm font-semibold text-blue-800">Benavides</div>
                  <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm font-semibold text-blue-800">Del Ahorro</div>
                  <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm font-semibold text-blue-800">+5 más</div>
                </div>
              </div>

              {/* Communication */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase mb-4 tracking-wide">Comunicación</p>
                <div className="space-y-3">
                  <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm font-semibold text-green-800">WhatsApp</div>
                  <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm font-semibold text-green-800">Twilio SMS</div>
                  <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm font-semibold text-green-800">SendGrid</div>
                  <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm font-semibold text-green-800">Push Notifications</div>
                </div>
              </div>

              {/* AI Models */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase mb-4 tracking-wide">Modelos IA</p>
                <div className="space-y-3">
                  <div className="px-4 py-3 rounded-xl bg-purple-50 border border-purple-200 text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <span className="text-xs">🔮</span> GPT-4
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-purple-50 border border-purple-200 text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <span className="text-xs">☀️</span> Claude
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-purple-50 border border-purple-200 text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <span className="text-xs">✨</span> Gemini
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-purple-50 border border-purple-200 text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <span className="text-xs">🦙</span> LLaMA
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-gray-600 text-base">
                + Databases, ERP, Cloud Apps, Workflows y más
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE PROPOSITION CARDS - PIPEFY STYLE */}
      <section className="py-20 px-6 bg-gradient-to-b from-blue-50/30 to-white">
        <div className="container mx-auto max-w-6xl">
          
          <div className="grid md:grid-cols-2 gap-12 mb-20">
            
            {/* Card 1: AI Agents */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 border border-purple-200">
                <span className="text-sm font-semibold text-purple-700">AI Agents prontos para usar</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                En segundos, transforma consultas en notas clínicas perfectas
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Con AI que entiende español y portugués, el Pipefy médico automatiza documentación, genera notas SOAP y libera 3-4 horas diarias para que te enfoques en tus pacientes.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm">
                  AI Medical Scribe
                </span>
                <span className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm">
                  Transcripción en tiempo real
                </span>
                <span className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm">
                  Notas SOAP automáticas
                </span>
              </div>
            </div>

            {/* Card 2: Integration */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border border-blue-200">
                <span className="text-sm font-semibold text-blue-700">Integración inteligente</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                Gestiona todo en un solo lugar
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Plataforma completa: EHR, prevención, telemedicina, e-prescribing, portal de pacientes, analytics y más. Todo lo que necesitas para crear una práctica moderna en minutos.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm">
                  FHIR R4 compliant
                </span>
                <span className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm">
                  HIPAA/LGPD
                </span>
                <span className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm">
                  8+ farmacias integradas
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* COMPREHENSIVE PLATFORM FEATURES */}
      <section id="plataforma" className="py-16 px-6 bg-white">
        <div className="container mx-auto max-w-7xl">
          
          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Una plataforma completa y personalizable
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Todos los módulos que necesitas para operar tu clínica con eficiencia y escalar sin límites.
            </p>
          </div>

          {/* Module 1: PREVENTION & POPULATION HEALTH */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border border-blue-200 mb-6">
                <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Prevención & Manejo Poblacional</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Medicina preventiva a escala
              </h3>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Automatiza screenings, identifica gaps de prevención y maneja poblaciones completas con protocolos WHO/PAHO/USPSTF.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Hub de Prevención Longitudinal',
                  desc: 'Timeline visual de 30 años con todos los screenings. 7 dominios de salud organizados.',
                  badge: '100+ intervenciones',
                  icon: '📊',
                  color: 'blue'
                },
                {
                  title: 'Screening Triggers',
                  desc: '15+ protocolos automatizados. Monitoreo diario de TODOS tus pacientes.',
                  badge: '0 horas rastreando',
                  icon: '⏰',
                  color: 'indigo'
                },
                {
                  title: 'Monitoreo de Labs',
                  desc: 'Auto-flagging de resultados críticos con planes automáticos y cálculo de riesgo.',
                  badge: 'Prevención 2ª',
                  icon: '🧪',
                  color: 'purple'
                }
              ].map((feat, i) => (
                <div key={i} className="group p-8 rounded-xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 text-center">
                  <div className="text-5xl mb-4 flex items-center justify-center">{feat.icon}</div>
                  <h4 className="text-xl font-bold text-gray-900 mb-3">{feat.title}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{feat.desc}</p>
                  <div className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                    {feat.badge}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Module 2: AI CLINICAL */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 border border-emerald-200 mb-6">
                <span className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Inteligencia Artificial Clínica</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                IA que trabaja para ti 24/7
              </h3>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Scribe médico, decisiones clínicas y co-pilot inteligente. Libera tu tiempo para lo que realmente importa.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'AI Medical Scribe',
                  desc: 'Transcripción → Notas SOAP automáticas. Códigos ICD-10 sugeridos.',
                  time: 'Ahorra 3-4h/día',
                  icon: '🎙️'
                },
                {
                  title: 'Clinical Decision Support',
                  desc: '12+ reglas activas. Interacciones medicamentosas, protocolos WHO, alertas de riesgo.',
                  time: 'Solo alertas útiles',
                  icon: '⚕️'
                },
                {
                  title: 'AI Co-Pilot',
                  desc: 'Chatbot clínico contextual. Diagnósticos diferenciales, redacción de notas.',
                  time: 'Inteligencia aumentada',
                  icon: '💬'
                }
              ].map((feat, i) => (
                <div key={i} className="group p-8 rounded-xl bg-white border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 text-center">
                  <div className="text-5xl mb-4 flex items-center justify-center">{feat.icon}</div>
                  <h4 className="text-xl font-bold text-gray-900 mb-3">{feat.title}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{feat.desc}</p>
                  <div className="text-sm font-semibold text-emerald-600">{feat.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Module 3: COMPLETE EHR - Rectangular Grid */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 border border-indigo-200 mb-6">
                <span className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">EHR Completo</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Registro médico electrónico de clase mundial
              </h3>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Todo lo que necesitas para documentar, gestionar y compartir información clínica con total seguridad.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '👤', label: 'Demografía LGPD', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                { icon: '📝', label: 'Notas SOAP', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                { icon: '💊', label: 'Medicamentos + MAR', color: 'bg-pink-50 border-pink-200 text-pink-700' },
                { icon: '⚠️', label: 'Alergias', color: 'bg-red-50 border-red-200 text-red-700' },
                { icon: '🩺', label: 'Signos Vitales', color: 'bg-green-50 border-green-200 text-green-700' },
                { icon: '🧪', label: 'Labs LOINC', color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
                { icon: '🏥', label: 'Imagenología DICOM', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                { icon: '🔬', label: 'Screening Protocols', color: 'bg-violet-50 border-violet-200 text-violet-700' }
              ].map((item, i) => (
                <div key={i} className={`p-6 rounded-xl border-2 ${item.color} hover:shadow-md transition-all duration-200 text-center`}>
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div className="text-sm font-semibold">{item.label}</div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
              <p className="text-center text-gray-700 leading-relaxed">
                <span className="font-bold text-gray-900">Por qué es diferente:</span> Humanización completa, historial familiar multinivel, FHIR R4 compliant, RNDS Brasil, IPS export internacional.
              </p>
            </div>
          </div>

          {/* Module 4: MORE FEATURES - Clean Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: '💊',
                title: 'E-Prescribing',
                desc: '8+ farmacias integradas. Firma digital ICP-Brasil.'
              },
              {
                icon: '📅',
                title: 'Telemedicina',
                desc: 'Video HD, Google/Outlook sync, -40% no-shows.'
              },
              {
                icon: '📱',
                title: 'Portal Pacientes',
                desc: 'Acceso completo, citas online, mensajería HIPAA.'
              },
              {
                icon: '💬',
                title: 'Omnicanal',
                desc: 'WhatsApp, SMS, Email, Push. E2E encryption.'
              },
              {
                icon: '📝',
                title: 'Formularios IA',
                desc: 'Drag-and-drop, generación AI, e-firma.'
              },
              {
                icon: '🏥',
                title: 'Especializado',
                desc: 'Paliativos, MAR, planes de cuidado.'
              },
              {
                icon: '💰',
                title: 'Facturación',
                desc: 'Auto-facturas, TISS Brasil, analytics.'
              },
              {
                icon: '🔗',
                title: 'Interoperabilidad',
                desc: 'FHIR R4, RNDS, LOINC, SNOMED, DICOM.'
              }
            ].map((feat, i) => (
              <div key={i} className="p-6 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 text-center">
                <div className="text-4xl mb-3 flex items-center justify-center">{feat.icon}</div>
                <h4 className="text-base font-bold text-gray-900 mb-2">{feat.title}</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>

          {/* Security Banner - Clean Design */}
          <div className="mt-16 rounded-xl p-8 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-white shadow-sm border border-emerald-200 flex items-center justify-center text-3xl">
                  🔒
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-1">Seguridad & Compliance de Clase Mundial</h4>
                  <p className="text-gray-700 text-sm">HIPAA Safe Harbor • LGPD/GDPR • AES-256 • E2E encryption • MFA/TOTP • Audit logs</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-4 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-700 font-semibold text-sm shadow-sm">✓ HIPAA</span>
                <span className="px-4 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-700 font-semibold text-sm shadow-sm">✓ LGPD</span>
                <span className="px-4 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-700 font-semibold text-sm shadow-sm">✓ ISO 27269</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CASE STUDIES - REAL WORLD IMPACT */}
      <section id="casos" className="py-16 px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto max-w-7xl">
          
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              La elección de los líderes: IA y automatización para resultados inmediatos
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Con workflows automatizados y AI Agents, médicos y clínicas aceleraron operaciones, redujeron burnout y mejoraron outcomes clínicos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            
            {/* Case Study 1: Individual Doctor */}
            <div className="rounded-xl p-8 bg-white border border-gray-200 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-2xl shadow-md">
                  👨‍⚕️
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Dr. García</h3>
                  <p className="text-sm text-gray-600">Medicina Familiar</p>
                </div>
              </div>
              
              <div className="space-y-6 mb-6">
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-3">Antes de Holi Labs:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">×</span>
                      <span>4 horas/día documentando</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">×</span>
                      <span>15-20 llamadas diarias</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">×</span>
                      <span>Screenings olvidados</span>
                    </li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-3">Con Holi Labs:</p>
                  <ul className="space-y-2 text-sm text-gray-900 font-medium">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600">✓</span>
                      <span>30 min/día con AI Scribe</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600">✓</span>
                      <span>5 llamadas (portal automatizado)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600">✓</span>
                      <span>0 screenings olvidados</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <p className="text-3xl font-bold text-blue-600 mb-1">+20%</p>
                <p className="text-sm text-gray-600">Aumento en ingresos año 1</p>
              </div>
            </div>

            {/* Case Study 2: Community Clinic */}
            <div className="rounded-xl p-8 bg-white border border-gray-200 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl shadow-md">
                  🏥
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Clínica Comunitaria</h3>
                  <p className="text-sm text-gray-600">3 médicos, 200 pac/semana</p>
                </div>
              </div>
              
              <div className="space-y-6 mb-6">
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-3">Desafío:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Población vulnerable con múltiples comorbilidades</li>
                    <li>• Recursos limitados, pérdida de seguimiento</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-3">Resultados (6 meses):</p>
                  <ul className="space-y-2 text-sm text-gray-900 font-medium">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600">✓</span>
                      <span>-45% screenings vencidos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600">✓</span>
                      <span>+30% adherencia meds</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600">✓</span>
                      <span>-25% hospitalizaciones</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Hub de Prevención + WhatsApp reminders = resultados mejorados
                </p>
              </div>
            </div>

            {/* Case Study 3: Telemedicine */}
            <div className="rounded-xl p-8 bg-white border border-gray-200 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-2xl shadow-md">
                  💻
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Dr. Silva</h3>
                  <p className="text-sm text-gray-600">Médico General + Tele</p>
                </div>
              </div>
              
              <div className="space-y-6 mb-6">
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-3">Objetivo:</p>
                  <p className="text-sm text-gray-600">Expandir práctica a zonas rurales sin viajar</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                  <p className="text-xs font-bold text-purple-700 uppercase mb-3">Resultado (1 año):</p>
                  <ul className="space-y-2 text-sm text-gray-900 font-medium">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600">✓</span>
                      <span>40% consultas ahora tele</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600">✓</span>
                      <span>+35% ingresos sin más horas</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <p className="text-3xl font-bold text-purple-600 mb-1">Impacto social</p>
                <p className="text-sm text-gray-600">Comunidades remotas con acceso a salud</p>
              </div>
            </div>

          </div>

          {/* COMPETITIVE COMPARISON */}
          <div className="mt-20">
            <h3 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
              Holi Labs vs. Competencia
            </h3>
            <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
              Comparación transparente de funcionalidades y precios
            </p>
            
            <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left p-4 text-sm font-semibold text-gray-900 tracking-wide">Funcionalidad</th>
                    <th className="p-4 text-sm font-semibold text-blue-600 tracking-wide">Holi Labs</th>
                    <th className="p-4 text-sm font-semibold text-gray-500 tracking-wide">Doctoralia</th>
                    <th className="p-4 text-sm font-semibold text-gray-500 tracking-wide">OpenEMR</th>
                    <th className="p-4 text-sm font-semibold text-gray-500 tracking-wide">Epic/Cerner</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    { feature: 'AI Medical Scribe', holi: '✅ Incluido', doc: '❌', open: '❌', epic: '⚠️ Costo extra' },
                    { feature: 'Prevención Longitudinal (30 años)', holi: '✅ Incluido', doc: '❌', open: '❌', epic: '⚠️ Limitado' },
                    { feature: 'Auto-screening triggers', holi: '✅ 15+ protocolos', doc: '❌', open: '❌', epic: '⚠️ Limitado' },
                    { feature: 'CDS Inteligente', holi: '✅ 12+ reglas', doc: '❌', open: '⚠️ Básico', epic: '✅ Sí (fatigue)' },
                    { feature: 'Protocolos PAHO/WHO', holi: '✅ Latinoamérica', doc: '❌', open: '❌', epic: '⚠️ Solo EEUU' },
                    { feature: 'Portal de pacientes', holi: '✅ Completo', doc: '✅ Básico', open: '⚠️ Limitado', epic: '✅ Completo' },
                    { feature: 'Integración farmacias MX', holi: '✅ 8+ farmacias', doc: '❌', open: '❌', epic: '❌' },
                    { feature: 'FHIR R4 + RNDS Brasil', holi: '✅ Completo', doc: '❌', open: '⚠️ Parcial', epic: '✅ Sí' },
                    { feature: 'Audit trail completo', holi: '✅ Incluido', doc: '⚠️ Básico', open: '⚠️ Limitado', epic: '✅ Completo' },
                    { feature: 'Precio/mes', holi: '$25 USD', doc: '$50-150', open: 'Gratis*', epic: '$500-1000+' },
                    { feature: 'Setup time', holi: '1 día', doc: '3-5 días', open: 'Semanas', epic: 'Meses' },
                    { feature: 'Support en español', holi: '✅ Nativo', doc: '⚠️ Limitado', open: '❌', epic: '⚠️ Limitado' },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">{row.feature}</td>
                      <td className="p-4 text-center font-semibold text-blue-600">{row.holi}</td>
                      <td className="p-4 text-center text-gray-600">{row.doc}</td>
                      <td className="p-4 text-center text-gray-600">{row.open}</td>
                      <td className="p-4 text-center text-gray-600">{row.epic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <p className="text-center text-sm text-gray-500 mt-6 bg-gray-50 p-4 rounded-lg">
              * OpenEMR es gratis pero requiere semanas de setup técnico complejo y no tiene soporte en español
            </p>
          </div>

        </div>
      </section>

      {/* PRICING SECTION - PIPEFY STYLE */}
      <section id="precios" className="py-16 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto max-w-7xl">
          
          {/* Pricing Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Automatización de procesos para<br/>todos los presupuestos
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Desde médicos individuales hasta redes hospitalarias. Encuentra el plan perfecto para ti.
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            
            {/* STARTER TIER */}
            <div className="rounded-xl bg-white border-2 border-gray-200 p-8 flex flex-col hover:border-gray-300 hover:shadow-lg transition-all duration-200">
              
              {/* Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Starter</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Para equipos pequeños, startups, freelancers y estudiantes que precisan organizar sus tareas
                </p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="mb-3">
                  <span className="text-5xl font-bold text-gray-900">Gratis</span>
                </div>
                <p className="text-sm text-gray-600">Não precisa de cartão de crédito</p>
              </div>

              {/* CTA */}
              <a
                href="#demo"
                className="w-full py-4 px-6 rounded-lg text-center font-semibold mb-8 transition-all duration-200
                  bg-gray-100 hover:bg-gray-200 
                  border border-gray-300 
                  text-gray-900 
                  shadow-sm hover:shadow-md
                  active:scale-[0.98]"
              >
                Comenzar agora
              </a>

              {/* Features */}
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700 mb-4">
                  O plano Starter inclui:
                </p>
                <ul className="space-y-2.5">
                  {[
                    'Pipefy AI',
                    'Até 5 processos',
                    'Até 10 pessoas',
                    'Automações básicas',
                    'Templates prontos para usar',
                    'Status de solicitações',
                    'Customização Visual'
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* PROFESSIONAL TIER - MOST POPULAR */}
            <div className="rounded-xl bg-white border-2 border-blue-600 p-8 flex flex-col relative transform md:scale-105 shadow-xl">
              
              {/* Most Popular Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-400 to-orange-500 text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
                Mais escolhido
              </div>

              {/* Header */}
              <div className="mb-6 pt-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Professional</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Para pequeñas y medianas empresas que precisan centralizar y dimensionar procesos de negócios
                </p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold text-gray-900">$75</span>
                  <span className="text-gray-600">USD/mes</span>
                </div>
                <p className="text-sm text-gray-600">por médico</p>
              </div>

              {/* CTA */}
              <a
                href="#demo"
                className="w-full py-4 px-6 rounded-lg text-center font-semibold mb-8 transition-all duration-200
                  text-white 
                  shadow-md hover:shadow-lg"
                style={{ backgroundColor: '#014751' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Falar com vendas
              </a>

              {/* Features */}
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700 mb-4">
                  Recursos do Starter, mais:
                </p>
                <ul className="space-y-2.5">
                  {[
                    'Processos ilimitados',
                    'Usuários ilimitados',
                    'Usuários ilimitados (cobrança p/ usuário)',
                    'Acesso a API do Pipefy',
                    'Níveis de acesso e permissão',
                    'Processos privados',
                    'Lógica condicional',
                    'Recuperação de dados',
                    'Assinatura Eletrônica'
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ENTERPRISE TIER */}
            <div className="rounded-xl bg-white border-2 border-gray-200 p-8 flex flex-col hover:border-gray-300 hover:shadow-lg transition-all duration-200">
              
              {/* Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Enterprise</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Para empresas que precisan de segurança, controle e suporte para gerenciar processos complexos
                </p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-gray-900">Custom</span>
                </div>
                <p className="text-sm text-gray-600">desde $500/médico/mes</p>
              </div>

              {/* CTA */}
              <a
                href="mailto:admin@holilabs.xyz"
                className="w-full py-4 px-6 rounded-lg text-center font-semibold mb-8 transition-all duration-200
                  text-white 
                  shadow-md hover:shadow-lg"
                style={{ backgroundColor: '#014751' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Falar com vendas
              </a>

              {/* Features */}
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700 mb-4">
                  Recursos do Business, mais:
                </p>
                <ul className="space-y-2.5">
                  {[
                    'Pipefy AI',
                    'Automações complexas',
                    'Integrações',
                    'Autenticação multifatorial',
                    'Single Sign-On',
                    'Domínio de email personalizado',
                    'White label',
                    'Assinatura Eletrônica',
                    'Mais espaço de armazenamento'
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>

          {/* Comparison Link */}
          <div className="text-center">
            <a 
              href="#comparacion" 
              className="inline-flex items-center gap-2 text-gray-600 hover:opacity-80 dark:hover:opacity-80 transition-colors font-medium"
            >
              Veja todos os recursos e compare os planos
              <span>→</span>
            </a>
          </div>

        </div>
      </section>

      {/* DETAILED COMPARISON */}
      <section id="comparacion" className="py-16 px-6 bg-white border-t border-gray-200">
        <div className="container mx-auto max-w-6xl">
          
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comparación Detallada de Planes
            </h2>
            <p className="text-gray-600">
              Todas las funciones que necesitas, sin importar el tamaño de tu práctica
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-white/10">
                  <th className="text-left p-4 text-sm font-bold text-gray-900">Funcionalidad</th>
                  <th className="p-4 text-sm font-bold text-gray-700">Starter</th>
                  <th className="p-4 text-sm font-bold text-[#00FF88]">Professional</th>
                  <th className="p-4 text-sm font-bold text-gray-700">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { category: 'IA & Automatización', features: [
                    { name: 'AI Medical Scribe', starter: '✓', pro: '✓', enterprise: '✓' },
                    { name: 'AI Co-Pilot clínico', starter: '—', pro: '✓', enterprise: '✓' },
                    { name: 'Notas SOAP automáticas', starter: '✓', pro: '✓', enterprise: '✓' },
                    { name: 'Clinical Decision Support', starter: '—', pro: '12+ reglas', enterprise: 'Ilimitadas' },
                  ]},
                  { category: 'Gestión de Pacientes', features: [
                    { name: 'Pacientes activos', starter: '50', pro: 'Ilimitados', enterprise: 'Ilimitados' },
                    { name: 'Citas por día', starter: '10', pro: 'Ilimitadas', enterprise: 'Ilimitadas' },
                    { name: 'Portal de pacientes', starter: 'Básico', pro: 'Completo', enterprise: 'White-label' },
                    { name: 'Recordatorios WhatsApp/SMS', starter: '✓', pro: '✓', enterprise: '✓' },
                  ]},
                  { category: 'Prevención & CDS', features: [
                    { name: 'Hub de Prevención Longitudinal', starter: '—', pro: '✓', enterprise: '✓' },
                    { name: 'Screening Triggers automatizados', starter: '—', pro: '15+ protocolos', enterprise: 'Personalizados' },
                    { name: 'Monitoreo inteligente de labs', starter: '—', pro: '✓', enterprise: '✓' },
                    { name: 'Cálculo de riesgo (ASCVD, FRAX)', starter: '—', pro: '✓', enterprise: '✓' },
                  ]},
                  { category: 'Colaboración & Equipo', features: [
                    { name: 'Usuarios', starter: '1', pro: 'Hasta 10', enterprise: 'Ilimitados' },
                    { name: 'Multi-sitio', starter: '—', pro: '—', enterprise: '✓' },
                    { name: 'Roles y permisos', starter: '—', pro: '✓', enterprise: 'Avanzados' },
                  ]},
                  { category: 'Soporte & Seguridad', features: [
                    { name: 'Soporte', starter: 'Email 48h', pro: 'Prioritario 12h', enterprise: '24/7 <2h' },
                    { name: 'HIPAA/LGPD compliance', starter: '✓', pro: '✓', enterprise: '✓' },
                    { name: 'SSO (Single Sign-On)', starter: '—', pro: '—', enterprise: '✓' },
                    { name: 'SLA uptime garantizado', starter: '—', pro: '—', enterprise: '99.9%' },
                  ]},
                ].map((section, sIdx) => (
                  <React.Fragment key={sIdx}>
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="p-4 font-bold text-gray-900 text-xs uppercase tracking-wider">
                        {section.category}
                      </td>
                    </tr>
                    {section.features.map((feature, fIdx) => (
                      <tr key={fIdx} className="border-b border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="p-4 text-gray-700">{feature.name}</td>
                        <td className="p-4 text-center text-gray-600">{feature.starter}</td>
                        <td className="p-4 text-center text-[#00FF88] font-semibold">{feature.pro}</td>
                        <td className="p-4 text-center text-gray-600">{feature.enterprise}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Money-Back Guarantee */}
          <div className="mt-16 max-w-3xl mx-auto rounded-2xl p-8 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 border-2 border-blue-200 dark:border-blue-800/30">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-shrink-0 text-5xl">🛡️</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Garantía de Satisfacción 100%
                </h3>
                <p className="text-lg text-gray-700 mb-4">
                  Si no ahorras al menos <span className="font-bold text-gray-900">2 horas/día</span> en el primer mes, 
                  te devolvemos tu dinero. <span className="font-bold">Sin preguntas.</span>
                </p>
                <div className="flex flex-wrap gap-4 text-sm font-semibold text-gray-600">
                  <span className="flex items-center gap-2">
                    <span className="text-[#00FF88]">✓</span> 30 días de prueba gratis
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[#00FF88]">✓</span> Sin compromiso
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[#00FF88]">✓</span> Cancela cuando quieras
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[#00FF88]">✓</span> Tu data es tuya
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FINAL CTA */}
      <section id="demo" className="py-16 px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto max-w-3xl text-center">
          
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900">
            Inteligencia artificial convirtiéndose en realidad en tus tareas diarias
          </h2>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Solo Holi Labs une instalación simple, certificaciones de seguridad y una experiencia de uso increíble. Todo sin sobrecargar tu equipo técnico.
          </p>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg mx-auto mb-12">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.signup.placeholder}
                required
                className="flex-1 px-6 py-4 rounded-lg bg-white border-2 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="text-white font-semibold px-8 py-4 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                style={{ backgroundColor: '#014751' }}
                onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {isSubmitting ? 'Enviando...' : 'Agende uma demo'}
              </button>
            </div>
            
            {/* Invite Code Toggle */}
            {!showInviteField && (
              <button
                type="button"
                onClick={() => setShowInviteField(true)}
                className="text-sm text-gray-600 hover:opacity-80 transition-colors text-center"
              >
                ¿Tienes un código de invitación? Click aquí
              </button>
            )}
            
            {/* Invite Code Field */}
            {showInviteField && (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Código de invitación (opcional)"
                  className="flex-1 px-6 py-3 rounded-lg bg-white border-2 border-yellow-300 text-gray-900 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteField(false);
                    setInviteCode('');
                  }}
                  className="px-4 py-3 text-sm text-gray-600 hover:text-red-500 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
            
            {message && (
              <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}
          </form>

          {/* Trust Signals */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium text-gray-600">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Setup en 1 día
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Migración incluida
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Soporte 24/7
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Sin compromiso
            </span>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 px-6 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto max-w-7xl">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            
            {/* Column 1 */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">Producto</h4>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li><a href="#plataforma" className="hover:opacity-80 transition-colors">Plataforma</a></li>
                <li><a href="#precios" className="hover:opacity-80 transition-colors">Precios</a></li>
                <li><a href="#casos" className="hover:opacity-80 transition-colors">Casos de Uso</a></li>
                <li><a href="#demo" className="hover:opacity-80 transition-colors">Demo</a></li>
              </ul>
            </div>

            {/* Column 2 */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">Empresa</h4>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li><a href="/about" className="hover:opacity-80 transition-colors">Sobre Nosotros</a></li>
                <li><a href="/blog" className="hover:opacity-80 transition-colors">Blog</a></li>
                <li><a href="/careers" className="hover:opacity-80 transition-colors">Carreras</a></li>
                <li><a href="/contact" className="hover:opacity-80 transition-colors">Contacto</a></li>
              </ul>
            </div>

            {/* Column 3 */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">Legal</h4>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li><a href="/terms" className="hover:opacity-80 transition-colors">Términos</a></li>
                <li><a href="/privacy" className="hover:opacity-80 transition-colors">Privacidad</a></li>
                <li><a href="/hipaa" className="hover:opacity-80 transition-colors">HIPAA</a></li>
                <li><a href="/security" className="hover:opacity-80 transition-colors">Seguridad</a></li>
              </ul>
            </div>

            {/* Column 4 */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">Contacto</h4>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li><a href="mailto:admin@holilabs.xyz" className="hover:opacity-80 transition-colors">admin@holilabs.xyz</a></li>
                <li><a href="https://wa.me/525555555555" className="hover:opacity-80 transition-colors">WhatsApp</a></li>
              </ul>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-500">© 2025 Holi Labs. Todos los derechos reservados.</div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700">HIPAA</span>
              <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700">LGPD</span>
              <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700">ISO 27269</span>
            </div>
          </div>

        </div>
      </footer>
      </div>
    </>
  );
}