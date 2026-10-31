"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { User, Phone, FileText, GraduationCap, Tag as TagIcon, Lock, Shield, X } from "lucide-react";
import { DataTable, Modal, ImageUpload, BannerUpload, AvatarUpload, TextField, SelectField, TextAreaField, Button, Checkbox, ToggleSwitch, CollapsibleSection, ConfirmModal, useToast, FilterSearchBar, ListToolbar, useAnalytics, TempPasswordReveal, useUsernameAvailability, ErrorBanner, type ParsedFilters, type FilterDef } from "@swasthyaseva/ui";
import { getDoctors, createDoctor, updateDoctor, deleteDoctor, restoreDoctor, Doctor, getSpecializations, getTags, Specialization, Tag, ExtraQualification, getExtraQualifications, getDoctorExtraQualifications, addDoctorExtraQualification, removeDoctorExtraQualification, checkDoctorUsername } from "@/lib/api";
import { uploadToCloudinary } from "@/lib/upload";
import { validateForm, createDoctorSchema, updateDoctorSchema, type FieldErrors } from "@swasthyaseva/ui";
import { componentTestSpec } from '@swasthyaseva/test-gen';

type DoctorForm = {
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  base_degree_code: string;
  postgrad_specialization_code: string;
  super_specialization_code: string;
  tags: string[];
  license_no: string;
  password: string;
  pfp_link: string;
  banner_link: string;
  signature_link: string;
  bio: string;
  verified_doctor: boolean;
  extra_qualifications: string[];
  prescription_format: string;
};

const EMPTY_FORM: DoctorForm = {
  username: "",
  first_name: "",
  last_name: "",
  phone: "",
  base_degree_code: "",
  postgrad_specialization_code: "",
  super_specialization_code: "",
  tags: [],
  license_no: "",
  password: "",
  pfp_link: "",
  banner_link: "",
  signature_link: "",
  bio: "",
  verified_doctor: false,
  extra_qualifications: [],
  prescription_format: "GEN_MED",
};

const DOCTOR_FILTER_DEFS: FilterDef[] = [
  { key: "username", label: "Username", color: "blue" },
  { key: "name", label: "Name", color: "green" },
  { key: "phone", label: "Phone", color: "purple" },
];

