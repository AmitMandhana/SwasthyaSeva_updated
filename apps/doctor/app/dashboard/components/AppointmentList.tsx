'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Users, ChevronDown, ChevronRight, ExternalLink, Eye, Activity, MessageSquare, Search, Building2, CheckCircle, LayoutList, Columns3, Calendar } from 'lucide-react';
import { ToggleSwitch, ConfirmModal, Popover } from '@swasthyaseva/ui';
import { getAppointments, getDoctorClinics, getDoctorSlots, resolveAppointment, type QueueAppointmentWithClinic, type DoctorClinic, type DoctorSlot } from '../../../lib/api';
import CalendarRangePicker from './CalendarRangePicker';
import MultiSelectDropdown from './MultiSelectDropdown';
import AppointmentCalendar from './AppointmentCalendar';
import AppointmentKanban from './AppointmentKanban';
import { componentTestSpec } from '@swasthyaseva/test-gen';

type ViewMode = 'list' | 'kanban' | 'calendar';

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-muted-alt',
  accepted: 'bg-primary',
  waiting: 'bg-primary',
  in_progress: 'bg-warning',
  completed: 'bg-success',
  missed: 'bg-destructive',
  cancelled: 'bg-muted-alt/50',
};

const STATUS_BORDER: Record<string, string> = {
  pending: 'border-l-muted-alt',
  accepted: 'border-l-primary',
  waiting: 'border-l-primary',
  in_progress: 'border-l-warning',
  completed: 'border-l-success',
  missed: 'border-l-destructive',
  cancelled: 'border-l-muted-alt',
};

type Props = {
  onOverview: (appointment: QueueAppointmentWithClinic) => void;
};

type GroupedByDate = {
  date: string;
  label: string;
  clinics: {
    clinicName: string;
    appointments: QueueAppointmentWithClinic[];
  }[];
};

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function groupAppointments(appointments: QueueAppointmentWithClinic[]): GroupedByDate[] {
  const dateMap = new Map<string, Map<string, QueueAppointmentWithClinic[]>>();

  for (const apt of appointments) {
    const dateKey = typeof apt.appointment_date === 'string'
      ? apt.appointment_date.slice(0, 10)
      : new Date(apt.appointment_date).toISOString().slice(0, 10);
    const clinic = apt.clinic_name || 'Unknown Clinic';

    if (!dateMap.has(dateKey)) dateMap.set(dateKey, new Map());
    const clinicMap = dateMap.get(dateKey)!;
    if (!clinicMap.has(clinic)) clinicMap.set(clinic, []);
    clinicMap.get(clinic)!.push(apt);
  }

  return Array.from(dateMap.entries()).map(([date, clinicMap]) => ({
    date,
    label: formatDateLabel(date),
    clinics: Array.from(clinicMap.entries()).map(([clinicName, appointments]) => ({
      clinicName,
      appointments,
    })),
  }));
}

function openConsultation(appointmentId: number) {
  window.open(`/dashboard/consultation/${appointmentId}`, '_blank');
}

function isUnresolved(apt: QueueAppointmentWithClinic): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const aptDate = typeof apt.appointment_date === 'string' ? apt.appointment_date.slice(0, 10) : new Date(apt.appointment_date).toISOString().slice(0, 10);
  return aptDate < today && ['accepted', 'waiting', 'in_progress'].includes(apt.appointment_status);
}

