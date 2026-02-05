'use client';

/**
 * Command Center Demo
 * Interactive showcase of all modular components and features
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  SparklesIcon,
  QrCodeIcon,
  Squares2X2Icon,
  ShieldCheckIcon,
  BeakerIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {
  CommandCenterTile,
  DiagnosisTile,
  QRPairingTile
} from '@/components/co-pilot';
import { QRDisplay, QRScanner } from '@/components/qr';
import { createDevicePairingQR } from '@/lib/qr';

export default function CommandCenterDemoPage() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [qrData, setQrData] = useState<{ dataUrl: string; payload: any } | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const demos = [
    {
      id: 'tiles',
      title: 'Modular Tiles',
      description: 'Draggable tiles with multiple sizes and variants',
      icon: Squares2X2Icon,
      color: 'from-blue-500 to-indigo-500',
    },
    {
      id: 'qr-pairing',
      title: 'QR Code Pairing',
      description: 'Device pairing via QR codes',
      icon: QrCodeIcon,
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'diagnosis',
      title: 'AI Diagnosis',
      description: 'AI-powered differential diagnosis',
      icon: SparklesIcon,
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'permissions',
      title: 'Permission Manager',
      description: 'Granular permission control',
      icon: ShieldCheckIcon,
      color: 'from-amber-500 to-orange-500',
    },
  ];

  const handleGenerateQR = async () => {
    const { dataUrl, payload } = await createDevicePairingQR(
      'demo-user-123',
      'demo@holilabs.com',
      'Demo User',
      'demo-device-456',
      'DESKTOP'
    );
    setQrData({ dataUrl, payload });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl mb-6">
              <SparklesIcon className="w-12 h-12" />
            </div>
            <h1 className="text-5xl font-bold mb-4">AI Command Center</h1>
            <p className="text-xl text-blue-100">
              Interactive Demo - Explore All Features
            </p>
          </motion.div>
        </div>
      </div>

      {/* Demo Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {demos.map((demo, index) => (
            <motion.button
              key={demo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setActiveDemo(demo.id)}
              className={`p-6 rounded-2xl border-2 transition text-left ${
                activeDemo === demo.id
                  ? 'border-blue-500 bg-blue-50 shadow-xl shadow-blue-500/20'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg'
              }`}
            >
              <div
                className={`w-12 h-12 bg-gradient-to-br ${demo.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}
              >
                <demo.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {demo.title}
              </h3>
              <p className="text-sm text-gray-600">{demo.description}</p>
            </motion.button>
          ))}
        </div>

        {/* Demo Content */}
        <motion.div
          layout
          className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          {/* Tiles Demo */}
          {activeDemo === 'tiles' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Modular Tile System
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Small Tile */}
                <CommandCenterTile
                  id="demo-small"
                  title="Small Tile"
                  subtitle="Compact widget"
                  icon={<BeakerIcon className="w-6 h-6 text-blue-600" />}
                  size="small"
                  variant="default"
                  isDraggable={false}
                >
                  <div className="text-sm text-gray-600">
                    Perfect for status indicators and quick metrics
                  </div>
                </CommandCenterTile>

                {/* Medium Tile */}
                <CommandCenterTile
                  id="demo-medium"
                  title="Medium Tile"
                  subtitle="Standard size"
                  icon={<UserIcon className="w-6 h-6 text-green-600" />}
                  size="medium"
                  variant="primary"
                  isDraggable={false}
                >
                  <div className="text-sm text-gray-600">
                    Ideal for forms, lists, and interactive components
                  </div>
                </CommandCenterTile>

                {/* Glass Tile */}
                <CommandCenterTile
                  id="demo-glass"
                  title="Glassmorphism"
                  subtitle="Modern design"
                  icon={<SparklesIcon className="w-6 h-6 text-purple-600" />}
                  size="medium"
                  variant="glass"
                  isDraggable={false}
                >
                  <div className="text-sm text-gray-600">
                    Beautiful backdrop blur effect with transparency
                  </div>
                </CommandCenterTile>

                {/* Success Tile */}
                <CommandCenterTile
                  id="demo-success"
                  title="Success Variant"
                  subtitle="Positive feedback"
                  icon={<ShieldCheckIcon className="w-6 h-6 text-green-600" />}
                  size="medium"
                  variant="success"
                  isDraggable={false}
                >
                  <div className="text-sm text-gray-600">
                    Use for confirmations and completed tasks
                  </div>
                </CommandCenterTile>
              </div>

              <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Features:</h3>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li>✓ 4 size options: small, medium, large, full</li>
                  <li>✓ 6 visual variants with gradients</li>
                  <li>✓ Drag handle with grip icon</li>
                  <li>✓ Active state indicators</li>
                  <li>✓ Futuristic corner accents</li>
                  <li>✓ Smooth animations with framer-motion</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* QR Pairing Demo */}
          {activeDemo === 'qr-pairing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                QR Code Device Pairing
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Generate QR */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Desktop (Generate QR)
                  </h3>
                  <button
                    onClick={handleGenerateQR}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-semibold transition shadow-lg"
                  >
                    Generate QR Code
                  </button>

                  {qrData && (
                    <div className="max-w-sm mx-auto">
                      <QRDisplay
                        qrDataUrl={qrData.dataUrl}
                        payload={qrData.payload}
                        title="Scan with Mobile"
                        showPairingCode={true}
                        autoRefresh={false}
                      />
                    </div>
                  )}
                </div>

                {/* Scan QR */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Mobile (Scan QR)
                  </h3>
                  <button
                    onClick={() => setShowScanner(true)}
                    className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold transition shadow-lg"
                  >
                    Open QR Scanner
                  </button>

                  <div className="p-6 bg-gray-50 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-3">How it works:</h4>
                    <ol className="space-y-2 text-sm text-gray-600">
                      <li>1. Desktop generates QR code with session data</li>
                      <li>2. Mobile scans QR code using camera</li>
                      <li>3. Devices paired with encrypted session token</li>
                      <li>4. Permissions granted automatically</li>
                      <li>5. Real-time data sync enabled</li>
                    </ol>
                  </div>
                </div>
              </div>

              {showScanner && (
                <QRScanner
                  onScan={(result) => {
                    console.log('Scanned:', result);
                    setShowScanner(false);
                  }}
                  onClose={() => setShowScanner(false)}
                />
              )}
            </motion.div>
          )}

          {/* Diagnosis Demo */}
          {activeDemo === 'diagnosis' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                AI-Powered Diagnosis Assistant
              </h2>

              <DiagnosisTile
                chiefComplaint="Patient presents with persistent cough and fever"
                symptoms={['cough', 'fever', 'fatigue', 'sore throat']}
                patientId="demo-patient"
              />

              <div className="mt-8 p-6 bg-purple-50 rounded-xl border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2">AI Features:</h3>
                <ul className="space-y-2 text-sm text-purple-700">
                  <li>✓ Real-time differential diagnosis</li>
                  <li>✓ Probability scoring (0-100%)</li>
                  <li>✓ ICD-10 code suggestions</li>
                  <li>✓ Treatment recommendations</li>
                  <li>✓ Context from live transcription</li>
                  <li>✓ Export to SOAP notes</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Permissions Demo */}
          {activeDemo === 'permissions' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Permission Management System
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Available Permissions
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Read Patient Data', color: 'blue' },
                      { name: 'Write Notes', color: 'green' },
                      { name: 'View Transcript', color: 'purple' },
                      { name: 'Control Recording', color: 'red' },
                      { name: 'Access Diagnosis', color: 'indigo' },
                      { name: 'View Medications', color: 'amber' },
                      { name: 'Edit SOAP Notes', color: 'cyan' },
                      { name: 'Full Access', color: 'pink' },
                    ].map((permission) => (
                      <div
                        key={permission.name}
                        className={`p-4 bg-${permission.color}-50 border border-${permission.color}-200 rounded-xl`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {permission.name}
                          </span>
                          <span className={`text-xs text-${permission.color}-600 font-semibold`}>
                            {permission.color.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Security Features
                  </h3>
                  <div className="p-6 bg-green-50 rounded-xl border border-green-200">
                    <ul className="space-y-3 text-sm text-green-700">
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>QR codes expire after 5 minutes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Sessions expire after 24 hours</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Granular permission control</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>One-click device revocation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Activity tracking per device</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>LocalStorage persistence</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Auto-cleanup of expired sessions</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {!activeDemo && (
            <div className="p-12 text-center">
              <SparklesIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Select a Demo Above
              </h3>
              <p className="text-gray-600">
                Choose a feature to see an interactive demonstration
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-8 px-6 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400">
            HoliLabs Medical Platform - AI Command Center v2.0
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Industry-grade clinical decision support with modular architecture
          </p>
        </div>
      </div>
    </div>
  );
}
