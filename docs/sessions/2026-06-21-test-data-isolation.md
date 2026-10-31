# Session: Test Data Isolation & E2E Failure Investigation

**Date**: 2026-06-20 to 2026-06-21
**Branch**: `chore/test-data-isolation`

## What was done

### Test Data Isolation (complete)
- Audited 9 categories of ambiguity where E2E tests could affect prod data
- Defined naming convention: `e2e_` prefix for test entities, `+91000` phone range
- Created `ensure-e2e-accounts` endpoint (auto-creates e2e doctor, clinic, clinic admin, patient, slot)
- Created `resolve-test-entities` endpoint (returns current e2e entity IDs)
- Created `cleanup-all` endpoint (single cleanup replacing 5 fragmented calls)
- Extended `e2eGuard` to cover slots and doctor mutation routes (`e2eSelfGuard`)
- Added entity validation to `create-appointment` (blocks non-e2e entities)
- Replaced all 11 hardcoded `doctor_id: 9, user_id: 1, slot_id: 33` in cross-app tests
- Updated auth defaults and `.env.test` to use e2e accounts
- Migrated demo data phones from `+919` to `+91000` range
- Removed production Playwright projects (`prod-web`, etc.)
- Narrowed softboard cleanup to `[E2E]%` prefix only
- Documented contract in `docs/decisions/test-data-isolation.md`
- Created 5 team admin accounts (arpan, soumyadeep, soumyadip, preeti, saurabh)
- Created patient account for a test patient (+910000000000)

### Database Cleanup
- Nuked 8 doctors (kept DrRahul + Preeti Bansal)
- Nuked 3 clinics (kept CityHealth + KDClinic)
- Restored Preeti's slots (MON + THU at KDClinic)
- Wiped all appointments, prescriptions, medications, leads, demo patients

### E2E Failure Investigation (in progress)
- Created reusable workflow: `.claude/workflows/investigate-test-failures.js`
- Ran investigation: 17 agents analyzed 150 failures across 16 groups
- Test results: 273 passed / 150 failed (65% pass rate)

### Fixes Applied (4 of 12 done)
1. **cleanup-all preserves e2e accounts** — only wipes transactional data, IDs stay stable
2. **isLoading guard** in admin + clinic ClientDashboard — prevents auth redirect during hydration
3. **Consultation Promise.all** — loads appointment + profile format together, no race condition
4. **Login spec credentials** — updated to use e2e account phones/usernames

### Remaining Fixes (8 of 12)
5. Clinic booking phone numbers + OTP locator (13 tests)
6. Admin parallel collision — unique usernames (7 tests)
7. Clinic password validation text (2 tests)
8. Softboard card-title strict mode (4 tests)
9. Doctor patients seedApi (4 tests)
10. Admin clinic tab locator (5 tests)
11. Duplicate testIds mobile vs desktop (11 tests)
12. Scattered UI fixes (19 tests)

Full investigation report: see workflow output or the artifact at claude.ai

## Final Test Results
- **Before**: 273 passed / 150 failed (65%)
- **After**: 378 passed / 45 failed (89%)
- **Net gain**: +105 tests fixed

### Remaining 45 Failures
- local-web: 6 (prescription doctor section text, dashboard missing seedApi, profile save disabled, tag filter combobox)
- local-doctor: 2 (appointment kanban empty, past appointments empty edge case)
- local-admin: 11 (softboard cleanup accumulation, slot after-chain deps, admin tab hydration edge cases)
- local-clinic: 26 (lead/slot modal backend errors from stale data, booking cross-test phone pollution, prescription tab empty, analytics empty)

Most map to "Fix 12: Scattered UI fixes" from the investigation report — 5 distinct sub-issues requiring spec-level and component-level changes.

## Key Decisions
- Same DB as prod, isolation via account-level separation
- E2e accounts persist across runs (stable IDs), only transactional data is wiped
- Test failure workflow: group → investigate via agents → discuss with user → fix
- Admin tests run serially (fullyParallel: false) to prevent username collisions
- Always ask user before implementing fixes

## Test Credentials
- Updated `test-credentials.local.md` for manual testing
- CityHealth phone corrected to `+919700000001`
- Patient account: test patient / +910000000000 / (password since rotated)
- 5 team admin accounts: arpan, soumyadeep, soumyadip, preeti, saurabh

## Commits (branch: chore/test-data-isolation)
20 commits total. Key ones:
- Remove prod Playwright projects
- Narrow softboard cleanup to [E2E] prefix
- E2e account infrastructure (ensure, resolve, cleanup-all)
- Replace all hardcoded entity IDs with resolve-test-entities
- seedApi resolveEntities flag for dynamic ID resolution
- cleanup-all preserves persistent e2e accounts
- isLoading guard for admin/clinic dashboard
- Consultation Promise.all for appointment + profile format
- Login/booking specs updated with e2e credentials
- Admin tests serial mode + ephemeral entity cleanup
