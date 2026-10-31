import React from 'react';
import { PrescriptionPrint, type PrescriptionPrintData } from '@swasthyaseva/ui';
import type { FullPrescription } from '../../../../../lib/patientApi';
import { componentTestSpec } from '@swasthyaseva/test-gen';

function toSharedData(data: FullPrescription): PrescriptionPrintData {
  return {
    doctor: data.doctor,
    clinic: data.clinic,
    patient: data.patient,
    appointment: data.appointment,
    prescription: {
      chiefComplain: data.prescription.chiefComplain,
      provisionalDiagnosis: data.prescription.provisionalDiagnosis,
      finalDiagnosis: data.prescription.finalDiagnosis,
      prognosis: data.prescription.prognosis,
      significantMedicalHistory: data.prescription.significantMedicalHistory,
      otherFindings: data.prescription.otherFindings,
      investigationsSuggested: data.prescription.investigationsSuggested,
      surgicalInterventionSuggested: data.prescription.surgicalInterventionSuggested,
      duration: data.prescription.duration,
      refills: data.prescription.refills,
      formatData: data.prescription.formatData as Record<string, unknown>,
    },
    medications: data.medications,
    examination: data.examination,
    testRequests: data.testRequests,
    watermarkUrl: data.watermarkUrl,
  };
}

export function SpecialtyFormatBase({ data, opts }: { data: FullPrescription; opts: { showWaist: boolean; showSurgical: boolean; showDrawing: boolean } }) {
  return <PrescriptionPrint data={toSharedData(data)} opts={opts} />;
}

export default function GenMedFormat({ data }: { data: FullPrescription }) {
  return <SpecialtyFormatBase data={data} opts={{ showWaist: true, showSurgical: false, showDrawing: true }} />;
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/prescriptions/999',
  app: 'web',
  title: 'General Medicine Prescription Format',
  elements: {
    formatHeading: { role: 'heading', name: 'Prescription' },
    doctorSection: { testId: 'rx-doctor-name' },
    clinicSection: { testId: 'clinic-section-heading' },
    diagnosisSection: { text: 'Diagnosis' },
    chiefComplaint: { text: 'Chief Complaint' },
    provisionalDiagnosis: { text: 'Provisional:' },
    treatmentSection: { text: 'Treatment' },
    anthropometrySection: { text: 'Anthropometry' },
    vitalsSection: { text: 'Vitals' },
    durationInfo: { testId: 'prescription-duration-info' },
  },
  flows: [
    {
      name: 'verify general medicine format sections are visible',
      steps: [
        { do: 'waitFor', on: 'formatHeading' },
        { expect: 'visible', on: 'formatHeading' },
        { expect: 'visible', on: 'doctorSection' },
        { expect: 'visible', on: 'clinicSection' },
        { expect: 'visible', on: 'diagnosisSection' },
        { expect: 'visible', on: 'chiefComplaint' },
        { expect: 'visible', on: 'provisionalDiagnosis' },
        { expect: 'visible', on: 'treatmentSection' },
        { expect: 'visible', on: 'anthropometrySection' },
        { expect: 'visible', on: 'vitalsSection' },
        { expect: 'visible', on: 'durationInfo' },
      ],
    },
  ],
});
