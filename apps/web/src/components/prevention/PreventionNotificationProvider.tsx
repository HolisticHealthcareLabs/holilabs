'use client';

/**
 * Prevention Notification Provider
 *
 * Integrates real-time prevention updates with toast notifications
 * Shows toast notifications for prevention plan and template changes
 */

import { ReactNode, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRealtimePreventionUpdates } from '@/hooks/useRealtimePreventionUpdates';
import { useNotifications } from '@/hooks/useNotifications';
import {
  SocketNotification,
  SocketEvent,
  NotificationPriority,
  PreventionPlanEvent,
  PreventionTemplateEvent,
  PreventionGoalEvent,
} from '@/lib/socket/events';
import NotificationToast, { Toast } from '@/components/notifications/NotificationToast';

interface PreventionNotificationProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  showToasts?: boolean;
}

/**
 * Provider component for prevention real-time notifications
 */
export default function PreventionNotificationProvider({
  children,
  autoConnect = true,
  showToasts = true,
}: PreventionNotificationProviderProps) {
  const { data: session } = useSession();
  const { showToast, dismissToast, toasts } = useNotifications(
    session?.user?.id,
    session?.user?.role === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT'
  );

  // Convert SocketNotification to Toast
  const convertToToast = useCallback((notification: SocketNotification): Omit<Toast, 'id'> => {
    // Map notification priority to toast type
    let toastType: Toast['type'] = 'info';
    if (notification.priority === NotificationPriority.HIGH || notification.priority === NotificationPriority.URGENT) {
      toastType = 'warning';
    } else if (notification.event.includes('deleted') || notification.event.includes('failed')) {
      toastType = 'error';
    } else if (notification.event.includes('created') || notification.event.includes('completed')) {
      toastType = 'success';
    }

    // Determine action href based on event type
    let href: string | undefined;
    const data = notification.data;

    if (notification.event.includes('plan:')) {
      const planData = data as PreventionPlanEvent;
      if (planData.id) {
        href = `/dashboard/prevention/plans/${planData.id}`;
      }
    } else if (notification.event.includes('template:')) {
      const templateData = data as PreventionTemplateEvent;
      if (templateData.id) {
        href = `/dashboard/prevention/templates/${templateData.id}`;
      }
    } else if (notification.event.includes('goal:')) {
      const goalData = data as PreventionGoalEvent;
      if (goalData.planId) {
        href = `/dashboard/prevention/plans/${goalData.planId}`;
      }
    }

    return {
      type: toastType,
      title: notification.title,
      message: notification.message,
      action: href ? { label: 'Ver Detalles', href } : undefined,
      duration: notification.priority === NotificationPriority.URGENT ? 10000 : 5000,
    };
  }, []);

  // Handle incoming notifications
  const handleNotification = useCallback(
    (notification: SocketNotification) => {
      if (showToasts) {
        const toast = convertToToast(notification);
        showToast(toast);
      }
    },
    [showToasts, convertToToast, showToast]
  );

  // Subscribe to prevention events
  const preventionEvents = useMemo(
    () => [
      SocketEvent.PLAN_CREATED,
      SocketEvent.PLAN_UPDATED,
      SocketEvent.PLAN_DELETED,
      SocketEvent.PLAN_STATUS_CHANGED,
      SocketEvent.TEMPLATE_CREATED,
      SocketEvent.TEMPLATE_UPDATED,
      SocketEvent.TEMPLATE_DELETED,
      SocketEvent.TEMPLATE_USED,
      SocketEvent.TEMPLATE_ACTIVATED,
      SocketEvent.TEMPLATE_DEACTIVATED,
      SocketEvent.GOAL_ADDED,
      SocketEvent.GOAL_UPDATED,
      SocketEvent.GOAL_COMPLETED,
      SocketEvent.COMMENT_ADDED,
      SocketEvent.REMINDER_CREATED,
      SocketEvent.BULK_OPERATION_COMPLETED,
    ],
    []
  );

  // Initialize real-time updates
  const { connected, socketId } = useRealtimePreventionUpdates({
    userId: session?.user?.id,
    autoConnect,
    events: preventionEvents,
    onNotification: handleNotification,
    onConnect: () => {
      console.log('✓ Prevention notifications connected');
    },
    onDisconnect: () => {
      console.log('✗ Prevention notifications disconnected');
    },
    onError: (error) => {
      console.error('Prevention notification error:', error);
      showToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Failed to connect to real-time updates',
      });
    },
  });

  return (
    <>
      {/* Show connection status in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 z-50 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
            {socketId && <span className="opacity-50">({socketId.slice(0, 8)})</span>}
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {showToasts && <NotificationToast toasts={toasts} onDismiss={dismissToast} />}

      {/* Render children */}
      {children}
    </>
  );
}

/**
 * Hook for showing prevention-specific toasts
 */
export function usePreventionToast() {
  const { showToast } = useNotifications();

  const showPlanCreated = useCallback(
    (planName: string, patientName?: string) => {
      showToast({
        type: 'success',
        title: 'Plan de Prevención Creado',
        message: `Plan "${planName}" creado${patientName ? ` para ${patientName}` : ''}`,
      });
    },
    [showToast]
  );

  const showPlanUpdated = useCallback(
    (planName: string) => {
      showToast({
        type: 'info',
        title: 'Plan Actualizado',
        message: `Plan "${planName}" ha sido actualizado`,
      });
    },
    [showToast]
  );

  const showTemplateUsed = useCallback(
    (templateName: string) => {
      showToast({
        type: 'success',
        title: 'Plantilla Utilizada',
        message: `Plantilla "${templateName}" aplicada al plan`,
      });
    },
    [showToast]
  );

  const showGoalCompleted = useCallback(
    (goalName: string) => {
      showToast({
        type: 'success',
        title: 'Meta Completada',
        message: `Meta "${goalName}" marcada como completada`,
      });
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string) => {
      showToast({
        type: 'error',
        title: 'Error',
        message,
      });
    },
    [showToast]
  );

  return {
    showPlanCreated,
    showPlanUpdated,
    showTemplateUsed,
    showGoalCompleted,
    showError,
    showToast,
  };
}
