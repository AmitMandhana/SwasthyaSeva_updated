'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPrescriptionDetail, type FullPrescription } from '../../../../lib/patientApi';
import { ArrowLeft, Printer, Download, Loader2 } from 'lucide-react';
import { Button } from '@swasthyaseva/ui';
import { getFormatComponent } from './formats';
import { testSpec } from '@swasthyaseva/test-gen';

export default function PrescriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<FullPrescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = Number(params.id);
    if (!id) { setError('Invalid prescription ID'); setLoading(false); return; }

    getPrescriptionDetail(id)
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    const el = document.getElementById('prescription-content');
    if (!el) return;
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const date = data?.appointment?.date ? new Date(data.appointment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : 'prescription';
      pdf.save(`prescription-${date}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      handlePrint();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 data-testid="prescription-loading-spinner" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p data-testid="prescription-error-message" className="text-destructive mb-4">{error || 'Prescription not found'}</p>
        <button onClick={() => router.push('/dashboard')} className="text-primary hover:underline">Back to prescriptions</button>
      </div>
    );
  }

  const FormatComponent = getFormatComponent(data.prescriptionFormat);

  return (
    <div className="max-w-3xl mx-auto print:max-w-none">
      {/* Actions bar - hidden in print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1 text-primary hover:underline text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to prescriptions
        </button>
        <div className="flex gap-2">
          <Button onClick={handleDownloadPDF} icon={<Download className="w-4 h-4" />}>
            Download PDF
          </Button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 border border-border text-card-alt rounded-md hover:bg-muted text-sm">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          #prescription-content { background: white !important; color: black !important; border: none !important; box-shadow: none !important; }
          #prescription-content * { color: inherit !important; }
          #prescription-content h1, #prescription-content h3, #prescription-content .font-medium, #prescription-content .font-semibold { color: black !important; }
          #prescription-content .text-muted-alt { color: #666 !important; }
          #prescription-content .text-card-alt { color: #333 !important; }
          #prescription-content .bg-muted\\/30 { background: #f5f5f5 !important; }
          #prescription-content table th { background: #f5f5f5 !important; }
          #prescription-content table td, #prescription-content table th { border-color: #ddd !important; color: #333 !important; }
          #prescription-content .border-border { border-color: #ddd !important; }
        }
      `}</style>

      {/* Prescription content */}
      <div id="prescription-content" className="bg-white rounded-lg border border-gray-200 p-6 space-y-6 print:border-none print:shadow-none">
        <FormatComponent data={data} />
      </div>
    </div>
  );
}

export const __test = testSpec({
  route: '/dashboard/prescriptions/999',
  auth: 'role:patient',
  app: 'web',
  title: 'Prescription Detail',
  seedApi: {
    endpoint: '/api/test/seed-patient-prescription',
    method: 'POST',
    body: { phone: '+910001000001' },
    routeParam: 'appointment_id',
    resolveEntities: true,
  },
  elements: {
    prescriptionHeading: { role: 'heading', name: 'Prescription' },
    backBtn: { text: 'Back to prescriptions' },
    printBtn: { text: 'Print' },
    downloadBtn: { text: 'Download PDF' },
    doctorSection: { testId: 'rx-doctor-name' },
    clinicSection: { testId: 'clinic-section-heading' },
    diagnosisSection: { text: 'Diagnosis' },
    chiefComplaint: { text: 'Chief Complaint' },
    provisionalDiagnosis: { text: 'Provisional:' },
    finalDiagnosis: { text: 'Final:' },
    treatmentSection: { role: 'heading', name: /Treatment/ },
    durationInfo: { testId: 'prescription-duration-info' },
  },
  flows: [],
  flowTree: {
    name: 'render prescription detail',
    steps: [
      { do: 'waitFor', on: 'prescriptionHeading' },
      { expect: 'visible', on: 'prescriptionHeading' },
    ],
    children: [
      {
        name: 'all sections visible',
        steps: [
          { expect: 'visible', on: 'doctorSection' },
          { expect: 'visible', on: 'clinicSection' },
          { expect: 'visible', on: 'diagnosisSection' },
          { expect: 'visible', on: 'chiefComplaint' },
          { expect: 'visible', on: 'provisionalDiagnosis' },
          { expect: 'visible', on: 'finalDiagnosis' },
          { expect: 'visible', on: 'treatmentSection' },
          { expect: 'visible', on: 'durationInfo' },
        ],
      },
      {
        name: 'print and download buttons visible',
        steps: [
          { expect: 'visible', on: 'printBtn' },
          { expect: 'visible', on: 'downloadBtn' },
        ],
        children: [
          {
            name: 'print button is clickable',
            steps: [
              { expect: 'enabled', on: 'printBtn' },
            ],
          },
          {
            name: 'download button is clickable',
            steps: [
              { expect: 'enabled', on: 'downloadBtn' },
            ],
          },
        ],
      },
      {
        name: 'treatment section shows medications',
        steps: [
          { expect: 'visible', on: 'treatmentSection' },
          { expect: 'visible', on: 'durationInfo' },
        ],
      },
      {
        name: 'back navigation returns to dashboard',
        steps: [
          { do: 'click', on: 'backBtn' },
          { expect: 'urlContains', value: '/dashboard' },
        ],
      },
    ],
  },
});
