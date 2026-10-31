# E2E Test Selector Linting Plan

## Goal
Ban CSS selectors from test specs. Every element must use `data-testid`, `role`, or `text` — never CSS classes.

## Lint Rule: `no-css-selectors-in-test-specs`

### What it checks
Every element in `testSpec()` or `componentTestSpec()` must use one of:
1. `{ testId: '...' }` — preferred for interactive elements
2. `{ role: '...', name: '...' }` — for standard HTML roles (button, heading, textbox, combobox, switch)
3. `{ text: '...' }` — for visible text assertions

### What it bans
`{ css: '...' }` — any CSS selector. No exceptions.

### Implementation
Add validation to the test-gen's `validate` command in `packages/test-gen/src/generator.ts`:

```js
for (const [name, locator] of Object.entries(spec.elements)) {
  if ('css' in locator) {
    errors.push(`Element "${name}" uses css selector "${locator.css}" — use testId, role, or text instead`);
  }
}
```

This runs in CI via `npm run test:generate validate` and blocks PRs with CSS selectors.

### Current violations (~100+)
These need `data-testid` attributes added to the actual components:

#### Admin app
- `headerTitle` — `.text-primary` → add testid to header
- `doctorSearchBar` — `[placeholder="..."]` → add testid to search input
- `doctorEditButton` — `button:has-text("Edit") >> nth=0` → add testid to DataTable Edit buttons
- `doctorVerifiedToggle` — `button[role="switch"] >> nth=0` → add testid to ToggleSwitch per-row
- `doctorTempPassword` — `.font-mono` → add testid to CopyablePassword component
- `successToast` — `.text-success.text-sm.font-medium` → add testid to Toast component
- `refreshButton` — `[title="Refresh"]` → add testid
- `auditSearchBar`, `clinicSearchBar`, `managerSearchBar`, `slotSearchBar` — all placeholder-based → add testids
- `table`, `tableRows` — `css: 'table'`, `css: 'tbody tr'` → use existing table testids
- `passwordError` — `.text-red-500` → add testid
- `passwordSuccess` — `.text-green-600` → add testid
- `sessionBar` — `.fixed.top-0...` → add testid
- `gmapsLinkInput` — `[placeholder="..."]` → add testid to LocationPicker input
- `mapIframe` — `css: 'iframe'` → add testid to map container

#### Doctor app
- `searchInput` — `input[placeholder="..."]` → add testid
- `refreshButton` — `button[title="Refresh"]` → add testid
- `dateGroupHeader` — `button.bg-muted\\/50` → add testid
- `statusBadge` — `.mt-2.space-y-3 .rounded-full` → add testid
- `patientName` (consultation) — `.text-lg.font-semibold` → already has `patient-name-loaded` testid
- All consultation form inputs (height, weight, BMI, etc.) — `div:has(> label:has-text("...")) input` → add testids
- Symptom/chronic/allergy search inputs — `input[placeholder="..."]` → add testids
- Medication inputs — `input[placeholder="e.g., 500mg"]` → add testids
- Various component specs (Calendar, Timeline, Queue) — many CSS selectors → add testids

#### Clinic app
- Similar patterns: search inputs, refresh buttons, table rows, status badges

#### Web app  
- Minimal CSS usage — mostly role/text based already

### Migration strategy
1. Add the lint rule as a **warning** first (doesn't block CI)
2. Fix violations app by app: Admin → Doctor → Clinic → Web
3. For each violation: add `data-testid` to the component JSX, update the spec element to use `{ testId: '...' }`
4. Once all violations are fixed, promote the warning to an **error** (blocks CI)

### Naming convention
`{component-prefix}-{element}` examples:
- `appt-search-input`, `appt-refresh-btn`
- `doctor-edit-btn`, `doctor-verified-toggle`
- `toast-success`, `toast-error`
- `confirm-action-btn` (already done)
- `gmaps-link-input`, `gmaps-map-container`
- `password-error-msg`, `password-success-msg`

### Timeline
- Phase 1: Add lint rule as warning + fix admin (highest CSS count)
- Phase 2: Fix doctor component specs
- Phase 3: Fix clinic + web
- Phase 4: Promote to error, block CI
