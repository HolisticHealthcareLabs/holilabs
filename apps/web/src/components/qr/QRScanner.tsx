'use client';

/**
 * QR Code Scanner Component
 * Enterprise-grade QR scanner for iOS and Android
 */

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline';
import type { QRScanResult, QRScannerConfig, QRPayload } from '@/lib/qr/types';
import { parseQRData, validateQRPayload } from '@/lib/qr/generator';

interface QRScannerProps {
  onScan: (result: QRScanResult) => void;
  onClose: () => void;
  config?: QRScannerConfig;
  className?: string;
}

export default function QRScanner({
  onScan,
  onClose,
  config,
  className = '',
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerIdRef = useRef(`qr-scanner-${Date.now()}`);

  useEffect(() => {
    initializeScanner();

    return () => {
      stopScanning();
    };
  }, []);

  const initializeScanner = async () => {
    try {
      // Check camera permission
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setCameraPermission(permission.state as 'granted' | 'denied' | 'prompt');

      if (permission.state === 'denied') {
        setError('Camera permission denied. Please enable camera access in your browser settings.');
        return;
      }

      // Initialize scanner
      scannerRef.current = new Html5Qrcode(scannerIdRef.current);
      await startScanning();
    } catch (err) {
      console.error('Failed to initialize scanner:', err);
      setError('Failed to initialize camera. Please check your device permissions.');
    }
  };

  const startScanning = async () => {
    if (!scannerRef.current) return;

    try {
      setIsScanning(true);
      setError(null);

      const qrConfig = {
        fps: config?.fps || 10,
        qrbox: config?.qrbox || { width: 250, height: 250 },
        aspectRatio: config?.aspectRatio || 1.0,
        disableFlip: config?.disableFlip || false,
      };

      await scannerRef.current.start(
        { facingMode: 'environment' },
        qrConfig,
        (decodedText, decodedResult) => {
          handleScanSuccess(decodedText, decodedResult.result.format?.formatName || 'QR_CODE');
        },
        (errorMessage) => {
          // Scanning errors are common and expected, don't show to user
          // Only log for debugging
          // console.debug('Scan error:', errorMessage);
        }
      );
    } catch (err) {
      console.error('Failed to start scanning:', err);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
      setIsScanning(false);
    }
  };

  const handleScanSuccess = (rawData: string, format: string) => {
    // Parse QR data
    const payload = parseQRData(rawData);

    // Validate payload
    let isValid = false;
    let errorMsg: string | undefined;

    if (payload) {
      const validation = validateQRPayload(payload);
      isValid = validation.isValid;
      if (!isValid) {
        errorMsg = validation.errors.join(', ');
      }
    } else {
      errorMsg = 'Invalid QR code format';
    }

    const result: QRScanResult = {
      rawData,
      payload,
      isValid,
      error: errorMsg,
      scannedAt: Date.now(),
      format,
    };

    // Stop scanning before calling callback
    stopScanning();

    // Call callback with result
    onScan(result);
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setCameraPermission('granted');
      await startScanning();
    } catch (err) {
      setCameraPermission('denied');
      setError('Camera access denied. Please enable camera in your browser settings.');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 bg-black/90 backdrop-blur-sm ${className}`}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div>
              <h2 className="text-white text-lg font-semibold">Scan QR Code</h2>
              <p className="text-gray-300 text-sm">Position QR code within the frame</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Scanner Container */}
        <div className="flex items-center justify-center h-full">
          <div className="relative max-w-lg w-full px-4">
            {cameraPermission === 'granted' || cameraPermission === 'prompt' ? (
              <div className="relative">
                {/* Scanner Element */}
                <div
                  id={scannerIdRef.current}
                  className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20"
                />

                {/* Scanning Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Corner Brackets */}
                    <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

                    {/* Scanning Line */}
                    <motion.div
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                      animate={{
                        top: ['10%', '90%', '10%'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
                <CameraIcon className="w-16 h-16 text-white/50 mx-auto mb-4" />
                <h3 className="text-white text-xl font-semibold mb-2">Camera Access Required</h3>
                <p className="text-gray-300 mb-6">
                  We need access to your camera to scan QR codes for device pairing.
                </p>
                <button
                  onClick={requestCameraPermission}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition"
                >
                  Enable Camera
                </button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-500/20 backdrop-blur-md rounded-xl border border-red-500/30"
              >
                <p className="text-red-300 text-sm text-center">{error}</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-4 text-white/70 text-sm">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                  1
                </div>
                <p>Position QR code</p>
              </div>
              <div className="text-white/30">→</div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                  2
                </div>
                <p>Hold steady</p>
              </div>
              <div className="text-white/30">→</div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                  3
                </div>
                <p>Auto-scan</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
