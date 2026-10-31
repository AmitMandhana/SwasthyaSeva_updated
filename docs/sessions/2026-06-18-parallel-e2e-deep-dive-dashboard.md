# Session: Parallel E2E Infrastructure + Deep-Dive Dashboard — 2026-06-18

## Branch: `feat/form-validation-overhaul`

## What was done

### Parallel E2E Infrastructure
- **Per-project outputDir** in `playwright.config.ts` — isolates `.playwright-artifacts` per project
- **Per-project HTML reports** — `playwright-report/{project}/` based on `--project` CLI arg
- **Dropped built-in JSON reporter** — custom json-logger with timestamps replaces it
- **Lock file utility** (`e2e/fixtures/lock.ts`) — file-based locking with stale detection (120s), poll-wait (500ms, 60s max)
- **Phase-cache skip logic** (`e2e/fixtures/phase-cache.ts`) — reads `start.log` + phase logs to determine if setup can be skipped
- **Auth setup** — wrapped in lock + skip (1hr TTL), consolidated to single test
- **Data-seed** — wrapped in lock + skip (30min TTL), cleanup always runs
- **Warmup** — wrapped in lock + skip (30min TTL), per-page compile timing logged
- **`start.log`** — written by `scripts/dev.js` on every server start, gitignored

### Enhanced JSON Logger
- Each test entry now includes `project` name and `artifacts` object with paths to `trace.zip`, screenshots, video, `error-context.md`, `outputDir`
- Dashboard uses these paths to construct deep-dive API URLs

### Backend Trace API
- **`backend/utils/trace-parser.js`** — parses trace.zip on-demand using adm-zip: actions, network, console, stacks, sources, metadata, arbitrary resources
- **9 new endpoints** in `testRoutes.js` (DEV_MODE gated):
  - `GET /api/test/trace/:project/:testDir` — parsed actions + screenshot index
  - `GET /api/test/trace/:project/:testDir/meta` — quick metadata
  - `GET /api/test/trace/:project/:testDir/network` — HAR-format requests
  - `GET /api/test/trace/:project/:testDir/console` — browser console logs
  - `GET /api/test/trace/:project/:testDir/stacks` — stack traces
  - `GET /api/test/trace/:project/:testDir/source` — test source code
  - `GET /api/test/trace/:project/:testDir/entries` — list all zip entries
  - `GET /api/test/trace/:project/:testDir/resource/{*path}` — serve any resource (screenshots, DOM, CSS, fonts)
- **`GET /api/test/setup-phases`** — returns auth/data/warmup timing from `.auth/*.log` files

### Test Dashboard Enhancements
- **Deep-dive panel** — modal overlay with 6 tabs: Actions, Screenshots, Network, Console, DOM, Source
  - Actions: timeline with icons, params, closest screenshot per action, expandable errors
  - Screenshots: filmstrip grid with click-to-enlarge lightbox
  - Network: request table with method/URL/status/headers, expandable rows
  - Console: color-coded log viewer with type filter
  - DOM: iframe-rendered snapshots with dropdown selector
  - Source: line-numbered code viewer
- **Deep Dive button** on every collapsed test row (rightmost, before chevron)
- **Setup phases in strip** — "Setup 4.8 minutes" with stacked bar (auth blue, data green, warmup amber), expandable to per-phase bars + warmup page breakdown
- **Latest-run-only** — removed run selector dropdown
- **Transparent label** — "Test Dashboard" uses `bg-transparent`
- **Long-form duration** — "25.8 minutes" not "Duration 25.8m"
- **Warmup in seconds** — "284.4s" not "4.7m"
- **Thinner step bar** — `h-2.5` slim bar without inline labels
- **Refresh icon** — SVG icon instead of text button

### Documentation
- **`docs/testing-mechanism.md`** — comprehensive E2E testing pipeline documentation
- **`docs/decisions/parallel-e2e-implementation.md`** — full plan with all decisions, TTLs, lock protocol, API spec, commit plan

## Identified Issues (from admin test run)

21 admin test failures — mostly pre-existing, not caused by infrastructure changes:
- Audit log table not found (3 tests) — `admin-audit-table` testId timing
- "verify created X persists after reload" timeouts (3 tests) — sidebar button not found after reload
- Location picker tests (3 tests) — `gmaps-link-input` not found
- Softboard card/column tests (2 tests) — sidebar button timeout
- Slot creation with day selection (1 test) — sidebar timeout
- Profile password short test (1 test) — sidebar timeout
- Doctor Management Tab (3 tests) — sidebar button not visible (duplicate component tests)
- Clinic Manager Management Tab (3 tests) — manager table timeout
- Audit Log pagination (1 test) — sidebar timeout

## Remaining Work

1. **UI polish** — smooth modal animations, shimmer loading states, no layout shifts, button feedback
2. **Verify parallel execution** — run 4 projects simultaneously, confirm no collisions, correct skip behavior
3. **Fix admin test regressions** — sidebar button timeouts in component-level tests
4. **Run doctor/clinic/web tests** — verify across all servers
5. **Session context** saved, branch pushed
