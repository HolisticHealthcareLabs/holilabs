'use client';

/**
 * Onboarding Checklist Component
 * Professional health tech design - no emojis
 * Appears as floating circular button, expands to show checklist
 * Auto-hides when all tasks complete
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface OnboardingChecklistProps {
  autoShow?: boolean;
}

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

export default function OnboardingChecklist({ autoShow = false }: OnboardingChecklistProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPermanentlyHidden, setIsPermanentlyHidden] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: 'demo-patient',
      title: 'Create demo patient',
      description: 'Explore the platform with realistic clinical data',
      completed: false,
      action: {
        label: 'Create demo',
        href: '/onboarding',
      },
    },
    {
      id: 'invite-patient',
      title: 'Add your first patient',
      description: 'Begin by adding a patient to your practice',
      completed: false,
      action: {
        label: 'Add patient',
        href: '/dashboard/patients/new',
      },
    },
    {
      id: 'create-note',
      title: 'Create clinical note',
      description: 'Document your first consultation with AI',
      completed: false,
      action: {
        label: 'View example',
        href: '/dashboard/patients',
      },
    },
    {
      id: 'try-ai',
      title: 'Try AI assistant',
      description: 'Ask about diagnoses or drug interactions',
      completed: false,
      action: {
        label: 'Open chat',
        href: '/dashboard/ai',
      },
    },
    {
      id: 'setup-whatsapp',
      title: 'Configure WhatsApp (optional)',
      description: 'Send automated reminders to patients',
      completed: false,
      action: {
        label: 'Configure',
        href: '/dashboard/settings',
      },
    },
  ]);

  const completedCount = items.filter(item => item.completed).length;
  const progressPercentage = (completedCount / items.length) * 100;
  const allCompleted = completedCount === items.length;

  // Load completion state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('onboarding_checklist');
    const permanentlyHidden = localStorage.getItem('onboarding_checklist_hidden');
    
    if (permanentlyHidden === 'true') {
      setIsPermanentlyHidden(true);
      return;
    }

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setItems(parsed);
        
        // Check if all items are completed
        const allDone = parsed.every((item: ChecklistItem) => item.completed);
        if (!allDone) {
          // Show widget after a delay (after welcome modal)
          setTimeout(() => setIsVisible(true), 1000);
        }
      } catch (e) {
        console.error('Failed to parse onboarding state');
        setTimeout(() => setIsVisible(true), 1000);
      }
    } else {
      // First time - show after welcome modal
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  // Save state when items change
  useEffect(() => {
    localStorage.setItem('onboarding_checklist', JSON.stringify(items));
    
    // Auto-hide when all completed
    if (allCompleted && isExpanded) {
      setTimeout(() => {
        setIsExpanded(false);
        setTimeout(() => {
          setIsVisible(false);
          setIsPermanentlyHidden(true);
          localStorage.setItem('onboarding_checklist_hidden', 'true');
        }, 2000);
      }, 3000);
    }
  }, [items, allCompleted, isExpanded]);

  const handleComplete = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const getItemIcon = (id: string) => {
    switch (id) {
      case 'demo-patient': return <SparklesIcon />;
      case 'invite-patient': return <UserIcon />;
      case 'create-note': return <DocumentIcon />;
      case 'try-ai': return <ChatIcon />;
      case 'setup-whatsapp': return <PhoneIcon />;
      default: return <CheckIcon />;
    }
  };

  // Don't render if permanently hidden
  if (isPermanentlyHidden || !isVisible) {
    return null;
  }

  // Floating circular button (collapsed state)
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#014751] hover:bg-[#014751]/90 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-all z-40 group"
        title="Getting started checklist"
      >
        <div className="relative">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          {completedCount > 0 && completedCount < items.length && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-[#014751] text-xs font-bold rounded-full flex items-center justify-center">
              {completedCount}
            </span>
          )}
        </div>
      </button>
    );
  }

  // Expanded checklist panel
  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-40 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-[#014751] text-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Getting Started</h3>
          <button
            onClick={() => setIsExpanded(false)}
            aria-label="Minimize checklist"
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{completedCount} of {items.length} completed</span>
            <span className="font-semibold">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-1.5">
            <div
              className="bg-white h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="p-4 space-y-2.5 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className={`border rounded-lg p-3.5 transition-all ${
              item.completed
                ? 'bg-gray-50 border-gray-200 opacity-60'
                : 'bg-white border-gray-200 hover:border-[#014751] hover:shadow-sm'
            }`}
          >
            <div className="flex items-start space-x-3">
              {/* Checkbox */}
              <button
                onClick={() => handleComplete(item.id)}
                className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                  item.completed
                    ? 'bg-[#014751] border-[#014751]'
                    : 'border-gray-300 hover:border-[#014751]'
                }`}
              >
                {item.completed && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`${item.completed ? 'text-gray-400' : 'text-[#014751]'}`}>
                    {getItemIcon(item.id)}
                  </span>
                  <h4 className={`font-medium text-sm ${
                    item.completed ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}>
                    {item.title}
                  </h4>
                </div>
                <p className="text-xs text-gray-600 mb-2 ml-7">{item.description}</p>

                {/* Action Button */}
                {item.action && !item.completed && (
                  item.action.href ? (
                    <Link
                      href={item.action.href}
                      className="inline-flex items-center ml-7 text-xs font-medium text-[#014751] hover:text-[#014751]/80 transition"
                    >
                      {item.action.label}
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ) : (
                    <button
                      onClick={item.action.onClick}
                      className="inline-flex items-center ml-7 text-xs font-medium text-[#014751] hover:text-[#014751]/80 transition"
                    >
                      {item.action.label}
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer - Success State */}
      {allCompleted && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200 p-4 text-center">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-semibold text-green-900 mb-1">Setup complete!</p>
          <p className="text-xs text-green-700">
            You're ready to use Holi Labs
          </p>
        </div>
      )}
    </div>
  );
}
