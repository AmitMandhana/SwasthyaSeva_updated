# Parallel E2E Test Execution + Deep-Dive Dashboard — Implementation Plan

## Part A: Parallel Execution Fixes

### Decisions Made

| Problem | Decision |
|---------|----------|
| Artifact collision | Per-project `outputDir` in config (already done) |
| Setup runs N times | Log-gated skip with lock files |
| Warmup compiles everything | Global warmup, run once, with per-page timing |
| Auth no cache | Log-gated skip (part of setup solution) |
| Reporter collisions | Drop built-in JSON reporter, per-project HTML report folders |

### TTLs

| Phase | TTL | Invalidation |
|-------|-----|-------------|
| Auth | 1 hour | Also invalid if COMPLETED timestamp is before `start.log` timestamp |
| Data seed | 30 min | Also invalid if COMPLETED timestamp is before `start.log` timestamp |
| Warmup | 30 min | Also invalid if COMPLETED timestamp is before `start.log` timestamp |

All three phases also invalidate on server restart (detected via `start.log`).

### Log Files

Already added (just timestamps, append-mode, flushed immediately via `appendFileSync`):

| File | Written By | Events |
|------|-----------|--------|
| `start.log` | `scripts/dev.js` | Server start ISO timestamp (overwrite) |
| `.auth/auth-setup.log` | `e2e/auth.setup.ts` | `STARTED auth-setup` / `COMPLETED auth-setup` |
| `.auth/data-setup.log` | `e2e/data.setup.ts` | `STARTED data-seed` / `COMPLETED data-seed` |
| `.auth/warmup.log` | `e2e/data.setup.ts` | `STARTED warmup` / `COMPLETED warmup` |

### Lock Files

Used to prevent race conditions when multiple processes start simultaneously.

| Lock File | Protects |
|-----------|---------|
| `.auth/auth-setup.lock` | Auth token fetching |
| `.auth/data-setup.lock` | Data seed + cleanup |
| `.auth/warmup.lock` | Page warmup |

#### Lock Protocol

```
1. Check if lock file exists
2. If exists:
   a. Read PID + timestamp from lock
   b. If lock is older than 120s → stale, break it (process crashed)
   c. Otherwise → poll every 500ms until lock is released or 60s timeout
   d. After lock released → read log file → if COMPLETED after start.log → SKIP
3. If not exists:
   a. Create lock file (write PID + timestamp)
   b. Read log file → if COMPLETED after start.log AND within TTL → SKIP, release lock
   c. Otherwise → run the phase → write COMPLETED → release lock
```

#### Stale Lock Detection

Lock file contains: `{"pid": 12345, "timestamp": "2026-06-18T..."}`
- If timestamp is older than 120s, assume the process crashed and break the lock.
- PID is informational (could check if process is alive, but timestamp-based is simpler and cross-platform).

### Skip Logic (per phase)

```
function shouldSkip(logFile, ttlMs):
  serverStart = read start.log → parse ISO timestamp
  lastCompleted = read logFile → find last "COMPLETED" line → parse timestamp

  if no lastCompleted → return false (must run)
  if lastCompleted < serverStart → return false (servers restarted since)
  if (now - lastCompleted) > ttlMs → return false (expired)
  return true (skip)
```

### Warmup Enhancements

#### Per-page timing in log

```
2026-06-18T14:01:00.000Z STARTED warmup
2026-06-18T14:01:03.200Z PAGE http://localhost:3002/login compiled 3200ms
2026-06-18T14:01:08.500Z PAGE http://localhost:3002/dashboard compiled 5300ms
2026-06-18T14:01:38.500Z PAGE http://localhost:3002/appointments timeout 30000ms
...
2026-06-18T14:03:30.000Z COMPLETED warmup
```

### Reporter Changes

#### Remove built-in JSON reporter

```ts
// Before
reporter: [
  ['html', { open: 'never' }],
  ['json', { outputFile: 'test-results/results.json' }],  // REMOVE
  ['list'],
  ['./e2e/reporters/json-logger.ts'],
]

// After
reporter: [
  ['html', { open: 'never', outputFolder: `playwright-report/${projectSlug}` }],
  ['list'],
  ['./e2e/reporters/json-logger.ts'],
]
```

#### Per-project HTML report

