"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DataTable,
  TextField,
  SelectField,
  Modal,
  ConfirmModal,
  FilterSearchBar,
  ListToolbar,
  ImageUpload,
  Button,
  useToast,
  formatSlotTime,
  DAY_SELECT_OPTIONS,
  SLOT_TIME_OPTIONS_24H,
  type Column,
  type FilterDef,
  type ParsedFilters,
} from "@swasthyaseva/ui";
import { uploadToCloudinary } from "@/lib/upload";
import {
  getSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  restoreSlot,
  type Slot,
  getDoctors,
  getClinics,
} from "@/lib/api";
import { componentTestSpec } from '@swasthyaseva/test-gen';

// ── Constants ──

const SLOT_FILTER_DEFS: FilterDef[] = [
  { key: "clinic", label: "Clinic Username", color: "blue" },
  { key: "doctor", label: "Doctor Username", color: "green" },
  { key: "day", label: "Day", color: "purple" },
  { key: "tag", label: "Tag", color: "amber" },
];

// ── Form types ──

type SlotForm = {
  doctor_username: string;
  clinic_username: string;
  slot_fee: string;
  booking_fee: string;
  slot_day: string;
  slot_start: string;
  slot_end: string;
  watermark_url: string;
};

const EMPTY_FORM: SlotForm = {
  doctor_username: "",
  clinic_username: "",
  slot_fee: "",
  booking_fee: "",
  slot_day: "MON",
  slot_start: "",
  slot_end: "",
  watermark_url: "",
};

// ── Component ──

