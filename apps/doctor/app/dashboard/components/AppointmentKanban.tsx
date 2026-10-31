'use client';

import React from 'react';
import { Eye, ExternalLink, CheckCircle, Activity } from 'lucide-react';
import type { QueueAppointmentWithClinic } from '../../../lib/api';
import { componentTestSpec } from '@swasthyaseva/test-gen';

const STATUS_COLUMNS = [
  { key: 'accepted', label: 'Accepted', color: 'bg-primary', dotColor: 'bg-primary' },
  { key: 'waiting', label: 'Waiting', color: 'bg-primary', dotColor: 'bg-primary' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-warning', dotColor: 'bg-warning' },
  { key: 'completed', label: 'Completed', color: 'bg-success', dotColor: 'bg-success' },
  { key: 'missed', label: 'Missed / Cancelled', color: 'bg-destructive', dotColor: 'bg-destructive' },
] as const;

function formatAge(dob: string): string {
  return String(Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000));
}

type Props = {
  appointments: QueueAppointmentWithClinic[];
  onOverview: (apt: QueueAppointmentWithClinic) => void;
};

export default function AppointmentKanban({ appointments, onOverview }: Props) {
  const grouped = new Map<string, QueueAppointmentWithClinic[]>();
  for (const col of STATUS_COLUMNS) grouped.set(col.key, []);
  for (const apt of appointments) {
    const key = apt.appointment_status === 'cancelled' ? 'missed' : apt.appointment_status;
    const list = grouped.get(key) || grouped.get('accepted')!;
    list.push(apt);
  }

  return (
    <div data-testid="kanban-board" className="flex gap-3 overflow-x-auto pb-4">
      {STATUS_COLUMNS.map(col => {
        const items = grouped.get(col.key) || [];
        return (
          <div key={col.key} data-testid={`kanban-col-${col.key}`} className="flex-shrink-0 w-56 min-w-[14rem]">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
              <span className="text-xs font-semibold text-card-alt uppercase tracking-wide">{col.label}</span>
              <span className="text-xs text-muted-alt ml-auto">{items.length}</span>
            </div>
            <div className="space-y-2 max-h-[calc(100vh-18rem)] overflow-y-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {items.length === 0 && (
                <p className="text-xs text-muted-alt text-center py-6 bg-muted/20 rounded-lg border border-dashed border-border">None</p>
              )}
              {items.map(apt => (
                <div key={apt.appointment_id} data-testid="kanban-card" className="bg-card border border-border rounded-lg p-3 space-y-2 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <p data-testid="kanban-card-patient" className="text-sm font-semibold text-card-alt truncate">{apt.patient_name}</p>
                    {apt.dob && (
                      <span className="text-xs font-medium shrink-0 ml-2">
                        <span className="text-card-alt">{formatAge(apt.dob)} yrs </span>
                        <span className={apt.gender === 'male' ? 'text-blue-400' : apt.gender === 'female' ? 'text-pink-400' : 'text-muted-alt'}>
                          {apt.gender === 'male' ? 'M' : apt.gender === 'female' ? 'F' : 'O'}
                        </span>
                      </span>
                    )}
                  </div>
                  {(apt.symptom_name || apt.symptom_text) && (
                    <p className="text-xs text-muted-alt flex items-center gap-1">
                      <Activity className="w-3 h-3 shrink-0" />
                      <span className="truncate">{apt.symptom_name || apt.symptom_text}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-muted-alt">{apt.clinic_name}</p>
                  <div className="flex gap-1.5 pt-1">
                    <button
                      data-testid="kanban-overview-btn"
                      onClick={() => onOverview(apt)}
                      className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium px-2 py-1 rounded bg-muted/30 text-muted-alt hover:text-card-alt hover:bg-muted/50 transition-colors"
                    >
                      <Eye className="w-3 h-3" /> Overview
                    </button>
                    <button
                      data-testid="kanban-consult-btn"
                      onClick={() => window.open(`/dashboard/consultation/${apt.appointment_id}`, '_blank')}
                      className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Consult
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/appointments',
  app: 'doctor',
  title: 'Appointment Kanban',
  elements: {
    kanbanToggle: { role: 'button', name: 'Kanban' },
    kanbanBoard: { testId: 'kanban-board' },
    acceptedCol: { testId: 'kanban-col-accepted' },
    waitingCol: { testId: 'kanban-col-waiting' },
    inProgressCol: { testId: 'kanban-col-in_progress' },
    completedCol: { testId: 'kanban-col-completed' },
    missedCol: { testId: 'kanban-col-missed' },
    card: { testId: 'kanban-card' },
    cardPatient: { testId: 'kanban-card-patient' },
    overviewBtn: { testId: 'kanban-overview-btn' },
    consultBtn: { testId: 'kanban-consult-btn' },
    colLabelAccepted: { text: 'Accepted' },
    colLabelWaiting: { text: 'Waiting' },
    colLabelInProgress: { text: 'In Progress' },
    colLabelCompleted: { text: 'Completed' },
    colLabelMissed: { text: 'Missed / Cancelled' },
  },
  flows: [
    {
      name: 'view kanban columns',
      steps: [
        { on: 'kanbanToggle', do: 'click' },
        { do: 'waitFor', on: 'kanbanBoard' },
        { on: 'colLabelAccepted', expect: 'visible' },
        { on: 'colLabelWaiting', expect: 'visible' },
        { on: 'colLabelInProgress', expect: 'visible' },
        { on: 'colLabelCompleted', expect: 'visible' },
        { on: 'colLabelMissed', expect: 'visible' },
        { on: 'acceptedCol', expect: 'visible' },
        { on: 'completedCol', expect: 'visible' },
      ],
    },
    {
      name: 'verify cards display patient info',
      after: 'view kanban columns',
      steps: [
        { on: 'card', expect: 'countMin', value: 1 },
        { on: 'cardPatient', expect: 'countMin', value: 1 },
      ],
    },
    {
      name: 'click overview button on a card',
      after: 'view kanban columns',
      steps: [
        { on: 'overviewBtn', do: 'click' },
      ],
    },
  ],
});
