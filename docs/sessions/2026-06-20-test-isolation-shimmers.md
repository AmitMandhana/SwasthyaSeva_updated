# Session: Test Isolation, Shimmers, Booking Fixes

**Date**: 2026-06-20
**Branch**: `test/roundtrip-persistence`
**PR**: #36

## What was done

### Production Data Safety (critical)
- E2E tests were modifying production doctor 103 (Preeti Bansal → Rahul). Found via Axiom logs.
- **Validator rule**: test-gen validator now errors if any flow clicks edit/delete/toggle without a preceding search step
- **Backend guard**: `e2eGuard` middleware returns 403 when Playwright mutates non-e2e entities (admin + clinic routes)
- Admin test specs fixed: all edit/toggle/delete flows now search for e2e entities first
- Clinic test specs fixed: admin edit + lead edit search for e2e entities first
- Added search input to ClinicAdminTab component (didn't have one)

### Shimmer Loading States
- `DataTable` component: added `loading` prop with shimmer skeleton rows
- `FilterSearchBar`: added `onSearchStart` callback (fires immediately, before debounce)
- Updated 10 components: admin DoctorTab, ClinicTab, ClinicManagerTab, SlotTab, AuditLogTab; clinic LeadTab, AppointmentTab, AuditLogTab
- Doctor AppointmentList and PatientsPage already had shimmer

### Drawing Pad
- Available for all prescription formats (removed GEN_MED gate)
- Auto-uploads on prescription save via ref (`uploadIfDirty`)
- Cloudinary API key is public (safe), secret stays server-side

### Booking Form
- Symptom description: made optional (frontend + backend)
- All selected symptom tag names saved as `|||` delimited text in `symptom_text`
- Consultation header: splits `|||` delimited symptoms into separate badges
- Complaints: already optional
- Register Patient button: now disabled when required fields empty

### Infrastructure
- `getlogs` CLI command for querying Axiom logs
- CLAUDE.md: strengthened CI check requirement

## Remaining Work
- **Bug 2**: 5 clinic booking tests fail because phone `+910000099999` gets registered by test 11, then subsequent tests expect "new patient" flow. Need unique phones per test or cleanup between tests.
- Full E2E suite run across all 4 apps not yet done this session
- CI on PR #36 needs to be verified after all fixes

## Test Results (clinic booking, 1 worker)
- 12 passed, 6 failed
- Bug 1 (Register button not disabled): FIXED
- Bug 2 (phone reuse across tests): NOT YET FIXED — needs unique phone numbers per test
