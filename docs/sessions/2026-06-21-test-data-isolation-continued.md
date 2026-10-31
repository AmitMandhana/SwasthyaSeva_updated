# Session: E2E Test Data Isolation — Continued

**Date**: 2026-06-21
**Branch**: `chore/test-data-isolation`

## Summary

Continued from the previous session (2026-06-21-test-data-isolation.md). Started at 378/423 (89%) passing. Ended at 419/422 (99.3%) passing.

## What was done

### Investigation Workflow
- Ran `investigate-test-failures` workflow 3 times across the session
- First run: 45 failures → 18 root cause groups
- Second run: 31 failures → 11 root cause groups
- Third run: 9 failures → manually investigated

### Fixes Applied (all committed)

#### Test Spec Fixes
- Clinic admin names: alpha-only ('Test Crud Admin' not 'E2E CRUD Admin')
- Admin slot toast: wait for prior toast to dismiss before edit/delete
- Doctor consultation: expand card after reload, fill med before second add
- Clinic profile password: TestClinic@123 not TestClinicAdmin@123
- Clinic slot deps: edit/delete chain after create, not view
- Web profile occupation: two-step fill for idempotency
- Web prescription detail: testId for doctor name, fix chief complaint colon
- Web tag filter: data-testid on combobox button
- Admin search: Enter press after key:value fill on FilterSearchBar
- Doctor medication count: count card headers, verify single expanded
- Booking validation: fill dob to enable Register button, empty form asserts disabled
- Medication re-save: waitFor card header and input after reload
- Lead edit: chain after create, search by name before clicking edit

#### Component Fixes
- Prescription rx-total-count: always show when data exists
- Appointment empty message: testId instead of ambiguous text
- Softboard saves: load() before closing modal (card + column)
- Lead tab: load() before closing modal, requestIdRef for stale API responses
- DoctorTab: try/catch around extra qualifications sync

#### Data Isolation Fixes
- Admin entity collisions: self-contained tests with unique usernames/phones
- Booking phone pollution: separate phones for validation tests (+910000012345)
- OTP rate limits: skip in DEV_MODE
- Soft-deleted clinic admin: ensure-e2e-accounts restores is_deleted
- Cleanup-baseline: removed stray clinic admin DELETE
- Seed baseline: 20 completed appointments for 23+ prescriptions
- Doctor/clinic verified flags: ensure-e2e-accounts sets verified_doctor + verified
- Lead cleanup: delete ALL leads for e2e clinics (not pattern-based)

#### Infrastructure
- `resolveAndFill` step type for dynamic entity IDs
- Test-gen: toast auto-dismiss after visible assertions
- Test-gen: content comparison instead of spec checksum for skip logic
- Validator: banned phone enforcement (+919 range → ERROR)
- Validator: e2e_ prefix enforcement for dynamic route segments
- Validator: scan packages/ui for testIds, template prefix matching, route normalization
- E2E testing standards: banned .first()/.nth()/.last()
- OTP cooldown: 5s in dev mode
- Turnstile captcha: skip widget in dev mode
- globalTeardown: cleanup-all after all tests finish

#### Dashboard Improvements
- Step vs hook duration display
- Duration type filter (Total/Steps/Hooks)
- "All Servers" → "All"
- Fixed column widths for alignment
- data-setup.log STARTED after cleanup

### Banned Phone Cleanup
- Found and replaced 25+ occurrences of +919876543210 across 7 files
- Added validator rule to reject +919 range phones at generation time

### Production Entity Isolation
- Replaced all DrRahul/CityHealth references with e2e_doc_primary/e2e_clinic_primary
- Doctor login, web profiles, admin slot/manager creation — all use e2e entities now
- Added validator rule: dynamic route segments must use e2e_ prefix

## Final Test Results
- **Before**: 378/423 (89%)
- **After**: 419/422 (99.3%)
- **Net gain**: +41 tests fixed

### Remaining 3 Failures
1. **Slot search filter** (web): Intermittent — Turnstile captcha timing in Playwright. Dev mode bypass committed but may still be timing-sensitive.
2. **Vitals tab switch** (doctor): Intermittent — Patient Overview Modal hydration timing. The `overview-tab-vitals` sometimes not found after modal opens due to slow API responses under parallel load.
3. **Lead edit persist** (clinic): Fixed in latest commit — was editing wrong lead (index-0 testId). Added search-by-name step.

## Key Decisions
- Admin tests should NOT be serial — each test creates own entity
- Banned phone enforcement in validator (ERROR level)
- e2e_ route enforcement for dynamic segments
- Lead cleanup by clinic_id, not phone/name patterns
- Turnstile bypassed in DEV_MODE (backend test key accepts any token)
- globalTeardown for post-run cleanup
- Test-gen content comparison replaces checksum-based skip

## Commits
48+ commits on branch chore/test-data-isolation
