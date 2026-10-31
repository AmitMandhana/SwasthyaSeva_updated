"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock } from "lucide-react";
import { DataTable, Modal, TextField, SelectField, Button, ConfirmModal, useToast, ToggleSwitch, ImageUpload, ListToolbar, formatSlotTime, DAY_SELECT_OPTIONS, SLOT_TIME_OPTIONS_12H } from "@swasthyaseva/ui";
import { getClinicSlots, createClinicSlot, updateClinicSlot, deleteClinicSlot, restoreClinicSlot, type SlotForBooking } from "@/lib/api";
import { uploadToCloudinary } from "@/lib/upload";
import { componentTestSpec } from '@swasthyaseva/test-gen';

type SlotForm = {
  doctor_id: string;
  slot_fee: string;
  booking_fee: string;
  slot_day: string;
  slot_start: string;
  slot_end: string;
  watermark_url: string;
};

const EMPTY_FORM: SlotForm = { doctor_id: '', slot_fee: '', booking_fee: '0', slot_day: 'MON', slot_start: '18', slot_end: '24', watermark_url: '' };

export default function SlotTab() {
  const [slots, setSlots] = useState<SlotForBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<SlotForBooking | null>(null);
  const [form, setForm] = useState<SlotForm>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SlotForBooking | null>(null);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setSlots((await getClinicSlots()).slots); } catch { addToast("Failed to load slots", "error"); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm(EMPTY_FORM); setError(""); setEditing(null); setModal("create"); }

  function openEdit(s: SlotForBooking) {
    setForm({
      doctor_id: String(s.doctor_id),
      slot_fee: String(s.slot_fee),
      booking_fee: String(s.booking_fee),
      slot_day: s.slot_day,
      slot_start: String(s.slot_start),
      slot_end: String(s.slot_end),
      watermark_url: s.watermark_url ?? '',
    });
    setError(""); setEditing(s); setModal("edit");
  }

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      if (modal === "create") {
        await createClinicSlot({
          doctor_id: parseInt(form.doctor_id, 10),
          slot_fee: parseInt(form.slot_fee, 10),
          booking_fee: parseInt(form.booking_fee, 10) || 0,
          slot_day: form.slot_day,
          slot_start: parseInt(form.slot_start, 10),
          slot_end: parseInt(form.slot_end, 10),
        });
        addToast("Slot created", "success");
      } else if (modal === "edit" && editing) {
        await updateClinicSlot(editing.slot_id, {
          slot_fee: parseInt(form.slot_fee, 10),
          booking_fee: parseInt(form.booking_fee, 10) || 0,
          slot_day: form.slot_day,
          slot_start: parseInt(form.slot_start, 10),
          slot_end: parseInt(form.slot_end, 10),
          watermark_url: form.watermark_url || null,
        });
        addToast("Slot updated", "success");
      }
      setModal(null); load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try { await deleteClinicSlot(confirmDelete.slot_id); addToast("Slot deleted", "success"); load(); }
    catch { addToast("Failed to delete", "error"); }
    setConfirmDelete(null);
  }

  async function handleRestore(s: SlotForBooking) {
    try { await restoreClinicSlot(s.slot_id); addToast("Slot restored", "success"); load(); }
    catch { addToast("Failed to restore", "error"); }
  }

  const columns = [
    { header: "ID", accessor: "slot_id" as const },
    { header: "Doctor", accessor: (s: SlotForBooking) => s.doctor_name || `ID ${s.doctor_id}` },
    { header: "Day", accessor: "slot_day" as const },
    { header: "Time", accessor: (s: SlotForBooking) => `${formatSlotTime(s.slot_start, "12h")} - ${formatSlotTime(s.slot_end, "12h")}` },
    { header: "Visit Fee", accessor: (s: SlotForBooking) => `₹${s.slot_fee}` },
    { header: "Booking Fee", accessor: (s: SlotForBooking) => `₹${s.booking_fee}` },
  ];

  return (
    <div>
      <ListToolbar onRefresh={load} loading={loading} refreshTestId="slot-refresh-btn"
        actionLabel="Add Slot" actionTestId="btn-add-slot" onAction={openCreate} />

      <div data-testid="clinic-slot-table">
        <DataTable
          columns={columns}
          data={slots}
          renderActions={(s) => (
            <div className="flex items-center gap-2 justify-end">
              <Button variant="accent" size="sm" data-testid="btn-edit" onClick={() => openEdit(s)}>Edit</Button>
              <button data-testid="btn-delete" onClick={() => setConfirmDelete(s)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20">Delete</button>
            </div>
          )}
          emptyMessage="No slots found. Create one to get started."
        />
      </div>

      {modal && (
        <Modal title={modal === "create" ? "Add Slot" : "Edit Slot"} onClose={() => setModal(null)} footer={
          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={submitting} variant="primary" className="flex-1">{submitting ? "Saving..." : modal === "create" ? "Create" : "Save"}</Button>
            <Button onClick={() => setModal(null)} variant="secondary" className="flex-1">Cancel</Button>
          </div>
        }>
          <div className="space-y-4">
            {modal === "create" && (
              <TextField label="Doctor ID" value={form.doctor_id} onChange={(v) => setForm({ ...form, doctor_id: v })} required />
            )}
            <SelectField label="Day" value={form.slot_day} onChange={(v) => setForm({ ...form, slot_day: v })} options={DAY_SELECT_OPTIONS} required />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Start Time" value={form.slot_start} onChange={(v) => setForm({ ...form, slot_start: v })} options={SLOT_TIME_OPTIONS_12H} required />
              <SelectField label="End Time" value={form.slot_end} onChange={(v) => setForm({ ...form, slot_end: v })} options={SLOT_TIME_OPTIONS_12H} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Visit Fee (₹)" value={form.slot_fee} onChange={(v) => setForm({ ...form, slot_fee: v })} required />
              <TextField label="Booking Fee (₹)" value={form.booking_fee} onChange={(v) => setForm({ ...form, booking_fee: v })} />
            </div>
            <ImageUpload
              label="Prescription Watermark"
              value={form.watermark_url}
              onChange={(url) => setForm({ ...form, watermark_url: url })}
              onUpload={uploadToCloudinary}
            />
            {/* Preview */}
            {form.slot_day && form.slot_start && form.slot_end && (
              <div className="bg-muted/30 rounded-lg p-3 text-sm text-card-alt">
                <p className="font-medium mb-1">Preview</p>
                <p>{DAY_SELECT_OPTIONS.find(d => d.value === form.slot_day)?.label} · {formatSlotTime(parseInt(form.slot_start, 10), "12h")} – {formatSlotTime(parseInt(form.slot_end, 10), "12h")}</p>
                <p>Visit: ₹{form.slot_fee || '0'} · Booking: ₹{form.booking_fee || '0'}</p>
              </div>
            )}
            {error && <p data-testid="slot-form-error" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal title="Delete Slot" message={`Delete slot #${confirmDelete.slot_id}?`} confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
      )}
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'clinic',
  title: 'Slot Management Tab',
  elements: {
    // ── Tab & toolbar ──
    slotsTab: { testId: 'tab-slots' },
    refreshBtn: { testId: 'slot-refresh-btn' },
    addSlotBtn: { testId: 'btn-add-slot' },
    table: { testId: 'clinic-slot-table' },
    emptyMsg: { text: 'No slots found. Create one to get started.' },
    editBtn: { testId: 'btn-edit' },
    deleteBtn: { testId: 'btn-delete' },

    // ── Create/edit modal ──
    modalTitle: { role: 'heading', name: /Add Slot|Edit Slot/ },
    doctorIdInput: { role: 'textbox', name: 'Doctor ID' },
    daySelect: { role: 'combobox', name: 'Day' },
    startTimeSelect: { role: 'combobox', name: 'Start Time' },
    endTimeSelect: { role: 'combobox', name: 'End Time' },
    visitFeeInput: { role: 'textbox', name: 'Visit Fee (₹)' },
    bookingFeeInput: { role: 'textbox', name: 'Booking Fee (₹)' },
    createBtn: { role: 'button', name: 'Create' },
    saveBtn: { role: 'button', name: 'Save' },
    cancelBtn: { role: 'button', name: 'Cancel' },
    formError: { testId: 'slot-form-error' },

    // ── Confirm modal ──
    confirmTitle: { role: 'heading', name: /Delete Slot/ },
    confirmBtn: { testId: 'confirm-action-btn' },

    // ── Toast ──
    successToast: { testId: 'toast-success' },
  },
  flows: [
    {
      name: 'view slot list',
      steps: [
        { do: 'click', on: 'slotsTab' },
        { expect: 'visible', on: 'table' },
        { expect: 'visible', on: 'addSlotBtn' },
        { expect: 'visible', on: 'refreshBtn' },
      ],
    },
    {
      name: 'create a slot',
      after: 'view slot list',
      steps: [
        { do: 'click', on: 'addSlotBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'resolveAndFill', on: 'doctorIdInput', value: 'doctor_id' },
        { do: 'comboboxSelect', on: 'daySelect', value: 'Monday' },
        { do: 'comboboxSelect', on: 'startTimeSelect', value: '9:00 AM' },
        { do: 'comboboxSelect', on: 'endTimeSelect', value: '12:00 PM' },
        { do: 'fill', on: 'visitFeeInput', value: '500' },
        { do: 'fill', on: 'bookingFeeInput', value: '50' },
        { do: 'click', on: 'createBtn' },
        { expect: 'hidden', on: 'modalTitle' },
        { expect: 'visible', on: 'successToast' },
      ],
    },
    {
      name: 'edit a slot',
      after: 'create a slot',
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
      after: 'edit a slot',
      steps: [
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { expect: 'value', on: 'visitFeeInput', value: '600' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'delete a slot',
      after: 'create a slot',
      steps: [
        { do: 'click', on: 'deleteBtn' },
        { expect: 'visible', on: 'confirmTitle' },
        { do: 'click', on: 'confirmBtn' },
        { expect: 'hidden', on: 'confirmTitle' },
        { expect: 'visible', on: 'successToast' },
      ],
    },
    {
      name: 'refresh slot list',
      after: 'view slot list',
      steps: [
        { do: 'click', on: 'refreshBtn' },
        { expect: 'visible', on: 'table' },
      ],
    },
  ],
});
