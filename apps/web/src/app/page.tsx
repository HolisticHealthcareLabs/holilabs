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
        setMessage({ type: 'success', text: 'Success! Check your email for confirmation.' });
        setEmail('');
        setName('');
        setOrganization('');
        setRole('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Something went wrong. Please try again.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
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
          <nav className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors font-medium">
              Dashboard
            </Link>
            <Link
              href="#waitlist"
              className="bg-white text-black px-6 py-2.5 rounded-full hover:bg-gray-200 transition-all font-semibold shadow-lg shadow-white/20 hover:shadow-white/40"
            >
              Join Beta
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
              <span className="text-sm font-semibold text-gray-300">HIPAA • GDPR • LGPD Compliant</span>
            </div>

            {/* Main Headline */}
            <h1
              className="text-6xl md:text-8xl font-bold mb-8 leading-tight"
              style={{ transform: `translateY(${scrollY * -0.05}px)` }}
            >
              Healthcare AI.
              <br />
              <span className="bg-gradient-to-r from-accent via-primary to-purple-400 bg-clip-text text-transparent">
                Privacy First.
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
              style={{ transform: `translateY(${scrollY * -0.08}px)` }}
            >
              De-identify patient data automatically. Deploy clinical AI with differential privacy.
              Stay compliant across HIPAA, GDPR, and LGPD.
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
                <span className="relative z-10">Join the Beta →</span>
                <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-xl" />
              </Link>
              <Link
                href="/dashboard"
                className="bg-white/5 text-white border border-white/20 backdrop-blur-md px-10 py-4 rounded-full font-bold text-lg hover:bg-white/10 hover:border-white/30 transition-all"
              >
                View Demo
              </Link>
            </div>

            {/* Trust Indicators */}
            <div
              className="flex items-center justify-center space-x-8 text-sm text-gray-500"
              style={{ transform: `translateY(${scrollY * -0.12}px)` }}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>No credit card</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Early access</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Setup support</span>
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

      {/* Stats Section */}
      <section className="relative py-32 border-y border-white/10">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center group">
              <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                99.9%
              </div>
              <div className="text-gray-400 text-lg">De-identification Accuracy</div>
            </div>
            <div className="text-center group">
              <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                18
              </div>
              <div className="text-gray-400 text-lg">HIPAA Identifiers Removed</div>
            </div>
            <div className="text-center group">
              <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-accent bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                3
              </div>
              <div className="text-gray-400 text-lg">Regulatory Frameworks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                Built for Healthcare Teams
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Everything you need to deploy AI in healthcare, compliantly.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ),
                  title: 'Automatic De-identification',
                  description: 'HIPAA Safe Harbor compliant. 18 identifiers auto-suppressed. Multilingual NLP supports ES/PT/EN. Works with DICOM, PDFs, and structured data.',
                },
                {
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ),
                  title: 'Secure Clinical AI',
                  description: 'Input sanitization and output screening. Care Mode with clinical guardrails. Powered by Claude with medical fine-tuning for accurate insights.',
                },
                {
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ),
                  title: 'Differential Privacy',
                  description: 'ε/δ accounting built-in. Cryptographic receipts for audit trails. Cooldown periods prevent re-identification risk in research.',
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="group relative bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-2xl hover:bg-white/10 hover:border-accent/50 transition-all duration-300"
                  style={{ transform: `translateY(${scrollY * -0.02 * (index + 1)}px)` }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-primary/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
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
                    Join the Beta Waitlist
                  </h2>
                  <p className="text-xl text-gray-400">
                    Get early access to Holi Labs and deploy compliant healthcare AI.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="px-6 py-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                    <input
                      type="email"
                      placeholder="Work Email *"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="px-6 py-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Organization"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="px-6 py-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="px-6 py-4 rounded-xl bg-white/5 border border-white/20 text-gray-400 focus:outline-none focus:border-accent focus:bg-white/10 transition-all backdrop-blur-md"
                    >
                      <option value="" className="bg-black">Select Role</option>
                      <option value="doctor" className="bg-black">Physician</option>
                      <option value="nurse" className="bg-black">Nurse</option>
                      <option value="researcher" className="bg-black">Researcher</option>
                      <option value="admin" className="bg-black">Administrator</option>
                      <option value="engineer" className="bg-black">Engineer</option>
                      <option value="other" className="bg-black">Other</option>
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
                    {isSubmitting ? 'Joining...' : 'Join Beta Waitlist →'}
                  </button>

                  <p className="text-center text-gray-500 text-sm">
                    No credit card required. We'll reach out with beta access soon.
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
                Healthcare AI with privacy at its core.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li><Link href="/dashboard" className="hover:text-accent transition">Dashboard</Link></li>
                <li><Link href="#features" className="hover:text-accent transition">Features</Link></li>
                <li><Link href="#waitlist" className="hover:text-accent transition">Beta Access</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Compliance</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li>HIPAA Compliant</li>
                <li>GDPR Compliant</li>
                <li>LGPD (Brazil)</li>
                <li>Safe Harbor Method</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Regions</h4>
              <div className="flex items-center space-x-4 text-3xl">
                <span>🇧🇷</span>
                <span>🇲🇽</span>
                <span>🇦🇷</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-8 text-center text-gray-500 text-sm">
            <p>© 2025 Holi Labs. All rights reserved. HIPAA/GDPR/LGPD Compliant.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