Detect project from `--project` CLI arg:
```ts
const projArgIdx = process.argv.indexOf('--project');
const projectSlug = projArgIdx >= 0
  ? process.argv[projArgIdx + 1]?.replace('local-', '') || 'default'
  : 'default';
```

Output structure:
```
playwright-report/
  admin/index.html    ← npx playwright show-report playwright-report/admin
  doctor/index.html
  clinic/index.html
  web/index.html
  default/index.html  ← fallback for setup-only or multi-project runs
```

---

## Part B: Deep-Dive Dashboard

### Goal

Add full debugging capabilities to the Test Dashboard (`/dev/test`), matching and exceeding Playwright's HTML report. When a test fails (or you want to inspect any test), click "Deep Dive" to see everything: screenshots, DOM, network, console, source, errors.

### Data Source: trace.zip

Every test produces a `trace.zip` in its output directory. The trace is **plain JSON Lines + JPEG/HTML resources in a standard zip** — fully parseable without Playwright libraries.

#### Contents of trace.zip

| File Pattern | Format | Contains |
|-------------|--------|----------|
| `test.trace` | JSONL | Top-level test events (before/after hooks) |
| `N-trace.trace` | JSONL | Per-browser-context action events: title, duration, params, errors, source location (file + line), callId for linking |
| `N-trace.network` | JSONL | Full HAR-format network data: method, URL, headers, status, timing, response size, cookies |
| `N-trace.stacks` | JSONL | Stack trace mappings (callId → source frames) |
| `resources/page@{id}-{timestamp}.jpeg` | JPEG | Screenshots — one per browser frame, timestamped in ms |
| `resources/{hash}.html` | HTML | DOM snapshots at each action |
| `resources/{hash}.json` | JSON | Console logs, API responses, metadata |
| `resources/{hash}.css` | CSS | Stylesheets for DOM snapshot rendering |
| `resources/{hash}.woff2` | Binary | Fonts for DOM snapshot rendering |
| `resources/{hash}.png` | PNG | Images captured from pages |
| `resources/src@{hash}.txt` | Text | Test source code |

**Everything is preserved — zero data loss.** CSS, fonts, images, DOM snapshots — all served so DOM snapshots can be rendered faithfully in the dashboard.

### Backend API (test routes, DEV_MODE gated)

All endpoints live in `backend/routes/testRoutes.js` under the existing DEV_MODE guard.

#### Existing endpoints (no changes)

```
GET  /api/test/reports              → list JSON report files
GET  /api/test/reports/:filename    → get one JSON report
GET  /api/test/screenshot/:dir/:file → serve a screenshot file
```

#### New endpoints

```
GET  /api/test/trace/:project/:testDir
     → Parse trace.zip from test-results/{project}/{testDir}/trace.zip
     → Returns JSON:
       {
         actions: [{ callId, title, startTime, endTime, duration, params, error, source: {file, line}, screenshots: [url...] }],
         contexts: [{ id, actions: [...same format...] }]
       }

GET  /api/test/trace/:project/:testDir/network
     → Parse N-trace.network files from the trace zip
     → Returns JSON:
       {
         requests: [{ method, url, status, startTime, duration, requestHeaders, responseHeaders, requestSize, responseSize, mimeType }]
       }

GET  /api/test/trace/:project/:testDir/console
     → Parse console-related resources from trace zip
     → Returns JSON:
       {
         logs: [{ type, text, timestamp, source: {file, line} }]
       }

GET  /api/test/trace/:project/:testDir/screenshot/:filename
     → Serve a specific JPEG/PNG from resources/ inside the trace zip
     → Response: image/jpeg or image/png

GET  /api/test/trace/:project/:testDir/dom/:hash
     → Serve a DOM snapshot HTML from resources/ inside the trace zip
     → Response: text/html (includes referenced CSS/fonts via relative URLs)

GET  /api/test/trace/:project/:testDir/resource/:hash
     → Serve any resource from the trace zip (CSS, fonts, images, JSON, source)
     → Response: appropriate content-type based on extension/content

GET  /api/test/trace/:project/:testDir/stacks
     → Parse N-trace.stacks files
     → Returns JSON: { stacks: { [callId]: [{ file, line, column }] } }

GET  /api/test/trace/:project/:testDir/source
     → Parse src@*.txt files from resources/
     → Returns JSON: { files: { [path]: content } }

GET  /api/test/trace/:project/:testDir/meta
     → Quick metadata without full parse: test name, status, duration, error summary, artifact sizes
     → Returns JSON for fast dashboard rendering before deep-dive is opened
```

