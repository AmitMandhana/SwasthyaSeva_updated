'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Activity, Heart, Wind, Droplet, Ruler, Weight, FileText, AlertTriangle, ChevronRight } from 'lucide-react';
import { Modal } from '@swasthyaseva/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getFullAppointment, getVitalsHistory, getPrescriptionHistory, type FullAppointmentData, type ExaminationRecord, type PrescriptionHistory } from '../../../lib/api';
import { componentTestSpec } from '@swasthyaseva/test-gen';

type Props = {
  appointmentId: number;
  patientName: string;
  onClose: () => void;
};

type TabType = 'vitals' | 'history' | 'prescriptions';

function PrescriptionDetailModal({ prescription, onClose }: { prescription: PrescriptionHistory; onClose: () => void }) {
  const date = new Date(prescription.appointment_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Modal title={`Prescription — ${date}`} onClose={onClose} maxWidth="4xl">
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center gap-4 text-sm bg-muted/20 rounded-md px-4 py-3">
          <span className="text-card-alt font-semibold">Dr. {`${prescription.doctor_first_name} ${prescription.doctor_last_name}`.replace(/^(Dr\.?\s*|Doctor\s+)/i, '')}</span>
          <span className="text-border">·</span>
          <span className="text-card-alt">{prescription.clinic_name}</span>
          <span className="text-border">·</span>
          <span className="text-muted-alt">{date}</span>
        </div>

        {/* 3-col grid */}
        <div className="grid grid-cols-3 gap-4">
          {prescription.symptom_text && (
            <div className="bg-muted/20 rounded-md px-4 py-3">
              <span className="text-xs text-muted-alt uppercase tracking-wide">Symptoms</span>
              <p className="text-card-alt text-sm mt-1">{prescription.symptom_text}</p>
              {prescription.complaints && <p className="text-muted-alt text-sm">{prescription.complaints}</p>}
            </div>
          )}
          <div className="bg-muted/20 rounded-md px-4 py-3">
            <span className="text-xs text-muted-alt uppercase tracking-wide">Chief Complaint</span>
            <ul className="text-card-alt text-sm mt-1 space-y-0.5">
              {parseChiefComplaint(prescription.chief_complain).map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
          <div className="bg-muted/20 rounded-md px-4 py-3">
            <span className="text-xs text-muted-alt uppercase tracking-wide">Provisional Diagnosis</span>
            <p className="text-card-alt text-sm mt-1">{prescription.provisional_diagnosis}</p>
          </div>
          {prescription.final_diagnosis && (
            <div className="bg-muted/20 rounded-md px-4 py-3">
              <span className="text-xs text-muted-alt uppercase tracking-wide">Final Diagnosis</span>
              <p className="text-card-alt text-sm mt-1">{prescription.final_diagnosis}</p>
            </div>
          )}
          {prescription.significant_medical_history && (
            <div className="bg-muted/20 rounded-md px-4 py-3">
              <span className="text-xs text-muted-alt uppercase tracking-wide">Medical History</span>
              <p className="text-card-alt text-sm mt-1">{prescription.significant_medical_history}</p>
            </div>
          )}
          {prescription.other_findings && (
            <div className="bg-muted/20 rounded-md px-4 py-3">
              <span className="text-xs text-muted-alt uppercase tracking-wide">Other Findings</span>
              <p className="text-card-alt text-sm mt-1">{prescription.other_findings}</p>
            </div>
          )}
        </div>

        {/* Medications */}
        {prescription.medications && prescription.medications.length > 0 && (
          <div className="bg-muted/20 rounded-md px-4 py-3">
            <span className="text-xs text-muted-alt uppercase tracking-wide">Medications</span>
            <div className="mt-2 space-y-2">
              {prescription.medications.map((m, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-card-alt font-medium text-sm">{m.medicine_name}</span>
                  <span className="text-muted-alt text-sm">
                    {m.amount && `${m.amount}mg`} {m.frequency && `· ${m.frequency}x/day`} {m.duration_days && `· ${m.duration_days} days`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function parseChiefComplaint(raw: string): string[] {
  if (!raw) return [];
  const items = raw.includes('|||') ? raw.split('|||').filter(Boolean) : [raw];
  return items.map(item => {
    let text = item;
    let duration = '';
    if (text.includes('~~')) {
      const idx = text.indexOf('~~');
      const afterMarker = text.slice(idx + 2);
      duration = afterMarker.split(':::')[0];
      text = text.slice(0, idx) + text.slice(idx + 2 + duration.length);
    }
    const parts = text.split(':::').filter(Boolean);
    const main = parts[0];
    const associated = parts.slice(1);
    let result = main;
    if (duration) result += ` (${duration} days)`;
    if (associated.length > 0) result += ` — with ${associated.join(', ')}`;
    return result;
  });
}

function formatDate(ts: string) {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`;
}

export default function PatientOverviewModal({ appointmentId, patientName, onClose }: Props) {
  const [tab, setTab] = useState<TabType>('vitals');
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<FullAppointmentData | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<ExaminationRecord[]>([]);
  const [prescHistory, setPrescHistory] = useState<PrescriptionHistory[]>([]);
  const [viewingPrescription, setViewingPrescription] = useState<PrescriptionHistory | null>(null);
  const [expandedVisits, setExpandedVisits] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    getFullAppointment(appointmentId)
      .then(data => {
        setAppointment(data);
        return Promise.all([
          getVitalsHistory(data.appointment.user_id),
          getPrescriptionHistory(data.appointment.user_id),
        ]);
      })
      .then(([vitals, presc]) => {
        setVitalsHistory(vitals.history);
        setPrescHistory(presc.history);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [appointmentId]);

  const chartData = vitalsHistory.map(r => ({
    date: r.appointment_date ? formatDate(r.appointment_date) : '',
    dateNum: r.appointment_date ? new Date(r.appointment_date).getTime() : 0,
    bp_systolic: r.sp_systolic,
    bp_diastolic: r.bp_diastolic,
    heart_rate: r.heart_rate,
    respiratory_rate: r.respiratory_rate,
    oxygen_saturation: r.oxygen_saturation,
    height: r.height,
    weight: r.weight,
  })).sort((a, b) => a.dateNum - b.dateNum);

  const presc = appointment?.prescription;

  const tooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '0.5rem',
    color: 'var(--card-alt)',
  };

  const tickFormatter = (v: number) => {
    const d = new Date(v);
    return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`;
  };

  const dateFormatter = (v: unknown) => tickFormatter(Number(v));

  return (
    <>
    <Modal title={`Patient Overview — ${patientName}`} onClose={onClose} maxWidth="6xl">
      <div data-testid="overview-modal-content" className="h-[75vh] flex flex-col overflow-hidden">
      {!loading && (
          <div className="flex gap-1 border-b border-border shrink-0">
            <button
              data-testid="overview-tab-vitals"
              onClick={() => setTab('vitals')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'vitals' ? 'text-primary border-b-2 border-primary' : 'text-muted-alt hover:text-card-alt'}`}
            >
              <Activity className="w-4 h-4 inline mr-1.5" />
              Vitals Timeline
            </button>
            <button
              data-testid="overview-tab-history"
              onClick={() => setTab('history')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'history' ? 'text-primary border-b-2 border-primary' : 'text-muted-alt hover:text-card-alt'}`}
            >
              <FileText className="w-4 h-4 inline mr-1.5" />
              Medical History
            </button>
            <button
              data-testid="overview-tab-prescriptions"
              onClick={() => setTab('prescriptions')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'prescriptions' ? 'text-primary border-b-2 border-primary' : 'text-muted-alt hover:text-card-alt'}`}
            >
              <FileText className="w-4 h-4 inline mr-1.5" />
              Prescriptions ({prescHistory.length})
            </button>
          </div>
      )}

          <div className="flex-1 overflow-y-auto mt-4 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {loading ? (
            <div className="p-4 space-y-4">
              <div className="flex gap-4 border-b border-border pb-3">
                <div className="h-5 w-28 rounded bg-muted/40 shimmer" />
                <div className="h-5 w-28 rounded bg-muted/40 shimmer" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg h-48 bg-muted/20 shimmer" />
                <div className="rounded-lg h-48 bg-muted/20 shimmer" style={{ animationDelay: '0.2s' }} />
                <div className="rounded-lg h-48 bg-muted/20 shimmer" style={{ animationDelay: '0.4s' }} />
                <div className="rounded-lg h-48 bg-muted/20 shimmer" style={{ animationDelay: '0.6s' }} />
              </div>
            </div>
          ) : (<>
          {/* Vitals tab */}
          {tab === 'vitals' && (
            <div>
              {chartData.length === 0 ? (
                <p className="text-center text-muted-alt py-8">No vitals history available</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-[fadeIn_400ms_ease-in-out]">
                  {/* BP */}
                  <div className="bg-muted/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-card-alt mb-3 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-primary" /> Blood Pressure
                    </h4>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="dateNum" type="number" domain={['dataMin', 'dataMax']} tickFormatter={tickFormatter} stroke="var(--muted-alt)" tick={{ fontSize: 10 }} />
                        <YAxis stroke="var(--muted-alt)" tick={{ fontSize: 10 }} />
                        <Tooltip labelFormatter={dateFormatter} contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="bp_systolic" stroke="#0080ff" name="Systolic" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4, strokeWidth: 0 }} />
                        <Line type="monotone" dataKey="bp_diastolic" stroke="#16a085" name="Diastolic" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Heart Rate */}
                  <div className="bg-muted/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-card-alt mb-3 flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-red-500" /> Heart Rate
                    </h4>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="dateNum" type="number" domain={['dataMin', 'dataMax']} tickFormatter={tickFormatter} stroke="var(--muted-alt)" tick={{ fontSize: 10 }} />
                        <YAxis stroke="var(--muted-alt)" tick={{ fontSize: 10 }} />
                        <Tooltip labelFormatter={dateFormatter} contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="heart_rate" stroke="#ef4444" name="Heart Rate" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* O2 Sat */}
                  <div className="bg-muted/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-card-alt mb-3 flex items-center gap-1.5">
                      <Droplet className="w-4 h-4 text-green-500" /> Oxygen Saturation
                    </h4>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="dateNum" type="number" domain={['dataMin', 'dataMax']} tickFormatter={tickFormatter} stroke="var(--muted-alt)" tick={{ fontSize: 10 }} />
                        <YAxis stroke="var(--muted-alt)" tick={{ fontSize: 10 }} domain={[90, 100]} />
                        <Tooltip labelFormatter={dateFormatter} contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="oxygen_saturation" stroke="#22c55e" name="SpO2 %" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Weight */}
                  <div className="bg-muted/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-card-alt mb-3 flex items-center gap-1.5">
                      <Weight className="w-4 h-4 text-purple-500" /> Weight
                    </h4>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="dateNum" type="number" domain={['dataMin', 'dataMax']} tickFormatter={tickFormatter} stroke="var(--muted-alt)" tick={{ fontSize: 10 }} />
                        <YAxis stroke="var(--muted-alt)" tick={{ fontSize: 10 }} />
                        <Tooltip labelFormatter={dateFormatter} contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="weight" stroke="#8b5cf6" name="Weight (kg)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History tab — GitHub commit timeline style */}
          {tab === 'history' && (
            <div>
              {/* Current visit marker */}
              <div className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-success ring-4 ring-success/20 shrink-0 mt-1" />
                  {(prescHistory.length > 0) && <div className="w-0.5 flex-1 bg-border" />}
                </div>
                <div className="pb-6 flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-success">Today</span>
                    <span className="text-xs text-muted-alt">· Current visit</span>
                  </div>
                  <p className="text-sm text-card-alt">{appointment?.appointment.symptom_name || appointment?.appointment.symptom_text || 'No symptoms'}</p>
                  {appointment?.appointment.complaints && (
                    <p className="text-xs text-muted-alt mt-0.5">{appointment.appointment.complaints}</p>
                  )}
                </div>
              </div>

              {/* Past visits timeline */}
              {prescHistory.length > 0 ? prescHistory.map((p, i) => (
                <div key={i} className="relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-primary/10 shrink-0 mt-1" />
                    {i < prescHistory.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
                  </div>
                  <div className="pb-6 flex-1 min-w-0">
                    {/* Date + diagnosis header — clickable to expand */}
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => setExpandedVisits(prev => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        return next;
                      })}
                    >
                      <ChevronRight className="w-4 h-4 text-muted-alt" style={{ transition: 'transform 300ms ease', transform: expandedVisits.has(i) ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                      <span className="text-sm font-semibold text-primary">
                        {new Date(p.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-sm text-muted-alt">·</span>
                      <span className="text-sm text-card-alt font-medium">{p.final_diagnosis || p.provisional_diagnosis}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewingPrescription(p); }}
                        className="text-xs font-medium px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                      >
                        View Prescription
                      </button>
                    </div>

                    {/* Collapsible content */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateRows: expandedVisits.has(i) ? '1fr' : '0fr',
                        transition: 'grid-template-rows 300ms ease-in-out',
                      }}
                    >
                    <div style={{ overflow: 'hidden' }}>
                    <div className="bg-muted/20 rounded-md px-4 py-3 text-sm mt-2">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        {p.symptom_text && (
                          <div className="flex gap-2">
                            <span className="text-muted-alt shrink-0">Symptoms:</span>
                            <span className="text-card-alt">{p.symptom_text}</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <span className="text-muted-alt shrink-0">Complaint:</span>
                          <ul className="text-card-alt space-y-0.5">
                            {parseChiefComplaint(p.chief_complain).map((c, j) => (
                              <li key={j}>{c}</li>
                            ))}
                          </ul>
                        </div>
                        {p.significant_medical_history && (
                          <div className="flex gap-2">
                            <span className="text-muted-alt shrink-0">History:</span>
                            <span className="text-card-alt">{p.significant_medical_history}</span>
                          </div>
                        )}
                        {p.medications && p.medications.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-alt shrink-0">Meds:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {p.medications.map((m, j) => (
                                <span key={j} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">{m.medicine_name}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-center text-muted-alt py-4">No previous visit records</p>
              )}
            </div>
          )}
          </>)}

          {tab === 'prescriptions' && (
            <div className="space-y-3">
              {prescHistory.length === 0 ? (
                <p className="text-center text-muted-alt py-4">No prescriptions found</p>
              ) : prescHistory.map((p, i) => (
                <div key={i} className="border border-border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedVisits(prev => {
                      const next = new Set(prev);
                      if (next.has(i + 1000)) next.delete(i + 1000); else next.add(i + 1000);
                      return next;
                    })}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-primary">
                        {new Date(p.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-sm text-card-alt">{p.final_diagnosis || p.provisional_diagnosis || 'No diagnosis'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-alt">{p.medications?.length || 0} meds</span>
                      <ChevronRight className="w-4 h-4 text-muted-alt" style={{ transition: 'transform 200ms', transform: expandedVisits.has(i + 1000) ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                    </div>
                  </button>
                  {expandedVisits.has(i + 1000) && (
                    <div className="px-4 pb-3 space-y-2 border-t border-border pt-2">
                      <div className="text-xs text-muted-alt">
                        Dr. {`${p.doctor_first_name} ${p.doctor_last_name}`.replace(/^(Dr\.?\s*|Doctor\s+)/i, '')} · {p.clinic_name}
                      </div>
                      {p.chief_complain && (
                        <div className="text-sm">
                          <span className="text-muted-alt">Complaint:</span>
                          <ul className="mt-0.5 space-y-0.5 ml-4">
                            {parseChiefComplaint(p.chief_complain).map((c, j) => (
                              <li key={j} className="text-card-alt list-disc">{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {p.provisional_diagnosis && <p className="text-sm text-card-alt"><span className="text-muted-alt">Provisional:</span> {p.provisional_diagnosis}</p>}
                      {p.final_diagnosis && <p className="text-sm text-card-alt"><span className="text-muted-alt">Final Diagnosis:</span> {p.final_diagnosis}</p>}
                      {p.medications && p.medications.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-alt mb-1">Medications</p>
                          <div className="space-y-1">
                            {p.medications.map((m: any, j: number) => (
                              <div key={j} className="flex items-center justify-between text-xs bg-muted/20 rounded px-2 py-1.5">
                                <span className="text-card-alt font-medium">{m.medicine_name}</span>
                                <span className="text-muted-alt">{m.dosage}x{m.frequency}/day · {m.duration_days} days</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => window.open(`/print/${p.prescription_id}`, '_blank')}
                        className="text-xs font-medium text-primary hover:underline mt-1"
                      >
                        View Full Prescription →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
      </div>
    </Modal>

    {viewingPrescription && (
      <PrescriptionDetailModal
        prescription={viewingPrescription}
        onClose={() => setViewingPrescription(null)}
      />
    )}
    </>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/appointments',
  app: 'doctor',
  title: 'Patient Overview Modal',
  elements: {
    overviewBtn: { testId: 'appt-overview-btn' },
    modalContent: { testId: 'overview-modal-content' },
    vitalsTab: { testId: 'overview-tab-vitals' },
    historyTab: { testId: 'overview-tab-history' },
    prescriptionsTab: { testId: 'overview-tab-prescriptions' },
    bpChart: { text: 'Blood Pressure' },
    heartRateChart: { text: 'Heart Rate' },
    oxygenChart: { text: 'Oxygen Saturation' },
    weightChart: { text: 'Weight' },
    todayMarker: { text: 'Today' },
    viewPrescriptionBtn: { text: 'View Prescription' },
    noVitalsMsg: { text: 'No vitals history available' },
    noPastVisitsMsg: { text: 'No previous visit records' },
    noPrescriptionsMsg: { text: 'No prescriptions found' },
    selectDatesButton: { text: 'Select dates' },
    thirtyDaysQuickBtn: { role: 'button', name: '30 days' },
    patientName: { testId: 'appt-patient-name' },
  },
  flows: [
    {
      name: 'open overview modal',
      steps: [
        { do: 'click', on: 'selectDatesButton' },
        { do: 'click', on: 'thirtyDaysQuickBtn' },
        { do: 'waitFor', on: 'patientName' },
        { do: 'click', on: 'overviewBtn' },
        { do: 'waitFor', on: 'modalContent' },
        { expect: 'visible', on: 'modalContent' },
        { expect: 'visible', on: 'vitalsTab' },
        { expect: 'visible', on: 'historyTab' },
        { expect: 'visible', on: 'prescriptionsTab' },
      ],
    },
    {
      name: 'switch to medical history tab',
      after: 'open overview modal',
      steps: [
        { do: 'click', on: 'historyTab' },
        { expect: 'visible', on: 'todayMarker' },
      ],
    },
    {
      name: 'switch to prescriptions tab',
      after: 'open overview modal',
      steps: [
        { do: 'click', on: 'prescriptionsTab' },
      ],
    },
    {
      name: 'switch back to vitals tab from history',
      after: 'open overview modal',
      steps: [
        { do: 'click', on: 'historyTab' },
        { expect: 'visible', on: 'todayMarker' },
        { do: 'click', on: 'vitalsTab' },
      ],
    },
  ],
});
