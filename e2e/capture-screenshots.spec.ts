import { test, type Page, type BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { readAuthToken, type AuthRole } from './fixtures/auth';

const VERSION = 'v10';
const BASE_DIR = path.resolve(__dirname, '../docs/screenshots');

const VIEWPORTS = [
  { name: 'desktop', width: 1024, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'phone', width: 390, height: 844 },
];

type AppName = 'web' | 'admin' | 'doctor' | 'clinic';

interface PageDef {
  route: string;
  name: string;
  auth?: AuthRole;
  /** Use a fresh user with no data (for empty states) */
  emptyUser?: boolean;
  scrollSelector?: string;
  waitFor?: string;
  /** Sequence of actions before the main screenshot */
  actions?: Action[];
  /** If true, actions include a screenshot action — skip the default capture */
  actionsIncludeShot?: boolean;
  resolveRoute?: (page: Page, baseURL: string) => Promise<string>;
}

type Action =
  | { type: 'click'; selector: string; waitAfter?: number }
  | { type: 'fill'; selector: string; value: string }
  | { type: 'screenshot'; name: string }
  | { type: 'wait'; ms: number }
  | { type: 'waitFor'; selector: string; timeout?: number }
  | { type: 'press'; key: string };

const TOKEN_KEYS: Record<AppName, string> = {
  web: 'patient_token',
  admin: 'admin_token',
  doctor: 'doctor_token',
  clinic: 'clinic_token',
};

const APP_PORTS: Record<AppName, number> = {
  web: 3000,
  admin: 3001,
  doctor: 3002,
  clinic: 3003,
};

// Helper: resolve a real appointment ID for doctor
async function resolveAppointmentRoute(page: Page, filter = 'today'): Promise<string> {
  const token = await page.evaluate((key) => localStorage.getItem(key), 'doctor_token');
  try {
    const res = await fetch(`http://localhost:5000/api/doctor/appointments?dateFilter=${filter}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      const appt = data.appointments?.[0];
      if (appt) {
        log(`  [RESOLVE] Found appointment ${appt.appointment_id}`);
        return `/dashboard/consultation/${appt.appointment_id}`;
      }
    }
  } catch (e) {
    log(`  [RESOLVE] API error: ${e}`);
  }
  return '/dashboard/consultation/1';
}

// Helper: resolve prescription route for patient
async function resolvePrescriptionRoute(page: Page): Promise<string> {
  const token = await page.evaluate((key) => localStorage.getItem(key), 'patient_token');
  try {
    const res = await fetch('http://localhost:5000/api/patient/appointments?status=past&hasPrescription=true', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      const withRx = data.appointments?.find((a: any) => a.has_prescription);
      if (withRx) {
        log(`  [RESOLVE] Found prescription for appointment ${withRx.appointment_id}`);
        return `/dashboard/prescriptions/${withRx.appointment_id}`;
      }
    }
  } catch (e) {
    log(`  [RESOLVE] API error: ${e}`);
  }
  return '/dashboard/prescriptions/999';
}

// ────────────────────────────────────────────────────────
// PAGE DEFINITIONS — comprehensive coverage
// ────────────────────────────────────────────────────────

const PAGES: Record<AppName, PageDef[]> = {

  // ══════════════════════════════════════════════════════
  // WEB APP
  // ══════════════════════════════════════════════════════
  web: [
    // --- Pages ---
    { route: '/', name: 'home' },
    { route: '/login', name: 'login-password' },
    {
      route: '/login', name: 'login-otp',
      actions: [{ type: 'click', selector: '[data-testid="tab-otp"]', waitAfter: 500 }],
    },
    { route: '/slot-search', name: 'slot-search' },
    {
      route: '/dashboard', name: 'dashboard', auth: 'patient',
      waitFor: '[data-testid="patient-dashboard"]',
    },
    {
      route: '/dashboard', name: 'dashboard-past', auth: 'patient',
      waitFor: '[data-testid="patient-dashboard"]',
      actions: [{ type: 'click', selector: '[data-testid="btn-past-toggle"]', waitAfter: 1000 }],
    },
    {
      route: '/dashboard', name: 'dashboard-filters', auth: 'patient',
      waitFor: '[data-testid="patient-dashboard"]',
      actions: [
        { type: 'click', selector: '[data-testid="btn-filters"]', waitAfter: 500 },
      ],
    },
    {
      route: '/dashboard/profile', name: 'profile', auth: 'patient',
      waitFor: 'text=Profile',
    },
    {
      route: '/dashboard/prescriptions/0', name: 'prescription-detail', auth: 'patient',
      waitFor: 'text=Prescription',
      resolveRoute: async (page, _baseURL) => resolvePrescriptionRoute(page),
    },
    { route: '/doctor/DrRahul', name: 'doctor-profile', waitFor: 'text=Dr. Rahul' },
    { route: '/clinic/CityHealth', name: 'clinic-profile' },

    // --- Modals ---
    {
      route: '/slot-search', name: 'modal-map-picker',
      actions: [
        { type: 'wait', ms: 2000 },
        { type: 'click', selector: '[data-testid="btn-pick-map"]', waitAfter: 1000 },
        { type: 'screenshot', name: 'modal-map-picker' },
      ],
      actionsIncludeShot: true,
    },

    // --- Empty states ---
    {
      route: '/dashboard', name: 'dashboard-empty', auth: 'patient', emptyUser: true,
      waitFor: '[data-testid="patient-dashboard"]',
    },
  ],

  // ══════════════════════════════════════════════════════
  // DOCTOR APP
  // ══════════════════════════════════════════════════════
  doctor: [
    // --- Pages ---
    { route: '/login', name: 'login' },
    {
      route: '/dashboard', name: 'dashboard', auth: 'doctor',
      waitFor: 'text=Week Schedule',
    },
    {
      route: '/dashboard/appointments', name: 'appointments', auth: 'doctor',
      waitFor: 'text=Appointments',
    },
    {
      route: '/dashboard/appointments', name: 'appointments-date-filter', auth: 'doctor',
      waitFor: 'text=Appointments',
      actions: [
        { type: 'click', selector: '[data-testid="date-range-btn"]', waitAfter: 1000 },
        { type: 'screenshot', name: 'appointments-date-filter' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard/patients', name: 'patients', auth: 'doctor',
      waitFor: 'text=Patients',
    },
    {
      route: '/dashboard/patients', name: 'patients-search', auth: 'doctor',
      waitFor: 'text=Patients',
      actions: [
        { type: 'fill', selector: '[data-testid="search-patients"]', value: 'John' },
        { type: 'wait', ms: 1000 },
      ],
    },
    {
      route: '/dashboard/profile', name: 'profile', auth: 'doctor',
      waitFor: 'text=Dr. Rahul',
    },

    // --- Consultation ---
    {
      route: '/dashboard/consultation/0', name: 'consultation', auth: 'doctor',
      waitFor: 'text=Patient Particulars',
      resolveRoute: async (page) => resolveAppointmentRoute(page),
    },
    {
      route: '/dashboard/consultation/0', name: 'consultation-vitals-timeline', auth: 'doctor',
      waitFor: 'text=Patient Particulars',
      resolveRoute: async (page) => resolveAppointmentRoute(page),
      actions: [
        { type: 'waitFor', selector: '[data-testid="patient-name-loaded"]', timeout: 10000 },
        { type: 'click', selector: '[data-testid="open-timeline-btn"]', waitAfter: 1500 },
        { type: 'screenshot', name: 'consultation-vitals-timeline' },
      ],
      actionsIncludeShot: true,
    },

    // --- Modals ---
    {
      route: '/dashboard/patients', name: 'modal-patient-overview', auth: 'doctor',
      waitFor: 'text=Patients',
      actions: [
        { type: 'click', selector: '[data-testid="btn-view-history"] >> nth=0', waitAfter: 1500 },
        { type: 'screenshot', name: 'modal-patient-overview' },
      ],
      actionsIncludeShot: true,
    },
  ],

  // ══════════════════════════════════════════════════════
  // CLINIC APP
  // ══════════════════════════════════════════════════════
  clinic: [
    // --- Login variants ---
    { route: '/login', name: 'login-admin' },
    {
      route: '/login', name: 'login-clinic',
      actions: [{ type: 'click', selector: '[data-testid="login-clinic-mode"]', waitAfter: 500 }],
    },

    // --- All 7 tabs ---
    {
      route: '/dashboard', name: 'appointments', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [
        { type: 'waitFor', selector: '[data-testid="appt-count"]', timeout: 10000 },
        { type: 'wait', ms: 3000 },
      ],
    },
    {
      route: '/dashboard', name: 'appointments-filtered', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [
        { type: 'click', selector: '[data-testid="filter-today"]', waitAfter: 1000 },
      ],
    },
    {
      route: '/dashboard', name: 'clinic-admins', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [{ type: 'click', selector: '[data-testid="tab-admins"]', waitAfter: 1500 }],
    },
    {
      route: '/dashboard', name: 'analytics', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [{ type: 'click', selector: '[data-testid="tab-analytics"]', waitAfter: 2000 }],
    },
    {
      route: '/dashboard', name: 'analytics-30d', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [
        { type: 'click', selector: '[data-testid="tab-analytics"]', waitAfter: 2000 },
        { type: 'click', selector: '[data-testid="filter-30d"]', waitAfter: 1500 },
      ],
    },
    {
      route: '/dashboard', name: 'leads', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [{ type: 'click', selector: '[data-testid="tab-leads"]', waitAfter: 1500 }],
    },
    {
      route: '/dashboard', name: 'leads-filtered', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [
        { type: 'click', selector: '[data-testid="tab-leads"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="filter-new"]', waitAfter: 1000 },
      ],
    },
    {
      route: '/dashboard', name: 'prescriptions', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [{ type: 'click', selector: '[data-testid="tab-prescriptions"]', waitAfter: 1500 }],
    },
    {
      route: '/dashboard', name: 'audit-logs', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [{ type: 'click', selector: '[data-testid="tab-audit-logs"]', waitAfter: 1500 }],
    },
    {
      route: '/dashboard', name: 'profile', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [{ type: 'click', selector: '[data-testid="tab-profile"]', waitAfter: 1500 }],
    },

    // --- Modals: Book Appointment multi-step ---
    {
      route: '/dashboard', name: 'modal-book-step1', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [
        { type: 'click', selector: '[data-testid="btn-book-appointment"]', waitAfter: 1000 },
        { type: 'screenshot', name: 'modal-book-step1' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'modal-book-step2-otp', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [
        { type: 'click', selector: '[data-testid="btn-book-appointment"]', waitAfter: 1000 },
        { type: 'fill', selector: '[data-testid="booking-phone"]', value: '+910000000000' },
        { type: 'click', selector: '[data-testid="booking-search"]', waitAfter: 2000 },
        { type: 'waitFor', selector: '[data-testid="booking-patient-radio"]', timeout: 5000 },
        { type: 'click', selector: '[data-testid="booking-patient-option"]', waitAfter: 500 },
        { type: 'screenshot', name: 'modal-book-step2-search-result' },
        { type: 'click', selector: '[data-testid="booking-send-otp"]', waitAfter: 2000 },
        { type: 'waitFor', selector: '[data-testid="booking-otp"]', timeout: 5000 },
        { type: 'screenshot', name: 'modal-book-step2-otp' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'modal-book-step3-slot', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [
        { type: 'click', selector: '[data-testid="btn-book-appointment"]', waitAfter: 1000 },
        { type: 'fill', selector: '[data-testid="booking-phone"]', value: '+910000000000' },
        { type: 'click', selector: '[data-testid="booking-search"]', waitAfter: 2000 },
        { type: 'waitFor', selector: '[data-testid="booking-patient-radio"]', timeout: 5000 },
        { type: 'click', selector: '[data-testid="booking-patient-option"]', waitAfter: 500 },
        { type: 'click', selector: '[data-testid="booking-send-otp"]', waitAfter: 2000 },
        { type: 'waitFor', selector: '[data-testid="booking-otp"]', timeout: 5000 },
        { type: 'fill', selector: '[data-testid="booking-otp"]', value: '123456' },
        { type: 'click', selector: '[data-testid="booking-verify-otp"]', waitAfter: 3000 },
        { type: 'screenshot', name: 'modal-book-step3-slot' },
      ],
      actionsIncludeShot: true,
    },

    // --- Modals: CRUD ---
    {
      route: '/dashboard', name: 'modal-add-admin', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [
        { type: 'click', selector: '[data-testid="tab-admins"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="btn-add-admin"]', waitAfter: 1000 },
        { type: 'screenshot', name: 'modal-add-admin' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'modal-edit-admin', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [
        { type: 'click', selector: '[data-testid="tab-admins"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="btn-edit"] >> nth=0', waitAfter: 1000 },
        { type: 'screenshot', name: 'modal-edit-admin' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'modal-add-lead', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [
        { type: 'click', selector: '[data-testid="tab-leads"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="btn-add-lead"]', waitAfter: 1000 },
        { type: 'screenshot', name: 'modal-add-lead' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'modal-edit-lead', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [
        { type: 'click', selector: '[data-testid="tab-leads"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="btn-edit"] >> nth=0', waitAfter: 1000 },
        { type: 'screenshot', name: 'modal-edit-lead' },
      ],
      actionsIncludeShot: true,
    },

    // --- Modal: Prescription detail ---
    {
      route: '/dashboard', name: 'modal-prescription-detail', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [
        { type: 'click', selector: '[data-testid="tab-prescriptions"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="rx-row"]', waitAfter: 1500 },
        { type: 'screenshot', name: 'modal-prescription-detail' },
      ],
      actionsIncludeShot: true,
    },

    // --- Audit log expanded ---
    {
      route: '/dashboard', name: 'audit-log-expanded', auth: 'clinic',
      waitFor: 'text=Appointments',
      actions: [
        { type: 'click', selector: '[data-testid="tab-audit-logs"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="expandable-row-first"]', waitAfter: 1000 },
        { type: 'screenshot', name: 'audit-log-expanded' },
      ],
      actionsIncludeShot: true,
    },
  ],

  // ══════════════════════════════════════════════════════
  // ADMIN APP
  // ══════════════════════════════════════════════════════
  admin: [
    // --- Pages / Tabs ---
    { route: '/', name: 'login' },
    {
      route: '/dashboard', name: 'doctors', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'waitFor', selector: '[data-testid="btn-edit"]', timeout: 10000 },
      ],
    },
    {
      route: '/dashboard', name: 'doctors-search', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'fill', selector: '[data-testid="search-doctors"]', value: 'Rahul' },
        { type: 'wait', ms: 1000 },
      ],
    },
    {
      route: '/dashboard', name: 'clinics', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [{ type: 'click', selector: '[data-testid="tab-clinics"]', waitAfter: 1500 }],
    },
    {
      route: '/dashboard', name: 'clinic-managers', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [{ type: 'click', selector: '[data-testid="tab-managers"]', waitAfter: 1500 }],
    },
    {
      route: '/dashboard', name: 'slots', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [{ type: 'click', selector: '[data-testid="tab-slots"]', waitAfter: 1500 }],
    },
    {
      route: '/dashboard', name: 'audit-log', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [{ type: 'click', selector: '[data-testid="tab-audit-log"]', waitAfter: 1500 }],
    },
    {
      route: '/dashboard', name: 'profile', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [{ type: 'click', selector: '[data-testid="tab-profile"]', waitAfter: 1500 }],
    },

    // --- Add modals ---
    {
      route: '/dashboard', name: 'modal-add-doctor', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="btn-add-doctor"]', waitAfter: 1000 },
        { type: 'screenshot', name: 'modal-add-doctor' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'modal-add-clinic', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="tab-clinics"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="btn-add-clinic"]', waitAfter: 1000 },
        { type: 'screenshot', name: 'modal-add-clinic' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'modal-add-manager', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="tab-managers"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="btn-add-manager"]', waitAfter: 1000 },
        { type: 'screenshot', name: 'modal-add-manager' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'modal-add-slot', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="tab-slots"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="btn-add-slot"]', waitAfter: 1000 },
        { type: 'screenshot', name: 'modal-add-slot' },
      ],
      actionsIncludeShot: true,
    },

    // --- Edit modals ---
    {
      route: '/dashboard', name: 'modal-edit-doctor', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="admin-doctor-table"] [data-testid="btn-edit"] >> nth=0', waitAfter: 1000 },
        { type: 'screenshot', name: 'modal-edit-doctor' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'modal-edit-clinic', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="tab-clinics"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="admin-clinic-table"] [data-testid="btn-edit"] >> nth=0', waitAfter: 1000 },
        { type: 'screenshot', name: 'modal-edit-clinic' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'modal-edit-manager', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="tab-managers"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="btn-edit"] >> nth=0', waitAfter: 1000 },
        { type: 'screenshot', name: 'modal-edit-manager' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'modal-edit-slot', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="tab-slots"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="btn-edit"] >> nth=0', waitAfter: 1000 },
        { type: 'screenshot', name: 'modal-edit-slot' },
      ],
      actionsIncludeShot: true,
    },

    // --- Confirm modals (click toggle/delete → screenshot → no confirm) ---
    {
      route: '/dashboard', name: 'confirm-verify-doctor', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="admin-doctor-table"] [data-testid="btn-toggle"] >> nth=0', waitAfter: 1000 },
        { type: 'screenshot', name: 'confirm-verify-doctor' },
        { type: 'press', key: 'Escape' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'confirm-public-doctor', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="admin-doctor-table"] [data-testid="btn-toggle"] >> nth=1', waitAfter: 1000 },
        { type: 'screenshot', name: 'confirm-public-doctor' },
        { type: 'press', key: 'Escape' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'confirm-verify-clinic', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="tab-clinics"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="admin-clinic-table"] [data-testid="btn-toggle"] >> nth=0', waitAfter: 1000 },
        { type: 'screenshot', name: 'confirm-verify-clinic' },
        { type: 'press', key: 'Escape' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'confirm-active-clinic', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="tab-clinics"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="admin-clinic-table"] [data-testid="btn-toggle"] >> nth=1', waitAfter: 1000 },
        { type: 'screenshot', name: 'confirm-active-clinic' },
        { type: 'press', key: 'Escape' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'confirm-toggle-manager', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="tab-managers"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="btn-toggle"] >> nth=0', waitAfter: 1000 },
        { type: 'screenshot', name: 'confirm-toggle-manager' },
        { type: 'press', key: 'Escape' },
      ],
      actionsIncludeShot: true,
    },
    {
      route: '/dashboard', name: 'confirm-delete-slot', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="tab-slots"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="btn-delete"] >> nth=0', waitAfter: 1000 },
        { type: 'screenshot', name: 'confirm-delete-slot' },
        { type: 'press', key: 'Escape' },
      ],
      actionsIncludeShot: true,
    },

    // --- Audit log expanded ---
    {
      route: '/dashboard', name: 'audit-log-expanded', auth: 'admin',
      waitFor: 'text=Doctors',
      actions: [
        { type: 'click', selector: '[data-testid="tab-audit-log"]', waitAfter: 1500 },
        { type: 'click', selector: '[data-testid="expandable-row-first"]', waitAfter: 1000 },
        { type: 'screenshot', name: 'audit-log-expanded' },
      ],
      actionsIncludeShot: true,
    },
  ],
};

// ────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  console.log(`[${ts}] ${msg}`);
}

function shotPath(app: string, pageName: string, viewport: string, suffix = ''): string {
  const dir = path.join(BASE_DIR, VERSION, app, pageName);
  fs.mkdirSync(dir, { recursive: true });
  const fname = suffix ? `${pageName}-${viewport}-${suffix}.png` : `${pageName}-${viewport}.png`;
  return path.join(dir, fname);
}

async function captureWithFolds(
  page: Page,
  app: string,
  pageName: string,
  viewportName: string,
  suffix = '',
  scrollSelector?: string,
): Promise<void> {
  const scrollHeight = await page.evaluate((sel) => {
    if (sel) {
      const el = document.querySelector(sel);
      return el ? el.scrollHeight : document.documentElement.scrollHeight;
    }
    return document.documentElement.scrollHeight;
  }, scrollSelector ?? null);

  const containerHeight = await page.evaluate((sel) => {
    if (sel) {
      const el = document.querySelector(sel);
      return el ? el.clientHeight : window.innerHeight;
    }
    return window.innerHeight;
  }, scrollSelector ?? null);

  const folds = Math.ceil(scrollHeight / containerHeight);

  await page.evaluate((sel) => {
    if (sel) {
      const el = document.querySelector(sel);
      if (el) el.scrollTop = 0;
    } else {
      window.scrollTo(0, 0);
    }
  }, scrollSelector ?? null);
  await page.waitForTimeout(200);

  const p = shotPath(app, pageName, viewportName, suffix);
  await page.screenshot({ path: p });
  log(`  [SHOT]  ${path.basename(p)} (${scrollHeight}px content, ${containerHeight}px viewport, ${folds} fold${folds > 1 ? 's' : ''})`);

  if (scrollHeight > containerHeight + 50) {
    for (let i = 1; i < folds; i++) {
      await page.evaluate(({ sel, y }) => {
        if (sel) {
          const el = document.querySelector(sel);
          if (el) el.scrollTop = y;
        } else {
          window.scrollTo(0, y);
        }
      }, { sel: scrollSelector ?? null, y: i * containerHeight });
      await page.waitForTimeout(300);

      const foldSuffix = suffix ? `${suffix}-fold${i + 1}` : `fold${i + 1}`;
      const fp = shotPath(app, pageName, viewportName, foldSuffix);
      await page.screenshot({ path: fp });
      log(`  [FOLD]  ${path.basename(fp)} (fold ${i + 1}/${folds})`);
    }
  }
}

async function setupAuth(
  page: Page,
  _context: BrowserContext,
  app: AppName,
  role: AuthRole,
  baseURL: string,
  _emptyUser = false,
): Promise<void> {
  log(`  [AUTH]  Setting up ${role} auth for ${app}`);
  // TODO: if emptyUser, create a fresh user via API and use their token
  const token = readAuthToken(role);
  const tokenKey = TOKEN_KEYS[app];
  await page.goto(baseURL + '/login', { waitUntil: 'domcontentloaded', timeout: 8000 });
  await page.evaluate(({ key, val }) => localStorage.setItem(key, val), { key: tokenKey, val: token });
  log(`  [AUTH]  Token set in localStorage as ${tokenKey}`);
}

async function runActions(page: Page, actions: Action[], app: string, pageName: string, viewportName: string): Promise<void> {
  for (const action of actions) {
    switch (action.type) {
      case 'click':
        try {
          await page.locator(action.selector).first().click({ timeout: 5000 });
          await page.waitForTimeout(action.waitAfter ?? 500);
        } catch {
          log(`  [WARN]  click "${action.selector}" failed, proceeding`);
        }
        break;
      case 'fill':
        try {
          await page.locator(action.selector).first().fill(action.value);
          await page.waitForTimeout(300);
        } catch {
          log(`  [WARN]  fill "${action.selector}" failed, proceeding`);
        }
        break;
      case 'screenshot': {
        const p = shotPath(app, pageName, viewportName, action.name);
        await page.screenshot({ path: p });
        log(`  [SHOT]  ${path.basename(p)} (action screenshot)`);
        break;
      }
      case 'wait':
        await page.waitForTimeout(action.ms);
        break;
      case 'waitFor':
        try {
          await page.waitForSelector(action.selector, { timeout: action.timeout ?? 8000 });
        } catch {
          log(`  [WARN]  waitFor "${action.selector}" timed out, proceeding`);
        }
        break;
      case 'press':
        try {
          await page.keyboard.press(action.key);
          await page.waitForTimeout(300);
        } catch {
          log(`  [WARN]  press "${action.key}" failed, proceeding`);
        }
        break;
    }
  }
}

// ────────────────────────────────────────────────────────
// TEST GENERATION
// ────────────────────────────────────────────────────────

for (const [appName, pages] of Object.entries(PAGES) as [AppName, PageDef[]][]) {
  const baseURL = `http://localhost:${APP_PORTS[appName]}`;

  test.describe(`Screenshots: ${appName}`, () => {
    for (const vp of VIEWPORTS) {
      test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
        for (const pg of pages) {
          test(`${pg.name}`, async ({ browser }) => {
            const context = await browser.newContext({
              viewport: { width: vp.width, height: vp.height },
              geolocation: { latitude: 22.5726, longitude: 88.3639 },
              permissions: ['geolocation'],
            });
            const page = await context.newPage();

            log(`[START] ${appName}/${pg.name} @ ${vp.name}`);

            if (pg.auth) {
              await setupAuth(page, context, appName, pg.auth, baseURL, pg.emptyUser);
            }

            const route = pg.resolveRoute
              ? await pg.resolveRoute(page, baseURL)
              : pg.route;

            log(`  [NAV]   ${baseURL}${route}`);
            await page.goto(`${baseURL}${route}`, {
              waitUntil: pg.auth ? 'networkidle' : 'domcontentloaded',
              timeout: 20000,
            });

            if (pg.waitFor) {
              try {
                await page.waitForSelector(pg.waitFor, { timeout: 8000 });
              } catch {
                log(`  [WARN]  waitFor "${pg.waitFor}" timed out, proceeding`);
              }
            }

            // Settle time for client-side rendering + async data fetches
            await page.waitForTimeout(4000);

            // Dismiss Next.js error overlay if present
            await page.evaluate(() => {
              document.querySelectorAll('nextjs-portal').forEach(el => el.remove());
            });

            // Run pre-capture actions
            if (pg.actions) {
              await runActions(page, pg.actions, appName, pg.name, vp.name);
            }

            // Take main screenshot unless actions already did
            if (!pg.actionsIncludeShot) {
              await captureWithFolds(page, appName, pg.name, vp.name, '', pg.scrollSelector);
            }

            await context.close();
            log(`[DONE]  ${appName}/${pg.name} @ ${vp.name}\n`);
          });
        }
      });
    }
  });
}
