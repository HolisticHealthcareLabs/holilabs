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
          text: 'Success! Check your email for instant access'
        });
        setEmail('');

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00ff88', '#00cc6a', '#00aa55']
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error. Please retry' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Connection failed. Check network' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black relative">
      {/* COMMAND ISLAND NAVIGATION */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-6">
        <nav className="command-island rounded-full px-6 py-3 flex items-center justify-between">
          {/* Brand (Left) */}
          <Link href="/" className="flex items-center space-x-2 group">
            <Image
              src="/logos/Logo 1_Dark.svg"
              alt="Holi Labs"
              width={28}
              height={28}
              style={{ width: 'auto', height: '28px' }}
              className="transition-transform group-hover:scale-110"
            />
            <span className="font-bold text-base tracking-tight">HOLI LABS</span>
          </Link>

          {/* Links (Center) */}
          <div className="hidden md:flex items-center space-x-8 font-medium text-sm">
            <Link href="#features" className="text-gray-600 hover:text-black transition">
              Features
            </Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-black transition">
              Provider
            </Link>
            <Link href="/portal/dashboard" className="text-gray-600 hover:text-black transition">
              Patient
            </Link>
          </div>

          {/* Connect Action (Right) */}
          <a
            href="#access"
            className="bg-electric text-black px-5 py-2 rounded-full font-semibold text-sm hover:glow-green transition"
          >
            Connect
          </a>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-40 pb-20 px-6 min-h-screen flex items-center">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-6 text-center">
            {/* Platform Label */}
            <div className="inline-flex items-center space-x-2 border border-black/10 px-4 py-1.5 rounded-full bg-gray-50/50">
              <div className="w-1.5 h-1.5 bg-electric rounded-full animate-pulse-metric"></div>
              <span className="metric-display text-xs uppercase tracking-wider">
                Medical Intelligence Platform
              </span>
            </div>

            {/* Massive Headline */}
            <h1 className="text-7xl md:text-9xl font-bold leading-[0.9] tracking-tighter">
              The Future of
              <br />
              <span className="text-electric">Clinical</span> AI
            </h1>

            {/* Value Proposition */}
            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto">
              Purpose-built infrastructure to power the next generation of healthcare applications
            </p>

            {/* CTA Row */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <a
                href="#access"
                className="inline-flex items-center justify-center bg-electric text-black px-8 py-4 rounded-full font-bold hover:glow-green transition group"
              >
                Start Free Trial
                <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center glass-card text-black px-8 py-4 rounded-full font-bold hover:border-black/10 transition"
              >
                View Features
              </a>
            </div>

            {/* Trust Signals */}
            <div className="flex flex-wrap items-center justify-center gap-8 pt-12 text-sm metric-display">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-electric rounded-full"></div>
                <span>50+ Practices</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-electric rounded-full"></div>
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-electric rounded-full"></div>
                <span>48h Deploy</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 PILLARS BENTO GRID */}
      <section id="features" className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pillar 1: Infinite Scalability (2x2 cell) */}
            <div className="md:row-span-2 glass-card p-12 rounded-3xl relative overflow-hidden group hover:border-black/10 transition">
              {/* Abstract Node Graph SVG */}
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" viewBox="0 0 400 400">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="400" height="400" fill="url(#grid)" />
                  <circle cx="100" cy="100" r="30" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="300" cy="100" r="30" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="200" cy="300" r="30" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <line x1="100" y1="100" x2="300" y2="100" stroke="currentColor" strokeWidth="2"/>
                  <line x1="100" y1="100" x2="200" y2="300" stroke="currentColor" strokeWidth="2"/>
                  <line x1="300" y1="100" x2="200" y2="300" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>

              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-electric/10 rounded-2xl flex items-center justify-center mb-6">
                    <svg className="w-6 h-6 text-electric" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-4xl font-bold mb-4">Infinite Scalability</h3>
                  <p className="text-lg text-gray-600">
                    Purpose-built to power the next generation of AI applications. Modular architecture that scales from prototype to production.
                  </p>
                </div>
                <div className="metric-display text-sm pt-6">
                  <span className="text-electric">↗</span> 10x faster deployment
                </div>
              </div>
            </div>

            {/* Pillar 2: Transactions on Testnet (Big Metric) */}
            <div className="glass-card p-12 rounded-3xl hover:border-black/10 transition">
              <div className="metric-display text-xs uppercase tracking-wider mb-4">
                Active Deployments
              </div>
              <div className="text-8xl font-bold text-black mb-4 animate-pulse-metric">
                650M+
              </div>
              <p className="text-gray-600">
                Clinical transactions processed with zero downtime
              </p>
            </div>

            {/* Pillar 3: Active Accounts (Big Metric) */}
            <div className="glass-card p-12 rounded-3xl hover:border-black/10 transition">
              <div className="metric-display text-xs uppercase tracking-wider mb-4">
                Healthcare Providers
              </div>
              <div className="text-8xl font-bold text-black mb-4 animate-pulse-metric">
                22M+
              </div>
              <p className="text-gray-600">
                Verified medical professionals on the platform
              </p>
            </div>

            {/* Pillar 4: Data Availability (Lavender gradient) */}
            <div className="md:col-span-2 bg-lavender p-12 rounded-3xl relative overflow-hidden group hover:glow-purple transition">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <span className="metric-display text-xs uppercase tracking-wider">
                      Security & Compliance
                    </span>
                  </div>
                  <h3 className="text-4xl font-bold mb-4">Data Availability Guaranteed</h3>
                  <p className="text-lg text-gray-600 max-w-xl">
                    HIPAA, GDPR, and LGPD compliant infrastructure with end-to-end encryption and blockchain-verified audit trails.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 bg-purple-500/10 rounded-3xl flex items-center justify-center">
                    <div className="text-6xl">🔒</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BETA ACCESS FORM */}
      <section id="access" className="py-20 px-6">
        <div className="container mx-auto max-w-2xl">
          <div className="space-y-8 text-center">
            <div>
              <h2 className="text-5xl md:text-7xl font-bold mb-4">
                Get Early Access
              </h2>
              <p className="text-xl text-gray-600">
                Join 50+ practices saving 10+ hours weekly
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@clinic.com"
                  required
                  className="flex-1 px-6 py-4 bg-gray-50 border border-black/10 text-black rounded-full font-mono placeholder:text-gray-400 focus:border-electric focus:outline-none transition"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-electric text-black px-8 py-4 rounded-full font-bold hover:glow-green transition disabled:opacity-50 whitespace-nowrap"
                >
                  {isSubmitting ? 'Processing...' : 'Get Access →'}
                </button>
              </div>

              {message && (
                <div className={`p-4 rounded-2xl font-medium text-sm ${
                  message.type === 'success'
                    ? 'bg-electric/10 text-black'
                    : 'bg-red-50 text-red-600'
                }`}>
                  {message.text}
                </div>
              )}
            </form>

            <p className="text-center metric-display text-xs uppercase tracking-wider">
              No credit card • Cancel anytime • HIPAA compliant
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
          <div className="w-14 h-14 command-island rounded-full flex items-center justify-center hover:border-black/10 transition shadow-xl">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </a>
      </div>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-black/5">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-2">
              <Image
                src="/logos/Logo 1_Dark.svg"
                alt="Holi Labs"
                width={24}
                height={24}
                style={{ width: 'auto', height: '24px' }}
              />
              <span className="font-bold text-sm">HOLI LABS</span>
            </div>

            <div className="flex gap-8 text-sm font-medium text-gray-600">
              <Link href="/dashboard" className="hover:text-black transition">Dashboard</Link>
              <Link href="/portal/dashboard" className="hover:text-black transition">Portal</Link>
            </div>
          </div>

          <div className="mt-8 text-center metric-display text-xs">
            © 2024 HOLI LABS • HIPAA/GDPR/LGPD Compliant
          </div>
        </div>
      </footer>
    </div>
  );
}
