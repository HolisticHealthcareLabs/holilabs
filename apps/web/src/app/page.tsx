'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { theme, toggleTheme } = useTheme();

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
        setMessage({ type: 'success', text: '¡Éxito! Revisa tu email para acceso instantáneo' });
        setEmail('');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: [BRAND_GREEN_HEX, '#00cc6a', '#00aa55'],
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
    <div className="min-h-screen font-sans tracking-tight bg-white text-gray-900 dark:bg-[#0A0A0A] dark:text-white transition-colors duration-300 overflow-x-hidden selection:bg-[#00FF88]/30">
      
      {/* GLOBAL BACKGROUND GLOW (Dark Mode Only) */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-700">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-[#00FF88]/10 via-transparent to-transparent blur-[120px]" />
      </div>

      {/* NAVIGATION */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-gray-200/50 dark:border-white/5 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl">
        <nav className="container mx-auto px-6 py-3 flex items-center justify-between">
          
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-10 h-10 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logos/Logo 1_Light.svg"
                alt="Holi Labs"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span
              className="text-xl tracking-tight relative"
              style={{
                fontWeight: 600,
                letterSpacing: '-0.02em',
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 25%, #ffffff 50%, #c0c0c0 75%, #ffffff 100%)'
                  : 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 25%, #1a1a1a 50%, #2a2a2a 75%, #1a1a1a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: theme === 'dark' ? 'drop-shadow(1px 1px 2px rgba(0,0,0,0.2))' : 'drop-shadow(0.5px 0.5px 1px rgba(0,0,0,0.1))',
              }}
            >
              Holi Labs
            </span>
          </Link>

          {/* DESKTOP LINKS */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
            {['El Problema', 'Solución', 'Plataforma'].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase().replace(' ', '')}`}
                className="text-gray-600 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center">
            <a
              href="#acceso"
              className="bg-[linear-gradient(110deg,#00FF88,45%,#b0ffda,55%,#00FF88)] bg-[length:200%_100%] animate-shimmer-fast text-black font-bold text-sm px-6 py-2.5 rounded-full hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] active:scale-95 transition-all duration-300"
            >
              Agendar Demo
            </a>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-32 pb-20 px-6 min-h-[90vh] flex items-center justify-center">
        <div className="container mx-auto max-w-5xl text-center space-y-10">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF88]"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-[#00FF88]">
              IA Médica para Latinoamérica
            </span>
          </div>

          {/* Headlines */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[1.1] text-gray-900 dark:text-white">
            Moderniza tu clínica.<br />
            <span 
              className="text-[#00FF88]"
              style={{ textShadow: theme === 'dark' ? '0 0 30px rgba(0, 255, 136, 0.2)' : 'none' }}
            >
              Sin papeleo.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 dark:text-white/70 max-w-2xl mx-auto leading-relaxed text-balance">
            Recupera tu vida. <span className="font-bold text-gray-900 dark:text-white">Holi Labs</span> automatiza tu práctica, elimina el <span className="font-bold text-gray-900 dark:text-white">80% del papeleo</span> y protege tus ingresos sin que muevas un dedo.
          </p>

          {/* CTA Group */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <a
              href="#acceso"
              className="flex items-center justify-center bg-[linear-gradient(110deg,#00FF88,45%,#b0ffda,55%,#00FF88)] bg-[length:200%_100%] animate-shimmer-fast text-black px-10 py-5 rounded-full text-lg font-bold hover:shadow-[0_0_30px_rgba(0,255,136,0.4)] active:scale-95 transition-all duration-300 group shadow-xl shadow-[#00FF88]/20"
            >
              Agendar Demo
              <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
            </a>
            {/* Ghost Glass Button (Unified Style) */}
            <a
              href="#solucion"
              className="flex items-center justify-center px-10 py-5 rounded-full text-lg font-semibold 
                bg-gray-100 dark:bg-white/5 
                border border-gray-200 dark:border-white/10 
                text-gray-900 dark:text-white 
                hover:bg-gray-200 dark:hover:bg-white/10 
                hover:border-gray-300 dark:hover:border-[#00FF88]/30 
                active:scale-95 transition-all duration-300"
            >
              Ver Plataforma
            </a>
          </div>

          {/* Micro Copy */}
          <p className="text-xs font-medium text-gray-500 dark:text-white/50 pt-2 tracking-wide uppercase">
            Atención Real • Tu Data es Tuya
          </p>

          {/* Metrics */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 pt-12 border-t border-gray-200 dark:border-white/5 w-full max-w-3xl mx-auto">
            {[
              { val: '50+', label: 'Clínicas' },
              { val: '100%', label: 'HIPAA / LGPD' },
              { val: '24/7', label: 'Sin Cláusulas' }
            ].map((metric) => (
              <div key={metric.label} className="flex flex-col items-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{metric.val}</span>
                <span className="text-sm font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">{metric.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION - IDENTITY REFACTOR */}
      <section id="problema" className="py-24 px-6 bg-gray-50 dark:bg-[#0F1214] border-t border-gray-200 dark:border-white/5">
        <div className="container mx-auto max-w-4xl text-center flex flex-col gap-2">
          {/* Line 1: Context */}
          <span className="text-2xl md:text-4xl text-gray-500 dark:text-white/60 font-medium tracking-tight">
            Te volviste doctor para
          </span>
          
          {/* Line 2: IDENTITY (Big & Glowing) */}
          <h2 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00FF88] via-[#b0ffda] to-[#00cc6a] uppercase tracking-tighter leading-[0.9] py-4 drop-shadow-[0_0_25px_rgba(0,255,136,0.3)] animate-shimmer bg-[length:200%_auto]">
            SALVAR VIDAS
          </h2>

          {/* Line 3: Conflict */}
          <span className="text-2xl md:text-4xl text-gray-900 dark:text-white font-bold tracking-tight">
            no para perder el tiempo.
          </span>

          {/* Body Text */}
          <p className="mt-10 text-xl md:text-2xl text-gray-600 dark:text-white/70 max-w-xl mx-auto leading-relaxed text-balance">
            Cada día, un <span className="font-bold text-gray-900 dark:text-white">40% de tu tiempo</span> se pierde en burocracia digital. El cambio ya no es opcional: es tu bienestar.
          </p>
        </div>
      </section>


      {/* PLATFORM (BENTO GRID) */}
      <section id="plataforma" className="py-24 px-6 bg-white dark:bg-[#0A0A0A] border-t border-gray-200 dark:border-white/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold mb-4 text-gray-900 dark:text-white tracking-tighter">
              La Plataforma Integral que tu Clínica Merece.
            </h2>
            <p className="text-xl text-gray-600 dark:text-white/60">
              Todo lo esencial para operar con precisión y velocidad.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            
            {/* CARD 1: NOTES (With Waveform Filler) */}
            <div className="md:row-span-2 group relative overflow-hidden rounded-3xl p-10 
              bg-gray-50 dark:bg-[#0F1214] border border-gray-200 dark:border-white/5
              hover:border-[#00FF88]/50 hover:shadow-[0_10px_40px_-10px_rgba(0,255,136,0.15)] 
              transition-all duration-300 hover:scale-[1.01]">
              
              <div className="flex flex-col justify-between h-full relative z-10">
                <div className="space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#00FF88]/10 flex items-center justify-center text-[#00FF88]">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                       <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Notas Clínicas Automáticas</h3>
                  <p className="text-lg text-gray-600 dark:text-white/70">
                    Scribe IA en español/portugués. De consulta a nota perfecta, en segundos.
                  </p>
                </div>

                {/* VISUAL FILLER: Abstract Waveform */}
                <div className="flex items-end justify-center gap-1 h-16 opacity-30 my-4">
                   {[40, 70, 40, 90, 60, 30, 80, 50, 90, 40, 60, 70, 40, 30].map((h, i) => (
                      <div key={i} className="w-2 bg-[#00FF88] rounded-full animate-pulse" style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }} />
                   ))}
                </div>

                <div className="text-sm font-mono text-gray-500 dark:text-white/50 pt-4 border-t border-gray-200 dark:border-white/5">
                  <span className="text-[#00FF88] font-bold">↗ 98%</span> precisión validada
                </div>
              </div>
            </div>

            {/* CARD 2: WHATSAPP */}
            <div className="group relative overflow-hidden rounded-3xl p-10 
              bg-gray-50 dark:bg-[#0F1214] border border-gray-200 dark:border-white/5
              hover:border-[#00FF88]/50 hover:shadow-[0_10px_40px_-10px_rgba(0,255,136,0.15)] 
              transition-all duration-300 hover:scale-[1.01]">
               <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                       </div>
                       <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/60">Agenda Inteligente</span>
                    </div>
                    <div className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white">-40%</div>
                    <p className="text-gray-600 dark:text-white/70">Ausentismo eliminado.</p>
                  </div>
               </div>
            </div>

            {/* CARD 3: COST (With Emoji Watermark) */}
            <div className="group relative overflow-hidden rounded-3xl p-10 
              bg-gray-50 dark:bg-[#0F1214] border border-gray-200 dark:border-white/5
              hover:border-[#00FF88]/50 hover:shadow-[0_10px_40px_-10px_rgba(0,255,136,0.15)] 
              transition-all duration-300 hover:scale-[1.01] flex flex-col justify-center">
                
                {/* Badge */}
                <div className="absolute top-6 right-6 bg-[#00FF88] text-black text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase shadow-lg shadow-brand-green/20">
                  Founder Pricing
                </div>

                {/* Background Watermark Emoji */}
                <div className="absolute -right-4 -bottom-8 text-9xl opacity-10 dark:opacity-5 rotate-12 select-none pointer-events-none grayscale">
                  📉
                </div>

                <div className="relative z-10">
                   <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/60 mb-2 block">Costo Eficiente</span>
                   <div className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-2">10x</div>
                   <p className="text-lg text-gray-600 dark:text-white/70">
                     Más económico que sistemas heredados.
                     <br />
                     <span className="text-gray-900 dark:text-white font-bold">$25 USD/mes.</span>
                   </p>
                </div>
            </div>

            {/* CARD 4: SECURITY (Refactored Horizontal Banner) */}
            <div className="md:col-span-2 rounded-2xl p-6 md:p-8 
               bg-[#00FF88]/5 border border-[#00FF88]/20 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#00FF88]/20 flex items-center justify-center text-[#00FF88]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-1">
                     Seguridad Nivel Hospital
                  </h3>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm font-medium text-gray-600 dark:text-white/70">
                     <span className="flex items-center gap-1">✅ HIPAA</span>
                     <span className="flex items-center gap-1">✅ LGPD/GDPR</span>
                     <span className="flex items-center gap-1">✅ Encriptación E2E</span>
                  </div>
                </div>
            </div>

          </div>
        </div>
      </section>

      {/* SOLUTION LIST */}
      <section id="solucion" className="py-24 px-6 bg-white dark:bg-[#0A0A0A] border-t border-gray-200 dark:border-white/5">
        <div className="container mx-auto max-w-6xl">
           <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
              Plataforma Completa, No Solo Scribe
            </h2>
            <p className="text-xl text-gray-600 dark:text-white/60">
               Competencia: $200 USD/mes solo por notas. <br className="md:hidden"/> Holi Labs: Todo el EHR por <span className="text-gray-900 dark:text-white font-bold">$25 USD/mes.</span>
            </p>
           </div>
           
           <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: '⚡', title: 'IA Médica', desc: 'Scribe con IA, alertas de interacciones, diagnóstico asistido.' },
                { icon: '📱', title: 'Portal Pacientes', desc: 'Acceso a expedientes, citas en línea, historial completo.' },
                { icon: '💰', title: 'Facturación', desc: 'Facturación automática, recordatorios de pago, reportes.' },
                { icon: '📋', title: 'Recetas Digitales', desc: 'E-prescriptions con firma blockchain y envío directo.' },
                { icon: '📅', title: 'Agenda Inteligente', desc: 'Sync con Google/Outlook, detección de conflictos.' },
                { icon: '🌐', title: 'Modo Offline', desc: 'Tu clínica no se detiene si falla el WiFi. Sync automático.' },
              ].map((feat, i) => (
                <div key={i} className="group p-8 rounded-2xl bg-gray-50 dark:bg-[#0F1214] border border-gray-200 dark:border-white/5 hover:border-[#00FF88]/30 transition-all duration-300">
                   <div className="text-4xl mb-4 grayscale group-hover:grayscale-0 transition-all">{feat.icon}</div>
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feat.title}</h3>
                   <p className="text-gray-600 dark:text-white/60 text-sm leading-relaxed">{feat.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* BETA FORM (NEW IDENTITY MARKETING) */}
      <section id="acceso" className="py-24 px-6 bg-gray-50 dark:bg-[#0F1214] border-t border-gray-200 dark:border-white/5">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-4 text-gray-900 dark:text-white tracking-tighter">
            Vuelve a Enamorarte de la Medicina.
          </h2>
          <p className="text-lg text-gray-600 dark:text-white/60 mb-8">
             Deja que Holi maneje la burocracia. Tú recupera el control de tu consultorio y de tu tiempo libre.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 group focus-within:ring-4 focus-within:ring-[#00FF88]/20 rounded-full transition-all">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.email@clinica.com"
                required
                className="flex-1 px-6 py-4 rounded-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:border-[#00FF88] focus:ring-0 outline-none transition"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#00FF88] text-black font-bold px-8 py-4 rounded-full hover:bg-[#00e97a] hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? '...' : 'Acceso Gratis'}
              </button>
            </div>
            {message && (
              <div className={`p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-[#00FF88]/10 text-green-800 dark:text-[#00FF88]' : 'bg-red-100 text-red-600'}`}>
                {message.text}
              </div>
            )}
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mt-4">
              Sin Contratos Forzosos • Cancela con un Click • Tu Data es Tuya
            </p>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 bg-white dark:bg-black border-t border-gray-200 dark:border-white/10">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2.5 opacity-80">
              <Image src="/logos/Logo 1_Light.svg" alt="Logo" width={30} height={30} />
              <span 
                className="text-sm tracking-tight uppercase" 
                style={{
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: theme === 'dark' ? '#ffffff' : '#1a1a1a',
                }}
              >
                Holi Labs
              </span>
           </div>
           <div className="text-xs text-gray-500 dark:text-white/40">
              © 2024 Holi Labs • HIPAA/GDPR/LGPD Compliant
           </div>
        </div>
      </footer>
    </div>
  );
}