"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Badge, Button, ListToolbar, SegmentedControl, formatSlotTime, usePagination, PaginationBar } from "@swasthyaseva/ui";
import BookAppointmentModal from "./BookAppointmentModal";
import { getAppointments, getAppointmentStats, type Appointment, type AppointmentStats } from "@/lib/api";

const STATUS_COLORS: Record<string, "default" | "primary" | "success" | "warning" | "danger"> = {
  pending: "warning",
  in_progress: "primary",
  completed: "success",
  missed: "default",
  cancelled: "danger",
  accepted: "success",
  waiting: "warning",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  missed: "Missed",
  cancelled: "Cancelled",
  accepted: "Accepted",
  waiting: "Waiting",
};

type DateFilter = "all" | "past" | "today" | "upcoming";

export default function AppointmentTab() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [showBooking, setShowBooking] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const PAGE_SIZE = 20;
  const pag = usePagination(PAGE_SIZE);

  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const opts: Record<string, string | number> = { limit: PAGE_SIZE, offset: pag.offset };
      if (statusFilter) opts.status = statusFilter;
      if (dateFilter === "past") opts.dateTo = today;
      else if (dateFilter === "today") { opts.dateFrom = today; opts.dateTo = today; }
      else if (dateFilter === "upcoming") opts.dateFrom = today;

      const [apptResult, statsResult] = await Promise.all([
        getAppointments(opts as Parameters<typeof getAppointments>[0]),
        getAppointmentStats(),
      ]);
      setAppointments(apptResult.appointments);
      pag.setTotal(apptResult.total);
      setStats(statsResult.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter, pag.page, today]);

  useEffect(() => { load(); }, [load]);

  function toggleSort(col: string) {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortCol(null); setSortDir('asc'); }
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  const sortedAppointments = [...appointments].sort((a, b) => {
    if (!sortCol) return 0;
    const dir = sortDir === 'asc' ? 1 : -1;
    const av = (a as any)[sortCol];
    const bv = (b as any)[sortCol];
    if (av == null && bv == null) return 0;
    if (av == null) return dir;
    if (bv == null) return -dir;
    if (typeof av === 'string') return av.localeCompare(bv) * dir;
    return (av - bv) * dir;
  });

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  }

  return (
    <div>
      {/* Stats cards */}
      {stats && (
        <div data-testid="appt-stats-grid" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {(Object.entries(stats) as [string, number][]).map(([key, val]) => (
            <div key={key} className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-alt uppercase">{STATUS_LABELS[key] || key}</p>
              <p className="text-2xl font-bold text-card-alt mt-1">{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <ListToolbar onRefresh={load} loading={loading} refreshTestId="appt-refresh-btn"
        actionLabel="Book Appointment" actionTestId="btn-book-appointment" onAction={() => setShowBooking(true)}
        actionClassName="whitespace-nowrap" className="flex-wrap"
        trailing={<span data-testid="appt-count" className="text-xs text-muted-alt ml-auto">{pag.total} appointment{pag.total !== 1 ? "s" : ""}</span>}>
        <SegmentedControl value={dateFilter} onChange={(v) => { setDateFilter(v as DateFilter); pag.reset(); }} options={[
          { value: "all", label: "All" },
          { value: "past", label: "Past" },
          { value: "today", label: "Today", "data-testid": "filter-today" },
          { value: "upcoming", label: "Upcoming" },
        ]} />
        <select
          data-testid="appt-status-filter"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); pag.reset(); }}
          className="px-4 py-2 text-sm rounded-lg border border-border bg-card text-card-alt"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </ListToolbar>

      {/* Booking modal */}
      {showBooking && (
        <BookAppointmentModal onClose={() => { setShowBooking(false); load(); }} />
      )}

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <table data-testid="appt-table" className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-alt text-left">
              {[
                { key: 'patient_name', label: 'Patient' },
                { key: 'doctor_name', label: 'Doctor' },
                { key: 'appointment_date', label: 'Date' },
                { key: 'slot_start', label: 'Time' },
                { key: 'appointment_status', label: 'Status' },
                { key: 'symptom_name', label: 'Symptom' },
                { key: 'slot_fee', label: 'Fee', right: true },
              ].map(col => (
                <th key={col.key} data-testid={`appt-sort-${col.key}`} className={`px-4 py-2 font-medium cursor-pointer hover:text-card-alt transition-colors select-none ${col.right ? 'text-right' : ''}`} onClick={() => toggleSort(col.key)}>
                  <span className="inline-flex items-center">{col.label}<SortIcon col={col.key} /></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody data-testid={loading ? "table-shimmer" : undefined}>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-muted"}`}>
                  {Array.from({ length: 7 }, (_, ci) => (
                    <td key={ci} className="px-4 py-2"><div className="h-4 rounded bg-muted-alt/20 animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : sortedAppointments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-alt" data-testid="appt-empty-message">
                  No appointments found.
                </td>
              </tr>
            ) : null}
            {!loading && sortedAppointments.map((a) => {
              const isToday = a.appointment_date?.slice(0, 10) === today;
              return (
                <tr key={a.appointment_id} className={`border-t border-border hover:bg-muted/50 transition-colors ${isToday ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                  <td className="px-4 py-2 text-card-alt">{a.patient_name}</td>
                  <td className="px-4 py-2 text-card-alt">{a.doctor_name || <span className="text-muted-alt italic">Unassigned</span>}</td>
                  <td className="px-4 py-2 text-muted-alt">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(a.appointment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-alt">
                    {a.slot_day} {formatSlotTime(a.slot_start)}-{formatSlotTime(a.slot_end)}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={STATUS_COLORS[a.appointment_status] || "default"}>
                      {STATUS_LABELS[a.appointment_status] || a.appointment_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-alt truncate max-w-[200px]" title={a.symptom_text || undefined}>{a.symptom_name || a.symptom_code}</td>
                  <td className="px-4 py-2 text-right font-medium text-card-alt">₹{a.slot_fee}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-2">
        {sortedAppointments.length === 0 ? (
          <p className="text-center text-muted-alt py-8">{loading ? "Loading..." : "No appointments found."}</p>
        ) : sortedAppointments.map((a) => {
          const isToday = a.appointment_date?.slice(0, 10) === today;
          return (
            <div key={a.appointment_id} className={`bg-card rounded-lg border border-border p-3 space-y-1.5 ${isToday ? 'border-l-2 border-l-primary' : ''}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-card-alt">{a.patient_name}</p>
                <Badge variant={STATUS_COLORS[a.appointment_status] || "default"}>
                  {STATUS_LABELS[a.appointment_status] || a.appointment_status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-alt">
                <span>{a.doctor_name || 'Unassigned'}</span>
                <span>·</span>
                <span>{new Date(a.appointment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                <span>·</span>
                <span>{a.slot_day} {formatSlotTime(a.slot_start)}-{formatSlotTime(a.slot_end)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-alt truncate max-w-[200px]" title={a.symptom_text || undefined}>{a.symptom_name || a.symptom_code}</span>
                <span className="font-medium text-card-alt shrink-0">₹{a.slot_fee}</span>
              </div>
            </div>
          );
        })}
      </div>

      <PaginationBar pag={pag} />
    </div>
  );
}

import { componentTestSpec } from '@swasthyaseva/test-gen';

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'clinic',
  title: 'Appointment Tab',
  elements: {
    appointmentsTab: { role: 'button', name: /Appointments/ },
    statsCards: { testId: 'appt-stats-grid' },
    dateFilterAll: { role: 'button', name: 'All' },
    dateFilterPast: { role: 'button', name: 'Past' },
    dateFilterToday: { role: 'button', name: 'Today' },
    dateFilterUpcoming: { role: 'button', name: 'Upcoming' },
    statusFilterSelect: { testId: 'appt-status-filter' },
    refreshBtn: { testId: 'appt-refresh-btn' },
    appointmentCount: { testId: 'appt-count' },
    bookAppointmentBtn: { role: 'button', name: /Book Appointment/ },
    appointmentTable: { testId: 'appt-table' },
    previousBtn: { role: 'button', name: 'Previous', exact: true },
    nextBtn: { role: 'button', name: 'Next', exact: true },
    emptyMessage: { testId: 'appt-empty-message' },
    sortByPatient: { testId: 'appt-sort-patient_name' },
    sortByDate: { testId: 'appt-sort-appointment_date' },
    sortByFee: { testId: 'appt-sort-slot_fee' },
  },
  flows: [
    {
      name: 'view appointment stats and table with data',
      steps: [
        { do: 'click', on: 'appointmentsTab' },
        { expect: 'visible', on: 'statsCards' },
        { expect: 'visible', on: 'appointmentTable' },
        { expect: 'visible', on: 'appointmentCount' },
        { expect: 'visible', on: 'bookAppointmentBtn' },
      ],
    },
    {
      name: 'filter by date range updates appointment count',
      after: 'view appointment stats and table with data',
      steps: [
        { do: 'click', on: 'dateFilterToday' },
        { expect: 'visible', on: 'appointmentCount' },
        { do: 'click', on: 'dateFilterUpcoming' },
        { expect: 'visible', on: 'appointmentCount' },
        { do: 'click', on: 'dateFilterPast' },
        { expect: 'visible', on: 'appointmentCount' },
        { do: 'click', on: 'dateFilterAll' },
        { expect: 'visible', on: 'appointmentCount' },
      ],
    },
    {
      name: 'filter by status updates appointment count',
      after: 'view appointment stats and table with data',
      steps: [
        { do: 'select', on: 'statusFilterSelect', value: 'pending' },
        { expect: 'visible', on: 'appointmentCount' },
        { do: 'select', on: 'statusFilterSelect', value: '' },
        { expect: 'visible', on: 'appointmentCount' },
      ],
    },
    {
      name: 'refresh appointment list reloads data',
      after: 'view appointment stats and table with data',
      steps: [
        { do: 'click', on: 'refreshBtn' },
        { expect: 'visible', on: 'appointmentCount' },
      ],
    },
    {
      name: 'paginate changes page indicator',
      after: 'view appointment stats and table with data',
      steps: [
        { do: 'click', on: 'nextBtn' },
        { expect: 'visible', on: 'appointmentCount' },
        { do: 'click', on: 'previousBtn' },
        { expect: 'visible', on: 'appointmentCount' },
      ],
    },
    {
      name: 'cancelled status filter shows table or empty state gracefully',
      after: 'view appointment stats and table with data',
      steps: [
        { do: 'select', on: 'statusFilterSelect', value: 'cancelled' },
        { expect: 'visible', on: 'appointmentCount' },
        { expect: 'visible', on: 'appointmentTable' },
        { do: 'select', on: 'statusFilterSelect', value: '' },
        { expect: 'visible', on: 'appointmentCount' },
      ],
    },
    {
      name: 'pagination first page has previous disabled',
      after: 'view appointment stats and table with data',
      steps: [
        { expect: 'visible', on: 'appointmentTable' },
        { expect: 'disabled', on: 'previousBtn' },
      ],
    },
    {
      name: 'filter by status then reset shows all',
      after: 'view appointment stats and table with data',
      steps: [
        { do: 'select', on: 'statusFilterSelect', value: 'completed' },
        { expect: 'visible', on: 'appointmentCount' },
        { expect: 'visible', on: 'appointmentTable' },
        { do: 'select', on: 'statusFilterSelect', value: '' },
        { expect: 'visible', on: 'appointmentCount' },
        { expect: 'visible', on: 'appointmentTable' },
      ],
    },
    {
      name: 'sort columns by clicking headers toggles sort order',
      after: 'view appointment stats and table with data',
      steps: [
        { do: 'click', on: 'sortByPatient' },
        { expect: 'visible', on: 'appointmentTable' },
        { do: 'click', on: 'sortByPatient' },
        { expect: 'visible', on: 'appointmentTable' },
        { do: 'click', on: 'sortByDate' },
        { expect: 'visible', on: 'appointmentTable' },
        { do: 'click', on: 'sortByFee' },
        { expect: 'visible', on: 'appointmentTable' },
      ],
    },
    {
      name: 'missed status filter shows empty state message',
      after: 'view appointment stats and table with data',
      steps: [
        { do: 'select', on: 'statusFilterSelect', value: 'missed' },
        { expect: 'visible', on: 'appointmentCount' },
        { expect: 'visible', on: 'emptyMessage' },
        { do: 'select', on: 'statusFilterSelect', value: '' },
      ],
    },
  ],
});
