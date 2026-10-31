'use client';

import React, { useState } from 'react';
import AppointmentList from '../components/AppointmentList';
import PatientOverviewModal from '../components/PatientOverviewModal';
import type { QueueAppointmentWithClinic } from '../../../lib/api';

export default function AppointmentsPage() {
  const [overviewAppointment, setOverviewAppointment] = useState<QueueAppointmentWithClinic | null>(null);

  return (
    <div className="bg-background min-h-[calc(100vh-4rem)]">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <AppointmentList onOverview={setOverviewAppointment} />
      </div>

      {overviewAppointment && (
        <PatientOverviewModal
          appointmentId={overviewAppointment.appointment_id}
          patientName={overviewAppointment.patient_name}
          onClose={() => setOverviewAppointment(null)}
        />
      )}
    </div>
  );
}

import { testSpec } from '@swasthyaseva/test-gen';

export const __test = testSpec({
  route: '/dashboard/appointments',
  auth: 'role:doctor',
  app: 'doctor',
  title: 'Appointments List',
  elements: {
    appointmentsHeading: { text: /Appointments \(\d+\)/ },
    searchInput: { testId: 'appt-search-input' },
    refreshButton: { testId: 'appt-refresh-btn' },
    patientName: { testId: 'appt-patient-name' },
    overviewButton: { testId: 'appt-overview-btn' },
    consultButton: { testId: 'appt-consult-btn' },
    noAppointmentsMessage: { text: /No (upcoming )?appointments( match filters)?/ },
    overviewModal: { role: 'dialog', name: /.*/ },
    selectDatesButton: { text: 'Select dates' },
    thirtyDaysQuickBtn: { role: 'button', name: '30 days' },
    clinicFilterTrigger: { testId: 'multiselect-trigger' },
    clinicFilterPanel: { testId: 'multiselect-panel' },
    clinicFilterOption: { testId: 'multiselect-option' },
    statusBadge: { testId: 'appt-status-badge' },
    dateGroup: { testId: 'appt-date-group' },
  },
  flows: [],
  flowTree: {
    name: 'appointments list',
    steps: [],
    children: [
      {
        name: 'render appointment list with filters',
        steps: [
          { do: 'waitFor', on: 'appointmentsHeading' },
          { expect: 'visible', on: 'searchInput' },
          { expect: 'visible', on: 'refreshButton' },
        ],
        children: [
          {
            name: 'filters are visible',
            steps: [],
          },
          {
            name: 'search appointments by patient name',
            steps: [
              { do: 'reactFill', on: 'searchInput', value: 'nonexistent_xyz_patient_99' },
              { do: 'waitFor', on: 'noAppointmentsMessage' },
            ],
            children: [
              {
                name: 'no results shows empty state message',
                steps: [
                  { expect: 'visible', on: 'noAppointmentsMessage' },
                ],
              },
            ],
          },
          {
            name: 'refresh button reloads appointments',
            steps: [
              { do: 'click', on: 'refreshButton' },
              { do: 'waitFor', on: 'appointmentsHeading' },
              { expect: 'visible', on: 'appointmentsHeading' },
            ],
          },
          {
            name: 'open clinic filter dropdown panel',
            steps: [
              { do: 'click', on: 'clinicFilterTrigger' },
              { expect: 'visible', on: 'clinicFilterPanel' },
            ],
          },
          {
            name: 'load past appointments and verify content',
            steps: [
              { do: 'click', on: 'selectDatesButton' },
              { do: 'click', on: 'thirtyDaysQuickBtn' },
              { do: 'waitFor', on: 'patientName' },
              { expect: 'countMin', on: 'patientName', value: 1 },
              { expect: 'countMin', on: 'consultButton', value: 1 },
              { expect: 'countMin', on: 'overviewButton', value: 1 },
            ],
            children: [
              {
                name: 'past appointments are visible',
                steps: [],
              },
              {
                name: 'open consultation from appointment in new tab',
                steps: [
                  { do: 'clickNewTab', on: 'consultButton', value: '/dashboard/consultation/' },
                ],
              },
              {
                name: 'open patient overview modal',
                steps: [
                  { do: 'click', on: 'overviewButton' },
                  { expect: 'visible', on: 'overviewModal' },
                ],
              },
              {
                name: 'appointment status badge is visible',
                steps: [
                  { expect: 'visible', on: 'statusBadge' },
                ],
              },
              {
                name: 'date group expands and collapses',
                steps: [
                  { expect: 'visible', on: 'dateGroup' },
                  { do: 'click', on: 'dateGroup' },
                  { expect: 'visible', on: 'dateGroup' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
});
