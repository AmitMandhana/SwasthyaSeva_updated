import type { FormatData } from './types';
import type { Medication, TestRequest } from '../../../../lib/api';

interface SpecialtyOptions {
  title: string;
  showWaist: boolean;
  showSurgical: boolean;
  showDrawing: boolean;
}

export function buildSpecialtyHtml(data: FormatData, opts: SpecialtyOptions): string {
  const { patient, vitals, diagnosis, medications, testRequests, formatData, doctor, clinic } = data;
  const ar = formatData.anthropometryRatings || {};
  const vr = formatData.vitalsRatings || {};
  const mh = formatData.medicalHistory || {};
  const tx = formatData.treatment || {};

  const apptDate = data.appointmentDate
    ? new Date(data.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const now = new Date();
  const downloadTime = now.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const anthroLines = [
    vitals.height ? `Height: ${vitals.height} cm ${ar.height ? `(${ar.height})` : ''}` : '',
    vitals.weight ? `Weight: ${vitals.weight} kg ${ar.weight ? `(${ar.weight})` : ''}` : '',
    vitals.bmi ? `BMI: ${vitals.bmi} kg/m² ${ar.bmi ? `(${ar.bmi})` : ''}` : '',
    opts.showWaist && vitals.waistCircumference ? `Waist: ${vitals.waistCircumference} cm ${ar.waist ? `(${ar.waist})` : ''}` : '',
  ].filter(Boolean);

  const vitalLines = [
    vitals.systolic ? `BP: ${vitals.systolic}/${vitals.diastolic || '-'} mmHg ${vr.bp ? `(${vr.bp})` : ''}` : '',
    vitals.heartRate ? `Heart Rate: ${vitals.heartRate} bpm ${vr.hr ? `(${vr.hr})` : ''}` : '',
    vitals.temperature ? `Temp: ${vitals.temperature} °F ${vr.temperature ? `(${vr.temperature})` : ''}` : '',
    vitals.oxygenSaturation ? `SpO₂: ${vitals.oxygenSaturation}% ${vr.spo2 ? `(${vr.spo2})` : ''}` : '',
  ].filter(Boolean);

  const patientFields = [
    `<span><b>Name:</b> ${patient.name}</span>`,
    `<span><b>Gender:</b> ${patient.sex}</span>`,
    patient.age ? `<span><b>Age:</b> ${patient.age} years</span>` : '',
    patient.phone ? `<span><b>Phone:</b> ${patient.phone}</span>` : '',
    patient.address ? `<span class="col2"><b>Address:</b> ${patient.address}</span>` : '',
    patient.occupation ? `<span><b>Occupation:</b> ${patient.occupation}</span>` : '',
    patient.attendantName ? `<span><b>Attendant:</b> ${patient.attendantName}</span>` : '',
    patient.attendantRelationship ? `<span><b>Relationship:</b> ${patient.attendantRelationship}</span>` : '',
    `<span><b>Date:</b> ${apptDate}</span>`,
  ].filter(Boolean);

  const clinicAddr = clinic?.address.split(', ') || [];

  return `<!DOCTYPE html>
<html>
<head>
  <title>Prescription</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #000; background: #fff; font-size: 14px; line-height: 1.5; }
    h1 { font-size: 18px; font-weight: 700; text-align: center; padding-bottom: 12px; border-bottom: 1px solid rgba(0,0,0,0.15); margin-bottom: 20px; }
    h2 { font-size: 14px; font-weight: 600; margin: 0 0 6px; }
    .header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid rgba(0,0,0,0.15); padding-bottom: 16px; margin-bottom: 20px; font-size: 13px; }
    .header-left { color: #4b5563; }
    .header-right { color: #4b5563; text-align: right; }
    .header-left .name, .header-right .name { color: #000; font-size: 16px; font-weight: 600; }
    .patient-box { border: 1px solid rgba(0,0,0,0.15); border-radius: 6px; padding: 12px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px 16px; font-size: 13px; }
    .patient-box .col2 { grid-column: span 2; }
    .patient-box b { font-weight: 500; }
    .body-grid { display: grid; grid-template-columns: 2fr 3fr; gap: 24px; margin-bottom: 20px; font-size: 13px; }
    .body-left { border-right: 1px solid rgba(0,0,0,0.15); padding-right: 16px; }
    .body-left .section { margin-bottom: 16px; }
    .body-left p { color: #374151; margin-bottom: 4px; }
    .body-right .section { margin-bottom: 12px; }
    .body-right p { color: #374151; margin-top: 4px; }
    .body-right b { font-weight: 500; }
    .treatment { margin-bottom: 20px; }
    .treatment-grid { display: grid; grid-template-columns: 3fr 2fr; gap: 24px; font-size: 13px; }
    .treatment-left { display: flex; flex-direction: column; gap: 8px; }
    .treatment-right { border-left: 1px solid rgba(0,0,0,0.15); padding-left: 16px; }
    .treatment-right .section { margin-bottom: 12px; }
    .treatment-right p { color: #374151; margin-top: 4px; }
    .rx-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
    .rx-box strong { font-weight: 500; }
    .rx-box .instructions { font-weight: 400; color: #6b7280; font-size: 12px; }
    .lab-section { margin-bottom: 20px; }
    .lab-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; margin-bottom: 4px; font-size: 13px; }
    .drawing-section { margin-bottom: 20px; }
    .drawing-section img { max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(0,0,0,0.15); padding-top: 16px; margin-top: 20px; font-size: 13px; }
    .footer-left p { margin-bottom: 4px; }
    .footer-left .meta { font-size: 12px; color: #6b7280; }
    .footer-right { text-align: right; }
    .footer-right img { max-height: 50px; }
    .footer-right .doc-name { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .timestamp { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 8px; }
    @media print { body { padding: 0; } @page { margin: 10mm; } }
  </style>
</head>
<body>
  <h1>Prescription</h1>

  <div class="header">
    <div class="header-left">
      <div class="name">${doctor?.name || ''}</div>
      ${doctor?.baseDegreeCode || ''}<br/>
      Reg. No: ${doctor?.licenseNo || ''}<br/>
      ${doctor?.phone ? `Ph: ${doctor.phone}` : ''}
    </div>
    <div class="header-right">
      <div class="name">${clinic?.name || ''}</div>
      ${clinicAddr.slice(0, 2).join(', ')}<br/>
      ${clinicAddr.slice(2).join(', ')}<br/>
      ${clinic?.phone || ''}
    </div>
  </div>

  <div class="patient-box">
    ${patientFields.join('\n    ')}
  </div>

  <div class="body-grid">
    <div class="body-left">
      ${anthroLines.length > 0 ? `
      <div class="section">
        <h2>Anthropometry</h2>
        ${anthroLines.map(l => `<p>${l}</p>`).join('')}
      </div>` : ''}
      ${vitalLines.length > 0 ? `
      <div class="section">
        <h2>Vitals</h2>
        ${vitalLines.map(l => `<p>${l}</p>`).join('')}
      </div>` : ''}
    </div>
    <div class="body-right">
      <div class="section">
        <h2>Chief Complaint</h2>
        <p>${diagnosis.chiefComplaint}</p>
      </div>
      ${mh.otherSignificantHistory || mh.menstrualHistory ? `
      <div class="section">
        <h2>Medical History</h2>
        ${mh.otherSignificantHistory ? `<p>${mh.otherSignificantHistory}</p>` : ''}
        ${mh.menstrualHistory ? `<p><b>Menstrual:</b> ${mh.menstrualHistory}</p>` : ''}
      </div>` : ''}
      <div class="section">
        <h2>Diagnosis</h2>
        <p><b>Provisional:</b> ${diagnosis.provisionalDiagnosis}</p>
        ${diagnosis.finalDiagnosis ? `<p><b>Final:</b> ${diagnosis.finalDiagnosis}</p>` : ''}
        ${diagnosis.investigationsSuggested ? `<p><b>Investigations:</b> ${diagnosis.investigationsSuggested}</p>` : ''}
        ${opts.showSurgical && diagnosis.surgicalInterventionSuggested ? `<p><b>Surgical Intervention:</b> ${diagnosis.surgicalInterventionSuggested}</p>` : ''}
      </div>
    </div>
  </div>

  ${medications.length > 0 || tx.otherInterventionSuggested || tx.advice ? `
  <div class="treatment">
    <h2>Treatment</h2>
    <div class="treatment-grid">
      <div class="treatment-left">
        ${medications.map((m: Medication, i: number) => {
          const type = m.medication_type ? m.medication_type.charAt(0).toUpperCase() + m.medication_type.slice(1).replace(/_/g, ' ') : 'Tab';
          const route = m.route && m.route !== 'oral' ? ` ${m.route.replace(/_/g, ' ')}` : '';
          const parts = [type, m.medicine_name, m.amount ? `${m.amount}` : '', m.frequency ? `${m.frequency}` : ''].filter(Boolean).join(' ');
          const line = parts + (route ? ` ${route}` : '') + (m.duration_days ? ` for ${m.duration_days} days` : '');
          return `<div class="rx-box"><strong>${i + 1}. ${line}</strong>${m.special_instructions ? `<br/><span class="instructions">Instructions: ${m.special_instructions}</span>` : ''}</div>`;
        }).join('')}
      </div>
      <div class="treatment-right">
        ${tx.otherInterventionSuggested ? `<div class="section"><h2>Other Intervention</h2><p>${tx.otherInterventionSuggested}</p></div>` : ''}
        ${tx.advice ? `<div class="section"><h2>Advice</h2><p>${tx.advice}</p></div>` : ''}
      </div>
    </div>
  </div>` : ''}

  ${opts.showDrawing && formatData.drawingUrl ? `<div class="drawing-section"><h2>Clinical Drawing</h2><img src="${formatData.drawingUrl}" /></div>` : ''}

  ${testRequests.length > 0 ? `
  <div class="lab-section">
    <h2>Lab Tests</h2>
    ${testRequests.map((t: TestRequest) => `<div class="lab-item">${t.test_name}</div>`).join('')}
  </div>` : ''}

  <div class="footer">
    <div class="footer-left">
      ${formatData.followUpDate ? `<p><b>Follow-up:</b> ${formatData.followUpDate}</p>` : ''}
      <p class="meta">Duration: ${diagnosis.duration || '-'} days | Refills: ${diagnosis.refills || '0'}</p>
    </div>
    <div class="footer-right">
      ${doctor?.signatureLink ? `<img src="${doctor.signatureLink}" />` : ''}
      <p class="doc-name">${doctor?.name || ''}</p>
    </div>
  </div>

  <p class="timestamp">Printed: ${downloadTime}</p>
</body>
</html>`;
}

export function genMedHtmlGenerator(data: FormatData): string {
  return buildSpecialtyHtml(data, {
    title: 'GENERAL MEDICINE',
    showWaist: true,
    showSurgical: false,
    showDrawing: true,
  });
}
