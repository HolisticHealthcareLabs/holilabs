'use client';

/**
 * Activity Feed Component
 *
 * Displays a timeline of recent prevention-related activities
 * Now with real-time WebSocket updates!
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  FileText,
  Copy,
  Edit2,
  CheckCircle2,
  Target,
  AlertCircle,
  TrendingUp,
  User,
} from 'lucide-react';
import { SignalIcon as Wifi, SignalSlashIcon as WifiOff } from '@heroicons/react/24/outline';
import { useRealtimePreventionUpdates } from '@/hooks/useRealtimePreventionUpdates';
import {
  SocketNotification,
  PreventionPlanEvent,
  PreventionTemplateEvent,
  PreventionGoalEvent,
} from '@/lib/socket/events';

export interface ActivityItem {
  id: string;
  type: 'plan_created' | 'plan_updated' | 'plan_deleted' | 'template_used' | 'template_created' | 'status_changed' | 'goal_added' | 'recommendation_added';
  title: string;
  description: string;
  userId: string;
  userName?: string;
  resourceType: 'prevention_plan' | 'prevention_template';
  resourceId: string;
  resourceName?: string;
  metadata?: any;
  timestamp: string | Date;
}

interface ActivityFeedProps {
  resourceType?: 'plan' | 'template';
  resourceId?: string;
  limit?: number;
  showHeader?: boolean;
  maxHeight?: string;
  enableRealtime?: boolean;
}

export default function ActivityFeed({
  resourceType,
  resourceId,
  limit = 20,
  showHeader = true,
  maxHeight = '600px',
  enableRealtime = true,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newActivityCount, setNewActivityCount] = useState(0);

  // Convert SocketNotification to ActivityItem
  const convertNotificationToActivity = useCallback((notification: SocketNotification): ActivityItem | null => {
    try {
      const data = notification.data;
      let activityType: ActivityItem['type'] = 'plan_updated';
      let resourceTypeName: 'prevention_plan' | 'prevention_template' = 'prevention_plan';
      let resourceName = '';
      let description = notification.message;

      // Determine activity type and resource info based on event
      if (notification.event.includes('plan:created')) {
        activityType = 'plan_created';
        resourceTypeName = 'prevention_plan';
        const planData = data as PreventionPlanEvent;
        resourceName = planData.planName;
      } else if (notification.event.includes('plan:updated')) {
        activityType = 'plan_updated';
        resourceTypeName = 'prevention_plan';
        const planData = data as PreventionPlanEvent;
        resourceName = planData.planName;
      } else if (notification.event.includes('plan:deleted')) {
        activityType = 'plan_deleted';
        resourceTypeName = 'prevention_plan';
        const planData = data as PreventionPlanEvent;
        resourceName = planData.planName;
      } else if (notification.event.includes('plan:status_changed')) {
        activityType = 'status_changed';
        resourceTypeName = 'prevention_plan';
        const planData = data as PreventionPlanEvent;
        resourceName = planData.planName;
      } else if (notification.event.includes('template:created')) {
        activityType = 'template_created';
        resourceTypeName = 'prevention_template';
        const templateData = data as PreventionTemplateEvent;
        resourceName = templateData.templateName;
      } else if (notification.event.includes('template:used')) {
        activityType = 'template_used';
        resourceTypeName = 'prevention_template';
        const templateData = data as PreventionTemplateEvent;
        resourceName = templateData.templateName;
      } else if (notification.event.includes('goal:added')) {
        activityType = 'goal_added';
        resourceTypeName = 'prevention_plan';
        const goalData = data as PreventionGoalEvent;
        resourceName = goalData.planName || '';
      } else {
        // Skip unknown event types
        return null;
      }

      return {
        id: notification.id,
        type: activityType,
        title: notification.title,
        description,
        userId: notification.userId || data.userId || '',
        userName: notification.userName || data.userName,
        resourceType: resourceTypeName,
        resourceId: data.id || data.planId || data.templateId || '',
        resourceName,
        metadata: data,
        timestamp: notification.timestamp,
      };
    } catch (error) {
      console.error('Error converting notification to activity:', error);
      return null;
    }
  }, []);

  // Handle incoming real-time notifications
  const handleRealtimeNotification = useCallback(
    (notification: SocketNotification) => {
      const activity = convertNotificationToActivity(notification);
      if (!activity) return;

      // Add to activities list (prepend to show most recent first)
      setActivities((prev) => {
        // Avoid duplicates
        if (prev.some((a) => a.id === activity.id)) {
          return prev;
        }

        // Add new activity and limit to specified count
        const updated = [activity, ...prev].slice(0, limit);
        return updated;
      });

      // Increment new activity counter
      setNewActivityCount((prev) => prev + 1);
    },
    [convertNotificationToActivity, limit]
  );

  // Initialize real-time updates
  const { connected } = useRealtimePreventionUpdates({
    autoConnect: enableRealtime,
    onNotification: handleRealtimeNotification,
  });

  useEffect(() => {
    fetchActivities();
  }, [resourceType, resourceId, limit]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      if (resourceType) params.set('resourceType', resourceType);
      if (resourceId) params.set('resourceId', resourceId);

      const response = await fetch(`/api/prevention/activity?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch activities');
      }

      if (result.success) {
        setActivities(result.data.activities);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'plan_created':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'plan_updated':
        return <Edit2 className="w-5 h-5 text-yellow-500" />;
      case 'plan_deleted':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'template_used':
        return <Copy className="w-5 h-5 text-green-500" />;
      case 'template_created':
        return <FileText className="w-5 h-5 text-purple-500" />;
      case 'status_changed':
        return <CheckCircle2 className="w-5 h-5 text-indigo-500" />;
      case 'goal_added':
        return <Target className="w-5 h-5 text-orange-500" />;
      case 'recommendation_added':
        return <TrendingUp className="w-5 h-5 text-teal-500" />;
      default:
        {/* Decorative - low contrast intentional for default icon */}
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;

    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {showHeader && (
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Actividad Reciente
            </h3>
          </div>
        )}
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {showHeader && (
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Actividad Reciente
            </h3>
          </div>
        )}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Error al cargar actividades
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Actividad Reciente
            </h3>
            {enableRealtime && (
              <div className="flex items-center space-x-1.5" title={connected ? 'Conectado en tiempo real' : 'Desconectado'}>
                {connected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-gray-400" />
                )}
              </div>
            )}
            {newActivityCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {newActivityCount} nueva{newActivityCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {/* Decorative - low contrast intentional for count badge */}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {activities.length} actividad{activities.length !== 1 ? 'es' : ''}
          </span>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            No hay actividad reciente
          </p>
        </div>
      ) : (
        <div
          className="space-y-4 overflow-y-auto"
          style={{ maxHeight }}
        >
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className={`flex items-start space-x-3 pb-4 ${
                index < activities.length - 1
                  ? 'border-b border-gray-100 dark:border-gray-700'
                  : ''
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {activity.description}
                    </p>
                    {activity.userName && (
                      <div className="flex items-center space-x-1 mt-1">
                        {/* Decorative - low contrast intentional for metadata */}
                        <User className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.userName}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Decorative - low contrast intentional for timestamp */}
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-4">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
