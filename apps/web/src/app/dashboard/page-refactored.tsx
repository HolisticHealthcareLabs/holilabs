'use client';
export const dynamic = 'force-dynamic';

/**
 * Dashboard Home - "Liquid Clinical" Refactor
 * 
 * Aesthetic: Liquid Clinical with backdrop-blur-xl, bg-white/5, ultra-smooth animations
 * Premium, heavy feel like a physical instrument
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PastelGlassStatCard } from '@/components/dashboard/PastelGlassStatCard';
import { FloatingActionButton } from '@/components/dashboard/FloatingActionButton';
import { WidgetStore, type WidgetConfig } from '@/components/dashboard/WidgetStore';
import { CommandKPatientSelector } from '@/components/dashboard/CommandKPatientSelector';
import { FocusTimer } from '@/components/dashboard/FocusTimer';
import {
  AITimeReclaimedWidgetRadial,
  PendingResultsWidget,
  AdherenceScoreWidget,
  BillableValueWidget,
} from '@/components/dashboard/KPIWidgets';
import { ActivityTimeline, Activity } from '@/components/dashboard/ActivityTimeline';
import { AIInsights } from '@/components/dashboard/AIInsights';
import { CommandPalette, useCommandPalette } from '@/components/dashboard/CommandPalette';
import { SmartNotifications, NotificationBadge } from '@/components/dashboard/SmartNotifications';
import DemoModeToggle from '@/components/demo/DemoModeToggle';
import { getDemoStats, generateDemoPatients, isDemoModeEnabled } from '@/lib/demo/demo-data-generator';

export default function DashboardCommandCenter() {
  const router = useRouter();
  const { isOpen: isCommandPaletteOpen, close: closeCommandPalette } = useCommandPalette();

  // State
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showWidgetStore, setShowWidgetStore] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(5);
  const [hasCriticalNotifications, setHasCriticalNotifications] = useState(true);

  // Stats data
  const [stats, setStats] = useState({
    totalPatients: 0,
    activePatients: 0,
    todayAppointments: 0,
    prescriptionsToday: 0,
  });

  // Trend data
  const [trendData] = useState({
    patients: [120, 125, 128, 132, 135, 140, 145],
    appointments: [8, 12, 10, 15, 14, 18, 16],
    prescriptions: [5, 7, 6, 8, 10, 9, 12],
    notes: [18, 20, 19, 22, 21, 23, 24],
  });

  // Recent activities
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  // Widget configuration
  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    { id: 'ai-time', name: 'AI Time Reclaimed', description: 'Track time saved with AI', enabled: true, category: 'kpi' },
    { id: 'pending-results', name: 'Pending Results', description: 'Lab results awaiting review', enabled: true, category: 'clinical' },
    { id: 'adherence', name: 'Adherence Score', description: 'Patient medication adherence', enabled: true, category: 'kpi' },
    { id: 'billable', name: 'Billable Value', description: 'Monthly billable amount', enabled: true, category: 'kpi' },
    { id: 'focus-timer', name: 'Flow State Timer', description: 'Focus timer with completion sounds', enabled: true, category: 'productivity' },
  ]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const demoMode = isDemoModeEnabled();
      let patients: any[];

      if (demoMode) {
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

      const activities: Activity[] = patients.slice(0, 8).map((p: any, index: number) => ({
        id: `activity-${p.id}`,
        type: index % 4 === 0 ? 'appointment' : index % 4 === 1 ? 'prescription' : index % 4 === 2 ? 'note' : 'lab_result',
        action: index % 4 === 0 ? 'Appointment completed' : index % 4 === 1 ? 'Prescription signed' : index % 4 === 2 ? 'Clinical note added' : 'Lab results reviewed',
        description: index % 4 === 0 ? 'Follow-up consultation completed successfully' : index % 4 === 1 ? 'Amoxicillin 500mg prescribed for 7 days' : index % 4 === 2 ? 'SOAP note documented with AI Scribe' : 'Complete blood count - all values normal',
        timestamp: new Date(Date.now() - index * 30 * 60 * 1000),
        patientId: p.id,
        patientName: `${p.firstName} ${p.lastName}`,
        actionUrl: `/dashboard/patients/${p.id}`,
        metadata: index % 4 === 3 ? { value: 'Normal', status: 'normal' as const } : undefined,
      }));

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWidget = (widgetId: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, enabled: !w.enabled } : w))
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-primary-500 mb-4" />
          <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Loading...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-900">
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

      {/* Top Header */}
      <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                {greeting}, Dr.
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <DemoModeToggle />
              <CommandKPatientSelector />
              <NotificationBadge
                count={unreadNotificationsCount}
                onClick={() => setShowNotificationsPanel(!showNotificationsPanel)}
                hasCritical={hasCriticalNotifications}
              />
              <button
                onClick={() => router.push('/dashboard/patients')}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition font-medium shadow-lg hover:shadow-xl"
              >
                View Patients
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Bento Grid - Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <PastelGlassStatCard
            label="Total Active Patients"
            value={stats.totalPatients}
            change={{ value: 8.2, trend: 'up', period: 'vs last week' }}
            trendData={trendData.patients}
            gradient="mint"
            onClick={() => router.push('/dashboard/patients')}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />

          <PastelGlassStatCard
            label="Scheduled Appointments"
            value={stats.todayAppointments}
            change={{ value: 12.5, trend: 'up', period: 'vs yesterday' }}
            trendData={trendData.appointments}
            gradient="lavender"
            onClick={() => router.push('/dashboard/appointments')}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />

          <PastelGlassStatCard
            label="Signed Prescriptions"
            value={stats.prescriptionsToday}
            change={{ value: 5.3, trend: 'up', period: 'vs last week' }}
            trendData={trendData.prescriptions}
            gradient="cyan"
            onClick={() => router.push('/dashboard/prescriptions')}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />

          <PastelGlassStatCard
            label="Clinical Notes"
            value={24}
            change={{ value: 18.7, trend: 'up', period: 'vs last week' }}
            trendData={trendData.notes}
            gradient="mint"
            onClick={() => router.push('/dashboard/notes')}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
        </div>

        {/* New KPI Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {widgets.find((w) => w.id === 'ai-time')?.enabled && <AITimeReclaimedWidgetRadial />}
          {widgets.find((w) => w.id === 'pending-results')?.enabled && <PendingResultsWidget />}
          {widgets.find((w) => w.id === 'adherence')?.enabled && <AdherenceScoreWidget />}
          {widgets.find((w) => w.id === 'billable')?.enabled && <BillableValueWidget />}
        </div>

        {/* Command Center Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
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
            <AIInsights
              maxHeight="600px"
              onInsightAction={(id, action) => {
                console.log(`Insight ${id} ${action}`);
              }}
              showConfidence={true}
              showEvidence={true}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
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

            {/* Focus Timer */}
            {widgets.find((w) => w.id === 'focus-timer')?.enabled && (
              <FocusTimer
                onComplete={() => {
                  console.log('Focus session complete!');
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

