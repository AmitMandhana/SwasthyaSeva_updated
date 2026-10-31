# E2E Testing Standards

## Isolation Model

Tests run against the **same database as production**. Isolation is at the **account level** — dedicated e2e accounts that production never touches, and tests never touch production accounts.

### What production data exists

| Entity | Details |
|--------|---------|
| Doctor | Preeti Bansal (`Preeti1997`, id=103) at KDClinic |
| Doctor | DrRahul (`DrRahul`, id=9) — legacy test doctor, kept for manual testing |
| Clinic | KDClinic (`KDClinic`, id=93) |
| Clinic | CityHealth (`CityHealth`, id=8) — legacy, kept for manual testing |
| Admins | arpan, soumyadeep, soumyadip, preeti, saurabh, TestAdmin |
| Patient | Test Patient (+910000000000, id=162) |

Tests must **never** create appointments, prescriptions, or any data referencing these entities.

---

## E2E Account Naming Convention

| Entity Type | Pattern | Example |
|------------|---------|---------|
| Doctor username | `e2e_doc_*` | `e2e_doc_primary` |
| Clinic username | `e2e_clinic_*` | `e2e_clinic_primary` |
| Clinic admin username | `e2e_cadmin_*` | `e2e_cadmin_primary` |
| Admin username | `TestAdmin` | (kept as-is, only test admin) |
| Patient first_name | `E2E` | first_name = `E2E` |
| Softboard columns | `[E2E] *` prefix | `[E2E] Test Column` |
| Lead patient_name | `E2E *` prefix | `E2E Lead Patient` |
| Entities created by admin tests | `e2e*` prefix | `e2edoctor`, `e2eclinic` |

## Phone Number Ranges

| Purpose | Range | Notes |
|---------|-------|-------|
| Ephemeral test patients | `+910000XXXXXX` | Created during tests, cleaned each run |
| Persistent e2e patient | `+910001000001` | E2E TestPatient account |
| Persistent e2e clinic | `+910001000010` | e2e_clinic_primary |
| E2e clinic admin phone | `+910001000011` | e2e_cadmin_primary |
| E2e doctor phones | `+910001000020`-`029` | e2e_doc_primary at 020 |
| Demo data patients | `+910000100010`-`016` | seed-demo-data.js |
| **BANNED** | `+919XXXXXXXXX` | Real Indian mobile numbers — never use in tests |

All test phones start with `+91000`. Any phone starting with `+919` is a real person.

## Dedicated E2E Accounts

Auto-created by `POST /api/test/ensure-e2e-accounts` (called during auth setup). These accounts **persist across test runs** with stable IDs.

| Role | Username/Name | Phone | Password env var |
|------|--------------|-------|-----------------|
| Admin | `TestAdmin` | N/A | `TEST_ADMIN_PASSWORD` |
| Doctor | `e2e_doc_primary` | `+910001000020` | `TEST_DOCTOR_PASSWORD` |
| Clinic | `e2e_clinic_primary` | `+910001000010` | `TEST_CLINIC_PASSWORD` |
| Clinic Admin | `e2e_cadmin_primary` | `+910001000011` | `TEST_CLINIC_ADMIN_PASSWORD` |
| Patient | E2E TestPatient | `+910001000001` | `TEST_PATIENT_PASSWORD` |

Passwords are defined in `.env.test` and passed to the backend during `ensure-e2e-accounts`.

---

## Data Lifecycle Per Test Run

1. **auth.setup.ts**: calls `ensure-e2e-accounts` (creates accounts if missing, no-op if they exist) → authenticates all 5 roles → saves JWTs to `.auth/*.token`
2. **data.setup.ts**: calls `cleanup-all` → invalidates seed cache → calls `ensure-e2e-accounts` again → calls `seed-baseline` (creates 8 appointments, 1 prescription, 2 medications for the e2e doctor)
3. **Tests run**: each test uses cached auth tokens and baseline data
4. **Next run**: cleanup-all wipes transactional data (appointments, prescriptions, etc.) but keeps e2e accounts

### What cleanup-all deletes
- Appointments, prescriptions, medications, exam records, test requests for e2e doctor's slots
- Ephemeral test patients (phones in `+91000` range)
- Leads with `E2E` name prefix or `+91000` phones
- Softboard columns with `[E2E]` prefix
- Ephemeral e2e clinic admins (not `e2e_cadmin_primary`)
- Ephemeral e2e doctors/clinics/slots (not `e2e_doc_primary`/`e2e_clinic_primary`)

### What cleanup-all preserves
- The persistent e2e accounts (`e2e_doc_primary`, `e2e_clinic_primary`, `e2e_cadmin_primary`)
- The persistent e2e patient (`E2E TestPatient`)
- The persistent e2e slot
- All production data (Preeti, KDClinic, team admins, real patients)

