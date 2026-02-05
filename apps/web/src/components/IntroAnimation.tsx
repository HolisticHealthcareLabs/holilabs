'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface IntroAnimationProps {
  onComplete?: () => void;
  duration?: number;
}

export function IntroAnimation({ onComplete, duration = 750 }: IntroAnimationProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Always show animation on first load of the session
    const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');

    if (hasSeenIntro) {
      setShow(false);
      onComplete?.();
      return;
    }

    // Auto-hide after duration (2x faster)
    const timer = setTimeout(() => {
      sessionStorage.setItem('hasSeenIntro', 'true');
      setShow(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
        style={{ backdropFilter: 'blur(10px)' }}
      >
        {/* Logo Container */}
        <div className="relative flex items-center justify-center">
          {/* Animated Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.4,
              ease: [0.43, 0.13, 0.23, 0.96],
            }}
            className="relative w-32 h-32 md:w-40 md:h-40 z-10"
          >
            <Image
              src="/logos/holilabs-helix-blue-dark.svg"
              alt="Holi Labs"
              fill
              className="object-contain"
              priority
            />
          </motion.div>

          {/* Animated Circles - Centered on the logo */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2, 2.5], opacity: [0, 0.4, 0] }}
            transition={{
              duration: 0.75,
              repeat: Infinity,
              repeatDelay: 0.25,
              ease: "easeOut",
            }}
            className="absolute rounded-full border-4 border-[#007AFF]"
            style={{
              width: '80px',
              height: '80px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2.5, 3], opacity: [0, 0.3, 0] }}
            transition={{
              duration: 0.75,
              repeat: Infinity,
              repeatDelay: 0.25,
              delay: 0.15,
              ease: "easeOut",
            }}
            className="absolute rounded-full border-4 border-[#3B82F6]"
            style={{
              width: '80px',
              height: '80px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
        </div>

        {/* Brand Name */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="absolute bottom-1/3 text-center"
        >
          <h1
            className="text-3xl md:text-4xl font-bold tracking-tight"
            style={{ color: '#007AFF' }}
          >
            Holi Labs
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="text-gray-600 mt-2 text-sm md:text-base font-medium"
          >
            Clinical Infrastructure v2.0
          </motion.p>
        </motion.div>

        {/* Loading Indicator */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-500"
        />
      </motion.div>
    </AnimatePresence>
  );
}

