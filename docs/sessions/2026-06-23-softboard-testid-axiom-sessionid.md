# Session: Softboard Cleanup, data-testid Stripping, Axiom Tracking Fixes, Session ID

**Date**: 2026-06-23
**Branch**: `fix/softboard-cleanup-testid-strip` (merged as PR #39), `feat/analytics-session-id` (PR #40, pending merge)

## What was done

### PR #39: fix/softboard-cleanup-testid-strip (merged)

1. **Softboard cleanup leak fix**: E2E tests created softboard columns with titles like `E2E Test Column`, `Renamed Column`, `Target Column` — but cleanup SQL matches `[E2E]%` prefix. Fixed all test spec fill values to use `[E2E]` prefix per `e2e-testing-standards.md`.

2. **Naming convention lint**: Added declarative `E2E_FILL_PREFIX_RULES` map in `packages/test-gen/src/validator.ts` to enforce `[E2E]` prefix on softboard fill values. Extensible for future entity types.

3. **Production cleanup**: Deleted 127 orphaned softboard columns + 4 cards from production DB via Supabase MCP.

4. **data-testid stripping**: Added `compiler.reactRemoveProperties` to all 4 `next.config.ts` files, gated on `DEV_MODE` imported from `./lib/env`. Testids remain in dev for E2E, stripped in prod builds.

5. **DEV_MODE centralization**: Added `DEV_MODE` export to doctor + clinic `lib/env.ts` (admin + web already had it). Added `NEXT_PUBLIC_DEV_MODE=true` to missing `.env` files.

6. **Axiom user info race condition**: Merged two separate useEffect hooks in `AnalyticsProvider.tsx` — JWT extraction + page_view tracking — into one. Previously page_view fired before user info was extracted.

7. **Trust proxy**: Added `app.set('trust proxy', 1)` to `backend/server.js`. Without it, `req.ip` returned proxy IP instead of client IP behind Render. Also fixes rate limiting (all users were sharing one bucket).

8. **Cross-origin tracking fix**: Added Next.js `rewrites()` to all 4 `next.config.ts` to proxy `/api/track` through same origin. Changed `AnalyticsProvider` to use relative `/api/track` URL. Prevents Brave Shields / Firefox ETP from blocking cross-origin tracking requests.

### PR #40: feat/analytics-session-id (pending merge)

1. **Session ID**: Added `crypto.randomUUID()` ref in `AnalyticsProvider`, included as `sessionId` in every event. Per page load, survives SPA navigation.

## Cleanup audit results

| Category | Cleanup Pattern | Leak? |
|---|---|---|
| Patients | Phone `+91000*` | No |
| Doctors/Clinics/Admins | `LIKE 'e2e%'` | No |
| Slots/Appointments | FK cascade | No |
| Leads | By clinic_id | No |
| Softboard | `LIKE '[E2E]%'` | Was leaking — fixed |

## Axiom tracking status (post-deploy)

- Events flowing from production (admin, clinic, web confirmed)
- Same-origin rewrite working (`sec-fetch-site: same-origin`)
- IP now populated (e.g., `10.29.109.134` instead of null)
- User info (role, userId, username) populated when logged in
- Doctor app had 0 production events — may need investigation

## Key decisions

- `DEV_MODE` in `next.config.ts` imported from `./lib/env` (single source of truth, not inline)
- `trust proxy` set to `1` (one hop — Render's proxy only)
- Analytics uses same-origin `/api/track` via Next.js rewrites, not cross-origin fetch
- Session ID is per page load (not sessionStorage) — simplest, covers login→dashboard flow

## Remaining work

- Merge PR #40 (sessionId)
- Planned: "Tools" tab in admin dashboard — move OTP Monitor there, add User Journey Viewer and Task Manager
- Doctor app 0 production events — needs investigation
