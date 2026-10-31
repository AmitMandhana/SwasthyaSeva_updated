"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Building2, Phone, MapPin, Globe, User, Lock, Shield, FileText } from "lucide-react";
import { DataTable, Modal, ImageUpload, BannerUpload, AvatarUpload, TextField, SelectField, Button, Checkbox, ToggleSwitch, CollapsibleSection, ConfirmModal, useToast, FilterSearchBar, ListToolbar, useAnalytics, TempPasswordReveal, useUsernameAvailability, ErrorBanner, type ParsedFilters, type FilterDef } from "@swasthyaseva/ui";
import { getClinics, createClinic, updateClinic, deleteClinic, restoreClinic, Clinic, getStates, StateOption, checkClinicUsername } from "@/lib/api";
import { uploadToCloudinary } from "@/lib/upload";
import { validateForm, createClinicSchema, updateClinicSchema, type FieldErrors } from "@swasthyaseva/ui";
import { componentTestSpec } from '@swasthyaseva/test-gen';
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[250px] rounded-lg bg-muted text-muted-alt text-sm">
      Loading map...
    </div>
  ),
});

type ClinicForm = {
  username: string;
  clinic_name: string;
  phone: string;
  license_no: string;
  pfp_link: string;
  banner_link: string;
  street_address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  location_x: string;
  location_y: string;
  verified: boolean;
  password: string;
};

const EMPTY: ClinicForm = {
  username: "", clinic_name: "", phone: "", license_no: "", pfp_link: "", banner_link: "",
  street_address: "", city: "", state: "", pincode: "", country: "India",
  location_x: "", location_y: "", verified: false, password: "",
};

const CLINIC_FILTER_DEFS_BASE: Omit<FilterDef, "suggestions">[] = [
  { key: "username", label: "Username", color: "cyan" },
  { key: "name", label: "Name", color: "blue" },
  { key: "phone", label: "Phone", color: "green" },
  { key: "city", label: "City", color: "purple" },
  { key: "state", label: "State", color: "amber" },
];

