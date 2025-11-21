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
          text: 'SUCCESS → Check email for instant access'
        });
        setEmail('');

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00ff88', '#00cc6a', '#00aa55']
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'ERROR → Retry' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'CONNECTION FAILED → Check network' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* HUD NAVIGATION */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="container mx-auto px-6">
          <nav className="flex items-center justify-between h-16">
            {/* Logo Section */}
            <Link href="/" className="flex items-center space-x-3 group">
              <Image
                src="/logos/Logo 1_Dark.svg"
                alt="Holi Labs"
                width={32}
                height={32}
                style={{ width: 'auto', height: '32px' }}
                className="transition-transform group-hover:scale-110 invert"
              />
              <div className="flex items-center space-x-2">
                <span className="font-mono text-lg font-bold">HOLI_LABS</span>
                <span className="text-electric text-xs font-mono px-2 py-0.5 border border-electric/30 bg-electric/10">
                  BETA
                </span>
              </div>
            </Link>

            {/* HUD Links */}
            <div className="hidden md:flex items-center divide-x divide-white/10">
              <Link
                href="#access"
                className="px-6 py-2 font-mono text-sm text-white/70 hover:text-electric transition"
              >
                [ACCESS]
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-2 font-mono text-sm text-white/70 hover:text-electric transition"
              >
                [PROVIDER]
              </Link>
              <Link
                href="/portal/dashboard"
                className="px-6 py-2 font-mono text-sm text-white/70 hover:text-electric transition"
              >
                [PATIENT]
              </Link>
            </div>

            {/* CTA */}
            <Link
              href="#access"
              className="bg-electric text-black px-6 py-2 font-mono text-sm font-bold hover:glow-green transition"
            >
              CONNECT →
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 px-6 min-h-screen flex items-center">
        <div className="container mx-auto max-w-7xl">
          <div className="space-y-8">
            {/* Category Label */}
            <div className="inline-flex items-center space-x-2 border border-white/20 px-4 py-2 glass">
              <div className="w-2 h-2 bg-electric animate-pulse-glow rounded-full"></div>
              <span className="font-mono text-xs text-white/60 uppercase tracking-wider">
                MEDICAL_INTELLIGENCE_PLATFORM
              </span>
            </div>

            {/* Hero Headline - Brutalist Stacked */}
            <h1 className="text-7xl md:text-9xl font-bold leading-[0.9] tracking-tight">
              ALL_YOUR
              <br />
              <span className="text-electric">CLINICAL_</span>
              <br />
              WORK<span className="text-electric">.</span>
              <br />
              AUTOMATED<span className="text-electric">.</span>
            </h1>

            {/* Value Proposition */}
            <p className="text-xl md:text-2xl text-white/60 font-mono max-w-2xl leading-relaxed">
              10+ hours saved weekly → Zero administrative friction → Ship or die
            </p>

            {/* CTA Row */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a
                href="#access"
                className="inline-flex items-center justify-center bg-electric text-black px-8 py-4 font-mono font-bold hover:glow-green-strong transition group"
              >
                START_FREE_TRIAL
                <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
              </a>
              <a
                href="#stats"
                className="inline-flex items-center justify-center glass border border-white/20 text-white px-8 py-4 font-mono font-bold hover:border-electric/50 transition"
              >
                [VIEW_METRICS]
              </a>
            </div>

            {/* Trust Signal */}
            <div className="flex flex-wrap items-center gap-6 pt-8 text-sm font-mono text-white/40">
              <span>50+ PRACTICES</span>
              <span className="text-white/20">|</span>
              <span>HIPAA_COMPLIANT</span>
              <span className="text-white/20">|</span>
              <span>48H_DEPLOY</span>
            </div>
          </div>
        </div>

        {/* Decorative Grid Lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      </section>

      {/* STATS SECTION */}
      <section id="stats" className="py-20 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass p-8 border border-white/10 group hover:border-electric/50 transition">
              <div className="text-6xl font-bold text-electric font-mono mb-4">10+</div>
              <div className="text-white/60 font-mono text-sm uppercase tracking-wider">Hours Saved Weekly</div>
            </div>
            <div className="glass p-8 border border-white/10 group hover:border-electric/50 transition">
              <div className="text-6xl font-bold text-electric font-mono mb-4">48H</div>
              <div className="text-white/60 font-mono text-sm uppercase tracking-wider">Deployment Time</div>
            </div>
            <div className="glass p-8 border border-white/10 group hover:border-electric/50 transition">
              <div className="text-6xl font-bold text-electric font-mono mb-4">50+</div>
              <div className="text-white/60 font-mono text-sm uppercase tracking-wider">Medical Practices</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-4xl md:text-6xl font-bold mb-12 font-mono">
            CORE_SYSTEMS<span className="text-electric">.</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '⚡', title: 'INSTANT_DEPLOY', desc: '48h setup → No painful onboarding' },
              { icon: '🔒', title: 'SECURITY_FIRST', desc: 'HIPAA/GDPR/LGPD → Sleep better' },
              { icon: '☁️', title: 'OFFLINE_MODE', desc: 'Work anywhere → Zero blockers' }
            ].map((feature, i) => (
              <div key={i} className="glass p-6 border border-white/10 hover:border-electric/50 transition group">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold font-mono mb-2 group-hover:text-electric transition">
                  {feature.title}
                </h3>
                <p className="text-white/60 text-sm font-mono leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BETA ACCESS FORM */}
      <section id="access" className="py-20 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-2xl">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-5xl md:text-7xl font-bold font-mono">
                GET_<span className="text-electric">ACCESS</span>
              </h2>
              <p className="text-white/60 font-mono text-lg">
                Join 50+ practices → Save 10+ hrs/week → Special BETA pricing
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="YOUR_EMAIL@DOMAIN.COM"
                required
                className="w-full px-6 py-4 bg-black border border-white/20 text-white font-mono placeholder:text-white/30 focus:border-electric focus:outline-none transition"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-electric text-black px-8 py-4 font-mono font-bold hover:glow-green-strong transition disabled:opacity-50"
              >
                {isSubmitting ? 'PROCESSING...' : 'INSTANT_ACCESS →'}
              </button>

              {message && (
                <div className={`p-4 border font-mono text-sm ${
                  message.type === 'success'
                    ? 'bg-electric/10 border-electric text-electric'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {message.text}
                </div>
              )}
            </form>

            <p className="text-center text-white/40 font-mono text-xs uppercase tracking-wider">
              No credit card → Cancel anytime → HIPAA compliant
            </p>
          </div>
        </div>
      </section>

      {/* FLOATING CONTACT */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <a
          href="https://wa.me/5511974487888?text=BETA%20Access%20Request"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative"
        >
          <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center hover:glow-green transition">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
        </a>

        <a
          href="mailto:support@holilabs.xyz"
          className="group relative"
        >
          <div className="w-12 h-12 glass-strong border border-white/20 rounded-full flex items-center justify-center hover:border-electric transition">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </a>
      </div>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <Image
                src="/logos/Logo 1_Dark.svg"
                alt="Holi Labs"
                width={24}
                height={24}
                style={{ width: 'auto', height: '24px' }}
                className="invert"
              />
              <span className="font-mono text-sm">HOLI_LABS</span>
            </div>

            <div className="flex gap-6 font-mono text-xs text-white/40">
              <Link href="/dashboard" className="hover:text-electric transition">DASHBOARD</Link>
              <Link href="/portal/dashboard" className="hover:text-electric transition">PORTAL</Link>
            </div>
          </div>

          <div className="mt-8 text-center font-mono text-xs text-white/30">
            © 2024 HOLI_LABS → HIPAA/GDPR/LGPD_COMPLIANT
          </div>
        </div>
      </footer>
    </div>
  );
}
