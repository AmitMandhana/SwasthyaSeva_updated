import ClientDashboard from "./ClientDashboard";

export default function DashboardPage() {
  return <ClientDashboard />;
}

import { testSpec } from '@swasthyaseva/test-gen';

export const __test = testSpec({
  route: '/dashboard',
  auth: 'role:clinic',
  app: 'clinic',
  title: 'Clinic Dashboard',
  elements: {
    // Header
    logoutButton: { role: 'button', name: /Logout/ },
    themeToggle: { role: 'button', name: 'Toggle theme' },
    headerUsername: { testId: 'header-username' },
    headerRoleBadge: { testId: 'header-role-badge' },

    // Tabs
    appointmentsTab: { role: 'button', name: /Appointments/ },
    clinicAdminsTab: { role: 'button', name: /Clinic Admins/ },
    analyticsTab: { role: 'button', name: /Analytics/ },
    leadsTab: { role: 'button', name: /Leads/ },
    prescriptionsTab: { role: 'button', name: /Prescriptions/ },
    auditLogsTab: { role: 'button', name: /Audit Logs/ },
    profileTab: { role: 'button', name: /Profile/ },

    // Appointments tab
    statsCards: { testId: 'appt-stats-grid' },
    dateFilterAll: { role: 'button', name: 'All' },
    dateFilterPast: { role: 'button', name: 'Past' },
    dateFilterToday: { role: 'button', name: 'Today' },
    dateFilterUpcoming: { role: 'button', name: 'Upcoming' },
    statusFilterSelect: { testId: 'appt-status-filter' },
    refreshButton: { testId: 'appt-refresh-btn' },
    appointmentCount: { testId: 'appt-count' },
    bookAppointmentButton: { role: 'button', name: /Book Appointment/ },
    appointmentTable: { testId: 'appt-table' },
    sortByPatient: { testId: 'appt-sort-patient_name' },
    sortByDate: { testId: 'appt-sort-appointment_date' },
    sortByFee: { testId: 'appt-sort-slot_fee' },
    previousPageButton: { role: 'button', name: 'Previous', exact: true },
    nextPageButton: { role: 'button', name: 'Next', exact: true },

    // Book Appointment Modal
    bookingModal: { role: 'dialog', name: 'Book Appointment' },
    phoneInput: { role: 'textbox', name: 'Patient Phone' },
    searchButton: { role: 'button', name: /Search/ },
    patientRadioFirst: { testId: 'booking-patient-radio' },
    newPatientMessage: { testId: 'booking-new-patient-msg' },
    sendOtpButton: { role: 'button', name: /Send OTP to Patient/ },
    otpInput: { testId: 'booking-otp' },
    verifyOtpButton: { role: 'button', name: /Verify OTP/ },
    resendOtpButton: { testId: 'booking-resend-otp' },
    regFirstName: { role: 'textbox', name: 'First Name' },
    regLastName: { role: 'textbox', name: 'Last Name' },
    regEmail: { role: 'textbox', name: 'Email' },
    regDob: { testId: 'booking-dob' },
    regGenderSelect: { testId: 'booking-gender' },
    regStreetAddress: { role: 'textbox', name: 'Street Address' },
    regCity: { role: 'textbox', name: 'City' },
    regState: { role: 'textbox', name: 'State' },
    registerPatientButton: { role: 'button', name: /Register Patient/ },
    slotSelect: { role: 'combobox', name: 'Select Slot' },
    appointmentDateInput: { testId: 'booking-date' },
    symptomTagsCombobox: { testId: 'booking-symptom-tags' },
    symptomTextInput: { role: 'textbox', name: 'Symptom Description' },
    bookingFeeInput: { testId: 'booking-fee' },
    bookAppointmentSubmit: { testId: 'booking-submit' },
    bookingError: { testId: 'booking-error' },
    modalCloseButton: { role: 'button', name: 'Close' },

    // Clinic Admins tab
    addAdminButton: { role: 'button', name: /Add Admin/ },
    adminTable: { testId: 'cadmin-table' },
    adminSearchInput: { testId: 'cadmin-search' },
    adminEditButton: { testId: 'cadmin-edit-btn' },
    adminActiveToggle: { testId: 'cadmin-toggle' },
    adminModal: { role: 'dialog', name: /Clinic Admin/ },
    adminNameInput: { role: 'textbox', name: /^Name/ },
    adminUsernameInput: { role: 'textbox', name: 'Username' },
    adminPhoneInput: { role: 'textbox', name: /^Phone/ },
    adminCreateButton: { role: 'button', name: 'Create' },
    adminSaveButton: { role: 'button', name: 'Save' },
    tempPasswordDisplay: { testId: 'cadmin-temp-password' },
    tempPasswordDoneButton: { role: 'button', name: 'Done' },
    adminRefreshBtn: { testId: 'cadmin-refresh-btn' },
    confirmDeleteModal: { role: 'dialog', name: 'Delete Admin' },
    confirmButton: { role: 'button', name: /Delete|Restore/ },

    // Analytics tab
    timeRange7d: { role: 'button', name: '7 Days' },
    timeRange30d: { role: 'button', name: '30 Days' },
    timeRange90d: { role: 'button', name: '90 Days' },
    kpiTotalAppointments: { text: 'Total Appointments' },
    kpiTotalRevenue: { text: 'Total Revenue' },
    kpiCompletionRate: { text: 'Completion Rate' },
    trendChart: { testId: 'trend-chart' },
    revenueChart: { testId: 'revenue-chart' },
    utilizationChart: { testId: 'utilization-chart' },

    // Leads tab
    leadStatusCards: { testId: 'lead-status-cards' },
    leadSearchInput: { testId: 'lead-search' },
    leadStatusFilterAll: { role: 'button', name: 'All' },
    leadStatusFilterNew: { role: 'button', name: 'New' },
    leadStatusFilterContacted: { role: 'button', name: 'Contacted' },
    leadStatusFilterBooked: { role: 'button', name: 'Booked' },
    leadStatusFilterLost: { role: 'button', name: 'Lost' },
    addLeadButton: { role: 'button', name: /Add Lead/ },
    leadTable: { testId: 'lead-table' },
    leadEditButton: { testId: 'lead-edit-btn' },
    leadModal: { role: 'dialog', name: /Lead/ },
    leadPatientNameInput: { testId: 'lead-patient-name-input' },
    leadPhoneInput: { testId: 'lead-phone-input' },
    leadSymptomInput: { role: 'textbox', name: 'Symptom' },
    leadSourceSelect: { role: 'combobox', name: 'Source' },
    leadStatusSelect: { role: 'combobox', name: 'Status' },
    leadNotesInput: { role: 'textbox', name: 'Notes' },
    leadCreateButton: { role: 'button', name: 'Create' },
    leadSaveButton: { role: 'button', name: 'Save' },
    leadRefreshBtn: { testId: 'lead-refresh-btn' },

    // Prescriptions tab
    prescriptionHeader: { role: 'heading', name: 'Prescriptions' },
    prescriptionTable: { testId: 'rx-table' },
    prescriptionTableRow: { testId: 'rx-row' },
    prescriptionDetailModal: { testId: 'rx-detail-overlay' },
    prescriptionDetailTitle: { testId: 'rx-detail-title' },
    prescriptionCloseButton: { testId: 'rx-detail-close' },

    // Profile tab
    profileUsernameDisplay: { testId: 'profile-username' },
    profileCurrentPasswordInput: { role: 'textbox', name: 'Current Password' },
    profileNewPasswordInput: { role: 'textbox', name: 'New Password', exact: true },
    profileConfirmPasswordInput: { role: 'textbox', name: 'Confirm New Password' },
    profileUpdatePasswordBtn: { role: 'button', name: /Update Password/ },
    profilePasswordSuccess: { testId: 'profile-password-success' },
    profilePasswordError: { testId: 'profile-password-error' },

    // Audit Logs tab
    hideListViewCheckbox: { testId: 'audit-hide-checkbox' },
    auditTable: { testId: 'audit-table' },
    auditRowExpander: { testId: 'audit-row-expander' },
    auditExpandedJson: { testId: 'audit-expanded-json' },
    auditLogCount: { testId: 'audit-log-count' },
  },
  flows: [],
  flowTree: {
    name: 'root',
    steps: [],
    children: [
      // ─── Appointments Tab ───
      {
        name: 'view appointment stats cards',
        id: 'clinic-04-appointment-stats',
        steps: [
          { do: 'click', on: 'appointmentsTab' },
          { do: 'waitFor', on: 'statsCards' },
          { expect: 'visible', on: 'appointmentTable' },
          { expect: 'visible', on: 'appointmentCount' },
        ],
        children: [
          {
            name: 'filter appointments by date range changes results',
            id: 'clinic-05-date-filter',
            steps: [
              { do: 'click', on: 'dateFilterToday' },
              { expect: 'visible', on: 'appointmentCount' },
              { do: 'click', on: 'dateFilterUpcoming' },
              { expect: 'visible', on: 'appointmentCount' },
              { do: 'click', on: 'dateFilterPast' },
              { expect: 'visible', on: 'appointmentCount' },
              { do: 'click', on: 'dateFilterAll' },
              { expect: 'visible', on: 'appointmentCount' },
            ],
          },
          {
            name: 'filter appointments by status changes results',
            id: 'clinic-06-status-filter',
            steps: [
              { do: 'select', on: 'statusFilterSelect', value: 'pending' },
              { expect: 'visible', on: 'appointmentCount' },
              { do: 'select', on: 'statusFilterSelect', value: '' },
              { expect: 'visible', on: 'appointmentCount' },
            ],
          },
          {
            name: 'paginate through appointments changes page',
            id: 'clinic-07-pagination',
            steps: [
              { do: 'click', on: 'nextPageButton' },
              { expect: 'visible', on: 'appointmentCount' },
              { do: 'click', on: 'previousPageButton' },
              { expect: 'visible', on: 'appointmentCount' },
            ],
          },
          {
            name: 'sort appointment columns by clicking headers',
            id: 'clinic-34-sort-columns',
            steps: [
              { do: 'click', on: 'sortByPatient' },
              { expect: 'visible', on: 'appointmentTable' },
              { do: 'click', on: 'sortByPatient' },
              { expect: 'visible', on: 'appointmentTable' },
              { do: 'click', on: 'sortByDate' },
              { expect: 'visible', on: 'appointmentTable' },
              { do: 'click', on: 'sortByFee' },
              { expect: 'visible', on: 'appointmentTable' },
            ],
          },
          {
            name: 'refresh button reloads appointment data',
            id: 'clinic-35-refresh',
            steps: [
              { do: 'click', on: 'refreshButton' },
              { expect: 'visible', on: 'appointmentCount' },
            ],
          },
          // Booking: phone not found chain
          {
            name: 'booking phone lookup - patient not found',
            id: 'clinic-08-phone-lookup-notfound',
            steps: [
              { do: 'click', on: 'bookAppointmentButton' },
              { expect: 'visible', on: 'bookingModal' },
              { do: 'fill', on: 'phoneInput', value: '+910000077777' },
              { do: 'click', on: 'searchButton' },
              { expect: 'visible', on: 'newPatientMessage' },
            ],
            children: [
              {
                name: 'booking send and verify OTP',
                id: 'clinic-10-otp-verify',
                steps: [
                  { do: 'click', on: 'sendOtpButton' },
                  { expect: 'visible', on: 'otpInput' },
                  { do: 'reactFill', on: 'otpInput', value: '123456' },
                  { do: 'click', on: 'verifyOtpButton' },
                  { expect: 'visible', on: 'regFirstName' },
                ],
                children: [
                  {
                    name: 'register new patient and complete booking',
                    id: 'clinic-46-full-booking',
                    steps: [
                      { do: 'fill', on: 'regFirstName', value: 'Tester' },
                      { do: 'fill', on: 'regLastName', value: 'BookingTest' },
                      { do: 'fill', on: 'regDob', value: '1990-01-15' },
                      { do: 'select', on: 'regGenderSelect', value: 'male' },
                      { do: 'fill', on: 'regStreetAddress', value: '123 Test Street' },
                      { do: 'fill', on: 'regCity', value: 'Mumbai' },
                      { do: 'fill', on: 'regState', value: 'Maharashtra' },
                      { do: 'click', on: 'registerPatientButton' },
                      { expect: 'visible', on: 'slotSelect' },
                      { do: 'comboboxSelectFirst', on: 'slotSelect' },
                      { do: 'fillFromSlotDay', on: 'appointmentDateInput', value: 'Select Slot' },
                      { do: 'comboboxSelectFirst', on: 'symptomTagsCombobox' },
                      { do: 'fill', on: 'symptomTextInput', value: 'E2E test booking symptom' },
                      { do: 'click', on: 'bookAppointmentSubmit' },
                      { expect: 'hidden', on: 'bookingModal' },
                    ],
                  },
                ],
              },
            ],
          },
          // OTP error flows use a separate phone to avoid data conflicts
          {
            name: 'booking OTP error - wrong code',
            id: 'clinic-47-wrong-otp',
            steps: [
              { do: 'click', on: 'bookAppointmentButton' },
              { expect: 'visible', on: 'bookingModal' },
              { do: 'fill', on: 'phoneInput', value: '+910000066666' },
              { do: 'click', on: 'searchButton' },
              { expect: 'visible', on: 'newPatientMessage' },
              { do: 'click', on: 'sendOtpButton' },
              { expect: 'visible', on: 'otpInput' },
              { do: 'reactFill', on: 'otpInput', value: '000000' },
              { do: 'click', on: 'verifyOtpButton' },
              { expect: 'visible', on: 'bookingError' },
            ],
          },
          {
            name: 'booking OTP - resend button visible after send',
            id: 'clinic-48-resend-otp',
            steps: [
              { do: 'click', on: 'bookAppointmentButton' },
              { expect: 'visible', on: 'bookingModal' },
              { do: 'fill', on: 'phoneInput', value: '+910000066666' },
              { do: 'click', on: 'searchButton' },
              { expect: 'visible', on: 'newPatientMessage' },
              { do: 'click', on: 'sendOtpButton' },
              { expect: 'visible', on: 'otpInput' },
              { expect: 'visible', on: 'resendOtpButton' },
            ],
          },
          // Booking: phone found chain
          {
            name: 'booking phone lookup - patient found',
            id: 'clinic-09-phone-lookup-found',
            steps: [
              { do: 'click', on: 'bookAppointmentButton' },
              { expect: 'visible', on: 'bookingModal' },
              { do: 'fill', on: 'phoneInput', value: '+910001000001' },
              { do: 'click', on: 'searchButton' },
              { expect: 'visible', on: 'patientRadioFirst' },
            ],
            children: [
              {
                name: 'existing patient skips registration to step 4',
                id: 'clinic-17-existing-patient-skip',
                steps: [
                  { do: 'click', on: 'patientRadioFirst' },
                  { do: 'click', on: 'sendOtpButton' },
                  { expect: 'visible', on: 'otpInput' },
                  { do: 'reactFill', on: 'otpInput', value: '123456' },
                  { do: 'click', on: 'verifyOtpButton' },
                  { expect: 'visible', on: 'slotSelect' },
                ],
                children: [
                  {
                    name: 'booking without symptoms shows disabled button',
                    id: 'clinic-33-booking-no-symptoms-disabled',
                    steps: [
                      { do: 'comboboxSelectFirst', on: 'slotSelect' },
                      { do: 'fillFromSlotDay', on: 'appointmentDateInput', value: 'Select Slot' },
                      { expect: 'disabled', on: 'bookAppointmentSubmit' },
                    ],
                  },
                ],
              },
            ],
          },
          // Booking: close modal
          {
            name: 'booking modal closes via close button',
            id: 'clinic-43-booking-modal-close',
            steps: [
              { do: 'click', on: 'bookAppointmentButton' },
              { expect: 'visible', on: 'bookingModal' },
              { do: 'click', on: 'modalCloseButton' },
              { expect: 'hidden', on: 'bookingModal' },
            ],
          },
        ],
      },

      // ─── Clinic Admins Tab ───
      {
        name: 'clinic admins tab loads admin list',
        id: 'clinic-18-admin-tab-visibility',
        steps: [
          { do: 'click', on: 'clinicAdminsTab' },
          { do: 'waitFor', on: 'adminTable' },
          { expect: 'visible', on: 'addAdminButton' },
        ],
        children: [
          {
            name: 'refresh clinic admin list reloads data',
            id: 'clinic-39-admin-refresh',
            steps: [
              { do: 'click', on: 'adminRefreshBtn' },
              { expect: 'visible', on: 'adminTable' },
            ],
          },
        ],
      },
      // Clinic Admin: create then edit/delete the created admin
      {
        name: 'create a new clinic admin and see temp password',
        id: 'clinic-19-admin-crud',
        steps: [
          { do: 'click', on: 'clinicAdminsTab' },
          { do: 'waitFor', on: 'adminTable' },
          { do: 'click', on: 'addAdminButton' },
          { expect: 'visible', on: 'adminModal' },
          { do: 'fill', on: 'adminNameInput', value: 'Test Crud Admin' },
          { do: 'fill', on: 'adminUsernameInput', value: 'e2e_crudadmin' },
          { do: 'fill', on: 'adminPhoneInput', value: '+910001000099' },
          { do: 'click', on: 'adminCreateButton' },
          { expect: 'visible', on: 'tempPasswordDisplay' },
          { do: 'click', on: 'tempPasswordDoneButton' },
          { expect: 'hidden', on: 'adminModal' },
          { expect: 'visible', on: 'adminTable' },
        ],
        children: [
          {
            name: 'edit then delete the created clinic admin',
            id: 'clinic-44-admin-edit-delete',
            steps: [
              { do: 'fill', on: 'adminSearchInput', value: 'Test Crud Admin' }, { do: 'waitFor', on: 'adminTable' },
              { do: 'click', on: 'adminEditButton' },
              { expect: 'visible', on: 'adminModal' },
              { do: 'fill', on: 'adminNameInput', value: 'Updated Admin Name' },
              { do: 'click', on: 'adminSaveButton' },
              { expect: 'hidden', on: 'adminModal' },
              { do: 'fill', on: 'adminSearchInput', value: 'Updated Admin Name' }, { do: 'waitFor', on: 'adminTable' },
              { do: 'click', on: 'adminActiveToggle' },
              { expect: 'visible', on: 'confirmDeleteModal' },
              { do: 'click', on: 'confirmButton' },
              { expect: 'hidden', on: 'confirmDeleteModal' },
            ],
          },
        ],
      },
      {
        name: 'verify clinic admin persists after reload',
        steps: [
          { do: 'click', on: 'clinicAdminsTab' },
          { do: 'waitFor', on: 'adminTable' },
          { do: 'reload' },
          { do: 'click', on: 'clinicAdminsTab' },
          { do: 'waitFor', on: 'adminTable' },
          { expect: 'visible', on: 'adminTable' },
        ],
      },

      // ─── Analytics Tab ───
      {
        name: 'view analytics with charts and change time range',
        id: 'clinic-23-analytics',
        steps: [
          { do: 'click', on: 'analyticsTab' },
          { do: 'waitFor', on: 'kpiTotalAppointments' },
          { expect: 'visible', on: 'kpiTotalRevenue' },
          { expect: 'visible', on: 'kpiCompletionRate' },
          { expect: 'visible', on: 'trendChart' },
          { do: 'click', on: 'timeRange7d' },
          { expect: 'visible', on: 'trendChart' },
          { do: 'click', on: 'timeRange90d' },
          { expect: 'visible', on: 'trendChart' },
          { do: 'click', on: 'timeRange30d' },
          { expect: 'visible', on: 'trendChart' },
        ],
      },

      // ─── Leads Tab ───
      {
        name: 'view leads list with data',
        id: 'clinic-24-leads-list',
        steps: [
          { do: 'click', on: 'leadsTab' },
          { do: 'waitFor', on: 'leadStatusCards' },
          { expect: 'visible', on: 'leadTable' },
          { expect: 'visible', on: 'addLeadButton' },
        ],
        children: [
          {
            name: 'create a new lead closes modal',
            id: 'clinic-25-create-lead',
            steps: [
              { do: 'click', on: 'addLeadButton' },
              { expect: 'visible', on: 'leadModal' },
              { do: 'fill', on: 'leadPatientNameInput', value: 'E2E Test Lead' },
              { do: 'fill', on: 'leadPhoneInput', value: '+910001000057' },
              { do: 'fill', on: 'leadSymptomInput', value: 'Back pain' },
              { do: 'comboboxSelect', on: 'leadSourceSelect', value: 'Walk-In' },
              { do: 'click', on: 'leadCreateButton' },
              { expect: 'hidden', on: 'leadModal' },
              { expect: 'visible', on: 'leadTable' },
            ],
            children: [
              {
                name: 'verify lead persists after reload',
                steps: [
                  { do: 'reload' },
                  { do: 'click', on: 'leadsTab' },
                  { do: 'waitFor', on: 'leadTable' },
                  { expect: 'visible', on: 'leadTable' },
                ],
              },
              {
                name: 'edit lead status closes modal',
                id: 'clinic-26-edit-lead',
                steps: [
                  { do: 'fill', on: 'leadSearchInput', value: 'E2E Test Lead' }, { do: 'waitFor', on: 'leadTable' },
                  { do: 'click', on: 'leadEditButton' },
                  { expect: 'visible', on: 'leadModal' },
                  { do: 'comboboxSelect', on: 'leadStatusSelect', value: 'Contacted' },
                  { do: 'fill', on: 'leadNotesInput', value: 'Called and scheduled' },
                  { do: 'click', on: 'leadSaveButton' },
                  { expect: 'hidden', on: 'leadModal' },
                  { expect: 'visible', on: 'leadTable' },
                ],
                children: [
                  {
                    name: 'verify lead edit persists after reload',
                    steps: [
                      { do: 'reload' },
                      { do: 'click', on: 'leadsTab' },
                      { do: 'waitFor', on: 'leadTable' },
                      { expect: 'visible', on: 'leadTable' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: 'search leads filters results',
            id: 'clinic-27-search-leads',
            steps: [
              { do: 'fill', on: 'leadSearchInput', value: 'nonexistent_xyz_lead_99' },
              { expect: 'visible', on: 'leadTable' },
            ],
          },
          {
            name: 'filter leads by status refreshes list',
            id: 'clinic-24-leads-status-filter',
            steps: [
              { do: 'click', on: 'leadStatusFilterNew' },
              { expect: 'visible', on: 'leadStatusCards' },
              { do: 'click', on: 'leadStatusFilterContacted' },
              { expect: 'visible', on: 'leadStatusCards' },
              { do: 'click', on: 'leadStatusFilterBooked' },
              { expect: 'visible', on: 'leadStatusCards' },
              { do: 'click', on: 'leadStatusFilterLost' },
              { expect: 'visible', on: 'leadStatusCards' },
              { do: 'click', on: 'leadStatusFilterAll' },
              { expect: 'visible', on: 'leadStatusCards' },
            ],
          },
          {
            name: 'refresh leads reloads data',
            id: 'clinic-40-leads-refresh',
            steps: [
              { do: 'click', on: 'leadRefreshBtn' },
              { expect: 'visible', on: 'leadTable' },
            ],
          },
        ],
      },

      // ─── Prescriptions Tab ───
      {
        name: 'view prescription list with data',
        id: 'clinic-31-prescription-list',
        steps: [
          { do: 'click', on: 'prescriptionsTab' },
          { do: 'waitFor', on: 'prescriptionHeader' },
          { expect: 'visible', on: 'prescriptionTable' },
        ],
        children: [
          {
            name: 'view prescription detail modal and close it',
            id: 'clinic-32-prescription-detail',
            steps: [
              { do: 'click', on: 'prescriptionTableRow' },
              { expect: 'visible', on: 'prescriptionDetailModal' },
              { expect: 'visible', on: 'prescriptionDetailTitle' },
              { do: 'click', on: 'prescriptionCloseButton' },
              { expect: 'hidden', on: 'prescriptionDetailModal' },
            ],
          },
        ],
      },

      // ─── Audit Logs Tab ───
      {
        name: 'view audit logs and expand a row shows JSON',
        id: 'clinic-28-audit-logs',
        steps: [
          { do: 'click', on: 'auditLogsTab' },
          { do: 'waitFor', on: 'auditTable' },
          { expect: 'visible', on: 'auditLogCount' },
          { do: 'click', on: 'auditRowExpander' },
          { expect: 'visible', on: 'auditExpandedJson' },
        ],
        children: [
          {
            name: 'toggle hide list/view actions refreshes audit logs',
            id: 'clinic-29-audit-toggle',
            steps: [
              { do: 'click', on: 'hideListViewCheckbox' },
              { expect: 'visible', on: 'auditLogCount' },
              { do: 'click', on: 'hideListViewCheckbox' },
              { expect: 'visible', on: 'auditLogCount' },
            ],
          },
          {
            name: 'audit logs scoped to current clinic shows data',
            id: 'clinic-30-audit-role-scope',
            steps: [
              { expect: 'visible', on: 'auditTable' },
              { expect: 'visible', on: 'auditLogCount' },
            ],
          },
        ],
      },

      // ─── Profile Tab ───
      {
        name: 'change password successfully then change back',
        id: 'clinic-41-password-change',
        steps: [
          { do: 'click', on: 'profileTab' },
          { do: 'waitFor', on: 'profileUsernameDisplay' },
          { do: 'fill', on: 'profileCurrentPasswordInput', value: 'TestClinic@123' },
          { do: 'fill', on: 'profileNewPasswordInput', value: 'TestClinic@1234' },
          { do: 'fill', on: 'profileConfirmPasswordInput', value: 'TestClinic@1234' },
          { do: 'click', on: 'profileUpdatePasswordBtn' },
          { expect: 'visible', on: 'profilePasswordSuccess' },
          { expect: 'text', on: 'profilePasswordSuccess', value: 'Password updated successfully' },
          // Change it back immediately
          { do: 'fill', on: 'profileCurrentPasswordInput', value: 'TestClinic@1234' },
          { do: 'fill', on: 'profileNewPasswordInput', value: 'TestClinic@123' },
          { do: 'fill', on: 'profileConfirmPasswordInput', value: 'TestClinic@123' },
          { do: 'click', on: 'profileUpdatePasswordBtn' },
          { expect: 'visible', on: 'profilePasswordSuccess' },
        ],
      },

      // ─── Profile validation flows ───
      {
        name: 'wrong current password shows error',
        steps: [
          { do: 'click', on: 'profileTab' },
          { do: 'waitFor', on: 'profileUsernameDisplay' },
          { do: 'fill', on: 'profileCurrentPasswordInput', value: 'totallyWrongPassword' },
          { do: 'fill', on: 'profileNewPasswordInput', value: 'ValidPass123!' },
          { do: 'fill', on: 'profileConfirmPasswordInput', value: 'ValidPass123!' },
          { do: 'click', on: 'profileUpdatePasswordBtn' },
          { expect: 'visible', on: 'profilePasswordError' },
        ],
      },
      {
        name: 'password mismatch shows error',
        steps: [
          { do: 'click', on: 'profileTab' },
          { do: 'waitFor', on: 'profileUsernameDisplay' },
          { do: 'fill', on: 'profileCurrentPasswordInput', value: 'TestClinic@123' },
          { do: 'fill', on: 'profileNewPasswordInput', value: 'ValidPass123!' },
          { do: 'fill', on: 'profileConfirmPasswordInput', value: 'DifferentPass1!' },
          { do: 'click', on: 'profileUpdatePasswordBtn' },
          { expect: 'visible', on: 'profilePasswordError' },
          { expect: 'text', on: 'profilePasswordError', value: 'Passwords do not match' },
        ],
      },
      {
        name: 'short password shows error',
        steps: [
          { do: 'click', on: 'profileTab' },
          { do: 'waitFor', on: 'profileUsernameDisplay' },
          { do: 'fill', on: 'profileCurrentPasswordInput', value: 'TestClinic@123' },
          { do: 'fill', on: 'profileNewPasswordInput', value: 'ab' },
          { do: 'fill', on: 'profileConfirmPasswordInput', value: 'ab' },
          { do: 'click', on: 'profileUpdatePasswordBtn' },
          { expect: 'visible', on: 'profilePasswordError' },
          { expect: 'text', on: 'profilePasswordError', value: 'Password must be at least 12 characters long' },
        ],
      },

      // ─── Header: username and role badge ───
      {
        name: 'header shows username and role badge',
        steps: [
          { expect: 'visible', on: 'headerUsername' },
          { expect: 'visible', on: 'headerRoleBadge' },
          { expect: 'text', on: 'headerRoleBadge', value: 'Clinic' },
        ],
      },

      // ─── Theme Toggle ───
      {
        name: 'toggle theme changes appearance',
        steps: [
          { expect: 'visible', on: 'themeToggle' },
          { do: 'click', on: 'themeToggle' },
          { expect: 'visible', on: 'themeToggle' },
          { do: 'click', on: 'themeToggle' },
          { expect: 'visible', on: 'themeToggle' },
        ],
      },

      // ─── Logout ───
      {
        name: 'logout and redirect to login',
        id: 'clinic-03-logout',
        steps: [
          { do: 'click', on: 'logoutButton' },
          { expect: 'urlContains', value: '/login' },
        ],
      },
    ],
  },
});
