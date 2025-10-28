/**
 * Patient Dashboard
 *
 * Main landing page for authenticated patients
 * Features:
 * - Welcome message with time-based greeting
 * - Quick stats cards
 * - Upcoming appointments
 * - Recent medications
 * - Quick actions
 * - Health metrics summary
 * - Onboarding wizard for new patients
 */

export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentPatient } from '@/lib/auth/patient-session';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PatientOnboardingWizard from '@/components/portal/PatientOnboardingWizard';
import MedicationAdherenceTracker from '@/components/medications/MedicationAdherenceTracker';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 19) return 'Good afternoon';
  return 'Good evening';
}

async function fetchDashboardStats(patientUserId: string) {
  try {
    // Fetch real stats from API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/portal/dashboard/stats`,
      {
        method: 'GET',
        headers: {
          Cookie: `patient_session=${patientUserId}`, // Pass session for authentication
        },
        cache: 'no-store', // Always get fresh data
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    const data = await response.json();
    return data.stats;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return default/empty stats on error
    return {
      upcomingAppointments: { count: 0, next: null, all: [] },
      medications: { active: 0, adherence: 0 },
      notifications: { unread: 0 },
      documents: { total: 0 },
      consultations: { recent: [] },
      forms: { pending: 0 },
    };
  }
}

export default async function PatientDashboardPage() {
  const patientUser = await getCurrentPatient();

  if (!patientUser) {
    redirect('/portal/login');
  }

  const greeting = getGreeting();
  const firstName = patientUser.patient.firstName;

  // Fetch real dashboard stats
  const stats = await fetchDashboardStats(patientUser.id);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Onboarding Wizard */}
      <PatientOnboardingWizard />

      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
          {greeting}, {firstName}
        </h1>
        <p className="text-gray-600">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Upcoming Appointments */}
        <a href="/portal/appointments" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.upcomingAppointments.count}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Upcoming</h3>
          <p className="text-xs text-gray-500">
            {stats.upcomingAppointments.next
              ? `Next: ${stats.upcomingAppointments.next.daysUntil === 0 ? 'Today' : stats.upcomingAppointments.next.daysUntil === 1 ? 'Tomorrow' : `${stats.upcomingAppointments.next.daysUntil} days`}`
              : 'No appointments scheduled'}
          </p>
        </a>

        {/* Active Medications */}
        <a href="/portal/medications" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.medications.active}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Active Meds</h3>
          <p className="text-xs text-gray-500">
            {stats.medications.active > 0 ? `Adherence: ${stats.medications.adherence}%` : 'No medications'}
          </p>
        </a>

        {/* Notifications */}
        <a href="/portal/dashboard/notifications" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-red-300 transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.notifications.unread}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Notifications</h3>
          <p className="text-xs text-gray-500">
            {stats.notifications.unread > 0 ? `${stats.notifications.unread} unread` : 'All caught up'}
          </p>
        </a>

        {/* Documents */}
        <a href="/portal/dashboard/documents/upload" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-orange-300 transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.documents.total}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Documents</h3>
          <p className="text-xs text-gray-500">Click to upload</p>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Upcoming Appointments</h2>
              <a
                href="/portal/appointments"
                className="text-sm font-semibold text-green-600 hover:text-green-700"
              >
                View all →
              </a>
            </div>

            <div className="space-y-3">
              {/* Appointment 1 */}
              <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-green-200 hover:bg-green-50 transition-all cursor-pointer">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Follow-up visit</h3>
                  <p className="text-sm text-gray-600 mt-1">Dr. Juan Pérez - General Medicine</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Mon, Oct 14
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      10:00 AM
                    </span>
                  </div>
                </div>
                <span className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  In 3 days
                </span>
              </div>

              {/* Appointment 2 */}
              <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-green-200 hover:bg-green-50 transition-all cursor-pointer">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Laboratory - Blood test</h3>
                  <p className="text-sm text-gray-600 mt-1">Lab. Central - Dr. María López</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Fri, Oct 18
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      7:00 AM
                    </span>
                  </div>
                </div>
                <span className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  In 7 days
                </span>
              </div>
            </div>
          </div>

          {/* Medication Adherence Tracker */}
          <MedicationAdherenceTracker />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <a
                href="/portal/dashboard/appointments/schedule"
                className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="font-medium text-gray-900">Book Appointment</span>
              </a>

              <a
                href="/portal/dashboard/notifications"
                className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <span className="font-medium text-gray-900">View Notifications</span>
              </a>

              <a
                href="/portal/dashboard/documents/upload"
                className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <span className="font-medium text-gray-900">Upload Document</span>
              </a>

              <a
                href="/portal/dashboard/messages"
                className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-900">Send Message</span>
              </a>
            </div>
          </div>

          {/* Health Tip */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg">💡</span>
              </div>
              <h3 className="font-bold text-gray-900">Daily Tip</h3>
            </div>
            <p className="text-sm text-gray-700">
              Take your medications at the same time daily to maintain consistent levels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
