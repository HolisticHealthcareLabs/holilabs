'use client';

/**
 * PREVENTION HUB SIDEBAR for AI COPILOT
 *
 * Real-time prevention protocol suggestions during clinical meetings.
 * Automatically detects conditions and suggests evidence-based interventions
 * from international guidelines (WHO, NHS, ESC, RACGP, CTF, NASCC).
 *
 * Features:
 * - Real-time condition detection from clinical notes
 * - Protocol suggestion cards with one-click application
 * - Subtle blinking notification when new protocols available
 * - Integration with AI copilot view
 */

import { useState, useEffect } from 'react';
import {
  Shield,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Star,
  Activity,
  FileText,
  Stethoscope,
  Calendar,
  FileText as BookIcon,
  TrendingUp,
} from 'lucide-react';
import { DetectedCondition, detectConditionsForPatient } from '@/lib/prevention/condition-detection';
import {
  PreventionProtocol,
  getApplicableProtocols,
  ProtocolPriority,
} from '@/lib/prevention/international-protocols';

interface PreventionHubSidebarProps {
  patientId: string;
  patientData?: {
    age?: number;
    gender?: 'male' | 'female';
    isPregnant?: boolean;
    labValues?: Record<string, number>;
  };
  clinicalNote?: string;
  medications?: Array<{ name: string; startDate?: Date }>;
  icd10Codes?: string[];
  onProtocolApply?: (protocol: PreventionProtocol) => void;
  onViewFullHub?: () => void;
}

