import React, { useState, useEffect, useRef } from 'react';
import { Pill, Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Medication } from '../types';
import { medicines } from '../constants/medicines';
import { componentTestSpec } from '@swasthyaseva/test-gen';

const MEDICATION_TYPES = ['tablet', 'capsule', 'pill', 'powder', 'logens', 'aquaous_sol', 'suspension', 'drops', 'syrup', 'linctus', 'elixir', 'injection', 'paste', 'gel', 'ointment'];
const ROUTES = ['oral', 'sublingual', 'topical_rectal', 'rectal', 'cutaneous', 'skin', 'eye', 'ear', 'nail', 'deeper_tissue', 'inhalation', 'nasal', 'subcutaneous', 'intramuscular', 'intraveinous', 'intradermal', 'arterial_supply'];

interface Props {
  medications: Medication[];
  onChange: (medications: Medication[]) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  readOnly?: boolean;
}

function summarizeMed(med: Medication): string {
  const parts: string[] = [];
  if (med.medicationType && med.medicationType !== 'tablet') parts.push(med.medicationType.replace(/_/g, ' '));
  else parts.push('Tab');
  parts.push(med.medication);
  if (med.amount) parts.push(med.amount);
  if (med.frequency) parts.push(med.frequency);
  if (med.timings) parts.push(med.timings);
  if (med.conditional) parts.push(med.conditional);
  if (med.route && med.route !== 'oral') parts.push(med.route.replace(/_/g, ' '));
  if (med.duration) parts.push(`for ${med.duration} days`);
  return parts.filter(Boolean).join(' ');
}

