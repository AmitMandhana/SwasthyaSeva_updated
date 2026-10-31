import React, { useState } from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { PatientVitals as PatientVitalsType, VitalsRatings } from '../types';
import VitalsTimelineModal from './VitalsTimelineModal';
import { componentTestSpec } from '@swasthyaseva/test-gen';

interface Props {
  data: PatientVitalsType;
  onChange: (data: PatientVitalsType) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  appointmentId?: number | null;
  userId?: number | null;
  onSaveVitals?: () => void;
  prescriptionFormat?: string;
  ratings?: Partial<VitalsRatings>;
  onRatingsChange?: (ratings: Partial<VitalsRatings>) => void;
}

export default function PatientVitals({ data, onChange, isCollapsed, onToggle, appointmentId, userId, onSaveVitals, prescriptionFormat = 'GEN_MED', ratings = {}, onRatingsChange }: Props) {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const showWaist = prescriptionFormat !== 'ENT';

  const handleChange = (field: keyof PatientVitalsType, value: string) => {
    const newData = { ...data, [field]: value };
    if (field === 'height' || field === 'weight') {
      const height = field === 'height' ? parseFloat(value) : parseFloat(newData.height);
      const weight = field === 'weight' ? parseFloat(value) : parseFloat(newData.weight);
      if (height && weight && height > 0) {
        const heightInMeters = height / 100;
        newData.bmi = (weight / (heightInMeters * heightInMeters)).toFixed(2);
      }
    }
    onChange(newData);
  };

  const handleRating = (field: keyof VitalsRatings, value: string) => {
    onRatingsChange?.({ ...ratings, [field]: value });
  };

  const inputClass = "flex-1 px-3 py-2 min-w-0 border-0 focus:outline-none focus:ring-0 bg-transparent text-card-alt rounded-md";
  const wrapClass = "flex items-center border border-input rounded-md focus-within:border-primary focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary bg-background";
  const ratingClass = "w-full px-2 py-1 text-xs border border-input rounded bg-background text-muted-alt focus:border-primary focus:outline-none mt-1";

  return (
    <>
      <VitalsTimelineModal isOpen={isTimelineOpen} onClose={() => setIsTimelineOpen(false)} />
      <section className="bg-card p-6 rounded-lg border border-border h-full">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onToggle}>
            <h2 className="text-2xl font-bold text-card-alt flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              Patient Vitals
            </h2>
            <button type="button" data-testid="vitals-collapse-toggle" aria-expanded={!isCollapsed} className="text-card-alt hover:text-card-alt transition-colors">
              <span className={`transform transition-transform duration-200 inline-block ${isCollapsed ? '' : 'rotate-90'}`}>▶</span>
            </button>
          </div>
          <button data-testid="open-timeline-btn" onClick={() => setIsTimelineOpen(true)} className="bg-primary hover:opacity-90 text-primary-alt px-3 py-1.5 sm:px-4 sm:py-2 rounded-md font-medium flex items-center gap-2 text-sm sm:text-base">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Open Timeline</span>
            <span className="sm:hidden">Timeline</span>
          </button>
        </div>
      <div className={`transition-all duration-200 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[2000px] opacity-100 overflow-visible'}`}>
        <div className="space-y-4">

        {/* Anthropometry */}
        <div>
          <h3 className="text-sm font-semibold text-muted-alt uppercase tracking-wide mb-2">Anthropometry</h3>
          <div className={`grid grid-cols-2 ${showWaist ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-3`}>
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">Height</label>
              <div className={wrapClass}>
                <input type="number" min="30" max="250" step="0.1" data-testid="vitals-height" aria-label="Height" value={data.height} onChange={(e) => handleChange('height', e.target.value)} className={inputClass} />
                <span className="text-sm text-muted-alt pr-3">cm</span>
              </div>
              <input type="text" placeholder="Rating" aria-label="Height Rating" value={ratings.height || ''} onChange={(e) => handleRating('height', e.target.value)} className={ratingClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">Weight</label>
              <div className={wrapClass}>
                <input type="number" min="0.5" max="500" step="0.1" data-testid="vitals-weight" aria-label="Weight" value={data.weight} onChange={(e) => handleChange('weight', e.target.value)} className={inputClass} />
                <span className="text-sm text-muted-alt pr-3">kg</span>
              </div>
              <input type="text" placeholder="Rating" aria-label="Weight Rating" value={ratings.weight || ''} onChange={(e) => handleRating('weight', e.target.value)} className={ratingClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">BMI</label>
              <div className="flex items-center border border-input rounded-md bg-muted">
                <input type="text" data-testid="vitals-bmi" aria-label="BMI" value={data.bmi} readOnly className="flex-1 px-3 py-2 min-w-0 border-0 bg-transparent focus:outline-none text-card-alt" />
                <span className="text-sm text-muted-alt pr-3">kg/m²</span>
              </div>
              <input type="text" placeholder="Rating" aria-label="BMI Rating" value={ratings.bmi || ''} onChange={(e) => handleRating('bmi', e.target.value)} className={ratingClass} />
            </div>
            {showWaist && (
              <div>
                <label className="block text-sm font-medium text-card-alt mb-2">Waist Circumference</label>
                <div className={wrapClass}>
                  <input type="number" min="30" max="200" step="0.1" aria-label="Waist Circumference" value={data.waistCircumference} onChange={(e) => handleChange('waistCircumference', e.target.value)} className={inputClass} />
                  <span className="text-sm text-muted-alt pr-3">cm</span>
                </div>
                <input type="text" placeholder="Rating" aria-label="Waist Rating" value={ratings.waist || ''} onChange={(e) => handleRating('waist', e.target.value)} className={ratingClass} />
              </div>
            )}
          </div>
        </div>

        {/* Vitals */}
        <div>
          <h3 className="text-sm font-semibold text-muted-alt uppercase tracking-wide mb-2">Vitals</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">Blood Pressure</label>
              <div className="flex items-center gap-1">
                <div className={wrapClass}>
                  <input type="number" min="40" max="300" step="1" data-testid="vitals-systolic" value={data.systolic} onChange={(e) => handleChange('systolic', e.target.value)} placeholder="120" className="w-16 px-1 py-2 border-0 focus:outline-none focus:ring-0 bg-transparent text-card-alt rounded-md" />
                </div>
                <span className="text-muted-alt text-sm">/</span>
                <div className={`${wrapClass} flex-1`}>
                  <input type="number" min="20" max="200" step="1" data-testid="vitals-diastolic" value={data.diastolic} onChange={(e) => handleChange('diastolic', e.target.value)} placeholder="80" className="w-14 px-1 py-2 border-0 focus:outline-none focus:ring-0 bg-transparent text-card-alt rounded-md" />
                  <span className="text-sm text-muted-alt pr-2 flex-1 text-right">mmHg</span>
                </div>
              </div>
              <input type="text" placeholder="Rating" aria-label="BP Rating" value={ratings.bp || ''} onChange={(e) => handleRating('bp', e.target.value)} className={ratingClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">Pulse/Heart Rate</label>
              <div className={wrapClass}>
                <input type="number" min="20" max="300" step="1" data-testid="vitals-heartrate" aria-label="Heart Rate" value={data.heartRate} onChange={(e) => handleChange('heartRate', e.target.value)} className={inputClass} />
                <span className="text-sm text-muted-alt pr-3">bpm</span>
              </div>
              <input type="text" placeholder="Rating" aria-label="HR Rating" value={ratings.hr || ''} onChange={(e) => handleRating('hr', e.target.value)} className={ratingClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">Temperature</label>
              <div className={wrapClass}>
                <input type="number" min="90" max="110" step="0.1" aria-label="Temperature" value={data.temperature} onChange={(e) => handleChange('temperature', e.target.value)} className={inputClass} />
                <span className="text-sm text-muted-alt pr-3">°F</span>
              </div>
              <input type="text" placeholder="Rating" aria-label="Temp Rating" value={ratings.temperature || ''} onChange={(e) => handleRating('temperature', e.target.value)} className={ratingClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">SpO₂</label>
              <div className={wrapClass}>
                <input type="number" min="50" max="100" step="1" data-testid="vitals-spo2" aria-label="Oxygen Saturation" value={data.oxygenSaturation} onChange={(e) => handleChange('oxygenSaturation', e.target.value)} className={inputClass} />
                <span className="text-sm text-muted-alt pr-3">%</span>
              </div>
              <input type="text" placeholder="Rating" aria-label="SpO2 Rating" value={ratings.spo2 || ''} onChange={(e) => handleRating('spo2', e.target.value)} className={ratingClass} />
            </div>
          </div>
        </div>

        </div>
      </div>
    </section>
    </>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'Patient Vitals Section',
  elements: {
    sectionHeader: { text: 'Patient Vitals' },
    collapseToggle: { testId: 'vitals-collapse-toggle' },
    heightInput: { testId: 'vitals-height' },
    weightInput: { testId: 'vitals-weight' },
    bmiInput: { testId: 'vitals-bmi' },
    systolicInput: { testId: 'vitals-systolic' },
    diastolicInput: { testId: 'vitals-diastolic' },
    heartRateInput: { testId: 'vitals-heartrate' },
    oxygenSatInput: { testId: 'vitals-spo2' },
    openTimelineBtn: { testId: 'open-timeline-btn' },
  },
  flows: [
    {
      name: 'fill vitals and verify BMI auto-calculated',
      steps: [
        { on: 'heightInput', do: 'fill', value: '170' },
        { on: 'weightInput', do: 'fill', value: '70' },
        { on: 'bmiInput', expect: 'value', value: '24.22' },
        { on: 'systolicInput', do: 'fill', value: '120' },
        { on: 'diastolicInput', do: 'fill', value: '80' },
        { on: 'heartRateInput', do: 'fill', value: '72' },
        { on: 'oxygenSatInput', do: 'fill', value: '98' },
        { on: 'systolicInput', expect: 'value', value: '120' },
        { on: 'heartRateInput', expect: 'value', value: '72' },
      ],
    },
    {
      name: 'toggle section collapse hides and shows fields',
      steps: [
        { on: 'sectionHeader', expect: 'visible' },
        { on: 'collapseToggle', do: 'click' },
        { on: 'heightInput', expect: 'hidden' },
        { on: 'collapseToggle', do: 'click' },
        { on: 'heightInput', expect: 'visible' },
      ],
    },
  ],
});
