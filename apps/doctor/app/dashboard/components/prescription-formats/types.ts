import { type Medication, type TestRequest } from '../../../../lib/api';

export type FormatData = {
  patient: { name: string; age: string; sex: string; phone?: string; address?: string; occupation?: string; attendantName?: string; attendantRelationship?: string };
  vitals: {
    systolic: string; diastolic: string; heartRate: string;
    oxygenSaturation: string; height: string; weight: string; bmi: string;
    temperature: string; waistCircumference: string;
  };
  diagnosis: {
    chiefComplaint: string; provisionalDiagnosis: string; finalDiagnosis: string;
    surgicalInterventionSuggested: string; investigationsSuggested: string;
    duration: string; refills: string;
  };
  medications: Medication[];
  testRequests: TestRequest[];
  formatData: {
    anthropometryRatings?: Record<string, string>;
    vitalsRatings?: Record<string, string>;
    medicalHistory?: Record<string, string>;
    treatment?: Record<string, string>;
    followUpDate?: string;
    drawingUrl?: string;
  };
  doctor?: { name: string; baseDegreeCode: string; licenseNo: string; phone: string; signatureLink: string | null };
  clinic?: { name: string; address: string; phone: string };
  appointmentDate?: string;
};

export type PrescriptionHtmlGenerator = (data: FormatData) => string;
