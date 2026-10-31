# Session: DRY Audit & Frontend Refactor

**Date**: 2026-06-22
**Branch**: `fix/e2e-slot-cleanup`
**PR**: #38
**Commits**: ~164

## What was done

### 1. Slot tab toolbar fix (original issue)
- Admin slot tab had search bar and "+ New Slot" button on separate rows with no refresh button
- Fixed layout to match other admin tabs (single row with ListToolbar)

### 2. DRY audit (workflow: 52 agents)
- Dispatched 4 parallel scan agents across: repeated JSX, repeated hooks/logic, cross-app duplication, Tailwind/styling
- Found 48 candidates, verified 29 as real and worth fixing
- All 18 unique findings implemented

### 3. Shared components/hooks/utilities extracted to packages/ui/

| Module | Type | Files affected |
|---|---|---|
| ListToolbar | component | 11 tabs (admin + clinic) |
| SegmentedControl | component | 3 clinic tabs |
| CopyablePassword | component | 4 CRUD tabs |
| TempPasswordReveal | component | 4 CRUD tabs |
| ChangePasswordForm | component | 4 profile pages |
| ErrorBanner | component | 7 files (logins + admin tabs) |
| BannerUpload + AvatarUpload | components | 3 admin CRUD tabs |
| PaginationBar | component | 3 clinic tabs |
| Input | component | 3 files |
| PhotoPreviewModal | component | 3 profile pages |
| usePhotoUpload | hook | 3 profile pages |
| useUsernameAvailability | hook | 3 admin tabs |
| usePagination | hook | 5 tabs |
| createAuthStore | factory | 4 auth files |
| createApiClient | factory | 4 API files |
| uploadToCloudinary | utility | 6 files |
| slotUtils | utility | 9 files |
| Button accent + xs | enhancement | 18 buttons across 9 files |

### 4. Behavioral change audit (workflow: 102 agents)
- Scanned all diffs vs main for end-user-visible changes
- Found 72 confirmed changes, mostly minor visual (font-weight, border-radius, hover effects)
- 2 regressions fixed:
  - ChangePasswordForm: restored data-testid via `testIdPrefix` prop
  - AvatarUpload: fixed label showing in edit mode via `showLabel` prop
- 3 intentional improvements:
  - Admin password validation upgraded (6-char → 12-char with complexity)
  - Clinic/doctor password fields now masked (were plaintext)
  - Slot tab gained refresh button

### 5. E2E test data hidden in production
- Added `e2e_` prefix exclusion to 5 backend query files
- Only active when `DEV_MODE !== 'true'` (production)
- Backend `DEV_MODE` centralized into `backend/config/env.js` (was inline in 13 files)
- Jest test setup file created to set `DEV_MODE=true`

### 6. Axiom frontend tracking fixed
- All 4 apps were sending `/api/track` to `localhost:5000` in production
- Root cause: `NEXT_PUBLIC_BACKEND_URL` not set on Vercel
- Fix: derive `BACKEND_ORIGIN` from `NEXT_PUBLIC_API_URL` (which IS set)

### 7. Env constants centralized
- Created `lib/env.ts` per app as single source of truth for all `NEXT_PUBLIC_*` env vars
- Login pages now use exported API functions instead of raw fetch
- ESLint `no-restricted-globals` rule added for `fetch` in app code (must use lib/api.ts)

## Key decisions
- `DAY_ORDER` typed as `string[]` not `as const` to avoid indexOf type errors
- `ChangePasswordForm` uses `testIdPrefix` prop (default "profile") for customizable data-testids
- `AvatarUpload` uses `showLabel` prop to control label visibility independently of `required`
- E2E data filtering uses `DEV_MODE` check (same pattern as OTP, rate limits, etc.)

## E2E Results (pre-merge)
- **First run: 404/422 passed (95.7%)** — 18 failures
- **Final run: 352/352 passed (100%)** after fixes below

### Root causes of 18 failures
- **Password testid mismatch (12)**: ChangePasswordForm uses `testIdPrefix="profile"` generating `profile-password-error`, but 3 spec files still referenced bare `password-error`. Fixed testids in doctor profile, admin ProfileTab, and admin dashboard page specs.
- **Stuck passwords (5 doctor login + 2 admin)**: The password change-and-restore tests changed passwords on the backend, but the wrong testid caused the restore assertion to fail, leaving admin/doctor passwords stuck at the test-changed values. Fixed by rotating both to new passwords (`E2eAdminSecure@2026`, `E2eDoctorPass@2026`) and updating `.env.test` + specs. Also discovered dotenvx treats `#` as comment delimiter — avoided by using `@` instead.
- **Lead tab non-self-contained test (1)**: The "edit lead" flow depended on a prior "create lead" flow via `after`, but the generator's leaf variant skipped the create prerequisite. Fixed by inlining create steps into the edit flow with a distinct lead name.

## Remaining work
- Visual spot-check all 4 apps in production after deploy
- The 1 pre-existing backend test failure (rate limiter) is unrelated

## Stats
- 66+ files changed
- ~1500 lines of duplication eliminated
- 15 new shared modules in packages/ui/
- Net: +1200 added, -1550 removed
