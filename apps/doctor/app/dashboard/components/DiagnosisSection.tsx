import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import InterventionList from './InterventionList';
import { componentTestSpec } from '@swasthyaseva/test-gen';

interface DiagnosisData {
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

interface Props {
  data: DiagnosisData;
  onChange: (data: DiagnosisData) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  readOnly?: boolean;
}

export default function DiagnosisSection({ data, onChange, isCollapsed, onToggle, readOnly }: Props) {
  const handleChange = (field: keyof DiagnosisData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const inputClass = "w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt";

  return (
    <section className="bg-card p-6 rounded-lg border border-border h-full">
      <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={onToggle}>
        <h2 className="text-2xl font-bold text-card-alt flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-primary" />
          Diagnosis
        </h2>
        <button
          type="button"
          data-testid="diagnosis-collapse-toggle"
          aria-expanded={!isCollapsed}
          className="text-card-alt hover:text-card-alt transition-colors"
        >
          <span className={`transform transition-transform duration-200 inline-block ${isCollapsed ? '' : 'rotate-90'}`}>
            ▶
          </span>
        </button>
      </div>
      <div className={`transition-all duration-200 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[2000px] opacity-100 overflow-visible'}`}>
        <div className="space-y-4">
          <div>
            <label htmlFor="provisional-diagnosis" className="block text-sm font-medium text-card-alt mb-2">Provisional Diagnosis</label>
            <textarea id="provisional-diagnosis" value={data.provisionalDiagnosis} onChange={(e) => handleChange('provisionalDiagnosis', e.target.value)} rows={2} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-card-alt mb-2">Investigations Suggested</label>
            <InterventionList value={data.investigationsSuggested} onChange={(v) => handleChange('investigationsSuggested', v)} readOnly={readOnly} />
          </div>
          <div>
            <label htmlFor="final-diagnosis" className="block text-sm font-medium text-card-alt mb-2">Final Diagnosis</label>
            <textarea id="final-diagnosis" value={data.finalDiagnosis} onChange={(e) => handleChange('finalDiagnosis', e.target.value)} rows={2} className={inputClass} />
          </div>
          <div>
            <label htmlFor="prognosis" className="block text-sm font-medium text-card-alt mb-2">Prognosis</label>
            <textarea id="prognosis" data-testid="prognosis-textarea" value={data.prognosis || ''} onChange={(e) => handleChange('prognosis', e.target.value)} rows={2} className={inputClass} />
          </div>
        </div>
      </div>
    </section>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'Diagnosis Section',
  elements: {
    sectionHeader: { text: 'Diagnosis' },
    collapseToggle: { testId: 'diagnosis-collapse-toggle' },
    provisionalDiagnosisInput: { role: 'textbox', name: 'Provisional Diagnosis' },
    investigationsInput: { testId: 'intervention-input' },
    investigationsAddBtn: { testId: 'intervention-add-btn' },
    finalDiagnosisInput: { role: 'textbox', name: 'Final Diagnosis' },
  },
  flows: [
    {
      name: 'fill diagnosis fields and verify values retained',
      steps: [
        { on: 'provisionalDiagnosisInput', do: 'fill', value: 'Tension-type headache' },
        { on: 'finalDiagnosisInput', do: 'fill', value: 'Migraine' },
        { on: 'provisionalDiagnosisInput', expect: 'value', value: 'Tension-type headache' },
        { on: 'finalDiagnosisInput', expect: 'value', value: 'Migraine' },
      ],
    },
    {
      name: 'add investigation via intervention list',
      steps: [
        { on: 'investigationsInput', do: 'fill', value: 'CT scan' },
        { on: 'investigationsAddBtn', do: 'click' },
        { on: 'investigationsInput', do: 'fill', value: 'Blood glucose' },
        { on: 'investigationsAddBtn', do: 'click' },
      ],
    },
    {
      name: 'toggle section collapse hides and shows fields',
      steps: [
        { on: 'collapseToggle', do: 'click' },
        { on: 'provisionalDiagnosisInput', expect: 'hidden' },
        { on: 'collapseToggle', do: 'click' },
        { on: 'provisionalDiagnosisInput', expect: 'visible' },
      ],
    },
  ],
});
