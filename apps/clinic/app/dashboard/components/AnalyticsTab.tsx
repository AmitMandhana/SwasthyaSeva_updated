"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3 } from "lucide-react";
import { ListToolbar, SegmentedControl } from "@swasthyaseva/ui";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  getAppointmentTrends, getRevenueSummary, getSlotUtilization, getTopDoctors,
  type TrendPoint, type RevenuePoint, type UtilizationRow, type TopDoctor,
} from "@/lib/api";

type Range = "7d" | "30d" | "90d";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

export default function AnalyticsTab() {
  const [range, setRange] = useState<Range>("30d");
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [utilization, setUtilization] = useState<UtilizationRow[]>([]);
  const [topDoctors, setTopDoctors] = useState<TopDoctor[]>([]);
  const [loading, setLoading] = useState(false);

  const rangeDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  const load = useCallback(async () => {
    setLoading(true);
    const dateFrom = daysAgo(rangeDays);
    const dateTo = new Date().toISOString().split("T")[0];
    try {
      const [t, r, u, d] = await Promise.all([
        getAppointmentTrends({ dateFrom, dateTo }),
        getRevenueSummary({ dateFrom, dateTo }),
        getSlotUtilization(),
        getTopDoctors(10),
      ]);
      setTrends(t.trends);
      setRevenue(r.revenue);
      setUtilization(u.utilization);
      setTopDoctors(d.doctors);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => { load(); }, [load]);

  const totalAppts = trends.reduce((s, t) => s + t.total, 0);
  const totalRevenue = revenue.reduce((s, r) => s + r.total_revenue, 0);
  const completionRate = totalAppts > 0
    ? Math.round((trends.reduce((s, t) => s + t.completed, 0) / totalAppts) * 100)
    : 0;

  const fmtDate = (v: string) => {
    try { return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
    catch { return v; }
  };

  return (
    <div>
      {/* Controls */}
      <ListToolbar onRefresh={load} loading={loading} refreshTestId="analytics-refresh">
        <SegmentedControl value={range} onChange={(v) => setRange(v as Range)} options={[
          { value: "7d", label: "7 Days" },
          { value: "30d", label: "30 Days", "data-testid": "filter-30d" },
          { value: "90d", label: "90 Days" },
        ]} />
      </ListToolbar>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-alt uppercase">Total Appointments</p>
          <p data-testid="kpi-total-appointments-value" className="text-2xl font-bold text-card-alt mt-1">{totalAppts}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-alt uppercase">Total Revenue</p>
          <p data-testid="kpi-total-revenue-value" className="text-2xl font-bold text-card-alt mt-1">
            {totalRevenue > 0 ? `₹${totalRevenue.toLocaleString("en-IN")}` : "₹0"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-alt uppercase">Completion Rate</p>
          <p data-testid="kpi-completion-rate-value" className="text-2xl font-bold text-card-alt mt-1">{completionRate}%</p>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appointment Trends */}
        <div data-testid="trend-chart" className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-card-alt mb-4">Appointment Trends</h3>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-alt)" tickFormatter={fmtDate} />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-alt)" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} labelFormatter={fmtDate} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completed" stroke="var(--success)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cancelled" stroke="var(--destructive)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-alt py-8 text-center">No data for this period</p>
          )}
        </div>

        {/* Revenue */}
        <div data-testid="revenue-chart" className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-card-alt mb-4">Revenue</h3>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-alt)" tickFormatter={fmtDate} />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-alt)" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} labelFormatter={fmtDate} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total_revenue" fill="var(--primary)" name="Total" />
                <Bar dataKey="cleared" fill="var(--success)" name="Cleared" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-card-alt/50">
              <BarChart3 className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No revenue data for this period</p>
            </div>
          )}
        </div>

        {/* Slot Utilization */}
        <div data-testid="utilization-chart" className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-card-alt mb-4">Doctor Utilization</h3>
          {utilization.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={utilization} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--muted-alt)" />
                <YAxis dataKey="doctor_name" type="category" tick={{ fontSize: 10 }} stroke="var(--muted-alt)" width={120} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} labelFormatter={fmtDate} />
                <Bar dataKey="appointment_count" fill="var(--accent)" name="Appointments" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-alt py-8 text-center">No utilization data</p>
          )}
        </div>

        {/* Top Doctors */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-card-alt mb-4">Top Doctors</h3>
          {topDoctors.length > 0 ? (
            <div className="space-y-3">
              {topDoctors.map((d, i) => (
                <div key={d.doctor_id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-alt w-5">{i + 1}</span>
                  {d.pfp_link ? (
                    <img src={d.pfp_link} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-alt">
                      {d.doctor_name.split(" ").pop()?.[0] || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-card-alt truncate">{d.doctor_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${topDoctors[0] ? (d.appointment_count / topDoctors[0].appointment_count) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-alt">{d.appointment_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-alt py-8 text-center">No data</p>
          )}
        </div>
      </div>
    </div>
  );
}

import { componentTestSpec } from '@swasthyaseva/test-gen';

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'clinic',
  title: 'Analytics Tab',
  elements: {
    analyticsTab: { role: 'button', name: /Analytics/ },
    range7d: { role: 'button', name: '7 Days' },
    range30d: { role: 'button', name: '30 Days' },
    range90d: { role: 'button', name: '90 Days' },
    refreshBtn: { testId: 'analytics-refresh' },
    kpiTotalAppointments: { text: 'Total Appointments' },
    kpiTotalRevenue: { text: 'Total Revenue' },
    kpiCompletionRate: { text: 'Completion Rate' },
    kpiTotalAppointmentsValue: { testId: 'kpi-total-appointments-value' },
    kpiTotalRevenueValue: { testId: 'kpi-total-revenue-value' },
    kpiCompletionRateValue: { testId: 'kpi-completion-rate-value' },
    trendChart: { testId: 'trend-chart' },
    revenueChart: { testId: 'revenue-chart' },
    utilizationChart: { testId: 'utilization-chart' },
  },
  flows: [
    {
      name: 'view analytics charts and KPIs with data',
      steps: [
        { do: 'click', on: 'analyticsTab' },
        { do: 'waitFor', on: 'kpiTotalAppointments' },
        { expect: 'visible', on: 'kpiTotalRevenue' },
        { expect: 'visible', on: 'kpiCompletionRate' },
        { expect: 'visible', on: 'trendChart' },
        { expect: 'visible', on: 'revenueChart' },
      ],
    },
    {
      name: 'switch time range to 7 days reloads charts',
      after: 'view analytics charts and KPIs with data',
      steps: [
        { do: 'click', on: 'range7d' },
        { expect: 'visible', on: 'trendChart' },
        { expect: 'visible', on: 'kpiTotalAppointments' },
      ],
    },
    {
      name: 'switch time range to 90 days reloads charts',
      after: 'view analytics charts and KPIs with data',
      steps: [
        { do: 'click', on: 'range90d' },
        { expect: 'visible', on: 'trendChart' },
        { expect: 'visible', on: 'kpiTotalAppointments' },
      ],
    },
    {
      name: 'refresh analytics reloads data',
      after: 'view analytics charts and KPIs with data',
      steps: [
        { do: 'click', on: 'refreshBtn' },
        { expect: 'visible', on: 'trendChart' },
        { expect: 'visible', on: 'kpiTotalAppointments' },
      ],
    },
    {
      name: 'all chart containers render',
      steps: [
        { do: 'click', on: 'analyticsTab' },
        { do: 'waitFor', on: 'trendChart' },
        { expect: 'visible', on: 'revenueChart' },
        { expect: 'visible', on: 'utilizationChart' },
      ],
    },
    {
      name: 'switch time range to 30 days reloads charts',
      after: 'view analytics charts and KPIs with data',
      steps: [
        { do: 'click', on: 'range7d' },
        { expect: 'visible', on: 'trendChart' },
        { do: 'click', on: 'range30d' },
        { expect: 'visible', on: 'trendChart' },
        { expect: 'visible', on: 'kpiTotalAppointments' },
      ],
    },
    {
      name: 'KPI values display non-empty content',
      after: 'view analytics charts and KPIs with data',
      steps: [
        { expect: 'visible', on: 'kpiTotalAppointmentsValue' },
        { expect: 'visible', on: 'kpiTotalRevenueValue' },
        { expect: 'visible', on: 'kpiCompletionRateValue' },
      ],
    },
  ],
});