export default function SlotTab() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const filtersRef = useRef<ParsedFilters>({ filters: {}, search: "" });
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Slot | null>(null);
  const [form, setForm] = useState<SlotForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "restore"; slot: Slot } | null>(null);
  const [doctorPreview, setDoctorPreview] = useState<string | null>(null);
  const [clinicPreview, setClinicPreview] = useState<string | null>(null);
  const doctorLookupRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clinicLookupRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (doctorLookupRef.current) clearTimeout(doctorLookupRef.current);
    const username = form.doctor_username.trim();
    if (username.length < 2) { setDoctorPreview(null); return; }
    doctorLookupRef.current = setTimeout(async () => {
      try {
        const docs = await getDoctors(false, { username });
        const match = docs.find(d => d.username.toLowerCase() === username.toLowerCase());
        setDoctorPreview(match ? `${match.first_name} ${match.last_name}` : null);
      } catch { setDoctorPreview(null); }
    }, 400);
    return () => { if (doctorLookupRef.current) clearTimeout(doctorLookupRef.current); };
  }, [form.doctor_username]);

  useEffect(() => {
    if (clinicLookupRef.current) clearTimeout(clinicLookupRef.current);
    const username = form.clinic_username.trim();
    if (username.length < 2) { setClinicPreview(null); return; }
    clinicLookupRef.current = setTimeout(async () => {
      try {
        const clinics = await getClinics(false, { username });
        const match = clinics.find(c => c.username.toLowerCase() === username.toLowerCase());
        setClinicPreview(match ? (match.clinic_name || match.username) : null);
      } catch { setClinicPreview(null); }
    }, 400);
    return () => { if (clinicLookupRef.current) clearTimeout(clinicLookupRef.current); };
  }, [form.clinic_username]);

  const load = useCallback(async (parsed?: ParsedFilters) => {
    const p = parsed ?? filtersRef.current;
    setLoading(true);
    try {
      const filters: Parameters<typeof getSlots>[0] = { includeDeleted: true };
      // Map chip keys to API params
      if (p.filters.clinic) filters.clinic_username = p.filters.clinic;
      if (p.filters.doctor) filters.doctor_username = p.filters.doctor;
      if (p.filters.day) filters.day = p.filters.day.toUpperCase();
      if (p.filters.tag) filters.tag = p.filters.tag;
      // Free-text search: treat as doctor username prefix
      if (p.search) filters.doctor_username = p.search;

      setSlots(await getSlots(filters));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Modal helpers ──
  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError("");
    setEditing(null);
    setModal("create");
  }

  function openEdit(slot: Slot) {
    setForm({
      doctor_username: slot.doctor_username ?? "",
      clinic_username: slot.clinic_username ?? "",
      slot_fee: String(slot.slot_fee),
      booking_fee: String(slot.booking_fee ?? 0),
      slot_day: slot.slot_day,
      slot_start: String(slot.slot_start),
      slot_end: String(slot.slot_end),
      watermark_url: slot.watermark_url ?? "",
    });
    setFormError("");
    setEditing(slot);
    setModal("edit");
  }

  async function handleSave() {
    setFormError("");
    try {
      if (modal === "create") {
        const result = await createSlot({
          doctor_username: form.doctor_username.trim(),
          clinic_username: form.clinic_username.trim(),
          slot_fee: parseInt(form.slot_fee, 10),
          booking_fee: form.booking_fee ? parseInt(form.booking_fee, 10) : 0,
          slot_day: form.slot_day,
          slot_start: parseInt(form.slot_start, 10),
          slot_end: parseInt(form.slot_end, 10),
        });
        addToast(`Slot #${result.slot.slot_id} created`, "success");
      } else if (editing) {
        await updateSlot(editing.slot_id, {
          slot_fee: parseInt(form.slot_fee, 10),
          booking_fee: form.booking_fee ? parseInt(form.booking_fee, 10) : 0,
          slot_day: form.slot_day,
          slot_start: parseInt(form.slot_start, 10),
          slot_end: parseInt(form.slot_end, 10),
          watermark_url: form.watermark_url || null,
        });
        addToast(`Slot #${editing.slot_id} updated`, "success");
      }
      setModal(null);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save slot");
    }
  }

  async function executeConfirmAction() {
    if (!confirmAction) return;
    const { type, slot } = confirmAction;
    setConfirmAction(null);
    try {
      if (type === "delete") {
        await deleteSlot(slot.slot_id);
        addToast(`Slot #${slot.slot_id} deleted`, "success");
      } else {
        await restoreSlot(slot.slot_id);
        addToast(`Slot #${slot.slot_id} restored`, "success");
      }
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Action failed", "error");
    }
  }

  // ── Table columns ──
  const columns: Column<Slot>[] = [
    { header: "ID", accessor: "slot_id", className: "w-14" },
    { header: "Doctor", accessor: (s) => s.doctor_username ?? s.doctor_name ?? String(s.doctor_id) },
    { header: "Clinic", accessor: (s) => s.clinic_username ?? s.clinic_name ?? String(s.clinic_id) },
    { header: "Day", accessor: "slot_day", className: "w-16" },
    { header: "Time", accessor: (s) => `${formatSlotTime(s.slot_start)} – ${formatSlotTime(s.slot_end)}`, className: "w-28" },
    { header: "Fee", accessor: (s) => `₹${s.slot_fee}`, className: "w-20" },
    { header: "Booking Fee", accessor: (s) => `₹${s.booking_fee ?? 0}`, className: "w-24" },
  ];

  return (
    <div>
      <ListToolbar
        onRefresh={() => load()}
        loading={searching || loading}
        refreshTestId="slot-refresh"
        actionLabel="New Slot"
        actionTestId="btn-add-slot"
        onAction={openCreate}
      >
        <FilterSearchBar
          filterDefs={SLOT_FILTER_DEFS}
          placeholder="Search slots... or type clinic:username"
          onSearch={(parsed) => { filtersRef.current = parsed; load(parsed); }}
          onSearchStart={() => setSearching(true)}
          data-testid="search-slots"
        />
      </ListToolbar>

          <div className="hidden md:block" data-testid="admin-slot-table">
            <DataTable
              columns={columns}
              data={slots}
              loading={searching || loading}
              onEdit={(s) => !s.is_deleted && openEdit(s)}
              onDelete={(s) => !s.is_deleted && setConfirmAction({ type: "delete", slot: s })}
              onRestore={(s) => s.is_deleted && setConfirmAction({ type: "restore", slot: s })}
              emptyMessage="No slots found"
            />
          </div>

          <div className="block md:hidden space-y-3">
            {slots.length === 0 && (
              <p className="text-sm text-muted-alt text-center py-8">No slots found</p>
            )}
            {slots.map((s, index) => (
              <div key={s.slot_id} className={`bg-card rounded-lg border border-border p-4 ${s.is_deleted ? 'opacity-40' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-base font-semibold text-card-alt truncate">
                      {s.doctor_username ?? s.doctor_name ?? `Doctor #${s.doctor_id}`}
                    </p>
                    <p className="text-sm text-muted-alt">
                      {s.clinic_username ?? s.clinic_name ?? `Clinic #${s.clinic_id}`} · {s.slot_day}
                    </p>
                    <p className="text-sm text-card-alt font-medium">
                      {formatSlotTime(s.slot_start)} – {formatSlotTime(s.slot_end)} · ₹{s.slot_fee}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {s.is_deleted ? (
                      <button data-testid="btn-restore-mobile" onClick={() => setConfirmAction({ type: "restore", slot: s })} className="px-4 py-2 rounded-lg text-sm font-medium bg-success/20 text-success hover:bg-success/30">Restore</button>
                    ) : (
                      <>
                        <Button variant="accent" size="md" data-testid="btn-edit-mobile" onClick={() => openEdit(s)}>Edit</Button>
                        <button data-testid="btn-delete-mobile" onClick={() => setConfirmAction({ type: "delete", slot: s })} className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-alt hover:opacity-90">Delete</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

      {/* Create / Edit Modal */}
      {modal && (
        <Modal
          title={modal === "create" ? "Create Slot" : "Edit Slot"}
          onClose={() => setModal(null)}
          footer={
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <Button onClick={handleSave}>
                {modal === "create" ? "Create" : "Save"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {formError && (
              <p data-testid="slot-form-error" className="text-destructive text-sm whitespace-pre-line">{formError}</p>
            )}

            {/* Row 1: Doctor username | Clinic username | Day */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <TextField
                  label="Doctor Username"
                  value={form.doctor_username}
                  onChange={(v) => setForm((f) => ({ ...f, doctor_username: v }))}
                  placeholder="dr.smith"
                  required
                  disabled={modal === "edit"}
                />
                {doctorPreview && <p className="text-xs text-success mt-1">✓ {doctorPreview}</p>}
                {form.doctor_username.trim().length >= 2 && !doctorPreview && <p className="text-xs text-muted-alt mt-1">No match</p>}
              </div>
              <div>
                <TextField
                  label="Clinic Username"
                  value={form.clinic_username}
                  onChange={(v) => setForm((f) => ({ ...f, clinic_username: v }))}
                  placeholder="cityclinic"
                  required
                  disabled={modal === "edit"}
                />
                {clinicPreview && <p className="text-xs text-success mt-1">✓ {clinicPreview}</p>}
                {form.clinic_username.trim().length >= 2 && !clinicPreview && <p className="text-xs text-muted-alt mt-1">No match</p>}
              </div>
              <SelectField
                label="Day"
                value={form.slot_day}
                onChange={(v) => setForm((f) => ({ ...f, slot_day: v }))}
                options={DAY_SELECT_OPTIONS}
                required
              />
            </div>

            {/* Row 2: Start time | End time | Fee */}
            <div className="grid grid-cols-3 gap-3">
              <SelectField
                label="Start Time"
                value={form.slot_start}
                onChange={(v) => setForm((f) => ({ ...f, slot_start: v }))}
                options={SLOT_TIME_OPTIONS_24H}
                required
              />
              <SelectField
                label="End Time"
                value={form.slot_end}
                onChange={(v) => setForm((f) => ({ ...f, slot_end: v }))}
                options={SLOT_TIME_OPTIONS_24H}
                required
              />
              <TextField
                label="Visit Fee (₹)"
                value={form.slot_fee}
                onChange={(v) => setForm((f) => ({ ...f, slot_fee: v, booking_fee: f.booking_fee || String(Math.round(Number(v) * 0.1)) }))}
                type="number"
                placeholder="500"
                required
              />
              <TextField
                label="Booking Fee (₹)"
                value={form.booking_fee}
                onChange={(v) => setForm((f) => ({ ...f, booking_fee: v }))}
                type="number"
                placeholder={form.slot_fee ? String(Math.round(Number(form.slot_fee) * 0.1)) : "50"}
                labelSuffix={form.slot_fee ? <span className="text-xs text-muted-alt">Suggested: ₹{Math.round(Number(form.slot_fee) * 0.1)}</span> : undefined}
              />
            </div>

            <ImageUpload
              label="Prescription Watermark"
              value={form.watermark_url}
              onChange={(url) => setForm((f) => ({ ...f, watermark_url: url }))}
              onUpload={uploadToCloudinary}
            />

            {modal === "edit" && (
              <p className="text-xs text-muted-alt">Doctor and clinic cannot be changed after creation.</p>
            )}

            {/* Live preview */}
            {form.slot_day && form.slot_start && form.slot_end && (
              <div className="bg-muted/30 rounded-lg p-3 text-sm text-card-alt">
                <p className="font-medium mb-1">Preview</p>
                {doctorPreview && <p>Doctor: {doctorPreview}</p>}
                {clinicPreview && <p>Clinic: {clinicPreview}</p>}
                <p>{DAY_SELECT_OPTIONS.find(d => d.value === form.slot_day)?.label} · {formatSlotTime(parseInt(form.slot_start, 10))} – {formatSlotTime(parseInt(form.slot_end, 10))}</p>
                <p>Visit: ₹{form.slot_fee || '0'} · Booking: ₹{form.booking_fee || '0'}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Confirm modal */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.type === "delete" ? "Delete Slot" : "Restore Slot"}
          message={
            confirmAction.type === "delete"
              ? `Soft-delete slot #${confirmAction.slot.slot_id} (${confirmAction.slot.doctor_username}, ${confirmAction.slot.slot_day})?`
              : `Restore slot #${confirmAction.slot.slot_id}?`
          }
          variant={confirmAction.type === "delete" ? "danger" : "info"}
          onConfirm={executeConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'admin',
  title: 'Slot Management Tab',
  elements: {
    // ── Tab & toolbar ──
    slotsTab: { role: 'button', name: /Slots/ },
    searchBar: { testId: 'search-slots' },
    newSlotBtn: { role: 'button', name: /New Slot/ },
    table: { testId: 'admin-slot-table' },
    tableRows: { role: 'row', name: /.*/ },
    loadingMsg: { text: 'Loading slots...' },
    emptyMsg: { role: 'cell', name: 'No slots found' },
    editBtn: { testId: 'btn-edit' },
    deleteBtn: { testId: 'btn-delete' },
    restoreBtn: { testId: 'btn-restore' },

    // ── Create/edit modal ──
    modalTitle: { role: 'heading', name: /Create Slot|Edit Slot/ },
    doctorUsernameInput: { role: 'textbox', name: 'Doctor Username' },
    clinicUsernameInput: { role: 'textbox', name: 'Clinic Username' },
    daySelect: { role: 'combobox', name: 'Day' },
    startTime: { role: 'combobox', name: 'Start Time' },
    endTime: { role: 'combobox', name: 'End Time' },
    visitFeeInput: { role: 'spinbutton', name: 'Visit Fee (₹)' },
    bookingFeeInput: { role: 'spinbutton', name: 'Booking Fee (₹)' },
    createBtn: { role: 'button', name: 'Create' },
    saveBtn: { role: 'button', name: 'Save' },
    cancelBtn: { role: 'button', name: 'Cancel' },
    formError: { testId: 'slot-form-error' },

    // ── Confirm modal ──
    confirmTitle: { role: 'heading', name: /Delete Slot|Restore Slot/ },
    confirmBtn: { testId: 'confirm-action-btn' },

    // ── Success toast ──
    successToast: { testId: 'toast-success' },
  },
  flows: [
    {
      name: 'view slot list',
      steps: [
        { do: 'waitFor', on: 'slotsTab' },
        { do: 'click', on: 'slotsTab' },
        { expect: 'visible', on: 'table' },
        { expect: 'visible', on: 'newSlotBtn' },
        { expect: 'visible', on: 'searchBar' },
      ],
    },
    {
      name: 'search slots',
      after: 'view slot list',
      steps: [
        { do: 'fill', on: 'searchBar', value: 'clinic:e2eclinic' },
        { expect: 'visible', on: 'table' },
      ],
    },
    {
      name: 'search with no results',
      after: 'view slot list',
      steps: [
        { do: 'fill', on: 'searchBar', value: 'doctor:zzz_nonexistent_999' },
        { expect: 'visible', on: 'table' },
      ],
    },
    {
      name: 'create slot with day selection',
      after: 'view slot list',
      steps: [
        { do: 'click', on: 'newSlotBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'reactFill', on: 'doctorUsernameInput', value: 'e2e_doc_primary' },
        { do: 'reactFill', on: 'clinicUsernameInput', value: 'e2e_clinic_primary' },
        { do: 'comboboxSelect', on: 'daySelect', value: 'Wednesday' },
        { do: 'comboboxSelect', on: 'startTime', value: '10:00' },
        { do: 'comboboxSelect', on: 'endTime', value: '10:30' },
        { do: 'fill', on: 'visitFeeInput', value: '500' },
        { do: 'click', on: 'createBtn' },
        { expect: 'hidden', on: 'modalTitle' },
        { expect: 'visible', on: 'successToast' },
      ],
    },
    {
      name: 'verify created slot persists after reload',
      steps: [
        { do: 'click', on: 'slotsTab' },
        { do: 'waitFor', on: 'table' },
        { do: 'reload' },
        { do: 'click', on: 'slotsTab' },
        { do: 'waitFor', on: 'table' },
        { expect: 'visible', on: 'table' },
      ],
    },
    {
      name: 'edit slot',
      after: 'view slot list',
      steps: [
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'visitFeeInput', value: '600' },
        { do: 'click', on: 'saveBtn' },
        { expect: 'hidden', on: 'modalTitle' },
        { expect: 'visible', on: 'successToast' },
      ],
    },
    {
      name: 'edited slot values persist when reopened',
      after: 'edit slot',
      steps: [
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { expect: 'value', on: 'visitFeeInput', value: '600' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'delete slot',
      after: 'view slot list',
      steps: [
        { do: 'click', on: 'deleteBtn' },
        { expect: 'visible', on: 'confirmTitle' },
        { do: 'click', on: 'confirmBtn' },
        { expect: 'hidden', on: 'confirmTitle' },
        { expect: 'visible', on: 'successToast' },
      ],
    },
    {
      name: 'restore deleted slot',
      after: 'delete slot',
      steps: [
        { expect: 'hidden', on: 'successToast' },
        { do: 'click', on: 'restoreBtn' },
        { expect: 'visible', on: 'confirmTitle' },
        { do: 'click', on: 'confirmBtn' },
        { expect: 'hidden', on: 'confirmTitle' },
        { expect: 'visible', on: 'successToast' },
      ],
    },
  ],
});
