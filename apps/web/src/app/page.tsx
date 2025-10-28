'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function Home() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [faqSectionExpanded, setFaqSectionExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
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
        body: JSON.stringify({ email, name: '' }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: '🎉 Success! Check your email for instant access to Holi Labs BETA'
        });
        setEmail('');

        // Confetti celebration
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10b981', '#059669', '#22c55e', '#14b8a6']
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Something went wrong. Please try again.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Connection error. Please check your internet and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      question: "How long does it take to get started with Holi Labs?",
      answer: "Implementation takes just 48 hours. Unlike traditional EMR systems that require months of setup, Holi Labs is designed for rapid deployment. We handle the technical setup, data migration, and team training—so you can start saving time immediately."
    },
    {
      question: "Is my patient data secure and compliant?",
      answer: "Absolutely. Holi Labs is fully HIPAA, GDPR, and LGPD compliant from day one. We use military-grade encryption, secure cloud infrastructure, and regular third-party security audits. Your patient data is protected with the highest industry standards."
    },
    {
      question: "Can I use Holi Labs offline or in areas with poor internet?",
      answer: "Yes! Holi Labs works completely offline. This makes it perfect for rural clinics, home visits, or any location with unreliable connectivity. All your work syncs automatically when you're back online."
    },
    {
      question: "How much time will this actually save me?",
      answer: "On average, physicians save 10+ hours per week. By automating clinical documentation, patient organization, and administrative tasks, you'll spend less time on paperwork and more time with patients—or enjoying your personal life."
    },
    {
      question: "What if I already have an existing EMR system?",
      answer: "We make migration seamless. Our team handles all data transfer from your current system to Holi Labs, ensuring zero data loss. We support imports from all major EMR platforms and can customize the migration to fit your specific needs."
    },
    {
      question: "Do I need technical expertise to use this platform?",
      answer: "Not at all. Holi Labs is designed for medical professionals, not IT experts. The interface is intuitive and requires no technical training. If you can use a smartphone, you can use Holi Labs."
    },
    {
      question: "What kind of support do you provide?",
      answer: "You get 24/7 dedicated support via email, phone, and live chat. Every user has access to our support team, video tutorials, and comprehensive documentation. We also provide personalized onboarding and ongoing training for your entire practice."
    },
    {
      question: "How does pricing work?",
      answer: "We offer simple, transparent per-provider pricing with no hidden fees. During BETA, you get access at a special discounted rate with no long-term commitment. Cancel anytime—no questions asked."
    },
    {
      question: "Can Holi Labs integrate with other tools I'm already using?",
      answer: "Yes. We integrate with major lab systems, pharmacies, billing platforms, and appointment schedulers. Our API allows for custom integrations specific to your practice needs. Just let us know what you use, and we'll make it work."
    },
    {
      question: "What makes Holi Labs different from other EMR systems?",
      answer: "Speed, simplicity, and AI-powered automation. While traditional EMRs are bloated and slow, Holi Labs is built for the modern physician. We eliminate administrative chaos with smart automation, work offline when needed, and deploy in hours—not months."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Clean Header - 4k.com Style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <Image
                src="/logos/Logo 1_Dark.svg"
                alt="Holi Labs"
                width={40}
                height={40}
                style={{ width: 'auto', height: '40px' }}
                className="transition-transform group-hover:scale-110"
              />
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-black">
                  Holi Labs
                </h1>
                <span className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                  BETA
                </span>
              </div>
            </Link>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="relative w-10 h-10 flex flex-col items-center justify-center space-y-1.5 group"
              aria-label="Menu"
            >
              <span className={`block w-6 h-0.5 bg-black transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`block w-6 h-0.5 bg-black transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`block w-6 h-0.5 bg-black transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </button>
          </div>
        </div>

        {/* Futuristic Dropdown Menu */}
        {menuOpen && (
          <div className="absolute top-full right-6 mt-2 w-72 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300 z-50">
            <div className="p-3 space-y-1">
              {/* Primary Actions */}
              <Link
                href="#access"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl transition-all duration-200 group shadow-md"
              >
                <span className="flex items-center justify-between">
                  Get Beta Access
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>

              <div className="my-2 border-t border-gray-200"></div>

              {/* Login Options */}
              <div className="px-2 py-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Login</p>
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm font-semibold text-black hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-lg transition-all duration-200 group"
                >
                  <span className="flex items-center justify-between">
                    Provider Login
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </span>
                </Link>
                <Link
                  href="/portal/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm font-semibold text-black hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 rounded-lg transition-all duration-200 group"
                >
                  <span className="flex items-center justify-between">
                    Patient Login
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </span>
                </Link>
              </div>

              <div className="my-2 border-t border-gray-200"></div>

              {/* Navigation */}
              <Link
                href="#faqs"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm font-semibold text-black hover:bg-gray-50 rounded-lg transition-all duration-200 group"
              >
                <span className="flex items-center justify-between">
                  FAQs
                  <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Link>

              <a
                href="mailto:support@holilabs.xyz"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm font-semibold text-black hover:bg-gray-50 rounded-lg transition-all duration-200 group"
              >
                <span className="flex items-center justify-between">
                  Contact Support
                  <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section - Bold Stacked Headline with Parallax */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            {/* Stacked Headline - 4k.com Style with Parallax */}
            <h1
              className="text-6xl md:text-8xl font-bold leading-[1.1] mb-8"
              style={{
                transform: `translateY(${scrollY * 0.15}px)`,
                transition: 'transform 0.1s ease-out'
              }}
            >
              All Your
              <br />
              <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                Clinical Work,
              </span>
              <br />
              Automated
            </h1>

            {/* Short Declarative Statement - Benefit-Focused */}
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Spend less time on paperwork, more time building human connection.
            </p>

            {/* Strong CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="#access"
                className="w-full sm:w-auto bg-black text-white px-10 py-5 rounded-lg hover:bg-gray-800 transition font-bold text-lg shadow-xl hover:shadow-2xl"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Trust Signal */}
            <p className="mt-8 text-sm text-gray-500">
              Trusted by 50+ medical practices • HIPAA, GDPR & LGPD Compliant
            </p>
          </div>
        </div>
      </section>

      {/* Features Section - Alternating Background */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-xl mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Start Saving Time Immediately</h3>
              <p className="text-gray-600">
                Be up and running in 48 hours—not months. Skip the painful onboarding and start seeing results on day one.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-xl mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Sleep Better at Night</h3>
              <p className="text-gray-600">
                HIPAA, GDPR, and LGPD compliant from day one. Never worry about data breaches or compliance audits again.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-xl mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Work From Anywhere</h3>
              <p className="text-gray-600">
                Rural clinic or home visit? No problem. Full offline functionality means you're never blocked from doing your work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                10+
              </div>
              <p className="text-xl text-gray-600">Hours Saved Weekly</p>
            </div>
            <div>
              <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                48h
              </div>
              <p className="text-xl text-gray-600">Deployment Time</p>
            </div>
            <div>
              <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                50+
              </div>
              <p className="text-xl text-gray-600">Medical Practices</p>
            </div>
          </div>
        </div>
      </section>

      {/* BETA Access Section - Alternating Background */}
      <section id="access" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6 max-w-2xl">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold mb-6">
              Ready to Get Your
              <br />
              <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                Time Back?
              </span>
            </h2>
            <p className="text-xl text-gray-600">
              Join 50+ practices already saving 10+ hours per week. Special BETA pricing available now.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-6 py-5 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none text-lg"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black text-white px-10 py-5 rounded-lg hover:bg-gray-800 transition font-bold text-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Get Instant Access'}
            </button>

            {message && (
              <div className={`p-4 rounded-lg text-center ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {message.text}
              </div>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faqs" className="py-20 bg-white scroll-mt-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-5xl font-bold mb-4">
              Frequently Asked
              <br />
              <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                Questions
              </span>
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Everything you need to know about Holi Labs
            </p>
            <button
              onClick={() => setFaqSectionExpanded(!faqSectionExpanded)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-black font-semibold rounded-xl transition-all duration-200"
            >
              {faqSectionExpanded ? 'Show Less' : 'Show All FAQs'}
              <svg
                className={`w-5 h-5 transition-transform duration-300 ${faqSectionExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {faqs.slice(0, faqSectionExpanded ? faqs.length : 3).map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors duration-200"
                >
                  <span className="text-lg font-semibold text-black pr-8">
                    {faq.question}
                  </span>
                  <svg
                    className={`w-6 h-6 text-gray-600 flex-shrink-0 transition-transform duration-300 ${
                      openFaqIndex === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {openFaqIndex === index && (
                  <div className="px-6 pb-5 text-gray-600 leading-relaxed animate-in slide-in-from-top-2 duration-300">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Floating Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {/* WhatsApp Button */}
        <a
          href="https://wa.me/1234567890?text=Hi!%20I'm%20interested%20in%20Holi%20Labs%20BETA"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative"
        >
          <div className="w-14 h-14 bg-[#25D366] hover:bg-[#20BA5A] rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div className="absolute right-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg whitespace-nowrap shadow-xl">
              Chat on WhatsApp
            </div>
          </div>
        </a>

        {/* Email Button */}
        <a
          href="mailto:support@holilabs.xyz?subject=Inquiry%20about%20Holi%20Labs%20BETA"
          className="group relative"
        >
          <div className="w-14 h-14 bg-black hover:bg-gray-800 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="absolute right-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg whitespace-nowrap shadow-xl">
              Email us
            </div>
          </div>
        </a>
      </div>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Image
                src="/logos/Logo 1_Dark.svg"
                alt="Holi Labs"
                width={32}
                height={32}
                style={{ width: 'auto', height: '32px' }}
              />
              <span className="font-bold text-lg">Holi Labs</span>
            </div>

            <div className="flex gap-6 text-sm text-gray-600">
              <Link href="/dashboard" className="hover:text-black transition">
                Dashboard
              </Link>
              <Link href="/portal/dashboard" className="hover:text-black transition">
                Patient Portal
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            © 2024 Holi Labs. HIPAA, GDPR & LGPD Compliant.
          </div>
        </div>
      </footer>
    </div>
  );
}
