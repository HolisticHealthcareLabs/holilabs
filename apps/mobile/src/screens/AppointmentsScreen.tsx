/**
 * Appointments Screen
 * Calendar view and appointment scheduling for clinical practice
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { format, addDays, startOfWeek, isSameDay, isToday, isPast } from 'date-fns';
import { useTheme } from '../hooks/useTheme';
import { useNotifications } from '../hooks/useNotifications';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  type: 'consultation' | 'followup' | 'emergency' | 'telemedicine';
  date: Date;
  duration: number; // minutes
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  isVirtual: boolean;
}

interface TimeSlot {
  time: string;
  hour: number;
  isAvailable: boolean;
  appointment?: Appointment;
}

export const AppointmentsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { scheduleAppointmentReminder } = useNotifications();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState<'day' | 'week'>('day');
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: '1',
      patientId: 'p1',
      patientName: 'Maria Silva',
      type: 'consultation',
      date: new Date(new Date().setHours(9, 0, 0, 0)),
      duration: 30,
      status: 'confirmed',
      notes: 'Annual checkup',
      isVirtual: false,
    },
    {
      id: '2',
      patientId: 'p2',
      patientName: 'João Santos',
      type: 'followup',
      date: new Date(new Date().setHours(10, 30, 0, 0)),
      duration: 20,
      status: 'scheduled',
      notes: 'Post-surgery follow-up',
      isVirtual: false,
    },
    {
      id: '3',
      patientId: 'p3',
      patientName: 'Ana Costa',
      type: 'telemedicine',
      date: new Date(new Date().setHours(14, 0, 0, 0)),
      duration: 30,
      status: 'confirmed',
      isVirtual: true,
    },
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getDayAppointments = (date: Date) => {
    return appointments.filter((apt) => isSameDay(apt.date, date));
  };

  const getTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const dayAppointments = getDayAppointments(selectedDate);

    // Generate slots from 8 AM to 6 PM
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotDate = new Date(selectedDate);
        slotDate.setHours(hour, minute, 0, 0);

        // Check if there's an appointment at this time
        const appointment = dayAppointments.find((apt) => {
          const aptTime = new Date(apt.date);
          return aptTime.getHours() === hour && aptTime.getMinutes() === minute;
        });

        slots.push({
          time,
          hour,
          isAvailable: !appointment && !isPast(slotDate),
          appointment,
        });
      }
    }

    return slots;
  };

  const handleSelectDate = (date: Date) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedDate(date);
  };

  const handleBookSlot = (slot: TimeSlot) => {
    if (!slot.isAvailable) return;

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      'Book Appointment',
      `Book appointment at ${slot.time}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book',
          onPress: () => {
            // TODO: Implement booking logic
            console.log('Booking appointment at', slot.time);
            Alert.alert('Success', 'Appointment booked successfully');
          },
        },
      ]
    );
  };

  const handleAppointmentPress = (appointment: Appointment) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Alert.alert(
      appointment.patientName,
      `Type: ${appointment.type}\nTime: ${format(appointment.date, 'h:mm a')}\nDuration: ${appointment.duration} min\nStatus: ${appointment.status}${appointment.notes ? `\n\nNotes: ${appointment.notes}` : ''}`,
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Set Reminder',
          onPress: async () => {
            await scheduleAppointmentReminder(
              appointment.id,
              appointment.patientName,
              appointment.date,
              30
            );
            Alert.alert('Success', 'Reminder set for 30 minutes before appointment');
          },
        },
        appointment.status === 'scheduled' && {
          text: 'Confirm',
          onPress: () => {
            // TODO: Confirm appointment
            console.log('Confirming appointment', appointment.id);
          },
        },
        {
          text: 'Cancel Appointment',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Cancel Appointment',
              'Are you sure you want to cancel this appointment?',
              [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Yes, Cancel',
                  style: 'destructive',
                  onPress: () => {
                    // TODO: Cancel appointment
                    setAppointments((prev) =>
                      prev.map((apt) =>
                        apt.id === appointment.id ? { ...apt, status: 'cancelled' } : apt
                      )
                    );
                  },
                },
              ]
            );
          },
        },
      ].filter(Boolean) as any
    );
  };

  const getAppointmentTypeColor = (type: Appointment['type']) => {
    const colors = {
      consultation: theme.colors.primary,
      followup: theme.colors.success,
      emergency: theme.colors.error,
      telemedicine: theme.colors.info,
    };
    return colors[type];
  };

  const getAppointmentTypeIcon = (type: Appointment['type']) => {
    const icons = {
      consultation: '🩺',
      followup: '🔄',
      emergency: '🚨',
      telemedicine: '💻',
    };
    return icons[type];
  };

  const todayAppointments = getDayAppointments(new Date());
  const upcomingAppointments = appointments.filter(
    (apt) => apt.date > new Date() && apt.status !== 'cancelled'
  );

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Appointments</Text>
        <Text style={styles.headerSubtitle}>
          {todayAppointments.length} appointment{todayAppointments.length !== 1 ? 's' : ''} today
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              selectedView === 'day' && styles.viewToggleButtonActive,
            ]}
            onPress={() => {
              setSelectedView('day');
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            <Text
              style={[
                styles.viewToggleText,
                selectedView === 'day' && styles.viewToggleTextActive,
              ]}
            >
              Day
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              selectedView === 'week' && styles.viewToggleButtonActive,
            ]}
            onPress={() => {
              setSelectedView('week');
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            <Text
              style={[
                styles.viewToggleText,
                selectedView === 'week' && styles.viewToggleTextActive,
              ]}
            >
              Week
            </Text>
          </TouchableOpacity>
        </View>

        {/* Week Calendar */}
        <Card style={styles.calendarCard}>
          <View style={styles.weekDays}>
            {getWeekDays().map((day, index) => {
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              const dayAppointments = getDayAppointments(day);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.weekDay,
                    isSelected && styles.weekDaySelected,
                    isCurrentDay && !isSelected && styles.weekDayToday,
                  ]}
                  onPress={() => handleSelectDate(day)}
                >
                  <Text
                    style={[
                      styles.weekDayName,
                      isSelected && styles.weekDayNameSelected,
                    ]}
                  >
                    {format(day, 'EEE')}
                  </Text>
                  <Text
                    style={[
                      styles.weekDayNumber,
                      isSelected && styles.weekDayNumberSelected,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                  {dayAppointments.length > 0 && (
                    <View
                      style={[
                        styles.weekDayDot,
                        isSelected && styles.weekDayDotSelected,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Selected Date Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isToday(selectedDate)
              ? 'Today'
              : format(selectedDate, 'MMMM d, yyyy')}
          </Text>

          {selectedView === 'day' ? (
            // Time slots view
            <Card>
              <ScrollView style={styles.timeSlotsContainer} nestedScrollEnabled>
                {getTimeSlots().map((slot, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.timeSlot,
                      !slot.isAvailable && styles.timeSlotUnavailable,
                      slot.appointment && styles.timeSlotBooked,
                    ]}
                    onPress={() =>
                      slot.appointment
                        ? handleAppointmentPress(slot.appointment)
                        : handleBookSlot(slot)
                    }
                    disabled={!slot.isAvailable && !slot.appointment}
                  >
                    <Text
                      style={[
                        styles.timeSlotTime,
                        !slot.isAvailable && styles.timeSlotTimeUnavailable,
                        slot.appointment && styles.timeSlotTimeBooked,
                      ]}
                    >
                      {slot.time}
                    </Text>

                    {slot.appointment ? (
                      <View style={styles.appointmentInSlot}>
                        <View style={styles.appointmentInSlotHeader}>
                          <Text style={styles.appointmentInSlotIcon}>
                            {getAppointmentTypeIcon(slot.appointment.type)}
                          </Text>
                          <Text style={styles.appointmentInSlotName}>
                            {slot.appointment.patientName}
                          </Text>
                          {slot.appointment.isVirtual && (
                            <Text style={styles.virtualBadge}>Virtual</Text>
                          )}
                        </View>
                        <Text style={styles.appointmentInSlotType}>
                          {slot.appointment.type} • {slot.appointment.duration} min
                        </Text>
                      </View>
                    ) : slot.isAvailable ? (
                      <Text style={styles.timeSlotAvailable}>Available</Text>
                    ) : (
                      <Text style={styles.timeSlotPast}>Past</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Card>
          ) : (
            // List view
            getDayAppointments(selectedDate).length > 0 ? (
              getDayAppointments(selectedDate).map((appointment) => (
                <TouchableOpacity
                  key={appointment.id}
                  onPress={() => handleAppointmentPress(appointment)}
                >
                  <Card style={styles.appointmentCard}>
                    <View style={styles.appointmentCardContent}>
                      <View
                        style={[
                          styles.appointmentTypeIndicator,
                          {
                            backgroundColor: getAppointmentTypeColor(appointment.type),
                          },
                        ]}
                      />
                      <View style={styles.appointmentInfo}>
                        <View style={styles.appointmentHeader}>
                          <Text style={styles.appointmentName}>
                            {appointment.patientName}
                          </Text>
                          {appointment.isVirtual && (
                            <View style={styles.virtualPill}>
                              <Text style={styles.virtualPillText}>💻 Virtual</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.appointmentTime}>
                          {format(appointment.date, 'h:mm a')} • {appointment.duration} min
                        </Text>
                        <Text style={styles.appointmentType}>
                          {getAppointmentTypeIcon(appointment.type)} {appointment.type}
                        </Text>
                        {appointment.notes && (
                          <Text style={styles.appointmentNotes}>{appointment.notes}</Text>
                        )}
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))
            ) : (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyTitle}>No appointments</Text>
                <Text style={styles.emptySubtitle}>
                  No appointments scheduled for this day
                </Text>
              </Card>
            )
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{todayAppointments.length}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{upcomingAppointments.length}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>
                {appointments.filter((a) => a.status === 'completed').length}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </Card>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          Alert.alert('New Appointment', 'Booking flow coming soon');
        }}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: theme.spacing[6],
      paddingTop: theme.spacing[4],
      paddingBottom: theme.spacing[4],
      backgroundColor: theme.colors.background,
    },
    headerTitle: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing[1],
    },
    headerSubtitle: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: theme.spacing[6],
    },
    viewToggle: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[1],
      marginBottom: theme.spacing[4],
    },
    viewToggleButton: {
      flex: 1,
      paddingVertical: theme.spacing[2],
      alignItems: 'center',
      borderRadius: theme.borderRadius.md,
    },
    viewToggleButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    viewToggleText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    viewToggleTextActive: {
      color: '#FFFFFF',
    },
    calendarCard: {
      marginBottom: theme.spacing[6],
    },
    weekDays: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    weekDay: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing[3],
      borderRadius: theme.borderRadius.md,
      marginHorizontal: theme.spacing[1],
    },
    weekDaySelected: {
      backgroundColor: theme.colors.primary,
    },
    weekDayToday: {
      backgroundColor: theme.colors.primaryLight,
    },
    weekDayName: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing[1],
    },
    weekDayNameSelected: {
      color: '#FFFFFF',
    },
    weekDayNumber: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
    },
    weekDayNumberSelected: {
      color: '#FFFFFF',
    },
    weekDayDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.primary,
      marginTop: theme.spacing[1],
    },
    weekDayDotSelected: {
      backgroundColor: '#FFFFFF',
    },
    section: {
      marginBottom: theme.spacing[6],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing[3],
    },
    timeSlotsContainer: {
      maxHeight: 400,
    },
    timeSlot: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    timeSlotUnavailable: {
      opacity: 0.4,
    },
    timeSlotBooked: {
      backgroundColor: theme.colors.primaryLight,
    },
    timeSlotTime: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      width: 60,
    },
    timeSlotTimeUnavailable: {
      color: theme.colors.textTertiary,
    },
    timeSlotTimeBooked: {
      color: theme.colors.primary,
    },
    timeSlotAvailable: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.success,
    },
    timeSlotPast: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textTertiary,
    },
    appointmentInSlot: {
      flex: 1,
    },
    appointmentInSlotHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[1],
    },
    appointmentInSlotIcon: {
      fontSize: 16,
      marginRight: theme.spacing[2],
    },
    appointmentInSlotName: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      flex: 1,
    },
    virtualBadge: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.info,
      backgroundColor: theme.colors.infoLight,
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.sm,
    },
    appointmentInSlotType: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    appointmentCard: {
      marginBottom: theme.spacing[3],
    },
    appointmentCardContent: {
      flexDirection: 'row',
    },
    appointmentTypeIndicator: {
      width: 4,
      borderRadius: 2,
      marginRight: theme.spacing[3],
    },
    appointmentInfo: {
      flex: 1,
    },
    appointmentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing[1],
    },
    appointmentName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
    },
    virtualPill: {
      backgroundColor: theme.colors.infoLight,
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.full,
    },
    virtualPillText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.info,
    },
    appointmentTime: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing[1],
    },
    appointmentType: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing[1],
    },
    appointmentNotes: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textTertiary,
      fontStyle: 'italic',
    },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: theme.spacing[8],
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: theme.spacing[3],
    },
    emptyTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing[1],
    },
    emptySubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    statsGrid: {
      flexDirection: 'row',
      gap: theme.spacing[3],
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing[4],
    },
    statValue: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary,
      marginBottom: theme.spacing[1],
    },
    statLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    fab: {
      position: 'absolute',
      bottom: theme.spacing[6],
      right: theme.spacing[6],
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.lg,
    },
    fabIcon: {
      fontSize: 32,
      color: '#FFFFFF',
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
