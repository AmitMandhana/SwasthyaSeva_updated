"use client";

import React from "react";
import { ExternalLink } from "lucide-react";

export interface PrescriptionPrintData {
  doctor: { name: string; baseDegreeCode: string; licenseNo: string; phone?: string | null; signatureLink?: string | null };
  clinic: { name: string; address: string; phone: string };
  patient: { name: string; gender: string; dob?: string | null; phone?: string | null; address?: string | null; city?: string | null; occupation?: string | null; attendantName?: string | null; attendantRelationship?: string | null };
  appointment: { date: string; slotStart?: number | null; slotEnd?: number | null };
  prescription: {
    chiefComplain: string;
    provisionalDiagnosis: string;
    finalDiagnosis?: string | null;
    prognosis?: string | null;
    significantMedicalHistory?: string | null;
    otherFindings?: string | null;
    investigationsSuggested?: string | null;
    surgicalInterventionSuggested?: string | null;
    duration: number;
    refills: number;
    formatData: Record<string, unknown>;
  };
  medications: Array<{ medication_id: number; medication_type: string; medicine_name: string; amount: number; frequency: number; route: string; duration_days: number; special_instructions?: string | null; timings?: string | null; conditional_instructions?: string | null }>;
  examination: { height?: number | null; weight?: number | null; sp_systolic?: number | null; bp_diastolic?: number | null; heart_rate?: number | null; temperature?: number | null; oxygen_saturation?: number | null; waist_circumference?: number | null } | null;
  testRequests: Array<{ request_id: number; test_name: string; test_date?: string | null; test_report_link?: string | null }>;
  watermarkUrl?: string | null;
}

interface SpecialtyOptions {
  showWaist: boolean;
  showSurgical: boolean;
  showDrawing: boolean;
}

