/**
 * CDS Command Center
 *
 * Comprehensive clinical decision support dashboard
 * Medical naming: "Command Center" (central control point for clinical operations)
 *
 * Features:
 * - Modular, draggable panel layout
 * - Real-time alert monitoring
 * - Rule management interface
 * - Alert history and analytics
 * - Customizable layout persistence
 * - Multiple view modes (Compact, Standard, Detailed)
 *
 * Panels:
 * - Alert Monitor: Real-time alerts
 * - Rule Manager: Enable/disable CDS rules
 * - Alert History: Historical alert log
 * - Analytics Dashboard: Alert statistics and trends
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertMonitor } from './AlertMonitor';
import { RuleManager } from './RuleManager';
import { AlertHistory } from './AlertHistory';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import type { CDSRule } from '@/lib/cds/types';

type ViewMode = 'compact' | 'standard' | 'detailed';
type PanelType = 'alerts' | 'rules' | 'history' | 'analytics';

interface Panel {
  id: PanelType;
  title: string;
  icon: string;
  enabled: boolean;
  order: number;
}

interface CDSCommandCenterProps {
  patientId?: string;
  defaultView?: ViewMode;
  className?: string;
}

export function CDSCommandCenter({
  patientId,
  defaultView = 'standard',
  className = '',
}: CDSCommandCenterProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [panels, setPanels] = useState<Panel[]>([
    { id: 'alerts', title: 'Alert Monitor', icon: '🚨', enabled: true, order: 1 },
    { id: 'rules', title: 'Rule Manager', icon: '⚙️', enabled: true, order: 2 },
    { id: 'history', title: 'Alert History', icon: '📊', enabled: true, order: 3 },
    { id: 'analytics', title: 'Analytics', icon: '📈', enabled: true, order: 4 },
  ]);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [rules, setRules] = useState<CDSRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);

  // Load available CDS rules
  useEffect(() => {
    const fetchRules = async () => {
      try {
        setLoadingRules(true);
        const response = await fetch('/api/cds/evaluate', {
          method: 'GET',
        });
        const data = await response.json();
        setRules(data.currentRules || []);
      } catch (error) {
        console.error('Error fetching CDS rules:', error);
      } finally {
        setLoadingRules(false);
      }
    };

    fetchRules();
  }, []);

  // Load saved panel configuration
  useEffect(() => {
    const saved = localStorage.getItem('cds-command-center-config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.panels) setPanels(config.panels);
        if (config.viewMode) setViewMode(config.viewMode);
      } catch (e) {
        console.error('Error loading saved configuration:', e);
      }
    }
  }, []);

  // Save panel configuration
  const saveConfiguration = () => {
    const config = {
      panels,
      viewMode,
    };
    localStorage.setItem('cds-command-center-config', JSON.stringify(config));
  };

  // Toggle panel
  const togglePanel = (panelId: PanelType) => {
    setPanels((prev) =>
      prev.map((p) =>
        p.id === panelId ? { ...p, enabled: !p.enabled } : p
      )
    );
  };

  // Get enabled panels sorted by order
  const enabledPanels = panels.filter((p) => p.enabled).sort((a, b) => a.order - b.order);

  // Get grid class based on view mode and panel count
  const getGridClass = () => {
    if (viewMode === 'compact') {
      return 'grid-cols-1 lg:grid-cols-2';
    } else if (viewMode === 'detailed') {
      return 'grid-cols-1';
    } else {
      // standard
      if (enabledPanels.length === 1) return 'grid-cols-1';
      if (enabledPanels.length === 2) return 'grid-cols-1 lg:grid-cols-2';
      return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3';
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Top Navigation Bar */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              CDS Command Center
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Clinical Decision Support Dashboard
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Selector */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('compact')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'compact'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Compact view - more panels visible"
              >
                📱 Compact
              </button>
              <button
                onClick={() => setViewMode('standard')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'standard'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Standard view - balanced layout"
              >
                💻 Standard
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'detailed'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Detailed view - single panel focus"
              >
                🖥️ Detailed
              </button>
            </div>

            {/* Configure Button */}
            <button
              onClick={() => setIsConfiguring(!isConfiguring)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isConfiguring
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {isConfiguring ? '✓ Done' : '⚙️ Configure'}
            </button>
          </div>
        </div>

        {/* Configuration Panel */}
        {isConfiguring && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Customize Your Dashboard
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {panels.map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => togglePanel(panel.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    panel.enabled
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{panel.icon}</span>
                    <span className="text-lg">
                      {panel.enabled ? '✓' : '○'}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {panel.title}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  saveConfiguration();
                  setIsConfiguring(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
              >
                Save Configuration
              </button>
              <button
                onClick={() => {
                  // Reset to defaults
                  setPanels([
                    { id: 'alerts', title: 'Alert Monitor', icon: '🚨', enabled: true, order: 1 },
                    { id: 'rules', title: 'Rule Manager', icon: '⚙️', enabled: true, order: 2 },
                    { id: 'history', title: 'Alert History', icon: '📊', enabled: true, order: 3 },
                    { id: 'analytics', title: 'Analytics', icon: '📈', enabled: true, order: 4 },
                  ]);
                  setViewMode('standard');
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white text-sm font-medium rounded transition-colors"
              >
                Reset to Default
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Dashboard Grid */}
      <div className="flex-1 overflow-auto p-6">
        {enabledPanels.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Panels Enabled
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Enable at least one panel to get started
              </p>
              <button
                onClick={() => setIsConfiguring(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Configure Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className={`grid ${getGridClass()} gap-6 auto-rows-min`}>
            {enabledPanels.map((panel) => (
              <motion.div
                key={panel.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                style={{
                  minHeight: viewMode === 'detailed' ? '600px' : '400px',
                  maxHeight: viewMode === 'compact' ? '500px' : 'none',
                }}
              >
                {panel.id === 'alerts' && patientId && (
                  <AlertMonitor
                    patientId={patientId}
                    autoRefresh={true}
                    refreshInterval={60000}
                    enableSound={true}
                  />
                )}

                {panel.id === 'rules' && (
                  <RuleManager
                    rules={rules}
                    loading={loadingRules}
                    onRuleToggle={(ruleId, enabled) => {
                      console.log(`Toggle rule ${ruleId}: ${enabled}`);
                      // TODO: API call to update rule status
                    }}
                  />
                )}

                {panel.id === 'history' && (
                  <AlertHistory patientId={patientId} />
                )}

                {panel.id === 'analytics' && (
                  <AnalyticsDashboard />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-2">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>
              {enabledPanels.length} panel{enabledPanels.length !== 1 ? 's' : ''} active
            </span>
            <span>•</span>
            <span>
              {rules.length} CDS rule{rules.length !== 1 ? 's' : ''} available
            </span>
            <span>•</span>
            <span>
              {rules.filter((r) => r.enabled).length} enabled
            </span>
          </div>
          <div>
            {patientId ? `Patient: ${patientId}` : 'No patient selected'}
          </div>
        </div>
      </div>
    </div>
  );
}