export default function ClinicTab() {
  const { trackEvent } = useAnalytics();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const filtersRef = useRef<ParsedFilters>({ filters: {}, search: "" });
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [form, setForm] = useState<ClinicForm>(EMPTY);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [tempPassword, setTempPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "restore" | "verify" | "unverify"; clinic: Clinic } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { addToast } = useToast();

  const [stateOptions, setStateOptions] = useState<StateOption[]>([]);
  useEffect(() => {
    getStates().then(setStateOptions).catch(() => {});
  }, []);

  const clinicFilterDefs: FilterDef[] = useMemo(() =>
    CLINIC_FILTER_DEFS_BASE.map((f) =>
      f.key === "state" && stateOptions.length > 0
        ? { ...f, suggestions: stateOptions.map((s) => s.label) }
        : f
    ),
    [stateOptions]
  );

  const load = useCallback(async (parsed?: ParsedFilters) => {
    const p = parsed ?? filtersRef.current;
    setLoading(true);
    try { setClinics(await getClinics(true, { ...p.filters, ...(p.search ? { search: p.search } : {}) })); }
    catch (e: unknown) { console.error(e); }
    finally { setLoading(false); setSearching(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY); setFormError(""); setTempPassword(""); setEditing(null); setModal("create");
  }

  function openEdit(c: Clinic) {
    setForm({
      username: c.username ?? "",
      clinic_name: c.clinic_name ?? "",
      phone: c.phone,
      license_no: c.license_no ?? "",
      pfp_link: c.pfp_link,
      banner_link: c.banner_link,
      street_address: c.street_address,
      city: c.city,
      state: c.state,
      pincode: c.pincode ?? "",
      country: c.country,
      location_x: String(c.location_x),
      location_y: String(c.location_y),
      verified: c.verified,
      password: "",
    });
    setFormError(""); setTempPassword(""); setEditing(c); setModal("edit");
  }

  async function handleSubmit() {
    setFormError("");
    const schema = modal === "create" ? createClinicSchema : updateClinicSchema;
    const errs = validateForm(schema, form as unknown as Record<string, string>);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        phone: form.phone,
        pfp_link: form.pfp_link,
        banner_link: form.banner_link,
        street_address: form.street_address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        country: form.country,
        location_x: parseFloat(form.location_x),
        location_y: parseFloat(form.location_y),
        verified: form.verified,
      };
      if (form.clinic_name) payload.clinic_name = form.clinic_name;
      if (form.license_no) payload.license_no = form.license_no;
      if (form.password) payload.password = form.password;

      if (modal === "create") {
        payload.username = form.username;
        const res = await createClinic(payload);
        trackEvent('clinic_created', { username: form.username });
        if (res.temporaryPassword) { setTempPassword(res.temporaryPassword); return; }
        setModal(null); addToast("Clinic created successfully", "success"); load();
      } else if (modal === "edit" && editing) {
        await updateClinic(editing.clinic_id, payload);
        trackEvent('clinic_updated', { clinicId: editing.clinic_id });
        setModal(null); addToast("Clinic updated successfully", "success"); load();
      }
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error");
      addToast(e instanceof Error ? e.message : "Operation failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(c: Clinic) {
    setConfirmAction({ type: "delete", clinic: c });
  }

  function handleRestore(c: Clinic) {
    setConfirmAction({ type: "restore", clinic: c });
  }

  async function executeConfirmAction() {
    if (!confirmAction) return;
    const { type, clinic: c } = confirmAction;
    setConfirmAction(null);
    try {
      if (type === "verify" || type === "unverify") {
        await updateClinic(c.clinic_id, { verified: type === "verify" });
        addToast(`Clinic "${c.clinic_name ?? c.clinic_id}" ${type === "verify" ? "verified" : "unverified"}`, "success");
      } else if (type === "delete") {
        await deleteClinic(c.clinic_id);
        addToast(`Clinic "${c.clinic_name ?? c.clinic_id}" deleted`, "success");
      } else {
        await restoreClinic(c.clinic_id);
        addToast(`Clinic "${c.clinic_name ?? c.clinic_id}" restored`, "success");
      }
      load();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : `${type} failed`, "error");
    }
  }

  function handleToggleVerified(c: Clinic) {
    setConfirmAction({ type: c.verified ? "unverify" : "verify", clinic: c });
  }

  function handleTogglePublic(c: Clinic) {
    if (c.is_deleted) {
      handleRestore(c);
    } else {
      handleDelete(c);
    }
  }

  const columns = [
    { header: "ID", accessor: "clinic_id" as const },
    { header: "Username", accessor: "username" as const },
    { header: "Name", accessor: (c: Clinic) => c.clinic_name ?? "—" },
    { header: "Phone", accessor: "phone" as const },
    { header: "City", accessor: "city" as const },
    { header: "State", accessor: "state" as const },
    { header: "Verified", accessor: (c: Clinic, index: number) => (
      <ToggleSwitch label="" checked={c.verified} onChange={() => handleToggleVerified(c)} data-testid={index === 0 ? "clinic-verified-toggle" : undefined} />
    ) },
    { header: "Active", accessor: (c: Clinic, index: number) => (
      <ToggleSwitch label="" checked={!c.is_deleted} onChange={() => handleTogglePublic(c)} data-testid={index === 0 ? "clinic-active-toggle" : undefined} />
    ) },
  ];

  return (
    <div>
      <ListToolbar onRefresh={() => load()} loading={loading} refreshTestId="clinic-refresh"
        actionLabel="Add Clinic" actionTestId="btn-add-clinic" onAction={openCreate}>
        <FilterSearchBar
          filterDefs={clinicFilterDefs}
          placeholder="Search clinics... or type name:clinic"
          onSearch={(parsed) => { filtersRef.current = parsed; load(parsed); }}
          onSearchStart={() => setSearching(true)}
          data-testid="search-clinics"
        />
      </ListToolbar>

      <div className="hidden md:block" data-testid="admin-clinic-table">
        <DataTable columns={columns} data={clinics} loading={searching || loading}
          renderActions={(c, index) => (
            <div className="flex items-center gap-2 justify-end">
              {!c.is_deleted && (
                <Button variant="accent" size="xs" data-testid="btn-edit" onClick={() => openEdit(c)}>Edit</Button>
              )}
            </div>
          )}
          emptyMessage="No clinics found." />
      </div>

      <div className="block md:hidden space-y-3">
        {clinics.length === 0 && (
          <p className="text-sm text-muted-alt text-center py-8">No clinics found.</p>
        )}
        {clinics.map((c, index) => (
          <div key={c.clinic_id} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-card-alt truncate">{c.clinic_name ?? "Unnamed Clinic"}</p>
                  {c.verified && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                      <Shield size={10} /> Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-alt mt-1">{c.phone}</p>
                <p className="text-sm text-muted-alt">{c.city}, {c.state}</p>
              </div>
              {!c.is_deleted && (
                <Button variant="accent" size="sm" className="shrink-0" onClick={() => openEdit(c)}>Edit</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal === "create" ? "Add Clinic" : "Edit Clinic"} onClose={() => setModal(null)} maxWidth="full"
          footer={!tempPassword ? (
            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={submitting} variant="primary" className="flex-1">
                {submitting ? "Saving\u2026" : modal === "create" ? "Create" : "Save"}
              </Button>
              <Button onClick={() => setShowPreview(true)} variant="secondary" className="flex-1">Preview</Button>
              <Button onClick={() => setModal(null)} variant="secondary" className="flex-1">Cancel</Button>
            </div>
          ) : undefined}
        >
          {tempPassword ? (
            <TempPasswordReveal
              password={tempPassword}
              message="Clinic created. Save this temporary password:"
              onDone={() => { setModal(null); setTempPassword(""); load(); }}
            />
          ) : (
            <ClinicFormFields form={form} setForm={setForm} isCreate={modal === "create"} error={formError}
              fieldErrors={fieldErrors} setFieldErrors={setFieldErrors} submitting={submitting} onSubmit={handleSubmit} onCancel={() => setModal(null)} stateOptions={stateOptions} />
          )}
        </Modal>
      )}

      {showPreview && (
        <Modal title="Clinic Profile Preview" onClose={() => setShowPreview(false)}>
          <ClinicPreview form={form} />
        </Modal>
      )}

      {confirmAction && (
        <ConfirmModal
          title={
            confirmAction.type === "delete" ? "Make Clinic Private" :
            confirmAction.type === "restore" ? "Make Clinic Public" :
            confirmAction.type === "verify" ? "Verify Clinic" : "Unverify Clinic"
          }
          message={
            confirmAction.type === "verify"
              ? `Are you sure you want to mark clinic "${confirmAction.clinic.clinic_name ?? confirmAction.clinic.clinic_id}" as verified?`
              : confirmAction.type === "unverify"
              ? `Are you sure you want to remove verification from clinic "${confirmAction.clinic.clinic_name ?? confirmAction.clinic.clinic_id}"?`
              : confirmAction.type === "delete"
              ? `Are you sure you want to hide "${confirmAction.clinic.clinic_name ?? confirmAction.clinic.clinic_id}" from public view? The clinic and its admin will still have access.`
              : `Are you sure you want to make "${confirmAction.clinic.clinic_name ?? confirmAction.clinic.clinic_id}" visible to the public again?`
          }
          confirmLabel={
            confirmAction.type === "delete" ? "Make Private" :
            confirmAction.type === "restore" ? "Make Public" :
            confirmAction.type === "verify" ? "Verify" : "Unverify"
          }
          variant={confirmAction.type === "delete" || confirmAction.type === "unverify" ? "danger" : "info"}
          onConfirm={executeConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

function ClinicFormFields({ form, setForm, isCreate, error, fieldErrors, setFieldErrors, submitting, onSubmit, onCancel, stateOptions }: {
  form: ClinicForm; setForm: (f: ClinicForm) => void; isCreate: boolean;
  error: string; fieldErrors: FieldErrors; setFieldErrors: (errors: FieldErrors) => void; submitting: boolean; onSubmit: () => void; onCancel: () => void; stateOptions: StateOption[];
}) {
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  const { statusLabel } = useUsernameAvailability(form.username, checkClinicUsername, { enabled: isCreate });

  return (
    <div className="flex flex-col">
      {/* Banner — LinkedIn-style */}
      <BannerUpload
        value={form.banner_link}
        onChange={(url) => setForm({ ...form, banner_link: url })}
        onUpload={uploadToCloudinary}
        error={fieldErrors.banner_link}
        required={isCreate}
      />

      <div className="space-y-4">
        {/* Section 1: Clinic Details */}
        <CollapsibleSection title="Clinic Details" icon={<Building2 size={16} className="text-primary" />}>
          <div className="flex gap-4">
            {/* Profile Picture — circular */}
            <AvatarUpload
              value={form.pfp_link}
              onChange={(url) => setForm({ ...form, pfp_link: url })}
              onUpload={uploadToCloudinary}
              label="Logo"
              error={fieldErrors.pfp_link}
              required={isCreate}
            />

            {/* Right side: Both rows of fields */}
            <div className="flex-1 space-y-3">
              {/* Row 1: Clinic Name | Phone | Registration No. */}
              <div className="grid grid-cols-3 gap-3">
                <TextField
                  label="Clinic Name"
                  data-testid="clinic-name"
                  value={form.clinic_name}
                  onChange={(val) => setForm({ ...form, clinic_name: val })}
                  required
                  icon={<Building2 size={16} />}
                  error={fieldErrors.clinic_name}
                />
                <TextField
                  label="Phone"
                  data-testid="clinic-phone"
                  value={form.phone}
                  onChange={(val) => setForm({ ...form, phone: val })}
                  required
                  icon={<Phone size={16} />}
                  error={fieldErrors.phone}
                />
                <TextField
                  label="Registration No."
                  data-testid="clinic-license"
                  value={form.license_no}
                  onChange={(val) => setForm({ ...form, license_no: val })}
                  required
                  icon={<FileText size={16} />}
                  error={fieldErrors.license_no}
                />
              </div>

              {/* Row 2: Username | Password | Verified Clinic */}
              <div className="grid grid-cols-3 gap-3">
                {isCreate ? (
                  <TextField
                    label="Username"
                    data-testid="clinic-username-input"
                    value={form.username}
                    onChange={(val) => setForm({ ...form, username: val })}
                    required
                    icon={<User size={16} />}
                    error={fieldErrors.username}
                    labelSuffix={statusLabel}
                  />
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
                  label={isCreate ? "Password (auto-generated if blank)" : "Password (keeps current if blank)"}
                  value={form.password}
                  onChange={(val) => setForm({ ...form, password: val })}
                  type="password"
                  icon={<Lock size={16} />}
                  error={fieldErrors.password}
                />
                <div className="flex items-end pb-2">
                  <ToggleSwitch
                    label="Verified Clinic"
                    checked={form.verified}
                    onChange={(checked) => setForm({ ...form, verified: checked })}
                  />
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 2: Address & Location */}
        <CollapsibleSection title="Address & Location" icon={<MapPin size={16} className="text-primary" />}>
          <TextField
            label="Street Address"
            data-testid="clinic-street"
            value={form.street_address}
            onChange={(val) => setForm({ ...form, street_address: val })}
            required
            icon={<MapPin size={16} />}
            error={fieldErrors.street_address}
          />
          <div className="grid grid-cols-4 gap-4 mt-3">
            <TextField
              label="City"
              data-testid="clinic-city"
              value={form.city}
              onChange={(val) => setForm({ ...form, city: val })}
              required
              icon={<MapPin size={16} />}
              error={fieldErrors.city}
            />
            <SelectField
              label="State"
              value={form.state}
              onChange={(val) => setForm({ ...form, state: val })}
              options={stateOptions}
              required
              icon={<MapPin size={16} />}
              error={fieldErrors.state}
            />
            <TextField
              label="Pincode"
              data-testid="clinic-pincode"
              value={form.pincode}
              onChange={(val) => setForm({ ...form, pincode: val })}
              required
              icon={<MapPin size={16} />}
              error={fieldErrors.pincode}
            />
            <TextField
              label="Country"
              value={form.country}
              onChange={(val) => setForm({ ...form, country: val })}
              icon={<Globe size={16} />}
            />
          </div>
          <div className="mt-3">
            <LocationPicker
              lat={form.location_y}
              lng={form.location_x}
              onSelect={(lat, lng) => setForm({ ...formRef.current, location_y: lat, location_x: lng })}
              onGmapsExtract={(data) => setForm({ ...formRef.current, location_y: data.lat, location_x: data.lng, street_address: data.street, city: data.city, state: data.state, pincode: data.pincode })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <TextField
              label="Longitude (X)"
              value={form.location_x}
              onChange={(val) => setForm({ ...form, location_x: val })}
              required={isCreate}
              icon={<Globe size={16} />}
              error={fieldErrors.location_x}
            />
            <TextField
              label="Latitude (Y)"
              value={form.location_y}
              onChange={(val) => setForm({ ...form, location_y: val })}
              required={isCreate}
              icon={<Globe size={16} />}
              error={fieldErrors.location_y}
            />
          </div>
        </CollapsibleSection>
      </div>

      <ErrorBanner message={error} className="mt-4" />
    </div>
  );
}

function ClinicPreview({ form }: { form: ClinicForm }) {
  return (
    <div className="max-w-2xl mx-auto bg-background rounded-xl overflow-hidden">
      {/* Banner */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-r from-primary/20 to-primary/5">
        {form.banner_link && (
          <img src={form.banner_link} alt="Banner" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Profile header */}
      <div className="relative px-6 pb-4">
        {/* Logo overlapping banner */}
        <div className="absolute -top-12 left-6">
          {form.pfp_link ? (
            <img src={form.pfp_link} alt="Logo" className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-lg" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted border-4 border-background shadow-lg flex items-center justify-center">
              <Building2 size={32} className="text-muted-alt" />
            </div>
          )}
        </div>

        <div className="pt-14">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-card-alt">
              {form.clinic_name || "Clinic Name"}
            </h2>
            {form.verified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                <Shield size={12} /> Verified
              </span>
            )}
          </div>
          <p className="text-sm text-muted-alt mt-0.5">
            {[form.street_address, form.city, form.state].filter(Boolean).join(", ") || "—"}
          </p>
        </div>
      </div>

      {/* Contact & Details */}
      <div className="px-6 pb-4 space-y-2">
        {form.phone && (
          <p className="text-sm text-muted-alt flex items-center gap-2">
            <Phone size={14} className="text-primary" /> {form.phone}
          </p>
        )}
        {form.license_no && (
          <p className="text-sm text-muted-alt flex items-center gap-2">
            <FileText size={14} className="text-primary" /> Reg. No. {form.license_no}
          </p>
        )}
      </div>

      {/* Location details */}
      <div className="px-6 pb-4">
        <h3 className="text-sm font-semibold text-card-alt mb-2">Location</h3>
        <div className="space-y-1 text-sm text-muted-alt">
          {form.street_address && (
            <p className="flex items-center gap-2">
              <MapPin size={14} className="text-primary shrink-0" /> {form.street_address}
            </p>
          )}
          <p>
            {[form.city, form.state, form.pincode].filter(Boolean).join(", ")}
            {form.country && form.country !== "India" ? `, ${form.country}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'admin',
  title: 'Clinic Management Tab',
  elements: {
    // ── Tab & toolbar ──
    clinicsTab: { testId: 'tab-clinics' },
    searchBar: { testId: 'search-clinics' },
    refreshBtn: { testId: 'clinic-refresh' },
    addClinicBtn: { role: 'button', name: /Add Clinic/ },
    table: { testId: 'admin-clinic-table' },
    tableRows: { role: 'row', name: /.*/ },
    editBtn: { testId: 'btn-edit' },
    emptyMsg: { role: 'cell', name: 'No clinics found.' },

    // ── Verified / Active toggles in table ──
    verifiedToggle: { testId: 'clinic-verified-toggle' },
    activeToggle: { testId: 'clinic-active-toggle' },

    // ── Create/edit modal ──
    modalTitle: { role: 'heading', name: /Add Clinic|Edit Clinic/ },
    clinicNameInput: { testId: 'clinic-name' },
    phoneInput: { testId: 'clinic-phone' },
    licenseInput: { testId: 'clinic-license' },
    usernameInput: { testId: 'clinic-username-input' },
    streetInput: { testId: 'clinic-street' },
    cityInput: { testId: 'clinic-city' },
    stateSelect: { role: 'combobox', name: 'State' },
    pincodeInput: { testId: 'clinic-pincode' },
    createBtn: { role: 'button', name: 'Create' },
    saveBtn: { role: 'button', name: 'Save' },
    cancelBtn: { role: 'button', name: 'Cancel' },
    previewBtn: { role: 'button', name: 'Preview' },

    // ── Validation error elements ──
    usernameError: { testId: 'clinic-username-input-error' },
    phoneError: { testId: 'clinic-phone-error' },
    licenseError: { testId: 'clinic-license-error' },
    streetError: { testId: 'clinic-street-error' },
    cityError: { testId: 'clinic-city-error' },
    pincodeError: { testId: 'clinic-pincode-error' },

    // ── Temp password dialog ──
    tempPassword: { testId: 'temp-password' },
    doneBtn: { role: 'button', name: 'Done' },

    // ── Confirm modals ──
    confirmTitle: { role: 'heading', name: /Make Clinic Private|Make Clinic Public|Verify Clinic|Unverify Clinic/ },
    confirmActionBtn: { testId: 'confirm-action-btn' },

    // ── Location fields ──
    longitudeInput: { role: 'textbox', name: 'Longitude (X)' },
    latitudeInput: { role: 'textbox', name: 'Latitude (Y)' },
    gmapsLinkInput: { testId: 'gmaps-link-input' },
    mapIframe: { testId: 'map-iframe' },

    // ── Preview modal ──
    previewTitle: { role: 'heading', name: 'Clinic Profile Preview' },

    // ── Success toast ──
    successToast: { testId: 'toast-success' },
  },
  flows: [
    {
      name: 'view clinic list',
      steps: [
        { do: 'waitFor', on: 'clinicsTab' },
        { do: 'click', on: 'clinicsTab' },
        { do: 'waitFor', on: 'table' },
        { expect: 'visible', on: 'table' },
        { expect: 'visible', on: 'addClinicBtn' },
        { expect: 'visible', on: 'searchBar' },
      ],
    },
    {
      name: 'search clinics',
      after: 'view clinic list',
      steps: [
        { do: 'fill', on: 'searchBar', value: 'name:e2eclinic' },
        { expect: 'visible', on: 'table' },
      ],
    },
    {
      name: 'search with no results',
      after: 'view clinic list',
      steps: [
        { do: 'fill', on: 'searchBar', value: 'name:zzz_nonexistent_999' },
        { do: 'waitFor', on: 'emptyMsg' },
        { expect: 'visible', on: 'emptyMsg' },
      ],
    },
    {
      name: 'create clinic with address fields',
      after: 'view clinic list',
      steps: [
        { do: 'click', on: 'addClinicBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'clinicNameInput', value: 'Test Clinic' },
        { do: 'fill', on: 'phoneInput', value: '0001000052' },
        { do: 'fill', on: 'licenseInput', value: 'REG999' },
        { do: 'fill', on: 'usernameInput', value: 'e2eclinic2' },
        { do: 'fill', on: 'streetInput', value: '123 Test St' },
        { do: 'fill', on: 'cityInput', value: 'Mumbai' },
        { do: 'comboboxSelect', on: 'stateSelect', value: 'Maharashtra' },
        { do: 'fill', on: 'pincodeInput', value: '400001' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'tempPassword' },
        { do: 'click', on: 'doneBtn' },
        { expect: 'hidden', on: 'modalTitle' },
      ],
    },
    {
      name: 'verify created clinic persists after reload',
      steps: [
        { do: 'click', on: 'clinicsTab' },
        { do: 'waitFor', on: 'table' },
        { do: 'reload' },
        { do: 'click', on: 'clinicsTab' },
        { do: 'waitFor', on: 'table' },
        { expect: 'visible', on: 'table' },
      ],
    },
    {
      name: 'edit clinic',
      after: 'view clinic list',
      steps: [
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'clinicNameInput', value: 'Updated Clinic' },
        { do: 'click', on: 'saveBtn' },
        { expect: 'hidden', on: 'modalTitle' },
        { expect: 'visible', on: 'successToast' },
      ],
    },
    {
      name: 'edited clinic values persist when reopened',
      after: 'edit clinic',
      steps: [
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { expect: 'value', on: 'clinicNameInput', value: 'Updated Clinic' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'toggle clinic active status',
      after: 'view clinic list',
      steps: [
        { do: 'click', on: 'activeToggle' },
        { expect: 'visible', on: 'confirmTitle' },
        { do: 'click', on: 'confirmActionBtn' },
        { expect: 'hidden', on: 'confirmTitle' },
        { expect: 'visible', on: 'successToast' },
      ],
    },
    {
      name: 'toggle clinic verified status',
      after: 'view clinic list',
      steps: [
        { do: 'click', on: 'verifiedToggle' },
        { expect: 'visible', on: 'confirmTitle' },
        { do: 'click', on: 'confirmActionBtn' },
        { expect: 'hidden', on: 'confirmTitle' },
        { expect: 'visible', on: 'successToast' },
      ],
    },
    {
      name: 'edit clinic with location picker google maps link',
      after: 'view clinic list',
      steps: [
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'gmapsLinkInput', value: 'https://www.google.com/maps/@19.0760,72.8777,17z' },
        { expect: 'visible', on: 'mapIframe' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'edit clinic with manual lat lng entry',
      after: 'view clinic list',
      steps: [
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'longitudeInput', value: '72.8777' },
        { do: 'fill', on: 'latitudeInput', value: '19.0760' },
        { expect: 'visible', on: 'longitudeInput' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    // ── Negative: Submit empty form shows required errors ──
    {
      name: 'submit empty clinic form shows required errors',
      after: 'view clinic list',
      steps: [
        { do: 'click', on: 'addClinicBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'usernameError' },
        { expect: 'visible', on: 'phoneError' },
        { expect: 'visible', on: 'licenseError' },
        { expect: 'visible', on: 'streetError' },
        { expect: 'visible', on: 'cityError' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    // ── Negative: Username validation ──
    {
      name: 'clinic username too short shows error',
      after: 'view clinic list',
      steps: [
        { do: 'click', on: 'addClinicBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'ab' },
        { do: 'fill', on: 'phoneInput', value: '0001000051' },
        { do: 'fill', on: 'licenseInput', value: 'REG001' },
        { do: 'fill', on: 'streetInput', value: '123 Main St' },
        { do: 'fill', on: 'cityInput', value: 'Mumbai' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'usernameError' },
        { expect: 'text', on: 'usernameError', value: 'Must be at least 3 characters long' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'clinic username with special chars shows error',
      after: 'view clinic list',
      steps: [
        { do: 'click', on: 'addClinicBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'cl@nic!' },
        { do: 'fill', on: 'phoneInput', value: '0001000051' },
        { do: 'fill', on: 'licenseInput', value: 'REG001' },
        { do: 'fill', on: 'streetInput', value: '123 Main St' },
        { do: 'fill', on: 'cityInput', value: 'Mumbai' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'usernameError' },
        { expect: 'text', on: 'usernameError', value: 'Must contain only letters, numbers, dots, underscores, or hyphens' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    // ── Negative: Phone validation ──
    {
      name: 'clinic phone too few digits shows error',
      after: 'view clinic list',
      steps: [
        { do: 'click', on: 'addClinicBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'validclinic' },
        { do: 'fill', on: 'phoneInput', value: '12345' },
        { do: 'fill', on: 'licenseInput', value: 'REG001' },
        { do: 'fill', on: 'streetInput', value: '123 Main St' },
        { do: 'fill', on: 'cityInput', value: 'Mumbai' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'phoneError' },
        { expect: 'text', on: 'phoneError', value: 'Must have exactly 10 digits after +91' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    // ── Negative: Address validation ──
    {
      name: 'clinic street address with special chars shows error',
      after: 'view clinic list',
      steps: [
        { do: 'click', on: 'addClinicBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'validclinic' },
        { do: 'fill', on: 'phoneInput', value: '0001000051' },
        { do: 'fill', on: 'licenseInput', value: 'REG001' },
        { do: 'fill', on: 'streetInput', value: '123 Main St @#$' },
        { do: 'fill', on: 'cityInput', value: 'Mumbai' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'streetError' },
        { expect: 'text', on: 'streetError', value: 'Must not contain special characters except , . -' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'clinic city with special chars shows error',
      after: 'view clinic list',
      steps: [
        { do: 'click', on: 'addClinicBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'validclinic' },
        { do: 'fill', on: 'phoneInput', value: '0001000051' },
        { do: 'fill', on: 'licenseInput', value: 'REG001' },
        { do: 'fill', on: 'streetInput', value: '123 Main St' },
        { do: 'fill', on: 'cityInput', value: 'New York!' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'cityError' },
        { expect: 'text', on: 'cityError', value: 'Must contain only letters, numbers, or spaces' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    // ── Negative: Pincode validation ──
    {
      name: 'clinic pincode not 6 digits shows error',
      after: 'view clinic list',
      steps: [
        { do: 'click', on: 'addClinicBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'validclinic' },
        { do: 'fill', on: 'phoneInput', value: '0001000051' },
        { do: 'fill', on: 'licenseInput', value: 'REG001' },
        { do: 'fill', on: 'streetInput', value: '123 Main St' },
        { do: 'fill', on: 'cityInput', value: 'Mumbai' },
        { do: 'fill', on: 'pincodeInput', value: '1234' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'pincodeError' },
        { expect: 'text', on: 'pincodeError', value: 'Pincode must be a 6-digit number' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
  ],
});
