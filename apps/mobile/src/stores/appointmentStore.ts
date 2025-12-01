/**
 * Appointment Store - Zustand domain store for appointment data
 *
 * Features:
 * - Appointment scheduling and management
 * - Calendar view state
 * - Filter by date, type, status
 * - Today's schedule optimization
 * - Conflict detection
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhotoUrl?: string;
  providerId: string;
  providerName: string;
  type: 'in-person' | 'telehealth' | 'phone' | 'walk-in';
  status: 'scheduled' | 'confirmed' | 'checked-in' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  priority?: 'urgent' | 'stat' | 'routine' | 'follow-up';
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  duration: number; // minutes
  reason: string;
  notes?: string;
  location?: string;
  roomNumber?: string;
  reminderSent?: boolean;
  checkedInAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  telehealth?: {
    meetingUrl: string;
    meetingId: string;
  };
}

export interface AppointmentFilters {
  dateRange: {
    start: string; // ISO 8601 date
    end: string; // ISO 8601 date
  };
  type: 'all' | Appointment['type'];
  status: 'all' | Appointment['status'];
  priority: 'all' | Appointment['priority'];
  providerId?: string;
}

export type CalendarView = 'day' | 'week' | 'month' | 'agenda';

interface AppointmentStore {
  // State
  appointments: Appointment[];
  selectedAppointment: Appointment | null;
  selectedDate: string; // ISO 8601 date
  calendarView: CalendarView;
  filters: AppointmentFilters;
  isLoading: boolean;
  error: string | null;

  // Actions - Appointment Management
  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  cancelAppointment: (id: string, reason: string) => void;
  removeAppointment: (id: string) => void;
  checkInAppointment: (id: string) => void;
  startAppointment: (id: string) => void;
  completeAppointment: (id: string) => void;

  // Actions - Selection & View
  selectAppointment: (appointment: Appointment | null) => void;
  selectAppointmentById: (id: string) => void;
  setSelectedDate: (date: string) => void;
  setCalendarView: (view: CalendarView) => void;

  // Actions - Filters
  setDateRange: (start: string, end: string) => void;
  setTypeFilter: (type: AppointmentFilters['type']) => void;
  setStatusFilter: (status: AppointmentFilters['status']) => void;
  setPriorityFilter: (priority: AppointmentFilters['priority']) => void;
  setProviderFilter: (providerId?: string) => void;
  resetFilters: () => void;

  // Actions - Loading & Error
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Getters
  getFilteredAppointments: () => Appointment[];
  getAppointmentById: (id: string) => Appointment | undefined;
  getTodaysAppointments: () => Appointment[];
  getUpcomingAppointments: (limit?: number) => Appointment[];
  getAppointmentsByPatientId: (patientId: string) => Appointment[];
  getAppointmentsByDate: (date: string) => Appointment[];
  getUrgentAppointments: () => Appointment[];
  hasConflict: (startTime: string, endTime: string, excludeId?: string) => boolean;
  getNextAppointment: () => Appointment | null;
}

const getTodayDateRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    start: today.toISOString(),
    end: tomorrow.toISOString(),
  };
};

const defaultFilters: AppointmentFilters = {
  dateRange: getTodayDateRange(),
  type: 'all',
  status: 'all',
  priority: 'all',
};

export const useAppointmentStore = create<AppointmentStore>()(
  persist(
    (set, get) => ({
      // Initial state
      appointments: [],
      selectedAppointment: null,
      selectedDate: new Date().toISOString().split('T')[0],
      calendarView: 'day',
      filters: defaultFilters,
      isLoading: false,
      error: null,

      // Appointment Management
      setAppointments: (appointments) => set({ appointments }),

      addAppointment: (appointment) =>
        set((state) => ({
          appointments: [...state.appointments, appointment],
        })),

      updateAppointment: (id, updates) =>
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
          selectedAppointment:
            state.selectedAppointment?.id === id
              ? { ...state.selectedAppointment, ...updates }
              : state.selectedAppointment,
        })),

      cancelAppointment: (id, reason) => {
        const now = new Date().toISOString();
        get().updateAppointment(id, {
          status: 'cancelled',
          cancelledAt: now,
          cancellationReason: reason,
        });
      },

      removeAppointment: (id) =>
        set((state) => ({
          appointments: state.appointments.filter((a) => a.id !== id),
          selectedAppointment:
            state.selectedAppointment?.id === id
              ? null
              : state.selectedAppointment,
        })),

      checkInAppointment: (id) => {
        const now = new Date().toISOString();
        get().updateAppointment(id, {
          status: 'checked-in',
          checkedInAt: now,
        });
      },

      startAppointment: (id) => {
        get().updateAppointment(id, {
          status: 'in-progress',
        });
      },

      completeAppointment: (id) => {
        const now = new Date().toISOString();
        get().updateAppointment(id, {
          status: 'completed',
          completedAt: now,
        });
      },

      // Selection & View
      selectAppointment: (appointment) =>
        set({ selectedAppointment: appointment }),

      selectAppointmentById: (id) => {
        const appointment = get().getAppointmentById(id);
        if (appointment) {
          get().selectAppointment(appointment);
        }
      },

      setSelectedDate: (date) => set({ selectedDate: date }),

      setCalendarView: (view) => set({ calendarView: view }),

      // Filters
      setDateRange: (start, end) =>
        set((state) => ({
          filters: { ...state.filters, dateRange: { start, end } },
        })),

      setTypeFilter: (type) =>
        set((state) => ({
          filters: { ...state.filters, type },
        })),

      setStatusFilter: (status) =>
        set((state) => ({
          filters: { ...state.filters, status },
        })),

      setPriorityFilter: (priority) =>
        set((state) => ({
          filters: { ...state.filters, priority },
        })),

      setProviderFilter: (providerId) =>
        set((state) => ({
          filters: { ...state.filters, providerId },
        })),

      resetFilters: () =>
        set({
          filters: defaultFilters,
        }),

      // Loading & Error
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Getters
      getFilteredAppointments: () => {
        const { appointments, filters } = get();
        let filtered = [...appointments];

        // Date range filter
        if (filters.dateRange) {
          const startDate = new Date(filters.dateRange.start);
          const endDate = new Date(filters.dateRange.end);

          filtered = filtered.filter((a) => {
            const appointmentDate = new Date(a.startTime);
            return appointmentDate >= startDate && appointmentDate < endDate;
          });
        }

        // Type filter
        if (filters.type !== 'all') {
          filtered = filtered.filter((a) => a.type === filters.type);
        }

        // Status filter
        if (filters.status !== 'all') {
          filtered = filtered.filter((a) => a.status === filters.status);
        }

        // Priority filter
        if (filters.priority !== 'all') {
          filtered = filtered.filter((a) => a.priority === filters.priority);
        }

        // Provider filter
        if (filters.providerId) {
          filtered = filtered.filter((a) => a.providerId === filters.providerId);
        }

        // Sort by start time
        filtered.sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

        return filtered;
      },

      getAppointmentById: (id) => {
        return get().appointments.find((a) => a.id === id);
      },

      getTodaysAppointments: () => {
        const { appointments } = get();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return appointments
          .filter((a) => {
            const appointmentDate = new Date(a.startTime);
            return (
              appointmentDate >= today &&
              appointmentDate < tomorrow &&
              a.status !== 'cancelled' &&
              a.status !== 'completed'
            );
          })
          .sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
      },

      getUpcomingAppointments: (limit = 10) => {
        const { appointments } = get();
        const now = new Date();

        return appointments
          .filter(
            (a) =>
              new Date(a.startTime) > now &&
              a.status !== 'cancelled' &&
              a.status !== 'completed'
          )
          .sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          )
          .slice(0, limit);
      },

      getAppointmentsByPatientId: (patientId) => {
        const { appointments } = get();
        return appointments
          .filter((a) => a.patientId === patientId)
          .sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );
      },

      getAppointmentsByDate: (date) => {
        const { appointments } = get();
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);

        return appointments
          .filter((a) => {
            const appointmentDate = new Date(a.startTime);
            return appointmentDate >= targetDate && appointmentDate < nextDate;
          })
          .sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
      },

      getUrgentAppointments: () => {
        const { appointments } = get();
        const now = new Date();

        return appointments.filter(
          (a) =>
            (a.priority === 'urgent' || a.priority === 'stat') &&
            new Date(a.startTime) > now &&
            a.status !== 'cancelled' &&
            a.status !== 'completed'
        );
      },

      hasConflict: (startTime, endTime, excludeId) => {
        const { appointments } = get();
        const start = new Date(startTime);
        const end = new Date(endTime);

        return appointments.some((a) => {
          if (a.id === excludeId) return false;
          if (a.status === 'cancelled' || a.status === 'completed') return false;

          const aStart = new Date(a.startTime);
          const aEnd = new Date(a.endTime);

          // Check for overlap
          return (
            (start >= aStart && start < aEnd) ||
            (end > aStart && end <= aEnd) ||
            (start <= aStart && end >= aEnd)
          );
        });
      },

      getNextAppointment: () => {
        const upcomingAppointments = get().getUpcomingAppointments(1);
        return upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
      },
    }),
    {
      name: 'appointment-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential data
      partialize: (state) => ({
        selectedDate: state.selectedDate,
        calendarView: state.calendarView,
        filters: state.filters,
      }),
    }
  )
);

// Selector hooks for performance optimization
export const useSelectedAppointment = () =>
  useAppointmentStore((state) => state.selectedAppointment);

export const useTodaysAppointments = () =>
  useAppointmentStore((state) => state.getTodaysAppointments());

export const useUpcomingAppointments = (limit?: number) =>
  useAppointmentStore((state) => state.getUpcomingAppointments(limit));

export const useUrgentAppointments = () =>
  useAppointmentStore((state) => state.getUrgentAppointments());

export const useNextAppointment = () =>
  useAppointmentStore((state) => state.getNextAppointment());
