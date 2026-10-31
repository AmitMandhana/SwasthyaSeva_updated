export interface PatientIdentifiers {
  name: string;
  age: string;
  sex: string;
  occupation: string;
  attendantName: string;
  attendantRelationship: string;
  phone: string;
  address: string;
}

export interface PatientVitals {
  height: string;
  weight: string;
  bmi: string;
  systolic: string;
  diastolic: string;
  heartRate: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  temperature: string;
  waistCircumference: string;
}

export interface VitalsRatings {
  height: string;
  weight: string;
  bmi: string;
  waist: string;
  bp: string;
  hr: string;
  temperature: string;
  spo2: string;
}

export interface MedicalHistory {
  historyOfPastIllness: string;
  chronicConditions: string;
  historyOfAllergy: string;
  otherSignificantHistory: string;
  menstrualHistory: string;
}

export interface Symptoms {
  symptoms: string;
  signs: string;
}

export interface DoctorCorner {
  signsFoundOnExamination: string;
}

export interface Diagnosis {
  chiefComplaint: string;
  provisionalDiagnosis: string;
  investigationsSuggested: string;
  surgicalInterventionSuggested: string;
  finalDiagnosis: string;
  prognosis: string;
  otherInterventionSuggested: string;
  advice: string;
  followUpDate: string;
  referralType: 'referred' | 'admitted' | '';
  referralTo: string;
  duration: string;
  refills: string;
}

export interface Medication {
  medicationId?: number;
  medication: string;
  medicationType: string;
  route: string;
  amount: string;
  frequency: string;
  timings: string;
  conditional: string;
  duration: string;
  specialInstructions: string;
}

export interface ChronicConditionHistory {
  timestamp: string;
  chronic_conditions: string[];
}

export interface AllergicConditionHistory {
  timestamp: string;
  allergic_conditions: string[];
}

export interface FormatData {
  anthropometryRatings?: Partial<VitalsRatings>;
  vitalsRatings?: Partial<VitalsRatings>;
  patientParticulars?: {
    attendantName?: string;
    attendantRelationship?: string;
  };
  patientSnapshot?: {
    name?: string;
    age?: string;
    sex?: string;
    phone?: string;
    address?: string;
    occupation?: string;
    attendantName?: string;
    attendantRelationship?: string;
  };
  medicalHistory?: {
    allergyHistory?: string;
    chronicConditions?: string;
    otherSignificantHistory?: string;
    menstrualHistory?: string;
  };
  treatment?: {
    otherInterventionSuggested?: string;
    advice?: string;
  };
  followUpDate?: string;
  drawingUrl?: string;
  referralType?: string;
  referralTo?: string;
}

export interface DoctorInterfaceData {
  patientIdentifiers: PatientIdentifiers;
  patientVitals: PatientVitals;
  medicalHistory: MedicalHistory;
  symptoms: Symptoms;
  doctorCorner: DoctorCorner;
  diagnosis: Diagnosis;
  medications: Medication[];
  formatData: FormatData;
}
