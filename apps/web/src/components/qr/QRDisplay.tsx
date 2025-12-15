'use client';

/**
 * QR Code Display Component
 * Shows QR codes for device pairing and permission sharing
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowPathIcon, ClockIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import type { QRPayload, DevicePairingQR } from '@/lib/qr/types';
import { getTimeUntilExpiry, refreshQRCode, isQRExpired } from '@/lib/qr/generator';

interface QRDisplayProps {
  qrDataUrl: string;
  payload: QRPayload;
  title?: string;
  description?: string;
  onClose?: () => void;
  onRefresh?: (newDataUrl: string, newPayload: QRPayload) => void;
  autoRefresh?: boolean;
  showPairingCode?: boolean;
  className?: string;
}

export default function QRDisplay({
  qrDataUrl,
  payload,
  title = 'Scan QR Code',
  description,
  onClose,
  onRefresh,
  autoRefresh = true,
  showPairingCode = false,
  className = '',
}: QRDisplayProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(getTimeUntilExpiry(payload));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentDataUrl, setCurrentDataUrl] = useState(qrDataUrl);
  const [currentPayload, setCurrentPayload] = useState(payload);

  useEffect(() => {
    // Update countdown timer
    const interval = setInterval(() => {
      const remaining = getTimeUntilExpiry(currentPayload);
      setTimeRemaining(remaining);

      // Auto-refresh if enabled and QR is about to expire
      if (autoRefresh && remaining <= 10 && remaining > 0 && !isRefreshing) {
        handleRefresh();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentPayload, autoRefresh, isRefreshing]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { dataUrl, payload: newPayload } = await refreshQRCode(currentPayload);
      setCurrentDataUrl(dataUrl);
      setCurrentPayload(newPayload);
      setTimeRemaining(getTimeUntilExpiry(newPayload));

      if (onRefresh) {
        onRefresh(dataUrl, newPayload);
      }
    } catch (error) {
      console.error('Failed to refresh QR code:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = isQRExpired(currentPayload);
  const isExpiringSoon = timeRemaining <= 30 && timeRemaining > 0;

  // Extract pairing code for device pairing QR codes
  const pairingCode = showPairingCode && currentPayload.purpose === 'DEVICE_PAIRING'
    ? (currentPayload as DevicePairingQR).pairingCode
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">{title}</h3>
              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/50 transition"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>

          {/* Timer */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <ClockIcon className={`w-4 h-4 ${
              isExpired ? 'text-red-500' :
              isExpiringSoon ? 'text-orange-500' :
              'text-gray-500 dark:text-gray-400'
            }`} />
            <span className={`text-sm font-medium ${
              isExpired ? 'text-red-600' :
              isExpiringSoon ? 'text-orange-600' :
              'text-gray-700'
            }`}>
              {isExpired ? 'Expired' : `Expires in ${formatTime(timeRemaining)}`}
            </span>
          </div>
        </div>

        {/* QR Code Display */}
        <div className="p-8">
          <div className="relative">
            {/* QR Code Image */}
            <motion.div
              className="relative bg-white rounded-2xl p-6 shadow-lg border-4 border-gray-100"
              animate={isExpired ? { opacity: 0.3 } : { opacity: 1 }}
            >
              <div className="relative w-full aspect-square">
                <Image
                  src={currentDataUrl}
                  alt="QR Code"
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              {/* Corner Accents */}
              <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
              <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
            </motion.div>

            {/* Expired Overlay */}
            {isExpired && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl"
              >
                <div className="text-center">
                  <div className="text-white text-lg font-semibold mb-2">QR Code Expired</div>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-6 py-2 bg-white hover:bg-gray-100 text-gray-900 rounded-full font-medium transition flex items-center gap-2 mx-auto"
                  >
                    <ArrowPathIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Generate New
                  </button>
                </div>
              </motion.div>
            )}

            {/* Expiring Soon Warning */}
            {isExpiringSoon && !isExpired && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl"
              >
                <p className="text-sm text-orange-700 text-center">
                  This QR code will expire soon. A new one will be generated automatically.
                </p>
              </motion.div>
            )}
          </div>

          {/* Pairing Code Display */}
          {pairingCode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Or enter this code manually:</p>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                <span className="text-3xl font-bold text-gray-900 tracking-wider">
                  {pairingCode}
                </span>
              </div>
            </motion.div>
          )}

          {/* Refresh Button */}
          {!isExpired && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-full font-medium transition flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh QR Code'}
              </button>
            </div>
          )}
        </div>

        {/* Purpose Badge */}
        <div className="px-8 pb-6">
          <div className="flex items-center justify-center gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {currentPayload.purpose.replace(/_/g, ' ')}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
              v{currentPayload.version}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 p-6 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">How to scan:</h4>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                1
              </span>
              <span>Open the mobile app on your device</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                2
              </span>
              <span>Tap the QR scanner icon in the co-pilot</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                3
              </span>
              <span>Point camera at this QR code and hold steady</span>
            </li>
          </ol>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
