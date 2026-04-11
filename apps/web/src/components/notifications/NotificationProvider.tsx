'use client';

/**
 * NotificationProvider — Step 5
 *
 * Wraps dashboard children with the ToastProvider.
 * The NotificationCenter (bell + panel) is rendered separately
 * in the sidebar via the existing layout slot.
 */

import { ReactNode } from 'react';
import { ToastProvider } from './NotificationToast';

interface NotificationProviderProps {
  children: ReactNode;
}

export default function NotificationProvider({ children }: NotificationProviderProps) {
  return <ToastProvider>{children}</ToastProvider>;
}
