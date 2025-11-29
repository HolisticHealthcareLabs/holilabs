'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

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

// Pricing Tier Type
interface PricingTier {
  name: string;
  price: string;
  originalPrice?: string;
  priceDetails: string;
  description: string;
  recommended?: boolean;
  badge?: string;
  features: {
    category: string;
    items: Array<{
      name: string;
      included: boolean;
      tooltip?: string;
    }>;
  }[];
  cta: {
    text: string;
    href: string;
  };
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    price: '$49',
    originalPrice: '$99',
    priceDetails: 'por doctor/mes',
    description: 'Para médicos individuales que quieren empezar con IA médica',
    badge: 'Founder Pricing',
    features: [
      {
        category: 'Documentación Clínica',
        items: [
          { name: '50 notas SOAP/mes con IA', included: true },
          { name: 'Transcripción en tiempo real (Deepgram)', included: true },
          { name: 'Notas en español/portugués', included: true },
          { name: 'Exportar a PDF', included: true },
        ],
      },
      {
        category: 'EHR Básico',
        items: [
          { name: 'Registro de pacientes', included: true },
          { name: 'Historia clínica digital', included: true },
          { name: 'Recetas digitales', included: true },
          { name: 'Agenda de citas', included: true },
        ],
      },
      {
        category: 'Alertas de Prevención',
        items: [
          { name: 'Alertas preventivas automáticas', included: false, tooltip: 'Solo en Professional' },
          { name: 'Screening cáncer (USPSTF Grade A)', included: false },
          { name: 'Panel lipídico completo', included: false },
        ],
      },
      {
        category: 'Seguridad & Soporte',
        items: [
          { name: 'HIPAA/LGPD compliant', included: true },
          { name: 'Encriptación E2E', included: true },
          { name: 'Soporte por email (48h)', included: true },
          { name: 'Integraciones EHR (Epic/Cerner)', included: false },
        ],
      },
    ],
    cta: {
      text: 'Empezar Gratis 14 Días',
      href: '/signup?plan=starter',
    },
  },
  {
    name: 'Professional',
    price: '$149',
    originalPrice: '$299',
    priceDetails: 'por doctor/mes',
    description: 'Para clínicas serias sobre medicina preventiva basada en evidencia',
    recommended: true,
    badge: '73% Margin',
    features: [
      {
        category: 'Documentación Clínica',
        items: [
          { name: 'Notas SOAP ilimitadas con IA', included: true },
          { name: 'Transcripción en tiempo real (Deepgram)', included: true },
          { name: 'Notas en español/portugués/inglés', included: true },
          { name: 'Plantillas personalizadas', included: true },
          { name: 'Confidence scoring (prevención notas <60%)', included: true },
        ],
      },
      {
        category: 'EHR Completo',
        items: [
          { name: 'Todo en Starter', included: true },
          { name: 'Portal del paciente', included: true },
          { name: 'Facturación automática', included: true },
          { name: 'Lab results tracking', included: true },
          { name: 'Interacciones medicamentosas', included: true },
        ],
      },
      {
        category: 'Alertas de Prevención ⭐',
        items: [
          { name: 'Alertas preventivas automáticas (USPSTF A+B)', included: true },
          { name: 'Screening cáncer colorectal (4 opciones)', included: true },
          { name: 'Screening cáncer cervical (HPV co-testing)', included: true },
          { name: 'Panel lipídico completo (LDL/HDL/Trig/Total)', included: true },
          { name: 'Diabetes/HbA1c monitoring', included: true },
        ],
      },
      {
        category: 'Seguridad & Soporte',
        items: [
          { name: 'HIPAA/LGPD/GDPR compliant', included: true },
          { name: 'Encriptación E2E + Differential Privacy', included: true },
          { name: 'Soporte prioritario (12h)', included: true },
          { name: 'Integraciones EHR (Epic/Cerner)', included: false },
          { name: 'BAA (Business Associate Agreement)', included: false },
        ],
      },
    ],
    cta: {
      text: 'Empezar Gratis 14 Días',
      href: '/signup?plan=professional',
    },
  },
  {
    name: 'Enterprise',
    price: '$99',
    priceDetails: 'por doctor/mes (mín. 50 doctores)',
    description: 'Para hospitales y organizaciones con necesidades empresariales',
    badge: 'Custom SLA',
    features: [
      {
        category: 'Todo en Professional +',
        items: [
          { name: 'Notas SOAP ilimitadas para toda la organización', included: true },
          { name: 'Integración EHR personalizada (Epic/Cerner)', included: true },
          { name: 'SSO (Google Workspace, Okta, Azure AD)', included: true },
          { name: 'BAA (Business Associate Agreement)', included: true },
        ],
      },
      {
        category: 'Analytics Empresarial',
        items: [
          { name: 'Dashboard de resultados (Phase 3)', included: true },
          { name: 'Benchmarking vs. organizaciones similares', included: true },
          { name: 'Reportes personalizados para CFO/CMO', included: true },
          { name: 'API access para integraciones custom', included: true },
        ],
      },
      {
        category: 'Soporte Enterprise',
        items: [
          { name: 'Account manager dedicado', included: true },
          { name: 'Soporte 24/7 (1h SLA)', included: true },
          { name: '99.9% uptime SLA', included: true },
          { name: 'Onboarding presencial (opcional)', included: true },
          { name: 'Training mensual para staff', included: true },
        ],
      },
    ],
    cta: {
      text: 'Contactar Ventas',
      href: '/contact?plan=enterprise',
    },
  },
];

