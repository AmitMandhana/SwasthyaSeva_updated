# E2E Testing Mechanism

## Overview

Tests are **generated from specs embedded in app source files**, not hand-written as Playwright scripts. Authors write a `__test` export in each page/component file describing elements and user flows. The `test-gen` package scans these specs, resolves dependencies, and generates Playwright test files. Playwright then runs the generated tests with centralized auth and data setup.

```
Source files (page.tsx / Component.tsx)
  └── __test = testSpec({...}) or componentTestSpec({...})
        │
        ▼
  test-gen scan → resolve → generate
        │
        ▼
  e2e/generated/{app}/{slug}.spec.ts
        │
        ▼
  Playwright runs with auth.setup → data.setup → tests
```

---

## 1. Test Specs — The Input

Specs live alongside the code they test. Two types:

### Page Specs (`testSpec`)

Defined in `page.tsx` files. Describe the full page: its route, auth requirement, elements, and user flows.

```ts
// apps/admin/app/page.tsx
export const __test = testSpec({
  route: '/',
  auth: 'none',              // 'none' | 'optional' | 'required' | 'role:admin'
  app: 'admin',
  title: 'Admin Login',
  elements: {
    usernameInput: { testId: 'login-username' },
    passwordInput: { testId: 'login-password' },
    signInButton: { role: 'button', name: 'Sign in' },
  },
  flowTree: {
    name: 'render login form',
    steps: [
      { expect: 'visible', on: 'usernameInput' },
      { expect: 'visible', on: 'signInButton' },
    ],
    children: [
      {
        name: 'successful login',
        steps: [
          { do: 'fill', on: 'usernameInput', value: 'TestAdmin' },
          { do: 'fill', on: 'passwordInput', value: '...' },
          { do: 'click', on: 'signInButton' },
          { expect: 'urlContains', value: '/dashboard' },
        ],
      },
    ],
  },
});
```

### Component Specs (`componentTestSpec`)

Defined in non-page component files (e.g., tabs, modals). These get **merged into the parent page's generated test file**.

```ts
// apps/admin/app/dashboard/components/DoctorTab.tsx
export const __test = componentTestSpec({
  parentRoute: '/dashboard',     // which page this belongs to
  app: 'admin',
  title: 'Doctor Tab',
  elements: { ... },
  flows: [
    { name: 'view doctor list', steps: [...] },
    { name: 'create doctor', after: 'view doctor list', steps: [...] },
  ],
});
```

### Element Locators

Each element in `elements` maps a logical name to a Playwright locator strategy:

| Strategy | Example | Generates |
|----------|---------|-----------|
| `testId` | `{ testId: 'login-username' }` | `page.getByTestId('login-username')` |
| `role` | `{ role: 'button', name: 'Sign in' }` | `page.getByRole('button', { name: 'Sign in' })` |
| `text` | `{ text: 'Welcome' }` | `page.getByText('Welcome')` |
| `role` + `exact` | `{ role: 'link', name: 'Home', exact: true }` | `page.getByRole('link', { name: 'Home', exact: true })` |

### Steps

Each step is either an **action** (`do`) or an **assertion** (`expect`):

**Actions** (18 types): `click`, `fill`, `select`, `check`, `hover`, `press`, `waitFor`, `jsClick`, `type`, `reactFill`, `uploadFile`, `clickNewTab`, `comboboxSelect`, `comboboxSelectFirst`, `fillFromSlotDay`, `reload`, `navigate`, `screenshot`

**Assertions** (14 types): `visible`, `hidden`, `text`, `value`, `url`, `urlContains`, `count`, `countMin`, `countMax`, `hasClass`, `enabled`, `disabled`, `checked`

### Flow Dependencies

Flows can depend on each other via `after`:

```ts
flows: [
  { name: 'view list', steps: [...] },
  { name: 'create item', after: 'view list', steps: [...] },
  { name: 'edit item', after: 'create item', steps: [...] },
]
```

The generator resolves these with topological sort. Each test replays all ancestor steps before running its own — so `edit item` first runs steps from `view list`, then `create item`, then its own.

### Flow Trees

Alternative to flat flows. A tree structure where children inherit parent steps:

```ts
flowTree: {
  name: 'root',
  steps: [/* shared setup */],
  children: [
    { name: 'path A', steps: [...] },
    { name: 'path B', steps: [...], children: [
      { name: 'path B1', steps: [...] },
    ]},
  ],
}
```

