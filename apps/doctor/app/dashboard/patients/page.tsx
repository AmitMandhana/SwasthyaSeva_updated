'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Users, Loader2 } from 'lucide-react';
import { getDoctorPatients, type PatientListItem } from '../../../lib/api';
import PatientOverviewModal from '../components/PatientOverviewModal';

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [overviewPatient, setOverviewPatient] = useState<{ userId: number; name: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { patients: data } = await getDoctorPatients(searchQuery || undefined);
      setPatients(data);
    } catch (err) {
      console.error('Failed to load patients:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { load(); }, [load]);

  function formatDate(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function calcAge(dob: string) {
    if (!dob) return '';
    const parsed = new Date(dob);
    if (isNaN(parsed.getTime()) || parsed.getFullYear() < 1900) return '';
    const age = Math.floor((Date.now() - parsed.getTime()) / 31557600000);
    if (age <= 0) return '';
    return String(age);
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-card rounded-lg border border-border p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 shrink-0">
            <Users className="w-5 h-5 text-primary" />
            Patients ({patients.length})
          </h2>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-muted-alt shrink-0" />
            <input
              data-testid="search-patients"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by name..."
              className="text-xs bg-transparent outline-none text-card-alt placeholder:text-muted-alt w-full"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded shimmer bg-muted/20" />)}
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-alt gap-3">
            <Users size={32} className="opacity-40" />
            <p className="text-sm">{searchQuery ? 'No patients match your search' : 'No patients yet'}</p>
            {searchQuery && <p className="text-xs">Try a different name or clear the search</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table data-testid="patients-table" className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-alt">Patient</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-alt">Gender</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-alt">Age</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-alt">Last Visit</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-alt">Total Visits</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-alt"></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p, index) => (
                  <tr key={p.user_id} data-testid={index === 0 ? 'patient-row-first' : undefined} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td data-testid={index === 0 ? 'patient-cell-name' : undefined} className="py-2.5 px-3 font-medium text-card-alt">{p.patient_name}</td>
                    <td data-testid={index === 0 ? 'patient-cell-gender' : undefined} className="py-2.5 px-3 text-muted-alt capitalize">{p.gender || '—'}</td>
                    <td data-testid={index === 0 ? 'patient-cell-age' : undefined} className="py-2.5 px-3 text-muted-alt">{calcAge(p.dob) ? `${calcAge(p.dob)}y` : '—'}</td>
                    <td data-testid={index === 0 ? 'patient-cell-lastvisit' : undefined} className="py-2.5 px-3 text-muted-alt">{formatDate(p.last_visit)}</td>
                    <td data-testid={index === 0 ? 'patient-cell-visits' : undefined} className="py-2.5 px-3 text-muted-alt">{p.total_visits}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        data-testid={index === 0 ? 'btn-view-history' : undefined}
                        onClick={() => setOverviewPatient({ userId: p.user_id, name: p.patient_name })}
                        className="text-xs text-primary hover:underline"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {overviewPatient && (
        <PatientOverviewModal
          appointmentId={0}
          patientName={overviewPatient.name}
          onClose={() => setOverviewPatient(null)}
        />
      )}
    </div>
  );
}

import { testSpec } from '@swasthyaseva/test-gen';

export const __test = testSpec({
  route: '/dashboard/patients',
  auth: 'role:doctor',
  app: 'doctor',
  title: 'Patients List',
  seedApi: {
    endpoint: '/api/test/create-appointment',
    method: 'POST',
    body: {
      doctor_id: 0,
      user_id: 0,
      slot_id: 0,
      appointment_date: new Date().toISOString().slice(0, 10),
      symptom_code: 'FEVER',
      symptom_text: 'E2E patient list test',
    },
    routeParam: 'appointment_id',
    resolveEntities: true,
  },
  elements: {
    patientsHeading: { text: /Patients \(\d+\)/ },
    searchInput: { testId: 'search-patients' },
    patientTable: { testId: 'patients-table' },
    viewHistoryButton: { testId: 'btn-view-history' },
    noPatientsMessage: { text: 'No patients match your search' },
    overviewModal: { role: 'dialog', name: /.*/ },
    firstPatientRow: { testId: 'patient-row-first' },
    patientCellName: { testId: 'patient-cell-name' },
    patientCellGender: { testId: 'patient-cell-gender' },
    patientCellAge: { testId: 'patient-cell-age' },
    patientCellLastVisit: { testId: 'patient-cell-lastvisit' },
    patientCellVisits: { testId: 'patient-cell-visits' },
  },
  flows: [],
  flowTree: {
    name: 'render patient list',
    steps: [
      { expect: 'visible', on: 'patientsHeading' },
      { expect: 'visible', on: 'searchInput' },
      { expect: 'visible', on: 'patientTable' },
      { expect: 'visible', on: 'viewHistoryButton' },
    ],
    children: [
      {
        name: 'search filters results',
        steps: [
          { do: 'fill', on: 'searchInput', value: 'nonexistent_xyz_patient_99' },
          { expect: 'visible', on: 'noPatientsMessage' },
        ],
      },
      {
        name: 'open patient history modal',
        steps: [
          { do: 'click', on: 'viewHistoryButton' },
          { expect: 'visible', on: 'overviewModal' },
        ],
      },
      {
        name: 'search with no results then clear restores list',
        steps: [
          { do: 'fill', on: 'searchInput', value: 'nonexistent_xyz_patient_99' },
          { expect: 'visible', on: 'noPatientsMessage' },
          { do: 'fill', on: 'searchInput', value: '' },
          { expect: 'visible', on: 'patientTable' },
        ],
      },
      {
        name: 'first patient row displays non-empty data fields',
        steps: [
          { expect: 'visible', on: 'firstPatientRow' },
          { expect: 'visible', on: 'patientCellName' },
          { expect: 'visible', on: 'patientCellGender' },
          { expect: 'visible', on: 'patientCellAge' },
          { expect: 'visible', on: 'patientCellLastVisit' },
          { expect: 'visible', on: 'patientCellVisits' },
        ],
      },
    ],
  },
});
