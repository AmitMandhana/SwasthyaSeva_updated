'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Shield, Phone, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@swasthyaseva/ui';
import { getOtpMonitor, type OtpEntry, type OtpMonitorData } from '../../../lib/api';
import { componentTestSpec } from '@swasthyaseva/test-gen';

export default function OtpMonitorTab() {
  const [data, setData] = useState<OtpMonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const result = await getOtpMonitor();
      setData(result);
      setFetchError("");
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to load OTP data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetch, 10_000);
    return () => clearInterval(id);
  }, [autoRefresh, fetch]);

  function timeLeft(expiresAt: number): string {
    const ms = expiresAt - Date.now();
    if (ms <= 0) return 'Expired';
    const s = Math.ceil(ms / 1000);
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
  }

  function timeSince(sentAt: number | null): string {
    if (!sentAt) return '—';
    const s = Math.floor((Date.now() - sentAt) / 1000);
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s ago` : `${s}s ago`;
  }

  const totalActive = data ? data.loginOTPs.length + data.patientOTPs.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 data-testid="otp-monitor-heading" className="text-xl font-semibold text-card-alt">OTP Monitor</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-alt cursor-pointer">
            <input type="checkbox" data-testid="otp-auto-refresh" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded" />
            Auto-refresh (10s)
          </label>
          <Button data-testid="otp-refresh-btn" onClick={fetch} size="sm" icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}>
            Refresh
          </Button>
        </div>
      </div>

      {fetchError && (
        <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {fetchError}
        </div>
      )}

      {/* Summary cards */}
      <div data-testid="otp-summary-cards" className="grid grid-cols-3 gap-4">
        <div data-testid="otp-card-active" className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Phone size={16} className="text-primary" />
            <span className="text-sm font-medium text-muted-alt">Active OTPs</span>
          </div>
          <p className="text-2xl font-bold text-card-alt">{totalActive}</p>
        </div>
        <div data-testid="otp-card-debug" className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-primary" />
            <span className="text-sm font-medium text-muted-alt">Debug Numbers</span>
          </div>
          <p className="text-2xl font-bold text-card-alt">{data?.debugNumbers.length ?? 0}</p>
        </div>
        <div data-testid="otp-card-devmode" className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className={data?.devMode ? 'text-warning' : 'text-success'} />
            <span className="text-sm font-medium text-muted-alt">DEV_MODE</span>
          </div>
          <p className={`text-2xl font-bold ${data?.devMode ? 'text-warning' : 'text-success'}`}>
            {data?.devMode ? 'ON' : 'OFF'}
          </p>
        </div>
      </div>

      {/* Login OTPs (Doctor / Clinic Admin) */}
      <section data-testid="otp-login-table" className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-card-alt">Login OTPs (Doctor / Clinic Admin)</h3>
        </div>
        {data?.loginOTPs.length === 0 ? (
          <p data-testid="otp-login-empty" className="p-4 text-sm text-muted-alt">No active login OTPs</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-alt">
                  <th className="p-3 font-medium">Role</th>
                  <th className="p-3 font-medium">Phone</th>
                  <th className="p-3 font-medium">OTP</th>
                  <th className="p-3 font-medium">Attempts</th>
                  <th className="p-3 font-medium">Sent</th>
                  <th className="p-3 font-medium">Expires In</th>
                </tr>
              </thead>
              <tbody>
                {data?.loginOTPs.map((entry: OtpEntry, i: number) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.role === 'doctor' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                        {entry.role}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-card-alt">{entry.phone}</td>
                    <td className="p-3 font-mono font-bold text-card-alt">{entry.otp ?? '—'}</td>
                    <td className="p-3 text-card-alt">{entry.attempts}/{entry.maxAttempts}</td>
                    <td className="p-3 text-muted-alt">{timeSince(entry.sentAt)}</td>
                    <td className="p-3">
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-muted-alt" />
                        <span className="text-card-alt">{timeLeft(entry.expiresAt)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Patient OTPs */}
      <section data-testid="otp-patient-table" className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-card-alt">Patient OTPs</h3>
        </div>
        {data?.patientOTPs.length === 0 ? (
          <p data-testid="otp-patient-empty" className="p-4 text-sm text-muted-alt">No active patient OTPs</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-alt">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Phone</th>
                  <th className="p-3 font-medium">OTP</th>
                  <th className="p-3 font-medium">Attempts</th>
                  <th className="p-3 font-medium">Sent</th>
                  <th className="p-3 font-medium">Expires In</th>
                </tr>
              </thead>
              <tbody>
                {data?.patientOTPs.map((entry: OtpEntry, i: number) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3 text-card-alt">{entry.firstName ?? '—'}</td>
                    <td className="p-3 font-mono text-card-alt">{entry.phone}</td>
                    <td className="p-3 font-mono font-bold text-card-alt">{entry.otp ?? '—'}</td>
                    <td className="p-3 text-card-alt">{entry.attempts}/{entry.maxAttempts}</td>
                    <td className="p-3 text-muted-alt">{timeSince(entry.sentAt)}</td>
                    <td className="p-3">
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-muted-alt" />
                        <span className="text-card-alt">{timeLeft(entry.expiresAt)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Debug Numbers */}
      {data && data.debugNumbers.length > 0 && (
        <section className="bg-card rounded-lg border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-card-alt">Debug Numbers (fixed OTP: 123456)</h3>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {data.debugNumbers.map((num, i) => (
              <span key={i} className="px-3 py-1.5 bg-muted rounded-full text-sm font-mono text-card-alt">
                {num}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'admin',
  title: 'OTP Monitor Tab',
  elements: {
    toolsTab: { testId: 'tab-tools' },
    toolCardOtp: { testId: 'tool-card-otp' },
    heading: { testId: 'otp-monitor-heading' },
  },
  flows: [
    {
      name: 'view otp monitor',
      steps: [
        { do: 'waitFor', on: 'toolsTab' },
        { do: 'click', on: 'toolsTab' },
        { do: 'click', on: 'toolCardOtp' },
        { expect: 'visible', on: 'heading' },
      ],
    },
  ],
});
