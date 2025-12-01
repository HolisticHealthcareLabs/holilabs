/**
 * Patient Store - Zustand domain store for patient data
 *
 * Features:
 * - Patient list management
 * - Patient selection state
 * - Search and filter state
 * - Offline-first with optimistic updates
 * - Integration with React Query for server sync
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  medicalRecordNumber: string;
  status: 'active' | 'inactive' | 'archived';
  priority?: 'urgent' | 'stat' | 'routine' | 'follow-up';
  lastVisit?: string;
  nextAppointment?: string;
  conditions?: string[];
  allergies?: string[];
  medications?: string[];
  photoUrl?: string;
  insuranceProvider?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface PatientFilters {
  searchQuery: string;
  status: 'all' | 'active' | 'inactive' | 'archived';
  priority: 'all' | 'urgent' | 'stat' | 'routine' | 'follow-up';
  hasUpcomingAppointment: boolean | null;
  sortBy: 'name' | 'lastVisit' | 'nextAppointment' | 'priority';
  sortOrder: 'asc' | 'desc';
}

interface PatientStore {
  // State
  patients: Patient[];
  selectedPatient: Patient | null;
  filters: PatientFilters;
  recentlyViewed: string[]; // Patient IDs
  favorites: string[]; // Patient IDs
  isLoading: boolean;
  error: string | null;

  // Actions - Patient Management
  setPatients: (patients: Patient[]) => void;
  addPatient: (patient: Patient) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  removePatient: (id: string) => void;

  // Actions - Selection
  selectPatient: (patient: Patient | null) => void;
  selectPatientById: (id: string) => void;

  // Actions - Filters
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: PatientFilters['status']) => void;
  setPriorityFilter: (priority: PatientFilters['priority']) => void;
  setHasUpcomingAppointmentFilter: (hasAppointment: boolean | null) => void;
  setSortBy: (sortBy: PatientFilters['sortBy']) => void;
  setSortOrder: (sortOrder: PatientFilters['sortOrder']) => void;
  resetFilters: () => void;

  // Actions - Recently Viewed & Favorites
  addToRecentlyViewed: (patientId: string) => void;
  toggleFavorite: (patientId: string) => void;
  clearRecentlyViewed: () => void;

  // Actions - Loading & Error
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed/Derived State (getters)
  getFilteredPatients: () => Patient[];
  getPatientById: (id: string) => Patient | undefined;
  getRecentlyViewedPatients: () => Patient[];
  getFavoritePatients: () => Patient[];
  getUrgentPatients: () => Patient[];
}

const defaultFilters: PatientFilters = {
  searchQuery: '',
  status: 'all',
  priority: 'all',
  hasUpcomingAppointment: null,
  sortBy: 'name',
  sortOrder: 'asc',
};

export const usePatientStore = create<PatientStore>()(
  persist(
    (set, get) => ({
      // Initial state
      patients: [],
      selectedPatient: null,
      filters: defaultFilters,
      recentlyViewed: [],
      favorites: [],
      isLoading: false,
      error: null,

      // Patient Management
      setPatients: (patients) => set({ patients }),

      addPatient: (patient) =>
        set((state) => ({
          patients: [patient, ...state.patients],
        })),

      updatePatient: (id, updates) =>
        set((state) => ({
          patients: state.patients.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
          selectedPatient:
            state.selectedPatient?.id === id
              ? { ...state.selectedPatient, ...updates }
              : state.selectedPatient,
        })),

      removePatient: (id) =>
        set((state) => ({
          patients: state.patients.filter((p) => p.id !== id),
          selectedPatient:
            state.selectedPatient?.id === id ? null : state.selectedPatient,
          recentlyViewed: state.recentlyViewed.filter((pid) => pid !== id),
          favorites: state.favorites.filter((pid) => pid !== id),
        })),

      // Selection
      selectPatient: (patient) => {
        set({ selectedPatient: patient });
        if (patient) {
          get().addToRecentlyViewed(patient.id);
        }
      },

      selectPatientById: (id) => {
        const patient = get().getPatientById(id);
        if (patient) {
          get().selectPatient(patient);
        }
      },

      // Filters
      setSearchQuery: (query) =>
        set((state) => ({
          filters: { ...state.filters, searchQuery: query },
        })),

      setStatusFilter: (status) =>
        set((state) => ({
          filters: { ...state.filters, status },
        })),

      setPriorityFilter: (priority) =>
        set((state) => ({
          filters: { ...state.filters, priority },
        })),

      setHasUpcomingAppointmentFilter: (hasAppointment) =>
        set((state) => ({
          filters: { ...state.filters, hasUpcomingAppointment: hasAppointment },
        })),

      setSortBy: (sortBy) =>
        set((state) => ({
          filters: { ...state.filters, sortBy },
        })),

      setSortOrder: (sortOrder) =>
        set((state) => ({
          filters: { ...state.filters, sortOrder },
        })),

      resetFilters: () =>
        set({
          filters: defaultFilters,
        }),

      // Recently Viewed & Favorites
      addToRecentlyViewed: (patientId) =>
        set((state) => {
          const filtered = state.recentlyViewed.filter((id) => id !== patientId);
          return {
            recentlyViewed: [patientId, ...filtered].slice(0, 10), // Keep last 10
          };
        }),

      toggleFavorite: (patientId) =>
        set((state) => ({
          favorites: state.favorites.includes(patientId)
            ? state.favorites.filter((id) => id !== patientId)
            : [...state.favorites, patientId],
        })),

      clearRecentlyViewed: () => set({ recentlyViewed: [] }),

      // Loading & Error
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Getters
      getFilteredPatients: () => {
        const { patients, filters } = get();
        let filtered = [...patients];

        // Search query
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.firstName.toLowerCase().includes(query) ||
              p.lastName.toLowerCase().includes(query) ||
              p.email.toLowerCase().includes(query) ||
              p.medicalRecordNumber.toLowerCase().includes(query)
          );
        }

        // Status filter
        if (filters.status !== 'all') {
          filtered = filtered.filter((p) => p.status === filters.status);
        }

        // Priority filter
        if (filters.priority !== 'all') {
          filtered = filtered.filter((p) => p.priority === filters.priority);
        }

        // Has upcoming appointment filter
        if (filters.hasUpcomingAppointment !== null) {
          filtered = filtered.filter((p) =>
            filters.hasUpcomingAppointment
              ? !!p.nextAppointment
              : !p.nextAppointment
          );
        }

        // Sort
        filtered.sort((a, b) => {
          let compareValue = 0;

          switch (filters.sortBy) {
            case 'name':
              compareValue = `${a.firstName} ${a.lastName}`.localeCompare(
                `${b.firstName} ${b.lastName}`
              );
              break;
            case 'lastVisit':
              compareValue =
                new Date(a.lastVisit || 0).getTime() -
                new Date(b.lastVisit || 0).getTime();
              break;
            case 'nextAppointment':
              compareValue =
                new Date(a.nextAppointment || 0).getTime() -
                new Date(b.nextAppointment || 0).getTime();
              break;
            case 'priority':
              const priorityOrder = { urgent: 0, stat: 1, routine: 2, 'follow-up': 3 };
              compareValue =
                (priorityOrder[a.priority || 'routine'] || 2) -
                (priorityOrder[b.priority || 'routine'] || 2);
              break;
          }

          return filters.sortOrder === 'asc' ? compareValue : -compareValue;
        });

        return filtered;
      },

      getPatientById: (id) => {
        return get().patients.find((p) => p.id === id);
      },

      getRecentlyViewedPatients: () => {
        const { patients, recentlyViewed } = get();
        return recentlyViewed
          .map((id) => patients.find((p) => p.id === id))
          .filter(Boolean) as Patient[];
      },

      getFavoritePatients: () => {
        const { patients, favorites } = get();
        return favorites
          .map((id) => patients.find((p) => p.id === id))
          .filter(Boolean) as Patient[];
      },

      getUrgentPatients: () => {
        const { patients } = get();
        return patients.filter(
          (p) => p.priority === 'urgent' || p.priority === 'stat'
        );
      },
    }),
    {
      name: 'patient-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential data
      partialize: (state) => ({
        recentlyViewed: state.recentlyViewed,
        favorites: state.favorites,
        filters: state.filters,
      }),
    }
  )
);

// Selector hooks for performance optimization
export const useSelectedPatient = () =>
  usePatientStore((state) => state.selectedPatient);

export const usePatientFilters = () =>
  usePatientStore((state) => state.filters);

export const useFilteredPatients = () =>
  usePatientStore((state) => state.getFilteredPatients());

export const useFavoritePatients = () =>
  usePatientStore((state) => state.getFavoritePatients());

export const useUrgentPatients = () =>
  usePatientStore((state) => state.getUrgentPatients());
