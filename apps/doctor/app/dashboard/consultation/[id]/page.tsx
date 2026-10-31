'use client';

import React, { useState, useEffect, useCallback, use, useRef } from 'react';
import { Loader2, X, Lock, Pill } from 'lucide-react';
import { ConfirmModal, useToast, useAnalytics } from '@swasthyaseva/ui';
import PatientIdentifiers from '../../components/PatientIdentifiers';
import PatientVitals from '../../components/PatientVitals';
import MedicalHistory from '../../components/MedicalHistory';
import DiagnosisSection from '../../components/DiagnosisSection';
import Medications from '../../components/Medications';
import { DoctorInterfaceData } from '../../types';
import PrintPrescription from '../../components/PrintPrescription';
import ClinicalDiagnosticWorkup from '../../components/ClinicalDiagnosticWorkup';
import DrawingCanvas, { type DrawingCanvasHandle } from '../../components/DrawingCanvas';
import InterventionList from '../../components/InterventionList';
import type { VitalsRatings, FormatData } from '../../types';
import { getFullAppointment, savePrescription as savePrescriptionApi, resetPrescription as resetPrescriptionApi, completeAppointment, getDoctorProfile, type FullAppointmentData } from '../../../../lib/api';

export default function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const appointmentId = Number(id);
  const { addToast } = useToast();
  const { trackEvent } = useAnalytics();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [appointmentData, setAppointmentData] = useState<FullAppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [formKey, setFormKey] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prescriptionFormat, setPrescriptionFormat] = useState<string | null>(null);
  const drawingCanvasRef = useRef<DrawingCanvasHandle>(null);

  const isCompleted = appointmentData?.appointment.appointment_status === 'completed';
  const readOnly = isCompleted;

  const [isMobile, setIsMobile] = useState(false);
  const [mobileStep, setMobileStep] = useState(1);
  const MOBILE_STEPS = ['Vitals', 'History', 'Symptoms', 'Diagnosis'];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // prescriptionFormat is loaded inside loadAppointment via Promise.all

  const [collapsed, setCollapsed] = useState(() => {
    const mobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return {
      patientInfo: false,
      medicalHistory: mobile,
      diagnosis: mobile,
      treatment: mobile,
      medications: false,
    };
  });

  const toggleSection = (section: 'patientInfo' | 'medicalHistory' | 'diagnosis' | 'treatment' | 'medications') => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const [formData, setFormData] = useState<DoctorInterfaceData>({
    patientIdentifiers: { name: '', age: '', sex: '', occupation: '', attendantName: '', attendantRelationship: '', phone: '', address: '' },
    patientVitals: { height: '', weight: '', bmi: '', systolic: '', diastolic: '', heartRate: '', respiratoryRate: '', oxygenSaturation: '', temperature: '', waistCircumference: '' },
    medicalHistory: { historyOfPastIllness: '', chronicConditions: '', historyOfAllergy: '', otherSignificantHistory: '', menstrualHistory: '' },
    symptoms: { symptoms: '', signs: '' },
    doctorCorner: { signsFoundOnExamination: '' },
    diagnosis: { chiefComplaint: '', provisionalDiagnosis: '', investigationsSuggested: '', surgicalInterventionSuggested: '', finalDiagnosis: '', prognosis: '', otherInterventionSuggested: '', advice: '', followUpDate: '', referralType: '', referralTo: '', duration: '5', refills: '0' },
    medications: [],
    formatData: {},
  });

  const [vitalsRatings, setVitalsRatings] = useState<Partial<VitalsRatings>>({});

  const loadAppointment = useCallback(async () => {
    if (isNaN(appointmentId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [data, profileResult] = await Promise.all([
        getFullAppointment(appointmentId),
        getDoctorProfile().catch(() => ({ profile: { prescription_format: 'GEN_MED' } })),
      ]);
      setPrescriptionFormat(profileResult.profile.prescription_format || 'GEN_MED');
      setAppointmentData(data);
      const presc = data.prescription;
      const exam = data.examination;
      setFormData({
        patientIdentifiers: {
          name: data.appointment.patient_name || '',
          age: data.appointment.dob ? String(Math.floor((Date.now() - new Date(data.appointment.dob).getTime()) / 31557600000)) : '',
          sex: data.appointment.gender ? data.appointment.gender.charAt(0).toUpperCase() + data.appointment.gender.slice(1) : '',
          occupation: data.appointment.patient_occupation || '',
          attendantName: (presc?.format_data as FormatData)?.patientSnapshot?.attendantName ?? (presc?.format_data as FormatData)?.patientParticulars?.attendantName ?? data.appointment.patient_attendant_name ?? '',
          attendantRelationship: (presc?.format_data as FormatData)?.patientSnapshot?.attendantRelationship ?? (presc?.format_data as FormatData)?.patientParticulars?.attendantRelationship ?? data.appointment.patient_attendant_relationship ?? '',
          phone: data.appointment.patient_phone || '',
          address: data.appointment.patient_address || '',
        },
        patientVitals: {
          height: exam?.height?.toString() || '',
          weight: exam?.weight?.toString() || '',
          bmi: exam?.height && exam?.weight && exam.height > 0 ? (exam.weight / ((exam.height / 100) ** 2)).toFixed(2) : '',
          systolic: exam?.sp_systolic?.toString() || '',
          diastolic: exam?.bp_diastolic?.toString() || '',
          heartRate: exam?.heart_rate?.toString() || '',
          respiratoryRate: exam?.respiratory_rate?.toString() || '',
          oxygenSaturation: exam?.oxygen_saturation?.toString() || '',
          temperature: exam?.temperature?.toString() || '',
          waistCircumference: exam?.waist_circumference?.toString() || '',
        },
        medicalHistory: {
          historyOfPastIllness: presc?.significant_medical_history || '',
          chronicConditions: '',
          historyOfAllergy: '',
          otherSignificantHistory: (presc?.format_data as FormatData)?.medicalHistory?.otherSignificantHistory || '',
          menstrualHistory: (presc?.format_data as FormatData)?.medicalHistory?.menstrualHistory || '',
        },
        symptoms: {
          symptoms: data.appointment.symptom_text || '',
          signs: presc?.other_findings || '',
        },
        doctorCorner: {
          signsFoundOnExamination: presc?.other_findings || '',
        },
        diagnosis: {
          chiefComplaint: presc?.chief_complain || '',
          provisionalDiagnosis: presc?.provisional_diagnosis || '',
          investigationsSuggested: presc?.investigations_suggested || '',
          surgicalInterventionSuggested: presc?.surgical_intervention_suggested || '',
          finalDiagnosis: presc?.final_diagnosis || '',
          prognosis: presc?.prognosis || '',
          otherInterventionSuggested: (presc?.format_data as FormatData)?.treatment?.otherInterventionSuggested || '',
          advice: (presc?.format_data as FormatData)?.treatment?.advice || '',
          followUpDate: (presc?.format_data as FormatData)?.followUpDate || '',
          referralType: ((presc?.format_data as FormatData)?.referralType || '') as "" | "referred" | "admitted",
          referralTo: (presc?.format_data as FormatData)?.referralTo || '',
          duration: presc?.duration?.toString() || '5',
          refills: presc?.refills?.toString() || '0',
        },
        medications: data.medications.map(m => ({
          medicationId: m.medication_id,
          medication: m.medicine_name,
          medicationType: m.medication_type || 'tablet',
          route: m.route || 'oral',
          amount: m.amount?.toString() || '',
          frequency: m.frequency?.toString() || '',
          timings: m.timings || '',
          conditional: m.conditional_instructions || '',
          duration: m.duration_days?.toString() || '',
          specialInstructions: m.special_instructions || '',
        })),
        formatData: (presc?.format_data as FormatData) || {},
      });
      if (presc?.format_data) {
        const fd = presc.format_data as FormatData;
        setVitalsRatings({ ...(fd.anthropometryRatings || {}), ...(fd.vitalsRatings || {}) });
      }
      setFormKey(k => k + 1);
    } catch (err) {
      console.error('Failed to load appointment:', err);
      addToast('Failed to load appointment', 'error');
    } finally {
      setLoading(false);
    }
  }, [appointmentId, addToast]);

  useEffect(() => { loadAppointment(); }, [loadAppointment]);

  const handleSave = async () => {
    if (readOnly || saving) return;
    if (!formData.diagnosis.chiefComplaint.trim()) {
      addToast('Chief Complaint is required', 'error');
      return;
    }
    if (!formData.diagnosis.provisionalDiagnosis.trim()) {
      addToast('Provisional Diagnosis is required', 'error');
      return;
    }
    if (formData.diagnosis.duration && Number(formData.diagnosis.duration) < 0) {
      addToast('Duration cannot be negative', 'error');
      return;
    }

    setSaving(true);
    try {
      await drawingCanvasRef.current?.uploadIfDirty();
      const v = formData.patientVitals;
      await savePrescriptionApi({
        appointmentId,
        chiefComplain: formData.diagnosis.chiefComplaint,
        provisionalDiagnosis: formData.diagnosis.provisionalDiagnosis,
        finalDiagnosis: formData.diagnosis.finalDiagnosis || undefined,
        significantMedicalHistory: formData.medicalHistory.historyOfPastIllness || undefined,
        otherFindings: formData.symptoms.signs || undefined,
        surgicalInterventionSuggested: formData.diagnosis.surgicalInterventionSuggested || undefined,
        investigationsSuggested: formData.diagnosis.investigationsSuggested || undefined,
        formatData: {
          anthropometryRatings: { height: vitalsRatings.height, weight: vitalsRatings.weight, bmi: vitalsRatings.bmi, waist: vitalsRatings.waist },
          vitalsRatings: { bp: vitalsRatings.bp, hr: vitalsRatings.hr, temperature: vitalsRatings.temperature, spo2: vitalsRatings.spo2 },
          patientSnapshot: {
            name: formData.patientIdentifiers.name || undefined,
            age: formData.patientIdentifiers.age || undefined,
            sex: formData.patientIdentifiers.sex || undefined,
            phone: formData.patientIdentifiers.phone || undefined,
            address: formData.patientIdentifiers.address || undefined,
            occupation: formData.patientIdentifiers.occupation || undefined,
            attendantName: formData.patientIdentifiers.attendantName || undefined,
            attendantRelationship: formData.patientIdentifiers.attendantRelationship || undefined,
          },
          medicalHistory: {
            otherSignificantHistory: formData.medicalHistory.otherSignificantHistory || undefined,
            menstrualHistory: formData.medicalHistory.menstrualHistory || undefined,
          },
          treatment: {
            otherInterventionSuggested: formData.diagnosis.otherInterventionSuggested || undefined,
            advice: formData.diagnosis.advice || undefined,
          },
          followUpDate: formData.diagnosis.followUpDate || undefined,
          drawingUrl: formData.formatData.drawingUrl || undefined,
          referralType: formData.diagnosis.referralType || undefined,
          referralTo: formData.diagnosis.referralTo || undefined,
        },
        prognosis: formData.diagnosis.prognosis || undefined,
        duration: Number(formData.diagnosis.duration),
        refills: Number(formData.diagnosis.refills) || 0,
        vitals: {
          height: Number(v.height) || undefined,
          weight: Number(v.weight) || undefined,
          spSystolic: Number(v.systolic) || undefined,
          bpDiastolic: Number(v.diastolic) || undefined,
          heartRate: Number(v.heartRate) || undefined,
          respiratoryRate: Number(v.respiratoryRate) || undefined,
          oxygenSaturation: Number(v.oxygenSaturation) || undefined,
          temperature: Number(v.temperature) || undefined,
          waistCircumference: Number(v.waistCircumference) || undefined,
        },
        medications: formData.medications.map(m => ({
          medicationId: m.medicationId,
          medicineName: m.medication,
          medicationType: m.medicationType || 'tablet',
          route: m.route || 'oral',
          amount: Number(m.amount) || 0,
          dosage: Number(m.amount) || 0,
          frequency: Number(m.frequency) || 0,
          durationDays: Number(m.duration) || 0,
          specialInstructions: m.specialInstructions || undefined,
          timings: m.timings || undefined,
          conditionalInstructions: m.conditional || undefined,
        })),
      });

      trackEvent('prescription_saved', { appointmentId });
      addToast('Prescription saved successfully!', 'success');
      await loadAppointment();
      if (appointmentData && appointmentData.appointment.appointment_status !== 'completed') {
        setShowCompleteModal(true);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save prescription', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteConfirm = async () => {
    setShowCompleteModal(false);
    try {
      await completeAppointment(appointmentId);
      trackEvent('appointment_completed', { appointmentId });
      if (appointmentData) {
        setAppointmentData({ ...appointmentData, appointment: { ...appointmentData.appointment, appointment_status: 'completed' } });
      }
      addToast('Appointment marked as completed', 'success');
    } catch (err) {
      addToast('Failed to mark as completed', 'error');
    }
  };

  const confirmReset = async () => {
    if (readOnly) return;
    setShowResetConfirm(false);
    try {
      await resetPrescriptionApi(appointmentId);
      setFormData(prev => ({
        patientIdentifiers: prev.patientIdentifiers,
        patientVitals: { height: '', weight: '', bmi: '', systolic: '', diastolic: '', heartRate: '', respiratoryRate: '', oxygenSaturation: '', temperature: '', waistCircumference: '' },
        medicalHistory: { historyOfPastIllness: '', chronicConditions: '', historyOfAllergy: '', otherSignificantHistory: '', menstrualHistory: '' },
        symptoms: { symptoms: '', signs: '' },
        doctorCorner: { signsFoundOnExamination: '' },
        diagnosis: { chiefComplaint: '', provisionalDiagnosis: '', investigationsSuggested: '', surgicalInterventionSuggested: '', finalDiagnosis: '', prognosis: '', otherInterventionSuggested: '', advice: '', followUpDate: '', referralType: '', referralTo: '', duration: '', refills: '0' },
        medications: [],
        formatData: {},
      }));
      setFormKey(k => k + 1);
      setAppointmentData(prev => prev ? { ...prev, prescription: null, medications: [], examination: null, testRequests: [] } : null);
      addToast('Prescription data cleared', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to reset', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-alt">Loading patient data...</span>
      </div>
    );
  }

  if (!prescriptionFormat) {
    return (
      <div className="text-center py-24">
        <p className="text-destructive text-lg font-semibold mb-2">Prescription format not assigned</p>
        <p className="text-muted-alt">Please contact your administrator to assign a prescription format to your account.</p>
      </div>
    );
  }

  const statusLabel = appointmentData?.appointment.appointment_status?.replace('_', ' ') || '';

  return (
    <div className="bg-background min-h-screen">
      <div className="flex">
        <div className={`flex-1 transition-all duration-300 ease-in-out ${isPanelOpen ? 'mr-80' : 'mr-0'}`}>
          <div className="py-4">
            <div className="px-4 sm:px-6 lg:px-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => window.close()}
                    className="p-1.5 rounded-md text-muted-alt hover:text-card-alt hover:bg-muted/50 transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="h-5 w-px bg-border" />
                  <h1 className="text-lg font-semibold" data-testid={formData.patientIdentifiers.name ? 'patient-name-loaded' : undefined}>
                    {formData.patientIdentifiers.name || appointmentData?.appointment.patient_name || 'Patient'}
                  </h1>
                  <span data-testid="patient-age-sex" className="text-sm text-card-alt font-medium">
                    {formData.patientIdentifiers.age && `${formData.patientIdentifiers.age}y`}
                    {formData.patientIdentifiers.sex && ` · ${formData.patientIdentifiers.sex}`}
                  </span>
                  {(appointmentData?.appointment.symptom_name || appointmentData?.appointment.symptom_text) && (
                    (appointmentData?.appointment.symptom_text || appointmentData?.appointment.symptom_name || '').split('|||').filter(Boolean).map((s, i) => (
                      <span key={i} className="text-sm font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{s.trim()}</span>
                    ))
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {appointmentData?.prescription && (
                    <PrintPrescription formData={formData} appointmentData={appointmentData} prescriptionFormat={prescriptionFormat!} />
                  )}
                  {readOnly && (
                    <span className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 px-3 py-1.5 rounded-full">
                      <Lock className="w-3 h-3" />
                      Read-only · {statusLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Mobile step indicator */}
              {isMobile && !readOnly && (
                <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                  {MOBILE_STEPS.map((label, i) => {
                    const stepNum = i + 1;
                    const isActive = mobileStep === stepNum;
                    const isDone = mobileStep > stepNum;
                    return (
                      <div key={label} className="flex items-center gap-1">
                        {i > 0 && <div className={`h-0.5 w-5 ${isDone ? 'bg-primary' : 'bg-border'}`} />}
                        <button
                          onClick={() => setMobileStep(stepNum)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                            isActive ? 'bg-primary text-primary-alt' :
                            isDone ? 'bg-primary/10 text-primary' :
                            'bg-muted text-muted-alt'
                          }`}
                        >
                          <span>{stepNum}</span>
                          <span>{label}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Form sections */}
              <div key={formKey} className={readOnly ? 'opacity-80 [&_input]:pointer-events-none [&_textarea]:pointer-events-none [&_select]:pointer-events-none' : ''}>
                {/* Step 1: Patient Info + Vitals */}
                <div className={isMobile && !readOnly && mobileStep !== 1 ? 'hidden' : ''}>
                  <div className="grid grid-cols-1 lg:grid-cols-20 gap-4 mb-4">
                    <div className="lg:col-span-7">
                      <PatientIdentifiers
                        data={formData.patientIdentifiers}
                        onChange={(data) => setFormData({ ...formData, patientIdentifiers: data })}
                        isCollapsed={collapsed.patientInfo}
                        onToggle={() => toggleSection('patientInfo')}
                        readOnly={readOnly}
                        prescriptionFormat={prescriptionFormat}
                      />
                    </div>
                    <div className="lg:col-span-13">
                      <PatientVitals
                        data={formData.patientVitals}
                        onChange={(data) => setFormData({ ...formData, patientVitals: data })}
                        isCollapsed={collapsed.patientInfo}
                        onToggle={() => toggleSection('patientInfo')}
                        prescriptionFormat={prescriptionFormat}
                        ratings={vitalsRatings}
                        onRatingsChange={setVitalsRatings}
                      />
                    </div>
                  </div>
                </div>

                {/* Clinical Diagnostic Workup (Chief Complaints) */}
                <div className={isMobile && !readOnly && mobileStep !== 2 ? 'hidden' : ''}>
                  <ClinicalDiagnosticWorkup
                    value={formData.diagnosis.chiefComplaint}
                    onChange={(val) => setFormData({ ...formData, diagnosis: { ...formData.diagnosis, chiefComplaint: val } })}
                    readOnly={readOnly}
                  />
                </div>

                {/* Findings On Examination (left) + Medical History (right) */}
                <div className={isMobile && !readOnly && mobileStep !== 2 && mobileStep !== 3 ? 'hidden' : ''}>
                  <MedicalHistory
                    medicalHistory={formData.medicalHistory}
                    symptoms={formData.symptoms}
                    onMedicalHistoryChange={(data) => setFormData({ ...formData, medicalHistory: data })}
                    onSymptomsChange={(data) => setFormData({ ...formData, symptoms: data })}
                    isCollapsed={collapsed.medicalHistory}
                    onToggle={() => toggleSection('medicalHistory')}
                    onPanelChange={setIsPanelOpen}
                    prescriptionFormat={prescriptionFormat}
                    findingsFirst
                    readOnly={readOnly}
                    patientSex={formData.patientIdentifiers.sex}
                    patientAge={formData.patientIdentifiers.age}
                  />
                </div>

                {/* Diagnosis (left) + Treatment (right) — side by side */}
                <div className={`${isMobile && !readOnly && mobileStep !== 4 ? 'hidden' : ''} grid grid-cols-1 md:grid-cols-2 gap-4 mb-4`}>
                  <DiagnosisSection
                    data={formData.diagnosis}
                    onChange={(data) => setFormData({ ...formData, diagnosis: data })}
                    isCollapsed={collapsed.diagnosis}
                    onToggle={() => toggleSection('diagnosis')}
                    readOnly={readOnly}
                  />
                  <section className="bg-card p-6 rounded-lg border border-border">
                    <div data-testid="treatment-section-toggle" className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => toggleSection('treatment')}>
                      <h2 className="text-2xl font-bold text-card-alt flex items-center gap-2"><Pill className="w-6 h-6 text-primary" /> Treatment</h2>
                      <button type="button" aria-expanded={!collapsed.treatment} className="text-card-alt hover:text-card-alt transition-colors">
                        <span className={`transform transition-transform duration-200 inline-block ${collapsed.treatment ? '' : 'rotate-90'}`}>▶</span>
                      </button>
                    </div>
                    <div className={`transition-all duration-200 ease-in-out ${collapsed.treatment ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[4000px] opacity-100 overflow-visible'}`}>
                    <div className="space-y-4">
                      <Medications
                        medications={formData.medications}
                        onChange={(medications) => setFormData({ ...formData, medications })}
                        isCollapsed={collapsed.medications}
                        onToggle={() => toggleSection('medications')}
                        readOnly={readOnly}
                      />
                      {(prescriptionFormat === 'GEN_SURG' || prescriptionFormat === 'ENT') && (
                        <div>
                          <label className="block text-sm font-medium text-card-alt mb-2">Surgical Intervention Suggested</label>
                          <InterventionList
                            value={formData.diagnosis.surgicalInterventionSuggested}
                            onChange={(val) => setFormData({ ...formData, diagnosis: { ...formData.diagnosis, surgicalInterventionSuggested: val } })}
                            readOnly={readOnly}
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-card-alt mb-2">Other Intervention Suggested</label>
                        <InterventionList
                          value={formData.diagnosis.otherInterventionSuggested}
                          onChange={(val) => setFormData({ ...formData, diagnosis: { ...formData.diagnosis, otherInterventionSuggested: val } })}
                          readOnly={readOnly}
                        />
                      </div>
                      <div>
                        <label htmlFor="advice" className="block text-sm font-medium text-card-alt mb-2">Advice</label>
                        <textarea id="advice" data-testid="advice-textarea" value={formData.diagnosis.advice} onChange={(e) => setFormData({ ...formData, diagnosis: { ...formData.diagnosis, advice: e.target.value } })} rows={2} className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt" />
                      </div>
                    </div>
                    </div>
                  </section>
                </div>

                {/* Drawing Pad + Duration/Refills/Referred footer */}
                <div className={`${isMobile && !readOnly && mobileStep !== 4 ? 'hidden' : ''} bg-card p-6 rounded-lg border border-border mb-4 space-y-4`}>
                  <DrawingCanvas
                    ref={drawingCanvasRef}
                    drawingUrl={formData.formatData.drawingUrl}
                    onSave={(url) => setFormData(prev => ({ ...prev, formatData: { ...prev.formatData, drawingUrl: url } }))}
                    readOnly={readOnly}
                  />
                  <div className="grid grid-cols-6 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-card-alt mb-2">Duration (days)</label>
                      <input type="number" min="0" data-testid="duration-input" value={formData.diagnosis.duration || ''} onChange={(e) => setFormData({ ...formData, diagnosis: { ...formData.diagnosis, duration: e.target.value } })} className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-card-alt mb-2">Follow-up Date</label>
                      <input type="date" data-testid="followup-date-input" value={formData.diagnosis.followUpDate} onChange={(e) => setFormData({ ...formData, diagnosis: { ...formData.diagnosis, followUpDate: e.target.value } })} className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-card-alt mb-2">Refills</label>
                      <input type="number" min="0" data-testid="refills-input" value={formData.diagnosis.refills || ''} onChange={(e) => setFormData({ ...formData, diagnosis: { ...formData.diagnosis, refills: e.target.value } })} className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-card-alt mb-2">Referred / Admitted to</label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center shrink-0">
                          <button type="button" data-testid="referred-btn" disabled={readOnly} onClick={() => setFormData({ ...formData, diagnosis: { ...formData.diagnosis, referralType: formData.diagnosis.referralType === 'referred' ? '' : 'referred' as '' | 'referred' | 'admitted', referralTo: formData.diagnosis.referralType === 'referred' ? '' : formData.diagnosis.referralTo } })} className={`px-4 py-2 text-sm font-medium rounded-l-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${formData.diagnosis.referralType === 'referred' ? 'bg-primary text-primary-alt border-primary' : 'bg-background text-muted-alt border-border hover:text-card-alt'}`}>Referred</button>
                          <button type="button" data-testid="admitted-btn" disabled={readOnly} onClick={() => setFormData({ ...formData, diagnosis: { ...formData.diagnosis, referralType: formData.diagnosis.referralType === 'admitted' ? '' : 'admitted' as '' | 'referred' | 'admitted', referralTo: formData.diagnosis.referralType === 'admitted' ? '' : formData.diagnosis.referralTo } })} className={`px-4 py-2 text-sm font-medium rounded-r-md border border-l-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${formData.diagnosis.referralType === 'admitted' ? 'bg-warning text-warning-alt border-warning' : 'bg-background text-muted-alt border-border hover:text-card-alt'}`}>Admitted</button>
                        </div>
                        <input type="text" data-testid="diagnosis-referral-input" value={formData.diagnosis.referralTo || ''} onChange={(e) => setFormData({ ...formData, diagnosis: { ...formData.diagnosis, referralTo: e.target.value } })} placeholder={formData.diagnosis.referralType === 'referred' ? 'e.g., Cardiology Dept' : formData.diagnosis.referralType === 'admitted' ? 'e.g., ICU, Ward 3B' : 'Select type first'} className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions — desktop: always show. Mobile: show nav + save on last step */}
                {!readOnly ? (
                  isMobile ? (
                    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 flex gap-3 z-30">
                      {mobileStep > 1 && (
                        <button
                          onClick={() => setMobileStep(s => s - 1)}
                          className="flex-1 bg-muted hover:bg-muted/80 text-card-alt py-2.5 rounded-md font-medium text-sm"
                        >
                          ← Back
                        </button>
                      )}
                      {mobileStep < 4 ? (
                        <button
                          onClick={() => setMobileStep(s => s + 1)}
                          className="flex-1 bg-primary hover:bg-primary/90 text-primary-alt py-2.5 rounded-md font-medium text-sm"
                        >
                          Next →
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowResetConfirm(true)}
                            className="bg-muted hover:bg-muted/80 text-card-alt px-4 py-2.5 rounded-md font-medium text-sm"
                          >
                            Reset
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-success hover:opacity-90 text-success-alt py-2.5 rounded-md font-medium text-sm disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save Prescription'}
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end py-4">
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="bg-muted hover:bg-muted/80 text-card-alt px-4 sm:px-6 py-2.5 rounded-md transition-colors font-medium text-sm"
                      >
                        Reset Prescription
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-success hover:opacity-90 text-success-alt px-4 sm:px-6 py-2.5 rounded-md transition-colors font-medium text-sm disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Prescription'}
                      </button>
                    </div>
                  )
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div
          id="history-panel-container"
          data-testid="history-panel-container"
          className="fixed top-16 right-0 bottom-0 z-40"
        />
      </div>

      {showResetConfirm && (
        <ConfirmModal
          title="Reset Prescription"
          message="Are you sure? This will delete all prescription data for this appointment."
          variant="danger"
          confirmLabel="Reset"
          onConfirm={confirmReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      {showCompleteModal && (
        <ConfirmModal
          title="Mark as Completed"
          message="Prescription saved. Would you like to mark this appointment as completed?"
          variant="info"
          confirmLabel="Yes, Complete"
          onConfirm={handleCompleteConfirm}
          onCancel={() => setShowCompleteModal(false)}
        />
      )}
    </div>
  );
}

import { testSpec } from '@swasthyaseva/test-gen';

export const __test = testSpec({
  route: '/dashboard/consultation/0',
  auth: 'role:doctor',
  app: 'doctor',
  title: 'Consultation Form',
  seedApi: {
    endpoint: '/api/test/create-appointment',
    method: 'POST',
    body: {
      doctor_id: 0,
      user_id: 0,
      slot_id: 0,
      appointment_date: new Date().toISOString().slice(0, 10),
      symptom_code: 'FEVER',
      symptom_text: 'Fever and body ache',
      complaints: 'Test consultation',
    },
    routeParam: 'appointment_id',
    resolveEntities: true,
  },
  elements: {
    // Header
    patientName: { testId: 'patient-name-loaded' },
    readOnlyBadge: { text: /Read-only/ },

    // Patient Particulars section
    patientIdentifiersHeading: { text: 'Patient Particulars' },
    nameInput: { testId: 'patient-name-input' },

    // Patient Vitals section
    patientVitalsHeading: { text: 'Patient Vitals' },
    heightInput: { testId: 'vitals-height' },
    weightInput: { testId: 'vitals-weight' },
    bmiReadonlyInput: { testId: 'vitals-bmi' },
    systolicInput: { testId: 'vitals-systolic' },
    diastolicInput: { testId: 'vitals-diastolic' },
    heartRateInput: { testId: 'vitals-heartrate' },
    oxygenSatInput: { testId: 'vitals-spo2' },
    openTimelineButton: { testId: 'open-timeline-btn' },

    // Vitals Timeline Modal
    vitalsTimelineHeading: { text: 'Vitals Timeline' },
    heartRateTab: { testId: 'vitals-tab-hr' },
    oxygenSaturationTab: { testId: 'vitals-tab-o2' },
    heightTab: { testId: 'vitals-tab-height' },
    weightTab: { testId: 'vitals-tab-weight' },
    timelineCloseButton: { testId: 'vitals-timeline-close' },

    // Clinical Diagnostic Workup (Chief Complaints)
    clinicalWorkupHeading: { text: 'Clinical Diagnostic Workup' },
    chiefComplaintInput: { testId: 'chief-complaint-input' },
    chiefComplaintDuration: { testId: 'chief-complaint-duration' },
    chiefComplaintAddBtn: { testId: 'chief-complaint-add-btn' },

    // Findings On Examination + Medical History
    findingsHeading: { text: 'Findings On Examination' },
    medicalHistoryHeading: { text: 'Relevant Medical History' },
    findingInput: { testId: 'finding-input' },
    findingAddBtn: { testId: 'finding-add-btn' },
    otherSignificantHistoryInput: { role: 'textbox', name: 'Other Significant History' },

    // Chronic Conditions
    chronicConditionsLabel: { text: 'Chronic Conditions' },
    chronicSearchInput: { testId: 'chronic-search' },
    chronicHistoryButton: { testId: 'chronic-view-history' },
    chronicConditionPill: { testId: 'chronic-tag' },
    chronicDropdown: { testId: 'chronic-dropdown' },
    chronicDropdownOption: { testId: 'chronic-option' },
    chronicNoResults: { testId: 'chronic-no-results' },

    // Allergic Conditions
    allergyLabel: { text: 'History of Allergy' },
    allergySearchInput: { testId: 'allergy-search' },
    allergyHistoryButton: { testId: 'allergy-view-history' },
    allergyConditionPill: { testId: 'allergy-tag' },
    allergyDropdown: { testId: 'allergy-dropdown' },
    allergyDropdownOption: { testId: 'allergy-option' },
    allergyNoResults: { testId: 'allergy-no-results' },

    // History Panel
    historyPanelContainer: { testId: 'history-panel-container' },

    // Chief complaint expanded
    chiefComplaintAssociatedInput: { testId: 'chief-complaint-associated' },
    complaintExpandBtn: { testId: 'complaint-add-associated-btn' },

    // Diagnosis section
    diagnosisHeading: { role: 'heading', name: 'Diagnosis' },
    provisionalDiagnosisTextarea: { role: 'textbox', name: 'Provisional Diagnosis' },
    finalDiagnosisTextarea: { role: 'textbox', name: 'Final Diagnosis' },
    prognosisTextarea: { testId: 'prognosis-textarea' },

    // Footer fields (Duration, Follow-up, Refills, Referral)
    durationInput: { testId: 'duration-input' },
    followUpDateInput: { testId: 'followup-date-input' },
    refillsInput: { testId: 'refills-input' },
    referredButton: { testId: 'referred-btn' },
    admittedButton: { testId: 'admitted-btn' },
    referralInput: { testId: 'diagnosis-referral-input' },

    // Treatment section
    treatmentHeading: { text: 'Treatment' },
    treatmentSectionToggle: { testId: 'treatment-section-toggle' },
    adviceTextarea: { testId: 'advice-textarea' },

    // Medical History section toggle
    medicalHistoryCollapseToggle: { testId: 'medical-history-collapse' },

    // Diagnosis section toggle
    diagnosisCollapseToggle: { testId: 'diagnosis-collapse-toggle' },

    // Medications section
    medicationsHeading: { role: 'heading', name: 'Medications' },
    addMedicationButton: { testId: 'add-medication-btn' },
    medicationSearchInput: { testId: 'medication-search-input' },
    medicationDropdown: { testId: 'medication-dropdown-option' },
    medicationAmountInput: { testId: 'medication-amount' },
    medicationFrequencyInput: { testId: 'medication-frequency' },
    medicationTimingsInput: { testId: 'medication-timings' },
    medicationConditionalInput: { testId: 'medication-conditional' },
    medicationDurationInput: { testId: 'medication-duration' },
    medicationTypeSelect: { testId: 'medication-type' },
    medicationRouteSelect: { testId: 'medication-route' },
    removeMedicationButton: { testId: 'medication-remove-btn' },
    medicationCardHeader: { testId: 'medication-card-header' },
    noMedicationsMessage: { text: /No medications added yet/ },
    specialInstructionsToggle: { text: 'Special Instructions' },
    specialInstructionsInput: { testId: 'medication-special-instructions' },

    // Print Prescription button
    printPrescriptionButton: { role: 'button', name: 'Print' },

    // Toast notifications
    errorToast: { testId: 'toast-error' },

    // Action buttons
    resetPrescriptionButton: { text: 'Reset Prescription' },
    savePrescriptionButton: { text: 'Save Prescription' },

    // Reset confirm modal
    resetConfirmModal: { role: 'dialog', name: 'Reset Prescription' },
    resetConfirmButton: { testId: 'confirm-action-btn' },
    resetCancelButton: { role: 'button', name: 'Cancel' },

    // Complete confirm modal
    completeConfirmModal: { role: 'dialog', name: 'Mark as Completed' },
    completeConfirmButton: { role: 'button', name: 'Yes, Complete' },
    completeCancelButton: { testId: 'confirm-cancel-btn' },
  },
  flows: [],
  flowTree: {
    name: 'root',
    steps: [
      { do: 'waitFor', on: 'patientName' },
    ],
    children: [
      // --- Patient Identifiers ---
      {
        name: 'view patient identifiers',
        steps: [
          { do: 'waitFor', on: 'patientIdentifiersHeading' },
          { expect: 'visible', on: 'patientName' },
          { expect: 'visible', on: 'nameInput' },
          { expect: 'disabled', on: 'nameInput' },
        ],
      },

      // --- Patient Vitals + BMI ---
      {
        name: 'view patient vitals section',
        steps: [
          { do: 'waitFor', on: 'patientVitalsHeading' },
          { expect: 'visible', on: 'systolicInput' },
          { expect: 'visible', on: 'diastolicInput' },
          { expect: 'visible', on: 'bmiReadonlyInput' },
          { expect: 'visible', on: 'openTimelineButton' },
        ],
        children: [
          {
            name: 'auto-calculate BMI from height and weight',
            steps: [
              { do: 'waitFor', on: 'patientName' },
              { do: 'click', on: 'heightInput' },
              { do: 'type', on: 'heightInput', value: '170' },
              { do: 'click', on: 'weightInput' },
              { do: 'type', on: 'weightInput', value: '70' },
              { expect: 'value', on: 'bmiReadonlyInput', value: '24.22' },
            ],
          },

          {
            name: 'fill all vital signs',
            steps: [
              { do: 'waitFor', on: 'patientName' },
              { do: 'click', on: 'heightInput' },
              { do: 'type', on: 'heightInput', value: '165' },
              { do: 'click', on: 'weightInput' },
              { do: 'type', on: 'weightInput', value: '60' },
              { do: 'fill', on: 'systolicInput', value: '120' },
              { do: 'fill', on: 'diastolicInput', value: '80' },
              { do: 'fill', on: 'heartRateInput', value: '72' },
              { do: 'fill', on: 'oxygenSatInput', value: '98' },
              { expect: 'value', on: 'systolicInput', value: '120' },
              { expect: 'value', on: 'heartRateInput', value: '72' },
              { expect: 'value', on: 'oxygenSatInput', value: '98' },
            ],
          },

          // --- Vitals timeline modal ---
          {
            name: 'open vitals timeline modal',
            steps: [
              { do: 'waitFor', on: 'patientName' },
              { do: 'waitFor', on: 'openTimelineButton' },
              { do: 'click', on: 'openTimelineButton' },
              { do: 'waitFor', on: 'vitalsTimelineHeading' },
              { expect: 'visible', on: 'heartRateTab' },
              { expect: 'visible', on: 'oxygenSaturationTab' },
              { expect: 'visible', on: 'heightTab' },
              { expect: 'visible', on: 'weightTab' },
            ],
            children: [
              {
                name: 'switch vitals timeline tabs',
                steps: [
                  { do: 'click', on: 'heartRateTab' },
                  { do: 'waitFor', on: 'heartRateTab' },
                  { expect: 'hasClass', on: 'heartRateTab', value: 'border-primary' },
                  { do: 'click', on: 'oxygenSaturationTab' },
                  { do: 'waitFor', on: 'oxygenSaturationTab' },
                  { expect: 'hasClass', on: 'oxygenSaturationTab', value: 'border-primary' },
                ],
              },
              {
                name: 'close vitals timeline modal',
                steps: [
                  { do: 'click', on: 'timelineCloseButton' },
                  { expect: 'hidden', on: 'vitalsTimelineHeading' },
                ],
              },
            ],
          },
        ],
      },

      // --- Clinical Diagnostic Workup (Chief Complaints) ---
      {
        name: 'view clinical diagnostic workup',
        steps: [
          { do: 'waitFor', on: 'clinicalWorkupHeading' },
          { expect: 'visible', on: 'chiefComplaintInput' },
          { expect: 'visible', on: 'chiefComplaintDuration' },
          { expect: 'visible', on: 'chiefComplaintAddBtn' },
        ],
        children: [
          {
            name: 'add chief complaint with duration',
            steps: [
              { do: 'fill', on: 'chiefComplaintInput', value: 'Headache' },
              { do: 'fill', on: 'chiefComplaintDuration', value: '3 days' },
              { do: 'click', on: 'chiefComplaintAddBtn' },
            ],
          },
        ],
      },

      // --- Findings On Examination + Medical History ---
      {
        name: 'view findings and medical history',
        steps: [
          { do: 'waitFor', on: 'findingsHeading' },
          { expect: 'visible', on: 'medicalHistoryHeading' },
          { expect: 'visible', on: 'findingInput' },
          { expect: 'visible', on: 'otherSignificantHistoryInput' },
        ],
        children: [
          {
            name: 'add finding on examination',
            steps: [
              { do: 'fill', on: 'findingInput', value: 'Mild tenderness in abdomen' },
              { do: 'click', on: 'findingAddBtn' },
            ],
          },
          {
            name: 'fill other significant history',
            steps: [
              { do: 'fill', on: 'otherSignificantHistoryInput', value: 'Known hypertensive for 5 years' },
              { expect: 'value', on: 'otherSignificantHistoryInput', value: 'Known hypertensive for 5 years' },
            ],
          },
        ],
      },

      // --- Chronic conditions + history ---
      {
        name: 'view chronic conditions field with controls',
        steps: [
          { do: 'waitFor', on: 'medicalHistoryHeading' },
          { expect: 'visible', on: 'chronicConditionsLabel' },
          { expect: 'visible', on: 'chronicSearchInput' },
          { expect: 'enabled', on: 'chronicSearchInput' },
          { expect: 'visible', on: 'chronicHistoryButton' },
        ],
        children: [
          {
            name: 'search and add chronic condition',
            steps: [
              { do: 'waitFor', on: 'patientName' },
              { do: 'reactFill', on: 'chronicSearchInput', value: 'diabetes' },
              { do: 'waitFor', on: 'chronicDropdown' },
              { do: 'click', on: 'chronicDropdownOption' },
              { expect: 'visible', on: 'chronicConditionPill' },
            ],
          },
          {
            name: 'open chronic conditions history panel',
            steps: [
              { do: 'click', on: 'chronicHistoryButton' },
              { expect: 'visible', on: 'historyPanelContainer' },
            ],
          },
          {
            name: 'search chronic conditions with no results',
            steps: [
              { do: 'waitFor', on: 'patientName' },
              { do: 'reactFill', on: 'chronicSearchInput', value: 'nonexistentconditionabc' },
              { do: 'waitFor', on: 'chronicNoResults' },
              { expect: 'visible', on: 'chronicNoResults' },
              { expect: 'hidden', on: 'chronicDropdown' },
            ],
          },
        ],
      },

      // --- Allergic conditions + history ---
      {
        name: 'view allergic conditions field with controls',
        steps: [
          { do: 'waitFor', on: 'medicalHistoryHeading' },
          { expect: 'visible', on: 'allergyLabel' },
          { expect: 'visible', on: 'allergySearchInput' },
          { expect: 'enabled', on: 'allergySearchInput' },
          { expect: 'visible', on: 'allergyHistoryButton' },
        ],
        children: [
          {
            name: 'search and add allergy',
            steps: [
              { do: 'waitFor', on: 'patientName' },
              { do: 'reactFill', on: 'allergySearchInput', value: 'penicillin' },
              { do: 'waitFor', on: 'allergyDropdown' },
              { do: 'click', on: 'allergyDropdownOption' },
              { expect: 'visible', on: 'allergyConditionPill' },
            ],
          },
          {
            name: 'open allergy history panel',
            steps: [
              { do: 'click', on: 'allergyHistoryButton' },
              { expect: 'visible', on: 'historyPanelContainer' },
            ],
          },
          {
            name: 'search allergic conditions with no results',
            steps: [
              { do: 'waitFor', on: 'patientName' },
              { do: 'reactFill', on: 'allergySearchInput', value: 'nonexistentallergyxyz' },
              { do: 'waitFor', on: 'allergyNoResults' },
              { expect: 'visible', on: 'allergyNoResults' },
              { expect: 'hidden', on: 'allergyDropdown' },
            ],
          },
        ],
      },

      // --- Diagnosis section ---
      {
        name: 'view diagnosis section',
        steps: [
          { do: 'waitFor', on: 'diagnosisHeading' },
          { expect: 'visible', on: 'provisionalDiagnosisTextarea' },
          { expect: 'visible', on: 'durationInput' },
          { expect: 'visible', on: 'refillsInput' },
        ],
        children: [
          {
            name: 'fill diagnosis fields and verify values',
            steps: [
              { do: 'waitFor', on: 'patientName' },
              { do: 'fill', on: 'chiefComplaintInput', value: 'Acute fever with body ache' },
              { do: 'click', on: 'chiefComplaintAddBtn' },
              { do: 'click', on: 'provisionalDiagnosisTextarea' },
              { do: 'type', on: 'provisionalDiagnosisTextarea', value: 'Viral fever' },
              { do: 'click', on: 'finalDiagnosisTextarea' },
              { do: 'type', on: 'finalDiagnosisTextarea', value: 'Viral fever confirmed' },
              { do: 'fill', on: 'durationInput', value: '5' },
              { do: 'fill', on: 'refillsInput', value: '0' },
              { expect: 'value', on: 'provisionalDiagnosisTextarea', value: 'Viral fever' },
            ],
            children: [
              // --- Save prescription ---
              {
                name: 'save prescription shows complete modal',
                steps: [
                  { do: 'click', on: 'savePrescriptionButton' },
                  { expect: 'visible', on: 'completeConfirmModal' },
                  { expect: 'visible', on: 'completeConfirmButton' },
                ],
                children: [
                  {
                    name: 'mark appointment as completed after save',
                    steps: [
                      { do: 'click', on: 'completeConfirmButton' },
                      { expect: 'hidden', on: 'completeConfirmModal' },
                      { expect: 'visible', on: 'readOnlyBadge' },
                    ],
                    children: [
                      {
                        name: 'completed appointment shows read-only state',
                        steps: [
                          { expect: 'visible', on: 'readOnlyBadge' },
                          { expect: 'hidden', on: 'savePrescriptionButton' },
                          { expect: 'hidden', on: 'resetPrescriptionButton' },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'dismiss complete modal via cancel',
                    steps: [
                      { do: 'click', on: 'completeCancelButton' },
                      { expect: 'hidden', on: 'completeConfirmModal' },
                    ],
                  },
                  {
                    name: 'verify prescription data persists after reload',
                    steps: [
                      { do: 'click', on: 'completeConfirmButton' },
                      { do: 'reload' },
                      { do: 'waitFor', on: 'patientName' },
                      { expect: 'value', on: 'provisionalDiagnosisTextarea', value: 'Viral fever' },
                      { expect: 'value', on: 'finalDiagnosisTextarea', value: 'Viral fever confirmed' },
                    ],
                  },
                  {
                    name: 'print prescription button visible after save',
                    steps: [
                      { expect: 'visible', on: 'printPrescriptionButton' },
                      { expect: 'enabled', on: 'printPrescriptionButton' },
                    ],
                  },
                ],
              },
              // --- Cancel reset preserves data ---
              {
                name: 'cancel reset preserves form data',
                steps: [
                  { do: 'click', on: 'resetPrescriptionButton' },
                  { expect: 'visible', on: 'resetConfirmModal' },
                  { do: 'click', on: 'resetCancelButton' },
                  { expect: 'hidden', on: 'resetConfirmModal' },
                  { expect: 'value', on: 'provisionalDiagnosisTextarea', value: 'Viral fever' },
                ],
              },
              // --- Medication with type/route + save + persistence ---
              {
                name: 'add medication with type and route then save and verify persistence',
                steps: [
                  { do: 'click', on: 'addMedicationButton' },
                  { do: 'waitFor', on: 'medicationSearchInput' },
                  { do: 'reactFill', on: 'medicationSearchInput', value: 'Paracetamol' },
                  { do: 'waitFor', on: 'medicationDropdown' },
                  { do: 'click', on: 'medicationDropdown' },
                  { do: 'select', on: 'medicationTypeSelect', value: 'capsule' },
                  { do: 'select', on: 'medicationRouteSelect', value: 'sublingual' },
                  { do: 'fill', on: 'medicationAmountInput', value: '250' },
                  { do: 'fill', on: 'medicationFrequencyInput', value: '3' },
                  { do: 'fill', on: 'medicationDurationInput', value: '7' },
                  { do: 'click', on: 'savePrescriptionButton' },
                  { expect: 'visible', on: 'completeConfirmModal' },
                  { do: 'click', on: 'completeConfirmButton' },
                  { do: 'reload' },
                  { do: 'waitFor', on: 'patientName' },
                  { expect: 'hidden', on: 'noMedicationsMessage' },
                  { do: 'click', on: 'medicationCardHeader' },
                  { do: 'waitFor', on: 'medicationSearchInput' },
                ],
              },
              // --- Vitals roundtrip persistence ---
              {
                name: 'vitals values persist after save and reload',
                steps: [
                  { do: 'click', on: 'heightInput' },
                  { do: 'type', on: 'heightInput', value: '165' },
                  { do: 'click', on: 'weightInput' },
                  { do: 'type', on: 'weightInput', value: '60' },
                  { do: 'fill', on: 'systolicInput', value: '120' },
                  { do: 'fill', on: 'diastolicInput', value: '80' },
                  { do: 'fill', on: 'heartRateInput', value: '72' },
                  { do: 'fill', on: 'oxygenSatInput', value: '98' },
                  { do: 'click', on: 'savePrescriptionButton' },
                  { expect: 'visible', on: 'completeConfirmModal' },
                  { do: 'click', on: 'completeCancelButton' },
                  { do: 'reload' },
                  { do: 'waitFor', on: 'patientName' },
                  { expect: 'value', on: 'heightInput', value: '165' },
                  { expect: 'value', on: 'weightInput', value: '60' },
                  { expect: 'value', on: 'systolicInput', value: '120' },
                  { expect: 'value', on: 'diastolicInput', value: '80' },
                  { expect: 'value', on: 'heartRateInput', value: '72' },
                  { expect: 'value', on: 'oxygenSatInput', value: '98' },
                  { expect: 'value', on: 'bmiReadonlyInput', value: '22.04' },
                ],
              },
              // --- Medication full roundtrip persistence ---
              {
                name: 'medication with all fields persists after save and reload',
                steps: [
                  { do: 'click', on: 'addMedicationButton' },
                  { do: 'waitFor', on: 'medicationSearchInput' },
                  { do: 'reactFill', on: 'medicationSearchInput', value: 'Paracetamol' },
                  { do: 'waitFor', on: 'medicationDropdown' },
                  { do: 'click', on: 'medicationDropdown' },
                  { do: 'select', on: 'medicationTypeSelect', value: 'capsule' },
                  { do: 'select', on: 'medicationRouteSelect', value: 'sublingual' },
                  { do: 'fill', on: 'medicationAmountInput', value: '2' },
                  { do: 'fill', on: 'medicationFrequencyInput', value: '3' },
                  { do: 'fill', on: 'medicationDurationInput', value: '7' },
                  { do: 'fill', on: 'medicationTimingsInput', value: 'Morning & Evening' },
                  { do: 'fill', on: 'medicationConditionalInput', value: 'After meals' },
                  { do: 'click', on: 'specialInstructionsToggle' },
                  { do: 'waitFor', on: 'specialInstructionsInput' },
                  { do: 'fill', on: 'specialInstructionsInput', value: 'Take with water' },
                  { do: 'click', on: 'savePrescriptionButton' },
                  { expect: 'visible', on: 'completeConfirmModal' },
                  { do: 'click', on: 'completeCancelButton' },
                  { do: 'reload' },
                  { do: 'waitFor', on: 'patientName' },
                  { do: 'click', on: 'medicationCardHeader' },
                  { expect: 'value', on: 'medicationTypeSelect', value: 'capsule' },
                  { expect: 'value', on: 'medicationRouteSelect', value: 'sublingual' },
                  { expect: 'value', on: 'medicationAmountInput', value: '2' },
                  { expect: 'value', on: 'medicationFrequencyInput', value: '3' },
                  { expect: 'value', on: 'medicationDurationInput', value: '7' },
                  { expect: 'value', on: 'medicationTimingsInput', value: 'Morning & Evening' },
                  { expect: 'value', on: 'medicationConditionalInput', value: 'After meals' },
                ],
                children: [
                  // --- Edit existing medication persistence ---
                  {
                    name: 'edit saved medication values persist after re-save',
                    steps: [
                      { do: 'fill', on: 'medicationAmountInput', value: '5' },
                      { do: 'fill', on: 'medicationFrequencyInput', value: '1' },
                      { do: 'fill', on: 'medicationTimingsInput', value: 'Night only' },
                      { do: 'click', on: 'savePrescriptionButton' },
                      { expect: 'visible', on: 'completeConfirmModal' },
                      { do: 'click', on: 'completeCancelButton' },
                      { do: 'reload' },
                      { do: 'waitFor', on: 'patientName' },
                      { do: 'waitFor', on: 'medicationCardHeader' },
                      { do: 'click', on: 'medicationCardHeader' },
                      { do: 'waitFor', on: 'medicationAmountInput' },
                      { expect: 'value', on: 'medicationAmountInput', value: '5' },
                      { expect: 'value', on: 'medicationFrequencyInput', value: '1' },
                      { expect: 'value', on: 'medicationTimingsInput', value: 'Night only' },
                      { expect: 'value', on: 'medicationConditionalInput', value: 'After meals' },
                    ],
                  },
                ],
              },
              // --- Referral roundtrip persistence ---
              {
                name: 'referral type and destination persist after save and reload',
                steps: [
                  { do: 'click', on: 'referredButton' },
                  { do: 'fill', on: 'referralInput', value: 'Cardiology, City Hospital' },
                  { do: 'click', on: 'savePrescriptionButton' },
                  { expect: 'visible', on: 'completeConfirmModal' },
                  { do: 'click', on: 'completeCancelButton' },
                  { do: 'reload' },
                  { do: 'waitFor', on: 'patientName' },
                  { expect: 'hasClass', on: 'referredButton', value: 'bg-primary' },
                  { expect: 'value', on: 'referralInput', value: 'Cardiology, City Hospital' },
                ],
              },
              // --- Footer fields roundtrip persistence ---
              {
                name: 'duration, refills, follow-up date, and advice persist after save and reload',
                steps: [
                  { do: 'fill', on: 'durationInput', value: '10' },
                  { do: 'fill', on: 'refillsInput', value: '2' },
                  { do: 'fill', on: 'followUpDateInput', value: '2026-12-31' },
                  { do: 'fill', on: 'adviceTextarea', value: 'Rest well, drink fluids' },
                  { do: 'click', on: 'savePrescriptionButton' },
                  { expect: 'visible', on: 'completeConfirmModal' },
                  { do: 'click', on: 'completeCancelButton' },
                  { do: 'reload' },
                  { do: 'waitFor', on: 'patientName' },
                  { expect: 'value', on: 'durationInput', value: '10' },
                  { expect: 'value', on: 'refillsInput', value: '2' },
                  { expect: 'value', on: 'followUpDateInput', value: '2026-12-31' },
                  { expect: 'value', on: 'adviceTextarea', value: 'Rest well, drink fluids' },
                ],
              },
            ],
          },
          {
            name: 'toggle referral type shows input',
            steps: [
              { do: 'click', on: 'referredButton' },
              { expect: 'hasClass', on: 'referredButton', value: 'bg-primary' },
              { do: 'click', on: 'admittedButton' },
              { expect: 'hasClass', on: 'admittedButton', value: 'bg-warning' },
            ],
          },
          {
            name: 'negative duration shows error on save',
            steps: [
              { do: 'waitFor', on: 'patientName' },
              { do: 'fill', on: 'chiefComplaintInput', value: 'Test complaint for duration' },
              { do: 'click', on: 'chiefComplaintAddBtn' },
              { do: 'click', on: 'provisionalDiagnosisTextarea' },
              { do: 'type', on: 'provisionalDiagnosisTextarea', value: 'Test diagnosis for duration' },
              { do: 'fill', on: 'durationInput', value: '-1' },
              { do: 'click', on: 'savePrescriptionButton' },
              { expect: 'visible', on: 'errorToast' },
            ],
          },
          {
            name: 'referral toggle shows and hides referral input',
            steps: [
              { do: 'waitFor', on: 'patientName' },
              { do: 'click', on: 'referredButton' },
              { expect: 'visible', on: 'referralInput' },
              { do: 'fill', on: 'referralInput', value: 'Cardiology Dept, City Hospital' },
              { expect: 'value', on: 'referralInput', value: 'Cardiology Dept, City Hospital' },
              { do: 'click', on: 'admittedButton' },
              { expect: 'visible', on: 'referralInput' },
              { do: 'click', on: 'admittedButton' },
            ],
          },
        ],
      },

      // --- Medications add/remove ---
      {
        name: 'view medications section empty state',
        steps: [
          { do: 'waitFor', on: 'addMedicationButton' },
          { do: 'waitFor', on: 'medicationsHeading' },
          { expect: 'visible', on: 'noMedicationsMessage' },
        ],
        children: [
          {
            name: 'add medication shows form row',
            steps: [
              { do: 'click', on: 'addMedicationButton' },
              { do: 'waitFor', on: 'medicationSearchInput' },
              { expect: 'visible', on: 'medicationAmountInput' },
              { expect: 'visible', on: 'medicationFrequencyInput' },
            ],
            children: [
              {
                name: 'search and select medication from dropdown',
                steps: [
                  { do: 'reactFill', on: 'medicationSearchInput', value: 'Paracetamol' },
                  { do: 'waitFor', on: 'medicationDropdown' },
                  { do: 'click', on: 'medicationDropdown' },
                ],
                children: [
                  {
                    name: 'fill medication details and verify',
                    steps: [
                      { do: 'waitFor', on: 'medicationAmountInput' },
                      { do: 'fill', on: 'medicationAmountInput', value: '2' },
                      { do: 'waitFor', on: 'medicationFrequencyInput' },
                      { do: 'fill', on: 'medicationFrequencyInput', value: '3' },
                      { do: 'waitFor', on: 'medicationTimingsInput' },
                      { do: 'fill', on: 'medicationTimingsInput', value: 'Morning & Evening' },
                      { do: 'waitFor', on: 'medicationConditionalInput' },
                      { do: 'fill', on: 'medicationConditionalInput', value: 'After meals' },
                      { do: 'waitFor', on: 'medicationDurationInput' },
                      { do: 'fill', on: 'medicationDurationInput', value: '5' },
                      { do: 'waitFor', on: 'medicationAmountInput' },
                      { expect: 'value', on: 'medicationAmountInput', value: '2' },
                      { expect: 'value', on: 'medicationFrequencyInput', value: '3' },
                      { expect: 'value', on: 'medicationTimingsInput', value: 'Morning & Evening' },
                      { expect: 'value', on: 'medicationConditionalInput', value: 'After meals' },
                      { expect: 'value', on: 'medicationDurationInput', value: '5' },
                    ],
                  },
                ],
              },
              {
                name: 'type custom medicine name not from autocomplete',
                steps: [
                  { do: 'reactFill', on: 'medicationSearchInput', value: 'CustomMedicine XYZ 100mg' },
                  { expect: 'value', on: 'medicationSearchInput', value: 'CustomMedicine XYZ 100mg' },
                ],
              },
              {
                name: 'remove medication restores empty state',
                steps: [
                  { do: 'click', on: 'removeMedicationButton' },
                  { expect: 'visible', on: 'noMedicationsMessage' },
                ],
              },
            ],
          },
          {
            name: 'add second medication shows two rows',
            steps: [
              { do: 'click', on: 'addMedicationButton' },
              { do: 'waitFor', on: 'medicationSearchInput' },
              { do: 'reactFill', on: 'medicationSearchInput', value: 'Paracetamol' },
              { do: 'waitFor', on: 'medicationDropdown' },
              { do: 'click', on: 'medicationDropdown' },
              { do: 'click', on: 'addMedicationButton' },
              { expect: 'countMin', on: 'medicationCardHeader', value: 2 },
              { expect: 'count', on: 'medicationSearchInput', value: 1 },
            ],
          },
          {
            name: 'toggle special instructions and fill',
            steps: [
              { do: 'click', on: 'addMedicationButton' },
              { do: 'waitFor', on: 'medicationSearchInput' },
              { do: 'reactFill', on: 'medicationSearchInput', value: 'Amoxicillin' },
              { do: 'waitFor', on: 'medicationDropdown' },
              { do: 'click', on: 'medicationDropdown' },
              { do: 'click', on: 'specialInstructionsToggle' },
              { do: 'waitFor', on: 'specialInstructionsInput' },
              { expect: 'visible', on: 'specialInstructionsInput' },
              { do: 'fill', on: 'specialInstructionsInput', value: 'Take with plenty of water' },
              { expect: 'value', on: 'specialInstructionsInput', value: 'Take with plenty of water' },
            ],
          },
          {
            name: 'add medication with syrup type and topical route',
            steps: [
              { do: 'click', on: 'addMedicationButton' },
              { do: 'waitFor', on: 'medicationSearchInput' },
              { do: 'reactFill', on: 'medicationSearchInput', value: 'Ibuprofen' },
              { do: 'waitFor', on: 'medicationDropdown' },
              { do: 'click', on: 'medicationDropdown' },
              { do: 'select', on: 'medicationTypeSelect', value: 'syrup' },
              { do: 'select', on: 'medicationRouteSelect', value: 'topical_rectal' },
              { do: 'fill', on: 'medicationAmountInput', value: '10' },
              { do: 'fill', on: 'medicationFrequencyInput', value: '1' },
              { do: 'fill', on: 'medicationDurationInput', value: '3' },
              { expect: 'value', on: 'medicationAmountInput', value: '10' },
              { expect: 'value', on: 'medicationFrequencyInput', value: '1' },
              { expect: 'value', on: 'medicationDurationInput', value: '3' },
            ],
          },
        ],
      },

      // --- Reset prescription ---
      {
        name: 'view action buttons',
        steps: [
          { do: 'waitFor', on: 'resetPrescriptionButton' },
          { expect: 'visible', on: 'savePrescriptionButton' },
        ],
        children: [
          {
            name: 'open reset confirmation modal',
            steps: [
              { do: 'click', on: 'resetPrescriptionButton' },
              { expect: 'visible', on: 'resetConfirmModal' },
              { expect: 'visible', on: 'resetConfirmButton' },
            ],
            children: [
              {
                name: 'confirm reset clears form data',
                steps: [
                  { do: 'click', on: 'resetConfirmButton' },
                  { expect: 'hidden', on: 'resetConfirmModal' },
                  { expect: 'visible', on: 'noMedicationsMessage' },
                ],
              },
            ],
          },
        ],
      },

      // --- Follow-up date and advice ---
      {
        name: 'fill follow-up date and advice fields',
        steps: [
          { do: 'waitFor', on: 'patientName' },
          { do: 'fill', on: 'followUpDateInput', value: '2026-12-31' },
          { expect: 'value', on: 'followUpDateInput', value: '2026-12-31' },
          { do: 'fill', on: 'adviceTextarea', value: 'Rest well, drink plenty of fluids, follow up in 1 week' },
          { expect: 'value', on: 'adviceTextarea', value: 'Rest well, drink plenty of fluids, follow up in 1 week' },
        ],
      },

      // --- Section collapse/expand ---
      {
        name: 'collapse and expand medical history section',
        steps: [
          { do: 'waitFor', on: 'medicalHistoryHeading' },
          { expect: 'visible', on: 'medicalHistoryCollapseToggle' },
          { do: 'click', on: 'medicalHistoryCollapseToggle' },
          { do: 'click', on: 'medicalHistoryCollapseToggle' },
          { expect: 'visible', on: 'medicalHistoryHeading' },
        ],
      },
      {
        name: 'collapse and expand treatment section',
        steps: [
          { do: 'waitFor', on: 'treatmentHeading' },
          { expect: 'visible', on: 'treatmentSectionToggle' },
          { do: 'click', on: 'treatmentSectionToggle' },
          { do: 'click', on: 'treatmentSectionToggle' },
          { expect: 'visible', on: 'treatmentHeading' },
        ],
      },

      // --- Comprehensive roundtrip: fill ALL fields via UI, save, reload, verify ALL ---
      {
        name: 'fill every field save reload and verify all persist',
        steps: [
          { do: 'waitFor', on: 'patientName' },

          // --- Vitals ---
          { do: 'click', on: 'heightInput' },
          { do: 'type', on: 'heightInput', value: '170' },
          { do: 'click', on: 'weightInput' },
          { do: 'type', on: 'weightInput', value: '72' },
          { do: 'fill', on: 'systolicInput', value: '130' },
          { do: 'fill', on: 'diastolicInput', value: '85' },
          { do: 'fill', on: 'heartRateInput', value: '78' },
          { do: 'fill', on: 'oxygenSatInput', value: '97' },

          // --- Chief complaints (3 with durations + associated) ---
          { do: 'fill', on: 'chiefComplaintInput', value: 'High-grade fever' },
          { do: 'fill', on: 'chiefComplaintDuration', value: '5 days' },
          { do: 'click', on: 'chiefComplaintAddBtn' },
          { do: 'fill', on: 'chiefComplaintInput', value: 'Body aches' },
          { do: 'fill', on: 'chiefComplaintDuration', value: '5 days' },
          { do: 'click', on: 'chiefComplaintAddBtn' },
          { do: 'fill', on: 'chiefComplaintInput', value: 'Loss of appetite' },
          { do: 'fill', on: 'chiefComplaintDuration', value: '3 days' },
          { do: 'click', on: 'chiefComplaintAddBtn' },

          // --- Findings on examination (3 items) ---
          { do: 'fill', on: 'findingInput', value: 'Tender hepatomegaly' },
          { do: 'click', on: 'findingAddBtn' },
          { do: 'fill', on: 'findingInput', value: 'Petechiae on lower limbs' },
          { do: 'click', on: 'findingAddBtn' },
          { do: 'fill', on: 'findingInput', value: 'Positive tourniquet test' },
          { do: 'click', on: 'findingAddBtn' },

          // --- Medical history ---
          { do: 'fill', on: 'otherSignificantHistoryInput', value: 'T2DM on Metformin 500mg BD since 2019' },

          // --- Diagnosis ---
          { do: 'click', on: 'provisionalDiagnosisTextarea' },
          { do: 'type', on: 'provisionalDiagnosisTextarea', value: 'Acute viral fever with myalgia' },
          { do: 'click', on: 'finalDiagnosisTextarea' },
          { do: 'type', on: 'finalDiagnosisTextarea', value: 'Dengue fever (NS1 positive)' },
          { do: 'fill', on: 'prognosisTextarea', value: 'Good with adequate hydration. Expected recovery in 7-10 days.' },

          // --- Medication 1 ---
          { do: 'click', on: 'addMedicationButton' },
          { do: 'waitFor', on: 'medicationSearchInput' },
          { do: 'reactFill', on: 'medicationSearchInput', value: 'Paracetamol' },
          { do: 'waitFor', on: 'medicationDropdown' },
          { do: 'click', on: 'medicationDropdown' },
          { do: 'fill', on: 'medicationAmountInput', value: '2' },
          { do: 'fill', on: 'medicationFrequencyInput', value: '3' },
          { do: 'fill', on: 'medicationDurationInput', value: '7' },
          { do: 'fill', on: 'medicationTimingsInput', value: 'Morning, Afternoon, Night' },
          { do: 'fill', on: 'medicationConditionalInput', value: 'After food' },

          // --- Medication 2 ---
          { do: 'click', on: 'addMedicationButton' },
          { do: 'waitFor', on: 'medicationSearchInput' },
          { do: 'reactFill', on: 'medicationSearchInput', value: 'Amoxicillin' },
          { do: 'waitFor', on: 'medicationDropdown' },
          { do: 'click', on: 'medicationDropdown' },
          { do: 'select', on: 'medicationTypeSelect', value: 'capsule' },
          { do: 'fill', on: 'medicationAmountInput', value: '1' },
          { do: 'fill', on: 'medicationFrequencyInput', value: '3' },
          { do: 'fill', on: 'medicationDurationInput', value: '5' },
          { do: 'fill', on: 'medicationTimingsInput', value: 'Morning, Afternoon, Night' },
          { do: 'fill', on: 'medicationConditionalInput', value: 'Before food' },

          // --- Footer fields ---
          { do: 'fill', on: 'durationInput', value: '7' },
          { do: 'fill', on: 'refillsInput', value: '0' },
          { do: 'fill', on: 'followUpDateInput', value: '2026-12-31' },
          { do: 'fill', on: 'adviceTextarea', value: 'Adequate oral hydration, soft diet, bed rest for 5 days' },

          // --- Referral ---
          { do: 'click', on: 'referredButton' },
          { do: 'fill', on: 'referralInput', value: 'Hematology, City Hospital' },

          // --- Save (dismiss complete modal) ---
          { do: 'click', on: 'savePrescriptionButton' },
          { expect: 'visible', on: 'completeConfirmModal' },
          { do: 'click', on: 'completeCancelButton' },

          // --- Reload ---
          { do: 'reload' },
          { do: 'waitFor', on: 'patientName' },

          // --- Verify vitals ---
          { expect: 'value', on: 'heightInput', value: '170' },
          { expect: 'value', on: 'weightInput', value: '72' },
          { expect: 'value', on: 'bmiReadonlyInput', value: '24.91' },
          { expect: 'value', on: 'systolicInput', value: '130' },
          { expect: 'value', on: 'diastolicInput', value: '85' },
          { expect: 'value', on: 'heartRateInput', value: '78' },
          { expect: 'value', on: 'oxygenSatInput', value: '97' },

          // --- Verify diagnosis ---
          { expect: 'value', on: 'provisionalDiagnosisTextarea', value: 'Acute viral fever with myalgia' },
          { expect: 'value', on: 'finalDiagnosisTextarea', value: 'Dengue fever (NS1 positive)' },
          { expect: 'value', on: 'prognosisTextarea', value: 'Good with adequate hydration. Expected recovery in 7-10 days.' },

          // --- Verify footer fields ---
          { expect: 'value', on: 'durationInput', value: '7' },
          { expect: 'value', on: 'refillsInput', value: '0' },
          { expect: 'value', on: 'followUpDateInput', value: '2026-12-31' },
          { expect: 'value', on: 'adviceTextarea', value: 'Adequate oral hydration, soft diet, bed rest for 5 days' },

          // --- Verify referral ---
          { expect: 'hasClass', on: 'referredButton', value: 'bg-primary' },
          { expect: 'value', on: 'referralInput', value: 'Hematology, City Hospital' },

          // --- Verify medical history ---
          { expect: 'value', on: 'otherSignificantHistoryInput', value: 'T2DM on Metformin 500mg BD since 2019' },

          // --- Verify medications exist ---
          { expect: 'hidden', on: 'noMedicationsMessage' },
          { do: 'click', on: 'medicationCardHeader' },
          { expect: 'value', on: 'medicationAmountInput', value: '2' },
          { expect: 'value', on: 'medicationFrequencyInput', value: '3' },
          { expect: 'value', on: 'medicationDurationInput', value: '7' },
          { expect: 'value', on: 'medicationTimingsInput', value: 'Morning, Afternoon, Night' },
          { expect: 'value', on: 'medicationConditionalInput', value: 'After food' },

          // --- Verify findings persisted (text visible) ---
          { expect: 'visible', on: 'findingsHeading' },

          // --- Verify chief complaints persisted ---
          { expect: 'visible', on: 'clinicalWorkupHeading' },
        ],
      },

      // --- Save validation - missing required fields ---
      {
        name: 'save without chief complaint shows error toast',
        steps: [
          { do: 'waitFor', on: 'patientName' },
          { do: 'click', on: 'provisionalDiagnosisTextarea' },
          { do: 'type', on: 'provisionalDiagnosisTextarea', value: 'Test diagnosis' },
          { do: 'click', on: 'savePrescriptionButton' },
          { expect: 'visible', on: 'errorToast' },
        ],
      },
      {
        name: 'save without provisional diagnosis shows error toast',
        steps: [
          { do: 'waitFor', on: 'patientName' },
          { do: 'fill', on: 'chiefComplaintInput', value: 'Test complaint' },
          { do: 'click', on: 'chiefComplaintAddBtn' },
          { do: 'click', on: 'savePrescriptionButton' },
          { expect: 'visible', on: 'errorToast' },
        ],
      },
    ],
  },
});
