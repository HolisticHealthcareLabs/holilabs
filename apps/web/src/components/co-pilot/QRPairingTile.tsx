'use client';

/**
 * QR Pairing Tile
 * Device pairing and QR code functionality for command center
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCodeIcon, DevicePhoneMobileIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import CommandCenterTile from './CommandCenterTile';
import QRDisplay from '@/components/qr/QRDisplay';
import QRScanner from '@/components/qr/QRScanner';
import { createDevicePairingQR, type DevicePairingQR, type QRScanResult } from '@/lib/qr';

interface QRPairingTileProps {
  tileId?: string;
  onDevicePaired?: (deviceId: string) => void;
}

export default function QRPairingTile({
  tileId = 'qr-pairing-tile',
  onDevicePaired,
}: QRPairingTileProps) {
  const { data: session } = useSession();
  const [mode, setMode] = useState<'idle' | 'display' | 'scan'>('idle');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<DevicePairingQR | null>(null);
  const [pairedDevices, setPairedDevices] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateQR = async () => {
    if (!session?.user?.id || !session?.user?.email || !session?.user?.name) {
      console.error('User session not available');
      return;
    }

    setIsGenerating(true);
    try {
      const deviceId = `desktop-${Date.now()}`;
      const { dataUrl, payload } = await createDevicePairingQR(
        session.user.id,
        session.user.email,
        session.user.name,
        deviceId,
        'DESKTOP'
      );

      setQrDataUrl(dataUrl);
      setQrPayload(payload);
      setMode('display');
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScanQR = () => {
    setMode('scan');
  };

  const handleScanResult = (result: QRScanResult) => {
    setMode('idle');

    if (result.isValid && result.payload?.purpose === 'DEVICE_PAIRING') {
      const pairingData = result.payload as DevicePairingQR;
      setPairedDevices((prev) => [...prev, pairingData.deviceId]);

      if (onDevicePaired) {
        onDevicePaired(pairingData.deviceId);
      }

      // Show success message or notification
      console.log('Device paired successfully:', pairingData);
    } else {
      console.error('Invalid QR code:', result.error);
      // Show error message
    }
  };

  const handleCloseQR = () => {
    setMode('idle');
    setQrDataUrl(null);
    setQrPayload(null);
  };

  const handleQRRefresh = (newDataUrl: string, newPayload: any) => {
    setQrDataUrl(newDataUrl);
    setQrPayload(newPayload as DevicePairingQR);
  };

  return (
    <>
      <CommandCenterTile
        id={tileId}
        title="Device Pairing"
        subtitle={`${pairedDevices.length} device${pairedDevices.length !== 1 ? 's' : ''} connected`}
        icon={<QrCodeIcon className="w-6 h-6 text-indigo-600" />}
        size="medium"
        variant="glass"
        isDraggable={true}
      >
        <div className="space-y-4">
          {/* Mode Selection */}
          {mode === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <p className="text-sm text-gray-600 mb-6">
                Connect your mobile device to sync clinical data and enable permissions.
              </p>

              <div className="grid grid-cols-1 gap-4">
                {/* Generate QR (Desktop) */}
                <motion.button
                  whileHover={{ scale: 1.03, y: -2, boxShadow: '0 10px 30px rgba(59, 130, 246, 0.2)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerateQR}
                  disabled={isGenerating}
                  className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200 hover:border-blue-300 rounded-xl transition text-left group disabled:opacity-50 shadow-sm relative overflow-hidden"
                >
                  {/* Animated background on hover */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    whileHover={{ opacity: 0.1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-blue-500 rounded-xl"
                  />

                  <div className="flex items-center gap-4 relative z-10">
                    <motion.div
                      whileHover={{ rotate: [0, -5, 5, -5, 0], scale: 1.15 }}
                      transition={{ duration: 0.5 }}
                      className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-md"
                    >
                      <ComputerDesktopIcon className="w-6 h-6 text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <motion.h4
                        whileHover={{ x: 2 }}
                        transition={{ duration: 0.15 }}
                        className="font-semibold text-gray-900 mb-1"
                      >
                        Display QR Code
                      </motion.h4>
                      <p className="text-sm text-gray-600">
                        Show QR code on this screen for mobile to scan
                      </p>
                    </div>
                    {isGenerating && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
                      />
                    )}
                  </div>
                </motion.button>

                {/* Scan QR (Mobile) */}
                <motion.button
                  whileHover={{ scale: 1.03, y: -2, boxShadow: '0 10px 30px rgba(34, 197, 94, 0.2)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleScanQR}
                  className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-2 border-green-200 hover:border-green-300 rounded-xl transition text-left group shadow-sm relative overflow-hidden"
                >
                  {/* Animated background on hover */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    whileHover={{ opacity: 0.1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-green-500 rounded-xl"
                  />

                  <div className="flex items-center gap-4 relative z-10">
                    <motion.div
                      whileHover={{ rotate: [0, 10, -10, 10, 0], scale: 1.15 }}
                      transition={{ duration: 0.5 }}
                      className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-md"
                    >
                      <DevicePhoneMobileIcon className="w-6 h-6 text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <motion.h4
                        whileHover={{ x: 2 }}
                        transition={{ duration: 0.15 }}
                        className="font-semibold text-gray-900 mb-1"
                      >
                        Scan QR Code
                      </motion.h4>
                      <p className="text-sm text-gray-600">
                        Use camera to scan QR from another device
                      </p>
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Paired Devices List */}
              {pairedDevices.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-semibold text-gray-700">Connected Devices</h5>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 15 }}
                      className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full"
                    >
                      {pairedDevices.length} online
                    </motion.div>
                  </div>
                  <div className="space-y-2">
                    {pairedDevices.map((deviceId, index) => (
                      <motion.div
                        key={deviceId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        className="flex items-center gap-3 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                      >
                        <motion.div
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.8, 1, 0.8],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-2 h-2 bg-green-500 rounded-full"
                        />
                        <span className="text-sm text-gray-700 font-medium">Device {index + 1}</span>
                        <span className="text-xs text-gray-500 ml-auto font-mono">
                          {deviceId.substring(0, 12)}...
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* QR Display Mode */}
          {mode === 'display' && qrDataUrl && qrPayload && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <QRDisplay
                qrDataUrl={qrDataUrl}
                payload={qrPayload}
                title="Scan with Mobile Device"
                description="Point your mobile device camera at this QR code"
                onClose={handleCloseQR}
                onRefresh={handleQRRefresh}
                showPairingCode={true}
                autoRefresh={true}
              />
            </motion.div>
          )}
        </div>
      </CommandCenterTile>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {mode === 'scan' && (
          <QRScanner
            onScan={handleScanResult}
            onClose={handleCloseQR}
          />
        )}
      </AnimatePresence>
    </>
  );
}
