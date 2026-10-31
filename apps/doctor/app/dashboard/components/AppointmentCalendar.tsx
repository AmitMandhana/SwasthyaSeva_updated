'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Eye, Calendar, Stethoscope } from 'lucide-react';
import type { QueueAppointmentWithClinic, DoctorSlot } from '../../../lib/api';
import DayIndicator from './DayIndicator';
import { componentTestSpec } from '@swasthyaseva/test-gen';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MAP: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-muted-alt',
  accepted: 'bg-primary',
  waiting: 'bg-primary',
  in_progress: 'bg-warning',
  completed: 'bg-success',
  missed: 'bg-destructive',
  cancelled: 'bg-muted-alt/50',
  resolved: 'bg-muted-alt',
};

function slotTime(idx: number): string {
  const h = Math.floor(idx / 2);
  const m = idx % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}

function slotRange(start: number, end: number): string {
  return `${slotTime(start)}-${slotTime(end)}`;
}

type Props = {
  appointments: QueueAppointmentWithClinic[];
  slots: DoctorSlot[];
  onOverview: (apt: QueueAppointmentWithClinic) => void;
};

function getDateKey(apt: QueueAppointmentWithClinic): string {
  const raw = apt.appointment_date;
  const d = new Date(raw);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AppointmentCalendar({ appointments, slots, onOverview }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [collapsedClinics, setCollapsedClinics] = useState<Set<string>>(new Set());

  // Auto-select nearest date with appointments on mount
  useEffect(() => {
    if (!selectedDate) {
      const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
      const monthAppts = appointments.filter(a => getDateKey(a).startsWith(prefix));
      if (monthAppts.length > 0) {
        const dates = [...new Set(monthAppts.map(getDateKey))].sort().reverse();
        setSelectedDate(dates[0]);
      }
    }
  }, [viewYear, viewMonth, appointments]);

  const byDate = new Map<string, QueueAppointmentWithClinic[]>();
  for (const apt of appointments) {
    const key = getDateKey(apt);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(apt);
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  function prevMonth() {
    setSelectedDate(null);
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    setSelectedDate(null);
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function toDateStr(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const selectedAppts = selectedDate ? byDate.get(selectedDate) || [] : [];

  // Group selected day appointments by clinic
  const selectedByClinic = new Map<string, { appts: QueueAppointmentWithClinic[]; slot?: DoctorSlot }>();
  if (selectedDate) {
    const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay();
    const daySlots = slots.filter(s => DAY_MAP[s.slot_day] === dayOfWeek);
    for (const s of daySlots) {
      selectedByClinic.set(s.clinic_name, { appts: [], slot: s });
    }
    for (const a of selectedAppts) {
      const cn = a.clinic_name || 'Unknown';
      if (!selectedByClinic.has(cn)) selectedByClinic.set(cn, { appts: [] });
      selectedByClinic.get(cn)!.appts.push(a);
    }
  }

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthCount = appointments.filter(a => getDateKey(a).startsWith(monthPrefix)).length;

  return (
    <div className="flex gap-4">
      {/* Left: Calendar grid */}
      <div className="w-[75%] shrink-0">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button data-testid="appt-cal-prev" onClick={prevMonth} className="p-1 hover:bg-muted rounded transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-alt" />
          </button>
          <h3 data-testid="appt-cal-month" className="text-sm font-semibold text-card-alt">
            {MONTHS[viewMonth]} {viewYear}
            {monthCount > 0 && <span className="text-muted-alt font-normal ml-1.5">({monthCount})</span>}
          </h3>
          <button data-testid="appt-cal-next" onClick={nextMonth} className="p-1 hover:bg-muted rounded transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-alt" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {DAYS_SHORT.map((d, dIdx) => (
            <div key={d} data-testid={dIdx === 0 ? 'appt-cal-day-header' : undefined} className="text-center text-sm font-medium text-muted-alt py-1">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1;
            const ds = toDateStr(day);
            const appts = byDate.get(ds) || [];
            const isToday = ds === todayStr;
            const isSelected = ds === selectedDate;

            const dayOfWeek = new Date(viewYear, viewMonth, day).getDay();
            const daySlots = slots.filter(s => DAY_MAP[s.slot_day] === dayOfWeek);

            const clinicApptMap = new Map<string, typeof appts>();
            for (const a of appts) {
              const cn = a.clinic_name || 'Unknown';
              if (!clinicApptMap.has(cn)) clinicApptMap.set(cn, []);
              clinicApptMap.get(cn)!.push(a);
            }

            const clinicEntries = daySlots.map(s => ({
              clinic: s.clinic_name,
              appts: clinicApptMap.get(s.clinic_name) || [],
              time: slotRange(s.slot_start, s.slot_end),
            }));

            return (
              <button
                key={day}
                data-testid={i === 0 ? 'appt-cal-day-cell' : undefined}
                onClick={() => setSelectedDate(ds)}
                className={`min-h-16 rounded-md border px-2 py-1.5 transition-all flex flex-col xl:flex-row xl:items-start gap-0.5 xl:gap-1 text-left
                  ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-muted-alt'}
                  ${isToday && !isSelected ? 'border-primary/40' : ''}
                `}
              >
                <span className={`text-lg font-bold shrink-0 xl:w-5 xl:self-center ${isToday ? 'text-primary' : 'text-card-alt'}`}>{day}</span>
                {clinicEntries.length > 0 && (
                  <div className="space-y-0.5 w-full">
                    {clinicEntries.map(({ clinic, appts: sa, time }, ceIdx) => {
                      const count = sa.length;
                      const completed = sa.filter(a => a.appointment_status === 'completed').length;
                      const resolved = sa.filter(a => a.appointment_status === 'resolved').length;
                      const unresolved = count - completed - resolved;
                      return (
                        <div key={clinic}>
                          <div className="flex items-center gap-1.5">
                            {count > 0 ? (
                              <DayIndicator completed={completed} resolved={resolved} unresolved={unresolved} size={12} showTestId={i === 0 && ceIdx === 0} />
                            ) : (
                              <span className="w-3 h-3 rounded-full border border-border/60 shrink-0" />
                            )}
                            <span className="text-xs text-card-alt/80 truncate">{clinic.split(' ')[0]}</span>
                            {count > 0 && <span className="text-xs text-card-alt/70 font-medium ml-auto shrink-0">{count}</span>}
                          </div>
                          <span className="text-[10px] text-card-alt/50 pl-5 -mt-0.5 hidden xl:block">{time}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Selected day detail panel */}
      <div className="flex-1 border-l border-border pl-4 min-h-[400px]">
        {!selectedDate ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-alt gap-2">
            <Calendar className="w-8 h-8" />
            <p className="text-sm">Select a day to view appointments</p>
          </div>
        ) : (
          <div>
            <h4 data-testid="appt-cal-selected-title" className="text-base font-semibold text-card-alt mb-1">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h4>
            <p className="text-sm text-muted-alt mb-4">
              {selectedAppts.length} {selectedAppts.length === 1 ? 'appointment' : 'appointments'}
            </p>

            {selectedByClinic.size === 0 ? (
              <p className="text-xs text-muted-alt">No slots on this day</p>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                {Array.from(selectedByClinic.entries()).map(([clinic, { appts: ca, slot }], clinicGroupIdx) => (
                  <div key={clinic}>
                    {/* Clinic header */}
                    {/* Clinic header — click to collapse */}
                    <div
                      className="flex items-center gap-2 mb-2 cursor-pointer"
                      onClick={() => setCollapsedClinics(prev => {
                        const next = new Set(prev);
                        if (next.has(clinic)) next.delete(clinic); else next.add(clinic);
                        return next;
                      })}
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-muted-alt shrink-0" style={{ transition: 'transform 200ms ease', transform: collapsedClinics.has(clinic) ? 'rotate(0deg)' : 'rotate(90deg)' }} />
                      <a href={`/clinic/${slot?.clinic_id || ''}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-sm font-semibold text-card-alt hover:text-primary transition-colors">{clinic}</a>
                      {slot && <span className="text-xs text-muted-alt">· {slotRange(slot.slot_start, slot.slot_end)}</span>}
                      <span className="text-xs text-muted-alt ml-auto">{ca.length} patients</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateRows: collapsedClinics.has(clinic) ? '0fr' : '1fr', transition: 'grid-template-rows 200ms ease' }}>
                    <div style={{ overflow: 'hidden' }}>
                    {ca.length === 0 ? (
                      <p className="text-sm text-muted-alt/60 pl-6 pb-2">No appointments</p>
                    ) : (
                      <div className="space-y-1 pb-1">
                        {ca.map((apt, idx) => (
                          <div
                            key={apt.appointment_id}
                            data-testid={clinicGroupIdx === 0 && idx === 0 ? 'appt-cal-row' : undefined}
                            className="flex items-center gap-3 px-3 py-2 rounded border border-border/50 hover:bg-muted/20 transition-colors text-sm"
                          >
                            <span className="text-muted-alt font-mono w-5 shrink-0 text-xs">#{idx + 1}</span>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[apt.appointment_status] || 'bg-muted-alt'}`} />
                            <span data-testid={clinicGroupIdx === 0 && idx === 0 ? 'appt-cal-patient-name' : undefined} className="font-medium text-card-alt truncate flex-1">{apt.patient_name}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); onOverview(apt); }}
                              className="text-xs text-muted-alt hover:text-card-alt shrink-0"
                              title="Overview"
                            >
                              <span className="hidden 2xl:inline">Overview</span>
                              <Eye className="w-3.5 h-3.5 2xl:hidden" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`/dashboard/consultation/${apt.appointment_id}`, '_blank'); }}
                              className="text-xs text-primary hover:underline shrink-0"
                              title="Consult"
                            >
                              <span className="hidden 2xl:inline">Consult</span>
                              <Stethoscope className="w-3.5 h-3.5 2xl:hidden" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/appointments',
  app: 'doctor',
  title: 'Appointment Calendar',
  elements: {
    monthTitle: { testId: 'appt-cal-month' },
    prevMonthBtn: { testId: 'appt-cal-prev' },
    nextMonthBtn: { testId: 'appt-cal-next' },
    dayHeaders: { testId: 'appt-cal-day-header' },
    dayCells: { testId: 'appt-cal-day-cell' },
    selectDayPrompt: { text: 'Select a day to view appointments' },
    selectedDayTitle: { testId: 'appt-cal-selected-title' },
    appointmentRow: { testId: 'appt-cal-row' },
    patientName: { testId: 'appt-cal-patient-name' },
    calendarToggle: { role: 'button', name: 'Calendar' },
    selectDatesButton: { text: 'Select dates' },
    thirtyDaysQuickBtn: { role: 'button', name: '30 days' },
  },
  flows: [
    {
      name: 'switch to calendar view',
      steps: [
        { do: 'click', on: 'selectDatesButton' },
        { do: 'click', on: 'thirtyDaysQuickBtn' },
        { do: 'click', on: 'calendarToggle' },
        { do: 'waitFor', on: 'monthTitle' },
        { expect: 'visible', on: 'monthTitle' },
        { expect: 'visible', on: 'prevMonthBtn' },
        { expect: 'visible', on: 'nextMonthBtn' },
        { expect: 'countMin', on: 'dayHeaders', value: 1 },
      ],
    },
    {
      name: 'navigate to previous month',
      after: 'switch to calendar view',
      steps: [
        { do: 'click', on: 'prevMonthBtn' },
        { expect: 'visible', on: 'monthTitle' },
      ],
    },
    {
      name: 'navigate to next month',
      after: 'switch to calendar view',
      steps: [
        { do: 'click', on: 'nextMonthBtn' },
        { expect: 'visible', on: 'monthTitle' },
      ],
    },
    {
      name: 'click a day cell to view appointments',
      after: 'switch to calendar view',
      steps: [
        { do: 'click', on: 'dayCells' },
        { expect: 'visible', on: 'selectedDayTitle' },
      ],
    },
  ],
});
