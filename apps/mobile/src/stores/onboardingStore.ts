/**
 * Onboarding Store - Track onboarding completion state
 *
 * Persisted to storage so users don't see onboarding again after completing it.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '@/shared/services/storage';

interface OnboardingData {
  role?: 'doctor' | 'nurse' | 'admin';
  fullName?: string;
  specialty?: string;
  licenseNumber?: string;
  institution?: string;
  permissions?: {
    microphone: boolean;
    notifications: boolean;
    biometric: boolean;
  };
  completedAt?: string;
}

interface OnboardingState {
  isCompleted: boolean;
  data: OnboardingData;
  _hasHydrated: boolean;

  // Actions
  completeOnboarding: (data: OnboardingData) => void;
  resetOnboarding: () => void; // For testing/debugging
  setHasHydrated: (hydrated: boolean) => void;
}

// Custom storage adapter for MMKV
const mmkvStorage = {
  getItem: (name: string): string | null => {
    return storage.getString(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, value);
  },
  removeItem: (name: string): void => {
    storage.delete(name);
  },
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      isCompleted: false,
      data: {},
      _hasHydrated: false,

      completeOnboarding: (data: OnboardingData) => {
        set({
          isCompleted: true,
          data: {
            ...data,
            completedAt: new Date().toISOString(),
          },
        });
      },

      resetOnboarding: () => {
        set({
          isCompleted: false,
          data: {},
        });
      },

      setHasHydrated: (hydrated: boolean) => {
        set({ _hasHydrated: hydrated });
      },
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => mmkvStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