All endpoints unzip on-demand (no pre-extraction). trace.zip is typically 1-5MB, unzip is ~50ms.

### Enhanced JSON Logger

The custom `json-logger.ts` reporter needs to capture artifact paths per test so the dashboard knows where to find traces.

```ts
// Current test entry
{
  suite: "Admin Dashboard",
  test: "create doctor",
  status: "passed",
  duration: 4700,
  steps: [...],
  errors: [...],
  retries: 0
}

// Enhanced test entry
{
  suite: "Admin Dashboard",
  test: "create doctor",
  status: "passed",
  duration: 4700,
  steps: [...],
  errors: [...],
  retries: 0,
  project: "local-admin",
  artifacts: {
    trace: "test-results/admin/Admin-Dashboard-create-doctor/trace.zip",
    screenshots: ["test-results/admin/.../test-failed-1.png"],
    video: null,
    errorContext: null
  }
}
```

The `project` and `artifacts.trace` fields let the dashboard construct the deep-dive API URLs directly.

### Dashboard UI: Deep-Dive Panel

When a user clicks "Deep Dive" on any test row, a full-width panel opens below the test list (or slides in from the right). Tabs at the top:

#### Tab 1: Actions (default)

Visual timeline of every action the test performed:
- Vertical list of actions, each showing:
  - Icon (navigate, click, fill, assert, hook)
  - Title ("Navigate to /dashboard", "Click: Sign in button", "Assert: URL contains /dashboard")
  - Duration badge
  - Pass/fail indicator
  - Source location (file:line) — clickable if IDE integration exists
- Click an action → shows:
  - Screenshot at that moment (from `resources/page@*-{timestamp}.jpeg` closest to action time)
  - Params (URL, selector, value, etc.)
  - Error details if failed (message + stack trace)
- Before/After DOM snapshots per action (rendered in an iframe from the `/dom/:hash` endpoint)

#### Tab 2: Screenshots

Filmstrip view — all screenshots in chronological order:
- Thumbnail grid with timestamps
- Click to enlarge
- Scrub through like a video (slider control)
- Timestamp overlay showing which action was happening

#### Tab 3: Network

Table of all HTTP requests during the test:
- Columns: Method, URL (truncated), Status, Type (XHR/fetch/document/script), Size, Duration
- Color coding: green (2xx), yellow (3xx), red (4xx/5xx), grey (cancelled)
- Click a row → expand to show full request/response headers
- Filter by: status code, type, URL pattern
- Waterfall view (horizontal bars showing request timing relative to test start)

#### Tab 4: Console

Chronological list of browser console output:
- Color-coded by type: log (grey), warn (yellow), error (red)
- Timestamp relative to test start
- Source location (file:line)
- Filter by type

#### Tab 5: DOM

Browse DOM snapshots captured during the test:
- Dropdown to select which action's DOM to view
- Rendered in an iframe (full fidelity — includes original CSS, fonts, images via resource serving)
- Useful for seeing exactly what the page looked like at any point

#### Tab 6: Source

Test source code with the current step highlighted:
- Shows the generated `.spec.ts` file
- Highlights the line that failed (if applicable)
- Line numbers + syntax highlighting

### Warmup Display in Summary Strip

The summary strip already shows test stats. Add a warmup section:
- Status: "Warmup: 10 pages compiled in 45s" or "Warmup: cached (skipped)"
- Expandable: click to see per-page timing (mini bar chart)
- Color: green if all compiled, yellow if any timeouts, grey if cached

---

## Implementation Order

### Phase 1: Parallel Execution (Commits 1-7)

#### Commit 1: Reporter cleanup
- Remove JSON reporter from config
- Add per-project HTML report folder detection in `playwright.config.ts`

#### Commit 2: Lock file utility
- Create `e2e/fixtures/lock.ts`
- Functions: `acquireLock(name)`, `releaseLock(name)`, `waitForLock(name, timeoutMs)`
- Stale detection (120s), poll-wait (500ms interval, 60s max)

#### Commit 3: Skip logic utility
- Create `e2e/fixtures/phase-cache.ts`
- Function: `shouldSkipPhase(logFile, ttlMs)` — reads `start.log` + phase log

