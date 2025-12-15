'use client';

/**
 * Notifications Tile
 * Real-time alerts and system notifications
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import CommandCenterTile from './CommandCenterTile';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationsTileProps {
  tileId?: string;
  initialNotifications?: Notification[];
}

export default function NotificationsTile({
  tileId = 'notifications-tile',
  initialNotifications = [],
}: NotificationsTileProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | NotificationType>('all');

  useEffect(() => {
    // Simulate notifications
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'warning',
        title: 'Lab Results Ready',
        message: 'Patient blood work results are available for review',
        timestamp: new Date(Date.now() - 5 * 60000),
        read: false,
      },
      {
        id: '2',
        type: 'info',
        title: 'Appointment Reminder',
        message: 'Next patient in 15 minutes',
        timestamp: new Date(Date.now() - 10 * 60000),
        read: false,
      },
      {
        id: '3',
        type: 'success',
        title: 'SOAP Note Saved',
        message: 'Clinical documentation saved successfully',
        timestamp: new Date(Date.now() - 20 * 60000),
        read: true,
      },
    ];

    setNotifications(mockNotifications);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => n.type === filter);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />;
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-600" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <CommandCenterTile
      id={tileId}
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
icon={
        <div className="relative">
          <motion.div
            animate={unreadCount > 0 ? { rotate: [0, -15, 15, -15, 0] } : {}}
            transition={{ duration: 0.5, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 3 }}
          >
            <BellIcon className="w-6 h-6 text-indigo-600" />
          </motion.div>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <span className="text-[10px] text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </motion.div>
          )}
        </div>
      }
      size="medium"
      variant="glass"
      isDraggable={true}
      isActive={unreadCount > 0}
    >
      <div className="space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'info', 'success', 'warning', 'error'] as const).map((type, index) => (
            <motion.button
              key={type}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setFilter(type)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap shadow-sm ${
                filter === type
                  ? 'bg-blue-500 text-white shadow-blue-500/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </motion.button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="max-h-[300px] overflow-y-auto space-y-2">
          <AnimatePresence>
            {filteredNotifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notifications</p>
              </motion.div>
            ) : (
              filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  className={`p-3 rounded-xl border-2 transition ${getNotificationColor(
                    notification.type
                  )} ${notification.read ? 'opacity-60' : 'shadow-sm'}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: index * 0.05 + 0.1, type: 'spring', damping: 15 }}
                      className="flex-shrink-0 mt-0.5"
                    >
                      {getNotificationIcon(notification.type)}
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {notification.title}
                        </h4>
                        <motion.button
                          onClick={() => handleDismiss(notification.id)}
                          whileHover={{ scale: 1.2, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          className="flex-shrink-0 p-0.5 hover:bg-gray-200 rounded transition"
                        >
                          <XMarkIcon className="w-4 h-4 text-gray-500" />
                        </motion.button>
                      </div>

                      <p className="text-xs text-gray-600 mb-2">{notification.message}</p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(notification.timestamp)}
                        </span>

                        {!notification.read && (
                          <motion.button
                            onClick={() => handleMarkAsRead(notification.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Mark as read
                          </motion.button>
                        )}
                      </div>

                      {notification.actionLabel && (
                        <motion.button
                          onClick={notification.onAction}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="mt-2 w-full px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium transition shadow-sm"
                        >
                          {notification.actionLabel}
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2"
          >
            {unreadCount > 0 && (
              <motion.button
                onClick={handleMarkAllAsRead}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium transition shadow-sm"
              >
                Mark all read
              </motion.button>
            )}
            <motion.button
              onClick={handleClearAll}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(156, 163, 175, 0.15)' }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-xs font-medium transition shadow-sm"
            >
              Clear all
            </motion.button>
          </motion.div>
        )}
      </div>
    </CommandCenterTile>
  );
}
