'use client';

/**
 * Loading Tile Component
 * Skeleton loader with shimmer effect for tiles
 */

import { motion } from 'framer-motion';

interface LoadingTileProps {
  size?: 'small' | 'medium' | 'large' | 'full';
  variant?: 'pulse' | 'shimmer' | 'dots';
}

export default function LoadingTile({
  size = 'medium',
  variant = 'shimmer',
}: LoadingTileProps) {
  const sizeClasses = {
    small: 'h-40',
    medium: 'h-64',
    large: 'h-96',
    full: 'h-full',
  };

  if (variant === 'pulse') {
    return (
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className={`${sizeClasses[size]} w-full bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl`}
      />
    );
  }

  if (variant === 'dots') {
    return (
      <div
        className={`${sizeClasses[size]} w-full bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl flex items-center justify-center`}
      >
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{
                repeat: Infinity,
                duration: 1,
                delay: i * 0.2,
              }}
              className="w-3 h-3 bg-blue-400 rounded-full"
            />
          ))}
        </div>
      </div>
    );
  }

  // Shimmer variant (default)
  return (
    <div
      className={`${sizeClasses[size]} w-full bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl overflow-hidden relative`}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['-100%', '200%'] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
      />

      {/* Content skeleton */}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-24 h-6 bg-white/10 rounded" />
          <div className="w-16 h-6 bg-white/10 rounded" />
        </div>
        <div className="space-y-2">
          <div className="w-full h-4 bg-white/10 rounded" />
          <div className="w-3/4 h-4 bg-white/10 rounded" />
        </div>
        {size !== 'small' && (
          <div className="space-y-2">
            <div className="w-full h-12 bg-white/10 rounded" />
            <div className="w-full h-12 bg-white/10 rounded" />
          </div>
        )}
      </div>
    </div>
  );
}
