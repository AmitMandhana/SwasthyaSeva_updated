'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FlaskConical, Plus, X, ExternalLink, Loader2 } from 'lucide-react';
import { useToast, Button } from '@swasthyaseva/ui';
import { createTestRequest, deleteTestRequest, getTestResults, type TestRequest, type TestResult } from '../../../lib/api';
import { componentTestSpec } from '@swasthyaseva/test-gen';

interface Props {
  appointmentId: number | null;
  userId: number | null;
  testRequests: TestRequest[];
  onTestRequestsChange: (requests: TestRequest[]) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function LabTests({ appointmentId, userId, testRequests, onTestRequestsChange, isCollapsed, onToggle }: Props) {
  const { addToast } = useToast();
  const [testName, setTestName] = useState('');
  const [adding, setAdding] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const loadResults = useCallback(async () => {
    if (!userId) return;
    setLoadingResults(true);
    try {
      const { results: data } = await getTestResults(userId);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  }, [userId]);

  useEffect(() => { loadResults(); }, [loadResults]);

  const handleAdd = async () => {
    if (!appointmentId || !testName.trim()) return;
    setAdding(true);
    try {
      const { testRequest } = await createTestRequest({ appointmentId, testName: testName.trim() });
      onTestRequestsChange([...testRequests, testRequest]);
      setTestName('');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add test', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (requestId: number) => {
    try {
      await deleteTestRequest(requestId);
      onTestRequestsChange(testRequests.filter(t => t.request_id !== requestId));
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove test', 'error');
    }
  };

  return (
    <section className="bg-card p-6 rounded-lg border border-border mb-6">
      <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={onToggle}>
        <h2 className="text-2xl font-bold text-card-alt flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-primary" />
          Lab Tests
        </h2>
        <button
          type="button"
          data-testid="lab-tests-collapse"
          aria-expanded={!isCollapsed}
          className="text-muted-alt hover:text-card-alt transition-colors"
        >
          <span className={`transform transition-transform duration-200 inline-block ${isCollapsed ? '' : 'rotate-90'}`}>▶</span>
        </button>
      </div>

      <div className={`transition-all duration-200 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'opacity-100'}`}>
        {/* Order Tests */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-card-alt mb-2">Order Tests</h3>
          <div className="flex gap-2">
            <input
              type="text"
              data-testid="lab-test-name-input"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Test name..."
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-inset focus:ring-primary bg-background text-card-alt text-sm"
            />
            <Button
              onClick={handleAdd}
              disabled={adding || !testName.trim()}
              size="sm"
              icon={adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            >
              Add
            </Button>
          </div>

          {testRequests.length > 0 && (
            <div className="mt-2 space-y-1">
              {testRequests.map((tr) => (
                <div key={tr.request_id} className="flex items-center justify-between bg-muted/50 rounded px-3 py-1.5 text-sm">
                  <span data-testid="ordered-test-item">{tr.test_name}</span>
                  <button data-testid="remove-test-btn" onClick={() => handleRemove(tr.request_id)} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {testRequests.length === 0 && <p className="text-xs text-muted-alt mt-1">No tests ordered</p>}
        </div>

        {/* Past Results */}
        <div>
          <h3 className="text-sm font-semibold text-card-alt mb-2">Past Results</h3>
          {loadingResults ? (
            <div className="flex items-center gap-2 text-sm text-muted-alt">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted-alt">No past results</p>
          ) : (
            <div className="space-y-1">
              {results.map((r) => (
                <div key={r.request_id} className="flex items-center justify-between bg-muted/30 rounded px-3 py-1.5 text-sm">
                  <div>
                    <span className="font-medium">{r.test_name}</span>
                    {r.test_date && <span className="text-muted-alt ml-2 text-xs">{r.test_date}</span>}
                  </div>
                  {r.test_report_link && (
                    <a href={r.test_report_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard/consultation/test-id',
  app: 'doctor',
  title: 'Lab Tests Section',
  elements: {
    sectionHeader: { text: 'Lab Tests' },
    collapseToggle: { testId: 'lab-tests-collapse' },
    orderTestsHeading: { text: 'Order Tests' },
    testNameInput: { testId: 'lab-test-name-input' },
    addTestBtn: { text: 'Add' },
    orderedTestItem: { testId: 'ordered-test-item' },
    removeTestBtn: { testId: 'remove-test-btn' },
    noTestsMsg: { text: 'No tests ordered' },
    pastResultsHeading: { text: 'Past Results' },
    viewReportLink: { text: 'View' },
  },
  flows: [
    {
      name: 'order a lab test',
      steps: [
        { on: 'testNameInput', do: 'fill', value: 'Complete Blood Count' },
        { on: 'addTestBtn', do: 'click' },
        { on: 'orderedTestItem', expect: 'visible' },
      ],
    },
    {
      name: 'remove an ordered test',
      after: 'order a lab test',
      steps: [
        { on: 'removeTestBtn', do: 'click' },
        { on: 'noTestsMsg', expect: 'visible' },
      ],
    },
    {
      name: 'toggle section collapse',
      steps: [
        { on: 'collapseToggle', do: 'click' },
        { on: 'testNameInput', expect: 'hidden' },
        { on: 'collapseToggle', do: 'click' },
        { on: 'testNameInput', expect: 'visible' },
      ],
    },
    {
      name: 'ordered test persists after page reload',
      after: 'order a lab test',
      steps: [
        { do: 'reload' },
        { on: 'orderedTestItem', do: 'waitFor' },
        { on: 'orderedTestItem', expect: 'visible' },
      ],
    },
  ],
});