// FAQ Data
const faqs = [
  {
    question: '¿Qué incluye la prueba gratuita de 14 días?',
    answer:
      'Acceso completo al tier que elijas (Starter o Professional) sin límites. No se requiere tarjeta de crédito. Cancela en cualquier momento sin penalización.',
  },
  {
    question: '¿Qué pasa si supero el límite de 50 notas/mes en Starter?',
    answer:
      'Te ofreceremos upgrade automático a Professional. Nunca te bloquearemos en medio de una consulta con un paciente. Tu atención clínica es nuestra prioridad.',
  },
  {
    question: '¿Cómo funciona el pricing de Enterprise?',
    answer:
      'Enterprise requiere mínimo 50 doctores a $99/mes cada uno ($4,950/mes total). Incluye integración EHR personalizada, SSO, BAA, y account manager dedicado. Contáctanos para una cotización.',
  },
  {
    question: '¿Puedo cambiar de plan después?',
    answer:
      'Sí, upgrade o downgrade en cualquier momento. El cambio se aplica inmediatamente. Sin contratos anuales forzosos. Sin cláusulas de permanencia.',
  },
  {
    question: '¿Es HoliLabs HIPAA/LGPD compliant?',
    answer:
      'Sí, 100%. Encriptación E2E, auditorías SOC 2 Type II en progreso, differential privacy (ε/δ accounting), y BAA disponible para clientes Enterprise. Tu data es tuya, siempre.',
  },
  {
    question: '¿Qué son las "Alertas de Prevención" en Professional?',
    answer:
      'Nuestro sistema analiza automáticamente cada paciente y genera recordatorios basados en USPSTF Grade A/B (evidencia sólida): screening cáncer colorectal/cervical, panel lipídico completo, diabetes, hipertensión. Reduces trabajo manual y mejoras outcomes.',
  },
  {
    question: '¿Hay descuentos para clínicas pequeñas (5-10 doctores)?',
    answer:
      'Sí. Contáctanos para descuentos por volumen. Ofrecemos 15% off para 5-10 doctores, y 25% off para 10-50 doctores en el plan Professional.',
  },
  {
    question: '¿Puedo usar HoliLabs sin internet?',
    answer:
      'Sí, modo offline disponible en Professional y Enterprise. Sync automático cuando recuperas conexión. Tu clínica no se detiene por WiFi malo.',
  },
];

