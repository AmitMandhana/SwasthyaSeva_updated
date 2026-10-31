# Test Data Isolation Contract

## Problem

E2E tests run against the same Supabase database as production. Tests have historically mutated real user data (e.g., production doctor 103 Preeti Bansal was renamed by a test). The isolation model is **account-level**: dedicated e2e accounts that production never touches, and tests never touch production accounts.

## Naming Convention

| Entity Type | Pattern | Example |
|------------|---------|---------|
| Doctor username | `e2e_doc_*` | `e2e_doc_primary` |
| Clinic username | `e2e_clinic_*` | `e2e_clinic_primary` |
| Clinic admin username | `e2e_cadmin_*` | `e2e_cadmin_primary` |
| Admin username | `TestAdmin` | kept as-is |
| Patient first_name | `E2E` | first_name = `E2E` |
| Softboard columns | `[E2E] *` prefix | `[E2E] Test Column` |
| Lead patient_name | `E2E *` prefix | `E2E Lead Patient` |

## Phone Number Ranges

| Purpose | Range |
|---------|-------|
| Ephemeral test patients | `+910000XXXXXX` |
| Persistent test patient | `+910001000001` |
| Persistent test clinic | `+910001000010` |
| Test doctor phones | `+910001000020` - `+910001000029` |
| Demo data patients | `+910000100010` - `+910000100016` |
| **BANNED** | `+919XXXXXXXXX` (real Indian mobile numbers) |

## Dedicated E2E Accounts

Auto-created by `POST /api/test/ensure-e2e-accounts` (called by `data.setup.ts`).

| Role | Username | Phone |
|------|----------|-------|
| Admin | `TestAdmin` | N/A |
| Doctor | `e2e_doc_primary` | `+910001000020` |
| Clinic | `e2e_clinic_primary` | `+910001000010` |
| Clinic admin | `e2e_cadmin_primary` | `+910001000011` |
| Patient | E2E TestPatient | `+910001000001` |

## Team Admin Accounts (production)

Created via `backend/scripts/addAdmin.js`. Protected by e2eGuard (usernames don't start with `e2e`).

| Name | Username |
|------|----------|
| Test Patient | `test_patient` |
| Soumyadeep Pal | `soumyadeep` |
| Soumyadip Sardar | `soumyadip` |
| Preeti Bansal | `preeti` |
| Saurabh Kumar | `saurabh` |

## Guards

### e2eGuard (entity-based)

Applied to admin routes for doctors, clinics, clinic managers, and slots. When `DEV_MODE=true` and request comes from Playwright, checks that the target entity's username starts with `e2e`. Returns 403 otherwise.

**Coverage**: `backend/routes/adminRoutes.js`, `backend/routes/clinicRoutes.js`

### e2eSelfGuard (auth-based)

Applied to all non-GET doctor routes. When `DEV_MODE=true` and request comes from Playwright, checks that the authenticated doctor's username starts with `e2e`. Returns 403 otherwise.

**Coverage**: `backend/routes/doctorRoutes.js`

### create-appointment validation

The `POST /api/test/create-appointment` endpoint validates that:
1. `doctor_id` belongs to an `e2e`-prefixed doctor
2. `user_id` belongs to a user with a test-range phone number

Returns 403 if either check fails.

## Test Infrastructure Endpoints

All under `/api/test/*`, only available when `DEV_MODE=true`.

| Endpoint | Purpose |
|----------|---------|
| `POST /ensure-e2e-accounts` | Idempotent creation of all e2e accounts |
| `GET /resolve-test-entities` | Returns IDs of e2e accounts for test use |
| `POST /cleanup-all` | Runs all cleanup operations in dependency order |
| `POST /seed-baseline` | Creates baseline appointments/prescriptions (uses e2e accounts) |

## How to Add a New Test Account

1. Define it in `E2E_ACCOUNTS` at the top of `backend/routes/testRoutes.js`
2. Add creation logic to the `ensure-e2e-accounts` handler
3. Add it to the `resolve-test-entities` response
4. Use a phone in the `+91000` range
5. Use a username starting with `e2e_`