#### Commit 4: Auth setup — log-gated skip + lock
- Wrap auth in lock + skip check (1hr TTL)

#### Commit 5: Data seed — log-gated skip + lock
- Wrap data seed in lock + skip check (30min TTL)
- Cleanup still runs always (idempotent)

#### Commit 6: Warmup — log-gated skip + lock + per-page timing
- Wrap warmup in lock + skip check (30min TTL)
- Log per-page compile duration to `warmup.log`

#### Commit 7: Verify parallel execution
- Run setup once, then 4 parallel project processes
- Verify: no collisions, no duplicate setup, correct skip behavior

### Phase 2: Enhanced Reporter (Commits 8-9)

#### Commit 8: Enhanced JSON logger
- Add `project` field to each test entry
- Add `artifacts` object with paths to trace.zip, screenshots, video, error-context
- Resolve paths from Playwright's test result object

#### Commit 9: JSON logger — capture test output directory
- Use Playwright's `TestResult.attachments` to find trace/screenshot/video paths
- Store relative paths so they work from any serving root

### Phase 3: Backend Trace API (Commits 10-13)

#### Commit 10: Trace parser utility
- `backend/utils/trace-parser.js` — opens zip, parses JSONL files, indexes resources
- Functions: `parseActions(zipPath)`, `parseNetwork(zipPath)`, `parseConsole(zipPath)`, `getResource(zipPath, name)`

#### Commit 11: Trace API endpoints — actions + meta
- `GET /api/test/trace/:project/:testDir` → parsed actions
- `GET /api/test/trace/:project/:testDir/meta` → quick metadata

#### Commit 12: Trace API endpoints — network + console + stacks + source
- `GET /api/test/trace/:project/:testDir/network`
- `GET /api/test/trace/:project/:testDir/console`
- `GET /api/test/trace/:project/:testDir/stacks`
- `GET /api/test/trace/:project/:testDir/source`

#### Commit 13: Trace API endpoints — resource serving
- `GET /api/test/trace/:project/:testDir/screenshot/:filename`
- `GET /api/test/trace/:project/:testDir/dom/:hash`
- `GET /api/test/trace/:project/:testDir/resource/:hash`

### Phase 4: Dashboard Deep-Dive UI (Commits 14-20)

#### Commit 14: Deep-dive panel shell
- "Deep Dive" button on each test row
- Full-width panel with tab navigation (Actions, Screenshots, Network, Console, DOM, Source)
- Loading state while trace is fetched

#### Commit 15: Actions tab
- Action timeline with icons, titles, durations, pass/fail
- Click action → screenshot + params + error details
- Source location display

#### Commit 16: Screenshots tab
- Filmstrip thumbnail grid
- Click to enlarge
- Timestamp overlay
- Scrubber control

#### Commit 17: Network tab
- Request table with method, URL, status, type, size, duration
- Color coding by status
- Expandable rows for headers
- Waterfall timing visualization

#### Commit 18: Console tab
- Chronological log list
- Color-coded by type (log/warn/error)
- Timestamp + source location
- Filter by type

#### Commit 19: DOM tab
- Snapshot selector (dropdown per action)
- Iframe rendering with full CSS/font/image fidelity via resource serving

#### Commit 20: Source tab + warmup strip
- Test source code with line highlighting
- Warmup display in summary strip (compiled/cached, per-page timing)

---

## Usage After Implementation

```bash
# Parallel test run — just launch them all
npx playwright test --project=local-admin &
npx playwright test --project=local-doctor &
npx playwright test --project=local-clinic &
npx playwright test --project=local-web &

# Process 1 acquires locks, runs setup/data/warmup
# Processes 2-4 wait on locks, then skip (COMPLETED found in logs)
# All 4 run their tests in parallel
# Per-project HTML reports: playwright-report/{admin,doctor,clinic,web}/
# Per-project artifacts: test-results/{admin,doctor,clinic,web}/
# Timestamped JSON reports: test-results/logs/test-run-{ts}.json

# View results
# Open Test Dashboard at http://localhost:3001/dev/test
# → Summary strip shows pass/fail + warmup timing
# → Click any test → expand to see steps
# → Click "Deep Dive" → full debugging: actions, screenshots, network, console, DOM, source
```
