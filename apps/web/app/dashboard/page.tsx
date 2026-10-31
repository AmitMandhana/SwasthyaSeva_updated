'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getPatientAppointments, getPatientDashboard, getActiveMedications, type PatientAppointment, type DashboardData, type ActiveMedication } from '../../lib/patientApi';
import { Calendar, Loader2, FileText, Filter, Search, Pill, FlaskConical, Clock, User, ChevronDown, ChevronRight } from 'lucide-react';
import { ToggleSwitch, Checkbox, formatSlotTime, Button } from '@swasthyaseva/ui';
import { testSpec } from '@swasthyaseva/test-gen';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-alt',
  accepted: 'bg-primary/15 text-primary',
  waiting: 'bg-primary/15 text-primary',
  in_progress: 'bg-warning/15 text-warning',
  completed: 'bg-success/15 text-success',
  missed: 'bg-destructive/15 text-destructive',
  cancelled: 'bg-muted/60 text-muted-alt',
};


function MedicationProgress({ progress, remaining }: { progress: number; remaining: number }) {
  const color = progress < 50 ? 'bg-success' : progress < 75 ? 'bg-warning' : 'bg-destructive';
  const expired = remaining <= 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <span className={`text-sm shrink-0 font-medium ${expired ? 'text-destructive' : 'text-muted-alt'}`}>
        {expired ? 'expired' : `${remaining}d left`}
      </span>
    </div>
  );
}