function fmtSlotTime(slot: number): string {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? '00' : '30';
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

export function PrescriptionPrint({ data, opts }: { data: PrescriptionPrintData; opts: SpecialtyOptions }) {
  const { doctor, clinic, appointment, prescription: presc, medications, examination: exam, testRequests } = data;
  const fd = (presc.formatData || {}) as Record<string, Record<string, string> | string | undefined>;
  const snap = (fd.patientSnapshot || {}) as Record<string, string>;
  const patient = {
    name: snap.name || data.patient.name,
    gender: snap.sex || data.patient.gender,
    dob: data.patient.dob,
    phone: snap.phone || data.patient.phone,
    address: snap.address || data.patient.address,
    city: data.patient.city,
    occupation: snap.occupation || data.patient.occupation,
    attendantName: snap.attendantName || data.patient.attendantName,
    attendantRelationship: snap.attendantRelationship || data.patient.attendantRelationship,
    age: snap.age,
  };
  const ar = (fd.anthropometryRatings || {}) as Record<string, string>;
  const vr = (fd.vitalsRatings || {}) as Record<string, string>;
  const mh = (fd.medicalHistory || {}) as Record<string, string>;
  const tx = (fd.treatment || {}) as Record<string, string>;

  const hasAnthro = exam && (exam.height != null || exam.weight != null);
  const hasVitals = exam && (exam.sp_systolic || exam.heart_rate || exam.temperature || exam.oxygen_saturation);

  function splitList(raw: string): string[] {
    if (!raw) return [];
    return raw.includes('|||') ? raw.split('|||').filter(Boolean) : [raw.trim()];
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

  const apptDate = new Date(appointment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const apptTime = appointment.slotStart != null ? `${fmtSlotTime(appointment.slotStart)} – ${fmtSlotTime(appointment.slotEnd!)}` : null;
  const clinicAddrParts = clinic.address.split(', ');

  return (
    <div className="relative" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      {data.watermarkUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
          <img src={data.watermarkUrl} alt="" className="w-72 h-72 object-contain opacity-[0.06]" />
        </div>
      )}
    <div className="relative space-y-5 bg-white text-black print:bg-white print:text-black" style={{ zIndex: 1 }}>
        <div className="text-center border-b border-black/20 pb-3">
          <h1 className="text-lg font-bold">Prescription</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm border-b border-black/20 pb-4">
          <div>
            <p data-testid="rx-doctor-name" className="font-semibold text-base">{doctor.name}</p>
            <p className="text-gray-600">{doctor.baseDegreeCode}</p>
            <p className="text-gray-600">Reg. No: {doctor.licenseNo}</p>
            {doctor.phone && <p className="text-gray-600">Ph: {doctor.phone}</p>}
          </div>
          <div className="text-right">
            <p data-testid="clinic-section-heading" className="font-semibold text-base">{clinic.name}</p>
            <p className="text-gray-600">{clinicAddrParts.slice(0, 2).join(', ')}</p>
            <p className="text-gray-600">{clinicAddrParts.slice(2).join(', ')}</p>
            <p className="text-gray-600">{clinic.phone}</p>
          </div>
        </div>

        <div className="border border-black/20 rounded p-3 text-sm">
          <div className="grid grid-cols-4 gap-x-4 gap-y-1">
            <p><span className="font-medium">Name:</span> {patient.name}</p>
            <p><span className="font-medium">Gender:</span> {patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '-'}</p>
            {(patient.age || patient.dob) && <p><span className="font-medium">Age:</span> {patient.age || Math.floor((Date.now() - new Date(patient.dob!).getTime()) / 31557600000)} years</p>}
            {patient.phone && <p className="whitespace-nowrap"><span className="font-medium">Phone:</span> {patient.phone}</p>}
            {(patient.address || patient.city) && <p className="col-span-2"><span className="font-medium">Address:</span> {[patient.address, patient.city].filter(Boolean).join(', ')}</p>}
            {patient.occupation && <p><span className="font-medium">Occupation:</span> {patient.occupation}</p>}
            {patient.attendantName && <p><span className="font-medium">Attendant:</span> {patient.attendantName}</p>}
            {patient.attendantRelationship && <p><span className="font-medium">Relationship:</span> {patient.attendantRelationship}</p>}
            <p><span className="font-medium">Date:</span> {apptDate}</p>
            {apptTime && <p className="whitespace-nowrap"><span className="font-medium">Time:</span> {apptTime}</p>}
          </div>
        </div>

        <div className="grid grid-cols-[2fr_5fr] text-sm">
          <div className="space-y-4 border-r border-black/20 pr-6">
            {hasAnthro && (
              <div>
                <h3 className="font-semibold mb-1.5">Anthropometry</h3>
                <div className="space-y-1 text-gray-700">
                  {exam.height != null && <p>Height: {exam.height} cm {ar.height ? `(${ar.height})` : ''}</p>}
                  {exam.weight != null && <p>Weight: {exam.weight} kg {ar.weight ? `(${ar.weight})` : ''}</p>}
                  {exam.height && exam.weight && <p>BMI: {(exam.weight / ((exam.height / 100) ** 2)).toFixed(1)} {ar.bmi ? `(${ar.bmi})` : ''}</p>}
                  {opts.showWaist && exam.waist_circumference != null && <p>Waist: {exam.waist_circumference} cm {ar.waist ? `(${ar.waist})` : ''}</p>}
                </div>
              </div>
            )}
            {hasVitals && (
              <div>
                <h3 className="font-semibold mb-1.5">Vitals</h3>
                <div className="space-y-1 text-gray-700">
                  {exam.sp_systolic && <p>BP: {exam.sp_systolic}/{exam.bp_diastolic} mmHg {vr.bp ? `(${vr.bp})` : ''}</p>}
                  {exam.heart_rate && <p>Heart Rate: {exam.heart_rate} bpm {vr.hr ? `(${vr.hr})` : ''}</p>}
                  {exam.temperature && <p>Temp: {exam.temperature} °F {vr.temperature ? `(${vr.temperature})` : ''}</p>}
                  {exam.oxygen_saturation && <p>SpO₂: {exam.oxygen_saturation}% {vr.spo2 ? `(${vr.spo2})` : ''}</p>}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3 pl-6">
            <div>
              <span className="font-semibold">Chief Complaint</span>
              <div className="text-gray-700 mt-0.5 space-y-0.5">
                {parseChiefComplaint(presc.chiefComplain).map((c, i) => (
                  <p key={i}>{i + 1}. {c}</p>
                ))}
              </div>
            </div>
            {presc.significantMedicalHistory && (
              <div>
                <span className="font-semibold">Medical History</span>
                <p className="text-gray-700 mt-0.5">{presc.significantMedicalHistory}</p>
              </div>
            )}
            {(mh.otherSignificantHistory || mh.menstrualHistory) && (
              <div className="space-y-1 text-gray-700">
                {mh.otherSignificantHistory && <p><span className="font-medium">Other History:</span> {mh.otherSignificantHistory}</p>}
                {mh.menstrualHistory && <p><span className="font-medium">Menstrual History:</span> {mh.menstrualHistory}</p>}
              </div>
            )}
            {presc.otherFindings && (
              <div>
                <span className="font-semibold">Findings on Examination</span>
                <div className="text-gray-700 mt-0.5 space-y-0.5">
                  {splitList(presc.otherFindings).map((f, i) => <p key={i}>{i + 1}. {f}</p>)}
                </div>
              </div>
            )}
            <div>
              <span className="font-semibold">Diagnosis</span>
              <div className="space-y-1 mt-0.5 text-gray-700">
                <p><span className="font-medium">Provisional:</span> {presc.provisionalDiagnosis}</p>
                {presc.finalDiagnosis && <p><span className="font-medium">Final:</span> {presc.finalDiagnosis}</p>}
                {presc.prognosis && <p><span className="font-medium">Prognosis:</span> {presc.prognosis}</p>}
                {presc.investigationsSuggested && (
                  <div>
                    <span className="font-medium">Investigations:</span>
                    <ul className="ml-4 mt-0.5 space-y-0.5">{splitList(presc.investigationsSuggested).map((inv, i) => <li key={i}>• {inv}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Treatment</h3>
          {medications.length > 0 && <h4 className="text-sm font-medium mb-2">Medications</h4>}
          <div className="grid grid-cols-[2fr_5fr] text-sm">
            <div className="space-y-2 border-r border-black/20 pr-6">
              {medications.map((m, i) => {
                const type = m.medication_type ? m.medication_type.charAt(0).toUpperCase() + m.medication_type.slice(1).replace(/_/g, ' ') : 'Tab';
                const route = m.route && m.route !== 'oral' ? ` ${m.route.replace(/_/g, ' ')}` : '';
                const parts = [type, m.medicine_name, m.amount ? `${m.amount}` : '', m.frequency ? `${m.frequency}` : '', m.timings || '', m.conditional_instructions || ''].filter(Boolean).join(' ');
                const line = parts + route + (m.duration_days ? ` for ${m.duration_days} days` : '');
                return (
                <div key={m.medication_id} className="bg-gray-50 rounded p-3 border border-gray-200">
                  <p className="font-medium">{i + 1}. {line}</p>
                  {m.special_instructions && <p className="text-gray-500 mt-0.5">Instructions: {m.special_instructions}</p>}
                </div>
                );
              })}
            </div>
            <div className="space-y-3 pl-6">
              {opts.showSurgical && presc.surgicalInterventionSuggested && (
                <div>
                  <span className="font-semibold">Surgical Intervention</span>
                  <ul className="text-gray-700 mt-0.5 space-y-0.5">{splitList(presc.surgicalInterventionSuggested).map((s, i) => <li key={i}>• {s}</li>)}</ul>
                </div>
              )}
              {tx.otherInterventionSuggested && (
                <div>
                  <span className="font-semibold">Other Intervention</span>
                  <ul className="text-gray-700 mt-0.5 space-y-0.5">{splitList(tx.otherInterventionSuggested).map((o, i) => <li key={i}>• {o}</li>)}</ul>
                </div>
              )}
              {tx.advice && (
                <div>
                  <span className="font-semibold">Advice</span>
                  <p className="text-gray-700 mt-0.5">{tx.advice}</p>
                </div>
              )}
              {(fd.referralType as string) && (
                <div>
                  <span className="font-semibold">{(fd.referralType as string) === 'admitted' ? 'Admitted to' : 'Referred to'}</span>
                  <p className="text-gray-700 mt-0.5">{(fd.referralTo as string) || '—'}</p>
                </div>
              )}
              {testRequests.length > 0 && (
                <div>
                  <span className="font-semibold">Lab Tests</span>
                  <div className="space-y-1 mt-1">
                    {testRequests.map((t) => (
                      <div key={t.request_id} className="flex items-center justify-between bg-gray-50 rounded p-2 border border-gray-200">
                        <span>{t.test_name}</span>
                        <div className="flex items-center gap-2">
                          {t.test_date && <span className="text-gray-500 text-xs">{t.test_date}</span>}
                          {t.test_report_link && (
                            <a href={t.test_report_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-xs">
                              Report <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {opts.showDrawing && (fd.drawingUrl as string) && (
          <div>
            <h3 className="font-semibold mb-2">Clinical Drawing</h3>
            <img src={fd.drawingUrl as string} alt="Clinical drawing" className="max-w-full rounded border border-gray-200" />
          </div>
        )}

        <div className="flex items-end justify-between pt-4 border-t border-black/20" data-testid="prescription-duration-info">
          <div className="text-sm space-y-1">
            {(fd.followUpDate as string) && (
              <p><span className="font-medium">Follow-up:</span> {fd.followUpDate as string}</p>
            )}
            <p className="text-xs text-gray-500">Duration: {presc.duration} days | Refills: {presc.refills}</p>
          </div>
          <div className="text-right">
            {doctor.signatureLink && <img src={doctor.signatureLink} alt="Doctor signature" className="inline-block max-h-16" />}
            <p className="text-sm text-gray-500 mt-1">{doctor.name}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
