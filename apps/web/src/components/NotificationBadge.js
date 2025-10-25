"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationBadge = NotificationBadge;
/**
 * Notification Badge Component
 * Shows unread notification count in navigation
 */
const react_1 = require("react");
const outline_1 = require("@heroicons/react/24/outline");
const navigation_1 = require("next/navigation");
function NotificationBadge() {
    const router = (0, navigation_1.useRouter)();
    const [unreadCount, setUnreadCount] = (0, react_1.useState)(0);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        fetchUnreadCount();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);
    const fetchUnreadCount = async () => {
        try {
            const response = await fetch('/api/portal/notifications?unreadOnly=true&limit=1');
            const data = await response.json();
            if (data.success && data.data) {
                setUnreadCount(data.data.unreadCount);
            }
        }
        catch (error) {
            console.error('Error fetching unread count:', error);
        }
        finally {
            setLoading(false);
        }
    };
    return (<button onClick={() => router.push('/portal/dashboard/notifications')} className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Notificaciones">
      <outline_1.BellIcon className="h-6 w-6"/>
      {unreadCount > 0 && (<span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>)}
    </button>);
}
//# sourceMappingURL=NotificationBadge.js.map