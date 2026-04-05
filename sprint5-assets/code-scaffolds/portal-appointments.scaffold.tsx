'use client';

/**
 * Portal Appointments — Self-scheduling with provider selection + calendar
 *
 * Reference for src/app/portal/dashboard/appointments/page.tsx
 *
 * 3-step wizard: Provider → Date/Time → Confirm
 * Calendar grid with availability dots, horizontal week view on mobile.
 * RUTH: cancellation policy shown before booking
 *
 * @see sprint5-assets/api-contracts.json
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Appointment {
  id: string;
  date: string;
  time: string;
  providerId: string;
  providerName: string;
  specialty: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  reason?: string;
}

interface Provider {
  id: string;
  name: string;
  specialty: string;
  nextAvailable: string;
  photoUrl?: string;
}

interface TimeSlot {
  time: string; // "09:00"
  available: boolean;
  isLast: boolean; // Last available slot
}

type WizardStep = 'list' | 'provider' | 'datetime' | 'confirm';

// ─── Upcoming Appointments List ──────────────────────────────────────────────

function AppointmentCard({ appt, locale, onCancel }: { appt: Appointment; locale: string; onCancel: (id: string) => void }) {
  const date = new Date(`${appt.date}T${appt.time}`);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  const countdown = diffDays > 0
    ? `${diffDays} ${locale === 'pt-BR' ? 'dias' : 'days'}`
    : diffHours > 0
      ? `${diffHours}h`
      : locale === 'pt-BR' ? 'Hoje' : 'Today';

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-severity-mild/10 text-severity-mild',
    CONFIRMED: 'bg-severity-minimal/10 text-severity-minimal',
    CANCELLED: 'bg-[var(--text-subtle)]/10 text-[var(--text-subtle)]',
    COMPLETED: 'bg-severity-minimal/10 text-severity-minimal',
  };

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-surface-elevated px-md py-md" role="listitem">
      <div className="flex items-start gap-md">
        <div className="flex flex-col items-center shrink-0 min-w-[60px]">
          <span className="text-heading-lg font-bold text-[var(--text-foreground)]">{date.getDate()}</span>
          <span className="text-caption text-[var(--text-muted)]">{date.toLocaleString(locale === 'pt-BR' ? 'pt-BR' : 'en', { month: 'short' })}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-sm">
            <p className="text-body font-semibold text-[var(--text-foreground)]">{appt.providerName}</p>
            <span className={`rounded-full px-sm py-xs text-caption font-semibold ${statusColors[appt.status] || ''}`}>
              {appt.status}
            </span>
          </div>
          <p className="text-body text-[var(--text-muted)]">{appt.specialty}</p>
          <div className="flex items-center gap-md mt-xs">
            <span className="flex items-center gap-xs text-caption text-[var(--text-subtle)]">
              <Clock className="h-3 w-3" aria-hidden="true" /> {appt.time}
            </span>
            <span className="text-caption font-semibold text-severity-mild">{countdown}</span>
          </div>
        </div>
        {appt.status === 'SCHEDULED' && (
          <button
            onClick={() => onCancel(appt.id)}
            className="shrink-0 min-h-[var(--touch-md)] min-w-[var(--touch-md)] flex items-center justify-center rounded-lg hover:bg-severity-severe/10"
            aria-label={locale === 'pt-BR' ? 'Cancelar consulta' : 'Cancel appointment'}
          >
            <X className="h-4 w-4 text-severity-severe" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Provider Card ───────────────────────────────────────────────────────────

function ProviderCard({ provider, selected, onSelect }: { provider: Provider; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-xl border px-md py-md text-left min-h-[var(--touch-lg)] transition-colors ${
        selected ? 'border-severity-minimal bg-severity-minimal/5' : 'border-[var(--border-default)] bg-surface-elevated hover:bg-[var(--surface-secondary)]'
      }`}
      aria-pressed={selected}
    >
      <div className="flex items-center gap-md">
        <div className="h-12 w-12 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center shrink-0">
          <User className="h-6 w-6 text-[var(--text-subtle)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body font-semibold text-[var(--text-foreground)]">{provider.name}</p>
          <p className="text-caption text-[var(--text-muted)]">{provider.specialty}</p>
          <p className="text-caption text-severity-minimal mt-xs">
            Próximo: {new Date(provider.nextAvailable).toLocaleDateString('pt-BR')}
          </p>
        </div>
        {selected && <Check className="h-5 w-5 text-severity-minimal shrink-0" />}
      </div>
    </button>
  );
}

// ─── Calendar Month Grid ─────────────────────────────────────────────────────

function CalendarGrid({
  month,
  year,
  availableDates,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: {
  month: number;
  year: number;
  availableDates: Set<string>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date().toISOString().split('T')[0];
  const monthName = new Date(year, month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const days: Array<{ date: string; day: number } | null> = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date, day: d });
  }

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-surface-elevated px-md py-md">
      <div className="flex items-center justify-between mb-md">
        <button onClick={onPrevMonth} className="min-h-[var(--touch-md)] min-w-[var(--touch-md)] flex items-center justify-center rounded-lg hover:bg-[var(--surface-secondary)]" aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-body font-semibold text-[var(--text-foreground)] capitalize">{monthName}</span>
        <button onClick={onNextMonth} className="min-h-[var(--touch-md)] min-w-[var(--touch-md)] flex items-center justify-center rounded-lg hover:bg-[var(--surface-secondary)]" aria-label="Next month">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-xs text-center">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <span key={i} className="text-caption font-semibold text-[var(--text-subtle)] py-xs">{d}</span>
        ))}
        {days.map((cell, i) => {
          if (!cell) return <div key={`e-${i}`} />;
          const isAvailable = availableDates.has(cell.date);
          const isSelected = selectedDate === cell.date;
          const isToday = cell.date === today;
          const isPast = cell.date < today;

          return (
            <button
              key={cell.date}
              onClick={() => isAvailable && !isPast && onSelectDate(cell.date)}
              disabled={!isAvailable || isPast}
              className={`relative min-h-[var(--touch-md)] rounded-lg text-body transition-colors ${
                isSelected ? 'bg-[var(--text-foreground)] text-[var(--surface-primary)] font-bold' :
                isToday ? 'border-2 border-severity-minimal text-[var(--text-foreground)]' :
                isAvailable && !isPast ? 'hover:bg-[var(--surface-secondary)] text-[var(--text-foreground)]' :
                'text-[var(--text-subtle)] opacity-40'
              }`}
              aria-label={`${cell.day} ${monthName} ${isAvailable ? '— available' : '— unavailable'}`}
              aria-pressed={isSelected}
            >
              {cell.day}
              {isAvailable && !isPast && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-severity-minimal" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Time Slot Selector ──────────────────────────────────────────────────────

function SlotSelector({ slots, selectedTime, onSelect }: { slots: TimeSlot[]; selectedTime: string | null; onSelect: (time: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-xs" role="listbox" aria-label="Available time slots">
      {slots.map((slot) => (
        <button
          key={slot.time}
          onClick={() => slot.available && onSelect(slot.time)}
          disabled={!slot.available}
          role="option"
          aria-selected={selectedTime === slot.time}
          className={`rounded-lg px-sm py-sm text-body text-center min-h-[var(--touch-md)] transition-colors ${
            selectedTime === slot.time ? 'bg-[var(--text-foreground)] text-[var(--surface-primary)] font-bold' :
            slot.isLast ? 'border border-severity-mild text-severity-mild hover:bg-severity-mild/10' :
            slot.available ? 'border border-[var(--border-default)] hover:bg-[var(--surface-secondary)]' :
            'bg-[var(--surface-secondary)] text-[var(--text-subtle)] opacity-40 cursor-not-allowed'
          }`}
        >
          {slot.time}
          {selectedTime === slot.time && <Check className="h-3 w-3 inline ml-xs" />}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PortalAppointmentsPage() {
  const locale = 'pt-BR';
  const [step, setStep] = useState<WizardStep>('list');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch appointments
  useEffect(() => {
    fetch('/api/portal/appointments', { headers: { 'X-Access-Reason': 'TREATMENT' } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setAppointments(data.appointments || []); })
      .finally(() => setLoading(false));
  }, []);

  // Fetch providers when wizard starts
  useEffect(() => {
    if (step === 'provider') {
      fetch('/api/portal/appointments/providers')
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setProviders(data.providers || []); });
    }
  }, [step]);

  // Fetch slots when date selected
  useEffect(() => {
    if (selectedProvider && selectedDate) {
      fetch(`/api/portal/appointments/available-slots?providerId=${selectedProvider}&date=${selectedDate}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setSlots(data.slots || []); });
    }
  }, [selectedProvider, selectedDate]);

  // Fetch available dates when provider selected
  useEffect(() => {
    if (selectedProvider) {
      fetch(`/api/portal/appointments/available-dates?providerId=${selectedProvider}&month=${calYear}-${String(calMonth + 1).padStart(2, '0')}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setAvailableDates(new Set(data.dates || [])); });
    }
  }, [selectedProvider, calMonth, calYear]);

  const handleCancel = async (id: string) => {
    // RUTH: show cancellation policy before confirming
    if (!confirm(locale === 'pt-BR'
      ? 'Tem certeza que deseja cancelar esta consulta? Cancelamentos com menos de 24h de antecedência podem ser cobrados.'
      : 'Are you sure you want to cancel? Cancellations less than 24h in advance may be charged.'
    )) return;

    await fetch(`/api/portal/appointments/${id}/cancel`, { method: 'POST' });
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'CANCELLED' } : a));
  };

  const handleSubmit = async () => {
    if (!selectedProvider || !selectedDate || !selectedTime || !reason) return;
    const res = await fetch('/api/portal/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: selectedProvider, date: selectedDate, time: selectedTime, reason }),
    });
    if (res.ok) {
      const data = await res.json();
      setAppointments((prev) => [data.appointment, ...prev]);
      setStep('list');
      setSelectedProvider(null); setSelectedDate(null); setSelectedTime(null); setReason('');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-md px-md py-md max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-heading-lg font-bold text-[var(--text-foreground)]">
          {step === 'list' ? (locale === 'pt-BR' ? 'Minhas Consultas' : 'My Appointments') :
           step === 'provider' ? (locale === 'pt-BR' ? 'Escolha o Profissional' : 'Choose Provider') :
           step === 'datetime' ? (locale === 'pt-BR' ? 'Data e Horário' : 'Date & Time') :
           (locale === 'pt-BR' ? 'Confirmação' : 'Confirmation')}
        </h1>
        {step === 'list' && (
          <button onClick={() => setStep('provider')} className="rounded-lg bg-[var(--text-foreground)] text-[var(--surface-primary)] px-md py-sm text-body font-semibold min-h-[var(--touch-md)]">
            {locale === 'pt-BR' ? 'Nova Consulta' : 'Book New'}
          </button>
        )}
        {step !== 'list' && (
          <button onClick={() => setStep(step === 'confirm' ? 'datetime' : step === 'datetime' ? 'provider' : 'list')} className="text-body text-[var(--text-muted)] min-h-[var(--touch-md)]">
            <ChevronLeft className="h-4 w-4 inline" /> {locale === 'pt-BR' ? 'Voltar' : 'Back'}
          </button>
        )}
      </div>

      {/* Step: Appointment List */}
      {step === 'list' && (
        <div className="space-y-sm" role="list" aria-label="Upcoming appointments">
          {loading ? [1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-[var(--surface-secondary)] animate-pulse" />) :
           appointments.length === 0 ? (
            <div className="text-center py-2xl">
              <CalendarIcon className="h-12 w-12 text-[var(--text-subtle)] mx-auto mb-md" aria-hidden="true" />
              <p className="text-body font-semibold text-[var(--text-foreground)]">
                {locale === 'pt-BR' ? 'Nenhuma consulta agendada' : 'No appointments scheduled'}
              </p>
              <button onClick={() => setStep('provider')} className="mt-md text-body font-semibold text-severity-minimal min-h-[var(--touch-md)]">
                {locale === 'pt-BR' ? 'Agendar consulta' : 'Book appointment'}
              </button>
            </div>
          ) : appointments.map((a) => <AppointmentCard key={a.id} appt={a} locale={locale} onCancel={handleCancel} />)}
        </div>
      )}

      {/* Step: Provider Selection */}
      {step === 'provider' && (
        <div className="space-y-sm">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} selected={selectedProvider === p.id} onSelect={() => { setSelectedProvider(p.id); setStep('datetime'); }} />
          ))}
        </div>
      )}

      {/* Step: Date/Time Selection */}
      {step === 'datetime' && (
        <div className="space-y-md">
          <CalendarGrid
            month={calMonth} year={calYear}
            availableDates={availableDates}
            selectedDate={selectedDate}
            onSelectDate={(d) => { setSelectedDate(d); setSelectedTime(null); }}
            onPrevMonth={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}
            onNextMonth={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}
          />
          {selectedDate && slots.length > 0 && (
            <>
              <h3 className="text-body font-semibold text-[var(--text-foreground)]">
                {locale === 'pt-BR' ? 'Horários disponíveis' : 'Available times'}
              </h3>
              <SlotSelector slots={slots} selectedTime={selectedTime} onSelect={setSelectedTime} />
            </>
          )}
          {selectedDate && selectedTime && (
            <button onClick={() => setStep('confirm')} className="w-full rounded-lg bg-[var(--text-foreground)] text-[var(--surface-primary)] py-sm text-body font-semibold min-h-[var(--touch-md)]">
              {locale === 'pt-BR' ? 'Continuar' : 'Continue'}
            </button>
          )}
        </div>
      )}

      {/* Step: Confirmation */}
      {step === 'confirm' && (
        <div className="space-y-md">
          <div className="rounded-xl border border-[var(--border-default)] bg-surface-elevated px-md py-md space-y-sm">
            <p className="text-body"><strong>{locale === 'pt-BR' ? 'Profissional' : 'Provider'}:</strong> {providers.find((p) => p.id === selectedProvider)?.name}</p>
            <p className="text-body"><strong>{locale === 'pt-BR' ? 'Data' : 'Date'}:</strong> {selectedDate && new Date(selectedDate + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="text-body"><strong>{locale === 'pt-BR' ? 'Horário' : 'Time'}:</strong> {selectedTime}</p>
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={locale === 'pt-BR' ? 'Motivo da consulta (obrigatório)' : 'Reason for visit (required)'}
            required
            className="w-full rounded-xl border border-[var(--border-default)] bg-transparent px-md py-sm text-body min-h-[80px] resize-none"
            aria-label="Reason for visit"
          />
          {/* RUTH: cancellation policy */}
          <div className="flex items-start gap-sm rounded-lg bg-severity-mild/10 border border-severity-mild/20 px-md py-sm">
            <AlertCircle className="h-4 w-4 text-severity-mild shrink-0 mt-px" aria-hidden="true" />
            <p className="text-caption text-[var(--text-muted)]">
              {locale === 'pt-BR'
                ? 'Cancelamentos com menos de 24h de antecedência podem ser cobrados conforme política da clínica.'
                : 'Cancellations less than 24h in advance may be charged per clinic policy.'}
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="w-full rounded-lg bg-severity-minimal text-[var(--surface-primary)] py-sm text-body font-semibold min-h-[var(--touch-md)] disabled:opacity-50"
          >
            {locale === 'pt-BR' ? 'Confirmar Agendamento' : 'Confirm Booking'}
          </button>
        </div>
      )}
    </div>
  );
}
