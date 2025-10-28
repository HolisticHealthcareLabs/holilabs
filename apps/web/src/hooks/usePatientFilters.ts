/**
 * Patient Filters Hook
 * Apply filters and sorting to patient list
 * FREE - No external libraries needed
 */

import { useMemo } from 'react';
import { FilterOptions } from '@/components/dashboard/PatientFilters';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  conditions?: string[];
  lastVisit?: string;
  nextAppointment?: string;
  [key: string]: any;
}

export function usePatientFilters(patients: Patient[], filters: FilterOptions) {
  return useMemo(() => {
    let filtered = [...patients];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((patient) => {
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        const email = patient.email?.toLowerCase() || '';
        const phone = patient.phone?.toLowerCase() || '';
        const id = patient.id.toLowerCase();

        return (
          fullName.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower) ||
          id.includes(searchLower)
        );
      });
    }

    // Apply risk level filter
    if (filters.riskLevels.length > 0) {
      filtered = filtered.filter((patient) =>
        patient.riskLevel && filters.riskLevels.includes(patient.riskLevel)
      );
    }

    // Apply conditions filter
    if (filters.conditions.length > 0) {
      filtered = filtered.filter((patient) =>
        patient.conditions?.some((condition) =>
          filters.conditions.some((filter) =>
            condition.toLowerCase().includes(filter.toLowerCase())
          )
        )
      );
    }

    // Apply appointment status filter
    if (filters.appointmentStatus.length > 0) {
      filtered = filtered.filter((patient) => {
        const now = new Date();
        const hasUpcoming = filters.appointmentStatus.includes('upcoming');
        const hasOverdue = filters.appointmentStatus.includes('overdue');
        const hasRecent = filters.appointmentStatus.includes('recent');

        if (hasUpcoming && patient.nextAppointment) {
          const nextDate = new Date(patient.nextAppointment);
          if (nextDate > now) return true;
        }

        if (hasOverdue && patient.lastVisit) {
          const lastDate = new Date(patient.lastVisit);
          const daysSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince > 90) return true; // Overdue if no visit in 90+ days
        }

        if (hasRecent && patient.lastVisit) {
          const lastDate = new Date(patient.lastVisit);
          const daysSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince <= 30) return true; // Recent if seen in last 30 days
        }

        return false;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      switch (filters.sortBy) {
        case 'name':
          compareA = `${a.firstName} ${a.lastName}`.toLowerCase();
          compareB = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;

        case 'lastVisit':
          compareA = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
          compareB = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
          break;

        case 'riskLevel':
          const riskOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          compareA = riskOrder[a.riskLevel as keyof typeof riskOrder] || 0;
          compareB = riskOrder[b.riskLevel as keyof typeof riskOrder] || 0;
          break;

        case 'nextAppointment':
          compareA = a.nextAppointment ? new Date(a.nextAppointment).getTime() : Infinity;
          compareB = b.nextAppointment ? new Date(b.nextAppointment).getTime() : Infinity;
          break;

        default:
          compareA = a.id;
          compareB = b.id;
      }

      if (compareA < compareB) return filters.sortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [patients, filters]);
}
