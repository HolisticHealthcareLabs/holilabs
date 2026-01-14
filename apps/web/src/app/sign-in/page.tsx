/**
 * Portal Selection Page
 *
 * Clean, sleek entry point for choosing between Provider and Patient portals
 * Features dark double helix H logo with two prominent portal selection buttons
 */

'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function SignInPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen h-screen bg-[#1a1f2e] flex items-center justify-center p-4 overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Logo Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block mb-6"
          >
            <div className="relative">
              <img
                src="/logos/Logo 1_Dark.svg"
                alt="Holi Labs"
                className="h-24 w-auto mx-auto drop-shadow-[0_0_30px_rgba(0,255,136,0.3)]"
              />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-white mb-2"
          >
            Welcome to Holi Labs
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-400 text-lg"
          >
            Select your portal to continue
          </motion.p>
        </div>

        {/* Portal Selection Buttons */}
        <div className="space-y-4">
          {/* Provider Portal Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => router.push('/auth/login')}
            className="group w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl p-6 transition-all duration-200 border border-blue-500/20"
          >
            <div className="flex items-center justify-between">
              <div className="text-left flex-1">
                <h2 className="text-2xl font-bold mb-1">Provider Portal</h2>
                <p className="text-blue-100 text-sm opacity-90">
                  For healthcare professionals, clinicians, and staff
                </p>
              </div>
              <svg
                className="w-6 h-6 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </motion.button>

          {/* Patient Portal Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            onClick={() => router.push('/portal/login')}
            className="group w-full bg-green-600 hover:bg-green-500 text-white rounded-xl p-6 transition-all duration-200 border border-green-500/20"
          >
            <div className="flex items-center justify-between">
              <div className="text-left flex-1">
                <h2 className="text-2xl font-bold mb-1">Patient Portal</h2>
                <p className="text-green-100 text-sm opacity-90">
                  Access your medical records and health information
                </p>
              </div>
              <svg
                className="w-6 h-6 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </motion.button>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center"
        >
          <div className="flex items-center justify-center gap-8 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Secure & Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>HIPAA Compliant</span>
            </div>
          </div>

          <p className="text-gray-600 mt-4 text-xs">
            Need help?{' '}
            <a href="/contact" className="text-[#00FF88] hover:text-[#00FF88]/80 transition-colors">
              Contact Support
            </a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
