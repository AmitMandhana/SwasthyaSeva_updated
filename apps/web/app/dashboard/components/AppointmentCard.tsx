'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Clock, User } from 'lucide-react';
import { Button } from '@swasthyaseva/ui';
import { componentTestSpec } from '@swasthyaseva/test-gen';

interface AppointmentCardProps {
  id: string;
  patientName: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  appointmentTime: string;
  hasPrescription: boolean;
  chiefComplaint?: string;
  profilePicture?: string;
}

export default function AppointmentCard({
  id,
  patientName,
  age,
  gender,
  appointmentTime,
  hasPrescription,
  chiefComplaint,
  profilePicture,
}: AppointmentCardProps) {
  const router = useRouter();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-6 hover:bg-background/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Profile Picture */}
        <div className="shrink-0">
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={patientName}
              className="w-12 h-12 rounded-full object-cover border-2 border-input"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-input flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {getInitials(patientName)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <div className="shrink-0">
            <h3 className="text-base font-semibold text-foreground whitespace-nowrap">
              {patientName} {age},{gender}
            </h3>
          </div>

          <div className="shrink-0 flex items-center gap-1 text-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-semibold">{appointmentTime}</span>
          </div>

          {/* Chief Complaint */}
          {chiefComplaint && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-card-alt truncate">
                {chiefComplaint}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-3">
          <Button onClick={() => router.push(`/doctor-interface?patientId=${id}`)} className="whitespace-nowrap">
            Check Medical History
          </Button>
          {hasPrescription && (
            <button className="px-4 py-2 bg-success text-success-alt rounded-md font-medium hover:opacity-90 transition-opacity text-sm whitespace-nowrap">
              View Prescription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'web',
  title: 'Appointment Card',
  elements: {
    heading: { role: 'heading', name: 'My Appointments' },
    emptyMessage: { text: 'No upcoming appointments' },
    medicalHistoryBtn: { role: 'button', name: 'Check Medical History' },
    viewPrescriptionBtn: { role: 'button', name: 'View Prescription' },
  },
  flows: [],
});
