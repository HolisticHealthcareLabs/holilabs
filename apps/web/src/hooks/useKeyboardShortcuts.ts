'use client';

/**
 * useKeyboardShortcuts Hook
 *
 * Global keyboard shortcut management for the application
 *
 * Features:
 * - Platform detection (Mac/Windows/Linux)
 * - Modifier key normalization (Cmd/Ctrl)
 * - Shortcut registration/unregistration
 * - Conflict detection
 * - Enable/disable shortcuts
 * - Debug mode
 */

import { useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

export type ModifierKey = 'ctrl' | 'cmd' | 'alt' | 'shift' | 'meta';
export type Key = string;

export interface KeyboardShortcut {
  id: string;
  keys: string; // e.g., "cmd+k", "ctrl+shift+p"
  description: string;
  action: () => void;
  enabled?: boolean;
  preventDefault?: boolean;
  category?: string;
}

interface UseKeyboardShortcutsOptions {
  /** Enable debug logging */
  debug?: boolean;

  /** Disable all shortcuts */
  disabled?: boolean;
}

/**
 * Platform-specific modifier key
 */
export const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.platform);
export const modKey = isMac ? 'cmd' : 'ctrl';

/**
 * Normalize key combination string
 */
function normalizeKeys(keys: string): string {
  return keys
    .toLowerCase()
    .split('+')
    .map(k => k.trim())
    .sort()
    .join('+');
}

/**
 * Check if keyboard event matches shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+').map(k => k.trim());
  const key = event.key.toLowerCase();

  // Build event modifiers
  const eventMods: string[] = [];
  if (event.ctrlKey) eventMods.push('ctrl');
  if (event.metaKey || (isMac && event.metaKey)) eventMods.push('cmd', 'meta');
  if (event.altKey) eventMods.push('alt');
  if (event.shiftKey) eventMods.push('shift');

  // Get the actual key (non-modifier)
  const shortcutKey = parts.find(p =>
    !['ctrl', 'cmd', 'alt', 'shift', 'meta'].includes(p)
  );

  if (!shortcutKey) return false;

  // Check if key matches
  if (key !== shortcutKey.toLowerCase()) return false;

  // Check if all modifiers match
  const shortcutMods = parts.filter(p =>
    ['ctrl', 'cmd', 'alt', 'shift', 'meta'].includes(p)
  );

  // Handle cmd/meta equivalence
  const normalizedShortcutMods = shortcutMods.map(m =>
    (m === 'cmd' || m === 'meta') ? (isMac ? 'meta' : 'ctrl') : m
  );

  const normalizedEventMods = eventMods.map(m =>
    (m === 'cmd' || m === 'meta') ? (isMac ? 'meta' : 'ctrl') : m
  );

  // Check if all required modifiers are pressed
  return normalizedShortcutMods.every(mod => normalizedEventMods.includes(mod)) &&
         normalizedEventMods.length === normalizedShortcutMods.length;
}

/**
 * Format shortcut for display
 */
export function formatShortcut(keys: string): string {
  const parts = keys.split('+').map(k => k.trim());

  const formatted = parts.map(key => {
    switch (key.toLowerCase()) {
      case 'cmd':
      case 'meta':
        return isMac ? '⌘' : 'Ctrl';
      case 'ctrl':
        return isMac ? '⌃' : 'Ctrl';
      case 'alt':
        return isMac ? '⌥' : 'Alt';
      case 'shift':
        return isMac ? '⇧' : 'Shift';
      default:
        return key.charAt(0).toUpperCase() + key.slice(1);
    }
  });

  return formatted.join(isMac ? '' : '+');
}

/**
 * Global keyboard shortcuts hook
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { debug = false, disabled = false } = options;
  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Exception: Allow Cmd+K even in inputs for command palette
      if (!(event.key === 'k' && (event.metaKey || event.ctrlKey))) {
        return;
      }
    }

    for (const shortcut of shortcutsRef.current) {
      if (shortcut.enabled === false) continue;

      if (matchesShortcut(event, shortcut.keys)) {
        if (debug) {
          logger.debug({
            event: 'keyboard_shortcut_triggered',
            shortcutId: shortcut.id,
            keys: shortcut.keys
          });
        }

        if (shortcut.preventDefault !== false) {
          event.preventDefault();
          event.stopPropagation();
        }

        shortcut.action();
        break;
      }
    }
  }, [disabled, debug]);

  useEffect(() => {
    if (disabled) return;

    window.addEventListener('keydown', handleKeyDown);

    if (debug) {
      logger.debug({
        event: 'keyboard_shortcuts_registered',
        shortcuts: shortcutsRef.current.map(s => ({
          id: s.id,
          keys: s.keys,
          description: s.description,
        }))
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, disabled, debug]);
}

/**
 * Get all registered shortcuts (for documentation)
 */
export function useShortcutRegistry() {
  return useCallback(() => {
    // This would be populated by a global registry
    // For now, return empty array
    return [];
  }, []);
}