// --- MAIN PAGE ---
export default function PricingPage() {
  const { theme, toggleTheme } = useTheme();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

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
                background:
                  theme === 'dark'
                    ? 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 25%, #ffffff 50%, #c0c0c0 75%, #ffffff 100%)'
                    : 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 25%, #1a1a1a 50%, #2a2a2a 75%, #1a1a1a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter:
                  theme === 'dark'
                    ? 'drop-shadow(1px 1px 2px rgba(0,0,0,0.2))'
                    : 'drop-shadow(0.5px 0.5px 1px rgba(0,0,0,0.1))',
              }}
            >
              Holi Labs
            </span>
          </Link>

          {/* DESKTOP LINKS */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <Link href="/" className="text-gray-600 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
              Inicio
            </Link>
            <Link href="/#plataforma" className="text-gray-600 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
              Plataforma
            </Link>
            <Link href="/pricing" className="text-black dark:text-white font-bold transition-colors">
              Pricing
            </Link>
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center">
            <a
              href="/signup"
              className="bg-[linear-gradient(110deg,#00FF88,45%,#b0ffda,55%,#00FF88)] bg-[length:200%_100%] animate-shimmer-fast text-black font-bold text-sm px-6 py-2.5 rounded-full hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] active:scale-95 transition-all duration-300"
            >
              Empezar Gratis
            </a>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-32 pb-12 px-6">
        <div className="container mx-auto max-w-5xl text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF88]"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-[#00FF88]">Founder Pricing - 50% Off</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.1] text-gray-900 dark:text-white">
            Pricing Simple.
            <br />
            <span className="text-[#00FF88]" style={{ textShadow: theme === 'dark' ? '0 0 30px rgba(0, 255, 136, 0.2)' : 'none' }}>
              Sin Sorpresas.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 dark:text-white/70 max-w-2xl mx-auto leading-relaxed">
            14 días gratis. Sin tarjeta. Sin contratos. Cancela cuando quieras.
          </p>

          {/* Social Proof */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-6 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00FF88]" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-600 dark:text-white/70">
                <span className="font-bold text-gray-900 dark:text-white">50+ clínicas</span> ya confían
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00FF88]" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-600 dark:text-white/70">
                <span className="font-bold text-gray-900 dark:text-white">100% HIPAA/LGPD</span> compliant
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00FF88]" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-600 dark:text-white/70">
                <span className="font-bold text-gray-900 dark:text-white">$7M+</span> en pérdidas evitadas
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING TIERS */}
      <section className="relative z-10 py-16 px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Pricing Grid */}
          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`group relative rounded-3xl p-8 transition-all duration-300 ${
                  tier.recommended
                    ? 'bg-[#00FF88]/5 border-2 border-[#00FF88] shadow-[0_0_40px_rgba(0,255,136,0.15)] scale-105 md:scale-110 z-10'
                    : 'bg-gray-50 dark:bg-[#0F1214] border border-gray-200 dark:border-white/5 hover:border-[#00FF88]/30 hover:shadow-lg'
                }`}
              >
                {/* Badge */}
                {tier.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-[#00FF88] text-black text-xs font-black tracking-widest px-4 py-1.5 rounded-full uppercase shadow-lg">
                      {tier.badge}
                    </div>
                  </div>
                )}

                {/* Recommended Badge */}
                {tier.recommended && (
                  <div className="absolute -top-4 right-6">
                    <div className="flex items-center gap-1 bg-gradient-to-r from-[#00FF88] to-[#00cc6a] text-black text-xs font-black tracking-wide px-3 py-1.5 rounded-full uppercase shadow-lg">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Recomendado
                    </div>
                  </div>
                )}

                {/* Tier Header */}
                <div className="mb-8 text-center">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{tier.name}</h3>
                  <div className="flex items-end justify-center gap-2 mb-2">
                    {tier.originalPrice && (
                      <span className="text-2xl text-gray-400 dark:text-white/40 line-through">{tier.originalPrice}</span>
                    )}
                    <span className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">{tier.price}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-white/60 mb-3">{tier.priceDetails}</p>
                  <p className="text-sm text-gray-700 dark:text-white/70 leading-relaxed">{tier.description}</p>
                </div>

                {/* CTA Button */}
                <a
                  href={tier.cta.href}
                  className={`block w-full text-center font-bold py-4 px-6 rounded-full transition-all duration-300 mb-8 ${
                    tier.recommended
                      ? 'bg-[linear-gradient(110deg,#00FF88,45%,#b0ffda,55%,#00FF88)] bg-[length:200%_100%] animate-shimmer-fast text-black hover:shadow-[0_0_30px_rgba(0,255,136,0.4)] active:scale-95'
                      : 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 active:scale-95'
                  }`}
                >
                  {tier.cta.text}
                </a>

                {/* Features */}
                <div className="space-y-6">
                  {tier.features.map((category) => (
                    <div key={category.category}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/60 mb-3">
                        {category.category}
                      </h4>
                      <ul className="space-y-2">
                        {category.items.map((item) => (
                          <li key={item.name} className="flex items-start gap-3 text-sm">
                            <span
                              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                                item.included
                                  ? 'bg-[#00FF88]/10 text-[#00FF88]'
                                  : 'bg-gray-200 dark:bg-white/5 text-gray-400 dark:text-white/40'
                              }`}
                            >
                              {item.included ? (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </span>
                            <span
                              className={`${
                                item.included ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-white/50 line-through'
                              }`}
                              title={item.tooltip}
                            >
                              {item.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 dark:text-white/70 mb-4">
              ¿Necesitas más de 50 doctores o integraciones custom?
            </p>
            <a
              href="/contact?plan=enterprise"
              className="inline-block bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white font-semibold px-8 py-3 rounded-full hover:bg-gray-300 dark:hover:bg-white/20 active:scale-95 transition-all"
            >
              Contactar Ventas Enterprise
            </a>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="relative z-10 py-16 px-6 bg-gray-50 dark:bg-[#0F1214] border-y border-gray-200 dark:border-white/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">¿Cómo nos comparamos?</h2>
            <p className="text-xl text-gray-600 dark:text-white/60">HoliLabs vs. Competencia (Nuance DAX, Suki, Abridge)</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 dark:border-white/20">
                  <th className="text-left py-4 px-4 text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-white/60">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 text-sm font-bold uppercase tracking-wider text-[#00FF88]">
                    HoliLabs
                    <br />
                    <span className="text-xs font-normal">$49-149/mes</span>
                  </th>
                  <th className="text-center py-4 px-4 text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-white/60">
                    Competencia
                    <br />
                    <span className="text-xs font-normal">$199-299/mes</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'AI Scribe (SOAP notes)', holi: true, competitor: true },
                  { feature: 'Real-time transcription', holi: true, competitor: false },
                  { feature: 'USPSTF-Grade-A Prevention Alerts', holi: true, competitor: false },
                  { feature: 'Full EHR (no solo notas)', holi: true, competitor: false },
                  { feature: 'Differential Privacy', holi: true, competitor: false },
                  { feature: 'Portal del paciente', holi: true, competitor: false },
                  { feature: 'Facturación automática', holi: true, competitor: false },
                  { feature: 'Modo offline', holi: true, competitor: false },
                  { feature: 'EHR Integration (Epic/Cerner)', holi: 'Enterprise only', competitor: true },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">{row.feature}</td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.holi === 'boolean' ? (
                        row.holi ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00FF88]/10 text-[#00FF88]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-white/5 text-gray-400 dark:text-white/40">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-gray-600 dark:text-white/60">{row.holi}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.competitor === 'boolean' ? (
                        row.competitor ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white/60">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-white/5 text-gray-400 dark:text-white/40">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-gray-600 dark:text-white/60">{row.competitor}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="relative z-10 py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">Preguntas Frecuentes</h2>
            <p className="text-xl text-gray-600 dark:text-white/60">Todo lo que necesitas saber sobre HoliLabs</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="group rounded-2xl bg-gray-50 dark:bg-[#0F1214] border border-gray-200 dark:border-white/5 overflow-hidden transition-all hover:border-[#00FF88]/30"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  <span className="text-lg font-bold text-gray-900 dark:text-white pr-8">{faq.question}</span>
                  <svg
                    className={`w-6 h-6 text-gray-600 dark:text-white/60 flex-shrink-0 transition-transform duration-300 ${
                      openFaqIndex === idx ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaqIndex === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="p-6 pt-0 text-gray-700 dark:text-white/70 leading-relaxed">{faq.answer}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 py-24 px-6 bg-gray-50 dark:bg-[#0F1214] border-t border-gray-200 dark:border-white/5">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-white tracking-tighter">
            Empieza Hoy.
            <br />
            <span className="text-[#00FF88]" style={{ textShadow: theme === 'dark' ? '0 0 30px rgba(0, 255, 136, 0.2)' : 'none' }}>
              Gratis por 14 Días.
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-white/70 mb-10 max-w-xl mx-auto">
            Sin tarjeta. Sin contratos. Sin cláusulas. Cancela cuando quieras. Recupera tu tiempo libre.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/signup?plan=professional"
              className="flex items-center justify-center bg-[linear-gradient(110deg,#00FF88,45%,#b0ffda,55%,#00FF88)] bg-[length:200%_100%] animate-shimmer-fast text-black px-10 py-5 rounded-full text-lg font-bold hover:shadow-[0_0_30px_rgba(0,255,136,0.4)] active:scale-95 transition-all duration-300 group shadow-xl shadow-[#00FF88]/20"
            >
              Empezar Gratis (Professional)
              <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
            </a>
            <a
              href="/contact?plan=enterprise"
              className="flex items-center justify-center px-10 py-5 rounded-full text-lg font-semibold bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-[#00FF88]/30 active:scale-95 transition-all duration-300"
            >
              Contactar Ventas
            </a>
          </div>

          {/* Trust Signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 pt-8 border-t border-gray-200 dark:border-white/5 text-sm text-gray-600 dark:text-white/60">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00FF88]" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Encriptación E2E</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00FF88]" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>HIPAA/LGPD Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00FF88]" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Soporte 24/7</span>
            </div>
          </div>
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
          <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-white/60">
            <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Privacidad
            </Link>
            <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Términos
            </Link>
            <Link href="/contact" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Contacto
            </Link>
          </div>
          <div className="text-xs text-gray-500 dark:text-white/40">© 2024 Holi Labs • HIPAA/GDPR/LGPD Compliant</div>
        </div>
      </footer>
    </div>
  );
}
