# Error Display UX Gaps

Audit date: 2026-06-17

## New Standard (target pattern)

- Error message on label row, floating right via `flex justify-between`
- Red border on field when error present
- Required asterisk (*) visible when no error, hidden when error shown
- `role="alert"` on error span for accessibility
- `data-testid` on error span for E2E testing

## Per-Form Status

| Form | App | Per-field errors | Asterisks | Auto-focus | Pattern |
|------|-----|-----------------|-----------|-----------|---------|
| DoctorTab create/edit | Admin | YES | YES | NO | NEW |
| ClinicTab create/edit | Admin | YES | YES | NO | NEW |
| ClinicManagerTab create/edit | Admin | YES | YES | NO | NEW |
| SlotTab create/edit | Admin | **NO** | **NO** | NO | LEGACY (banner only) |
| Admin Login | Admin | **NO** | **NO** | NO | LEGACY (banner, plain inputs) |
| Doctor Login | Doctor | **NO** | **NO** | NO | LEGACY (banner, plain inputs) |
| Clinic Login | Clinic | **NO** | **NO** | NO | LEGACY (banner, plain inputs) |
| Web Login | Web | **NO** | **NO** | NO | LEGACY (banner, plain inputs) |
| Doctor Profile password | Doctor | **NO** | **NO** | NO | LEGACY (TextField present but error prop not wired) |
| Clinic Profile password | Clinic | **NO** | **NO** | NO | LEGACY (TextField present but error prop not wired) |
| Web Profile password | Web | **NO** | **NO** | NO | LEGACY (TextField present but error prop not wired) |
| Consultation save | Doctor | **NO** | **NO** | NO | Toast only |
| BookAppointmentModal Step 3 | Clinic | YES | YES | NO | NEW |
| BookAppointmentModal Steps 1,2,4 | Clinic | **NO** | **NO** | NO | LEGACY (banner only) |
| ClinicAdminTab create/edit | Clinic | YES | YES | NO | NEW |

## Critical Gaps

1. **Auto-focus**: `useFormValidation` hook exists but is NOT wired into any form. Zero forms auto-focus/scroll to first error.
2. **Password change forms**: All 3 apps have TextField components but don't pass `error` prop — validation messages only show as form-level banner.
3. **Login pages**: All 4 use plain `<input>` elements, not TextField. No per-field error display possible without migration.
4. **SlotTab**: Complete miss — only form-level banner, no per-field errors, no asterisks.
5. **Consultation**: Uses toast notifications only, no inline field errors.
