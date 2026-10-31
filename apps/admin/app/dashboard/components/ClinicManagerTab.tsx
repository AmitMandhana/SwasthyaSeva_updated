"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { User, Phone, Building2, Lock } from "lucide-react";
import { DataTable, Modal, TextField, Button, Checkbox, ToggleSwitch, ConfirmModal, useToast, FilterSearchBar, ListToolbar, TempPasswordReveal, useUsernameAvailability, ErrorBanner, AvatarUpload, type ParsedFilters, type FilterDef } from "@swasthyaseva/ui";
import { getClinics, getClinicManagers, createClinicManager, updateClinicManager, deleteClinicManager, restoreClinicManager, Clinic, ClinicManager, checkClinicManagerUsername } from "@/lib/api";
import { uploadToCloudinary } from "@/lib/upload";
import { validateForm, validateName, validateUsername, validatePhone, validatePassword, type FieldErrors } from "@swasthyaseva/ui";
import { componentTestSpec } from '@swasthyaseva/test-gen';

type CMForm = {
  clinic_username: string;
  name: string;
  username: string;
  phone: string;
  pfp_link: string;
  password: string;
};

const EMPTY: CMForm = { clinic_username: "", name: "", username: "", phone: "", pfp_link: "", password: "" };

const CM_FILTER_DEFS: FilterDef[] = [
  { key: "name", label: "Name", color: "blue" },
  { key: "username", label: "Username", color: "green" },
  { key: "phone", label: "Phone", color: "purple" },
  { key: "clinic_username", label: "Clinic Username", color: "amber" },
];

