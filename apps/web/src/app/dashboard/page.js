"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Dashboard;
/**
 * Dashboard Home - Command Center for Physicians
 *
 * Features:
 * - Real-time analytics
 * - Recent patient activity
 * - Quick actions
 * - Today's schedule
 * - Performance metrics
 * - Smart notifications
 */
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const LanguageContext_1 = require("@/contexts/LanguageContext");
const WelcomeModal_1 = __importDefault(require("@/components/onboarding/WelcomeModal"));
const OnboardingChecklist_1 = __importDefault(require("@/components/onboarding/OnboardingChecklist"));
function Dashboard() {
    const router = (0, navigation_1.useRouter)();
    const { t } = (0, LanguageContext_1.useLanguage)();
    const [stats, setStats] = (0, react_1.useState)({
        totalPatients: 0,
        activePatients: 0,
        todayAppointments: 0,
        pendingTasks: 0,
        recentNotes: 0,
        prescriptionsToday: 0,
    });
    const [recentActivity, setRecentActivity] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [greeting, setGreeting] = (0, react_1.useState)('');
    const [showExportModal, setShowExportModal] = (0, react_1.useState)(false);
    const [exportLoading, setExportLoading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // Set time-based greeting
        const hour = new Date().getHours();
        if (hour < 12)
            setGreeting(t('dashboard.greeting.morning'));
        else if (hour < 18)
            setGreeting(t('dashboard.greeting.afternoon'));
        else
            setGreeting(t('dashboard.greeting.evening'));
        // Fetch dashboard data
        fetchDashboardData();
    }, [t]);
    const fetchDashboardData = async () => {
        try {
            // Fetch patients for stats
            const patientsRes = await fetch('/api/patients');
            const patientsData = await patientsRes.json();
            if (patientsData.success) {
                const patients = patientsData.data;
                setStats({
                    totalPatients: patients.length,
                    activePatients: patients.filter((p) => p.isActive).length,
                    todayAppointments: patients.filter((p) => p.appointments?.length > 0).length,
                    pendingTasks: 0,
                    recentNotes: 0,
                    prescriptionsToday: 0,
                });
                // Generate recent activity from patients
                const activity = patients
                    .slice(0, 5)
                    .map((p) => ({
                    id: p.id,
                    type: 'note',
                    patientName: `${p.firstName} ${p.lastName}`,
                    patientId: p.id,
                    action: p.medications?.length > 0 ? t('dashboard.medicationUpdated') : t('dashboard.patientRegistered'),
                    timestamp: p.updatedAt,
                    icon: p.medications?.length > 0 ? '💊' : '👤',
                    color: p.medications?.length > 0 ? 'text-green-600' : 'text-blue-600',
                }));
                setRecentActivity(activity);
            }
        }
        catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffMins < 1)
            return t('dashboard.justNow');
        if (diffMins < 60)
            return t('dashboard.minutesAgo').replace('{0}', diffMins.toString());
        if (diffHours < 24)
            return t('dashboard.hoursAgo').replace('{0}', diffHours.toString());
        return t('dashboard.daysAgo').replace('{0}', diffDays.toString());
    };
    const handleExport = async (format, startDate, endDate) => {
        setExportLoading(true);
        try {
            const response = await fetch('/api/export/billing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format, startDate, endDate, includeUnsigned: false }),
            });
            if (!response.ok) {
                const error = await response.json();
                alert(`Error: ${error.error || 'Failed to export'}`);
                return;
            }
            if (format === 'csv') {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `billing-export-${startDate}-to-${endDate}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
            else {
                const data = await response.json();
                console.log('PDF data:', data);
                alert('PDF export coming soon! Use CSV for now.');
            }
            setShowExportModal(false);
        }
        catch (error) {
            console.error('Error exporting:', error);
            alert(t('dashboard.errorExporting'));
        }
        finally {
            setExportLoading(false);
        }
    };
    if (loading) {
        return (<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4"/>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t('dashboard.loading')}</h3>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Onboarding Components */}
      <WelcomeModal_1.default />
      <OnboardingChecklist_1.default />

      {/* Top Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{greeting}, Dr.</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-primary transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"/>
              </button>
              <link_1.default href="/dashboard/patients" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium">
                {t('dashboard.viewPatients')}
              </link_1.default>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
              <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                {t('dashboard.weekGrowth')}
              </span>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">{t('dashboard.stats.totalPatients')}</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalPatients}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{stats.activePatients} {t('dashboard.stats.activePatients')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                {t('dashboard.stats.today')}
              </span>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">{t('dashboard.stats.scheduledAppointments')}</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.todayAppointments}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">3 {t('dashboard.stats.upcoming')} 2 {t('dashboard.stats.hours')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-full">
                {t('dashboard.stats.thisWeek')}
              </span>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">{t('dashboard.stats.clinicalNotes')}</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.recentNotes}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('dashboard.stats.average')}: 4.2 {t('dashboard.stats.perDay')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
              </div>
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">
                {t('dashboard.stats.today')}
              </span>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">{t('dashboard.stats.signedPrescriptions')}</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.prescriptionsToday}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">0 {t('dashboard.stats.pending')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('dashboard.recentActivity')}</h2>
                <button className="text-sm text-primary hover:text-primary/80 font-medium">
                  {t('dashboard.viewAll')} →
                </button>
              </div>

              {recentActivity.length === 0 ? (<div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-gray-600 dark:text-gray-400">{t('dashboard.noActivity')}</p>
                </div>) : (<div className="space-y-4">
                  {recentActivity.map((activity) => (<div key={activity.id} onClick={() => router.push(`/dashboard/patients/${activity.patientId}`)} className="flex items-start space-x-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition cursor-pointer group">
                      <div className={`text-3xl ${activity.color}`}>{activity.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary transition">
                          {activity.patientName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{activity.action}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                    </div>))}
                </div>)}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{t('dashboard.quickActions')}</h2>
              <div className="space-y-3">
                <link_1.default href="/dashboard/patients" className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/20 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/30 dark:hover:to-blue-900/30 rounded-lg transition group">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{t('dashboard.viewPatients')}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('dashboard.completePatients')}</p>
                  </div>
                </link_1.default>

                <link_1.default href="/dashboard/patients/new" className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/20 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/30 dark:hover:to-green-900/30 rounded-lg transition group">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{t('dashboard.newPatient')}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('dashboard.quickRegistration')}</p>
                  </div>
                </link_1.default>

                <link_1.default href="/dashboard/ai" className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/20 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/30 dark:hover:to-purple-900/30 rounded-lg transition group">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{t('dashboard.aiAssistant')}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('dashboard.consultNow')}</p>
                  </div>
                </link_1.default>

                <link_1.default href="/dashboard/diagnosis" className="flex items-center space-x-3 p-4 bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-900/20 hover:from-pink-100 hover:to-pink-200 dark:hover:from-pink-900/30 dark:hover:to-pink-900/30 rounded-lg transition group">
                  <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                    <span className="text-xl">🩺</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">AI Diagnosis</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Clinical decision support</p>
                  </div>
                </link_1.default>

                <button onClick={() => setShowExportModal(true)} className="flex items-center space-x-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/20 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/30 dark:hover:to-orange-900/30 rounded-lg transition group">
                  <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{t('dashboard.exportBilling')}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('dashboard.csvInsurance')}</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-sm p-6 text-white">
              <h2 className="text-lg font-bold mb-4">{t('dashboard.todaySchedule')}</h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full"/>
                  <div className="flex-1">
                    <p className="text-sm font-medium">09:00 - {t('dashboard.followupConsult')}</p>
                    <p className="text-xs opacity-80">María González</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full"/>
                  <div className="flex-1">
                    <p className="text-sm font-medium">11:30 - {t('dashboard.firstConsult')}</p>
                    <p className="text-xs opacity-80">{t('dashboard.newPatientLabel')}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-white/50 rounded-full"/>
                  <div className="flex-1 opacity-60">
                    <p className="text-sm font-medium">14:00 - {t('dashboard.resultsReview')}</p>
                    <p className="text-xs">Carlos Silva</p>
                  </div>
                </div>
              </div>
              <button className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition">
                {t('dashboard.viewFullSchedule')} →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (<div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">📊 {t('dashboard.exportBillingTitle')}</h3>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const startDate = formData.get('startDate');
                const endDate = formData.get('endDate');
                const format = formData.get('format');
                handleExport(format, startDate, endDate);
            }} className="space-y-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('dashboard.startDate')}
                </label>
                <input type="date" name="startDate" required defaultValue={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('dashboard.endDate')}
                </label>
                <input type="date" name="endDate" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"/>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('dashboard.exportFormat')}
                </label>
                <select name="format" required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                  <option value="csv">{t('dashboard.csvCompatible')}</option>
                  <option value="pdf" disabled>{t('dashboard.pdfComing')}</option>
                </select>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>📋 {t('dashboard.includes')}:</strong> {t('dashboard.includesDetails')}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setShowExportModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  {t('dashboard.cancel')}
                </button>
                <button type="submit" disabled={exportLoading} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {exportLoading ? (<span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      {t('dashboard.exporting')}
                    </span>) : (t('dashboard.export'))}
                </button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
}
//# sourceMappingURL=page.js.map