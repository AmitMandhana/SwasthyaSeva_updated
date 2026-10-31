# Parallel E2E Tests

## Problem

Running 4 test projects sequentially takes ~25 minutes. Each project re-runs auth setup (writing the same token files), preventing parallel execution. We want all 4 to run simultaneously.

## Current State

- Auth setup runs per-project, writing to `.auth/*.token` files
- Data setup (cleanup + seed) runs per-project
- `workers: 1` in Playwright config forces sequential execution
- Total sequential time: ~5.5m (admin) + ~5m (doctor) + ~14m (clinic) + ~5.5m (web) = ~30m

## Data Overlap Analysis

| Entity | Admin | Doctor | Clinic | Web |
|--------|-------|--------|--------|-----|
| Doctors | CRUD | R | - | R |
| Clinics | CRUD | - | R | R |
| Clinic Admins | CRUD | - | CRUD | - |
| Slots | CRUD | R | CRUD | R |
| Leads | - | - | CRU | - |
| Softboard | CRUD | - | - | - |
| Appointments | - | R | R | R |
| Prescriptions | - | CRU | R | R |
| Passwords | U | U | U | U |

### Conflicts

1. **Admin vs Clinic — Slots**: Both create/modify slots. Admin uses `e2eclinic`/`e2edoctor`, clinic uses `CityHealth`/`DrRahul`. Different entities, **no conflict**.
2. **Admin vs Clinic — Clinic Admins**: Admin creates managers (different table). Clinic creates clinic_admins. Both use `e2e%` prefix but different usernames. **No conflict**.
3. **Admin vs Doctor/Clinic/Web — Entity toggles**: Admin toggles verified/active on `e2edoctor`/`e2eclinic` — entities that doctor/clinic/web tests DON'T reference. Doctor tests use `DrRahul`, clinic uses `CityHealth`. **No conflict**.
4. **Passwords**: Each app changes its OWN user's password (admin changes admin password, doctor changes doctor password, etc.). **No conflict** — different users.
5. **Appointments/Prescriptions**: Doctor creates prescriptions for seeded appointments. Clinic/web only read. **No conflict** — doctor writes, others read different data or tolerate changes.

### Verdict: **All 4 can run in parallel safely**

The test data is already isolated by convention — admin creates `e2e%` entities, other apps use seeded baseline entities (`DrRahul`, `CityHealth`, `cityadmin1`, patient `37`). No project mutates another project's data.

## Plan

### Step 1: Shared auth + data setup

Change Playwright config so `setup` and `data-setup` run once before any test project starts. Currently they already do this via `dependencies`, but we need to ensure they don't re-run.

**Config change:**
```ts
projects: [
  { name: 'setup', testDir: './e2e', testMatch: 'auth.setup.ts' },
  { name: 'data-setup', testDir: './e2e', testMatch: 'data.setup.ts', dependencies: ['setup'] },
  
  // All 4 depend on the SAME setup + data-setup
  { name: 'local-admin', ..., dependencies: ['data-setup'] },
  { name: 'local-doctor', ..., dependencies: ['data-setup'] },
  { name: 'local-clinic', ..., dependencies: ['data-setup'] },
  { name: 'local-web', ..., dependencies: ['data-setup'] },
]
```

### Step 2: Increase workers

Change `workers: 1` to `workers: 4` (or `workers: '50%'` for CI). This lets Playwright run the 4 projects in parallel after setup completes.

**Risk:** More memory/CPU usage. 4 Chrome instances + 4 dev servers = heavy load.

### Step 3: Test isolation audit

Verify no test creates data that collides with another project:
- Admin: `e2edoctor`, `e2eclinic`, `e2emanager`, `e2eclinic2`, `e2edoctor2` — unique to admin
- Clinic: `e2ecadmin_*` clinic admins, leads with test phones — unique to clinic
- Doctor: writes to consultation for seeded appointment — unique to doctor
- Web: read-only + password validation — no writes that conflict

### Step 4: Warmup optimization

Current warmup visits ALL 10 pages across all servers. Each project only needs its own server warmed up. Split warmup per-project or make it smarter.

**Option A:** Remove warmup entirely — let tests handle cold compilation (adds ~10s to first test per server).
**Option B:** Per-project warmup in each project's first test file.

### Expected Result

- Setup + data: ~5s (runs once)
- All 4 projects in parallel: ~14m (limited by slowest = clinic)
- **Total: ~14m instead of ~30m — 2x speedup**

## Decisions Needed

1. Workers count: `4` (one per project) or percentage-based?
2. Warmup: remove entirely or split per-project?
3. Should we keep `workers: 1` within each project (tests in a single project run sequentially) or also parallelize within projects?
