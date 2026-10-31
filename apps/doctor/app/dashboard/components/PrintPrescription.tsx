'use client';

import React from 'react';
import { Printer } from 'lucide-react';
import { type FullAppointmentData } from '../../../lib/api';
import { componentTestSpec } from '@swasthyaseva/test-gen';

interface Props {
  formData?: unknown;
  appointmentData: FullAppointmentData | null;
  prescriptionFormat?: string;
  disabled?: boolean;
}

export default function PrintPrescription({ appointmentData, disabled }: Props) {
  const handlePrint = () => {
    if (!appointmentData) return;
    window.open(`/print/${appointmentData.appointment.appointment_id}`, '_blank');
  };

  return (
    <button
      onClick={handlePrint}
      disabled={disabled}
      className="bg-primary hover:opacity-90 text-primary-alt px-4 py-2 rounded-md transition-colors font-medium disabled:opacity-50 flex items-center gap-2 text-sm"
    >
      <Printer className="w-4 h-4" />
      Print
    </button>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'Print Prescription Button',
  elements: {
    printBtn: { role: 'button', name: 'Print' },
  },
  flows: [
    {
      name: 'click print button',
      steps: [
        { on: 'printBtn', expect: 'visible' },
        { on: 'printBtn', do: 'click' },
      ],
    },
  ],
});
