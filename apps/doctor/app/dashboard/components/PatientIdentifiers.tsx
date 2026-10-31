import React from 'react';
import { User } from 'lucide-react';
import { PatientIdentifiers as PatientIdentifiersType } from '../types';
import { componentTestSpec } from '@swasthyaseva/test-gen';

interface Props {
  data: PatientIdentifiersType;
  onChange: (data: PatientIdentifiersType) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  readOnly?: boolean;
  prescriptionFormat?: string;
}

export default function PatientIdentifiers({ data, onChange, isCollapsed, onToggle, readOnly, prescriptionFormat = 'GEN_MED' }: Props) {

  const handleChange = (field: keyof PatientIdentifiersType, value: string) => {
    if (readOnly) return;
    onChange({ ...data, [field]: value });
  };

  const inputClass = `w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`;

  return (
    <section className="bg-card p-6 rounded-lg border border-border h-full">
      <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={onToggle}>
        <h2 className="text-2xl font-bold text-card-alt flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          Patient Particulars
        </h2>
        <button
          type="button"
          data-testid="patient-particulars-collapse"
          aria-expanded={!isCollapsed}
          className="text-muted-alt hover:text-card-alt transition-colors"
        >
          <span className={`transform transition-transform duration-200 inline-block ${isCollapsed ? '' : 'rotate-90'}`}>
            ▶
          </span>
        </button>
      </div>
      <div className={`transition-all duration-200 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[2000px] opacity-100 overflow-visible'}`}>
        <div className="space-y-3">
        {/* Row 1: Name, Age, Sex */}
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3">
            <label className="block text-sm font-medium text-card-alt mb-1">Name</label>
            <input type="text" data-testid="patient-name-input" aria-label="Name" value={data.name} disabled className={`${inputClass} opacity-70 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-card-alt mb-1">Age</label>
            <input type="text" aria-label="Age" value={data.age} disabled className={`${inputClass} opacity-70 cursor-not-allowed`} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-card-alt mb-1">Sex</label>
            <select aria-label="Sex" value={data.sex} disabled className={`${inputClass} opacity-70 cursor-not-allowed`}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        {/* Row 2: Phone, Occupation */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-card-alt mb-1">Phone</label>
            <input type="text" aria-label="Patient Phone" value={data.phone} disabled className={`${inputClass} opacity-70 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-card-alt mb-1">Occupation</label>
            <input type="text" aria-label="Occupation" value={data.occupation} disabled className={`${inputClass} opacity-70 cursor-not-allowed`} />
          </div>
        </div>
        {/* Row 3: Attendant, Relationship */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-card-alt mb-1">Attendant/Informant</label>
            <input type="text" aria-label="Attendant Name" value={data.attendantName} onChange={(e) => handleChange('attendantName', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-card-alt mb-1">Relationship with Patient</label>
            <input type="text" aria-label="Attendant Relationship" value={data.attendantRelationship} onChange={(e) => handleChange('attendantRelationship', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-card-alt mb-1">Address</label>
          <input type="text" aria-label="Patient Address" value={data.address} disabled className={`${inputClass} opacity-70 cursor-not-allowed`} />
        </div>
        </div>
      </div>
    </section>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'Patient Particulars Section',
  elements: {
    sectionHeader: { text: 'Patient Particulars' },
    collapseToggle: { testId: 'patient-particulars-collapse' },
    nameInput: { testId: 'patient-name-input' },
    ageInput: { role: 'textbox', name: 'Age' },
    sexSelect: { role: 'combobox', name: 'Sex' },
  },
  flows: [
    {
      name: 'toggle section collapse',
      steps: [
        { on: 'sectionHeader', expect: 'visible' },
        { on: 'nameInput', expect: 'visible' },
        { on: 'collapseToggle', do: 'click' },
        { on: 'nameInput', expect: 'hidden' },
        { on: 'collapseToggle', do: 'click' },
        { on: 'nameInput', expect: 'visible' },
      ],
    },
    {
      name: 'fill patient identifiers',
      steps: [
        { on: 'nameInput', do: 'fill', value: 'John Doe' },
        { on: 'nameInput', expect: 'value', value: 'John Doe' },
        { on: 'ageInput', do: 'fill', value: '35' },
        { on: 'ageInput', expect: 'value', value: '35' },
        { on: 'sexSelect', do: 'select', value: 'Male' },
      ],
    },
  ],
});
