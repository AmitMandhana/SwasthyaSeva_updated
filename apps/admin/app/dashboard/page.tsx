import ClientDashboard from "./ClientDashboard";
import { testSpec } from '@swasthyaseva/test-gen';

export default function DashboardPage() {
  return <ClientDashboard />;
}

export const __test = testSpec({
  route: '/dashboard',
  auth: 'role:admin',
  app: 'admin',
  title: 'Admin Dashboard',
  elements: {
    // ── Top bar ──
    themeToggle: { role: 'button', name: 'Toggle theme' },
    userMenuTrigger: { testId: 'user-menu-trigger' },
    userMenuDropdown: { testId: 'user-menu-dropdown' },
    userMenuChangePassword: { testId: 'user-menu-change-password' },
    userMenuLogout: { testId: 'user-menu-logout' },

    // ── Tab navigation ──
    doctorsTab: { role: 'button', name: /Doctors/ },
    clinicsTab: { testId: 'tab-clinics' },
    managersTab: { role: 'button', name: /Clinic Managers/ },
    slotsTab: { role: 'button', name: /Slots/ },
    toolsTab: { testId: 'tab-tools' },

    // ── Tools tab ──
    toolsMenu: { testId: 'tools-menu' },
    toolCardOtp: { testId: 'tool-card-otp' },
    toolCardAudit: { testId: 'tool-card-audit' },
    toolCardJourney: { testId: 'tool-card-journey' },
    toolsBackBtn: { testId: 'tools-back-btn' },

    // ── Doctors tab ──
    doctorSearchBar: { testId: 'search-doctors' },
    addDoctorButton: { role: 'button', name: /Add Doctor/ },
    doctorTable: { testId: 'admin-doctor-table' },
    doctorEditButton: { testId: 'btn-edit' },
    doctorVerifiedToggle: { testId: 'doctor-verified-toggle' },
    doctorPublicToggle: { testId: 'doctor-public-toggle' },

    // ── Doctor create/edit modal ──
    doctorModalTitle: { role: 'heading', name: /Add Doctor|Edit Doctor/ },
    doctorFirstNameInput: { role: 'textbox', name: 'First Name' },
    doctorLastNameInput: { role: 'textbox', name: 'Last Name' },
    doctorUsernameInput: { testId: 'doctor-username-input' },
    doctorPhoneInput: { role: 'textbox', name: 'Phone' },
    doctorLicenseInput: { role: 'textbox', name: 'Registration No.' },
    doctorBaseDegree: { role: 'combobox', name: 'Base Degree' },
    doctorCreateButton: { role: 'button', name: 'Create' },
    doctorSaveButton: { role: 'button', name: 'Save' },
    doctorDoneButton: { role: 'button', name: 'Done' },
    doctorTempPassword: { testId: 'temp-password' },

    // ── Doctor confirm modals ──
    confirmModalTitle: { role: 'heading', name: /Make Doctor Private|Make Doctor Public|Verify Doctor|Unverify Doctor|Make Clinic Private|Make Clinic Public|Verify Clinic|Unverify Clinic|Delete Manager|Restore Manager|Delete Slot|Restore Slot/ },
    confirmActionButton: { testId: 'confirm-action-btn' },

    // ── Clinics tab ──
    clinicSearchBar: { testId: 'search-clinics' },
    addClinicButton: { role: 'button', name: /Add Clinic/ },
    clinicTable: { testId: 'admin-clinic-table' },
    clinicEditButton: { testId: 'btn-edit' },
    clinicVerifiedToggle: { testId: 'clinic-verified-toggle' },
    clinicActiveToggle: { testId: 'clinic-active-toggle' },

    // ── Clinic create/edit modal ──
    clinicModalTitle: { role: 'heading', name: /Add Clinic|Edit Clinic/ },
    clinicNameInput: { role: 'textbox', name: 'Clinic Name' },
    clinicPhoneInput: { role: 'textbox', name: 'Phone' },
    clinicLicenseInput: { role: 'textbox', name: 'Registration No.' },
    clinicUsernameInput: { testId: 'clinic-username-input' },
    clinicStreetInput: { role: 'textbox', name: 'Street Address' },
    clinicCityInput: { role: 'textbox', name: 'City' },
    clinicCreateButton: { role: 'button', name: 'Create' },
    clinicSaveButton: { role: 'button', name: 'Save' },

    // ── Clinic Managers tab ──
    managerSearchBar: { testId: 'search-managers' },
    addManagerButton: { role: 'button', name: /Add Clinic Manager/ },
    managerTable: { testId: 'admin-manager-table' },
    managerEditButton: { testId: 'btn-edit' },
    managerActiveToggle: { testId: 'manager-active-toggle' },

    // ── Manager create/edit modal ──
    managerModalTitle: { role: 'heading', name: /Add Clinic Manager|Edit Clinic Manager/ },
    managerClinicUsernameInput: { role: 'textbox', name: 'Clinic Username' },
    clinicFoundIndicator: { text: /Clinic found/ },
    managerNameInput: { role: 'textbox', name: 'Full Name' },
    managerPhoneInput: { role: 'textbox', name: 'Phone' },
    managerUsernameInput: { testId: 'manager-username-input' },
    managerCreateButton: { role: 'button', name: 'Create' },
    managerSaveButton: { role: 'button', name: 'Save' },

    // ── Slots tab ──
    slotSearchBar: { testId: 'search-slots' },
    newSlotButton: { role: 'button', name: /New Slot/ },
    slotTable: { testId: 'admin-slot-table' },
    slotEditButton: { testId: 'btn-edit' },
    slotDeleteButton: { testId: 'btn-delete' },

    // ── Slot create/edit modal ──
    slotModalTitle: { role: 'heading', name: /Create Slot|Edit Slot/ },
    slotDoctorUsernameInput: { role: 'textbox', name: 'Doctor Username' },
    slotClinicUsernameInput: { role: 'textbox', name: 'Clinic Username' },
    slotStartTime: { role: 'combobox', name: 'Start Time' },
    slotEndTime: { role: 'combobox', name: 'End Time' },
    slotVisitFeeInput: { role: 'spinbutton', name: 'Visit Fee (₹)' },
    slotBookingFeeInput: { role: 'spinbutton', name: 'Booking Fee (₹)' },
    slotDaySelect: { role: 'combobox', name: 'Day' },
    slotCreateButton: { role: 'button', name: 'Create' },
    slotSaveButton: { role: 'button', name: 'Save' },
    // ── Audit Log (inside Tools) ──
    auditSearchBar: { testId: 'search-audit' },
    auditShowListToggle: { role: 'switch', name: 'Show List Actions' },
    auditTable: { testId: 'admin-audit-table' },
    auditExpandableRow: { testId: 'expandable-row-first' },
    auditExpandedData: { testId: 'audit-expanded-data' },
    auditPreviousButton: { role: 'button', name: 'Previous' },
    auditNextButton: { role: 'button', name: 'Next' },

    // ── Session bar ──
    sessionBar: { testId: 'session-bar' },

    // ── Change Password modal (via user menu) ──
    changePasswordModalTitle: { role: 'dialog', name: /Change Password/ },
    changePasswordCurrentInput: { testId: 'user-menu-current-password' },
    changePasswordNewInput: { testId: 'user-menu-new-password' },
    changePasswordConfirmInput: { testId: 'user-menu-confirm-password' },
    changePasswordSubmitBtn: { role: 'button', name: /Update Password/ },
    changePasswordError: { testId: 'user-menu-password-error' },
    changePasswordSuccess: { testId: 'user-menu-password-success' },

    // ── Common ──
    successToast: { testId: 'toast-success' },
  },
  flows: [
    // ═══ Phase 1: View all tabs ═══
    { id: 'admin-02', name: 'view doctor list', steps: [
        { do: 'waitFor', on: 'doctorsTab' }, { do: 'click', on: 'doctorsTab' },
        { expect: 'visible', on: 'doctorTable' }, { expect: 'visible', on: 'addDoctorButton' }, { expect: 'visible', on: 'doctorSearchBar' },
    ]},
    { id: 'admin-08', name: 'view clinic list', steps: [
        { do: 'waitFor', on: 'doctorsTab' }, { do: 'click', on: 'clinicsTab' },
        { expect: 'visible', on: 'clinicTable' }, { expect: 'visible', on: 'addClinicButton' }, { expect: 'visible', on: 'clinicSearchBar' },
    ]},
    { id: 'admin-13', name: 'view manager list', steps: [
        { do: 'waitFor', on: 'doctorsTab' }, { do: 'click', on: 'managersTab' },
        { expect: 'visible', on: 'managerTable' }, { expect: 'visible', on: 'addManagerButton' }, { expect: 'visible', on: 'managerSearchBar' },
    ]},
    { id: 'admin-17', name: 'view slot list with filters', steps: [
        { do: 'waitFor', on: 'doctorsTab' }, { do: 'click', on: 'slotsTab' },
        { expect: 'visible', on: 'slotTable' }, { expect: 'visible', on: 'newSlotButton' }, { expect: 'visible', on: 'slotSearchBar' },
    ]},
    { id: 'admin-21', name: 'view audit log', steps: [
        { do: 'waitFor', on: 'doctorsTab' }, { do: 'click', on: 'toolsTab' },
        { expect: 'visible', on: 'toolsMenu' }, { do: 'click', on: 'toolCardAudit' },
        { expect: 'visible', on: 'auditTable' }, { expect: 'visible', on: 'auditSearchBar' },
    ]},

    { name: 'view tools menu', steps: [
        { do: 'waitFor', on: 'doctorsTab' }, { do: 'click', on: 'toolsTab' },
        { expect: 'visible', on: 'toolsMenu' }, { expect: 'visible', on: 'toolCardOtp' },
    ]},
    { name: 'open otp monitor from tools', after: 'view tools menu', steps: [
        { do: 'click', on: 'toolCardOtp' },
        { expect: 'visible', on: 'toolsBackBtn' },
    ]},
    { name: 'navigate back to tools menu', after: 'open otp monitor from tools', steps: [
        { do: 'click', on: 'toolsBackBtn' },
        { expect: 'visible', on: 'toolsMenu' },
    ]},

    // ═══ Phase 2: Search ═══
    { id: 'admin-03', name: 'search doctors', after: 'view doctor list', steps: [
        { do: 'fill', on: 'doctorSearchBar', value: 'username:test' }, { do: 'press', on: 'doctorSearchBar', value: 'Enter' }, { expect: 'visible', on: 'doctorTable' },
    ]},
    { name: 'search clinics', after: 'view clinic list', steps: [
        { do: 'fill', on: 'clinicSearchBar', value: 'name:City' }, { do: 'press', on: 'clinicSearchBar', value: 'Enter' }, { expect: 'visible', on: 'clinicTable' },
    ]},
    { name: 'search managers', after: 'view manager list', steps: [
        { do: 'fill', on: 'managerSearchBar', value: 'name:test' }, { do: 'press', on: 'managerSearchBar', value: 'Enter' }, { expect: 'visible', on: 'managerTable' },
    ]},

    // ═══ Phase 2b: Audit log filtering ═══
    { name: 'search audit logs by entity type', after: 'view audit log', steps: [
        { do: 'fill', on: 'auditSearchBar', value: 'entity_type:doctor' }, { do: 'press', on: 'auditSearchBar', value: 'Enter' }, { expect: 'visible', on: 'auditTable' },
    ]},
    { name: 'toggle show list actions in audit log', after: 'view audit log', steps: [
        { do: 'click', on: 'auditShowListToggle' }, { expect: 'visible', on: 'auditTable' },
        { do: 'click', on: 'auditShowListToggle' }, { expect: 'visible', on: 'auditTable' },
    ]},
    { name: 'expand audit log row shows request data', after: 'view audit log', steps: [
        { do: 'click', on: 'auditExpandableRow' },
        { expect: 'visible', on: 'auditExpandedData' },
    ]},

    // ═══ Phase 2c: Session bar ═══
    { name: 'session timer bar visible when authenticated', steps: [
        { expect: 'visible', on: 'sessionBar' },
    ]},

    // ═══ Phase 3: Create all entities (before any toggles/deletes) ═══
    { id: 'admin-04', name: 'create doctor', after: 'view doctor list', steps: [
        { do: 'click', on: 'addDoctorButton' }, { expect: 'visible', on: 'doctorModalTitle' },
        { do: 'fill', on: 'doctorFirstNameInput', value: 'Test' }, { do: 'fill', on: 'doctorLastNameInput', value: 'Doctor' },
        { do: 'fill', on: 'doctorUsernameInput', value: 'e2edoctor' }, { do: 'fill', on: 'doctorPhoneInput', value: '0001000040' },
        { do: 'fill', on: 'doctorLicenseInput', value: 'LIC123' },
        { do: 'comboboxSelect', on: 'doctorBaseDegree', value: 'Bachelor of Medicine, Bachelor of Surgery' },
        { do: 'click', on: 'doctorCreateButton' }, { expect: 'visible', on: 'doctorTempPassword' },
        { do: 'click', on: 'doctorDoneButton' }, { expect: 'hidden', on: 'doctorModalTitle' },
    ]},
    { name: 'verify created doctor persists after reload', steps: [
        { do: 'waitFor', on: 'doctorsTab' }, { do: 'click', on: 'doctorsTab' },
        { do: 'waitFor', on: 'doctorTable' },
        { do: 'reload' },
        { do: 'waitFor', on: 'doctorsTab' }, { do: 'click', on: 'doctorsTab' },
        { do: 'waitFor', on: 'doctorTable' },
        { expect: 'visible', on: 'doctorTable' },
    ]},
    { id: 'admin-09', name: 'create clinic', after: 'view clinic list', steps: [
        { do: 'click', on: 'addClinicButton' }, { expect: 'visible', on: 'clinicModalTitle' },
        { do: 'fill', on: 'clinicNameInput', value: 'Test Clinic' }, { do: 'fill', on: 'clinicPhoneInput', value: '0001000041' },
        { do: 'fill', on: 'clinicLicenseInput', value: 'REG456' }, { do: 'fill', on: 'clinicUsernameInput', value: 'e2eclinic' },
        { do: 'fill', on: 'clinicStreetInput', value: '123 Test St' }, { do: 'fill', on: 'clinicCityInput', value: 'Mumbai' },
        { do: 'click', on: 'clinicCreateButton' }, { expect: 'visible', on: 'doctorTempPassword' },
        { do: 'click', on: 'doctorDoneButton' }, { expect: 'hidden', on: 'clinicModalTitle' },
    ]},
    { name: 'verify created clinic persists after reload', steps: [
        { do: 'waitFor', on: 'doctorsTab' }, { do: 'click', on: 'clinicsTab' },
        { do: 'waitFor', on: 'clinicTable' },
        { do: 'reload' },
        { do: 'waitFor', on: 'doctorsTab' }, { do: 'click', on: 'clinicsTab' },
        { do: 'waitFor', on: 'clinicTable' },
        { expect: 'visible', on: 'clinicTable' },
    ]},
    { id: 'admin-14', name: 'create clinic manager', after: 'view manager list', steps: [
        { do: 'click', on: 'addManagerButton' }, { expect: 'visible', on: 'managerModalTitle' },
        { do: 'reactFill', on: 'managerClinicUsernameInput', value: 'e2e_clinic_primary' },
        { do: 'waitFor', on: 'clinicFoundIndicator' },
        { do: 'fill', on: 'managerNameInput', value: 'Test Manager' }, { do: 'fill', on: 'managerPhoneInput', value: '0001000042' },
        { do: 'fill', on: 'managerUsernameInput', value: 'e2emanager' },
        { do: 'click', on: 'managerCreateButton' }, { expect: 'visible', on: 'doctorTempPassword' },
        { do: 'click', on: 'doctorDoneButton' }, { expect: 'hidden', on: 'managerModalTitle' },
    ]},
    { name: 'verify created manager persists after reload', steps: [
        { do: 'waitFor', on: 'doctorsTab' }, { do: 'click', on: 'managersTab' },
        { do: 'waitFor', on: 'managerTable' },
        { do: 'reload' },
        { do: 'waitFor', on: 'doctorsTab' }, { do: 'click', on: 'managersTab' },
        { do: 'waitFor', on: 'managerTable' },
        { expect: 'visible', on: 'managerTable' },
    ]},
    { id: 'admin-18', name: 'create slot', after: 'view slot list with filters', steps: [
        { do: 'click', on: 'newSlotButton' }, { expect: 'visible', on: 'slotModalTitle' },
        { do: 'reactFill', on: 'slotDoctorUsernameInput', value: 'e2e_doc_primary' },
        { do: 'reactFill', on: 'slotClinicUsernameInput', value: 'e2e_clinic_primary' },
        { do: 'comboboxSelect', on: 'slotDaySelect', value: 'Tuesday' },
        { do: 'comboboxSelect', on: 'slotStartTime', value: '09:00' },
        { do: 'comboboxSelect', on: 'slotEndTime', value: '09:30' },
        { do: 'fill', on: 'slotVisitFeeInput', value: '500' },
        { do: 'fill', on: 'slotBookingFeeInput', value: '100' },
        { do: 'click', on: 'slotCreateButton' }, { expect: 'hidden', on: 'slotModalTitle' },
        { expect: 'visible', on: 'successToast' },
    ]},
    { name: 'verify created slot persists after reload', steps: [
        { do: 'waitFor', on: 'doctorsTab' }, { do: 'click', on: 'slotsTab' },
        { do: 'waitFor', on: 'slotTable' },
        { do: 'reload' },
        { do: 'waitFor', on: 'doctorsTab' }, { do: 'click', on: 'slotsTab' },
        { do: 'waitFor', on: 'slotTable' },
        { expect: 'visible', on: 'slotTable' },
    ]},

    // ═══ Phase 4: Edit (non-destructive) — each test is self-contained with unique entity ═══
    { id: 'admin-05', name: 'edit doctor', steps: [
        { do: 'click', on: 'doctorsTab' }, { do: 'waitFor', on: 'doctorTable' },
        { do: 'click', on: 'addDoctorButton' }, { expect: 'visible', on: 'doctorModalTitle' },
        { do: 'fill', on: 'doctorFirstNameInput', value: 'Edit' }, { do: 'fill', on: 'doctorLastNameInput', value: 'Doctor' },
        { do: 'fill', on: 'doctorUsernameInput', value: 'e2e_doc_edit' }, { do: 'fill', on: 'doctorPhoneInput', value: '0001000030' },
        { do: 'fill', on: 'doctorLicenseInput', value: 'LIC_EDIT' },
        { do: 'comboboxSelect', on: 'doctorBaseDegree', value: 'Bachelor of Medicine, Bachelor of Surgery' },
        { do: 'click', on: 'doctorCreateButton' }, { expect: 'visible', on: 'doctorTempPassword' },
        { do: 'click', on: 'doctorDoneButton' }, { expect: 'hidden', on: 'doctorModalTitle' },
        { do: 'fill', on: 'doctorSearchBar', value: 'username:e2e_doc_edit' }, { do: 'press', on: 'doctorSearchBar', value: 'Enter' }, { do: 'waitFor', on: 'doctorTable' },
        { do: 'click', on: 'doctorEditButton' }, { expect: 'visible', on: 'doctorModalTitle' },
        { do: 'fill', on: 'doctorFirstNameInput', value: 'Updated Edit' },
        { do: 'click', on: 'doctorSaveButton' }, { expect: 'hidden', on: 'doctorModalTitle' },
        { expect: 'visible', on: 'successToast' },
    ]},
    { id: 'admin-10', name: 'edit clinic', steps: [
        { do: 'click', on: 'clinicsTab' }, { do: 'waitFor', on: 'clinicTable' },
        { do: 'click', on: 'addClinicButton' }, { expect: 'visible', on: 'clinicModalTitle' },
        { do: 'fill', on: 'clinicNameInput', value: 'Edit Clinic' }, { do: 'fill', on: 'clinicPhoneInput', value: '0001000033' },
        { do: 'fill', on: 'clinicLicenseInput', value: 'REG_EDIT' }, { do: 'fill', on: 'clinicUsernameInput', value: 'e2ecli_edit' },
        { do: 'fill', on: 'clinicStreetInput', value: '123 Test St' }, { do: 'fill', on: 'clinicCityInput', value: 'Mumbai' },
        { do: 'click', on: 'clinicCreateButton' }, { expect: 'visible', on: 'doctorTempPassword' },
        { do: 'click', on: 'doctorDoneButton' }, { expect: 'hidden', on: 'clinicModalTitle' },
        { do: 'fill', on: 'clinicSearchBar', value: 'name:Edit Clinic' }, { do: 'press', on: 'clinicSearchBar', value: 'Enter' }, { do: 'waitFor', on: 'clinicTable' },
        { do: 'click', on: 'clinicEditButton' }, { expect: 'visible', on: 'clinicModalTitle' },
        { do: 'fill', on: 'clinicNameInput', value: 'Updated Edit Clinic' },
        { do: 'click', on: 'clinicSaveButton' }, { expect: 'hidden', on: 'clinicModalTitle' },
        { expect: 'visible', on: 'successToast' },
    ]},
    { id: 'admin-15', name: 'edit clinic manager', steps: [
        { do: 'click', on: 'managersTab' }, { do: 'waitFor', on: 'managerTable' },
        { do: 'click', on: 'addManagerButton' }, { expect: 'visible', on: 'managerModalTitle' },
        { do: 'reactFill', on: 'managerClinicUsernameInput', value: 'e2e_clinic_primary' },
        { do: 'waitFor', on: 'clinicFoundIndicator' },
        { do: 'fill', on: 'managerNameInput', value: 'Edit Manager' }, { do: 'fill', on: 'managerPhoneInput', value: '0001000036' },
        { do: 'fill', on: 'managerUsernameInput', value: 'e2emgr_edit' },
        { do: 'click', on: 'managerCreateButton' }, { expect: 'visible', on: 'doctorTempPassword' },
        { do: 'click', on: 'doctorDoneButton' }, { expect: 'hidden', on: 'managerModalTitle' },
        { do: 'fill', on: 'managerSearchBar', value: 'name:Edit Manager' }, { do: 'press', on: 'managerSearchBar', value: 'Enter' }, { do: 'waitFor', on: 'managerTable' },
        { do: 'click', on: 'managerEditButton' }, { expect: 'visible', on: 'managerModalTitle' },
        { do: 'fill', on: 'managerNameInput', value: 'Updated Edit Manager' },
        { do: 'click', on: 'managerSaveButton' }, { expect: 'hidden', on: 'managerModalTitle' },
        { expect: 'visible', on: 'successToast' },
    ]},
    { id: 'admin-19', name: 'edit slot', after: 'create slot', steps: [
        { expect: 'hidden', on: 'successToast' },
        { do: 'fill', on: 'slotSearchBar', value: 'doctor:e2e_doc_primary' }, { do: 'press', on: 'slotSearchBar', value: 'Enter' }, { do: 'waitFor', on: 'slotTable' },
        { do: 'click', on: 'slotEditButton' }, { expect: 'visible', on: 'slotModalTitle' },
        { do: 'fill', on: 'slotVisitFeeInput', value: '600' },
        { do: 'click', on: 'slotSaveButton' }, { expect: 'hidden', on: 'slotModalTitle' },
        { expect: 'visible', on: 'successToast' },
    ]},

    // ═══ Phase 5: Toggle/Delete (destructive) — each test is self-contained with unique entity ═══
    { id: 'admin-06', name: 'make doctor private', steps: [
        { do: 'click', on: 'doctorsTab' }, { do: 'waitFor', on: 'doctorTable' },
        { do: 'click', on: 'addDoctorButton' }, { expect: 'visible', on: 'doctorModalTitle' },
        { do: 'fill', on: 'doctorFirstNameInput', value: 'Private' }, { do: 'fill', on: 'doctorLastNameInput', value: 'Doctor' },
        { do: 'fill', on: 'doctorUsernameInput', value: 'e2edoc_priv' }, { do: 'fill', on: 'doctorPhoneInput', value: '0001000031' },
        { do: 'fill', on: 'doctorLicenseInput', value: 'LIC_PRIV' },
        { do: 'comboboxSelect', on: 'doctorBaseDegree', value: 'Bachelor of Medicine, Bachelor of Surgery' },
        { do: 'click', on: 'doctorCreateButton' }, { expect: 'visible', on: 'doctorTempPassword' },
        { do: 'click', on: 'doctorDoneButton' }, { expect: 'hidden', on: 'doctorModalTitle' },
        { do: 'fill', on: 'doctorSearchBar', value: 'username:e2edoc_priv' }, { do: 'press', on: 'doctorSearchBar', value: 'Enter' }, { do: 'waitFor', on: 'doctorTable' },
        { do: 'click', on: 'doctorPublicToggle' }, { expect: 'visible', on: 'confirmModalTitle' },
        { do: 'click', on: 'confirmActionButton' }, { expect: 'hidden', on: 'confirmModalTitle' },
        { expect: 'visible', on: 'successToast' },
    ]},
    { id: 'admin-07', name: 'toggle doctor verified status', steps: [
        { do: 'click', on: 'doctorsTab' }, { do: 'waitFor', on: 'doctorTable' },
        { do: 'click', on: 'addDoctorButton' }, { expect: 'visible', on: 'doctorModalTitle' },
        { do: 'fill', on: 'doctorFirstNameInput', value: 'Verify' }, { do: 'fill', on: 'doctorLastNameInput', value: 'Doctor' },
        { do: 'fill', on: 'doctorUsernameInput', value: 'e2edoc_ver' }, { do: 'fill', on: 'doctorPhoneInput', value: '0001000032' },
        { do: 'fill', on: 'doctorLicenseInput', value: 'LIC_VER' },
        { do: 'comboboxSelect', on: 'doctorBaseDegree', value: 'Bachelor of Medicine, Bachelor of Surgery' },
        { do: 'click', on: 'doctorCreateButton' }, { expect: 'visible', on: 'doctorTempPassword' },
        { do: 'click', on: 'doctorDoneButton' }, { expect: 'hidden', on: 'doctorModalTitle' },
        { do: 'fill', on: 'doctorSearchBar', value: 'username:e2edoc_ver' }, { do: 'press', on: 'doctorSearchBar', value: 'Enter' }, { do: 'waitFor', on: 'doctorTable' },
        { do: 'click', on: 'doctorVerifiedToggle' }, { expect: 'visible', on: 'confirmModalTitle' },
        { do: 'click', on: 'confirmActionButton' }, { expect: 'hidden', on: 'confirmModalTitle' },
        { expect: 'visible', on: 'successToast' },
    ]},
    { id: 'admin-11', name: 'toggle clinic active status', steps: [
        { do: 'click', on: 'clinicsTab' }, { do: 'waitFor', on: 'clinicTable' },
        { do: 'click', on: 'addClinicButton' }, { expect: 'visible', on: 'clinicModalTitle' },
        { do: 'fill', on: 'clinicNameInput', value: 'Active Clinic' }, { do: 'fill', on: 'clinicPhoneInput', value: '0001000034' },
        { do: 'fill', on: 'clinicLicenseInput', value: 'REG_ACTIVE' }, { do: 'fill', on: 'clinicUsernameInput', value: 'e2ecli_active' },
        { do: 'fill', on: 'clinicStreetInput', value: '123 Test St' }, { do: 'fill', on: 'clinicCityInput', value: 'Mumbai' },
        { do: 'click', on: 'clinicCreateButton' }, { expect: 'visible', on: 'doctorTempPassword' },
        { do: 'click', on: 'doctorDoneButton' }, { expect: 'hidden', on: 'clinicModalTitle' },
        { do: 'fill', on: 'clinicSearchBar', value: 'name:Active Clinic' }, { do: 'press', on: 'clinicSearchBar', value: 'Enter' }, { do: 'waitFor', on: 'clinicTable' },
        { do: 'click', on: 'clinicActiveToggle' }, { expect: 'visible', on: 'confirmModalTitle' },
        { do: 'click', on: 'confirmActionButton' }, { expect: 'hidden', on: 'confirmModalTitle' },
        { expect: 'visible', on: 'successToast' },
    ]},
    { id: 'admin-12', name: 'toggle clinic verified status', steps: [
        { do: 'click', on: 'clinicsTab' }, { do: 'waitFor', on: 'clinicTable' },
        { do: 'click', on: 'addClinicButton' }, { expect: 'visible', on: 'clinicModalTitle' },
        { do: 'fill', on: 'clinicNameInput', value: 'Verify Clinic' }, { do: 'fill', on: 'clinicPhoneInput', value: '0001000035' },
        { do: 'fill', on: 'clinicLicenseInput', value: 'REG_VER' }, { do: 'fill', on: 'clinicUsernameInput', value: 'e2ecli_ver' },
        { do: 'fill', on: 'clinicStreetInput', value: '123 Test St' }, { do: 'fill', on: 'clinicCityInput', value: 'Mumbai' },
        { do: 'click', on: 'clinicCreateButton' }, { expect: 'visible', on: 'doctorTempPassword' },
        { do: 'click', on: 'doctorDoneButton' }, { expect: 'hidden', on: 'clinicModalTitle' },
        { do: 'fill', on: 'clinicSearchBar', value: 'name:Verify Clinic' }, { do: 'press', on: 'clinicSearchBar', value: 'Enter' }, { do: 'waitFor', on: 'clinicTable' },
        { do: 'click', on: 'clinicVerifiedToggle' }, { expect: 'visible', on: 'confirmModalTitle' },
        { do: 'click', on: 'confirmActionButton' }, { expect: 'hidden', on: 'confirmModalTitle' },
        { expect: 'visible', on: 'successToast' },
    ]},
    { id: 'admin-16', name: 'toggle manager active status', steps: [
        { do: 'click', on: 'managersTab' }, { do: 'waitFor', on: 'managerTable' },
        { do: 'click', on: 'addManagerButton' }, { expect: 'visible', on: 'managerModalTitle' },
        { do: 'reactFill', on: 'managerClinicUsernameInput', value: 'e2e_clinic_primary' },
        { do: 'waitFor', on: 'clinicFoundIndicator' },
        { do: 'fill', on: 'managerNameInput', value: 'Active Manager' }, { do: 'fill', on: 'managerPhoneInput', value: '0001000037' },
        { do: 'fill', on: 'managerUsernameInput', value: 'e2emgr_active' },
        { do: 'click', on: 'managerCreateButton' }, { expect: 'visible', on: 'doctorTempPassword' },
        { do: 'click', on: 'doctorDoneButton' }, { expect: 'hidden', on: 'managerModalTitle' },
        { do: 'fill', on: 'managerSearchBar', value: 'name:Active Manager' }, { do: 'press', on: 'managerSearchBar', value: 'Enter' }, { do: 'waitFor', on: 'managerTable' },
        { do: 'click', on: 'managerActiveToggle' }, { expect: 'visible', on: 'confirmModalTitle' },
        { do: 'click', on: 'confirmActionButton' }, { expect: 'hidden', on: 'confirmModalTitle' },
        { expect: 'visible', on: 'successToast' },
    ]},
    { id: 'admin-20', name: 'delete or restore slot', after: 'create slot', steps: [
        { expect: 'hidden', on: 'successToast' },
        { do: 'fill', on: 'slotSearchBar', value: 'doctor:e2e_doc_primary' }, { do: 'press', on: 'slotSearchBar', value: 'Enter' }, { do: 'waitFor', on: 'slotTable' },
        { do: 'click', on: 'slotDeleteButton' }, { expect: 'visible', on: 'confirmModalTitle' },
        { do: 'click', on: 'confirmActionButton' }, { expect: 'hidden', on: 'confirmModalTitle' },
        { expect: 'visible', on: 'successToast' },
    ]},

    // ═══ Phase 5b: Audit log pagination ═══
    { name: 'paginate audit log if more than one page', after: 'view audit log', steps: [
        { do: 'click', on: 'auditNextButton' },
        { expect: 'visible', on: 'auditTable' },
        { do: 'click', on: 'auditPreviousButton' },
        { expect: 'visible', on: 'auditTable' },
    ]},

    // ═══ Phase 5c: User Menu ═══
    { name: 'open user menu dropdown', steps: [
        { do: 'click', on: 'userMenuTrigger' },
        { expect: 'visible', on: 'userMenuDropdown' },
        { expect: 'visible', on: 'userMenuChangePassword' },
        { expect: 'visible', on: 'userMenuLogout' },
    ]},
    { name: 'open change password modal from user menu', after: 'open user menu dropdown', steps: [
        { do: 'click', on: 'userMenuChangePassword' },
        { expect: 'visible', on: 'changePasswordModalTitle' },
        { expect: 'visible', on: 'changePasswordCurrentInput' },
        { expect: 'visible', on: 'changePasswordSubmitBtn' },
    ]},
    { name: 'password change mismatch shows error', after: 'open change password modal from user menu', steps: [
        { do: 'fill', on: 'changePasswordCurrentInput', value: 'oldpass123' },
        { do: 'fill', on: 'changePasswordNewInput', value: 'ValidPass123!' },
        { do: 'fill', on: 'changePasswordConfirmInput', value: 'DifferentPass1!' },
        { do: 'click', on: 'changePasswordSubmitBtn' },
        { expect: 'visible', on: 'changePasswordError' },
        { expect: 'text', on: 'changePasswordError', value: 'Passwords do not match' },
    ]},
    { name: 'password change success then restore', after: 'open change password modal from user menu', steps: [
        { do: 'fill', on: 'changePasswordCurrentInput', value: 'E2eAdminSecure@2026' },
        { do: 'fill', on: 'changePasswordNewInput', value: 'E2eAdminSecure@2026x' },
        { do: 'fill', on: 'changePasswordConfirmInput', value: 'E2eAdminSecure@2026x' },
        { do: 'click', on: 'changePasswordSubmitBtn' },
        { expect: 'visible', on: 'changePasswordSuccess' },
        { expect: 'text', on: 'changePasswordSuccess', value: 'Password updated successfully' },
        // Change it back — modal stays open, fields are cleared
        { do: 'fill', on: 'changePasswordCurrentInput', value: 'E2eAdminSecure@2026x' },
        { do: 'fill', on: 'changePasswordNewInput', value: 'E2eAdminSecure@2026' },
        { do: 'fill', on: 'changePasswordConfirmInput', value: 'E2eAdminSecure@2026' },
        { do: 'click', on: 'changePasswordSubmitBtn' },
        { expect: 'visible', on: 'changePasswordSuccess' },
    ]},

    // ═══ Phase 5d: Theme toggle ═══
    { name: 'toggle theme changes appearance', steps: [
        { do: 'click', on: 'themeToggle' },
        { do: 'click', on: 'themeToggle' },
    ]},

    // Logout is tested manually — including it here invalidates the server-side
    // token and breaks all subsequent component tests in the same suite run.
  ],
});
