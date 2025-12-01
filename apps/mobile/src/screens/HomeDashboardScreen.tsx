/**
 * Home Dashboard Screen - Clinical Command Center
 * AI-powered insights and role-based clinical overview
 *
 * Features:
 * - Personalized greeting with clinician name
 * - Today's schedule with upcoming appointments
 * - Urgent actions requiring attention
 * - AI-powered clinical insights
 * - Quick action buttons
 * - Patient census and metrics
 * - Preventive care opportunities
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { format, isToday, addHours } from 'date-fns';
import { useTheme } from '../hooks/useTheme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AnalyticsService, AnalyticsCategory } from '../services/analyticsService';

const { width } = Dimensions.get('window');

// Types
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  time: Date;
  type: 'checkup' | 'followup' | 'new' | 'urgent';
  duration: number;
  notes?: string;
}

interface UrgentAction {
  id: string;
  type: 'lab_results' | 'prescription' | 'abnormal_vitals' | 'message' | 'referral';
  title: string;
  description: string;
  patientName: string;
  priority: 'high' | 'medium' | 'low';
  count?: number;
}

interface AIInsight {
  id: string;
  type: 'preventive_care' | 'cohort_analytics' | 'risk_alert' | 'cost_savings';
  title: string;
  description: string;
  actionable: boolean;
  icon: string;
}

export const HomeDashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mock data - Replace with React Query hooks
  const clinicianName = 'Dr. Sarah Chen';
  const [appointments] = useState<Appointment[]>([
    {
      id: 'apt1',
      patientId: 'p1',
      patientName: 'Maria Silva',
      time: addHours(new Date(), 1),
      type: 'checkup',
      duration: 30,
      notes: 'Annual physical + lab review',
    },
    {
      id: 'apt2',
      patientId: 'p2',
      patientName: 'João Santos',
      time: addHours(new Date(), 3),
      type: 'followup',
      duration: 15,
      notes: 'Diabetes follow-up',
    },
    {
      id: 'apt3',
      patientId: 'p3',
      patientName: 'Ana Costa',
      time: addHours(new Date(), 5),
      type: 'urgent',
      duration: 30,
      notes: 'Chest pain evaluation',
    },
  ]);

  const [urgentActions] = useState<UrgentAction[]>([
    {
      id: 'ua1',
      type: 'lab_results',
      title: 'Lab Results Ready',
      description: 'Glucose elevated at 145 mg/dL',
      patientName: 'Maria Silva',
      priority: 'high',
      count: 3,
    },
    {
      id: 'ua2',
      type: 'prescription',
      title: 'Prescription Refills',
      description: 'Awaiting approval',
      patientName: 'Multiple patients',
      priority: 'medium',
      count: 2,
    },
    {
      id: 'ua3',
      type: 'abnormal_vitals',
      title: 'Abnormal Vitals',
      description: 'BP 160/95 mmHg',
      patientName: 'Carlos Mendes',
      priority: 'high',
    },
  ]);

  const [aiInsights] = useState<AIInsight[]>([
    {
      id: 'ai1',
      type: 'preventive_care',
      title: 'Preventive Care Opportunities',
      description: '5 patients due for annual checkups',
      actionable: true,
      icon: '🎯',
    },
    {
      id: 'ai2',
      type: 'cohort_analytics',
      title: 'Diabetes Cohort Trending',
      description: 'Average A1C decreased 0.3% this month',
      actionable: false,
      icon: '📊',
    },
    {
      id: 'ai3',
      type: 'risk_alert',
      title: 'High-Risk Patient Alert',
      description: '2 patients with potential medication interactions',
      actionable: true,
      icon: '⚠️',
    },
  ]);

  const stats = useMemo(() => ({
    totalPatients: 342,
    todayAppointments: appointments.length,
    urgentItems: urgentActions.filter(a => a.priority === 'high').length,
    messagesUnread: 7,
  }), [appointments, urgentActions]);

  useEffect(() => {
    AnalyticsService.trackScreenView('HomeDashboard');

    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // TODO: Refresh data from API
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);

    AnalyticsService.trackEvent({
      category: AnalyticsCategory.USER,
      action: 'dashboard_refreshed',
    });
  };

  const handleAppointmentPress = (appointment: Appointment) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // TODO: Navigate to patient details
    AnalyticsService.trackEvent({
      category: AnalyticsCategory.APPOINTMENT,
      action: 'appointment_selected',
    });
  };

  const handleUrgentActionPress = (action: UrgentAction) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // TODO: Navigate to relevant screen
    AnalyticsService.trackEvent({
      category: AnalyticsCategory.USER,
      action: 'urgent_action_selected',
    });
  };

  const handleInsightPress = (insight: AIInsight) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // TODO: Navigate to insight details
    AnalyticsService.trackEvent({
      category: AnalyticsCategory.USER,
      action: 'ai_insight_selected',
    });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getAppointmentTypeColor = (type: Appointment['type']) => {
    switch (type) {
      case 'urgent': return theme.colors.error;
      case 'new': return theme.colors.primary;
      case 'followup': return theme.colors.accent;
      default: return theme.colors.success;
    }
  };

  const getUrgentActionIcon = (type: UrgentAction['type']) => {
    switch (type) {
      case 'lab_results': return '🧪';
      case 'prescription': return '💊';
      case 'abnormal_vitals': return '❤️';
      case 'message': return '💬';
      case 'referral': return '📋';
      default: return '📌';
    }
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header with Greeting */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.name}>{clinicianName}</Text>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              {stats.messagesUnread > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {stats.messagesUnread}
                  </Text>
                </View>
              )}
              <Text style={styles.notificationIcon}>🔔</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalPatients}</Text>
              <Text style={styles.statLabel}>Total Patients</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.todayAppointments}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.urgentItems}</Text>
              <Text style={styles.statLabel}>Urgent</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.messagesUnread}</Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsContainer}
          >
            <TouchableOpacity style={styles.quickAction}>
              <Text style={styles.quickActionIcon}>📝</Text>
              <Text style={styles.quickActionText}>New Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Text style={styles.quickActionIcon}>🔍</Text>
              <Text style={styles.quickActionText}>Find Patient</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Text style={styles.quickActionIcon}>📅</Text>
              <Text style={styles.quickActionText}>Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={styles.quickActionText}>Messages</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {appointments.length > 0 ? (
            appointments.map((apt) => (
              <TouchableOpacity
                key={apt.id}
                style={styles.appointmentCard}
                onPress={() => handleAppointmentPress(apt)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.appointmentIndicator,
                    { backgroundColor: getAppointmentTypeColor(apt.type) },
                  ]}
                />
                <View style={styles.appointmentContent}>
                  <View style={styles.appointmentHeader}>
                    <Text style={styles.appointmentTime}>
                      {format(apt.time, 'h:mm a')}
                    </Text>
                    <View
                      style={[
                        styles.appointmentTypeBadge,
                        { backgroundColor: `${getAppointmentTypeColor(apt.type)}20` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.appointmentTypeText,
                          { color: getAppointmentTypeColor(apt.type) },
                        ]}
                      >
                        {apt.type.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.appointmentPatient}>{apt.patientName}</Text>
                  {apt.notes && (
                    <Text style={styles.appointmentNotes}>{apt.notes}</Text>
                  )}
                  <Text style={styles.appointmentDuration}>
                    {apt.duration} minutes
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Card variant="outlined" style={styles.emptyCard}>
              <Text style={styles.emptyText}>No appointments scheduled</Text>
            </Card>
          )}
        </View>

        {/* Urgent Actions */}
        {urgentActions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Urgent Actions</Text>
            {urgentActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.urgentActionCard,
                  action.priority === 'high' && styles.urgentActionCardHigh,
                ]}
                onPress={() => handleUrgentActionPress(action)}
                activeOpacity={0.7}
              >
                <View style={styles.urgentActionIcon}>
                  <Text style={styles.urgentActionIconText}>
                    {getUrgentActionIcon(action.type)}
                  </Text>
                </View>
                <View style={styles.urgentActionContent}>
                  <View style={styles.urgentActionHeader}>
                    <Text style={styles.urgentActionTitle}>{action.title}</Text>
                    {action.count && action.count > 1 && (
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{action.count}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.urgentActionPatient}>
                    {action.patientName}
                  </Text>
                  <Text style={styles.urgentActionDescription}>
                    {action.description}
                  </Text>
                </View>
                <Text style={styles.urgentActionArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* AI Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 AI Insights</Text>
          {aiInsights.map((insight) => (
            <TouchableOpacity
              key={insight.id}
              style={styles.insightCard}
              onPress={() => handleInsightPress(insight)}
              activeOpacity={0.7}
              disabled={!insight.actionable}
            >
              <Text style={styles.insightIcon}>{insight.icon}</Text>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
              </View>
              {insight.actionable && (
                <Text style={styles.insightArrow}>›</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },

    // HEADER STYLES
    headerGradient: {
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      paddingBottom: 24,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 16,
      marginBottom: 24,
    },
    greeting: {
      fontSize: 16,
      color: 'rgba(255,255,255,0.9)',
      marginBottom: 4,
    },
    name: {
      fontSize: 28,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    notificationButton: {
      position: 'relative',
      padding: 8,
    },
    notificationIcon: {
      fontSize: 24,
    },
    notificationBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: theme.colors.error,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
      zIndex: 1,
    },
    notificationBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },

    // STATS STYLES
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      gap: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
    },

    // SECTION STYLES
    section: {
      paddingHorizontal: 20,
      marginTop: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
    },
    sectionLink: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '600',
    },

    // QUICK ACTIONS
    quickActionsContainer: {
      gap: 12,
      paddingRight: 20,
    },
    quickAction: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      minWidth: 100,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    quickActionIcon: {
      fontSize: 32,
      marginBottom: 8,
    },
    quickActionText: {
      fontSize: 13,
      color: theme.colors.text,
      fontWeight: '600',
    },

    // APPOINTMENT STYLES
    appointmentCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    appointmentIndicator: {
      width: 4,
    },
    appointmentContent: {
      flex: 1,
      padding: 16,
    },
    appointmentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    appointmentTime: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    appointmentTypeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    appointmentTypeText: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    appointmentPatient: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    appointmentNotes: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    appointmentDuration: {
      fontSize: 13,
      color: theme.colors.textTertiary,
    },

    // URGENT ACTION STYLES
    urgentActionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    urgentActionCardHigh: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.error,
      backgroundColor: `${theme.colors.error}05`,
    },
    urgentActionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.surfaceSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    urgentActionIconText: {
      fontSize: 24,
    },
    urgentActionContent: {
      flex: 1,
    },
    urgentActionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    urgentActionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginRight: 8,
    },
    countBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    countBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    urgentActionPatient: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    urgentActionDescription: {
      fontSize: 14,
      color: theme.colors.text,
    },
    urgentActionArrow: {
      fontSize: 24,
      color: theme.colors.textTertiary,
      marginLeft: 8,
    },

    // AI INSIGHT STYLES
    insightCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${theme.colors.primary}10`,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}30`,
    },
    insightIcon: {
      fontSize: 32,
      marginRight: 12,
    },
    insightContent: {
      flex: 1,
    },
    insightTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    insightDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    insightArrow: {
      fontSize: 24,
      color: theme.colors.primary,
      marginLeft: 8,
    },

    // EMPTY STATE
    emptyCard: {
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