export default function Medications({ medications, onChange, isCollapsed, onToggle, readOnly }: Props) {
  const [expandedInstructions, setExpandedInstructions] = useState<Set<number>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [searchTerms, setSearchTerms] = useState<Map<number, string>>(new Map());
  const [filteredMedicines, setFilteredMedicines] = useState<Map<number, string[]>>(new Map());
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown !== null) {
        const dropdownElement = dropdownRefs.current.get(activeDropdown);
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setActiveDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const newFiltered = new Map<number, string[]>();
      
      searchTerms.forEach((term, index) => {
        if (term.trim()) {
          const filtered = medicines.filter(medicine =>
            medicine.toLowerCase().includes(term.toLowerCase())
          );
          newFiltered.set(index, filtered);
        }
      });

      setFilteredMedicines(newFiltered);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerms]);

  const toggleInstructions = (index: number) => {
    const newExpanded = new Set(expandedInstructions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedInstructions(newExpanded);
  };

  const handleAddMedication = () => {
    const emptyIdx = medications.findIndex(m => !m.medication.trim());
    if (emptyIdx !== -1) {
      setExpandedCards(new Set([emptyIdx]));
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('[data-testid="medication-search-input"]');
        inputs[emptyIdx]?.focus();
      }, 350);
      return;
    }
    const newMedication: Medication = {
      medication: '',
      medicationType: 'tablet',
      route: 'oral',
      amount: '',
      frequency: '',
      timings: '',
      conditional: '',
      duration: '',
      specialInstructions: '',
    };
    onChange([...medications, newMedication]);
    setExpandedCards(new Set([medications.length]));
  };

  const handleRemoveMedication = (index: number) => {
    onChange(medications.filter((_, i) => i !== index));
    const newExpanded = new Set(expandedInstructions);
    newExpanded.delete(index);
    setExpandedInstructions(newExpanded);
    const newCards = new Set<number>();
    expandedCards.forEach(i => { if (i < index) newCards.add(i); else if (i > index) newCards.add(i - 1); });
    setExpandedCards(newCards);
    
    // Clean up search state
    const newSearchTerms = new Map(searchTerms);
    newSearchTerms.delete(index);
    setSearchTerms(newSearchTerms);
    
    const newFiltered = new Map(filteredMedicines);
    newFiltered.delete(index);
    setFilteredMedicines(newFiltered);
    
    dropdownRefs.current.delete(index);
  };

  const handleMedicationChange = (index: number, field: keyof Medication, value: string) => {
    const updated = medications.map((med, i) => 
      i === index ? { ...med, [field]: value } : med
    );
    onChange(updated);
  };

  const handleSearchChange = (index: number, value: string) => {
    const newSearchTerms = new Map(searchTerms);
    newSearchTerms.set(index, value);
    setSearchTerms(newSearchTerms);
    setActiveDropdown(index);
    
    // Update the medication field with the search term
    handleMedicationChange(index, 'medication', value);
  };

  const handleSelectMedicine = (index: number, medicine: string) => {
    handleMedicationChange(index, 'medication', medicine);
    
    const newSearchTerms = new Map(searchTerms);
    newSearchTerms.delete(index);
    setSearchTerms(newSearchTerms);
    
    setActiveDropdown(null);
  };

  return (
    <section className="bg-card p-6 rounded-lg border border-border h-full relative">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
          <h2 className="text-2xl font-bold text-card-alt flex items-center gap-2">
            <Pill className="w-6 h-6 text-primary" />
            Medications
          </h2>
          <button
            type="button"
            data-testid="medications-collapse-toggle"
            aria-expanded={!isCollapsed}
            className="text-card-alt hover:text-card-alt transition-colors"
          >
            <span className={`transform transition-transform duration-200 inline-block ${isCollapsed ? '' : 'rotate-90'}`}>
              ▶
            </span>
          </button>
        </div>
        {!readOnly && (
          <button
            onClick={(e) => { e.stopPropagation(); handleAddMedication(); }}
            data-testid="add-medication-btn"
            className="bg-primary hover:opacity-90 text-primary-alt px-4 py-2 rounded-md transition-colors whitespace-nowrap text-sm"
          >
            + Add Medication
          </button>
        )}
      </div>

      <div className={`transition-all duration-200 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[2000px] opacity-100 overflow-visible'}`}>
        <div className="space-y-6">
        {medications.length === 0 ? (
          <p className="text-muted-alt text-center py-4">No medications added yet. Click &quot;Add Medication&quot; to start.</p>
        ) : (
          medications.map((med, index) => {
            const isExpanded = expandedCards.has(index);
            const hasMedName = !!med.medication.trim();

            return (
            <div key={index} className="border border-input rounded-md overflow-hidden transition-all duration-300 ease-in-out">
              {/* Collapsed header — always visible */}
              <div
                data-testid="medication-card-header"
                className={`flex items-center gap-2 px-4 py-2.5 group cursor-pointer hover:bg-muted/30 transition-colors ${isExpanded ? 'border-b border-input' : ''}`}
                onClick={() => setExpandedCards(prev => prev.has(index) ? new Set() : new Set([index]))}
              >
                <span className="text-xs text-muted-alt font-medium shrink-0">{index + 1}.</span>
                <span className="flex-1 text-sm text-card-alt truncate">{hasMedName ? summarizeMed(med) : 'New medication...'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedCards(prev => prev.has(index) ? new Set() : new Set([index])); }}
                  className="shrink-0 p-0.5 text-muted-alt hover:text-card-alt transition-colors"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {!readOnly && (
                  <button
                    data-testid="medication-remove-btn"
                    onClick={(e) => { e.stopPropagation(); handleRemoveMedication(index); }}
                    className="shrink-0 p-0.5 text-muted-alt hover:text-destructive transition-colors"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Expandable content */}
              {isExpanded && <div>
              <div className="p-4">

              <div className="space-y-3">
                <div className="relative" ref={(el) => {
                  if (el) dropdownRefs.current.set(index, el);
                }}>
                  <label className="block text-sm font-medium text-card-alt mb-2">
                    Medication
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-alt" />
                    <input
                      type="text"
                      data-testid="medication-search-input"
                      value={med.medication}
                      onChange={(e) => handleSearchChange(index, e.target.value)}
                      onFocus={() => setActiveDropdown(index)}
                      placeholder="Search medication..."
                      className="w-full pl-10 pr-4 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt"
                    />
                  </div>
                  
                  {activeDropdown === index && filteredMedicines.get(index) && filteredMedicines.get(index)!.length > 0 && (
                    <div data-testid="medication-dropdown" className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredMedicines.get(index)!.map((medicine, medIndex) => (
                        <button
                          key={medIndex}
                          type="button"
                          data-testid="medication-dropdown-option"
                          onClick={() => handleSelectMedicine(index, medicine)}
                          className="w-full text-left px-4 py-2 hover:bg-muted text-card-alt transition-colors"
                        >
                          {medicine}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-card-alt mb-2">Type</label>
                    <select
                      data-testid="medication-type"
                      value={med.medicationType}
                      onChange={(e) => handleMedicationChange(index, 'medicationType', e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt capitalize"
                    >
                      {MEDICATION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-card-alt mb-2">Route</label>
                    <select
                      data-testid="medication-route"
                      value={med.route}
                      onChange={(e) => handleMedicationChange(index, 'route', e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt capitalize"
                    >
                      {ROUTES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-card-alt mb-2">Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      data-testid="medication-amount"
                      value={med.amount}
                      onChange={(e) => handleMedicationChange(index, 'amount', e.target.value)}
                      placeholder="e.g., 1"
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-card-alt mb-2">Duration (days)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      data-testid="medication-duration"
                      value={med.duration}
                      onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                      placeholder="e.g., 7"
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-card-alt mb-2">Frequency</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="1"
                      data-testid="medication-frequency"
                      value={med.frequency}
                      onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                      placeholder="e.g., 3"
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-card-alt mb-2">Timings</label>
                    <input
                      type="text"
                      data-testid="medication-timings"
                      value={med.timings}
                      onChange={(e) => handleMedicationChange(index, 'timings', e.target.value)}
                      placeholder="e.g., After food"
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-card-alt mb-2">Conditional</label>
                    <input
                      type="text"
                      data-testid="medication-conditional"
                      value={med.conditional}
                      onChange={(e) => handleMedicationChange(index, 'conditional', e.target.value)}
                      placeholder="e.g., For fever/pain"
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => toggleInstructions(index)}
                    className="text-sm text-card-alt hover:text-card-alt font-medium flex items-center gap-1 transition-colors"
                  >
                    <span className={`transform transition-transform duration-200 ${expandedInstructions.has(index) ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                    Special Instructions
                  </button>
                  <div 
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                      expandedInstructions.has(index) ? 'max-h-32 mt-2 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <textarea
                      data-testid="medication-special-instructions"
                      value={med.specialInstructions}
                      onChange={(e) => handleMedicationChange(index, 'specialInstructions', e.target.value)}
                      rows={2}
                      placeholder="Enter special instructions..."
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt"
                    />
                  </div>
                </div>
              </div>
              </div>
              </div>}
            </div>
          );
          })
        )}
        </div>
      </div>
    </section>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'Medications Section',
  elements: {
    sectionHeader: { text: 'Medications' },
    collapseToggle: { testId: 'medications-collapse-toggle' },
    addMedicationBtn: { text: '+ Add Medication' },
    emptyMessage: { text: 'No medications added yet.' },
    medicationSearchInput: { testId: 'medication-search-input' },
    medicationDropdown: { testId: 'medication-dropdown-option' },
    amountInput: { testId: 'medication-amount' },
    frequencyInput: { testId: 'medication-frequency' },
    timingsInput: { testId: 'medication-timings' },
    conditionalInput: { testId: 'medication-conditional' },
    durationInput: { testId: 'medication-duration' },
    specialInstructionsToggle: { text: 'Special Instructions' },
    specialInstructionsInput: { testId: 'medication-special-instructions' },
    removeMedicationBtn: { testId: 'medication-remove-btn' },
    medicationTypeSelect: { testId: 'medication-type' },
    medicationRouteSelect: { testId: 'medication-route' },
    medicationDropdownContainer: { testId: 'medication-dropdown' },
    medicationCardHeader: { testId: 'medication-card-header' },
  },
  flows: [
    {
      name: 'add a medication and verify in list',
      steps: [
        { on: 'emptyMessage', expect: 'visible' },
        { on: 'addMedicationBtn', do: 'click' },
        { on: 'emptyMessage', expect: 'hidden' },
        { on: 'medicationSearchInput', expect: 'visible' },
        { on: 'medicationSearchInput', do: 'fill', value: 'Para' },
        { on: 'medicationDropdown', expect: 'countMin', value: 1 },
        { on: 'medicationDropdown', do: 'click' },
        { on: 'amountInput', do: 'fill', value: '2' },
        { on: 'frequencyInput', do: 'fill', value: '3' },
        { on: 'timingsInput', do: 'fill', value: 'Morning & Evening' },
        { on: 'conditionalInput', do: 'fill', value: 'After meals' },
        { on: 'durationInput', do: 'fill', value: '7' },
        { on: 'amountInput', expect: 'value', value: '2' },
        { on: 'frequencyInput', expect: 'value', value: '3' },
      ],
    },
    {
      name: 'expand special instructions shows textarea',
      after: 'add a medication and verify in list',
      steps: [
        { on: 'specialInstructionsToggle', do: 'click' },
        { on: 'specialInstructionsInput', expect: 'visible' },
        { on: 'specialInstructionsInput', do: 'fill', value: 'Take with plenty of water' },
        { on: 'specialInstructionsInput', expect: 'value', value: 'Take with plenty of water' },
      ],
    },
    {
      name: 'remove a medication restores empty state',
      after: 'add a medication and verify in list',
      steps: [
        { on: 'removeMedicationBtn', do: 'click' },
        { on: 'emptyMessage', expect: 'visible' },
      ],
    },

    // --- P0: Medication type and route dropdowns have options ---
    {
      name: 'medication type and route dropdowns have options',
      after: 'add a medication and verify in list',
      steps: [
        { on: 'medicationTypeSelect', expect: 'visible' },
        { on: 'medicationRouteSelect', expect: 'visible' },
      ],
    },

    // --- P0: Search nonexistent medication shows no dropdown ---
    {
      name: 'search nonexistent medication shows no dropdown',
      after: 'add a medication and verify in list',
      steps: [
        { on: 'medicationSearchInput', do: 'fill', value: 'zzz_nonexistent_med_999' },
        { on: 'medicationDropdownContainer', expect: 'hidden' },
      ],
    },
  ],
});
