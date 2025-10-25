"use strict";
/**
 * Chat List Component
 *
 * Shows list of conversations with unread counts
 * Industry-grade design with smooth animations
 */
'use client';
/**
 * Chat List Component
 *
 * Shows list of conversations with unread counts
 * Industry-grade design with smooth animations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChatList;
const framer_motion_1 = require("framer-motion");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
function ChatList({ conversations, selectedConversationId, onSelectConversation, isLoading = false, }) {
    if (isLoading) {
        return (<div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"/>
      </div>);
    }
    if (conversations.length === 0) {
        return (<div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay conversaciones
        </h3>
        <p className="text-sm text-gray-500">
          Las conversaciones aparecerán aquí cuando recibas mensajes
        </p>
      </div>);
    }
    return (<div className="h-full overflow-y-auto">
      <div className="divide-y divide-gray-100">
        {conversations.map((conversation, index) => {
            const isSelected = conversation.id === selectedConversationId;
            const displayName = conversation.patientName || conversation.clinicianName || 'Desconocido';
            const initials = displayName
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
            return (<framer_motion_1.motion.button key={conversation.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} onClick={() => onSelectConversation(conversation.id)} className={`w-full flex items-start gap-3 p-4 text-left transition-all hover:bg-gray-50 ${isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}>
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${conversation.patientName
                    ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                    : 'bg-gradient-to-br from-green-400 to-green-600'}`}>
                  {initials}
                </div>
                {conversation.unreadCount > 0 && (<div className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                  </div>)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className={`font-semibold truncate ${conversation.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                    {displayName}
                  </h3>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {(0, date_fns_1.formatDistanceToNow)(new Date(conversation.lastMessageAt), {
                    addSuffix: true,
                    locale: locale_1.es,
                })}
                  </span>
                </div>
                <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                  {conversation.lastMessage}
                </p>
              </div>
            </framer_motion_1.motion.button>);
        })}
      </div>
    </div>);
}
//# sourceMappingURL=ChatList.js.map