The generator flattens this to flat flows with `after` chains. Each leaf path becomes one test that replays the full chain from root to leaf.

---

## 2. Test Generation — The Transform

### Commands

```bash
npx test-gen generate   # scan specs → generate test files
npx test-gen validate   # check specs for errors without generating
npx test-gen analyze    # coverage statistics and estimated run time
```

Or via npm scripts:
```bash
npm run test:generate   # same as npx test-gen generate
npm run lint:specs      # same as npx test-gen validate
npm run test:analyze    # same as npx test-gen analyze
```

### How Generation Works

1. **Scan**: Reads all `page.tsx` and component files under `apps/*/app/` looking for `__test = testSpec({...})` or `componentTestSpec({...})`. Uses TypeScript AST to evaluate the spec objects at scan time.

2. **Match Components to Pages**: Component specs declare `parentRoute` and `app`. The generator matches them to the page spec with the same route/app.

3. **Flatten Trees**: If a page spec uses `flowTree`, it's flattened to flat flows with `after` dependencies.

4. **Resolve Flow Order**: Topological sort ensures flows run in dependency order. Detects missing deps and cycles.

5. **Generate Test File**: Produces a Playwright `.spec.ts` file in `e2e/generated/{app}/{slug}.spec.ts`. Each flow becomes a `test()` block.

6. **Checksum Skip**: Computes SHA-256 of the spec content. If it matches the existing `.checksum` file, the test file is not rewritten. This makes generation fast when specs haven't changed.

### Output Structure

```
e2e/generated/
├── admin/
│   ├── home.spec.ts          # from apps/admin/app/page.tsx
│   ├── home.checksum
│   ├── dashboard.spec.ts     # from apps/admin/app/dashboard/page.tsx + components
│   └── dashboard.checksum
├── doctor/
│   ├── login.spec.ts
│   ├── dashboard.spec.ts
│   └── ...
├── clinic/
│   └── ...
└── web/
    └── ...
```

### Generated Test Structure

Each generated file:
- Imports `@playwright/test`, network fixtures, auth helpers
- One `test.describe()` per page (or merged page + components)
- One `test()` per flow
- Each step wrapped in `await test.step('description', async () => { ... })`
- Auth injection: reads token from `.auth/{role}.token`, sets it in `localStorage` before navigation
- Network/console log capture via fixtures
- Error context saved on failure (screenshots, logs)

---

## 3. Playwright Execution — The Run

### Projects

| Project | Test Directory | Dependencies | Purpose |
|---------|---------------|--------------|---------|
| `setup` | `e2e/auth.setup.ts` | none | Fetch auth tokens for all 5 roles |
| `data-setup` | `e2e/data.setup.ts` | `setup` | Seed baseline data + warm up dev servers |
| `local-admin` | `e2e/generated/admin/` | `setup`, `data-setup` | Admin app tests |
| `local-doctor` | `e2e/generated/doctor/` | `setup`, `data-setup` | Doctor app tests |
| `local-clinic` | `e2e/generated/clinic/` | `setup`, `data-setup` | Clinic app tests |
| `local-web` | `e2e/generated/web/` | `setup`, `data-setup` | Web (patient) app tests |
| `screenshots` | `e2e/capture-screenshots.spec.ts` | `setup`, `data-setup` | UI screenshot capture |
| `cross-app` | `e2e/cross-app-flows.spec.ts` | none | Multi-app integration flows |
| `specialty-formats` | `e2e/specialty-formats.spec.ts` | `setup`, `data-setup` | Specialty-specific tests |
| `prescription-pdfs` | `e2e/capture-prescription-pdfs.spec.ts` | `setup` | Golden PDF captures |
| `prod-*` (4) | `e2e/generated/{app}/` | none | Production environment tests |

### Setup Phase: Auth (`auth.setup.ts`)

Runs before everything else. For each of the 5 roles:

1. Clears tokens older than 1 hour from `.auth/`
2. Calls the login API endpoint for the role
3. If 2FA is required (doctor, clinic, clinic_admin), calls verify-OTP with `'123456'` (DEV_MODE)
4. Saves JWT to `.auth/{role}.token`
5. If rate-limited, reuses existing token if available

**Auth roles → API endpoints:**

