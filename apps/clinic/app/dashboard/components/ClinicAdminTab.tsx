"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable, Modal, TextField, Button, ToggleSwitch, ConfirmModal, useToast, ListToolbar, TempPasswordReveal, validateForm, validateName, validateUsername, validatePhone, validatePassword, Input, type FieldErrors } from "@swasthyaseva/ui";
import { getClinicAdmins, createClinicAdmin, updateClinicAdmin, deleteClinicAdmin, restoreClinicAdmin, type ClinicAdmin } from "@/lib/api";

export default function ClinicAdminTab() {
  const [admins, setAdmins] = useState<ClinicAdmin[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<ClinicAdmin | null>(null);
  const [form, setForm] = useState({ name: "", username: "", phone: "", password: "" });
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [tempPassword, setTempPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "restore"; admin: ClinicAdmin } | null>(null);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getClinicAdmins(true);
      setAdmins(res.managers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm({ name: "", username: "", phone: "", password: "" });
    setFormError(""); setFieldErrors({}); setTempPassword(""); setEditing(null); setModal("create");
  }

  function openEdit(a: ClinicAdmin) {
    setForm({ name: a.name, username: a.username, phone: a.phone, password: "" });
    setFormError(""); setFieldErrors({}); setTempPassword(""); setEditing(a); setModal("edit");
  }

  async function handleSubmit() {
    setFormError("");
    const schema = modal === "create"
      ? { name: { required: true, validate: validateName }, username: { required: true, validate: validateUsername }, phone: { required: true, validate: validatePhone }, password: { required: false, validate: validatePassword } } as const
      : { name: { required: false, validate: validateName }, phone: { required: false, validate: validatePhone }, password: { required: false, validate: validatePassword } } as const;
    const errs = validateForm(schema as Record<string, { required: boolean; validate: (v: string) => string | null }>, form);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      if (modal === "create") {
        const res = await createClinicAdmin(form);
        if (res.temporaryPassword) { setTempPassword(res.temporaryPassword); setSubmitting(false); return; }
        setModal(null); addToast("Clinic admin created", "success"); load();
      } else if (modal === "edit" && editing) {
        const data: Record<string, string> = {};
        if (form.name && form.name !== editing.name) data.name = form.name;
        if (form.phone && form.phone !== editing.phone) data.phone = form.phone;
        if (form.password) data.password = form.password;
        if (Object.keys(data).length === 0) { setFormError("No changes"); setSubmitting(false); return; }
        await updateClinicAdmin(editing.clinic_admin_id, data);
        setModal(null); addToast("Clinic admin updated", "success"); load();
      }
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error");
      addToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function executeConfirm() {
    if (!confirmAction) return;
    const { type, admin: a } = confirmAction;
    setConfirmAction(null);
    try {
      if (type === "delete") { await deleteClinicAdmin(a.clinic_admin_id); addToast("Deleted", "success"); }
      else { await restoreClinicAdmin(a.clinic_admin_id); addToast("Restored", "success"); }
      load();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed", "error");
    }
  }

  const columns = [
    { header: "Name", accessor: "name" as const },
    { header: "Username", accessor: "username" as const },
    { header: "Phone", accessor: "phone" as const },
    { header: "Active", accessor: (a: ClinicAdmin, index: number) => (
      <span data-testid={index === 0 ? "cadmin-toggle" : undefined}>
        <ToggleSwitch
          label=""
          checked={!a.is_deleted}
          onChange={() => setConfirmAction({ type: a.is_deleted ? "restore" : "delete", admin: a })}
        />
      </span>
    )},
  ];

  const filteredAdmins = searchQuery
    ? admins.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : admins;

  return (
    <div>
      <ListToolbar onRefresh={load} loading={loading} refreshTestId="cadmin-refresh-btn"
        actionLabel="Add Admin" actionTestId="btn-add-admin" onAction={openCreate}>
        <Input
          data-testid="cadmin-search"
          type="text"
          placeholder="Search admins..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="sm"
        />
      </ListToolbar>

      {/* Desktop Table */}
      <div className="hidden md:block" data-testid="cadmin-table">
        <DataTable
          columns={columns}
          data={filteredAdmins}
          renderActions={(a, index) => (
            <div className="flex items-center gap-2 justify-end">
              {!a.is_deleted && (
                <Button variant="accent" size="xs" data-testid={index === 0 ? "cadmin-edit-btn" : undefined} onClick={() => openEdit(a)}>Edit</Button>
              )}
            </div>
          )}
          emptyMessage="No clinic admins found."
        />
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {filteredAdmins.length === 0 ? (
          <p className="text-center text-muted-alt py-8">{loading ? "Loading..." : "No clinic admins found."}</p>
        ) : filteredAdmins.map((a, aIdx) => (
          <div key={a.clinic_admin_id} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-card-alt">{a.name}</p>
                <p className="text-xs text-muted-alt">{a.username}</p>
              </div>
              <ToggleSwitch
                label=""
                checked={!a.is_deleted}
                onChange={() => setConfirmAction({ type: a.is_deleted ? "restore" : "delete", admin: a })}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-alt">{a.phone}</p>
              {!a.is_deleted && (
                <Button variant="accent" size="xs" onClick={() => openEdit(a)}>Edit</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal
          title={modal === "create" ? "Add Clinic Admin" : "Edit Clinic Admin"}
          onClose={() => setModal(null)}
          footer={!tempPassword ? (
            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={submitting} variant="primary" className="flex-1">
                {submitting ? "Saving..." : modal === "create" ? "Create" : "Save"}
              </Button>
              <Button onClick={() => setModal(null)} variant="secondary" className="flex-1">Cancel</Button>
            </div>
          ) : undefined}
        >
          {tempPassword ? (
            <TempPasswordReveal
              password={tempPassword}
              message="Admin created. Save this temporary password:"
              onDone={() => { setModal(null); setTempPassword(""); load(); }}
              data-testid="cadmin-temp-password"
            />
          ) : (
            <div className="space-y-4">
              <TextField label="Name" data-testid="cadmin-name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required error={fieldErrors.name} />
              {modal === "create" ? (
                <TextField label="Username" data-testid="cadmin-username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required error={fieldErrors.username} />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-card-alt mb-2">Username</label>
                  <div className="px-3 py-2 text-sm rounded-md bg-muted/50 border border-input text-muted-alt">{form.username}</div>
                </div>
              )}
              <TextField label="Phone" data-testid="cadmin-phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required error={fieldErrors.phone} />
              <TextField
                label={modal === "create" ? "Password (auto-generated if blank)" : "Password (keeps current if blank)"}
                data-testid="cadmin-password"
                value={form.password} onChange={(v) => setForm({ ...form, password: v })} type="password"
                error={fieldErrors.password}
              />
              {formError && <p data-testid="cadmin-form-error" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{formError}</p>}
            </div>
          )}
        </Modal>
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.type === "delete" ? "Delete Admin" : "Restore Admin"}
          message={`Are you sure you want to ${confirmAction.type} "${confirmAction.admin.name}"?`}
          confirmLabel={confirmAction.type === "delete" ? "Delete" : "Restore"}
          variant={confirmAction.type === "delete" ? "danger" : "info"}
          onConfirm={executeConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

import { componentTestSpec } from '@swasthyaseva/test-gen';

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'clinic',
  title: 'Clinic Admin Tab',
  elements: {
    clinicAdminsTab: { role: 'button', name: /Clinic Admins/ },
    refreshBtn: { testId: 'cadmin-refresh-btn' },
    addAdminBtn: { role: 'button', name: /Add Admin/ },
    adminTable: { testId: 'cadmin-table' },
    searchInput: { testId: 'cadmin-search' },
    editBtn: { testId: 'cadmin-edit-btn' },
    activeToggle: { testId: 'cadmin-toggle' },
    adminModal: { role: 'dialog', name: /Clinic Admin/ },
    nameInput: { testId: 'cadmin-name' },
    usernameInput: { testId: 'cadmin-username' },
    phoneInput: { testId: 'cadmin-phone' },
    passwordInput: { testId: 'cadmin-password' },

    // ── Validation error elements ──
    nameError: { testId: 'cadmin-name-error' },
    usernameError: { testId: 'cadmin-username-error' },
    phoneError: { testId: 'cadmin-phone-error' },
    createBtn: { role: 'button', name: 'Create' },
    saveBtn: { role: 'button', name: 'Save' },
    cancelBtn: { role: 'button', name: 'Cancel' },
    tempPasswordDisplay: { testId: 'cadmin-temp-password' },
    doneBtn: { role: 'button', name: 'Done' },
    confirmDeleteModal: { role: 'dialog', name: 'Delete Admin' },
    confirmRestoreModal: { role: 'dialog', name: 'Restore Admin' },
    confirmBtn: { role: 'button', name: /Delete|Restore/ },
    formError: { testId: 'cadmin-form-error' },
    emptyMessage: { text: 'No clinic admins found.' },
  },
  flows: [
    {
      name: 'view clinic admins list with data',
      steps: [
        { do: 'click', on: 'clinicAdminsTab' },
        { do: 'waitFor', on: 'adminTable' },
        { expect: 'visible', on: 'addAdminBtn' },
      ],
    },
    {
      name: 'create a new clinic admin shows temp password',
      steps: [
        { do: 'click', on: 'clinicAdminsTab' },
        { do: 'waitFor', on: 'adminTable' },
        { do: 'click', on: 'addAdminBtn' },
        { expect: 'visible', on: 'adminModal' },
        { do: 'fill', on: 'nameInput', value: 'Test Create Admin' },
        { do: 'fill', on: 'usernameInput', value: 'e2e_createadmin' },
        { do: 'fill', on: 'phoneInput', value: '+910001000098' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'tempPasswordDisplay' },
        { do: 'click', on: 'doneBtn' },
        { expect: 'hidden', on: 'adminModal' },
      ],
    },
    {
      name: 'verify created admin persists after reload',
      steps: [
        { do: 'click', on: 'clinicAdminsTab' },
        { do: 'waitFor', on: 'adminTable' },
        { do: 'reload' },
        { do: 'click', on: 'clinicAdminsTab' },
        { do: 'waitFor', on: 'adminTable' },
        { expect: 'visible', on: 'adminTable' },
      ],
    },
    {
      name: 'edit a clinic admin and verify values persist',
      steps: [
        { do: 'click', on: 'clinicAdminsTab' },
        { do: 'waitFor', on: 'adminTable' },
        { do: 'click', on: 'addAdminBtn' },
        { expect: 'visible', on: 'adminModal' },
        { do: 'fill', on: 'nameInput', value: 'Test Edit Admin' },
        { do: 'fill', on: 'usernameInput', value: 'e2e_editadmin' },
        { do: 'fill', on: 'phoneInput', value: '+910001000059' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'tempPasswordDisplay' },
        { do: 'click', on: 'doneBtn' },
        { expect: 'hidden', on: 'adminModal' },
        { do: 'fill', on: 'searchInput', value: 'Test Edit Admin' },
        { do: 'waitFor', on: 'adminTable' },
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'adminModal' },
        { do: 'fill', on: 'nameInput', value: 'Updated Edit Admin' },
        { do: 'click', on: 'saveBtn' },
        { expect: 'hidden', on: 'adminModal' },
        { do: 'fill', on: 'searchInput', value: 'Updated Edit Admin' },
        { do: 'waitFor', on: 'adminTable' },
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'adminModal' },
        { expect: 'value', on: 'nameInput', value: 'Updated Edit Admin' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'delete a clinic admin via toggle confirms and closes',
      steps: [
        { do: 'click', on: 'clinicAdminsTab' },
        { do: 'waitFor', on: 'adminTable' },
        { do: 'click', on: 'addAdminBtn' },
        { expect: 'visible', on: 'adminModal' },
        { do: 'fill', on: 'nameInput', value: 'Test Delete Admin' },
        { do: 'fill', on: 'usernameInput', value: 'e2e_deladmin' },
        { do: 'fill', on: 'phoneInput', value: '+910001000060' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'tempPasswordDisplay' },
        { do: 'click', on: 'doneBtn' },
        { expect: 'hidden', on: 'adminModal' },
        { do: 'fill', on: 'searchInput', value: 'Test Delete Admin' },
        { do: 'waitFor', on: 'adminTable' },
        { do: 'click', on: 'activeToggle' },
        { expect: 'visible', on: 'confirmDeleteModal' },
        { do: 'click', on: 'confirmBtn' },
        { expect: 'hidden', on: 'confirmDeleteModal' },
      ],
    },
    {
      name: 'toggle admin active status shows confirm dialog',
      steps: [
        { do: 'click', on: 'clinicAdminsTab' },
        { do: 'waitFor', on: 'adminTable' },
        { do: 'click', on: 'activeToggle' },
        { expect: 'visible', on: 'confirmBtn' },
      ],
    },
    {
      name: 'refresh admin list reloads data',
      after: 'view clinic admins list with data',
      steps: [
        { do: 'click', on: 'refreshBtn' },
        { expect: 'visible', on: 'adminTable' },
      ],
    },
    {
      name: 'submit empty admin form shows required errors',
      steps: [
        { do: 'click', on: 'clinicAdminsTab' },
        { do: 'waitFor', on: 'adminTable' },
        { do: 'click', on: 'addAdminBtn' },
        { expect: 'visible', on: 'adminModal' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'nameError' },
        { expect: 'visible', on: 'usernameError' },
        { expect: 'visible', on: 'phoneError' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'admin name with numbers shows error',
      steps: [
        { do: 'click', on: 'clinicAdminsTab' },
        { do: 'waitFor', on: 'adminTable' },
        { do: 'click', on: 'addAdminBtn' },
        { expect: 'visible', on: 'adminModal' },
        { do: 'fill', on: 'nameInput', value: 'Admin123' },
        { do: 'fill', on: 'usernameInput', value: 'validadmin' },
        { do: 'fill', on: 'phoneInput', value: '0001000055' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'nameError' },
        { expect: 'text', on: 'nameError', value: 'Only alphabetic characters are allowed' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'admin username too short shows error',
      steps: [
        { do: 'click', on: 'clinicAdminsTab' },
        { do: 'waitFor', on: 'adminTable' },
        { do: 'click', on: 'addAdminBtn' },
        { expect: 'visible', on: 'adminModal' },
        { do: 'fill', on: 'nameInput', value: 'Valid Admin' },
        { do: 'fill', on: 'usernameInput', value: 'ab' },
        { do: 'fill', on: 'phoneInput', value: '0001000055' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'usernameError' },
        { expect: 'text', on: 'usernameError', value: 'Must be at least 3 characters long' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'admin phone too few digits shows error',
      steps: [
        { do: 'click', on: 'clinicAdminsTab' },
        { do: 'waitFor', on: 'adminTable' },
        { do: 'click', on: 'addAdminBtn' },
        { expect: 'visible', on: 'adminModal' },
        { do: 'fill', on: 'nameInput', value: 'Valid Admin' },
        { do: 'fill', on: 'usernameInput', value: 'validadmin' },
        { do: 'fill', on: 'phoneInput', value: '12345' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'phoneError' },
        { expect: 'text', on: 'phoneError', value: 'Must have exactly 10 digits after +91' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
  ],
});

