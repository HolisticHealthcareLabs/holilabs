'use client';

import { useState } from 'react';

export type NotificationMode = 'all' | 'important' | 'silent';

export function useNotificationMode() {
  const [mode, setMode] = useState<NotificationMode>('all');

  return { mode, setMode };
}

export default useNotificationMode;
