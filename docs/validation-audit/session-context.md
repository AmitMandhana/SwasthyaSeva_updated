# Validation Overhaul — Session Context

Last updated: 2026-06-17

## Branch

`feat/form-validation-overhaul` (branched from `fix/custom-symptoms` which has Axiom analytics work)

## What was built

### Shared Validator Library (`packages/ui/validators.ts`)
- 25 field validators mirroring `backend/validators/fields/*.js`
- 11 form schemas mirroring `backend/validators/schemas/*.js`
- `validateForm(schema, data)` runner — checks required + runs validator per field
- `FieldDef`, `FormSchema`, `FieldErrors` types exported
- All exported from `packages/ui/index.ts`

### useFormValidation Hook (`packages/ui/useFormValidation.ts`)
- `registerRef(fieldName)` — returns ref to spread on TextField for auto-focus
- `validateAndFocus(data)` — validates, sets errors, focuses first error field
- `clearErrors()`, `clearFieldError(name)`
- **NOT YET WIRED into any form** — exists but unused. Forms still use inline `validateForm()` calls.

### UI Component Error Display
- `TextField.tsx` — error shows on label row floating right (was hardcoded "is required"), added `inputRef` prop, `data-testid` on error span
- `SelectField.tsx` — same pattern, viewport flip for dropdowns near bottom
- `TextAreaField.tsx` — same pattern, removed old error `<p>` below field, added `textareaRef` prop
- `ImageUpload.tsx` — same pattern
- Pattern: `flex justify-between` label row, error on right, asterisk hidden when error present, `role="alert"` for a11y

### Admin App Migration
- DoctorTab, ClinicTab, ClinicManagerTab — use shared validators from `packages/ui`
- Old `apps/admin/lib/validators.ts` deleted
- Real-time debounced validation removed (was noisy) — now validates on submit only
- `data-testid` added to all form fields for E2E error targeting

### Login Validation (all 4 apps)
- Admin, doctor, clinic, web — JS empty-field checks before API call
- Admin login: removed HTML `required` that blocked JS validation
- Error messages: "Username is required", "Password is required", "Phone is required"

### Password Validation (all 3 profile pages)
- Doctor, clinic, web — `validatePassword()` enforces: 12+ chars, lowercase, uppercase, digit, special char
- Replaces old 6-char minimum
- Cross-field: confirm password mismatch check
- Empty current password check

### Clinic Forms
- ClinicAdminTab — per-field validation with inline schema
- BookAppointmentModal Step 3 — `createUserSchema` validation for patient registration

### Swagger
- All route files: `$` prefix on required fields in body schemas (swagger-autogen convention)
- Admin, clinic, auth, doctor, patient, public routes updated

### E2E Negative Tests Added
- Admin DoctorTab: empty form, username (too short, special chars), name (numbers, special chars), phone (too few digits), password (5 rules each), optional fields (bio too long, invalid URL)
- Admin ClinicTab: empty form, username, phone, street address (special chars), city (special chars), pincode (not 6 digits)
- Admin ClinicManagerTab: empty form, name (numbers), username (too short), phone (too few digits), numeric name negative + alphabetic name positive
- All logins: empty username/password with exact error text assertions
- All password changes: too short, no uppercase, no digit, no special, mismatch, empty current

### E2E Infrastructure Fixes
- Softboard cleanup endpoint + `data.setup.ts` integration
- `btn-edit` on ALL edit buttons (was only `index === 0`)
- Strict mode: empty messages use `role: 'cell'`, options use `role: 'option'`, counts use `countMin`
- Tab click + `waitFor` for async tab content (Clinic, ClinicManager, Softboard)
- Slot buttons: added missing `data-testid` (btn-delete, btn-restore, btn-edit)
- SelectField: viewport flip logic for dropdowns near bottom of modal
- Base degree dropdown: removed Escape press that closed modal

## Current E2E Score

### Admin: 126/128 passing
- 2 remaining failures are test data collisions (component tests conflict with dashboard tests in full suite)
- Targeted runs: all tests pass individually

### Doctor: 90/98 passing (estimated after fixes)
- Fixed: login empty field validation (removed HTML `required`), password mismatch test (used valid-complexity passwords)
- Remaining: 6 consultation failures (cascading from pre-existing "add second medication" UI issue)

### Clinic: ~110/128 (running)
- Password mismatch test fixed (same issue as doctor)
- Login validation fixed (removed HTML `required`)
- BookAppointmentModal registration tests timing out (~8 failures)
- ClinicAdmin CRUD tests: some timing issues

### Web: pending run

## Audit Findings (saved in `docs/validation-audit/`)

### Field Validator Mismatches (11 HIGH severity)
- state: frontend rejects abbreviations backend normalizes
- gender: frontend rejects single letters backend normalizes
- code: frontend requires uppercase, backend normalizes lowercase
- positiveInteger/slotFee/slotTime: parseInt vs Number on edge cases
- phone: type handling asymmetry
- dob: type handling asymmetry
- booleanField: NO frontend validator exists
- createDoctorSchema: missing tag_1/2/3, verified_doctor
- createClinicSchema: missing verified
- updateSlotSchema: missing booking_fee, watermark_url

### Endpoint Validation Gaps (4 CRITICAL)
- Patient + doctor profile password: backend accepts 6-char, frontend enforces 12-char
- Slot creation: backend expects username strings, frontend uses integer IDs
- Prescription save: zero frontend validation

### Error Display Gaps
- Auto-focus: hook exists but NOT wired anywhere
- SlotTab: zero per-field errors (banner only)
- Password change forms: TextField present but error prop not used
- Login pages: plain HTML inputs, no TextField
- BookAppointmentModal Steps 1,2,4: banner only (Step 3 has per-field)
- Consultation: toast only

## Workflow Rules (in CLAUDE.md)

All significant changes require:
1. User approval via AskUserQuestion (options, pros/cons, recommendation)
2. Rationale documented in `docs/decisions/`
3. GitHub issue created before fixing
4. Issue referenced in commit message
5. E2E tests: positive AND negative for every field
6. Negative tests target frontend-backend mismatches (boundary values, patterns, type coercion)

## What's Next

1. ~~Fix last 2 admin test failures~~ DONE
2. ~~Run doctor, clinic, web E2E tests~~ IN PROGRESS
3. Investigate consultation "add second medication" failure (doctor app)
4. Investigate BookAppointmentModal registration test timeouts (clinic app)
5. Run web E2E tests
6. Create GitHub issues for all audit findings
7. Address fixes with approval workflow (one at a time)
