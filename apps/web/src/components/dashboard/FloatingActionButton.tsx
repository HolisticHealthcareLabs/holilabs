'use client';

import { motion } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/outline';

interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
}

export function FloatingActionButton({ onClick, className = '' }: FloatingActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        fixed bottom-24 right-8 z-50
        w-14 h-14 rounded-full
        bg-gradient-to-br from-blue-600 to-indigo-600
        text-white
        shadow-lg hover:shadow-xl
        hover:shadow-blue-500/30
        flex items-center justify-center
        transition-all duration-300
        ${className}
      `}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-blue-400"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <PlusIcon className="w-6 h-6 relative z-10" />
    </motion.button>
  );
}

