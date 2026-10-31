"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Badge, Modal, TextField, SelectField, Button, useToast, ListToolbar, SegmentedControl, usePagination, PaginationBar, Input } from "@swasthyaseva/ui";
import { getLeads, createLead, updateLead, type Lead } from "@/lib/api";

const STATUS_COLORS: Record<string, "default" | "primary" | "success" | "warning" | "danger"> = {
  new: "primary",
  contacted: "warning",
  booked: "success",
  lost: "default",
};

const SOURCE_LABELS: Record<string, string> = {
  slot_search: "Slot Search",
  clinic_page: "Clinic Page",
  phone: "Phone",
  walkin: "Walk-in",
  other: "Other",
};

export default function LeadTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState({ patient_name: "", patient_phone: "", symptom_text: "", source: "other", status: "new", notes: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const PAGE_SIZE = 20;
  const pag = usePagination(PAGE_SIZE);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    try {
      const res = await getLeads({
        status: statusFilter || undefined,
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: pag.offset,
      });
      if (reqId !== requestIdRef.current) return;
      setLeads(res.inquiries);
      pag.setTotal(res.total);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      console.error(err);
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [statusFilter, search, pag.page]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm({ patient_name: "", patient_phone: "", symptom_text: "", source: "other", status: "new", notes: "" });
    setFormError(""); setEditing(null); setModal("create");
  }

  function openEdit(lead: Lead) {
    setForm({
      patient_name: lead.patient_name,
      patient_phone: lead.patient_phone,
      symptom_text: lead.symptom_text || "",
      source: lead.source,
      status: lead.status,
      notes: lead.notes || "",
    });
    setFormError(""); setEditing(lead); setModal("edit");
  }

  async function handleSubmit() {
    setFormError(""); setSubmitting(true);
    try {
      if (modal === "create") {
        if (!form.patient_name || !form.patient_phone) {
          setFormError("Name and phone are required"); setSubmitting(false); return;
        }
        await createLead({
          patient_name: form.patient_name,
          patient_phone: form.patient_phone,
          symptom_text: form.symptom_text || null,
          source: form.source,
          notes: form.notes || null,
        });
        await load(); setModal(null); addToast("Lead created", "success");
      } else if (modal === "edit" && editing) {
        const data: Record<string, string | null> = {};
        if (form.status !== editing.status) data.status = form.status;
        if (form.notes !== (editing.notes || "")) data.notes = form.notes || null;
        if (Object.keys(data).length === 0) { setFormError("No changes"); setSubmitting(false); return; }
        await updateLead(editing.inquiry_id, data);
        await load(); setModal(null); addToast("Lead updated", "success");
      }
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  // Status summary
  const statusCounts = { new: 0, contacted: 0, booked: 0, lost: 0 };
  leads.forEach((l) => { if (l.status in statusCounts) statusCounts[l.status as keyof typeof statusCounts]++; });

  return (
    <div>
      {/* Summary cards */}
      <div data-testid="lead-status-cards" className="grid grid-cols-4 gap-3 mb-6">
        {(Object.entries(statusCounts) as [string, number][]).map(([key, val]) => (
          <div key={key} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-alt uppercase">{key}</p>
            <p className="text-2xl font-bold text-card-alt mt-1">{val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <ListToolbar onRefresh={load} loading={loading} refreshTestId="lead-refresh-btn"
        actionLabel="Add Lead" actionTestId="btn-add-lead" onAction={openCreate} actionClassName="ml-auto">
        <Input
          data-testid="lead-search"
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); pag.reset(); setLoading(true); }}
          placeholder="Search name or phone..."
          size="sm"
          className="w-64"
        />
        <SegmentedControl value={statusFilter} onChange={(v) => { setStatusFilter(v); pag.reset(); }} options={[
          { value: "", label: "All" },
          { value: "new", label: "New", "data-testid": "filter-new" },
          { value: "contacted", label: "Contacted" },
          { value: "booked", label: "Booked" },
          { value: "lost", label: "Lost" },
        ]} />
      </ListToolbar>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <table data-testid="lead-table" className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-alt text-left">
              <th className="px-4 py-2 font-medium">Patient</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Symptom</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody data-testid={loading ? "table-shimmer" : undefined}>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-muted"}`}>
                  {Array.from({ length: 7 }, (_, ci) => (
                    <td key={ci} className="px-4 py-2"><div className="h-4 rounded bg-muted-alt/20 animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : leads.length === 0 ? (
              <tr>
                <td data-testid="lead-empty-message" colSpan={7} className="px-4 py-8 text-center text-muted-alt">
                  No leads found.
                </td>
              </tr>
            ) : null}
            {!loading && leads.map((l, lIdx) => (
              <tr key={l.inquiry_id} data-testid={lIdx === 0 ? "lead-row" : undefined} className="border-t border-border hover:bg-muted/50">
                <td className="px-4 py-2 text-card-alt">{l.patient_name}</td>
                <td className="px-4 py-2 text-muted-alt">{l.patient_phone}</td>
                <td className="px-4 py-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-alt">
                    {SOURCE_LABELS[l.source] || l.source}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <Badge variant={STATUS_COLORS[l.status] || "default"}>
                    {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-muted-alt truncate max-w-[150px]">{l.symptom_text || "—"}</td>
                <td className="px-4 py-2 text-muted-alt text-xs">
                  {new Date(l.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </td>
                <td className="px-4 py-2 text-right">
                  <Button variant="accent" size="xs" data-testid={lIdx === 0 ? "lead-edit-btn" : undefined} onClick={() => openEdit(l)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {leads.length === 0 ? (
          <p className="text-center text-muted-alt py-8">{loading ? "Loading..." : "No leads found."}</p>
        ) : leads.map((l) => (
          <div key={l.inquiry_id} className="bg-card rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-card-alt">{l.patient_name}</p>
              <Badge variant={STATUS_COLORS[l.status] || "default"}>
                {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-alt">
              <span>{l.patient_phone}</span>
              <span>·</span>
              <span className="px-1.5 py-0.5 rounded bg-muted text-muted-alt">
                {SOURCE_LABELS[l.source] || l.source}
              </span>
            </div>
            {l.symptom_text && (
              <p className="text-xs text-muted-alt truncate">{l.symptom_text}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-alt">
                {new Date(l.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              </span>
              <Button variant="accent" size="xs" data-testid="btn-edit" onClick={() => openEdit(l)}>Edit</Button>
            </div>
          </div>
        ))}
      </div>

      <PaginationBar pag={pag} />

      {/* Modal */}
      {modal && (
        <Modal
          title={modal === "create" ? "Add Lead" : "Update Lead"}
          onClose={() => setModal(null)}
          maxWidth="md"
          footer={
            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={submitting} variant="primary" className="flex-1">
                {submitting ? "Saving..." : modal === "create" ? "Create" : "Save"}
              </Button>
              <Button onClick={() => setModal(null)} variant="secondary" className="flex-1">Cancel</Button>
            </div>
          }
        >
          <div className="space-y-4">
            {modal === "create" && (
              <>
                <TextField data-testid="lead-patient-name-input" label="Patient Name" value={form.patient_name} onChange={(v) => setForm({ ...form, patient_name: v })} required />
                <TextField data-testid="lead-phone-input" label="Phone" value={form.patient_phone} onChange={(v) => setForm({ ...form, patient_phone: v })} required />
                <TextField label="Symptom" value={form.symptom_text} onChange={(v) => setForm({ ...form, symptom_text: v })} />
                <SelectField
                  label="Source"
                  value={form.source}
                  onChange={(v) => setForm({ ...form, source: v })}
                  options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }))}
                />
              </>
            )}
            {modal === "edit" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-card-alt mb-1">Patient</label>
                  <p className="text-sm text-muted-alt">{form.patient_name} — {form.patient_phone}</p>
                </div>
                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(v) => setForm({ ...form, status: v })}
                  options={[
                    { value: "new", label: "New" },
                    { value: "contacted", label: "Contacted" },
                    { value: "booked", label: "Booked" },
                    { value: "lost", label: "Lost" },
                  ]}
                />
                <TextField label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
              </>
            )}
            {formError && <p data-testid="lead-form-error" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{formError}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

import { componentTestSpec } from '@swasthyaseva/test-gen';

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'clinic',
  title: 'Lead Tab',
  elements: {
    leadsTab: { role: 'button', name: /Leads/ },
    statusCards: { testId: 'lead-status-cards' },
    searchInput: { testId: 'lead-search' },
    statusFilterAll: { role: 'button', name: 'All' },
    statusFilterNew: { role: 'button', name: 'New' },
    statusFilterContacted: { role: 'button', name: 'Contacted' },
    statusFilterBooked: { role: 'button', name: 'Booked' },
    statusFilterLost: { role: 'button', name: 'Lost' },
    refreshBtn: { testId: 'lead-refresh-btn' },
    addLeadBtn: { role: 'button', name: /Add Lead/ },
    leadTable: { testId: 'lead-table' },
    tableRows: { testId: 'lead-row' },
    editBtn: { testId: 'lead-edit-btn' },
    leadModal: { role: 'dialog', name: /Lead/ },
    patientNameInput: { testId: 'lead-patient-name-input' },
    phoneInput: { testId: 'lead-phone-input' },
    symptomInput: { role: 'textbox', name: 'Symptom' },
    sourceSelect: { role: 'combobox', name: 'Source' },
    statusSelect: { role: 'combobox', name: 'Status' },
    notesInput: { role: 'textbox', name: 'Notes' },
    createBtn: { role: 'button', name: 'Create' },
    saveBtn: { role: 'button', name: 'Save' },
    cancelBtn: { role: 'button', name: 'Cancel' },
    formError: { testId: 'lead-form-error' },
    previousBtn: { role: 'button', name: 'Previous', exact: true },
    nextBtn: { role: 'button', name: 'Next', exact: true },
    emptyMessage: { testId: 'lead-empty-message' },
  },
  flows: [
    {
      name: 'view leads list with data',
      steps: [
        { do: 'click', on: 'leadsTab' },
        { expect: 'visible', on: 'statusCards' },
        { expect: 'visible', on: 'leadTable' },
        { expect: 'visible', on: 'addLeadBtn' },
      ],
    },
    {
      name: 'create a new lead closes modal on success',
      after: 'view leads list with data',
      steps: [
        { do: 'click', on: 'addLeadBtn' },
        { expect: 'visible', on: 'leadModal' },
        { do: 'fill', on: 'patientNameInput', value: 'Test Lead' },
        { do: 'fill', on: 'phoneInput', value: '+910001000056' },
        { do: 'fill', on: 'symptomInput', value: 'Back pain' },
        { do: 'comboboxSelect', on: 'sourceSelect', value: 'Walk-In' },
        { do: 'click', on: 'createBtn' },
        { expect: 'hidden', on: 'leadModal' },
        { expect: 'visible', on: 'leadTable' },
      ],
    },
    {
      name: 'verify created lead persists after reload',
      after: 'create a new lead closes modal on success',
      steps: [
        { do: 'reload' },
        { do: 'click', on: 'leadsTab' },
        { do: 'waitFor', on: 'leadTable' },
        { expect: 'visible', on: 'leadTable' },
      ],
    },
    {
      name: 'edit lead status and verify values persist',
      after: 'view leads list with data',
      steps: [
        { do: 'click', on: 'addLeadBtn' },
        { expect: 'visible', on: 'leadModal' },
        { do: 'fill', on: 'patientNameInput', value: 'E2E Edit Lead' },
        { do: 'fill', on: 'phoneInput', value: '+910001000058' },
        { do: 'fill', on: 'symptomInput', value: 'Test edit' },
        { do: 'comboboxSelect', on: 'sourceSelect', value: 'Walk-In' },
        { do: 'click', on: 'createBtn' },
        { expect: 'hidden', on: 'leadModal' },
        { do: 'fill', on: 'searchInput', value: 'E2E Edit Lead' },
        { do: 'waitFor', on: 'leadTable' },
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'leadModal' },
        { do: 'comboboxSelect', on: 'statusSelect', value: 'Contacted' },
        { do: 'fill', on: 'notesInput', value: 'Called and scheduled' },
        { do: 'click', on: 'saveBtn' },
        { expect: 'hidden', on: 'leadModal' },
        { expect: 'visible', on: 'leadTable' },
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'leadModal' },
        { expect: 'value', on: 'notesInput', value: 'Called and scheduled' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'search leads filters results',
      after: 'view leads list with data',
      steps: [
        { do: 'fill', on: 'searchInput', value: 'nonexistent_xyz_lead_99' },
        { do: 'waitFor', on: 'leadTable' },
      ],
    },
    {
      name: 'filter leads by status refreshes status cards',
      after: 'view leads list with data',
      steps: [
        { do: 'click', on: 'statusFilterNew' },
        { expect: 'visible', on: 'statusCards' },
        { do: 'click', on: 'statusFilterContacted' },
        { expect: 'visible', on: 'statusCards' },
        { do: 'click', on: 'statusFilterAll' },
        { expect: 'visible', on: 'statusCards' },
      ],
    },
    {
      name: 'search leads with no results shows empty state',
      after: 'view leads list with data',
      steps: [
        { do: 'fill', on: 'searchInput', value: 'nonexistent_lead_xyz' },
        { do: 'waitFor', on: 'emptyMessage' },
        { expect: 'visible', on: 'emptyMessage' },
      ],
    },
    {
      name: 'filter by booked status shows table',
      after: 'view leads list with data',
      steps: [
        { do: 'click', on: 'statusFilterBooked' },
        { expect: 'visible', on: 'statusCards' },
        { expect: 'visible', on: 'leadTable' },
        { do: 'click', on: 'statusFilterAll' },
      ],
    },
    {
      name: 'filter by lost status shows table',
      after: 'view leads list with data',
      steps: [
        { do: 'click', on: 'statusFilterLost' },
        { expect: 'visible', on: 'statusCards' },
        { expect: 'visible', on: 'leadTable' },
        { do: 'click', on: 'statusFilterAll' },
      ],
    },
  ],
});