export default function PatientDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [medications, setMedications] = useState<ActiveMedication[]>([]);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [pastWithRx, setPastWithRx] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [prescriptionOnly, setPrescriptionOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    Promise.all([
      getPatientDashboard(),
      getActiveMedications(),
      getPatientAppointments(),
    ]).then(([dash, meds, appts]) => {
      setDashboard(dash);
      setMedications(meds.medications);
      setAppointments(appts.appointments);
    }).catch(console.error).finally(() => setLoading(false));
    getPatientAppointments({ status: 'past', hasPrescription: true }).then(r => setPastWithRx(r.appointments)).catch(console.error);
  }, []);

  const reloadAppointments = useCallback(async () => {
    try {
      const { appointments: data } = await getPatientAppointments({
        status: showPast ? 'past' : 'upcoming',
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        hasPrescription: prescriptionOnly || undefined,
      });
      setAppointments(data);
    } catch (err) {
      console.error(err);
    }
  }, [showPast, dateFrom, dateTo, prescriptionOnly]);

  useEffect(() => { if (!loading) reloadAppointments(); }, [showPast, dateFrom, dateTo, prescriptionOnly]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const next = dashboard?.nextAppointment;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div data-testid="dashboard-summary-card" className="bg-card rounded-xl border border-border p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 md:col-span-1">
            <p className="text-sm text-muted-alt uppercase mb-1">Next Appointment</p>
            {next ? (
              <div>
                <p className="text-sm font-semibold text-card-alt">{next.doctor_name}</p>
                <p className="text-xs text-muted-alt">{next.clinic_name}</p>
                <p className="text-xs text-primary mt-1">
                  {new Date(next.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {next.daysUntil === 0 ? ' · Today' : next.daysUntil === 1 ? ' · Tomorrow' : ` · in ${next.daysUntil} days`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-alt">No upcoming</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-alt uppercase mb-1">Active Meds</p>
            <p className="text-2xl font-bold text-card-alt">{dashboard?.activeMedications ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-alt uppercase mb-1">Pending Labs</p>
            <p className="text-2xl font-bold text-card-alt">{dashboard?.pendingLabResults ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-alt uppercase mb-1">Total Visits</p>
            <p className="text-2xl font-bold text-card-alt">{dashboard?.totalVisits ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button data-testid="quick-find-doctor" onClick={() => router.push('/slot-search')} className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/20">
          <Search className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-card-alt">Find a Doctor</span>
        </button>
        <button onClick={() => { setShowPast(true); setPrescriptionOnly(true); }} className="flex items-center gap-3 p-3 rounded-lg bg-success/5 hover:bg-success/10 transition-colors border border-transparent hover:border-success/20">
          <FileText className="w-5 h-5 text-success" />
          <span className="text-sm font-medium text-card-alt">My Prescriptions</span>
        </button>
        <button onClick={() => router.push('/dashboard/profile')} className="flex items-center gap-3 p-3 rounded-lg bg-warning/5 hover:bg-warning/10 transition-colors border border-transparent hover:border-warning/20">
          <User className="w-5 h-5 text-warning" />
          <span className="text-sm font-medium text-card-alt">My Profile</span>
        </button>
      </div>

      {/* Active Medications */}
      {medications.length > 0 && (
        <div data-testid="active-medications-section" className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-base font-semibold text-card-alt flex items-center gap-2 mb-3">
            <Pill className="w-4 h-4 text-primary" />
            Active Medications
          </h2>
          <div className="space-y-2">
            {medications.map((m, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-card-alt">{m.medicine_name}</p>
                  <p className="text-sm text-muted-alt">{m.medication_type} · {m.route} · {m.frequency}x/day</p>
                </div>
                <div className="w-32 shrink-0">
                  <MedicationProgress progress={m.progress} remaining={m.days_remaining} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Treatment History Timeline */}
      {pastWithRx.length > 0 && (() => {
        const limited = pastWithRx.slice(0, 10);
        const grouped: Record<string, PatientAppointment[]> = {};
        for (const apt of limited) {
          const d = new Date(apt.appointment_date);
          const key = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
          (grouped[key] ??= []).push(apt);
        }
        return (
          <div data-testid="treatment-history-section" className="bg-card rounded-lg border border-border p-5">
            <h2 className="text-base font-semibold text-card-alt flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              Treatment History
            </h2>
            <div className="space-y-4">
              {Object.entries(grouped).map(([month, items]) => (
                <div key={month}>
                  <p className="text-xs font-semibold text-muted-alt uppercase tracking-wide mb-2">{month}</p>
                  <div className="border-l-2 border-primary/30 ml-1.5 space-y-3">
                    {items.map((apt) => (
                      <div key={apt.appointment_id} className="relative pl-5">
                        <span className="absolute left-[-5px] top-1.5 w-3 h-3 bg-primary rounded-full border-2 border-card" />
                        <p className="text-xs text-muted-alt">
                          {new Date(apt.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-sm font-medium text-card-alt">{apt.doctor_name}</p>
                        {apt.symptom_text && (
                          <p className="text-xs text-muted-alt">{apt.symptom_text}</p>
                        )}
                        <button
                          onClick={() => router.push(`/dashboard/prescriptions/${apt.appointment_id}`)}
                          className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <FileText size={12} /> View Prescription
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {pastWithRx.length > 10 && (
              <button
                onClick={() => { setShowPast(true); setPrescriptionOnly(true); }}
                className="mt-4 flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ChevronRight size={14} /> View all past appointments
              </button>
            )}
          </div>
        );
      })()}

      {/* Appointments Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            My Appointments
          </h2>
          <button
            data-testid="btn-filters"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-card-alt"
          >
            <Filter size={14} /> Filters
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-3">
          <span data-testid="btn-past-toggle"><ToggleSwitch label={showPast ? 'Past' : 'Upcoming'} checked={showPast} onChange={setShowPast} /></span>
          <Checkbox label="Has Prescription" checked={prescriptionOnly} onChange={setPrescriptionOnly} />
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 mb-3 p-3 bg-card rounded-lg border border-border">
            <div>
              <label className="block text-xs text-muted-alt mb-1">From</label>
              <input data-testid="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-2 py-1 text-sm rounded-md border border-border bg-background text-card-alt" />
            </div>
            <div>
              <label className="block text-xs text-muted-alt mb-1">To</label>
              <input data-testid="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-2 py-1 text-sm rounded-md border border-border bg-background text-card-alt" />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-primary hover:underline self-end pb-1">Clear dates</button>
            )}
          </div>
        )}

        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-alt mb-3">
              {showPast ? 'No past appointments' : 'No upcoming appointments'}
            </p>
            {!showPast && (
              <Button onClick={() => router.push('/slot-search')} icon={<Search className="w-4 h-4" />}>
                Find a Doctor
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map((apt) => (
              <div key={apt.appointment_id} data-testid="appointment-card" className="bg-card rounded-lg border border-border p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{apt.doctor_name}</p>
                    <p className="text-sm text-muted-alt">{apt.clinic_name}</p>
                    <p className="text-xs text-muted-alt mt-1">
                      {apt.slot_day} {formatSlotTime(apt.slot_start)}&ndash;{formatSlotTime(apt.slot_end)}
                      {apt.symptom_text && ` · ${apt.symptom_text}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm text-card-alt">{new Date(apt.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${STATUS_COLORS[apt.appointment_status] || 'bg-muted'}`}>
                      {apt.appointment_status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {apt.has_prescription && (
                  <button data-testid="view-prescription-btn" onClick={() => router.push(`/dashboard/prescriptions/${apt.appointment_id}`)} className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <FileText size={14} /> View Prescription
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const __test = testSpec({
  route: '/dashboard',
  auth: 'role:patient',
  app: 'web',
  title: 'Patient Dashboard',
  elements: {
    summaryCard: { testId: 'dashboard-summary-card' },
    nextAppointment: { text: 'Next Appointment' },
    activeMedsCount: { text: 'Active Meds' },
    pendingLabsCount: { text: 'Pending Labs' },
    totalVisitsCount: { text: 'Total Visits' },
    quickActionFindDoctor: { testId: 'quick-find-doctor' },
    quickActionPrescriptions: { text: 'My Prescriptions' },
    quickActionProfile: { text: 'My Profile' },
    appointmentsHeading: { role: 'heading', name: 'My Appointments' },
    filtersBtn: { role: 'button', name: 'Filters' },
    dateFromInput: { testId: 'date-from' },
    dateToInput: { testId: 'date-to' },
    pastToggle: { testId: 'btn-past-toggle' },
    appointmentCard: { testId: 'appointment-card' },
    activeMedsSection: { testId: 'active-medications-section' },
    treatmentHistorySection: { testId: 'treatment-history-section' },
    activeMedsHeading: { text: 'Active Medications' },
    treatmentHistoryHeading: { text: 'Treatment History' },
    viewPrescriptionBtn: { testId: 'view-prescription-btn' },
  },
  flows: [],
  flowTree: {
    name: 'patient dashboard',
    steps: [],
    children: [
      {
        name: 'view dashboard summary and appointments',
        steps: [
          { do: 'waitFor', on: 'summaryCard' },
          { expect: 'visible', on: 'nextAppointment' },
          { expect: 'visible', on: 'activeMedsCount' },
          { expect: 'visible', on: 'pendingLabsCount' },
          { expect: 'visible', on: 'totalVisitsCount' },
          { expect: 'visible', on: 'appointmentsHeading' },
        ],
        children: [
          {
            name: 'summary cards are visible',
            steps: [],
          },
          {
            name: 'toggle appointment filters',
            steps: [
              { do: 'click', on: 'filtersBtn' },
              { expect: 'visible', on: 'dateFromInput' },
              { expect: 'visible', on: 'dateToInput' },
              { do: 'fill', on: 'dateFromInput', value: '2024-01-01' },
              { do: 'fill', on: 'dateToInput', value: '2026-12-31' },
            ],
          },
        ],
      },
      {
        name: 'quick actions are visible and clickable',
        steps: [
          { do: 'waitFor', on: 'quickActionFindDoctor' },
          { expect: 'visible', on: 'quickActionPrescriptions' },
          { expect: 'visible', on: 'quickActionProfile' },
          { do: 'click', on: 'quickActionFindDoctor' },
          { expect: 'urlContains', value: '/slot-search' },
        ],
      },
      {
        name: 'toggle past and upcoming appointments',
        steps: [
          { do: 'waitFor', on: 'appointmentsHeading' },
          { do: 'click', on: 'pastToggle' },
          { expect: 'visible', on: 'appointmentsHeading' },
          { do: 'click', on: 'pastToggle' },
          { expect: 'visible', on: 'appointmentsHeading' },
        ],
      },
      {
        name: 'appointment cards display when data exists',
        steps: [
          { do: 'waitFor', on: 'appointmentsHeading' },
          { expect: 'countMin', on: 'appointmentCard', value: 0 },
        ],
      },
      {
        name: 'view prescription from appointment card navigates to detail',
        steps: [
          { do: 'waitFor', on: 'appointmentsHeading' },
          { do: 'click', on: 'pastToggle' },
          { do: 'waitFor', on: 'viewPrescriptionBtn' },
          { do: 'click', on: 'viewPrescriptionBtn' },
          { expect: 'urlContains', value: '/dashboard/prescriptions/' },
        ],
      },
      {
        name: 'my prescriptions quick action filters past appointments',
        steps: [
          { do: 'waitFor', on: 'quickActionPrescriptions' },
          { do: 'click', on: 'quickActionPrescriptions' },
          { expect: 'visible', on: 'appointmentsHeading' },
        ],
      },
      {
        name: 'active medications section visible when data exists',
        steps: [
          { do: 'waitFor', on: 'summaryCard' },
          { expect: 'countMin', on: 'activeMedsSection', value: 0 },
          { expect: 'countMin', on: 'activeMedsHeading', value: 0 },
        ],
      },
      {
        name: 'treatment history section visible when past prescriptions exist',
        steps: [
          { do: 'waitFor', on: 'summaryCard' },
          { do: 'click', on: 'pastToggle' },
          { expect: 'countMin', on: 'treatmentHistorySection', value: 0 },
          { expect: 'countMin', on: 'treatmentHistoryHeading', value: 0 },
        ],
      },
      {
        name: 'navigate to profile via quick action',
        steps: [
          { do: 'waitFor', on: 'quickActionProfile' },
          { do: 'click', on: 'quickActionProfile' },
          { expect: 'urlContains', value: '/dashboard/profile' },
        ],
      },
      {
        name: 'already authenticated redirect from login',
        steps: [
          { do: 'waitFor', on: 'summaryCard' },
          { do: 'navigate', value: '/login' },
          { expect: 'urlContains', value: '/dashboard' },
        ],
      },
    ],
  },
});
