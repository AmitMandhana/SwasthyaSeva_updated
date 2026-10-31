'use client';

import { Modal } from '@swasthyaseva/ui';
import { ExternalLink, Calendar, MapPin, Activity, MessageSquare, Hash } from 'lucide-react';
import type { QueueAppointmentWithClinic } from '../../../lib/api';
import { componentTestSpec } from '@swasthyaseva/test-gen';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-muted', text: 'text-muted-alt' },
  accepted: { bg: 'bg-primary/15', text: 'text-primary' },
  waiting: { bg: 'bg-primary/15', text: 'text-primary' },
  in_progress: { bg: 'bg-warning/15', text: 'text-warning' },
  completed: { bg: 'bg-success/15', text: 'text-success' },
  missed: { bg: 'bg-destructive/15', text: 'text-destructive' },
  cancelled: { bg: 'bg-muted/60', text: 'text-muted-alt' },
};

type Props = {
  appointment: QueueAppointmentWithClinic;
  onClose: () => void;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function AppointmentDetailModal({ appointment, onClose }: Props) {
  const status = STATUS_STYLES[appointment.appointment_status] || STATUS_STYLES.pending;

  const openConsultation = () => {
    window.open(`/dashboard/consultation/${appointment.appointment_id}`, '_blank');
    onClose();
  };

  return (
    <Modal
      title="Appointment Details"
      onClose={onClose}
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            data-testid="detail-close-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-muted-alt hover:bg-muted transition-colors"
          >
            Close
          </button>
          <button
            data-testid="detail-open-consultation-btn"
            onClick={openConsultation}
            className="flex items-center gap-2 bg-primary hover:opacity-90 text-primary-alt px-5 py-2 rounded-md transition-colors font-medium text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Open Consultation
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Patient name + status */}
        <div className="flex items-start justify-between">
          <div>
            <h3 data-testid="detail-patient-name" className="text-xl font-semibold text-card-alt">{appointment.patient_name}</h3>
            <p className="text-sm text-muted-alt mt-0.5">
              {appointment.gender || ''} {appointment.dob ? `· Born ${appointment.dob.slice(0, 10)}` : ''}
            </p>
          </div>
          <span data-testid="detail-status-badge" className={`text-xs px-3 py-1 rounded-full font-medium ${status.bg} ${status.text}`}>
            {appointment.appointment_status.replace('_', ' ')}
          </span>
        </div>

        <div className="h-px bg-border" />

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <Activity className="w-4 h-4 text-muted-alt mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-alt">Symptoms</p>
              <p className="text-sm text-card-alt">{appointment.symptom_name || appointment.symptom_text || 'None noted'}</p>
              {appointment.symptom_text && appointment.symptom_name && (
                <p className="text-xs text-muted-alt mt-0.5">{appointment.symptom_text}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-muted-alt mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-alt">Complaints</p>
              <p className="text-sm text-card-alt">{appointment.complaints || 'None'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-muted-alt mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-alt">Date</p>
              <p className="text-sm text-card-alt">{formatDate(typeof appointment.appointment_date === 'string' ? appointment.appointment_date.slice(0, 10) : new Date(appointment.appointment_date).toISOString().slice(0, 10))}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-alt mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-alt">Clinic</p>
              <p className="text-sm text-card-alt">{appointment.clinic_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Hash className="w-4 h-4 text-muted-alt mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-alt">Queue Position</p>
              <p className="text-sm text-card-alt">#{appointment.recommended_index}</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/appointments',
  app: 'doctor',
  title: 'Appointment Detail Modal',
  elements: {
    modalTitle: { text: 'Appointment Details' },
    patientName: { testId: 'detail-patient-name' },
    statusBadge: { testId: 'detail-status-badge' },
    symptomsLabel: { text: 'Symptoms' },
    complaintsLabel: { text: 'Complaints' },
    dateLabel: { text: 'Date' },
    clinicLabel: { text: 'Clinic' },
    queueLabel: { text: 'Queue Position' },
    closeBtn: { testId: 'detail-close-btn' },
    openConsultationBtn: { testId: 'detail-open-consultation-btn' },
  },
  // Component is not currently rendered on any page — flows disabled until wired up
  flows: [],
});
