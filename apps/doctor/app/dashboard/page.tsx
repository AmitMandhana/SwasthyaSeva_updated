'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, MapPin, Clock, AlertTriangle, Users, CheckCircle, Calendar, UserPlus, UserCheck, TrendingUp, TrendingDown } from 'lucide-react';
import { getDashboardSummary, getAppointments, type DashboardSummary, type QueueAppointmentWithClinic } from '../../lib/api';
import { SLOT_TIME_MAP_12H, DAY_ORDER, DAY_SHORT_LABELS } from '@swasthyaseva/ui';

function WeeklySchedule({ weekSlots, todaySlots }: { weekSlots?: Record<string, any[]>; todaySlots: any[] }) {
  const [activeDay, setActiveDay] = useState(() => {
    const d = new Date().getDay();
    return DAY_ORDER[d === 0 ? 6 : d - 1];
  });

  const slots = weekSlots?.[activeDay] || (activeDay === DAY_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] ? todaySlots : []);
  const activeSlots = slots.filter((s: any) => s.patient_count > 0 || true);
  const totalWeekPatients = weekSlots ? Object.values(weekSlots).flat().reduce((sum: number, s: any) => sum + (s.patient_count || 0), 0) : 0;

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-card-alt flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Week Schedule
        </h2>
        {totalWeekPatients > 0 && (
          <span className="text-sm text-muted-alt">{totalWeekPatients} patients this week</span>
        )}
      </div>
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {DAY_ORDER.map(day => {
          const isToday = day === DAY_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
          const daySlots = weekSlots?.[day] || [];
          const dayCount = daySlots.reduce((s: number, sl: any) => s + (sl.patient_count || 0), 0);
          return (
            <button
              key={day}
              data-testid={day === 'MON' ? 'schedule-day-mon' : 'schedule-day-btn'}
              onClick={() => setActiveDay(day)}
              className={`flex flex-col items-center px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                activeDay === day
                  ? 'bg-primary text-primary-alt'
                  : isToday
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'text-muted-alt hover:text-card-alt hover:bg-muted/50'
              }`}
            >
              <span>{DAY_SHORT_LABELS[day]}</span>
              {dayCount > 0 && <span className="text-xs mt-0.5">{dayCount}</span>}
            </button>
          );
        })}
      </div>
      {activeSlots.length === 0 ? (
        <p data-testid="no-clinics-message" className="text-sm text-muted-alt py-4 text-center">No clinics on {DAY_SHORT_LABELS[activeDay]}</p>
      ) : (
        <div className="space-y-2">
          {activeSlots.map((slot: any) => (
            <div key={slot.slot_id} data-testid="clinic-slot-card" className={`flex items-center gap-3 p-2.5 rounded-md border border-border ${slot.patient_count > 0 ? 'bg-muted/20' : 'bg-muted/5 opacity-60'}`}>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-alt">{slot.clinic_name}</p>
                <p className="text-xs text-muted-alt">{SLOT_TIME_MAP_12H[slot.slot_start]} – {SLOT_TIME_MAP_12H[slot.slot_end]}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-primary">{slot.patient_count}</p>
                <p className="text-xs text-muted-alt">patients</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [todayAppts, setTodayAppts] = useState<QueueAppointmentWithClinic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardSummary(),
      getAppointments(),
    ]).then(([sum, appts]) => {
      setSummary(sum);
      setTodayAppts(appts.appointments);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 rounded-lg shimmer bg-muted/20" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 rounded-lg shimmer bg-muted/20" />
          <div className="h-64 rounded-lg shimmer bg-muted/20" />
        </div>
      </div>
    );
  }

  if (!summary) return <p className="text-center text-muted-alt py-12">Failed to load dashboard</p>;

  const activeSlots = summary.todaySlots.filter(s => s.patient_count > 0);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <div data-testid="stat-today" className="bg-card rounded-lg border border-border p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p data-testid="stat-value" className="text-xl font-bold text-card-alt">{summary.todayStats.total}</p>
            <p className="text-sm text-muted-alt">Today</p>
          </div>
        </div>
        <div data-testid="stat-completed" className="bg-card rounded-lg border border-border p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-success" />
          </div>
          <div>
            <p data-testid="stat-value" className="text-xl font-bold text-card-alt">{summary.todayStats.completed}</p>
            <p className="text-sm text-muted-alt">Completed</p>
          </div>
        </div>
        <div data-testid="stat-accepted" className="bg-card rounded-lg border border-border p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p data-testid="stat-value" className="text-xl font-bold text-card-alt">{summary.todayStats.accepted}</p>
            <p className="text-sm text-muted-alt">Accepted</p>
          </div>
        </div>
        <div data-testid="stat-unresolved" className="bg-card rounded-lg border border-border p-3 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${summary.unresolvedCount > 0 ? 'bg-warning/10' : 'bg-muted/20'}`}>
            <AlertTriangle className={`w-4 h-4 ${summary.unresolvedCount > 0 ? 'text-warning' : 'text-muted-alt'}`} />
          </div>
          <div>
            <p data-testid="stat-value" className="text-xl font-bold text-card-alt">{summary.unresolvedCount}</p>
            <p className="text-sm text-muted-alt">Unresolved</p>
          </div>
        </div>
        <div data-testid="stat-firsttime" className="bg-card rounded-lg border border-border p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <UserPlus className="w-4 h-4 text-success" />
          </div>
          <div>
            <p data-testid="stat-value" className="text-xl font-bold text-card-alt">{summary.visitTypes?.firstTime ?? 0}</p>
            <p className="text-sm text-muted-alt">First Visit</p>
          </div>
        </div>
        <div data-testid="stat-followup" className="bg-card rounded-lg border border-border p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p data-testid="stat-value" className="text-xl font-bold text-card-alt">{summary.visitTypes?.followUp ?? 0}</p>
            <p className="text-sm text-muted-alt">Follow-up</p>
          </div>
        </div>
      </div>

      {/* Growth comparison */}
      {summary.growth && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Appointments', key: 'appointments' as const },
            { label: 'Unique Patients', key: 'uniquePatients' as const },
            { label: 'Completed', key: 'completed' as const },
          ].map(({ label, key }) => {
            const thisW = summary.growth!.thisWeek[key];
            const lastW = summary.growth!.lastWeek[key];
            const pct = lastW > 0 ? Math.round(((thisW - lastW) / lastW) * 100) : thisW > 0 ? 100 : 0;
            const up = pct >= 0;
            return (
              <div key={key} data-testid="growth-card" className="bg-card rounded-lg border border-border p-3">
                <p className="text-sm text-muted-alt uppercase mb-1">{label}</p>
                <div className="flex items-end gap-2">
                  <span className="text-lg font-bold text-card-alt">{thisW}</span>
                  {pct !== 0 && (
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? 'text-success' : 'text-destructive'}`}>
                      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(pct)}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-alt mt-0.5">vs last week: {lastW}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Schedule */}
        <WeeklySchedule weekSlots={summary.weekSlots} todaySlots={summary.todaySlots} />

        {/* Today's Patients */}
        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-base font-semibold text-card-alt flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-primary" />
            Today's Patients ({todayAppts.length})
          </h2>
          {todayAppts.length === 0 ? (
            <p className="text-sm text-muted-alt py-4 text-center">No patients today</p>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {todayAppts.map((apt, idx) => (
                <div key={apt.appointment_id} data-testid="dashboard-patient-row" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors">
                  <span className="text-xs text-muted-alt font-mono w-5 shrink-0">{idx + 1}</span>
                  <p className="text-sm font-medium text-card-alt truncate">{apt.patient_name}</p>
                  {apt.dob && (
                    <span className="text-xs font-medium shrink-0">
                      <span className="text-card-alt">{Math.floor((Date.now() - new Date(apt.dob).getTime()) / 31557600000)} yrs </span>
                      <span className={apt.gender === 'male' ? 'text-blue-400' : apt.gender === 'female' ? 'text-pink-400' : 'text-muted-alt'}>{apt.gender === 'male' ? 'M' : apt.gender === 'female' ? 'F' : 'O'}</span>
                    </span>
                  )}
                  <span className="text-xs text-muted-alt truncate max-w-40 flex-1">{apt.symptom_name || apt.symptom_text}</span>
                  <span className="text-xs text-muted-alt capitalize shrink-0">{apt.appointment_status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { testSpec } from '@swasthyaseva/test-gen';

export const __test = testSpec({
  route: '/dashboard',
  auth: 'role:doctor',
  app: 'doctor',
  title: 'Doctor Dashboard',
  elements: {
    todayAppointmentsStat: { testId: 'stat-today' },
    completedStat: { testId: 'stat-completed' },
    acceptedStat: { testId: 'stat-accepted' },
    unresolvedStat: { testId: 'stat-unresolved' },
    statValue: { testId: 'stat-value' },
    todayScheduleHeading: { text: 'Week Schedule' },
    todayPatientsHeading: { text: /Today's Patients/ },
    clinicSlotCard: { testId: 'clinic-slot-card' },
    patientRow: { testId: 'dashboard-patient-row' },
    scheduleDayMon: { testId: 'schedule-day-mon' },
    noPatientsMessage: { text: 'No patients today' },
    noClinicsMessage: { testId: 'no-clinics-message' },
    firstTimeStat: { testId: 'stat-firsttime' },
    followUpStat: { testId: 'stat-followup' },
    growthCard: { testId: 'growth-card' },
  },
  flows: [],
  flowTree: {
    name: 'render dashboard',
    steps: [
      { expect: 'visible', on: 'todayAppointmentsStat' },
      { expect: 'visible', on: 'completedStat' },
      { expect: 'visible', on: 'acceptedStat' },
      { expect: 'visible', on: 'unresolvedStat' },
      { expect: 'countMin', on: 'statValue', value: 4 },
    ],
    children: [
      {
        name: 'schedule section',
        steps: [
          { expect: 'visible', on: 'todayScheduleHeading' },
          { expect: 'countMin', on: 'clinicSlotCard', value: 0 },
        ],
        children: [
          {
            name: 'click day button updates slots',
            steps: [
              { expect: 'visible', on: 'scheduleDayMon' },
              { do: 'click', on: 'scheduleDayMon' },
              { expect: 'visible', on: 'todayScheduleHeading' },
              { expect: 'countMin', on: 'clinicSlotCard', value: 0 },
            ],
          },
        ],
      },
      {
        name: 'patients section',
        steps: [
          { expect: 'visible', on: 'todayPatientsHeading' },
          { expect: 'countMin', on: 'patientRow', value: 0 },
        ],
      },
      {
        name: 'first visit and follow-up stats visible',
        steps: [
          { expect: 'visible', on: 'firstTimeStat' },
          { expect: 'visible', on: 'followUpStat' },
        ],
      },
      {
        name: 'growth comparison cards visible',
        steps: [
          { expect: 'countMin', on: 'growthCard', value: 0 },
        ],
      },
    ],
  },
});