| Role | Endpoint | Credentials |
|------|----------|-------------|
| admin | `POST /api/admin/login` | username + password |
| doctor | `POST /api/doctor/login` | username + password → OTP verify |
| clinic | `POST /api/clinic/clinic-login` | phone + password → OTP verify |
| clinic_admin | `POST /api/clinic/login` | username + password → OTP verify |
| patient | `POST /api/patient/login` | first_name + last_name + phone + password |

Credentials come from `.env.test`.

### Setup Phase: Data (`data.setup.ts`)

Two steps:

**Step 1 — Seed baseline data:**
- Always runs cleanup first (`POST /api/test/cleanup-e2e-*` for admins, leads, patients, entities, softboard)
- Checks `.auth/baseline-data.json` — if < 30 min old, skips seeding
- Otherwise calls `POST /api/test/seed-baseline` → returns appointment IDs, prescription IDs
- Saves to `.auth/baseline-data.json`

**Step 2 — Warm up dev server pages:**
- Checks `.auth/warmup-done` — if < 10 min old, skips
- Opens a Chromium browser and navigates to 10 key pages:
  - Doctor: login, dashboard, appointments, consultation/{id}
  - Clinic: login, dashboard
  - Web: login, dashboard
  - Admin: login, dashboard
- Each page: injects auth token into localStorage, navigates with `waitUntil: 'networkidle'`, 30s timeout per page
- Purpose: triggers Next.js compilation so tests don't hit cold-start delays
- Total timeout: 300s for the warmup test

### Running Tests

```bash
# Full suite (generates + runs all local projects)
npm run test:e2e

# Individual project
npx playwright test --project=local-admin

# Multiple projects in one command
npx playwright test --project=local-admin --project=local-doctor

# Setup only
npx playwright test --project=setup

# With UI mode
npm run test:e2e:ui
```

### Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| `workers` | 1 | Sequential execution within a project |
| `retries` | 0 | No retries — flaky = broken |
| `timeout` | 90s | Per test |
| `actionTimeout` | 30s | Per action (click, fill, etc.) |
| `expect timeout` | 15s | Per assertion |
| `trace` | on | Always captured |
| `video` | retain-on-failure | Only saved for failures |
| `screenshot` | on | Always captured |

---

## 4. Reporters & Results

### Four Reporters

1. **List** — console output (pass/fail per test)
2. **HTML** — `playwright-report/` directory, view with `npx playwright show-report`
3. **JSON** — `test-results/results.json` (Playwright built-in)
4. **Custom JSON Logger** — `test-results/logs/test-run-{timestamp}.json`

### Custom JSON Logger Output

The logger at `e2e/reporters/json-logger.ts` writes per-run JSON files:

```json
{
  "timestamp": "2026-06-17T19:05:14.200Z",
  "status": "passed",
  "duration": 328074,
  "total": 128,
  "passed": 128,
  "failed": 0,
  "skipped": 0,
  "tests": [
    {
      "suite": "Admin Dashboard",
      "test": "create doctor",
      "status": "passed",
      "duration": 4700,
      "steps": [
        { "title": "Fill: doctor-username", "duration": 120, "status": "passed" },
        { "title": "Assert: temp-password visible", "duration": 50, "status": "passed" }
      ],
      "errors": [],
      "retries": 0
    }
  ]
}
```

These files are read by the Test Dashboard at `/dev/test` and the backend API at `GET /api/test/reports`.

### Failure Artifacts

On test failure, Playwright saves:
- Screenshots: `test-results/{project}/{test-name}/test-failed-*.png`
- Video: `test-results/{project}/{test-name}/video.webm`
- Trace: `test-results/{project}/{test-name}/trace.zip` (view with `npx playwright show-trace`)
- Error context: `test-results/{project}/{test-name}/error-context.md`

---

## 5. Caching & Skip Logic

Multiple layers of caching prevent redundant work across runs:

| What | Cache File | TTL | Skip Condition |
|------|-----------|-----|----------------|
| Auth tokens | `.auth/{role}.token` | 1 hour | Token file exists and is < 1 hour old |
| Baseline data | `.auth/baseline-data.json` | 30 min | File exists and is < 30 min old |
| Warmup | `.auth/warmup-done` | 10 min | File exists and is < 10 min old |
| Generated tests | `e2e/generated/{app}/{slug}.checksum` | ∞ | Checksum matches current spec content |

**Note:** Auth tokens are always re-fetched by `setupAuth()` — the 1-hour TTL only applies to the stale-token cleanup step. There is currently no caching in the actual token fetch.

