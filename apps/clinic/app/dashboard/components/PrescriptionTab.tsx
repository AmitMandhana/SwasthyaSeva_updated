'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePagination } from '@swasthyaseva/ui';
import { getPrescriptions, getPrescriptionDetail, type PrescriptionListItem, type PrescriptionDetail } from '../../../lib/api';

function fmtDate(raw: string) {
  try {
    return new Date(raw).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return raw; }
}

const PAGE_SIZE = 20;

export default function PrescriptionTab() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PrescriptionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const pag = usePagination(PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { prescriptions: data, total: t } = await getPrescriptions({
        limit: PAGE_SIZE,
        offset: pag.offset,
      });
      setPrescriptions(data);
      pag.setTotal(t);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pag.page]);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = async (appointmentId: number) => {
    setLoadingDetail(true);
    try {
      const d = await getPrescriptionDetail(appointmentId);
      setDetail(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div>
      {/* Detail Modal */}
      {detail && (
        <div data-testid="rx-detail-overlay" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)} onKeyDown={e => { if (e.key === 'Escape') setDetail(null); }} tabIndex={-1} ref={(el) => el?.focus()}>
          <div className="bg-card rounded-lg p-6 max-w-lg w-full border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 data-testid="rx-detail-title" className="text-lg font-bold text-card-alt">Prescription Details</h3>
              <button data-testid="rx-detail-close" onClick={() => setDetail(null)} className="text-muted-alt hover:text-card-alt text-xl">&times;</button>
            </div>
            <div className="space-y-3 text-sm">
              <div data-testid="rx-detail-patient"><span className="font-medium">Patient:</span> {detail.patientName}</div>
              <div data-testid="rx-detail-doctor"><span className="font-medium">Doctor:</span> {detail.doctorName}</div>
              <div data-testid="rx-detail-date"><span className="font-medium">Date:</span> {fmtDate(detail.date)}</div>
              <div data-testid="rx-detail-status"><span className="font-medium">Status:</span> {detail.status}</div>
              <div data-testid="rx-detail-complaint"><span className="font-medium">Chief Complaint:</span> {detail.chiefComplain}</div>
              {detail.finalDiagnosis && <div data-testid="rx-detail-diagnosis"><span className="font-medium">Final Diagnosis:</span> {detail.finalDiagnosis}</div>}
              <div data-testid="rx-detail-medications"><span className="font-medium">Medications:</span> {detail.medicationCount} prescribed</div>
              <div data-testid="rx-detail-tests"><span className="font-medium">Lab Tests:</span> {detail.testRequestCount} ordered</div>
            </div>
            <p className="text-xs text-muted-alt mt-4 italic">Detailed medical information is restricted to the prescribing doctor and patient.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <FileText data-testid="rx-header-icon" className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-card-alt">Prescriptions</h2>
      </div>

      {/* Table */}
      {loading ? (
        <div data-testid="rx-loading" className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : prescriptions.length === 0 ? (
        <p className="text-center text-muted-alt py-12">No prescriptions found</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table data-testid="rx-table" className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-muted-alt">Patient</th>
                  <th className="text-left p-3 font-medium text-muted-alt">Doctor</th>
                  <th className="text-left p-3 font-medium text-muted-alt">Date</th>
                  <th className="text-left p-3 font-medium text-muted-alt">Status</th>
                  <th className="text-left p-3 font-medium text-muted-alt">Chief Complaint</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p, pIdx) => (
                  <tr
                    key={p.appointmentId}
                    {...(pIdx === 0 ? { "data-testid": "rx-row" } : {})}
                    onClick={() => handleRowClick(p.appointmentId)}
                    className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 text-card-alt">{p.patientName}</td>
                    <td className="p-3 text-card-alt">{p.doctorName}</td>
                    <td className="p-3 text-card-alt">{fmtDate(p.date)}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-card-alt truncate max-w-[200px]">{p.chiefComplain}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="block md:hidden space-y-2">
            {prescriptions.map((p) => (
              <div
                key={p.appointmentId}
                onClick={() => handleRowClick(p.appointmentId)}
                className="bg-card rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-base font-semibold text-card-alt">{p.patientName}</p>
                    <p className="text-sm text-muted-alt">{p.doctorName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm text-muted-alt">{fmtDate(p.date)}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      p.status === 'completed' ? 'bg-success/15 text-success' : 'bg-muted text-muted-alt'
                    }`}>{p.status}</span>
                  </div>
                </div>
                {p.chiefComplain && (
                  <p className="text-sm text-muted-alt mt-2 line-clamp-2">{p.chiefComplain}</p>
                )}
              </div>
            ))}
          </div>

          {/* Total count + Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm">
            <span data-testid="rx-total-count" className="text-muted-alt">{pag.total} total</span>
            {pag.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button data-testid="rx-prev-page" onClick={() => pag.goPrev()} disabled={!pag.hasPrev} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span data-testid="rx-page-indicator" className="text-card-alt">{pag.page + 1} / {pag.totalPages}</span>
                <button data-testid="rx-next-page" onClick={() => pag.goNext()} disabled={!pag.hasNext} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {loadingDetail && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}

import { componentTestSpec } from '@swasthyaseva/test-gen';

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'clinic',
  title: 'Prescription Tab',
  elements: {
    prescriptionsTab: { role: 'button', name: /Prescriptions/ },
    header: { role: 'heading', name: 'Prescriptions' },
    headerIcon: { testId: 'rx-header-icon' },
    prescriptionTable: { testId: 'rx-table' },
    tableRows: { testId: 'rx-row' },
    loadingSpinner: { testId: 'rx-loading' },
    emptyMessage: { text: 'No prescriptions found' },
    detailOverlay: { testId: 'rx-detail-overlay' },
    detailTitle: { testId: 'rx-detail-title' },
    detailPatient: { testId: 'rx-detail-patient' },
    detailDoctor: { testId: 'rx-detail-doctor' },
    detailDate: { testId: 'rx-detail-date' },
    detailStatus: { testId: 'rx-detail-status' },
    detailComplaint: { testId: 'rx-detail-complaint' },
    detailMedications: { testId: 'rx-detail-medications' },
    detailCloseBtn: { testId: 'rx-detail-close' },
    prevPageBtn: { testId: 'rx-prev-page' },
    nextPageBtn: { testId: 'rx-next-page' },
    totalCount: { testId: 'rx-total-count' },
    pageIndicator: { testId: 'rx-page-indicator' },
  },
  flows: [
    {
      name: 'view prescription list with loaded data',
      steps: [
        { do: 'click', on: 'prescriptionsTab' },
        { do: 'waitFor', on: 'header' },
        { expect: 'visible', on: 'prescriptionTable' },
        { expect: 'visible', on: 'totalCount' },
      ],
    },
    {
      name: 'open prescription detail shows content and close hides it',
      after: 'view prescription list with loaded data',
      steps: [
        { do: 'click', on: 'tableRows' },
        { expect: 'visible', on: 'detailOverlay' },
        { expect: 'visible', on: 'detailTitle' },
        { do: 'click', on: 'detailCloseBtn' },
        { expect: 'hidden', on: 'detailOverlay' },
      ],
    },
    {
      name: 'close prescription detail via escape key',
      after: 'view prescription list with loaded data',
      steps: [
        { do: 'click', on: 'tableRows' },
        { expect: 'visible', on: 'detailOverlay' },
        { do: 'press', on: 'detailOverlay', value: 'Escape' },
        { expect: 'hidden', on: 'detailOverlay' },
      ],
    },
    {
      name: 'paginate prescription list via next and previous buttons',
      after: 'view prescription list with loaded data',
      steps: [
        { do: 'click', on: 'nextPageBtn' },
        { expect: 'visible', on: 'pageIndicator' },
        { do: 'click', on: 'prevPageBtn' },
        { expect: 'visible', on: 'pageIndicator' },
      ],
    },
    {
      name: 'first page has previous button disabled',
      after: 'view prescription list with loaded data',
      steps: [
        { expect: 'disabled', on: 'prevPageBtn' },
      ],
    },
    {
      name: 'prescription detail shows patient doctor and medication content',
      after: 'view prescription list with loaded data',
      steps: [
        { do: 'click', on: 'tableRows' },
        { expect: 'visible', on: 'detailOverlay' },
        { expect: 'visible', on: 'detailTitle' },
        { expect: 'visible', on: 'detailPatient' },
        { expect: 'visible', on: 'detailDoctor' },
        { expect: 'visible', on: 'detailDate' },
        { expect: 'visible', on: 'detailStatus' },
        { expect: 'visible', on: 'detailComplaint' },
        { expect: 'visible', on: 'detailMedications' },
        { do: 'click', on: 'detailCloseBtn' },
        { expect: 'hidden', on: 'detailOverlay' },
      ],
    },
  ],
});