export default function AppointmentList({ onOverview }: Props) {
  const [appointments, setAppointments] = useState<QueueAppointmentWithClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('apt-view') as ViewMode) || 'list';
    return 'list';
  });

  // Filters
  const [includePast, setIncludePast] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClinics, setSelectedClinics] = useState<number[]>([]);
  const [clinicOptions, setClinicOptions] = useState<DoctorClinic[]>([]);
  const [doctorSlots, setDoctorSlots] = useState<DoctorSlot[]>([]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    getDoctorClinics().then(({ clinics }) => setClinicOptions(clinics)).catch(() => {});
    getDoctorSlots().then(({ slots }) => setDoctorSlots(slots)).catch(() => {});
  }, []);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const { appointments: data } = await getAppointments({
        includePast: includePast || !!(dateFrom || dateTo),
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        clinicIds: selectedClinics.length > 0 ? selectedClinics : undefined,
        search: searchQuery || undefined,
      });
      setAppointments(data);
      const today = new Date().toISOString().slice(0, 10);
      setExpandedDates(prev => {
        const next = new Set(prev);
        next.add(today);
        if (data.length > 0) {
          const firstDate = typeof data[0].appointment_date === 'string'
            ? data[0].appointment_date.slice(0, 10)
            : new Date(data[0].appointment_date).toISOString().slice(0, 10);
          next.add(firstDate);
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [includePast, dateFrom, dateTo, searchQuery, selectedClinics]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  function toggleDate(date: string) {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  const grouped = groupAppointments(appointments);
  const totalCount = appointments.length;

  return (
    <div className="bg-card rounded-lg border border-border p-3 min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Appointments ({totalCount})
        </h2>
        <button
          data-testid="appt-refresh-btn"
          onClick={loadAppointments}
          disabled={loading}
          className="p-2 rounded-md hover:bg-muted transition-colors shrink-0"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters — wrap on mobile */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background flex-1 min-w-[140px]">
          <Search className="w-3.5 h-3.5 text-muted-alt shrink-0" />
          <input
            data-testid="appt-search-input"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search patient, clinic, symptoms..."
            className="text-xs bg-transparent outline-none text-card-alt placeholder:text-muted-alt w-full"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="text-muted-alt hover:text-card-alt">
              <span className="text-xs">✕</span>
            </button>
          )}
        </div>

        <CalendarRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
        />

        <MultiSelectDropdown
          options={clinicOptions.map(c => ({ value: c.clinic_id, label: c.clinic_name }))}
          selected={selectedClinics}
          onChange={setSelectedClinics}
          placeholder="All clinics"
          icon={<Building2 className="w-3.5 h-3.5 text-muted-alt" />}
        />

        <div className="flex rounded-lg border border-border overflow-hidden ml-auto">
          {([['list', LayoutList], ['kanban', Columns3], ['calendar', Calendar]] as const).map(([mode, Icon]) => (
            <button
              key={mode}
              onClick={() => { setViewMode(mode as ViewMode); localStorage.setItem('apt-view', mode); if (mode === 'calendar') setIncludePast(true); else setIncludePast(false); }}
              className={`px-2.5 py-1.5 transition-colors ${viewMode === mode ? 'bg-primary text-primary-alt' : 'bg-card text-muted-alt hover:text-card-alt'}`}
              title={mode.charAt(0).toUpperCase() + mode.slice(1)}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      {loading && appointments.length === 0 ? (
        includePast ? (
          <div className="flex gap-4">
            <div className="w-[75%] shrink-0">
              <div className="h-8 w-48 mx-auto rounded shimmer bg-muted/20 mb-3" />
              <div className="grid grid-cols-7 gap-1 mb-1">
                {[1,2,3,4,5,6,7].map(i => <div key={i} className="h-5 rounded shimmer bg-muted/20" />)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => <div key={i} className="h-16 rounded shimmer bg-muted/20" style={{ animationDelay: `${(i % 7) * 0.05}s` }} />)}
              </div>
            </div>
            <div className="flex-1 border-l border-border pl-4">
              <div className="h-6 w-40 rounded shimmer bg-muted/20 mb-2" />
              <div className="h-4 w-24 rounded shimmer bg-muted/20 mb-4" />
              {[1,2,3,4,5].map(i => <div key={i} className="h-10 rounded shimmer bg-muted/20 mb-1.5" />)}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded shimmer bg-muted/20" />
            ))}
          </div>
        )
      ) : viewMode === 'calendar' ? (
        <AppointmentCalendar appointments={appointments} slots={doctorSlots} onOverview={onOverview} />
      ) : viewMode === 'kanban' ? (
        <AppointmentKanban appointments={appointments} onOverview={onOverview} />
      ) : grouped.length === 0 ? (
        <p className="text-muted-alt text-sm py-8 text-center">
          {(dateFrom || dateTo || searchQuery || selectedClinics.length) ? 'No appointments match filters' : 'No upcoming appointments'}
        </p>
      ) : (
        <div className="space-y-2">
          {grouped.map(({ date, label, clinics }, groupIdx) => {
            const isExpanded = expandedDates.has(date);
            const dateCount = clinics.reduce((sum, c) => sum + c.appointments.length, 0);

            return (
              <div key={date}>
                <button
                  data-testid={groupIdx === 0 ? 'appt-date-group' : undefined}
                  onClick={() => toggleDate(date)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md bg-muted/50 hover:bg-muted transition-colors text-sm font-medium text-card-alt ${label === 'Today' ? 'sticky top-0 z-10 shadow-sm' : ''}`}
                >
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-muted-alt shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-muted-alt shrink-0" />
                  }
                  <span>{label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-1 ${label === 'Today' ? 'bg-primary text-primary-alt' : 'text-muted-alt'}`}>
                    {dateCount}
                  </span>
                </button>

                {isExpanded && (
                  <div className="mt-2 space-y-3">
                    {clinics.map(({ clinicName, appointments: clinicApts }, clinicIdx) => (
                      <div key={clinicName}>
                        <p className="text-xs font-medium text-muted-alt px-3 py-1 uppercase tracking-wide">{clinicName}</p>
                        <div className="space-y-2">
                          {clinicApts.map((apt, idx) => (
                            <div
                              key={apt.appointment_id}
                              className={`rounded-lg border border-border border-l-[3px] hover:bg-muted/30 transition-all ${STATUS_BORDER[apt.appointment_status] || 'border-l-muted-alt'}`}
                            >
                              {/* Mobile card layout */}
                              <div className="sm:hidden px-3 py-2.5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs text-muted-alt font-mono">{idx + 1}</span>
                                    <p className="font-semibold text-sm text-card-alt truncate">{apt.patient_name}</p>
                                    {apt.dob && (
                                      <span className="text-xs font-medium shrink-0">
                                        <span className="text-card-alt">{Math.floor((Date.now() - new Date(apt.dob).getTime()) / 31557600000)} yrs </span>
                                        <span className={apt.gender === 'male' ? 'text-blue-400' : apt.gender === 'female' ? 'text-pink-400' : 'text-muted-alt'}>{apt.gender === 'male' ? 'M' : apt.gender === 'female' ? 'F' : 'O'}</span>
                                      </span>
                                    )}
                                  </div>
                                  <span className="flex items-center gap-1 shrink-0">
                                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[apt.appointment_status] || 'bg-muted-alt'}`} />
                                    <span className="text-xs text-muted-alt capitalize">{apt.appointment_status.replace('_', ' ')}</span>
                                  </span>
                                </div>
                                {(apt.symptom_name || apt.symptom_text) && (
                                  <p className="text-xs text-muted-alt flex items-center gap-1">
                                    <Activity className="w-3 h-3 shrink-0" />
                                    {apt.symptom_name || apt.symptom_text}
                                  </p>
                                )}
                                <div className="flex gap-1.5">
                                  <button onClick={() => onOverview(apt)} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium px-2 py-1.5 rounded bg-muted text-card-alt"><Eye className="w-3 h-3" />Overview</button>
                                  <button onClick={() => openConsultation(apt.appointment_id)} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium px-2 py-1.5 rounded bg-primary/10 text-primary"><ExternalLink className="w-3 h-3" />Consult</button>
                                  {isUnresolved(apt) && <button onClick={() => setResolvingId(apt.appointment_id)} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium px-2 py-1.5 rounded bg-warning/10 text-warning"><CheckCircle className="w-3 h-3" />Resolve</button>}
                                </div>
                              </div>
                              {/* Desktop row layout */}
                              <div className="hidden sm:flex items-center gap-4 px-4 py-3">
                                <span className="text-xs text-muted-alt font-mono w-5 shrink-0">{idx + 1}</span>
                                <p data-testid={groupIdx === 0 && clinicIdx === 0 && idx === 0 ? 'appt-patient-name' : undefined} className="font-semibold text-sm text-card-alt w-36 shrink-0 truncate">{apt.patient_name}</p>
                                <span data-testid={groupIdx === 0 && clinicIdx === 0 && idx === 0 ? 'appt-status-badge' : undefined} className="flex items-center gap-1.5 shrink-0">
                                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[apt.appointment_status] || 'bg-muted-alt'}`} />
                                  <span className="text-xs text-muted-alt">{apt.appointment_status.replace('_', ' ')}</span>
                                </span>
                                {apt.dob && (
                                  <span className="text-xs font-medium shrink-0">
                                    <span className="text-card-alt">{Math.floor((Date.now() - new Date(apt.dob).getTime()) / 31557600000)} yrs </span>
                                    <span className={apt.gender === 'male' ? 'text-blue-400' : apt.gender === 'female' ? 'text-pink-400' : 'text-muted-alt'}>{apt.gender === 'male' ? 'M' : apt.gender === 'female' ? 'F' : 'O'}</span>
                                  </span>
                                )}
                                <span className="text-xs text-border shrink-0">|</span>
                                {(apt.symptom_name || apt.symptom_text) && (
                                  <Popover
                                    className="min-w-0"
                                    trigger={
                                      <span className="flex items-center gap-1 text-xs text-muted-alt hover:text-primary transition-colors cursor-pointer">
                                        <Activity className="w-3 h-3 shrink-0" />
                                        <span className="truncate max-w-[120px] lg:max-w-[200px]">{apt.symptom_name || apt.symptom_text}</span>
                                      </span>
                                    }
                                  >
                                    <div className="space-y-2">
                                      <div>
                                        <p className="text-xs font-medium text-muted-alt mb-0.5">Symptoms</p>
                                        <p className="text-sm text-card-alt">{apt.symptom_name || apt.symptom_code}</p>
                                      </div>
                                      {apt.symptom_text && (
                                        <div>
                                          <p className="text-xs font-medium text-muted-alt mb-0.5">Description</p>
                                          <p className="text-sm text-card-alt">{apt.symptom_text}</p>
                                        </div>
                                      )}
                                      {apt.complaints && (
                                        <div>
                                          <p className="text-xs font-medium text-muted-alt mb-0.5">Complaints</p>
                                          <p className="text-sm text-card-alt">{apt.complaints}</p>
                                        </div>
                                      )}
                                      <div className="text-xs text-muted-alt">Visit #{apt.visit_no || 1}</div>
                                    </div>
                                  </Popover>
                                )}
                                <div className="flex-1" />
                                <button
                                  data-testid={groupIdx === 0 && clinicIdx === 0 && idx === 0 ? 'appt-overview-btn' : undefined}
                                  onClick={() => onOverview(apt)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-muted text-card-alt hover:bg-muted/80 transition-colors shrink-0"
                                >
                                  <Eye className="w-3 h-3" />
                                  Overview
                                </button>
                                <button
                                  data-testid={groupIdx === 0 && clinicIdx === 0 && idx === 0 ? 'appt-consult-btn' : undefined}
                                  onClick={() => openConsultation(apt.appointment_id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Consult
                                </button>
                                {isUnresolved(apt) && (
                                  <button
                                    onClick={() => setResolvingId(apt.appointment_id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-warning/10 text-warning hover:bg-warning/20 transition-colors shrink-0"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Resolve
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {resolvingId && (
        <ConfirmModal
          title="Resolve Appointment"
          message="This appointment has no prescription. Mark as resolved? It will no longer appear as unresolved."
          variant="warning"
          confirmLabel="Resolve"
          onConfirm={async () => {
            try {
              await resolveAppointment(resolvingId);
              setAppointments(prev => prev.map(a => a.appointment_id === resolvingId ? { ...a, appointment_status: 'resolved' } : a));
            } catch (err) { console.error(err); }
            setResolvingId(null);
          }}
          onCancel={() => setResolvingId(null)}
        />
      )}
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/appointments',
  app: 'doctor',
  title: 'Appointment List',
  elements: {
    listHeading: { text: /Appointments \(\d+\)/ },
    searchInput: { testId: 'appt-search-input' },
    refreshBtn: { testId: 'appt-refresh-btn' },
    calendarToggle: { role: 'button', name: 'Calendar' },
    noAptsMessage: { text: /No (upcoming )?appointments( match filters)?/ },
  },
  flows: [
    {
      name: 'search filters appointment results',
      steps: [
        { on: 'searchInput', do: 'fill', value: 'nonexistent_xyz_patient_99' },
        { on: 'noAptsMessage', expect: 'visible' },
      ],
    },
    {
      name: 'toggle calendar view changes display',
      steps: [
        { on: 'calendarToggle', do: 'click' },
        { on: 'listHeading', expect: 'visible' },
        { on: 'calendarToggle', do: 'click' },
        { on: 'listHeading', expect: 'visible' },
      ],
    },
    {
      name: 'refresh appointment list reloads data',
      steps: [
        { on: 'refreshBtn', do: 'click' },
        { on: 'listHeading', expect: 'visible' },
      ],
    },
  ],
});
