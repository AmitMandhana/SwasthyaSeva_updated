'use client';

import React, { useState, useEffect } from 'react';
import { X, Activity, Heart, Wind, Droplet, Weight, Ruler, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getVitalsHistory, type ExaminationRecord } from '../../../lib/api';
import { componentTestSpec } from '@swasthyaseva/test-gen';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId?: number | null;
}

type TabType = 'bp' | 'hr' | 'resp' | 'o2' | 'height' | 'weight';

export default function VitalsTimelineModal({ isOpen, onClose, userId }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('bp');
  const [apiData, setApiData] = useState<ExaminationRecord[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      setLoading(true);
      getVitalsHistory(userId)
        .then(({ history }) => setApiData(history))
        .catch(() => setApiData(null))
        .finally(() => setLoading(false));
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const formatDate = (timestamp: string) => {
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const hasData = apiData && apiData.length > 0;
  const rawData = hasData
    ? apiData.map(r => ({
        timestamp: r.appointment_date || '',
        height: r.height,
        weight: r.weight,
        bp_systolic: r.sp_systolic,
        bp_diastolic: r.bp_diastolic,
        heart_rate: r.heart_rate,
        respiratory_rate: r.respiratory_rate,
        oxygen_saturation: r.oxygen_saturation,
      }))
    : [];

  const formattedData = rawData.map(reading => ({
    ...reading,
    dateNum: new Date(reading.timestamp).getTime(),
    date: formatDate(reading.timestamp),
  }));

  const tabs = [
    { id: 'bp' as TabType, label: 'Blood Pressure', icon: Activity },
    { id: 'hr' as TabType, label: 'Heart Rate', icon: Heart },
    { id: 'resp' as TabType, label: 'Respiratory Rate', icon: Wind },
    { id: 'o2' as TabType, label: 'Oxygen Saturation', icon: Droplet },
    { id: 'height' as TabType, label: 'Height', icon: Ruler },
    { id: 'weight' as TabType, label: 'Weight', icon: Weight },
  ];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-lg shadow-xl max-w-7xl w-full border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="bg-card border-b border-border p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-card-alt">Vitals Timeline</h2>
          <button
            data-testid="vitals-timeline-close"
            onClick={onClose}
            className="text-muted-alt hover:text-card-alt transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  data-testid={`vitals-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary bg-muted'
                      : 'text-muted-alt hover:text-card-alt hover:bg-muted/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-alt">Loading vitals history...</span>
            </div>
          )}

          {!loading && !hasData && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="w-10 h-10 text-muted-alt mb-3" />
              <p className="text-sm font-medium text-card-alt">No vitals history</p>
              <p className="text-xs text-muted-alt mt-1">Vitals will appear here once recorded during consultations.</p>
            </div>
          )}

          {!loading && hasData && activeTab === 'bp' && (
            <div>
              <h3 className="text-lg font-semibold text-card-alt mb-4">Blood Pressure (mmHg)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="dateNum" 
                    stroke="var(--muted-alt)" 
                    type="number" 
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => {
                      const d = new Date(value);
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = String(d.getFullYear()).slice(-2);
                      return `${day}/${month}/${year}`;
                    }}
                  />
                  <YAxis stroke="var(--muted-alt)" />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const d = new Date(value);
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = String(d.getFullYear()).slice(-2);
                      return `${day}/${month}/${year}`;
                    }}
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--card-alt)'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="bp_systolic" stroke="#0080ff" name="Systolic" strokeWidth={2} />
                  <Line type="monotone" dataKey="bp_diastolic" stroke="#16a085" name="Diastolic" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {!loading && hasData && activeTab === 'hr' && (
            <div>
              <h3 className="text-lg font-semibold text-card-alt mb-4">Heart Rate (bpm)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="dateNum" 
                    stroke="var(--muted-alt)" 
                    type="number" 
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => {
                      const d = new Date(value);
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = String(d.getFullYear()).slice(-2);
                      return `${day}/${month}/${year}`;
                    }}
                  />
                  <YAxis stroke="var(--muted-alt)" />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const d = new Date(value);
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = String(d.getFullYear()).slice(-2);
                      return `${day}/${month}/${year}`;
                    }}
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--card-alt)'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="heart_rate" stroke="#ef4444" name="Heart Rate" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {!loading && hasData && activeTab === 'resp' && (
            <div>
              <h3 className="text-lg font-semibold text-card-alt mb-4">Respiratory Rate (bpm)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="dateNum" 
                    stroke="var(--muted-alt)" 
                    type="number" 
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => {
                      const d = new Date(value);
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = String(d.getFullYear()).slice(-2);
                      return `${day}/${month}/${year}`;
                    }}
                  />
                  <YAxis stroke="var(--muted-alt)" />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const d = new Date(value);
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = String(d.getFullYear()).slice(-2);
                      return `${day}/${month}/${year}`;
                    }}
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--card-alt)'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="respiratory_rate" stroke="#f59e0b" name="Respiratory Rate" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {!loading && hasData && activeTab === 'o2' && (
            <div>
              <h3 className="text-lg font-semibold text-card-alt mb-4">Oxygen Saturation (%)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="dateNum" 
                    stroke="var(--muted-alt)" 
                    type="number" 
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => {
                      const d = new Date(value);
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = String(d.getFullYear()).slice(-2);
                      return `${day}/${month}/${year}`;
                    }}
                  />
                  <YAxis stroke="var(--muted-alt)" />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const d = new Date(value);
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = String(d.getFullYear()).slice(-2);
                      return `${day}/${month}/${year}`;
                    }}
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--card-alt)'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="oxygen_saturation" stroke="#22c55e" name="Oxygen Saturation" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {!loading && hasData && activeTab === 'height' && (
            <div>
              <h3 className="text-lg font-semibold text-card-alt mb-4">Height (cm)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="dateNum" 
                    stroke="var(--muted-alt)" 
                    type="number" 
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => {
                      const d = new Date(value);
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = String(d.getFullYear()).slice(-2);
                      return `${day}/${month}/${year}`;
                    }}
                  />
                  <YAxis stroke="var(--muted-alt)" />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const d = new Date(value);
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = String(d.getFullYear()).slice(-2);
                      return `${day}/${month}/${year}`;
                    }}
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--card-alt)'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="height" stroke="#3b82f6" name="Height" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {!loading && hasData && activeTab === 'weight' && (
            <div>
              <h3 className="text-lg font-semibold text-card-alt mb-4">Weight (kg)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="dateNum" 
                    stroke="var(--muted-alt)" 
                    type="number" 
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => {
                      const d = new Date(value);
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = String(d.getFullYear()).slice(-2);
                      return `${day}/${month}/${year}`;
                    }}
                  />
                  <YAxis stroke="var(--muted-alt)" />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const d = new Date(value);
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = String(d.getFullYear()).slice(-2);
                      return `${day}/${month}/${year}`;
                    }}
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--card-alt)'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="weight" stroke="#8b5cf6" name="Weight" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'Vitals Timeline Modal',
  elements: {
    openTimelineBtn: { text: 'Open Timeline' },
    modalTitle: { text: 'Vitals Timeline' },
    closeBtn: { testId: 'vitals-timeline-close' },
    bpTab: { testId: 'vitals-tab-bp' },
    hrTab: { testId: 'vitals-tab-hr' },
    respTab: { testId: 'vitals-tab-resp' },
    o2Tab: { testId: 'vitals-tab-o2' },
    heightTab: { testId: 'vitals-tab-height' },
    weightTab: { testId: 'vitals-tab-weight' },
    bpChart: { text: 'Blood Pressure (mmHg)' },
    hrChart: { text: 'Heart Rate (bpm)' },
    respChart: { text: 'Respiratory Rate (bpm)' },
    o2Chart: { text: 'Oxygen Saturation (%)' },
    heightChart: { text: 'Height (cm)' },
    weightChart: { text: 'Weight (kg)' },
    // Empty state shown when patient has no vitals history
    emptyStateMessage: { text: 'No vitals history' },
  },
  flows: [
    {
      name: 'open modal and view blood pressure chart data',
      steps: [
        { on: 'openTimelineBtn', do: 'click' },
        { on: 'modalTitle', expect: 'visible' },
        { on: 'bpChart', expect: 'visible' },
        { on: 'bpTab', expect: 'hasClass', value: 'border-primary' },
      ],
    },
    {
      name: 'switch tabs shows corresponding chart content',
      after: 'open modal and view blood pressure chart data',
      steps: [
        { on: 'hrTab', do: 'click' },
        { on: 'hrChart', expect: 'visible' },
        { on: 'bpChart', expect: 'hidden' },
        { on: 'respTab', do: 'click' },
        { on: 'respChart', expect: 'visible' },
        { on: 'hrChart', expect: 'hidden' },
        { on: 'o2Tab', do: 'click' },
        { on: 'o2Chart', expect: 'visible' },
        { on: 'heightTab', do: 'click' },
        { on: 'heightChart', expect: 'visible' },
        { on: 'weightTab', do: 'click' },
        { on: 'weightChart', expect: 'visible' },
      ],
    },
    {
      name: 'close modal hides it',
      after: 'open modal and view blood pressure chart data',
      steps: [
        { on: 'closeBtn', do: 'click' },
        { on: 'modalTitle', expect: 'hidden' },
      ],
    },
    // TODO: P0 - Empty state flow for patient with no vitals history.
    // Requires a separate seedApi that creates an appointment for a patient
    // with no prior examination records. The emptyStateMessage element is
    // defined above but cannot be tested with the current seed data which
    // always includes vitals from the consultation flow.
  ],
});