export function PreventionHubSidebar({
  patientId,
  patientData,
  clinicalNote,
  medications,
  icd10Codes,
  onProtocolApply,
  onViewFullHub,
}: PreventionHubSidebarProps) {
  const [detectedConditions, setDetectedConditions] = useState<DetectedCondition[]>([]);
  const [suggestedProtocols, setSuggestedProtocols] = useState<PreventionProtocol[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasNewProtocols, setHasNewProtocols] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<DetectedCondition | null>(null);

  // Real-time condition detection
  useEffect(() => {
    const detectConditions = async () => {
      const conditions = await detectConditionsForPatient({
        clinicalNote,
        medications,
        icd10Codes,
      });

      setDetectedConditions(conditions);

      // Get applicable protocols for all detected conditions
      const protocols: PreventionProtocol[] = [];
      for (const condition of conditions) {
        const conditionProtocols = getApplicableProtocols(
          condition.name.toLowerCase().replace(/ /g, '_'),
          patientData || {}
        );
        protocols.push(...conditionProtocols);
      }

      // Remove duplicates
      const uniqueProtocols = protocols.filter(
        (p, index, self) => index === self.findIndex((t) => t.id === p.id)
      );

      // Sort by priority
      uniqueProtocols.sort((a, b) => {
        const priorityOrder: Record<ProtocolPriority, number> = {
          CRITICAL: 0,
          HIGH: 1,
          MEDIUM: 2,
          LOW: 3,
        };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setSuggestedProtocols(uniqueProtocols);

      // Trigger notification if new protocols available
      if (uniqueProtocols.length > suggestedProtocols.length) {
        setHasNewProtocols(true);
        setTimeout(() => setHasNewProtocols(false), 5000); // Reset after 5 seconds
      }
    };

    if (clinicalNote || medications || icd10Codes) {
      detectConditions();
    }
  }, [clinicalNote, medications, icd10Codes, patientData]);

  const getPriorityColor = (priority: ProtocolPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-300 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
      case 'HIGH':
        return 'bg-orange-50 border-orange-300 text-orange-900 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200';
      case 'LOW':
        return 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
    }
  };

  const getPriorityBadgeColor = (priority: ProtocolPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-600 text-white';
      case 'HIGH':
        return 'bg-orange-600 text-white';
      case 'MEDIUM':
        return 'bg-yellow-600 text-white';
      case 'LOW':
        return 'bg-blue-600 text-white';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medication':
        return <Activity className="w-4 h-4" />;
      case 'screening':
        return <Activity className="w-4 h-4" />;
      case 'monitoring':
        return <TrendingUp className="w-4 h-4" />;
      case 'lifestyle':
        return <Stethoscope className="w-4 h-4" />;
      case 'education':
        return <BookIcon className="w-4 h-4" />;
      case 'referral':
        return <ChevronRight className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  if (!isExpanded && detectedConditions.length === 0 && suggestedProtocols.length === 0) {
    return (
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-40">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gradient-to-br from-green-500 to-green-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
          title="Prevention Hub"
        >
          <Shield className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed right-0 top-0 h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-2xl transition-all duration-300 z-50 overflow-hidden ${
        isExpanded ? 'w-96' : 'w-16'
      }`}
    >
      {/* Collapsed View - Icon with Notification Badge */}
      {!isExpanded && (
        <div className="flex flex-col items-center py-4 space-y-4">
          <button
            onClick={() => setIsExpanded(true)}
            className={`relative p-3 rounded-full transition-all ${
              hasNewProtocols
                ? 'bg-green-500 text-white animate-pulse shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title="Prevention Hub"
          >
            <Shield className="w-6 h-6" />
            {suggestedProtocols.length > 0 && (
              <span
                className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                  hasNewProtocols
                    ? 'bg-red-500 text-white animate-bounce'
                    : 'bg-red-500 text-white'
                }`}
              >
                {suggestedProtocols.length}
              </span>
            )}
          </button>

          {detectedConditions.length > 0 && (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-0.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
              <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                {detectedConditions.length}
              </span>
              {/* Decorative - low contrast intentional for collapsed sidebar label */}
              <span className="text-xs text-gray-500 dark:text-gray-500 rotate-90 whitespace-nowrap origin-center">
                Conditions
              </span>
            </div>
          )}
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <div>
                <h3 className="font-bold text-sm">Prevention Hub</h3>
                <p className="text-xs text-green-100">International Guidelines</p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-green-500 rounded transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Notification Bar */}
          {hasNewProtocols && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 p-3 flex items-center space-x-2 animate-pulse">
              <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">
                New prevention protocols available
              </span>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Detected Conditions */}
            {detectedConditions.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-blue-600" />
                  Detected Conditions ({detectedConditions.length})
                </h4>
                <div className="space-y-2">
                  {detectedConditions.slice(0, 5).map((condition) => (
                    <button
                      key={condition.id}
                      onClick={() => setSelectedCondition(condition)}
                      className="w-full text-left p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {condition.name}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 rounded">
                          {condition.confidence}%
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="capitalize">{condition.category.replace('_', ' ')}</span>
                        <span>•</span>
                        <span className="capitalize">{condition.detectedFrom.replace('_', ' ')}</span>
                      </div>
                    </button>
                  ))}
                  {detectedConditions.length > 5 && (
                    <button
                      onClick={onViewFullHub}
                      className="w-full text-sm text-green-600 dark:text-green-400 hover:underline"
                    >
                      View all {detectedConditions.length} conditions →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Suggested Protocols */}
            {suggestedProtocols.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  Suggested Protocols ({suggestedProtocols.length})
                </h4>
                <div className="space-y-3">
                  {suggestedProtocols.slice(0, 3).map((protocol) => (
                    <div
                      key={protocol.id}
                      className={`border-2 rounded-lg p-3 ${getPriorityColor(protocol.priority)}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${getPriorityBadgeColor(
                                protocol.priority
                              )}`}
                            >
                              {protocol.priority}
                            </span>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {protocol.source} {protocol.guidelineVersion}
                            </span>
                          </div>
                          <h5 className="font-bold text-sm mb-1">{protocol.name}</h5>
                          <p className="text-xs leading-relaxed">{protocol.description}</p>
                        </div>
                      </div>

                      {/* Interventions Preview */}
                      <div className="mt-3 space-y-2">
                        {protocol.interventions.slice(0, 2).map((intervention, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-xs">
                            <div className="text-gray-600 dark:text-gray-400 mt-0.5">
                              {getCategoryIcon(intervention.category)}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{intervention.intervention}</p>
                              {intervention.frequency && (
                                <p className="text-gray-600 dark:text-gray-400 italic">
                                  {intervention.frequency}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {protocol.interventions.length > 2 && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                            +{protocol.interventions.length - 2} more interventions
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-3 flex items-center space-x-2">
                        <button
                          onClick={() => onProtocolApply && onProtocolApply(protocol)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded transition-colors"
                        >
                          Apply Protocol
                        </button>
                        {protocol.guidelineUrl && (
                          <a
                            href={protocol.guidelineUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            title="View Guideline"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  {suggestedProtocols.length > 3 && (
                    <button
                      onClick={onViewFullHub}
                      className="w-full text-sm text-green-600 dark:text-green-400 hover:underline font-medium"
                    >
                      View all {suggestedProtocols.length} protocols →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* No Protocols */}
            {detectedConditions.length === 0 && suggestedProtocols.length === 0 && (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  No conditions detected yet
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Start typing clinical notes to get prevention protocol suggestions
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={onViewFullHub}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center justify-center space-x-2"
            >
              <Shield className="w-4 h-4" />
              <span>Open Full Prevention Hub</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
