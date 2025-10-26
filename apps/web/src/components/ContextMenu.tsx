'use client';

/**
 * Context Menu Component
 *
 * Right-click context menu for quick actions
 *
 * Features:
 * - Right-click to open
 * - Keyboard navigation
 * - Nested menus
 * - Icons and shortcuts
 * - Dividers
 * - Disabled items
 */

import { Fragment, useState, useEffect, useRef } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { CheckIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action?: () => void;
  href?: string;
  disabled?: boolean;
  checked?: boolean;
  danger?: boolean;
  divider?: boolean;
  submenu?: MenuItem[];
}

interface ContextMenuProps {
  /** Menu items */
  items: MenuItem[];

  /** Children to render (trigger element) */
  children: React.ReactNode;

  /** Custom trigger (if not right-click) */
  trigger?: 'click' | 'right-click';

  /** Align menu */
  align?: 'left' | 'right';
}

export function ContextMenu({
  items,
  children,
  trigger = 'right-click',
  align = 'right',
}: ContextMenuProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  /**
   * Handle right-click
   */
  const handleContextMenu = (e: React.MouseEvent) => {
    if (trigger !== 'right-click') return;

    e.preventDefault();
    e.stopPropagation();

    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  };

  /**
   * Handle click
   */
  const handleClick = (e: React.MouseEvent) => {
    if (trigger !== 'click') return;

    e.preventDefault();
    e.stopPropagation();

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        x: align === 'right' ? rect.right : rect.left,
        y: rect.bottom,
      });
      setIsOpen(true);
    }
  };

  /**
   * Close menu on outside click
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = () => {
      setIsOpen(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  /**
   * Close menu on scroll
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      setIsOpen(false);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  /**
   * Handle menu item click
   */
  const handleItemClick = (item: MenuItem) => {
    if (item.disabled) return;

    if (item.action) {
      item.action();
    }

    if (item.href) {
      window.location.href = item.href;
    }

    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Element */}
      <div
        ref={triggerRef}
        onContextMenu={handleContextMenu}
        onClick={trigger === 'click' ? handleClick : undefined}
      >
        {children}
      </div>

      {/* Context Menu */}
      <Transition
        show={isOpen}
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <div
          className="fixed z-50"
          style={{
            left: position?.x,
            top: position?.y,
          }}
        >
          <div className="w-56 rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
            <div className="py-1">
              {items.map((item, index) => (
                <Fragment key={item.id || index}>
                  {item.divider ? (
                    <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                  ) : (
                    <button
                      onClick={() => handleItemClick(item)}
                      disabled={item.disabled}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2 text-sm text-left
                        ${item.disabled
                          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : item.danger
                          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                        transition-colors
                      `}
                    >
                      {/* Icon */}
                      {item.icon && (
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                      )}

                      {/* Label */}
                      <span className="flex-1">{item.label}</span>

                      {/* Checked */}
                      {item.checked && (
                        <CheckIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}

                      {/* Shortcut */}
                      {item.shortcut && !item.submenu && (
                        <kbd className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {formatShortcut(item.shortcut)}
                        </kbd>
                      )}

                      {/* Submenu Arrow */}
                      {item.submenu && (
                        <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </Transition>
    </>
  );
}

/**
 * Patient Context Menu
 *
 * Pre-configured context menu for patient actions
 */
interface PatientContextMenuProps {
  patientId: string;
  patientName: string;
  children: React.ReactNode;
  onAction?: (action: string) => void;
}

export function PatientContextMenu({
  patientId,
  patientName,
  children,
  onAction,
}: PatientContextMenuProps) {
  const items: MenuItem[] = [
    {
      id: 'view',
      label: 'View Patient',
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      action: () => {
        window.location.href = `/dashboard/patients/${patientId}`;
        onAction?.('view');
      },
    },
    {
      id: 'divider-1',
      label: '',
      divider: true,
    },
    {
      id: 'create-note',
      label: 'Create SOAP Note',
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      shortcut: 'cmd+n',
      action: () => {
        console.log('Create SOAP note for', patientId);
        onAction?.('create-note');
      },
    },
    {
      id: 'schedule-appointment',
      label: 'Schedule Appointment',
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      action: () => {
        console.log('Schedule appointment for', patientId);
        onAction?.('schedule-appointment');
      },
    },
    {
      id: 'prescribe',
      label: 'Prescribe Medication',
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      action: () => {
        console.log('Prescribe for', patientId);
        onAction?.('prescribe');
      },
    },
    {
      id: 'divider-2',
      label: '',
      divider: true,
    },
    {
      id: 'export',
      label: 'Export Records',
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: () => {
        console.log('Export records for', patientId);
        onAction?.('export');
      },
    },
    {
      id: 'print',
      label: 'Print Summary',
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      ),
      shortcut: 'cmd+p',
      action: () => {
        console.log('Print for', patientId);
        onAction?.('print');
      },
    },
  ];

  return (
    <ContextMenu items={items} trigger="right-click">
      {children}
    </ContextMenu>
  );
}
