'use client';

import { useState, useEffect, use } from 'react';
import { PrescriptionPrint, type PrescriptionPrintData } from '@swasthyaseva/ui';
import { getFullAppointment, getDoctorProfile } from '../../../lib/api';

type FD = { patientParticulars?: { attendantName?: string; attendantRelationship?: string }; [k: string]: unknown };

const FORMAT_OPTS: Record<string, { showWaist: boolean; showSurgical: boolean; showDrawing: boolean }> = {
  GEN_MED: { showWaist: true, showSurgical: false, showDrawing: true },
  GEN_SURG: { showWaist: true, showSurgical: true, showDrawing: false },
  ENT: { showWaist: false, showSurgical: true, showDrawing: false },
};

export default function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const appointmentId = Number(id);
  const [data, setData] = useState<PrescriptionPrintData | null>(null);
  const [format, setFormat] = useState('GEN_MED');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [appt, { profile }] = await Promise.all([
          getFullAppointment(appointmentId),
          getDoctorProfile(),
        ]);

        const presc = appt.prescription;
        const fd = (presc?.format_data || {}) as FD;
        const fmt = profile.prescription_format || 'GEN_MED';
        setFormat(fmt);

        setData({
          doctor: appt.doctor || {
            name: `Dr. ${profile.first_name} ${profile.last_name}`,
            baseDegreeCode: profile.base_degree_name || '',
            licenseNo: profile.license_no,
            phone: profile.phone,
            signatureLink: profile.signature_link,
          },
          clinic: appt.clinic || { name: '', address: '', phone: '' },
          patient: {
            name: appt.appointment.patient_name || '',
            gender: appt.appointment.gender || '',
            dob: appt.appointment.dob,
            phone: appt.appointment.patient_phone,
            address: appt.appointment.patient_address,
            occupation: appt.appointment.patient_occupation,
            attendantName: fd.patientParticulars?.attendantName || appt.appointment.patient_attendant_name,
            attendantRelationship: fd.patientParticulars?.attendantRelationship || appt.appointment.patient_attendant_relationship,
          },
          appointment: {
            date: appt.appointment.appointment_date,
            slotStart: appt.appointment.slot_start,
            slotEnd: appt.appointment.slot_end,
          },
          prescription: {
            chiefComplain: presc?.chief_complain || '',
            provisionalDiagnosis: presc?.provisional_diagnosis || '',
            finalDiagnosis: presc?.final_diagnosis,
            prognosis: presc?.prognosis,
            significantMedicalHistory: presc?.significant_medical_history,
            otherFindings: presc?.other_findings,
            investigationsSuggested: presc?.investigations_suggested,
            surgicalInterventionSuggested: presc?.surgical_intervention_suggested,
            duration: presc?.duration || 0,
            refills: presc?.refills || 0,
            formatData: (presc?.format_data || {}) as Record<string, unknown>,
          },
          medications: appt.medications,
          examination: appt.examination,
          testRequests: appt.testRequests.map(t => ({ request_id: t.request_id, test_name: t.test_name })),
        });
      } catch (err) {
        console.error('Failed to load prescription:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [appointmentId]);

  useEffect(() => {
    if (data && !loading) {
      document.title = 'Prescription';
      setTimeout(() => window.print(), 500);
    }
  }, [data, loading]);

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading prescription...</div>;
  if (!data) return <div className="flex items-center justify-center h-screen text-red-500">Failed to load prescription</div>;

  const opts = FORMAT_OPTS[format] || FORMAT_OPTS.GEN_MED;

  return (
    <div className="min-h-screen bg-white">
      <style>{`@media print { @page { size: A4 portrait; margin: 10mm; } }`}</style>
      <div className="max-w-3xl mx-auto p-6 print:p-0">
        <PrescriptionPrint data={data} opts={opts} />
      </div>
    </div>
  );
}
