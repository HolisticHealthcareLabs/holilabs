/**
 * Chat Thread Component
 *
 * Shows messages in a conversation thread
 * Industry-grade design with read receipts and typing indicators
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import FileAttachmentDisplay from './FileAttachment';

interface Message {
  id: string;
  fromUserId: string;
  fromUserType: 'CLINICIAN' | 'PATIENT';
  toUserId: string;
  toUserType: 'CLINICIAN' | 'PATIENT';
  body: string;
  attachments?: any;
  readAt: Date | null;
  createdAt: Date;
}

interface ChatThreadProps {
  messages: Message[];
  currentUserId: string;
  currentUserType: 'CLINICIAN' | 'PATIENT';
  recipientName: string;
  isTyping?: boolean;
  isLoading?: boolean;
}

export default function ChatThread({
  messages,
  currentUserId,
  currentUserType,
  recipientName,
  isTyping = false,
  isLoading = false,
}: ChatThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: es });
    } else if (isYesterday(date)) {
      return `Ayer ${format(date, 'HH:mm', { locale: es })}`;
    } else {
      return format(date, 'dd MMM HH:mm', { locale: es });
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Inicia una conversación
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Envía un mensaje a {recipientName} para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <AnimatePresence>
        {messages.map((message, index) => {
          const isSentByMe = message.fromUserId === currentUserId && message.fromUserType === currentUserType;
          const isRead = message.readAt !== null;

          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.02 }}
              className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] ${isSentByMe ? 'order-2' : 'order-1'}`}>
                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    isSentByMe
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}
                >
                  {/* Message text */}
                  {message.body && (
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.body}
                    </p>
                  )}

                  {/* File attachments */}
                  {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
                    <div className={`space-y-2 ${message.body ? 'mt-2' : ''}`}>
                      {message.attachments.map((attachment: any, idx: number) => (
                        <FileAttachmentDisplay
                          key={idx}
                          attachment={attachment}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamp and read receipt */}
                <div className={`flex items-center gap-1.5 mt-1 px-2 ${
                  isSentByMe ? 'justify-end' : 'justify-start'
                }`}>
                  {/* Decorative - low contrast intentional for timestamp metadata */}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatMessageDate(new Date(message.createdAt))}
                  </span>
                  {isSentByMe && (
                    <div className="flex items-center">
                      {isRead ? (
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                          <path d="M12.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L4 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Typing indicator */}
      {isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex justify-start"
        >
          <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </motion.div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