---

## Test Spec Conventions

### Dynamic IDs — never hardcode entity IDs

Test specs that need a `doctor_id`, `user_id`, or `slot_id` must use `resolveEntities: true` in the seedApi:

```typescript
seedApi: {
  endpoint: '/api/test/create-appointment',
  method: 'POST',
  body: {
    doctor_id: 0,    // placeholder — resolved at runtime
    user_id: 0,      // placeholder — resolved at runtime
    slot_id: 0,      // placeholder — resolved at runtime
    appointment_date: new Date().toISOString().slice(0, 10),
    symptom_code: 'FEVER',
    symptom_text: 'Test symptom',
  },
  routeParam: 'appointment_id',
  resolveEntities: true,  // calls /api/test/resolve-test-entities first
}
```

The test generator replaces `doctor_id`, `user_id`, `slot_id`, and `phone` with values from `resolve-test-entities`.

### Login credentials in test specs

When a test spec fills login fields, use e2e account values:

| Field | Value |
|-------|-------|
| Patient phone | `0001000001` (without +91 prefix — the input adds it) |
| Patient first name | `E2E` |
| Patient last name | `TestPatient` |
| Clinic admin username | `e2e_cadmin_primary` |
| Clinic entity phone | `+910001000010` |
| Doctor username | `e2e_doc_primary` |
| OTP (all roles) | `123456` (DEV_MODE fixed OTP) |

### Element locators

Priority: `testId` > `role + name` > `text`. Never use CSS selectors.

When a testId exists on both desktop DataTable and mobile card view, use the desktop one (no `-mobile` suffix). Mobile card buttons use `btn-edit-mobile`, `btn-delete-mobile` etc.

For tab buttons, prefer `testId` over regex patterns:
- `{ testId: 'tab-clinics' }` not `{ role: 'button', name: /Clinics/ }`

Never use `.first()`, `.last()`, or `.nth()` — they hide ambiguous locators and mask duplicate-element bugs. If Playwright's strict mode fires, the locator is wrong. Fix it with a `testId` or scoped container, not a positional escape hatch.

### OTP inputs

The OTP component renders a hidden bridge input. Use:
```typescript
otpInput: { testId: 'booking-otp' }
// and
{ do: 'reactFill', on: 'otpInput', value: '123456' }  // not 'fill'
```

---

## Backend Guards

### e2eGuard (entity-based)
- **Where**: admin routes (doctors, clinics, clinic managers, slots), clinic routes (clinic admins)
- **When**: `DEV_MODE=true` AND request from Playwright user-agent
- **What**: checks target entity's username starts with `e2e`. Returns 403 if not.
- **No-op** in production.

### e2eSelfGuard (auth-based)
- **Where**: all non-GET doctor routes
- **When**: `DEV_MODE=true` AND Playwright
- **What**: checks authenticated doctor's username starts with `e2e`. Returns 403 if not.

### create-appointment validation
- **Where**: `POST /api/test/create-appointment`
- **What**: verifies `doctor_id` belongs to e2e doctor AND `user_id` has test-range phone. Returns 403 otherwise.

---

## Test Infrastructure Endpoints

All under `/api/test/*`, only available when `DEV_MODE=true`.

| Endpoint | Purpose |
|----------|---------|
| `POST /ensure-e2e-accounts` | Idempotent creation of all e2e accounts. Accepts passwords in body. |
| `GET /resolve-test-entities` | Returns `{ doctor_id, clinic_id, slot_id, patient_user_id, patient_phone }` |
| `POST /cleanup-all` | Comprehensive cleanup in dependency order |
| `POST /seed-baseline` | Creates 8 appointments + 1 prescription + 2 medications for e2e doctor |
| `POST /create-appointment` | Creates a single appointment (validates e2e entities) |
| `DELETE /appointment/:id` | Deletes appointment + cascade |
| `POST /seed-patient-prescription` | Creates completed appointment + prescription for a patient phone |

---

## Config

- Admin tests run **serially** (`fullyParallel: false`) — tests depend on each other via `after:` chains
- Other apps run in parallel (`fullyParallel: true` from global config)
- Workers: 4 (default in `playwright.config.ts`)
- OTP is always `123456` in `DEV_MODE` (backend `generateOTP.js`)
- Password minimum: 12 characters (with uppercase, lowercase, digit, special char)

## Adding a New E2E Account

1. Define it in `E2E_ACCOUNTS` at the top of `backend/routes/testRoutes.js`
2. Add creation logic to the `ensure-e2e-accounts` handler
3. Add it to the `resolve-test-entities` response
4. Add its phone to `cleanup-all`'s preserved list (if persistent) or ephemeral cleanup list
5. Use a phone in the `+91000` range
6. Use a username starting with `e2e_`
