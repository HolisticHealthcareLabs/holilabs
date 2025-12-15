'use client';

/**
 * Tooltip Component
 * Elegant tooltip with smooth animations
 */

import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  shortcut?: string;
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  delay = 500,
  shortcut,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
    right:
      'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: position === 'top' ? 5 : -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: position === 'top' ? 5 : -5 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`absolute ${positionClasses[position]} z-50 pointer-events-none`}
          >
            <motion.div
              initial={{ boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)' }}
              animate={{
                boxShadow: [
                  '0 10px 30px rgba(0, 0, 0, 0.3)',
                  '0 10px 40px rgba(0, 0, 0, 0.4)',
                  '0 10px 30px rgba(0, 0, 0, 0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap flex items-center gap-2"
            >
              <motion.span
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
              >
                {content}
              </motion.span>
              {shortcut && (
                <motion.kbd
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] font-mono shadow-sm"
                >
                  {shortcut}
                </motion.kbd>
              )}
            </motion.div>
            {/* Arrow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
