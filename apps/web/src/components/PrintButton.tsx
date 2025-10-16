'use client';

import { useState } from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';

interface PrintButtonProps {
  className?: string;
  variant?: 'default' | 'icon-only' | 'text-only';
  size?: 'sm' | 'md' | 'lg';
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

export function PrintButton({
  className = '',
  variant = 'default',
  size = 'md',
  onBeforePrint,
  onAfterPrint,
}: PrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);

    // Call before print callback
    if (onBeforePrint) {
      onBeforePrint();
    }

    // Small delay to ensure state updates are reflected
    setTimeout(() => {
      window.print();

      // Call after print callback
      if (onAfterPrint) {
        onAfterPrint();
      }

      setIsPrinting(false);
    }, 100);
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Icon sizes
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Base button classes
  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

  // Variant classes
  const variantClasses = {
    default:
      'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg',
    'icon-only':
      'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
    'text-only':
      'text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300',
  };

  return (
    <button
      onClick={handlePrint}
      disabled={isPrinting}
      className={`${baseClasses} ${variantClasses[variant]} ${
        variant === 'icon-only' ? 'p-2' : sizeClasses[size]
      } ${className} no-print`}
      title="Imprimir documento"
    >
      <PrinterIcon
        className={`${iconSizes[size]} ${isPrinting ? 'animate-pulse' : ''}`}
      />
      {variant !== 'icon-only' && (
        <span>{isPrinting ? 'Preparando...' : 'Imprimir'}</span>
      )}
    </button>
  );
}
