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
import Image from 'next/image';
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
import { logger } from '@/lib/logger';

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
import { FloatingActionButton } from '@/components/dashboard/FloatingActionButton';
import { WidgetStore, type WidgetConfig } from '@/components/dashboard/WidgetStore';
import { CommandKPatientSelector } from '@/components/dashboard/CommandKPatientSelector';
import { FocusTimer } from '@/components/dashboard/FocusTimer';
import { QuickActionsMenu } from '@/components/dashboard/QuickActionsMenu';
import {
  AITimeReclaimedWidgetRadial,
  PendingResultsWidget,
  AdherenceScoreWidget,
  BillableValueWidget,
} from '@/components/dashboard/KPIWidgets';
import CorrectionMetricsWidget from '@/components/dashboard/CorrectionMetricsWidget';
import { ReviewQueueWidget } from '@/components/dashboard/ReviewQueueWidget';

export default function DashboardCommandCenter() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isOpen: isCommandPaletteOpen, close: closeCommandPalette } = useCommandPalette();
  const [clinicianId, setClinicianId] = useState<string | null>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Good morning'); // Default to avoid hydration mismatch
  const [currentDate, setCurrentDate] = useState('');
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
  const [showWidgetStore, setShowWidgetStore] = useState(false);

  // Widget configuration
  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    { id: 'ai-time', name: 'AI Time Reclaimed', description: 'Track time saved with AI', enabled: true, category: 'kpi' },
    { id: 'pending-results', name: 'Pending Results', description: 'Lab results awaiting review', enabled: true, category: 'clinical' },
    { id: 'adherence', name: 'Adherence Score', description: 'Patient medication adherence', enabled: true, category: 'kpi' },
    { id: 'billable', name: 'Billable Value', description: 'Monthly billable amount', enabled: true, category: 'kpi' },
    { id: 'rlhf-metrics', name: 'AI Training Metrics', description: 'RLHF correction analytics', enabled: true, category: 'kpi' },
    { id: 'focus-timer', name: 'Flow State Timer', description: 'Focus timer with completion sounds', enabled: true, category: 'productivity' },
  ]);

  const toggleWidget = (widgetId: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, enabled: !w.enabled } : w))
    );
  };

  useEffect(() => {
    // Set time-based greeting and current date
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Set formatted date
    setCurrentDate(now.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }));

    // Fetch dashboard data
    fetchDashboardData();

    // Fetch clinician identity for widgets that require it (tasks).
    fetch('/api/auth/whoami', { cache: 'no-store' })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        const id = d?.user?.id || d?.data?.user?.id || d?.id;
        if (typeof id === 'string') setClinicianId(id);
      })
      .catch(() => {});
  }, []);

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
      logger.error({
        event: 'dashboard_data_fetch_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mb-4" />
          <h3 className="text-xl font-bold text-foreground">
            Loading...
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Onboarding */}
      <ImprovedWelcomeModal />
      <OnboardingChecklist />

      {/* Command Palette */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} />

      {/* Widget Store */}
      <WidgetStore
        widgets={widgets}
        onToggle={toggleWidget}
        isOpen={showWidgetStore}
        onClose={() => setShowWidgetStore(false)}
      />

      {/* FAB */}
      <FloatingActionButton onClick={() => setShowWidgetStore(true)} />

      {/* Top Header - Redesigned */}
      <header className="bg-background/80 backdrop-blur-xl border-b border-border sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground" suppressHydrationWarning>
                {greeting}, Dr.
              </h1>
              <p className="text-sm text-muted-foreground mt-1" suppressHydrationWarning>
                {currentDate || 'Loading...'}
              </p>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-3">
              {/* Demo Mode Toggle */}
              <DemoModeToggle />

              {/* Command K Patient Selector */}
              <CommandKPatientSelector />

              {/* Notifications */}
              <NotificationBadge
                count={unreadNotificationsCount}
                onClick={() => setShowNotificationsPanel(!showNotificationsPanel)}
                hasCritical={hasCriticalNotifications}
              />

              {/* View patients button */}
              <button
                onClick={() => router.push('/dashboard/patients')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm hover:shadow-md"
              >
                View Patients
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Command Center Layout */}
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Widgets (responsive bento row) */}
        <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-6 mb-8">
          {widgets.find((w) => w.id === 'ai-time')?.enabled && (
            <div className="min-w-0 md:col-span-3 xl:col-span-3">
              <AITimeReclaimedWidgetRadial />
            </div>
          )}
          {widgets.find((w) => w.id === 'pending-results')?.enabled && (
            <div className="min-w-0 md:col-span-3 xl:col-span-3">
              <PendingResultsWidget />
            </div>
          )}
          {widgets.find((w) => w.id === 'adherence')?.enabled && (
            <div className="min-w-0 md:col-span-3 xl:col-span-3">
              <AdherenceScoreWidget />
            </div>
          )}
          {widgets.find((w) => w.id === 'billable')?.enabled && (
            <div className="min-w-0 md:col-span-3 xl:col-span-3">
              <BillableValueWidget />
            </div>
          )}
          {widgets.find((w) => w.id === 'rlhf-metrics')?.enabled && (
            <div className="min-w-0 md:col-span-6 xl:col-span-6">
              <CorrectionMetricsWidget
                dateRange={{
                  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  endDate: new Date(),
                }}
              />
            </div>
          )}
        </div>

        {/* Key Metrics (responsive, no overflow/overlap) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8 dashboard-stats">
          <div className="min-w-0">
            <EnhancedStatCard
              label="Total Active Patients"
              value={stats.totalPatients}
              change={{ value: 8.2, trend: 'up', period: 'vs last week' }}
              trendData={trendData.patients}
              icon={
                <div className="relative w-8 h-8">
                  <Image src="/icons/people (1).svg" alt="Patients" width={32} height={32} className="dark:invert" />
                </div>
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
          </div>

          <div className="min-w-0">
            <EnhancedStatCard
              label="Scheduled Appointments"
              value={stats.todayAppointments}
              change={{ value: 12.5, trend: 'up', period: 'vs yesterday' }}
              trendData={trendData.appointments}
              icon={
                <div className="relative w-8 h-8">
                  <Image src="/icons/calendar.svg" alt="Appointments" width={32} height={32} className="dark:invert" />
                </div>
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
          </div>

          <div className="min-w-0">
            <EnhancedStatCard
              label="Signed Prescriptions"
              value={stats.prescriptionsToday}
              change={{ value: 5.3, trend: 'up', period: 'vs last week' }}
              trendData={trendData.prescriptions}
              icon={
                <div className="relative w-8 h-8">
                  <Image src="/icons/rx.svg" alt="Prescriptions" width={32} height={32} className="dark:invert" />
                </div>
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
          </div>

          <div className="min-w-0">
            <EnhancedStatCard
              label="Clinical Notes"
              value={24}
              change={{ value: 18.7, trend: 'up', period: 'vs last week' }}
              trendData={[18, 20, 19, 22, 21, 23, 24]}
              icon={
                <div className="relative w-8 h-8">
                  <Image
                    src="/icons/i-note_action.svg"
                    alt="Clinical Notes"
                    width={32}
                    height={32}
                    className="dark:invert"
                  />
                </div>
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
          </div>
        </div>

        {/* Command Center Grid (bento columns; prevents overlap at odd widths) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column - Activity & AI Insights */}
          <div className="min-w-0 xl:col-span-8 space-y-6">
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
                logger.info({
                  event: 'dashboard_insight_action',
                  insightId: id,
                  action: action
                });
              }}
              showConfidence={true}
              showEvidence={true}
            />
          </div>

          {/* Right Column - Notifications & Quick Actions */}
          <div className="min-w-0 xl:col-span-4 space-y-6">
            {/* Review Queue Widget */}
            <ReviewQueueWidget />

            {/* Smart Notifications */}
            {showNotificationsPanel && (
              <SmartNotifications
                maxHeight="500px"
                onNotificationClick={(notification) => {
                  logger.info({
                    event: 'dashboard_notification_clicked',
                    notificationId: notification.id,
                    notificationType: notification.type
                  });
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

            {/* Quick Actions Card with Expandable Menu */}
            <QuickActionsMenu />

            {/* Focus Timer */}
            {widgets.find((w) => w.id === 'focus-timer')?.enabled && (
              <FocusTimer
                onComplete={() => {
                  logger.info({
                    event: 'dashboard_focus_session_complete',
                    timestamp: new Date().toISOString()
                  });
                }}
              />
            )}

            {/* Task Management Widget */}
            <div className="bg-card/40 border border-border rounded-xl shadow-sm p-6 backdrop-blur">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">
                  My Tasks
                </h2>
                <button
                  onClick={() => router.push('/dashboard/tasks')}
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center transition-colors"
                >
                  View All →
                </button>
              </div>
              <TaskManagementPanel userId={clinicianId || undefined} compact={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
