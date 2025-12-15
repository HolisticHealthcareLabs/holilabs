'use client';

/**
 * Command Center Tile
 * Modular, draggable tile component for the futuristic command center
 */

import { ReactNode } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Bars3Icon } from '@heroicons/react/24/outline';

export type TileSize = 'small' | 'medium' | 'large' | 'full';
export type TileVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'glass';

interface CommandCenterTileProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  size?: TileSize;
  variant?: TileVariant;
  isDraggable?: boolean;
  isActive?: boolean;
  children: ReactNode;
  className?: string;
  onExpand?: () => void;
  showGrip?: boolean;
}

const sizeClasses: Record<TileSize, string> = {
  small: 'col-span-1 row-span-1 min-h-[200px]',
  medium: 'col-span-1 md:col-span-2 row-span-1 min-h-[300px]',
  large: 'col-span-1 md:col-span-2 lg:col-span-3 row-span-2 min-h-[400px]',
  full: 'col-span-full row-span-2 min-h-[500px]',
};

const variantClasses: Record<TileVariant, string> = {
  default: 'bg-white border-gray-200 hover:border-gray-300',
  primary: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300',
  success: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300',
  warning: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:border-amber-300',
  danger: 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200 hover:border-red-300',
  glass: 'bg-white/40 backdrop-blur-xl border-white/20 hover:border-white/30 shadow-xl',
};

export default function CommandCenterTile({
  id,
  title,
  subtitle,
  icon,
  size = 'medium',
  variant = 'default',
  isDraggable = true,
  isActive = false,
  children,
  className = '',
  onExpand,
  showGrip = true,
}: CommandCenterTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: !isDraggable,
    data: { type: 'tile', title, size },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: isDragging ? 1 : 1.02 }}
      className={`
        relative
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-2xl
        border-2
        overflow-hidden
        transition-all
        duration-300
        ${isDragging ? 'opacity-50 shadow-2xl z-50' : 'shadow-lg'}
        ${isActive ? 'ring-4 ring-blue-500 ring-opacity-50' : ''}
        ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-white/80 to-transparent backdrop-blur-md px-6 py-4 border-b border-gray-100/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Drag Handle */}
            {isDraggable && showGrip && (
              <div
                {...listeners}
                {...attributes}
                className="flex-shrink-0 p-1 rounded hover:bg-gray-100 transition cursor-grab active:cursor-grabbing"
              >
                <Bars3Icon className="w-5 h-5 text-gray-400" />
              </div>
            )}

            {/* Icon */}
            {icon && (
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/80 shadow-sm flex items-center justify-center">
                {icon}
              </div>
            )}

            {/* Title & Subtitle */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-sm text-gray-600 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Expand Button */}
          {onExpand && (
            <button
              onClick={onExpand}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-white/80 transition"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 h-full overflow-auto">
        {children}
      </div>

      {/* Active Indicator */}
      {isActive && (
        <motion.div
          layoutId="active-indicator"
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Corner Accents (Futuristic Design) */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400/30 rounded-tl-2xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-400/30 rounded-tr-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-400/30 rounded-bl-2xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400/30 rounded-br-2xl pointer-events-none" />
    </motion.div>
  );
}
