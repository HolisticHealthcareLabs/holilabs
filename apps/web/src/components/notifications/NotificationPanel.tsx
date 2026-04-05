'use client';

import { useRef, useEffect } from 'react';

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
  type?: string;
  actionUrl?: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 z-50 w-80 max-h-96 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</span>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          No notifications
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {notifications.map((n) => (
            <li
              key={n.id}
              onClick={() => !n.read && onMarkRead(n.id)}
              className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                !n.read ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                {!n.read && (
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {n.body}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