---

## 6. Validation

`npx test-gen validate` checks specs without generating:

- Required fields present (route, auth, app, title, elements, flows)
- Element locators valid (known roles, proper options)
- Action/assertion types valid (known enums)
- Flow dependencies resolvable (no missing `after` refs, no cycles)
- JSX consistency: checks the actual component source for matching `data-testid` and `aria-label` attributes

---

## 7. Hand-Written Tests

Some tests are hand-written rather than generated:

| File | Project | Purpose |
|------|---------|---------|
| `e2e/capture-screenshots.spec.ts` | `screenshots` | Captures all pages at 3 viewports for UI critique |
| `e2e/cross-app-flows.spec.ts` | `cross-app` | Tests spanning multiple apps (e.g., doctor creates prescription → patient views it) |
| `e2e/specialty-formats.spec.ts` | `specialty-formats` | Tests for specialty-specific form formats |
| `e2e/capture-prescription-pdfs.spec.ts` | `prescription-pdfs` | Golden PDF captures for visual comparison |

These live in `e2e/` directly (not `e2e/generated/`) and are NOT overwritten by the generator.

---

## 8. Network & Console Fixtures

`e2e/fixtures/network.ts` extends the Playwright `test` object with:

- `networkLogs`: captures all HTTP requests/responses during the test
- `consoleLogs`: captures browser console messages and page errors

These are automatically attached to test results for debugging failures — you can see which API calls were made and whether any returned errors.

---

## 9. File Layout

```
SwasthyaSeva/
├── .env.test                          # test credentials + backend URL
├── .auth/                             # cached auth tokens + baseline data + warmup flag
│   ├── admin.token
│   ├── doctor.token
│   ├── clinic.token
│   ├── clinic_admin.token
│   ├── patient.token
│   ├── baseline-data.json
│   └── warmup-done
├── playwright.config.ts               # all project definitions + global config
├── e2e/
│   ├── auth.setup.ts                  # auth token setup
│   ├── data.setup.ts                  # data seeding + warmup
│   ├── capture-screenshots.spec.ts    # hand-written
│   ├── cross-app-flows.spec.ts        # hand-written
│   ├── specialty-formats.spec.ts      # hand-written
│   ├── capture-prescription-pdfs.spec.ts  # hand-written
│   ├── fixtures/
│   │   ├── auth.ts                    # token read/write/clear helpers
│   │   ├── config.ts                  # app URLs per environment
│   │   ├── network.ts                 # request/console capture fixture
│   │   └── test-data.ts               # appointment create/delete helpers
│   ├── reporters/
│   │   └── json-logger.ts             # custom JSON report writer
│   └── generated/                     # AUTO-GENERATED — do not edit
│       ├── admin/*.spec.ts
│       ├── doctor/*.spec.ts
│       ├── clinic/*.spec.ts
│       └── web/*.spec.ts
├── packages/test-gen/
│   └── src/
│       ├── index.ts                   # types + exports
│       ├── scanner.ts                 # finds __test exports in source files
│       ├── resolver.ts                # topological sort + tree flattening
│       ├── generator.ts               # orchestrates scan → validate → generate
│       ├── templates.ts               # Playwright code generation
│       ├── validator.ts               # spec correctness checks
│       ├── analyzer.ts                # coverage statistics
│       └── jsx-validator.ts           # checks spec ↔ JSX consistency
├── test-results/
│   ├── _setup/                        # setup project artifacts
│   ├── _data-setup/                   # data-setup project artifacts
│   ├── admin/                         # admin project artifacts
│   ├── doctor/                        # doctor project artifacts
│   ├── clinic/                        # clinic project artifacts
│   ├── web/                           # web project artifacts
│   ├── logs/
│   │   └── test-run-{timestamp}.json  # custom JSON reports
│   └── results.json                   # Playwright built-in JSON report
└── playwright-report/                 # HTML report
```

---

## 10. Common Commands

```bash
# Generate tests from specs
npm run test:generate

# Run full local suite
npm run test:e2e

# Run one server's tests
npx playwright test --project=local-admin

# Run setup only (auth + data)
npx playwright test --project=setup
npx playwright test --project=data-setup

# Validate specs without generating
npm run lint:specs

# View HTML report
npm run test:e2e:report

# View test coverage stats
npm run test:analyze

# Show trace for a failed test
npx playwright show-trace test-results/admin/test-name/trace.zip
```