export default function DoctorTab() {
  const { trackEvent } = useAnalytics();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const filtersRef = useRef<ParsedFilters>({ filters: {}, search: "" });
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form, setForm] = useState<DoctorForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [tempPassword, setTempPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "restore" | "verify" | "unverify" | "make_public" | "make_private"; doctor: Doctor } | null>(null);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [extraQualifications, setExtraQualifications] = useState<ExtraQualification[]>([]);
  const { addToast } = useToast();

  useEffect(() => {
    Promise.all([getSpecializations(), getTags(), getExtraQualifications()]).then(([s, t, eq]) => {
      setSpecializations(s); setTags(t); setExtraQualifications(eq);
    }).catch(console.error);
  }, []);

  const load = useCallback(async (parsed?: ParsedFilters) => {
    const p = parsed ?? filtersRef.current;
    setLoading(true);
    try {
      const filters = { ...p.filters };
      
      // Parse field:value format from search string
      if (p.search) {
        const colonIdx = p.search.indexOf(':');
        if (colonIdx > 0 && colonIdx < p.search.length - 1) {
          const field = p.search.slice(0, colonIdx).trim().toLowerCase();
          const value = p.search.slice(colonIdx + 1).trim();
          if (field === 'username' || field === 'name' || field === 'phone') {
            filters[field] = value;
          } else {
            filters.search = p.search;
          }
        } else {
          filters.search = p.search;
        }
      }
      
      setDoctors(await getDoctors(true, filters));
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError("");
    setFieldErrors({});
    setTempPassword("");
    setEditing(null);
    setModal("create");
  }

  async function openEdit(doc: Doctor) {
    let extraQuals: string[] = [];
    try {
      const quals = await getDoctorExtraQualifications(doc.doctor_id);
      extraQuals = quals.map(q => q.qualification_code);
    } catch (e) {
      console.error('Failed to load extra qualifications:', e);
    }

    setForm({
      username: doc.username,
      first_name: doc.first_name,
      last_name: doc.last_name,
      phone: doc.phone,
      base_degree_code: doc.base_degree_code,
      postgrad_specialization_code: doc.postgrad_specialization_code ?? "",
      super_specialization_code: doc.super_specialization_code ?? "",
      tags: [doc.tag_1, doc.tag_2, doc.tag_3].filter(Boolean) as string[],
      license_no: doc.license_no,
      password: "",
      pfp_link: doc.pfp_link ?? "",
      banner_link: doc.banner_link ?? "",
      signature_link: doc.signature_link ?? "",
      bio: doc.bio ?? "",
      verified_doctor: doc.verified_doctor,
      extra_qualifications: extraQuals,
      prescription_format: doc.prescription_format ?? "STANDARD",
    });
    setFormError("");
    setFieldErrors({});
    setTempPassword("");
    setEditing(doc);
    setModal("edit");
  }

  async function handleSubmit() {
    setFormError("");
    const schema = modal === "create" ? createDoctorSchema : updateDoctorSchema;
    const errs = validateForm(schema, form as unknown as Record<string, string>);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setFormError(`Please fix ${Object.keys(errs).length} field error(s) above`);
      return;
    }
    setSubmitting(true);
    try {
      if (modal === "create") {
        const { tags, extra_qualifications, ...rest } = form;
        const payload: Record<string, unknown> = { ...rest };
        if (!payload.password) delete payload.password;
        if (!payload.pfp_link) delete payload.pfp_link;
        if (!payload.banner_link) delete payload.banner_link;
        if (!payload.signature_link) delete payload.signature_link;
        if (!payload.bio) delete payload.bio;
        if (!payload.postgrad_specialization_code) delete payload.postgrad_specialization_code;
        if (!payload.super_specialization_code) delete payload.super_specialization_code;
        if (tags[0]) payload.tag_1 = tags[0];
        if (tags[1]) payload.tag_2 = tags[1];
        if (tags[2]) payload.tag_3 = tags[2];
        const res = await createDoctor(payload);
        
        // Add extra qualifications for newly created doctor
        if (res.doctor && form.extra_qualifications.length > 0) {
          for (const qualCode of form.extra_qualifications) {
            try {
              await addDoctorExtraQualification(res.doctor.doctor_id, qualCode);
            } catch (e) {
              console.error('Failed to add extra qualification:', qualCode, e);
            }
          }
        }
        
        trackEvent('doctor_created', { username: form.username });
        if (res.temporaryPassword) setTempPassword(res.temporaryPassword);
        else { setModal(null); addToast("Doctor created successfully", "success"); load(); }
      } else if (modal === "edit" && editing) {
        const payload: Record<string, unknown> = {};
        const editable = ["first_name", "last_name", "phone", "pfp_link", "banner_link", "signature_link", "bio", "license_no", "verified_doctor", "postgrad_specialization_code", "super_specialization_code", "prescription_format"] as const;
        for (const k of editable) {
          const val = form[k];
          if (val !== "") payload[k] = val;
        }
        payload.tag_1 = form.tags[0] || null;
        payload.tag_2 = form.tags[1] || null;
        payload.tag_3 = form.tags[2] || null;
        if (form.password) payload.password = form.password;
        await updateDoctor(editing.doctor_id, payload);

        // Sync extra qualifications (non-blocking — don't prevent modal close)
        try {
          const currentQuals = await getDoctorExtraQualifications(editing.doctor_id);
          const currentCodes = currentQuals.map(q => q.qualification_code);
          const toAdd = form.extra_qualifications.filter(c => !currentCodes.includes(c));
          const toRemove = currentCodes.filter(c => !form.extra_qualifications.includes(c));
          for (const qualCode of toAdd) {
            try { await addDoctorExtraQualification(editing.doctor_id, qualCode); } catch (e) { console.error('Failed to add extra qualification:', qualCode, e); }
          }
          for (const qualCode of toRemove) {
            try { await removeDoctorExtraQualification(editing.doctor_id, qualCode); } catch (e) { console.error('Failed to remove extra qualification:', qualCode, e); }
          }
        } catch (e) {
          console.error('Failed to sync extra qualifications:', e);
        }

        trackEvent('doctor_updated', { doctorId: editing.doctor_id });
        await load();
        setModal(null);
        addToast("Doctor updated successfully", "success");
      }
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error");
      addToast(e instanceof Error ? e.message : "Operation failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(doc: Doctor) {
    setConfirmAction({ type: "make_private", doctor: doc });
  }

  function handleRestore(doc: Doctor) {
    setConfirmAction({ type: "make_public", doctor: doc });
  }

  async function executeConfirmAction() {
    if (!confirmAction) return;
    const { type, doctor: doc } = confirmAction;
    setConfirmAction(null);
    try {
      if (type === "make_private" || type === "delete") {
        await deleteDoctor(doc.doctor_id);
        addToast(`Dr. ${doc.first_name} ${doc.last_name} made private`, "success");
      } else if (type === "make_public" || type === "restore") {
        await restoreDoctor(doc.doctor_id);
        addToast(`Dr. ${doc.first_name} ${doc.last_name} made public`, "success");
      } else if (type === "verify" || type === "unverify") {
        await updateDoctor(doc.doctor_id, { verified_doctor: type === "verify" });
        addToast(`Dr. ${doc.first_name} ${doc.last_name} ${type === "verify" ? "verified" : "unverified"}`, "success");
      }
      load();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : `${type} failed`, "error");
    }
  }

  function handleToggleVerified(doc: Doctor) {
    setConfirmAction({ type: doc.verified_doctor ? "unverify" : "verify", doctor: doc });
  }

  function handleTogglePublic(doc: Doctor) {
    if (doc.is_deleted) {
      handleRestore(doc);
    } else {
      handleDelete(doc);
    }
  }

  const columns = [
    { header: "ID", accessor: "doctor_id" as const },
    { header: "Username", accessor: "username" as const },
    { header: "Name", accessor: (d: Doctor) => `${d.first_name} ${d.last_name}` },
    { header: "Phone", accessor: "phone" as const },
    { header: "Degree", accessor: (d: Doctor) => d.base_degree_name ?? d.base_degree_code },
    { header: "License", accessor: "license_no" as const },
    { header: "Verified", accessor: (d: Doctor, index: number) => (
      <ToggleSwitch label="" checked={d.verified_doctor} onChange={() => handleToggleVerified(d)} data-testid={index === 0 ? "doctor-verified-toggle" : undefined} />
    ) },
    { header: "Public", accessor: (d: Doctor, index: number) => (
      <ToggleSwitch label="" checked={!d.is_deleted} onChange={() => handleTogglePublic(d)} data-testid={index === 0 ? "doctor-public-toggle" : undefined} />
    ) },
  ];

  return (
    <div>
      <ListToolbar onRefresh={() => load()} loading={loading} refreshTestId="doctor-refresh"
        actionLabel="Add Doctor" actionTestId="btn-add-doctor" onAction={openCreate}>
        <FilterSearchBar
          filterDefs={DOCTOR_FILTER_DEFS}
          placeholder="Search doctors... or type username:john"
          onSearch={(parsed) => { filtersRef.current = parsed; load(parsed); }}
          onSearchStart={() => setSearching(true)}
          data-testid="search-doctors"
        />
      </ListToolbar>

      <div className="hidden md:block" data-testid="admin-doctor-table">
        <DataTable
          columns={columns}
          data={doctors}
          loading={searching || loading}
          renderActions={(d, index) => (
            <div className="flex items-center gap-2 justify-end">
              {!d.is_deleted && (
                <Button variant="accent" size="sm" data-testid="btn-edit" onClick={() => openEdit(d)}>Edit</Button>
              )}
            </div>
          )}
          emptyMessage="No doctors found."
        />
      </div>

      <div className="block md:hidden space-y-3">
        {doctors.length === 0 && (
          <p className="text-sm text-muted-alt text-center py-8">No doctors found.</p>
        )}
        {doctors.map((d, index) => (
          <div key={d.doctor_id} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-card-alt truncate">{d.first_name} {d.last_name}</p>
                  {d.verified_doctor && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                      <Shield size={10} /> Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-alt mt-1">@{d.username}</p>
                <p className="text-sm text-muted-alt">{d.phone}</p>
              </div>
              {!d.is_deleted && (
                <Button variant="accent" size="sm" className="shrink-0" onClick={() => openEdit(d)}>Edit</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal === "create" ? "Add Doctor" : "Edit Doctor"} onClose={() => setModal(null)} maxWidth="full"
          footer={!tempPassword ? (
            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={submitting} variant="primary" className="flex-1">
                {submitting ? "Saving…" : modal === "create" ? "Create" : "Save"}
              </Button>
              <Button onClick={() => setModal(null)} variant="secondary" className="flex-1">Cancel</Button>
              <Button onClick={() => setShowPreview(true)} variant="secondary" className="flex-1">Preview</Button>
            </div>
          ) : undefined}
        >
          {tempPassword ? (
            <TempPasswordReveal
              password={tempPassword}
              message="Doctor created successfully. Save the temporary password below — it will not be shown again."
              onDone={() => { setModal(null); setTempPassword(""); load(); }}
            />
          ) : (
            <DoctorForm
              form={form}
              setForm={setForm}
              isCreate={modal === "create"}
              error={formError}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
              submitting={submitting}
              onSubmit={handleSubmit}
              onCancel={() => setModal(null)}
              onPreview={() => setShowPreview(true)}
              specializations={specializations}
              tags={tags}
              extraQualifications={extraQualifications}
            />
          )}
        </Modal>
      )}

      {showPreview && (
        <Modal title="Doctor Profile Preview" onClose={() => setShowPreview(false)}>
          <DoctorPreview form={form} specializations={specializations} tags={tags} extraQualifications={extraQualifications} />
        </Modal>
      )}

      {confirmAction && (
        <ConfirmModal
          title={
            confirmAction.type === "make_private" || confirmAction.type === "delete" ? "Make Doctor Private" :
            confirmAction.type === "make_public" || confirmAction.type === "restore" ? "Make Doctor Public" :
            confirmAction.type === "verify" ? "Verify Doctor" : "Unverify Doctor"
          }
          message={
            confirmAction.type === "verify"
              ? `Are you sure you want to mark Dr. ${confirmAction.doctor.first_name} ${confirmAction.doctor.last_name} as verified?`
              : confirmAction.type === "unverify"
              ? `Are you sure you want to remove verification from Dr. ${confirmAction.doctor.first_name} ${confirmAction.doctor.last_name}?`
              : confirmAction.type === "make_private" || confirmAction.type === "delete"
              ? `Are you sure you want to make Dr. ${confirmAction.doctor.first_name} ${confirmAction.doctor.last_name} private?`
              : `Are you sure you want to make Dr. ${confirmAction.doctor.first_name} ${confirmAction.doctor.last_name} public?`
          }
          confirmLabel={
            confirmAction.type === "make_private" || confirmAction.type === "delete" ? "Make Private" :
            confirmAction.type === "make_public" || confirmAction.type === "restore" ? "Make Public" :
            confirmAction.type === "verify" ? "Verify" : "Unverify"
          }
          variant={(confirmAction.type === "make_private" || confirmAction.type === "delete" || confirmAction.type === "unverify") ? "danger" : "info"}
          onConfirm={executeConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

function InlineMultiSelect({
  label,
  icon,
  selected,
  options,
  getLabel,
  onAdd,
  onRemove,
  disabled = false,
  placeholder = "Select...",
  "data-testid": testId,
}: {
  label: ReactNode;
  icon?: ReactNode;
  selected: string[];
  options: { value: string; label: string }[];
  getLabel: (code: string) => string;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  "data-testid"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      return () => document.removeEventListener("mousedown", onClickOutside);
    }
  }, [open]);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  return (
    <div ref={containerRef} className="relative" data-testid={testId}>
      <label className="block text-sm font-medium text-card-alt mb-2 flex items-center gap-1.5">
        {label}
      </label>
      <div
        className={`flex flex-wrap items-center gap-1.5 min-h-[38px] px-2 py-1.5 border rounded-md bg-background transition-colors cursor-text ${
          open ? "border-primary ring-2 ring-inset ring-primary" : "border-input"
        }`}
        onClick={() => { if (!disabled) { setOpen(true); } }}
      >
        {icon && <span className="text-muted-alt shrink-0">{icon}</span>}
        {selected.map((code) => (
          <span
            key={code}
            data-testid={testId ? `${testId}-chip` : undefined}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium"
          >
            {getLabel(code)}
            <button
              type="button"
              data-testid={testId ? `${testId}-remove` : undefined}
              onClick={(e) => { e.stopPropagation(); onRemove(code); }}
              className="hover:text-destructive"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {!disabled && (
          <input
            ref={searchRef}
            type="text"
            data-testid={testId ? `${testId}-input` : undefined}
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (!open) setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={selected.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[80px] bg-transparent text-sm text-card-alt outline-none placeholder:text-muted-alt"
          />
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
          <ul className="max-h-48 overflow-y-auto py-1" role="listbox">
            {filtered.map((opt, idx) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={false}
                data-testid={testId ? `${testId}-option-${idx}` : undefined}
                onClick={() => { onAdd(opt.value); setSearch(""); searchRef.current?.focus(); }}
                className="px-3 py-2 text-sm cursor-pointer transition-colors text-card-alt hover:bg-muted"
              >
                {opt.label}
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-alt">No results</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function DoctorForm({
  form, setForm, isCreate, error, fieldErrors, setFieldErrors, submitting, onSubmit, onCancel, onPreview,
  specializations, tags, extraQualifications,
}: {
  form: DoctorForm;
  setForm: (f: DoctorForm) => void;
  isCreate: boolean;
  error: string;
  fieldErrors: FieldErrors;
  setFieldErrors: (errors: FieldErrors) => void;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onPreview?: () => void;
  specializations: Specialization[];
  tags: Tag[];
  extraQualifications: ExtraQualification[];
}) {
  const baseDegrees = specializations.filter(s => ['MBBS', 'BDS'].includes(s.specialization_code));
  const postgradDegrees = specializations.filter(s => s.specialization_code.startsWith('MD_') || s.specialization_code.startsWith('MS_'));
  const superSpecDegrees = specializations.filter(s => s.specialization_code.startsWith('DM_') || s.specialization_code.startsWith('MCH_'));

  const { statusLabel } = useUsernameAvailability(form.username, checkDoctorUsername, { enabled: isCreate });

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
        {/* Section 1: Personal Information */}
        <CollapsibleSection title="Personal Information" icon={<User size={16} className="text-primary" />}>
          <div className="flex gap-4">
            {/* Profile Picture — circular avatar */}
            <AvatarUpload
              value={form.pfp_link}
              onChange={(url) => setForm({ ...form, pfp_link: url })}
              onUpload={uploadToCloudinary}
              label="Photo"
              error={fieldErrors.pfp_link}
              required={isCreate}
            />

            {/* Right side: Both rows of fields */}
            <div className="flex-1 space-y-3">
              {/* Row 1: First Name | Last Name | Username */}
              <div className="grid grid-cols-3 gap-3">
                <TextField
                  label="First Name"
                  data-testid="doctor-first-name"
                  value={form.first_name}
                  onChange={(val) => setForm({ ...form, first_name: val })}
                  required
                  icon={<User size={16} />}
                  error={fieldErrors.first_name}
                />
                <TextField
                  label="Last Name"
                  data-testid="doctor-last-name"
                  value={form.last_name}
                  onChange={(val) => setForm({ ...form, last_name: val })}
                  required
                  icon={<User size={16} />}
                  error={fieldErrors.last_name}
                />
                {isCreate ? (
                  <TextField
                    label="Username"
                    data-testid="doctor-username-input"
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
              </div>

              {/* Row 2: Phone | Registration No. | Password | Verified */}
              <div className="grid grid-cols-4 gap-3">
                <TextField
                  label="Phone"
                  data-testid="doctor-phone"
                  value={form.phone}
                  onChange={(val) => setForm({ ...form, phone: val })}
                  required
                  icon={<Phone size={16} />}
                  error={fieldErrors.phone}
                />
                <TextField
                  label="Registration No."
                  data-testid="doctor-license"
                  value={form.license_no}
                  onChange={(val) => setForm({ ...form, license_no: val })}
                  required
                  icon={<FileText size={16} />}
                  error={fieldErrors.license_no}
                />
                <TextField
                  label={isCreate ? "Password (auto-generated if blank)" : "Password (keeps current if blank)"}
                  data-testid="doctor-password"
                  value={form.password}
                  onChange={(val) => setForm({ ...form, password: val })}
                  type="password"
                  icon={<Lock size={16} />}
                  error={fieldErrors.password}
                />
                <div className="flex items-end pb-2">
                  <ToggleSwitch
                    label="Verified Doctor"
                    checked={form.verified_doctor}
                    onChange={(checked) => setForm({ ...form, verified_doctor: checked })}
                  />
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 2: Education & Qualifications */}
        <CollapsibleSection title="Education & Qualifications" icon={<GraduationCap size={16} className="text-primary" />}>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <SelectField
              label="Base Degree"
              value={form.base_degree_code}
              onChange={(val) => setForm({ ...form, base_degree_code: val })}
              options={baseDegrees.map(s => ({ value: s.specialization_code, label: s.name }))}
              required
              error={fieldErrors.base_degree_code}
              icon={<GraduationCap size={16} />}
            />
            <SelectField
              label="Postgrad Specialization"
              value={form.postgrad_specialization_code}
              onChange={(val) => setForm({ ...form, postgrad_specialization_code: val })}
              options={postgradDegrees.map(s => ({ value: s.specialization_code, label: s.name }))}
              icon={<GraduationCap size={16} />}
            />
            <SelectField
              label="Super Specialization"
              value={form.super_specialization_code}
              onChange={(val) => setForm({ ...form, super_specialization_code: val })}
              options={superSpecDegrees.map(s => ({ value: s.specialization_code, label: s.name }))}
              icon={<GraduationCap size={16} />}
            />
          </div>

          {/* Extra Qualifications — inline multi-select */}
          <InlineMultiSelect
            label="Extra Qualifications"
            icon={<GraduationCap size={16} />}
            selected={form.extra_qualifications}
            options={extraQualifications.filter(q => !form.extra_qualifications.includes(q.qualification_code)).map(q => ({ value: q.qualification_code, label: q.name }))}
            getLabel={(code) => extraQualifications.find(q => q.qualification_code === code)?.name ?? code}
            onAdd={(val) => setForm({ ...form, extra_qualifications: [...form.extra_qualifications, val] })}
            onRemove={(val) => setForm({ ...form, extra_qualifications: form.extra_qualifications.filter(c => c !== val) })}
          />
        </CollapsibleSection>

        {/* Section 3: Profile & Account */}
        <CollapsibleSection title="Profile & Account" icon={<Shield size={16} className="text-primary" />}>
          {/* Tags + Prescription Format — same row */}
          <div className="grid grid-cols-[7fr_3fr] gap-4 mb-4">
            <InlineMultiSelect
              label={<><TagIcon size={14} className="text-primary" /> Tags {form.tags.length > 0 && <span className="text-xs text-muted-alt">({form.tags.length}/3)</span>}</>}
              icon={<TagIcon size={16} />}
              selected={form.tags}
              options={tags.filter(t => !form.tags.includes(t.tag_code)).map(t => ({ value: t.tag_code, label: t.name }))}
              getLabel={(code) => tags.find(t => t.tag_code === code)?.name ?? code}
              onAdd={(val) => { if (form.tags.length < 3) setForm({ ...form, tags: [...form.tags, val] }); }}
              onRemove={(val) => setForm({ ...form, tags: form.tags.filter(c => c !== val) })}
              disabled={form.tags.length >= 3}
              placeholder="Add a tag..."
              data-testid="doctor-tags-select"
            />
            <SelectField
              label="Prescription Format"
              value={form.prescription_format}
              onChange={(val) => setForm({ ...form, prescription_format: val })}
              options={[{ value: 'GEN_MED', label: 'General Medicine' }, { value: 'GEN_SURG', label: 'General Surgery' }, { value: 'ENT', label: 'ENT' }]}
              icon={<FileText size={16} />}
            />
          </div>

          {/* Bio */}
          <TextAreaField
            label="Bio"
            value={form.bio}
            onChange={(val) => {
              const lines = val.split('\n');
              if (lines.length <= 3) setForm({ ...form, bio: val });
            }}
            rows={3}
            maxLength={500}
            icon={<FileText size={16} />}
          />

          {/* Signature */}
          <div className="mt-4">
            <ImageUpload
              value={form.signature_link}
              onChange={(url) => setForm({ ...form, signature_link: url })}
              label="Signature"
              required
              error={fieldErrors.signature_link}
              onUpload={uploadToCloudinary}
            />
          </div>
        </CollapsibleSection>
      </div>

      <ErrorBanner message={error} className="mt-4" />
    </div>
  );
}

function DoctorPreview({ form, specializations, tags, extraQualifications }: {
  form: DoctorForm;
  specializations: Specialization[];
  tags: Tag[];
  extraQualifications: ExtraQualification[];
}) {
  const getSpecName = (code: string) => specializations.find(s => s.specialization_code === code)?.name ?? code;
  const getTagName = (code: string) => tags.find(t => t.tag_code === code)?.name ?? code;
  const getEqName = (code: string) => extraQualifications.find(q => q.qualification_code === code)?.name ?? code;

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
        {/* Avatar overlapping banner */}
        <div className="absolute -top-12 left-6">
          {form.pfp_link ? (
            <img src={form.pfp_link} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-card shadow-lg" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted border-4 border-card shadow-lg flex items-center justify-center">
              <User size={32} className="text-muted-alt" />
            </div>
          )}
        </div>

        <div className="pt-14">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-card-alt">
              {form.first_name || "First"} {form.last_name || "Last"}
            </h2>
            {form.verified_doctor && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                <Shield size={12} /> Verified
              </span>
            )}
          </div>
          <p className="text-sm text-muted-alt mt-0.5 line-clamp-2">
            {form.bio || "—"}
          </p>
          {form.phone && (
            <p className="text-sm text-muted-alt flex items-center gap-1 mt-1">
              <Phone size={13} /> {form.phone}
            </p>
          )}
        </div>
      </div>

      {/* Tags */}
      {form.tags.length > 0 && (
        <div className="px-6 pb-4 flex flex-wrap gap-2">
          {form.tags.map(tag => (
            <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent/15 text-accent">
              {getTagName(tag)}
            </span>
          ))}
        </div>
      )}

      {/* Qualifications */}
      <div className="px-6 pb-4">
        <h3 className="text-sm font-semibold text-card-alt mb-2">Qualifications</h3>
        <div className="space-y-1.5">
          {form.base_degree_code && (
            <div className="flex items-center gap-2 text-sm text-card-alt">
              <GraduationCap size={14} className="text-primary" />
              <span>{getSpecName(form.base_degree_code)}</span>
            </div>
          )}
          {form.postgrad_specialization_code && (
            <div className="flex items-center gap-2 text-sm text-card-alt">
              <GraduationCap size={14} className="text-primary" />
              <span>{getSpecName(form.postgrad_specialization_code)}</span>
            </div>
          )}
          {form.super_specialization_code && (
            <div className="flex items-center gap-2 text-sm text-card-alt">
              <GraduationCap size={14} className="text-primary" />
              <span>{getSpecName(form.super_specialization_code)}</span>
            </div>
          )}
        </div>
        {form.extra_qualifications.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {form.extra_qualifications.map(q => (
              <span key={q} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-alt">
                {getEqName(q)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'admin',
  title: 'Doctor Management Tab',
  elements: {
    // ── Tab & toolbar ──
    doctorsTab: { role: 'button', name: /Doctors/ },
    searchBar: { testId: 'search-doctors' },
    refreshBtn: { testId: 'doctor-refresh' },
    addDoctorBtn: { role: 'button', name: /Add Doctor/ },
    table: { testId: 'admin-doctor-table' },
    tableRows: { role: 'row', name: /.*/ },
    editBtn: { testId: 'btn-edit' },
    emptyMsg: { role: 'cell', name: 'No doctors found.' },

    // ── Verified / Public toggles in table ──
    verifiedToggle: { testId: 'doctor-verified-toggle' },
    publicToggle: { testId: 'doctor-public-toggle' },

    // ── Create/edit modal ──
    modalTitle: { role: 'heading', name: /Add Doctor|Edit Doctor/ },
    firstNameInput: { testId: 'doctor-first-name' },
    lastNameInput: { testId: 'doctor-last-name' },
    usernameInput: { testId: 'doctor-username-input' },
    phoneInput: { testId: 'doctor-phone' },
    licenseInput: { testId: 'doctor-license' },
    passwordInput: { testId: 'doctor-password' },
    baseDegree: { role: 'combobox', name: 'Base Degree' },
    createBtn: { role: 'button', name: 'Create' },
    saveBtn: { role: 'button', name: 'Save' },
    cancelBtn: { role: 'button', name: 'Cancel' },
    previewBtn: { role: 'button', name: 'Preview' },

    // ── Validation error elements ──
    usernameError: { testId: 'doctor-username-input-error' },
    firstNameError: { testId: 'doctor-first-name-error' },
    lastNameError: { testId: 'doctor-last-name-error' },
    phoneError: { testId: 'doctor-phone-error' },
    licenseError: { testId: 'doctor-license-error' },
    passwordError: { testId: 'doctor-password-error' },

    // ── Temp password dialog ──
    tempPassword: { testId: 'temp-password' },
    doneBtn: { role: 'button', name: 'Done' },

    // ── Confirm modals ──
    confirmTitle: { role: 'heading', name: /Make Doctor Private|Make Doctor Public|Verify Doctor|Unverify Doctor/ },
    confirmActionBtn: { testId: 'confirm-action-btn' },

    // ── Preview modal ──
    previewTitle: { role: 'heading', name: 'Doctor Profile Preview' },

    // ── Tags multi-select ──
    tagsSelect: { testId: 'doctor-tags-select' },
    tagsInput: { testId: 'doctor-tags-select-input' },
    tagsChip: { testId: 'doctor-tags-select-chip' },
    tagsRemoveBtn: { testId: 'doctor-tags-select-remove' },
    firstTagOption: { testId: 'doctor-tags-select-option-0' },

    // ── Base degree dropdown options ──
    baseDegreeOptionMBBS: { role: 'option', name: 'Bachelor of Medicine, Bachelor of Surgery' },
    baseDegreeOptionBDS: { role: 'option', name: 'Bachelor of Dental Surgery' },

    // ── Success toast ──
    successToast: { testId: 'toast-success' },
  },
  flows: [
    {
      name: 'view doctor list',
      steps: [
        { do: 'waitFor', on: 'doctorsTab' },
        { do: 'click', on: 'doctorsTab' },
        { expect: 'visible', on: 'table' },
        { expect: 'visible', on: 'addDoctorBtn' },
        { expect: 'visible', on: 'searchBar' },
      ],
    },
    {
      name: 'search doctors',
      after: 'view doctor list',
      steps: [
        { do: 'fill', on: 'searchBar', value: 'username:test' },
        { expect: 'visible', on: 'table' },
      ],
    },
    {
      name: 'search with no results',
      after: 'view doctor list',
      steps: [
        { do: 'fill', on: 'searchBar', value: 'username:zzz_nonexistent_999' },
        { do: 'waitFor', on: 'emptyMsg' },
        { expect: 'visible', on: 'emptyMsg' },
      ],
    },
    {
      name: 'create doctor',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'addDoctorBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'firstNameInput', value: 'Test' },
        { do: 'fill', on: 'lastNameInput', value: 'Doctor' },
        { do: 'fill', on: 'usernameInput', value: 'e2edoctor2' },
        { do: 'fill', on: 'phoneInput', value: '0001000054' },
        { do: 'fill', on: 'licenseInput', value: 'LIC999' },
        { do: 'comboboxSelect', on: 'baseDegree', value: 'Bachelor of Medicine, Bachelor of Surgery' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'tempPassword' },
        { do: 'click', on: 'doneBtn' },
        { expect: 'hidden', on: 'modalTitle' },
      ],
    },
    {
      name: 'verify created doctor persists after reload',
      steps: [
        { do: 'click', on: 'doctorsTab' },
        { do: 'waitFor', on: 'table' },
        { do: 'reload' },
        { do: 'click', on: 'doctorsTab' },
        { do: 'waitFor', on: 'table' },
        { expect: 'visible', on: 'table' },
      ],
    },
    {
      name: 'edit doctor',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'firstNameInput', value: 'Rahul' },
        { do: 'click', on: 'saveBtn' },
        { expect: 'hidden', on: 'modalTitle' },
        { expect: 'visible', on: 'successToast' },
      ],
    },
    {
      name: 'edited doctor values persist when reopened',
      after: 'edit doctor',
      steps: [
        { do: 'click', on: 'editBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { expect: 'value', on: 'firstNameInput', value: 'Rahul' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'toggle doctor public status',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'publicToggle' },
        { expect: 'visible', on: 'confirmTitle' },
        { do: 'click', on: 'confirmActionBtn' },
        { expect: 'hidden', on: 'confirmTitle' },
        { expect: 'visible', on: 'successToast' },
      ],
    },
    {
      name: 'toggle doctor verified status',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'verifiedToggle' },
        { expect: 'visible', on: 'confirmTitle' },
        { do: 'click', on: 'confirmActionBtn' },
        { expect: 'hidden', on: 'confirmTitle' },
        { expect: 'visible', on: 'successToast' },
      ],
    },
    {
      name: 'add and remove specialty tag in create modal',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'addDoctorBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'click', on: 'tagsInput' },
        { expect: 'visible', on: 'firstTagOption' },
        { do: 'click', on: 'firstTagOption' },
        { expect: 'visible', on: 'tagsChip' },
        { do: 'click', on: 'tagsRemoveBtn' },
        { expect: 'hidden', on: 'tagsChip' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    // ── Negative: Username validation ──
    {
      name: 'submit empty create form shows required errors',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'addDoctorBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'usernameError' },
        { expect: 'visible', on: 'firstNameError' },
        { expect: 'visible', on: 'phoneError' },
        { expect: 'visible', on: 'licenseError' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'username too short shows error',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'addDoctorBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'ab' },
        { do: 'fill', on: 'firstNameInput', value: 'Test' },
        { do: 'fill', on: 'lastNameInput', value: 'Doctor' },
        { do: 'fill', on: 'phoneInput', value: '0001000053' },
        { do: 'fill', on: 'licenseInput', value: 'LIC001' },
        { do: 'comboboxSelect', on: 'baseDegree', value: 'Bachelor of Medicine, Bachelor of Surgery' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'usernameError' },
        { expect: 'text', on: 'usernameError', value: 'Must be at least 3 characters long' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'username with special chars shows error',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'addDoctorBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'dr@smith!' },
        { do: 'fill', on: 'firstNameInput', value: 'Test' },
        { do: 'fill', on: 'lastNameInput', value: 'Doctor' },
        { do: 'fill', on: 'phoneInput', value: '0001000053' },
        { do: 'fill', on: 'licenseInput', value: 'LIC001' },
        { do: 'comboboxSelect', on: 'baseDegree', value: 'Bachelor of Medicine, Bachelor of Surgery' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'usernameError' },
        { expect: 'text', on: 'usernameError', value: 'Must contain only letters, numbers, dots, underscores, or hyphens' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    // ── Negative: Name validation ──
    {
      name: 'first name with numbers shows error',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'addDoctorBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'validuser' },
        { do: 'fill', on: 'firstNameInput', value: 'John123' },
        { do: 'fill', on: 'lastNameInput', value: 'Doctor' },
        { do: 'fill', on: 'phoneInput', value: '0001000053' },
        { do: 'fill', on: 'licenseInput', value: 'LIC001' },
        { do: 'comboboxSelect', on: 'baseDegree', value: 'Bachelor of Medicine, Bachelor of Surgery' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'firstNameError' },
        { expect: 'text', on: 'firstNameError', value: 'Only alphabetic characters are allowed' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'last name with special chars shows error',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'addDoctorBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'validuser' },
        { do: 'fill', on: 'firstNameInput', value: 'Test' },
        { do: 'fill', on: 'lastNameInput', value: 'Doe!@' },
        { do: 'fill', on: 'phoneInput', value: '0001000053' },
        { do: 'fill', on: 'licenseInput', value: 'LIC001' },
        { do: 'comboboxSelect', on: 'baseDegree', value: 'Bachelor of Medicine, Bachelor of Surgery' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'lastNameError' },
        { expect: 'text', on: 'lastNameError', value: 'Only alphabetic characters are allowed' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    // ── Negative: Phone validation ──
    {
      name: 'phone with too few digits shows error',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'addDoctorBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'validuser' },
        { do: 'fill', on: 'firstNameInput', value: 'Test' },
        { do: 'fill', on: 'lastNameInput', value: 'Doctor' },
        { do: 'fill', on: 'phoneInput', value: '12345' },
        { do: 'fill', on: 'licenseInput', value: 'LIC001' },
        { do: 'comboboxSelect', on: 'baseDegree', value: 'Bachelor of Medicine, Bachelor of Surgery' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'phoneError' },
        { expect: 'text', on: 'phoneError', value: 'Must have exactly 10 digits after +91' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    // ── Negative: Password validation ──
    {
      name: 'weak password too short shows error',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'addDoctorBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'validuser' },
        { do: 'fill', on: 'firstNameInput', value: 'Test' },
        { do: 'fill', on: 'lastNameInput', value: 'Doctor' },
        { do: 'fill', on: 'phoneInput', value: '0001000053' },
        { do: 'fill', on: 'licenseInput', value: 'LIC001' },
        { do: 'fill', on: 'passwordInput', value: 'Short1!' },
        { do: 'comboboxSelect', on: 'baseDegree', value: 'Bachelor of Medicine, Bachelor of Surgery' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'passwordError' },
        { expect: 'text', on: 'passwordError', value: 'Password must be at least 12 characters long' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'password without uppercase shows error',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'addDoctorBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'validuser' },
        { do: 'fill', on: 'firstNameInput', value: 'Test' },
        { do: 'fill', on: 'lastNameInput', value: 'Doctor' },
        { do: 'fill', on: 'phoneInput', value: '0001000053' },
        { do: 'fill', on: 'licenseInput', value: 'LIC001' },
        { do: 'fill', on: 'passwordInput', value: 'abcdefgh1234!' },
        { do: 'comboboxSelect', on: 'baseDegree', value: 'Bachelor of Medicine, Bachelor of Surgery' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'passwordError' },
        { expect: 'text', on: 'passwordError', value: 'Must contain uppercase letter' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'password without digit shows error',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'addDoctorBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'validuser' },
        { do: 'fill', on: 'firstNameInput', value: 'Test' },
        { do: 'fill', on: 'lastNameInput', value: 'Doctor' },
        { do: 'fill', on: 'phoneInput', value: '0001000053' },
        { do: 'fill', on: 'licenseInput', value: 'LIC001' },
        { do: 'fill', on: 'passwordInput', value: 'Abcdefghijkl!' },
        { do: 'comboboxSelect', on: 'baseDegree', value: 'Bachelor of Medicine, Bachelor of Surgery' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'passwordError' },
        { expect: 'text', on: 'passwordError', value: 'Must contain a digit' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'password without special char shows error',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'addDoctorBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'fill', on: 'usernameInput', value: 'validuser' },
        { do: 'fill', on: 'firstNameInput', value: 'Test' },
        { do: 'fill', on: 'lastNameInput', value: 'Doctor' },
        { do: 'fill', on: 'phoneInput', value: '0001000053' },
        { do: 'fill', on: 'licenseInput', value: 'LIC001' },
        { do: 'fill', on: 'passwordInput', value: 'Abcdefgh1234' },
        { do: 'comboboxSelect', on: 'baseDegree', value: 'Bachelor of Medicine, Bachelor of Surgery' },
        { do: 'click', on: 'createBtn' },
        { expect: 'visible', on: 'passwordError' },
        { expect: 'text', on: 'passwordError', value: 'Must contain a special character' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
    {
      name: 'verify base degree dropdown has all options',
      after: 'view doctor list',
      steps: [
        { do: 'click', on: 'addDoctorBtn' },
        { expect: 'visible', on: 'modalTitle' },
        { do: 'click', on: 'baseDegree' },
        { expect: 'visible', on: 'baseDegreeOptionMBBS' },
        { expect: 'visible', on: 'baseDegreeOptionBDS' },
        { do: 'click', on: 'cancelBtn' },
      ],
    },
  ],
});
