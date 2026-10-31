'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Users } from 'lucide-react';
import { getTodayQueue, type QueueAppointment } from '../../../lib/api';
import { componentTestSpec } from '@swasthyaseva/test-gen';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-alt',
  accepted: 'bg-primary/15 text-primary',
  waiting: 'bg-primary/15 text-primary',
  in_progress: 'bg-warning/15 text-warning',
  completed: 'bg-success/15 text-success',
  missed: 'bg-destructive/15 text-destructive',
  cancelled: 'bg-muted/60 text-muted-alt',
};

type Props = {
  selectedAppointmentId: number | null;
  onSelectPatient: (appointmentId: number) => void;
};

export default function AppointmentQueue({ selectedAppointmentId, onSelectPatient }: Props) {
  const [appointments, setAppointments] = useState<QueueAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const { appointments: data } = await getTodayQueue();
      setAppointments(data);
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  return (
    <div className="bg-card rounded-lg border border-border p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Today&apos;s Patients ({appointments.length})
        </h2>
        <button
          data-testid="queue-refresh-btn"
          onClick={loadQueue}
          disabled={loading}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          title="Refresh queue"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && appointments.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <p className="text-muted-alt text-sm py-4 text-center">No appointments today</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {appointments.map((apt) => (
            <button
              key={apt.appointment_id}
              data-testid="queue-item"
              onClick={() => onSelectPatient(apt.appointment_id)}
              className={`w-full text-left p-3 rounded-md border transition-all ${
                selectedAppointmentId === apt.appointment_id
                  ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p data-testid="queue-patient-name" className="font-medium text-sm truncate">{apt.patient_name}</p>
                  <p className="text-xs text-muted-alt truncate">{apt.symptom_name || apt.symptom_text || apt.complaints || 'No symptoms noted'}</p>
                </div>
                <span data-testid="queue-status-badge" className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${STATUS_COLORS[apt.appointment_status] || 'bg-muted'}`}>
                  {apt.appointment_status.replace('_', ' ')}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'doctor',
  title: 'Appointment Queue',
  elements: {
    queueHeading: { text: /Today's Patients/ },
    refreshBtn: { testId: 'queue-refresh-btn' },
    emptyMessage: { text: 'No appointments today' },
    queueItem: { testId: 'queue-item' },
    patientName: { testId: 'queue-patient-name' },
    statusBadge: { testId: 'queue-status-badge' },
  },
  // Component is not currently rendered on any page — flows disabled until wired up
  flows: [],
});
