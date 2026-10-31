# Session: Form Validation, Field Overhaul, QA Dashboard — 2026-06-17

## Branch: `feat/form-validation-overhaul`

## What was done

### Admin E2E — 128/128 (100%)
- Fixed DataTable `data-testid` on all rows (not just first)
- Added `'option'` to LocatorRole type
- Fixed toast dismiss before restore slot test
- Fixed clinic lookup `waitFor` in manager creation
- Decoupled `create-clinic-manager` from `create-clinic` to avoid test data collision
- Added `waitFor` before tab clicks in ALL component tests (Doctor, Clinic, Manager, Slot, Softboard, AuditLog, OtpMonitor)
- Removed HTML `required` from TextField input (visual asterisk only)

### Login Migration — All 4 apps
- Added `autoComplete` prop to TextField
- Migrated admin, doctor, clinic, web login pages from plain `<input>` to `TextField`
- Per-field errors (`fieldErrors` state) instead of single banner for validation
- Banner kept for API errors (wrong credentials)
- Removed HTML `required` from all login inputs so JS validation fires

### OTP Input Component
- Created `OTPInput` in `packages/ui/` — 6 individual digit boxes, auto-advance, paste support, numeric-only
- Hidden bridge input for E2E `reactFill` compatibility
- Migrated all 4 login pages + booking modal to `OTPInput`
- Changed test specs to use `reactFill` for OTP inputs

### Field Audit & Showcase
- Full audit of all input types across apps: `docs/validation-audit/field-ux-audit.md`
- Field showcase page at `/dev/fields` (DEV_MODE gated)
- All field components rendered in every state (empty, filled, error, disabled, required)

### Component Fixes
- ToggleSwitch: `h-4.5` → `h-[18px]` (invalid Tailwind class, thumb was invisible)
- SelectField: replaced `scrollIntoView` with manual scroll (was scrolling page to bottom on dropdown open)
- TextField: removed HTML `required` from `<input>` (was blocking JS validation)

### Password Mismatch Tests
- Fixed doctor, clinic, web profile password mismatch tests — used valid-complexity passwords so mismatch error triggers instead of "too short"

### QA/Test Dashboard (`/dev/test`)
- Backend API: `GET /api/test/reports`, `GET /api/test/reports/:filename`, `GET /api/test/screenshot/:dir/:file`
- Frontend: summary strip with pie chart, server cards sidebar, filter pills, test list with expandable step timelines
- Step timeline: continuous bar with numbered actions (colors) and lettered assertions (grey), sequential/duration sort
- Features: multi-select server filter, ascending/descending duration sort, click "N failed" to filter, smooth expand/collapse animation
- Layout: `h-screen flex flex-col`, strip never scrolls, pills sticky with gradient fade, sidebar sticky, scroll container below pills only

### Parallel E2E Tests
- Removed restriction on parallel test project runs from CLAUDE.md
- Plan written: `docs/decisions/parallel-e2e-tests.md`
- Validated: doctor + web + clinic can run in parallel after shared setup

## E2E Test Results (latest)

| Server | Passed | Total | Notes |
|--------|--------|-------|-------|
| Admin | 128 | 128 | 100% |
| Doctor | 89 | 98 | 6 consultation pre-existing bugs, 3 OTP reactFill (fixed but not re-run) |
| Clinic | 111 | 128 | Booking modal timeouts, dashboard password test data, strict mode |
| Web | 80 | 84 | OTP flow timing, prescription detail, tag filter |

## Remaining Work

1. **Doctor consultation bugs** — "add second medication" UI bug, "Mark as Completed" cascade (6 tests)
2. **Clinic dashboard password tests** — stale test data in page.tsx flows (same fix as ProfileTab)
3. **Clinic booking modal registration tests** — timeouts reaching step 3 via OTP
4. **Web OTP flow** — resend handler goes to request form instead of re-sending
5. **Parallel E2E config** — implement the plan in `docs/decisions/parallel-e2e-tests.md`
6. **Field fixes from audit** — password show/hide toggle, phone +91 prefix, missing TextField props (maxLength, inputMode, min, max)
7. **Validation audit fixes** — 11 HIGH field mismatches, 4 CRITICAL endpoint gaps (need approval workflow per CLAUDE.md)
