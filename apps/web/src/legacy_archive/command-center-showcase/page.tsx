'use client';

/**
 * Command Center Showcase
 * Interactive demonstration of all command center features
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  VitalsTile,
  QuickActionsTile,
  NotificationsTile,
  DiagnosisTile,
  PatientSearchTile,
  QRPairingTile,
  CommandCenterTile,
} from '@/components/co-pilot';
import type { Patient } from '@prisma/client';

export default function CommandCenterShowcase() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [showFeatures, setShowFeatures] = useState(false);

  // Mock patient data
  const mockPatients: Partial<Patient>[] = [
    {
      id: 'demo-1',
      firstName: 'María',
      lastName: 'García',
      email: 'maria.garcia@example.com',
      dateOfBirth: new Date('1985-06-15'),
    },
    {
      id: 'demo-2',
      firstName: 'Juan',
      lastName: 'Rodríguez',
      email: 'juan.rodriguez@example.com',
      dateOfBirth: new Date('1978-03-22'),
    },
  ];

  const [selectedPatient, setSelectedPatient] = useState<Partial<Patient> | null>(
    mockPatients[0]
  );

  const features = [
    {
      id: 'vitals',
      title: 'Real-Time Vitals Monitoring',
      description: 'Track patient vital signs with live updates and status indicators',
      icon: '❤️',
      color: 'from-red-500 to-pink-500',
      demo: 'vitals',
    },
    {
      id: 'quick-actions',
      title: 'Clinical Quick Actions',
      description: 'One-click access to frequently used clinical workflows',
      icon: '⚡',
      color: 'from-blue-500 to-cyan-500',
      demo: 'quick-actions',
    },
    {
      id: 'notifications',
      title: 'Smart Notifications',
      description: 'Real-time alerts with intelligent filtering and management',
      icon: '🔔',
      color: 'from-indigo-500 to-purple-500',
      demo: 'notifications',
    },
    {
      id: 'diagnosis',
      title: 'AI-Powered Diagnosis',
      description: 'Differential diagnosis with probability scores and ICD-10 codes',
      icon: '🧠',
      color: 'from-green-500 to-emerald-500',
      demo: 'diagnosis',
    },
    {
      id: 'qr-pairing',
      title: 'Device Pairing',
      description: 'Secure QR code-based device synchronization',
      icon: '📱',
      color: 'from-amber-500 to-orange-500',
      demo: 'qr-pairing',
    },
    {
      id: 'patient-search',
      title: 'Patient Search',
      description: 'Fast, intelligent patient selection with real-time search',
      icon: '🔍',
      color: 'from-purple-500 to-pink-500',
      demo: 'patient-search',
    },
  ];

  const renderDemo = () => {
    switch (activeDemo) {
      case 'vitals':
        return (
          <div className="max-w-2xl">
            <VitalsTile patientId={selectedPatient?.id} tileId="demo-vitals" />
          </div>
        );

      case 'quick-actions':
        return (
          <div className="max-w-2xl">
            <QuickActionsTile
              patientId={selectedPatient?.id}
              tileId="demo-quick-actions"
              onAction={(action) => {
                alert(`Action triggered: ${action}`);
              }}
            />
          </div>
        );

      case 'notifications':
        return (
          <div className="max-w-2xl">
            <NotificationsTile tileId="demo-notifications" />
          </div>
        );

      case 'diagnosis':
        return (
          <div className="max-w-2xl">
            <DiagnosisTile
              chiefComplaint="Patient presents with persistent cough and fever"
              symptoms={['Cough', 'Fever', 'Fatigue', 'Nasal congestion']}
              patientId={selectedPatient?.id}
            />
          </div>
        );

      case 'qr-pairing':
        return (
          <div className="max-w-2xl">
            <QRPairingTile
              onDevicePaired={(deviceId) => {
                alert(`Device paired: ${deviceId}`);
              }}
            />
          </div>
        );

      case 'patient-search':
        return (
          <div className="max-w-2xl">
            <PatientSearchTile
              patients={mockPatients as Patient[]}
              selectedPatient={selectedPatient as Patient}
              onSelectPatient={setSelectedPatient}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background Grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 py-20">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-full mb-6">
              <SparklesIcon className="w-5 h-5 text-blue-300" />
              <span className="text-blue-200 text-sm font-medium">
                AI Command Center
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Futuristic Clinical
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Command Center
              </span>
            </h1>

            <p className="text-xl text-blue-200 max-w-3xl mx-auto mb-8">
              Modular, intelligent, and aesthetically designed for modern clinicians.
              Experience real-time patient monitoring, AI-powered diagnostics, and
              seamless device synchronization.
            </p>

            <button
              onClick={() => setShowFeatures(!showFeatures)}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-semibold shadow-2xl shadow-blue-500/50 transition-all flex items-center gap-2 mx-auto"
            >
              Explore Features
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </motion.div>

          {/* Feature Grid */}
          <AnimatePresence>
            {showFeatures && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
              >
                {features.map((feature, index) => (
                  <motion.button
                    key={feature.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setActiveDemo(feature.demo)}
                    className={`group p-6 bg-white/5 backdrop-blur-sm border-2 rounded-2xl transition-all text-left ${
                      activeDemo === feature.demo
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}
                      >
                        {feature.icon}
                      </div>
                      {activeDemo === feature.demo && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <CheckCircleIcon className="w-6 h-6 text-blue-400" />
                        </motion.div>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-blue-200">{feature.description}</p>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Demo Area */}
          <AnimatePresence mode="wait">
            {activeDemo && (
              <motion.div
                key={activeDemo}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative"
              >
                {/* Close Button */}
                <button
                  onClick={() => setActiveDemo(null)}
                  className="absolute top-6 right-6 z-10 p-2 bg-gray-800/80 hover:bg-gray-700 backdrop-blur-sm rounded-full transition"
                >
                  <XMarkIcon className="w-6 h-6 text-white" />
                </button>

                {/* Demo Container */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {features.find((f) => f.demo === activeDemo)?.title}
                    </h2>
                    <p className="text-blue-200">
                      {features.find((f) => f.demo === activeDemo)?.description}
                    </p>
                  </div>

                  {/* Demo Component */}
                  <div className="flex justify-center">{renderDemo()}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Features List */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Key Capabilities
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              title: 'Modular Drag-and-Drop',
              description:
                'Rearrange tiles to match your workflow. Each component is independently draggable.',
            },
            {
              title: 'Real-Time Synchronization',
              description:
                'Connect multiple devices with QR codes. Changes sync instantly across all paired devices.',
            },
            {
              title: 'Industry-Grade Security',
              description:
                'Session-based permissions with 24-hour expiry. HIPAA-compliant device pairing.',
            },
            {
              title: 'AI-Powered Insights',
              description:
                'Differential diagnosis with probability scores, ICD-10 codes, and treatment recommendations.',
            },
            {
              title: 'Responsive Design',
              description:
                'Optimized for desktop, tablet, and mobile. Seamless experience across all devices.',
            },
            {
              title: 'Futuristic Aesthetic',
              description:
                'Glassmorphism, gradients, and smooth animations create a modern command center feel.',
            },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl"
            >
              <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
              <p className="text-blue-200">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-xl border border-white/20 rounded-3xl"
        >
          <SparklesIcon className="w-16 h-16 text-blue-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Clinical Workflow?
          </h2>
          <p className="text-blue-200 mb-8">
            Experience the future of clinical decision support with our AI-powered command
            center.
          </p>
          <a
            href="/dashboard/co-pilot-v2"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-semibold shadow-2xl shadow-blue-500/50 transition-all"
          >
            Launch Command Center
            <ArrowRightIcon className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
