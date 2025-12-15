'use client';

/**
 * Command Center Settings
 * Comprehensive configuration and management interface
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  PaintBrushIcon,
  ServerIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import DeviceManagerTile from '@/components/co-pilot/DeviceManagerTile';
import Link from 'next/link';

type SettingsTab = 'devices' | 'notifications' | 'appearance' | 'sync' | 'security';

export default function CommandCenterSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('devices');
  const [settings, setSettings] = useState({
    // Notification Settings
    enableNotifications: true,
    notificationSound: true,
    desktopNotifications: true,
    emailNotifications: false,

    // Appearance Settings
    theme: 'dark',
    accentColor: 'blue',
    animationsEnabled: true,
    compactMode: false,

    // Sync Settings
    autoSync: true,
    syncInterval: 30,
    offlineMode: false,

    // Security Settings
    sessionTimeout: 24,
    requirePinForActions: false,
    biometricAuth: false,
    auditLogging: true,
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const tabs = [
    {
      id: 'devices' as SettingsTab,
      label: 'Connected Devices',
      icon: ShieldCheckIcon,
      description: 'Manage paired devices and permissions',
    },
    {
      id: 'notifications' as SettingsTab,
      label: 'Notifications',
      icon: BellIcon,
      description: 'Configure alert preferences',
    },
    {
      id: 'appearance' as SettingsTab,
      label: 'Appearance',
      icon: PaintBrushIcon,
      description: 'Customize visual settings',
    },
    {
      id: 'sync' as SettingsTab,
      label: 'Synchronization',
      icon: ServerIcon,
      description: 'Real-time sync options',
    },
    {
      id: 'security' as SettingsTab,
      label: 'Security',
      icon: ShieldCheckIcon,
      description: 'Security and privacy settings',
    },
  ];

  const handleSaveSettings = () => {
    setSaveStatus('saving');

    // Simulate API call
    setTimeout(() => {
      localStorage.setItem('commandCenterSettings', JSON.stringify(settings));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'devices':
        return (
          <div className="space-y-6">
            <DeviceManagerTile />
            <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
              <h3 className="font-semibold text-blue-900 mb-2">
                About Device Pairing
              </h3>
              <p className="text-sm text-blue-700">
                Connect multiple devices using QR codes. Each device can have granular
                permissions that expire after 24 hours for security. All data is
                synchronized in real-time across paired devices.
              </p>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-2xl border-2 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Notification Preferences
              </h3>

              <div className="space-y-4">
                {[
                  {
                    key: 'enableNotifications',
                    label: 'Enable Notifications',
                    description: 'Receive alerts for important events',
                  },
                  {
                    key: 'notificationSound',
                    label: 'Notification Sounds',
                    description: 'Play sound when receiving notifications',
                  },
                  {
                    key: 'desktopNotifications',
                    label: 'Desktop Notifications',
                    description: 'Show browser notifications',
                  },
                  {
                    key: 'emailNotifications',
                    label: 'Email Notifications',
                    description: 'Send alerts via email',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{item.label}</div>
                      <div className="text-sm text-gray-500">{item.description}</div>
                    </div>
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          [item.key]: !settings[item.key as keyof typeof settings],
                        })
                      }
                      className={`relative w-11 h-6 rounded-full transition ${
                        settings[item.key as keyof typeof settings]
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                      }`}
                    >
                      <motion.div
                        animate={{
                          x: settings[item.key as keyof typeof settings] ? 20 : 2,
                        }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-2xl border-2 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Visual Customization
              </h3>

              <div className="space-y-6">
                {/* Theme Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['dark', 'light', 'auto'].map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setSettings({ ...settings, theme })}
                        className={`p-4 rounded-xl border-2 transition capitalize ${
                          settings.theme === theme
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Accent Color
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {[
                      'blue',
                      'indigo',
                      'purple',
                      'pink',
                      'red',
                      'orange',
                      'amber',
                      'green',
                      'teal',
                      'cyan',
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => setSettings({ ...settings, accentColor: color })}
                        className={`w-12 h-12 rounded-xl bg-${color}-500 border-2 transition ${
                          settings.accentColor === color
                            ? 'border-gray-900 scale-110'
                            : 'border-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Toggle Options */}
                <div className="space-y-3">
                  {[
                    {
                      key: 'animationsEnabled',
                      label: 'Enable Animations',
                      description: 'Smooth transitions and effects',
                    },
                    {
                      key: 'compactMode',
                      label: 'Compact Mode',
                      description: 'Reduce spacing and padding',
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{item.label}</div>
                        <div className="text-sm text-gray-500">{item.description}</div>
                      </div>
                      <button
                        onClick={() =>
                          setSettings({
                            ...settings,
                            [item.key]: !settings[item.key as keyof typeof settings],
                          })
                        }
                        className={`relative w-11 h-6 rounded-full transition ${
                          settings[item.key as keyof typeof settings]
                            ? 'bg-blue-500'
                            : 'bg-gray-300'
                        }`}
                      >
                        <motion.div
                          animate={{
                            x: settings[item.key as keyof typeof settings] ? 20 : 2,
                          }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'sync':
        return (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-2xl border-2 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Synchronization Settings
              </h3>

              <div className="space-y-4">
                {[
                  {
                    key: 'autoSync',
                    label: 'Auto-Sync',
                    description: 'Automatically sync data across devices',
                  },
                  {
                    key: 'offlineMode',
                    label: 'Offline Mode',
                    description: 'Work without internet connection',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{item.label}</div>
                      <div className="text-sm text-gray-500">{item.description}</div>
                    </div>
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          [item.key]: !settings[item.key as keyof typeof settings],
                        })
                      }
                      className={`relative w-11 h-6 rounded-full transition ${
                        settings[item.key as keyof typeof settings]
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                      }`}
                    >
                      <motion.div
                        animate={{
                          x: settings[item.key as keyof typeof settings] ? 20 : 2,
                        }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                      />
                    </button>
                  </div>
                ))}

                {/* Sync Interval */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block font-medium text-gray-900 mb-2">
                    Sync Interval
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="10"
                      max="120"
                      step="10"
                      value={settings.syncInterval}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          syncInterval: parseInt(e.target.value),
                        })
                      }
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-gray-700 w-16 text-right">
                      {settings.syncInterval}s
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-2xl border-2 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Security & Privacy
              </h3>

              <div className="space-y-4">
                {[
                  {
                    key: 'requirePinForActions',
                    label: 'Require PIN for Actions',
                    description: 'Additional security for sensitive operations',
                  },
                  {
                    key: 'biometricAuth',
                    label: 'Biometric Authentication',
                    description: 'Use fingerprint or face recognition',
                  },
                  {
                    key: 'auditLogging',
                    label: 'Audit Logging',
                    description: 'Track all system activities',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{item.label}</div>
                      <div className="text-sm text-gray-500">{item.description}</div>
                    </div>
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          [item.key]: !settings[item.key as keyof typeof settings],
                        })
                      }
                      className={`relative w-11 h-6 rounded-full transition ${
                        settings[item.key as keyof typeof settings]
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                      }`}
                    >
                      <motion.div
                        animate={{
                          x: settings[item.key as keyof typeof settings] ? 20 : 2,
                        }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                      />
                    </button>
                  </div>
                ))}

                {/* Session Timeout */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block font-medium text-gray-900 mb-2">
                    Session Timeout
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="48"
                      step="1"
                      value={settings.sessionTimeout}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sessionTimeout: parseInt(e.target.value),
                        })
                      }
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-gray-700 w-16 text-right">
                      {settings.sessionTimeout}h
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/co-pilot-v2"
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <ArrowLeftIcon className="w-6 h-6 text-white" />
              </Link>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50">
                <CogIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Command Center Settings</h1>
                <p className="text-sm text-blue-200">Configure your clinical workspace</p>
              </div>
            </div>

            {/* Save Button */}
            <motion.button
              onClick={handleSaveSettings}
              disabled={saveStatus === 'saving'}
              className={`px-6 py-3 rounded-xl font-semibold transition flex items-center gap-2 ${
                saveStatus === 'saved'
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {saveStatus === 'saved' && <CheckCircleIcon className="w-5 h-5" />}
              {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'saved'
                ? 'Saved!'
                : 'Save Changes'}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full p-4 rounded-xl border-2 transition text-left ${
                      activeTab === tab.id
                        ? 'border-blue-500 bg-blue-500/10 backdrop-blur-sm'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon
                        className={`w-5 h-5 ${
                          activeTab === tab.id ? 'text-blue-400' : 'text-blue-300'
                        }`}
                      />
                      <span
                        className={`font-semibold ${
                          activeTab === tab.id ? 'text-white' : 'text-blue-100'
                        }`}
                      >
                        {tab.label}
                      </span>
                    </div>
                    <p className="text-xs text-blue-200">{tab.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