export default function ClinicManagerTab() {
  const [managers, setManagers] = useState<ClinicManager[]>([]);
  const [filterClinic, setFilterClinic] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const filtersRef = useRef<ParsedFilters>({ filters: {}, search: "" });
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<ClinicManager | null>(null);
  const [form, setForm] = useState<CMForm>(EMPTY);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [tempPassword, setTempPassword] = useState("");
  const [resolvedClinicId, setResolvedClinicId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "restore"; manager: ClinicManager } | null>(null);
  const { addToast } = useToast();

  const load = useCallback(async (parsed?: ParsedFilters) => {
    const p = parsed ?? filtersRef.current;
    setLoading(true);
    try {
      const clinicId = filterClinic ? parseInt(filterClinic, 10) : undefined;
      setManagers(await getClinicManagers(clinicId, true, { ...p.filters, ...(p.search ? { search: p.search } : {}) }));
    } catch (e: unknown) { console.error(e); }
    finally { setLoading(false); setSearching(false); }
  }, [filterClinic]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY); setFormError(""); setTempPassword(""); setEditing(null); setModal("create"); setResolvedClinicId(null);
  }

  function openEdit(m: ClinicManager) {
    setForm({ clinic_username: "", name: m.name, username: m.username, phone: m.phone, pfp_link: m.pfp_link ?? "", password: "" });
    setFormError(""); setTempPassword(""); setEditing(m); setModal("edit");
  }

  async function handleSubmit() {
    setFormError("");
    const schema = modal === "create"
      ? { name: { required: true, validate: validateName }, username: { required: true, validate: validateUsername }, phone: { required: true, validate: validatePhone }, password: { required: false, validate: validatePassword } } as const
      : { name: { required: false, validate: validateName }, phone: { required: false, validate: validatePhone }, password: { required: false, validate: validatePassword } } as const;
    const errs = validateForm(schema as Record<string, { required: boolean; validate: (v: string) => string | null }>, form);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (modal === "create" && !resolvedClinicId) {
      setFormError("Clinic not found. Please enter a valid clinic username.");
      return;
    }
    setSubmitting(true);
    try {
      if (modal === "create") {
        const payload: Record<string, unknown> = {
          clinic_id: resolvedClinicId,
          name: form.name,
          username: form.username,
          phone: form.phone,
        };
        if (form.pfp_link) payload.pfp_link = form.pfp_link;
        if (form.password) payload.password = form.password;
        const res = await createClinicManager(payload);
        if (res.temporaryPassword) { setTempPassword(res.temporaryPassword); return; }
        setModal(null); addToast("Clinic manager created successfully", "success"); load();
      } else if (modal === "edit" && editing) {
        const payload: Record<string, unknown> = { name: form.name, phone: form.phone };
        if (form.pfp_link !== undefined) payload.pfp_link = form.pfp_link;
        if (form.password) payload.password = form.password;
        await updateClinicManager(editing.clinic_admin_id, payload);
        setModal(null); addToast("Clinic manager updated successfully", "success"); load();
      }
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error");
      addToast(e instanceof Error ? e.message : "Operation failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(m: ClinicManager) {
    setConfirmAction({ type: "delete", manager: m });
  }

  function handleRestore(m: ClinicManager) {
    setConfirmAction({ type: "restore", manager: m });
  }

  async function executeConfirmAction() {
    if (!confirmAction) return;
    const { type, manager: m } = confirmAction;
    setConfirmAction(null);
    try {
      if (type === "delete") {
        await deleteClinicManager(m.clinic_admin_id);
        addToast(`Manager "${m.name}" deleted`, "success");
      } else {
        await restoreClinicManager(m.clinic_admin_id);
        addToast(`Manager "${m.name}" restored`, "success");
      }
      load();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : `${type} failed`, "error");
    }
  }

  function handleTogglePublic(m: ClinicManager) {
    if (m.is_deleted) {
      handleRestore(m);
    } else {
      handleDelete(m);
    }
  }

  const columns = [
    { header: "ID", accessor: "clinic_admin_id" as const },
    { header: "Clinic ID", accessor: "clinic_id" as const },
    { header: "Name", accessor: "name" as const },
    { header: "Username", accessor: "username" as const },
    { header: "Phone", accessor: "phone" as const },
    { header: "Active", accessor: (m: ClinicManager, index: number) => (
      <ToggleSwitch label="" checked={!m.is_deleted} onChange={() => handleTogglePublic(m)} data-testid={index === 0 ? "manager-active-toggle" : undefined} />
    ) },
  ];

  return (
    <div>
      <ListToolbar onRefresh={() => load()} loading={loading} refreshTestId="manager-refresh"
        actionLabel="Add Clinic Manager" actionTestId="btn-add-manager" onAction={openCreate}>
        <FilterSearchBar
          filterDefs={CM_FILTER_DEFS}
          placeholder="Search managers... or type name:admin"
          onSearch={(parsed) => { filtersRef.current = parsed; load(parsed); }}
          onSearchStart={() => setSearching(true)}
          data-testid="search-managers"
        />
      </ListToolbar>

      <div className="hidden md:block" data-testid="admin-manager-table">
        <DataTable columns={columns} data={managers} loading={searching || loading}
          renderActions={(m, index) => (
            <div className="flex items-center gap-2 justify-end">
              {!m.is_deleted && (
                <Button variant="accent" size="xs" data-testid="btn-edit" onClick={() => openEdit(m)}>Edit</Button>
              )}
            </div>
          )}
          emptyMessage="No managers found." />
      </div>

      <div className="block md:hidden space-y-3">
        {managers.length === 0 && (
          <p className="text-sm text-muted-alt text-center py-8">No managers found.</p>
        )}
        {managers.map((m, index) => (
          <div key={m.clinic_admin_id} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-card-alt truncate">{m.name}</p>
                <p className="text-sm text-muted-alt mt-1">@{m.username}</p>
                <p className="text-sm text-muted-alt">Clinic ID: {m.clinic_id}</p>
              </div>
              {!m.is_deleted && (
                <Button variant="accent" size="sm" className="shrink-0" onClick={() => openEdit(m)}>Edit</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal === "create" ? "Add Clinic Manager" : "Edit Clinic Manager"} onClose={() => setModal(null)} maxWidth="full"
          footer={!tempPassword ? (
            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={submitting} variant="primary" className="flex-1">
                {submitting ? "Saving\u2026" : modal === "create" ? "Create" : "Save"}
              </Button>
              <Button onClick={() => setModal(null)} variant="secondary" className="flex-1">Cancel</Button>
            </div>
          ) : undefined}
        >
          {tempPassword ? (
            <TempPasswordReveal
              password={tempPassword}
              message="Manager created. Save this temporary password:"
              onDone={() => { setModal(null); setTempPassword(""); load(); }}
            />
          ) : (
            <CMFormFields form={form} setForm={setForm} isCreate={modal === "create"} error={formError}
              fieldErrors={fieldErrors} setFieldErrors={setFieldErrors} submitting={submitting} onSubmit={handleSubmit} onCancel={() => setModal(null)} onClinicResolved={setResolvedClinicId} />
          )}
        </Modal>
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.type === "delete" ? "Delete Manager" : "Restore Manager"}
          message={`Are you sure you want to ${confirmAction.type} manager "${confirmAction.manager.name}"?`}
          confirmLabel={confirmAction.type === "delete" ? "Delete" : "Restore"}
          variant={confirmAction.type === "delete" ? "danger" : "info"}
          onConfirm={executeConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

function CMFormFields({ form, setForm, isCreate, error, fieldErrors, setFieldErrors, submitting, onSubmit, onCancel, onClinicResolved }: {
  form: CMForm; setForm: (f: CMForm) => void; isCreate: boolean;
  error: string; fieldErrors: FieldErrors; setFieldErrors: (errors: FieldErrors) => void; submitting: boolean; onSubmit: () => void; onCancel: () => void; onClinicResolved: (id: number | null) => void;
}) {
  const [clinicLookupStatus, setClinicLookupStatus] = useState<"idle" | "checking" | "found" | "not_found">("idle");
  const [foundClinicName, setFoundClinicName] = useState("");
  const [foundClinicId, setFoundClinicId] = useState<number | null>(null);
  const clinicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkFn = useCallback(
    (username: string) => checkClinicManagerUsername(username, foundClinicId!),
    [foundClinicId],
  );
  const { statusLabel } = useUsernameAvailability(form.username, checkFn, { enabled: isCreate && !!foundClinicId });

  useEffect(() => {
    if (!isCreate) return;
    if (clinicTimerRef.current) clearTimeout(clinicTimerRef.current);
    const val = form.clinic_username.trim();
    if (!val) { setClinicLookupStatus("idle"); setFoundClinicName(""); setFoundClinicId(null); onClinicResolved(null); return; }
    setClinicLookupStatus("checking");
    clinicTimerRef.current = setTimeout(async () => {
      try {
        const results = await getClinics(false, { username: val });
        const match = results.find((c: Clinic) => c.username.toLowerCase() === val.toLowerCase());
        if (match) {
          setClinicLookupStatus("found");
          setFoundClinicName(match.clinic_name ?? match.username);
          setFoundClinicId(match.clinic_id);
          onClinicResolved(match.clinic_id);
        } else {
          setClinicLookupStatus("not_found");
          setFoundClinicName("");
          setFoundClinicId(null);
          onClinicResolved(null);
        }
      } catch { setClinicLookupStatus("idle"); onClinicResolved(null); }
    }, 600);
    return () => { if (clinicTimerRef.current) clearTimeout(clinicTimerRef.current); };
  }, [form.clinic_username, isCreate, onClinicResolved]);

  return (
    <div>
      {/* Profile picture + fields side by side */}
      <div className="flex gap-4 mb-4">
        <AvatarUpload
          value={form.pfp_link}
          onChange={(url) => setForm({ ...form, pfp_link: url })}
          onUpload={uploadToCloudinary}
          label="Photo"
          showLabel
          emptyBorderColor="border-muted-alt"
        />

        <div className="flex-1 space-y-3">
          {/* Row 1: Clinic Username (create only) + Full Name + Phone */}
          <div className={`grid ${isCreate ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
            {isCreate && (
              <div>
                <TextField
                  label="Clinic Username"
                  value={form.clinic_username}
                  onChange={(val) => setForm({ ...form, clinic_username: val })}
                  required
                  icon={<Building2 size={16} />}
                  error={fieldErrors.clinic_username}
                  labelSuffix={form.clinic_username.trim() ? (
                    clinicLookupStatus === "checking" ? <span className="text-xs text-muted-alt">Checking...</span> :
                    clinicLookupStatus === "found" ? <span className="text-xs text-success">✓ Clinic found</span> :
                    clinicLookupStatus === "not_found" ? <span className="text-xs text-destructive">✗ Not found</span> : undefined
                  ) : undefined}
                />
              </div>
            )}
            <TextField
              label="Full Name"
              data-testid="manager-name-input"
              value={form.name}
              onChange={(val) => setForm({ ...form, name: val })}
              required
              icon={<User size={16} />}
              error={fieldErrors.name}
            />
            <TextField
              label="Phone"
              data-testid="manager-phone-input"
              value={form.phone}
              onChange={(val) => setForm({ ...form, phone: val })}
              required
              icon={<Phone size={16} />}
              error={fieldErrors.phone}
            />
          </div>

          {/* Row 2: Username + Password */}
          <div className="grid grid-cols-2 gap-3">
            {isCreate ? (
              <div>
                <TextField
                  label="Username"
                  data-testid="manager-username-input"
                  value={form.username}
                  onChange={(val) => setForm({ ...form, username: val })}
                  required
                  icon={<User size={16} />}
                  error={fieldErrors.username}
                  labelSuffix={statusLabel}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-card-alt mb-2">Username</label>
                <div className="flex items-center border border-input rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-alt">
                  <User size={16} className="mr-2" />
                  {form.username}
                </div>
              </div>
            )}
            <TextField
              label={isCreate ? "Password (leave blank to auto-generate)" : "New Password (leave blank to keep current)"}
              value={form.password}
              onChange={(val) => setForm({ ...form, password: val })}
              type="password"
              icon={<Lock size={16} />}
              error={fieldErrors.password}
            />
          </div>
        </div>
      </div>

      <ErrorBanner message={error} className="mb-3" />
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'admin',
  title: 'Clinic Manager Management Tab',
  elements: {
    // ── Tab & toolbar ──
    managersTab: { role: 'button', name: /Clinic Managers/ },
    searchBar: { testId: 'search-managers' },
    refreshBtn: { testId: 'manager-refresh' },
    addManagerBtn: { role: 'button', name: /Add Clinic Manager/ },
    table: { testId: 'admin-manager-table' },
    tableRows: { role: 'row', name: /.*/ },
    editBtn: { testId: 'btn-edit' },
    emptyMsg: { role: 'cell', name: 'No managers found.' },

    // ── Active toggle in table ──
    activeToggle: { testId: 'manager-active-toggle' },

    // ── Create/edit modal ──
    modalTitle: { role: 'heading', name: /Add Clinic Manager|Edit Clinic Manager/ },
    clinicUsernameInput: { role: 'textbox', name: 'Clinic Username' },
    clinicFoundIndicator: { text: /Clinic found/ },
    nameInput: { testId: 'manager-name-input' },
    phoneInput: { testId: 'manager-phone-input' },
    usernameInput: { testId: 'manager-username-input' },
    formError: { text: /Clinic not found/ },
    createBtn: { role: 'button', name: 'Create' },
    saveBtn: { role: 'button', name: 'Save' },
    cancelBtn: { role: 'button', name: 'Cancel' },

    // ── Temp password dialog ──
    tempPassword: { testId: 'temp-password' },
    doneBtn: { role: 'button', name: 'Done' },

    // ── Confirm modals ──
    confirmTitle: { role: 'heading', name: /Delete Manager|Restore Manager/ },
    confirmActionBtn: { testId: 'confirm-action-btn' },

    // ── Validation error elements ──
    nameError: { testId: 'manager-name-input-error' },
    phoneError: { testId: 'manager-phone-input-error' },
    usernameError: { testId: 'manager-username-input-error' },

    // ── Success toast ──
    successToast: { testId: 'toast-success' },
  },
  flows: [
    {
      name: 'view manager list',
      steps: [
        { do: 'waitFor', on: 'managersTab' },
        { do: 'click', on: 'managersTab' },
        { do: 'waitFor', on: 'table' },
        { expect: 'visible', on: 'table' },
        { expect: 'visible', on: 'addManagerBtn' },
        { expect: 'visible', on: 'searchBar' },
      ],
    },
    {
      name: 'search managers',
      after: 'view manager list',
      steps: [
        { do: 'fill', on: 'searchBar', value: 'name:test' },
        { expect: 'visible', on: 'table' },
      ],
    },
    {
      name: 'search with no results',
      after: 'view manager list',
      steps: [
        { do: 'fill', on: 'searchBar', value: 'name:zzz_nonexistent_999' },
        { do: 'waitFor', on: 'emptyMsg' },
        { expect: 'visible', on: 'emptyMsg' },
      ],
    },
    {
      name: 'create manager validation error with empty clinic',
      after: 'view manager list',
      steps: [
        { do: 'click', on: 'addManagerBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'reactFill', on: 'nameInput', value: 'Test Manager' },
        { do: 'reactFill', on: 'phoneInput', value: '0001000050' },
        { do: 'reactFill', on: 'usernameInput', value: 'e2emanager_test' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'formError' },
      ],
    },
    {
      name: 'create manager with numeric name shows validation error',
      after: 'view manager list',
      steps: [
        { do: 'click', on: 'addManagerBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'reactFill', on: 'clinicUsernameInput', value: 'e2e_clinic_primary' },
        { do: 'reactFill', on: 'nameInput', value: 'Test Manager 2' },
        { do: 'reactFill', on: 'phoneInput', value: '0001000043' },
        { do: 'reactFill', on: 'usernameInput', value: 'e2emanager2' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'nameError' },
        { expect: 'text', on: 'nameError', value: 'Only alphabetic characters are allowed' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'create clinic manager',
      after: 'view manager list',
      steps: [
        { do: 'click', on: 'addManagerBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'reactFill', on: 'clinicUsernameInput', value: 'e2e_clinic_primary' },
        { do: 'waitFor', on: 'clinicFoundIndicator' },
        { do: 'reactFill', on: 'nameInput', value: 'Test Manager Two' },
        { do: 'reactFill', on: 'phoneInput', value: '0001000043' },
        { do: 'reactFill', on: 'usernameInput', value: 'e2emanager2' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'tempPassword' },
        { do: 'click', on: 'doneBtn' },
        { expect: 'hidden', on: 'modalTitle' },
      ],
    },
    {
      name: 'verify created manager persists after reload',
      steps: [
        { do: 'click', on: 'managersTab' },
        { do: 'waitFor', on: 'table' },
        { do: 'reload' },
        { do: 'click', on: 'managersTab' },
        { do: 'waitFor', on: 'table' },
        { expect: 'visible', on: 'table' },
      ],
    },
    {
      name: 'edit clinic manager',
      after: 'view manager list',
      steps: [
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'nameInput', value: 'Updated Manager' },
        { do: 'click', on: 'saveBtn' },
        { expect: 'hidden', on: 'modalTitle' },
        { expect: 'visible', on: 'successToast' },
      ],
    },
    {
      name: 'edited manager values persist when reopened',
      after: 'edit clinic manager',
      steps: [
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { expect: 'value', on: 'nameInput', value: 'Updated Manager' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'toggle manager active status',
      after: 'view manager list',
      steps: [
        { do: 'click', on: 'activeToggle' },
        { expect: 'visible', on: 'confirmTitle' },
        { do: 'click', on: 'confirmActionBtn' },
        { expect: 'hidden', on: 'confirmTitle' },
        { expect: 'visible', on: 'successToast' },
      ],
    },
    // ── Negative: Submit empty form shows errors ──
    {
      name: 'submit empty manager form shows required errors',
      after: 'view manager list',
      steps: [
        { do: 'click', on: 'addManagerBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'nameError' },
        { expect: 'visible', on: 'phoneError' },
        { expect: 'visible', on: 'usernameError' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    // ── Negative: Name validation ──
    {
      name: 'manager name with numbers shows error',
      after: 'view manager list',
      steps: [
        { do: 'click', on: 'addManagerBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'reactFill', on: 'clinicUsernameInput', value: 'e2e_clinic_primary' },
        { do: 'reactFill', on: 'nameInput', value: 'Manager123' },
        { do: 'reactFill', on: 'phoneInput', value: '0001000050' },
        { do: 'reactFill', on: 'usernameInput', value: 'validmanager' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'nameError' },
        { expect: 'text', on: 'nameError', value: 'Only alphabetic characters are allowed' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    // ── Negative: Username validation ──
    {
      name: 'manager username too short shows error',
      after: 'view manager list',
      steps: [
        { do: 'click', on: 'addManagerBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'reactFill', on: 'clinicUsernameInput', value: 'e2e_clinic_primary' },
        { do: 'reactFill', on: 'nameInput', value: 'Test Manager' },
        { do: 'reactFill', on: 'phoneInput', value: '0001000050' },
        { do: 'reactFill', on: 'usernameInput', value: 'ab' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'usernameError' },
        { expect: 'text', on: 'usernameError', value: 'Must be at least 3 characters long' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    // ── Negative: Phone validation ──
    {
      name: 'manager phone too few digits shows error',
      after: 'view manager list',
      steps: [
        { do: 'click', on: 'addManagerBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'reactFill', on: 'clinicUsernameInput', value: 'e2e_clinic_primary' },
        { do: 'reactFill', on: 'nameInput', value: 'Test Manager' },
        { do: 'reactFill', on: 'phoneInput', value: '12345' },
        { do: 'reactFill', on: 'usernameInput', value: 'validmanager' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'phoneError' },
        { expect: 'text', on: 'phoneError', value: 'Must have exactly 10 digits after +91' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
  ],
});
