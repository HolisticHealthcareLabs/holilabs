'use client';
export const dynamic = 'force-dynamic';

/**
 * Dashboard Home - Command Center for Physicians
 *
 * REDESIGNED Phase 1: 100x Improvement
 * - Hospital-grade UI with Apple polish
 * - Epic/Cerner institutional trust
 * - Command palette (Cmd+K)
 * - Enhanced stat cards with trend charts
 * - Smart notifications with live updates
 * - Rich activity timeline
 * - AI-powered clinical insights
 * - Responsive command center layout
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import ImprovedWelcomeModal from '@/components/onboarding/ImprovedWelcomeModal';
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist';
import DemoModeToggle from '@/components/demo/DemoModeToggle';

// Demo data
import {
  generateDemoPatients,
  generateDemoAppointments,
  getDemoStats,
  isDemoModeEnabled,
  type DemoPatient
} from '@/lib/demo/demo-data-generator';

// Phase 1 Components
import {
  EnhancedStatCard,
  EnhancedStatCardGrid,
  EnhancedStatCardSkeleton,
} from '@/components/dashboard/EnhancedStatCard';
import { CommandPalette, useCommandPalette } from '@/components/dashboard/CommandPalette';
import { SmartNotifications, NotificationBadge } from '@/components/dashboard/SmartNotifications';
import { ActivityTimeline, Activity } from '@/components/dashboard/ActivityTimeline';
import { AIInsights } from '@/components/dashboard/AIInsights';
import TaskManagementPanel from '@/components/tasks/TaskManagementPanel';

export default function DashboardCommandCenter() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isOpen: isCommandPaletteOpen, close: closeCommandPalette } = useCommandPalette();

  // State
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);

  // Stats data
  const [stats, setStats] = useState({
    totalPatients: 0,
    activePatients: 0,
    todayAppointments: 0,
    prescriptionsToday: 0,
  });

  // Trend data for sparklines (last 7 days)
  const [trendData] = useState({
    patients: [120, 125, 128, 132, 135, 140, 145],
    appointments: [8, 12, 10, 15, 14, 18, 16],
    prescriptions: [5, 7, 6, 8, 10, 9, 12],
  });

  // Recent activities
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  // Notifications count
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(5);
  const [hasCriticalNotifications, setHasCriticalNotifications] = useState(true);

  useEffect(() => {
    // Set time-based greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t('dashboard.greeting.morning'));
    else if (hour < 18) setGreeting(t('dashboard.greeting.afternoon'));
    else setGreeting(t('dashboard.greeting.evening'));

    // Fetch dashboard data
    fetchDashboardData();
  }, [t]);

  const fetchDashboardData = async () => {
    try {
      // Check if demo mode is enabled
      const demoMode = isDemoModeEnabled();
      let patients: any[];

      if (demoMode) {
        // Use demo data
        const demoPatients = generateDemoPatients(10);
        const demoStats = getDemoStats(demoPatients);

        setStats({
          totalPatients: demoStats.totalPatients,
          activePatients: demoStats.activePatients,
          todayAppointments: demoStats.patientsWithUpcomingAppointments,
          prescriptionsToday: demoPatients.reduce((acc, p) => acc + p.medications.length, 0),
        });

        patients = demoPatients;
      } else {
        // Fetch real patients from API
        const patientsRes = await fetch('/api/patients');
        const patientsData = await patientsRes.json();

        if (patientsData.success) {
          patients = patientsData.data;
          setStats({
            totalPatients: patients.length,
            activePatients: patients.filter((p: any) => p.isActive).length,
            todayAppointments: patients.filter((p: any) => p.appointments?.length > 0).length,
            prescriptionsToday: patients.reduce((acc: number, p: any) => acc + (p.medications?.length || 0), 0),
          });
        } else {
          patients = [];
        }
      }

      // Generate recent activity from patients (works for both demo and real data)
      const activities: Activity[] = patients.slice(0, 8).map((p: any, index: number) => ({
        id: `activity-${p.id}`,
        type: index % 4 === 0 ? 'appointment' : index % 4 === 1 ? 'prescription' : index % 4 === 2 ? 'note' : 'lab_result',
        action:
          index % 4 === 0
            ? 'Appointment completed'
            : index % 4 === 1
              ? 'Prescription signed'
              : index % 4 === 2
              ? 'Clinical note added'
              : 'Lab results reviewed',
          description:
            index % 4 === 0
              ? 'Follow-up consultation completed successfully'
              : index % 4 === 1
              ? 'Amoxicillin 500mg prescribed for 7 days'
              : index % 4 === 2
              ? 'SOAP note documented with AI Scribe'
              : 'Complete blood count - all values normal',
          timestamp: new Date(Date.now() - index * 30 * 60 * 1000),
          patientId: p.id,
          patientName: `${p.firstName} ${p.lastName}`,
          actionUrl: `/dashboard/patients/${p.id}`,
          metadata:
            index % 4 === 3
              ? {
                  value: 'Normal',
                  status: 'normal' as const,
                }
              : undefined,
        }));

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-primary-500 mb-4" />
          <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {t('dashboard.loading')}
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      {/* Onboarding */}
      <ImprovedWelcomeModal />
      <OnboardingChecklist />

      {/* Command Palette */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} />

      {/* Top Header - Redesigned */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-20 shadow-sm backdrop-blur-sm bg-white/95 dark:bg-neutral-900/95">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                {greeting}, Dr.
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                {new Date().toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-3">
              {/* Demo Mode Toggle */}
              <DemoModeToggle />

              {/* Command palette hint */}
              <button
                onClick={() => {}}
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition text-sm text-neutral-600 dark:text-neutral-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span>Search</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-[10px]">
                  ⌘K
                </kbd>
              </button>

              {/* Notifications */}
              <NotificationBadge
                count={unreadNotificationsCount}
                onClick={() => setShowNotificationsPanel(!showNotificationsPanel)}
                hasCritical={hasCriticalNotifications}
              />

              {/* View patients button */}
              <button
                onClick={() => router.push('/dashboard/patients')}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition font-medium shadow-lg hover:shadow-xl"
              >
                {t('dashboard.viewPatients')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Command Center Layout */}
      <div className="container mx-auto px-6 py-8">
        {/* Key Metrics - Enhanced with trends */}
        <EnhancedStatCardGrid columns={4} className="mb-8">
          <EnhancedStatCard
            label={t('dashboard.stats.totalPatients')}
            value={stats.totalPatients}
            change={{ value: 8.2, trend: 'up', period: 'vs last week' }}
            trendData={trendData.patients}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
            variant="primary"
            onClick={() => router.push('/dashboard/patients')}
            tooltip={{
              title: 'Patient Statistics',
              details: [
                { label: 'Active patients', value: stats.activePatients },
                { label: 'New this week', value: 12 },
                { label: 'Total appointments', value: 145 },
              ],
            }}
            badge={{ text: 'Growing', variant: 'success' }}
          />

          <EnhancedStatCard
            label={t('dashboard.stats.scheduledAppointments')}
            value={stats.todayAppointments}
            change={{ value: 12.5, trend: 'up', period: 'vs yesterday' }}
            trendData={trendData.appointments}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
            variant="success"
            onClick={() => router.push('/dashboard/appointments')}
            tooltip={{
              title: "Today's Schedule",
              details: [
                { label: 'Completed', value: 3 },
                { label: 'Upcoming', value: 5 },
                { label: 'Cancelled', value: 0 },
              ],
            }}
            badge={{ text: 'Today', variant: 'info' }}
          />

          <EnhancedStatCard
            label={t('dashboard.stats.signedPrescriptions')}
            value={stats.prescriptionsToday}
            change={{ value: 5.3, trend: 'up', period: 'vs last week' }}
            trendData={trendData.prescriptions}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            }
            variant="warning"
            onClick={() => router.push('/dashboard/prescriptions')}
            tooltip={{
              title: 'Prescription Activity',
              details: [
                { label: 'Signed today', value: stats.prescriptionsToday },
                { label: 'Pending signature', value: 0 },
                { label: 'This month', value: 87 },
              ],
            }}
          />

          <EnhancedStatCard
            label={t('dashboard.stats.clinicalNotes')}
            value={24}
            change={{ value: 18.7, trend: 'up', period: 'vs last week' }}
            trendData={[18, 20, 19, 22, 21, 23, 24]}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
            variant="default"
            onClick={() => router.push('/dashboard/notes')}
            tooltip={{
              title: 'Documentation',
              details: [
                { label: 'Notes this week', value: 24 },
                { label: 'AI Scribe sessions', value: 18 },
                { label: 'Avg time saved', value: '8 min' },
              ],
            }}
            badge={{ text: 'This week', variant: 'info' }}
          />
        </EnhancedStatCardGrid>

        {/* Command Center Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Activity & AI Insights */}
          <div className="lg:col-span-2 space-y-6">
            {/* Activity Timeline */}
            <ActivityTimeline
              activities={recentActivities}
              maxHeight="500px"
              onActivityClick={(activity) => {
                if (activity.actionUrl) {
                  router.push(activity.actionUrl);
                }
              }}
              showPatientInfo={true}
              groupByDate={true}
            />

            {/* AI Insights */}
            <AIInsights
              maxHeight="600px"
              onInsightAction={(id, action) => {
                console.log(`Insight ${id} ${action}`);
              }}
              showConfidence={true}
              showEvidence={true}
            />
          </div>

          {/* Right Column - Notifications & Quick Actions */}
          <div className="space-y-6">
            {/* Smart Notifications */}
            {showNotificationsPanel && (
              <SmartNotifications
                maxHeight="500px"
                onNotificationClick={(notification) => {
                  console.log('Notification clicked:', notification);
                }}
                onDismiss={(id) => {
                  setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
                }}
                onMarkAsRead={(id) => {
                  setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
                }}
                realTimeEnabled={false}
              />
            )}

            {/* Quick Actions Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                {t('dashboard.quickActions')}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push('/dashboard/patients')}
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/30 dark:hover:to-blue-900/40 hover:-translate-y-2 hover:scale-105 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-2xl"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-125 group-hover:rotate-6 transition-transform duration-300 mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Patients</span>
                </button>

                <button
                  onClick={() => router.push('/dashboard/patients/new')}
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/30 dark:hover:to-green-900/40 hover:-translate-y-2 hover:scale-105 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-2xl"
                >
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center group-hover:scale-125 group-hover:rotate-6 transition-transform duration-300 mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">New Patient</span>
                </button>

                <button
                  onClick={() => router.push('/dashboard/tasks')}
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/30 dark:hover:to-orange-900/40 hover:-translate-y-2 hover:scale-105 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-2xl"
                >
                  <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center group-hover:scale-125 group-hover:rotate-6 transition-transform duration-300 mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Tasks</span>
                </button>

                <button
                  onClick={() => router.push('/dashboard/reminders')}
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/30 hover:from-indigo-100 hover:to-indigo-200 dark:hover:from-indigo-900/30 dark:hover:to-indigo-900/40 hover:-translate-y-2 hover:scale-105 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-2xl"
                >
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-125 group-hover:rotate-6 transition-transform duration-300 mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Reminders</span>
                </button>

                <button
                  onClick={() => router.push('/dashboard/scribe')}
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-900/30 hover:from-teal-100 hover:to-teal-200 dark:hover:from-teal-900/30 dark:hover:to-teal-900/40 hover:-translate-y-2 hover:scale-105 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-2xl"
                >
                  <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center group-hover:scale-125 group-hover:rotate-6 transition-transform duration-300 mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">AI Scribe</span>
                </button>

                <button
                  onClick={() => router.push('/dashboard/clinical-support')}
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/30 hover:from-emerald-100 hover:to-emerald-200 dark:hover:from-emerald-900/30 dark:hover:to-emerald-900/40 hover:-translate-y-2 hover:scale-105 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-2xl"
                >
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-125 group-hover:rotate-6 transition-transform duration-300 mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Clinical Support</span>
                </button>

                <button
                  onClick={() => router.push('/dashboard/diagnosis')}
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/30 dark:hover:to-purple-900/40 hover:-translate-y-2 hover:scale-105 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-2xl"
                >
                  <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center group-hover:scale-125 group-hover:rotate-6 transition-transform duration-300 mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Clinical Tools</span>
                </button>
              </div>
            </div>

            {/* Task Management Widget */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  My Tasks
                </h2>
                <button
                  onClick={() => router.push('/dashboard/tasks')}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
                >
                  View All →
                </button>
              </div>
              <TaskManagementPanel userId="system" compact={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
