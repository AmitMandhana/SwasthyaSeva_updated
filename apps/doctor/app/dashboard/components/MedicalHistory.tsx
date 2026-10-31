'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Stethoscope, Clock } from 'lucide-react';
import { Button } from '@swasthyaseva/ui';
import { MedicalHistory as MedicalHistoryType, Symptoms as SymptomsType } from '../types';
import ChronicConditionsField from './ChronicConditionsField';
import AllergicConditionsField from './AllergicConditionsField';
import SymptomsField from './SymptomsField';
import FindingsOnExamination from './FindingsOnExamination';
import HistoryPanel from './HistoryPanel';
import { componentTestSpec } from '@swasthyaseva/test-gen';

interface Props {
  medicalHistory: MedicalHistoryType;
  symptoms: SymptomsType;
  onMedicalHistoryChange: (data: MedicalHistoryType) => void;
  onSymptomsChange: (data: SymptomsType) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  onPanelChange: (isOpen: boolean) => void;
  prescriptionFormat?: string;
  findingsFirst?: boolean;
  patientSex?: string;
  patientAge?: string;
  readOnly?: boolean;
}

export default function MedicalHistory({
  medicalHistory,
  symptoms,
  onMedicalHistoryChange,
  onSymptomsChange,
  isCollapsed,
  onToggle,
  onPanelChange,
  prescriptionFormat = 'GEN_MED',
  findingsFirst = false,
  patientSex,
  patientAge,
  readOnly,
}: Props) {
  const [chronicConditionsList, setChronicConditionsList] = useState<string[]>([]);
  const [isChronicPanelOpen, setIsChronicPanelOpen] = useState(false);
  const [allergicConditionsList, setAllergicConditionsList] = useState<string[]>([]);
  const [isAllergyPanelOpen, setIsAllergyPanelOpen] = useState(false);
  const [isOtherHistoryPanelOpen, setIsOtherHistoryPanelOpen] = useState(false);
  const [symptomsList, setSymptomsList] = useState<string[]>([]);

  // Notify parent when any panel opens/closes
  React.useEffect(() => {
    onPanelChange(isChronicPanelOpen || isAllergyPanelOpen || isOtherHistoryPanelOpen);
  }, [isChronicPanelOpen, isAllergyPanelOpen, isOtherHistoryPanelOpen, onPanelChange]);

  const handleHistoryChange = (field: keyof MedicalHistoryType, value: string) => {
    onMedicalHistoryChange({ ...medicalHistory, [field]: value });
  };

  const handleSymptomsChange = (data: SymptomsType) => {
    onSymptomsChange(data);
  };

  // Determine which panel to show
  const activePanel = isChronicPanelOpen ? 'chronic' : isAllergyPanelOpen ? 'allergy' : isOtherHistoryPanelOpen ? 'otherHistory' : null;

  return (
    <>
      {/* Render panel in portal */}
      {typeof window !== 'undefined' && activePanel && createPortal(
        activePanel === 'chronic' ? (
          <HistoryPanel
            isOpen={isChronicPanelOpen}
            onClose={() => setIsChronicPanelOpen(false)}
            title="Chronic Conditions History"
            history={[]}
            itemLabel="condition"
          />
        ) : activePanel === 'allergy' ? (
          <HistoryPanel
            isOpen={isAllergyPanelOpen}
            onClose={() => setIsAllergyPanelOpen(false)}
            title="Allergy History"
            history={[]}
            itemLabel="allerg"
          />
        ) : (
          <HistoryPanel
            isOpen={isOtherHistoryPanelOpen}
            onClose={() => setIsOtherHistoryPanelOpen(false)}
            title="Other Significant History"
            history={[]}
            itemLabel="histor"
          />
        ),
        document.getElementById('history-panel-container')!
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <section className={`bg-card p-6 rounded-lg border border-border ${findingsFirst ? 'md:order-2' : ''}`}>
          <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={onToggle}>
            <h2 className="text-2xl font-bold text-card-alt flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Relevant Medical History
            </h2>
            <button
              type="button"
              data-testid="medical-history-collapse"
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
              <ChronicConditionsField
                value={chronicConditionsList}
                onChange={setChronicConditionsList}
                readOnly={readOnly}
                isHistoryOpen={isChronicPanelOpen}
                onOpenHistory={() => {
                  setIsAllergyPanelOpen(false);
                  setIsChronicPanelOpen(!isChronicPanelOpen);
                }}
              />

              <AllergicConditionsField
                value={allergicConditionsList}
                onChange={setAllergicConditionsList}
                readOnly={readOnly}
                isHistoryOpen={isAllergyPanelOpen}
                onOpenHistory={() => {
                  setIsChronicPanelOpen(false);
                  setIsAllergyPanelOpen(!isAllergyPanelOpen);
                }}
              />

              {(
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-card-alt">Other Significant History</label>
                    <Button
                      data-testid="other-history-view-btn"
                      onClick={() => {
                        setIsChronicPanelOpen(false);
                        setIsAllergyPanelOpen(false);
                        setIsOtherHistoryPanelOpen(!isOtherHistoryPanelOpen);
                      }}
                      size="xs"
                      icon={<Clock className="w-3.5 h-3.5" />}
                    >
                      {isOtherHistoryPanelOpen ? 'Close History' : 'View History'}
                    </Button>
                  </div>
                  <textarea
                    aria-label="Other Significant History"
                    value={medicalHistory.otherSignificantHistory}
                    onChange={(e) => handleHistoryChange('otherSignificantHistory', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt"
                  />
                </div>
              )}

              {patientSex?.toLowerCase() === 'female' && Number(patientAge) >= 4 && (
                <div>
                  <label className="block text-sm font-medium text-card-alt mb-2">Menstrual History</label>
                  <textarea
                    aria-label="Menstrual History"
                    value={medicalHistory.menstrualHistory}
                    onChange={(e) => handleHistoryChange('menstrualHistory', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={`bg-card p-6 rounded-lg border border-border ${findingsFirst ? 'md:order-1' : ''}`}>
          <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={onToggle}>
            <h2 className="text-2xl font-bold text-card-alt flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-primary" />
              Findings On Examination
            </h2>
            <button
              type="button"
              aria-expanded={!isCollapsed}
              className="text-card-alt hover:text-card-alt transition-colors"
            >
              <span className={`transform transition-transform duration-200 inline-block ${isCollapsed ? '' : 'rotate-90'}`}>
                ▶
              </span>
            </button>
          </div>
          <div className={`transition-all duration-200 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[2000px] opacity-100 overflow-visible'}`}>
            <FindingsOnExamination
              value={symptoms.signs}
              onChange={(val) => handleSymptomsChange({ ...symptoms, signs: val })}
              readOnly={readOnly}
            />
          </div>
        </section>
      </div>
    </>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'Medical History Section',
  elements: {
    medicalHistoryHeader: { text: 'Relevant Medical History' },
    findingsHeader: { text: 'Findings On Examination' },
    collapseToggle: { testId: 'medical-history-collapse' },
    otherSignificantHistoryInput: { role: 'textbox', name: 'Other Significant History' },
    findingInput: { testId: 'finding-input' },
    findingAddBtn: { testId: 'finding-add-btn' },
    chronicSearchInput: { testId: 'chronic-search' },
    allergySearchInput: { testId: 'allergy-search' },
    chronicHistoryBtn: { testId: 'chronic-view-history' },
    allergyHistoryBtn: { testId: 'allergy-view-history' },
  },
  flows: [
    {
      name: 'fill other significant history',
      steps: [
        { on: 'otherSignificantHistoryInput', do: 'fill', value: 'Known case of hypertension for 5 years' },
        { on: 'otherSignificantHistoryInput', expect: 'value', value: 'Known case of hypertension for 5 years' },
      ],
    },
    {
      name: 'add finding on examination',
      steps: [
        { on: 'findingInput', do: 'fill', value: 'Mild tenderness in the abdomen' },
        { on: 'findingAddBtn', do: 'click' },
      ],
    },
    {
      name: 'toggle section collapse hides and shows fields',
      steps: [
        { on: 'collapseToggle', do: 'click' },
        { on: 'otherSignificantHistoryInput', expect: 'hidden' },
        { on: 'collapseToggle', do: 'click' },
        { on: 'otherSignificantHistoryInput', expect: 'visible' },
      ],
    },
  ],
});
