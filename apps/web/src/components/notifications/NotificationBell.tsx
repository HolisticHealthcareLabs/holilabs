'use client';

/**
 * NotificationBell — Step 1
 *
 * Bell SVG icon with unread count badge for dashboard header.
 * Toggles NotificationPanel visibility on click.
 * Design-token-only. 44px touch target. Accessible.
 */

import { useTranslations } from 'next-intl';

interface NotificationBellProps {
  unreadCount: number;
  isOpen: boolean;
  onClick: () => void;
}

export function NotificationBell({ unreadCount, isOpen, onClick }: NotificationBellProps) {
  const t = useTranslations('notifications');

  return (
    <button
      onClick={onClick}
      aria-label={unreadCount > 0 ? t('bell', { count: unreadCount }) : t('panelTitle')}
      aria-haspopup="true"
      aria-expanded={isOpen}
      className="relative flex items-center justify-center"
      style={{
        width: 'var(--touch-md)',
        height: 'var(--touch-md)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-secondary)',
        transition: 'color 0.15s',
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute flex items-center justify-center font-bold"
          style={{
            top: '2px',
            right: '2px',
            minWidth: '16px',
            height: '16px',
            padding: '0 4px',
            borderRadius: '9999px',
            fontSize: '10px',
            lineHeight: 1,
            background: 'var(--severity-critical)',
            color: '#fff',
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export default NotificationBell;
