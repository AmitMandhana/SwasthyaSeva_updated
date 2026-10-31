# E2E Testing Lessons Learned

Hard lessons from the automated testing implementation (May 2026).

## 0. Always Use data-testid — Never CSS Selectors

**Rule:** `data-testid` > `role` + `name` > `text` > **NEVER CSS classes.**

Every interactive element in tests MUST use `data-testid`. Never use CSS class selectors like `.flex.gap-3 button >> nth=0` or `[role="dialog"] button:has-text("Delete")`. These break on any UI change.

**What we did wrong:** Used `[role="dialog"] .flex.gap-3 button >> nth=0` to target confirm buttons. This is fragile — any layout change breaks it.

**What we should have done:** Added `data-testid="confirm-action-btn"` to the ConfirmModal component and used `{ testId: 'confirm-action-btn' }` in specs.

**Convention:** `{component}-{element}` naming (e.g., `appt-table`, `confirm-action-btn`, `patient-name-loaded`, `doctor-username-input`).

## 1. Test Execution Order Matters

**Problem:** The test-gen resolver used topological sort (Kahn's algorithm) on `after` dependencies to determine test order. Flows without direct dependencies were emitted in arbitrary order. This caused destructive operations (toggle/delete) to run before create operations that other tests depended on.

**Example:** "make doctor private" (soft-deletes first row) ran before "create clinic manager" (needs that doctor alive).

**Fix:** Preserve the spec author's array order. The `after` field controls which parent steps re-execute, not the position in the test file. The spec author must order flows by data dependency:
1. Views (read-only)
2. Creates (produce data)
3. Edits (non-destructive modifications)
4. Toggles/deletes (destructive, runs last)

**Rule:** Always verify the generated test file's order matches your intent. Don't trust the generator blindly.

## 2. Test Data Isolation

**Problem:** Tests used `nth=0` selectors to target the first table row for edit/toggle/delete operations. This hit real production data (real doctors, real clinics) instead of test-created entities.

**Consequences:**
- A real doctor's name changed from "Rahul" to "Updated"
- Real clinics got soft-deleted
- Other test suites (web app) failed because shared data was polluted

**Rule:** Tests must ONLY touch entities they create (e2e* prefix). Never modify real data. Specifically:
- Create flows: use `e2e*` prefix usernames
- Edit flows: target the `e2e*` entity by searching/filtering first, not by row index
- Toggle flows: target the `e2e*` entity, not `nth=0`
- Delete flows: only delete `e2e*` entities

## 3. Build a Test Dependency Graph Before Writing Specs

**Problem:** I wrote test flows without mapping which flows produce data, which consume it, and which destroy it. The `after` field only captures navigation dependencies ("I need to be on the Doctors tab"), not data dependencies ("I need e2eclinic to exist").

**What should have been done first:**
```
create doctor     → PRODUCES: e2edoctor
create clinic     → PRODUCES: e2eclinic  
create manager    → CONSUMES: e2eclinic (must exist, not deleted)
create slot       → CONSUMES: e2edoctor + e2eclinic (must exist, not deleted)
make doctor private → DESTROYS: first doctor row (soft-delete)
toggle clinic     → DESTROYS: first clinic row (soft-delete)
```

Draw the graph. Order by: produces → consumes → destroys. This takes 5 minutes and prevents hours of debugging.

## 4. Don't Guess — Investigate With Evidence

**Problem:** When a test failed, I assumed the cause (React timing, hydration, event handling) and tried fixes without verifying the actual failure.

**What to do instead:**
1. Read the **screenshot** — what does the user see?
2. Read the **error-context.md** — what step failed and why?
3. Check **backend/server.log** — did the API call happen? What was the response?
4. Check the **generated test code** — does it match your spec changes?
5. Use **Chrome DevTools MCP** to reproduce the interaction manually
6. Only THEN form a hypothesis and fix

**Example:** "Modal stays open after Create click" had three different root causes across different runs:
- Backend schema validation returning 400 (check server.log)
- Missing form fields (check screenshot for error messages)
- Data already exists from previous run (check DB)

Each was discoverable in 30 seconds from logs/screenshots. Instead I spent hours guessing about React event handling.

## 5. Turbopack Stale Code

**Problem:** Turbopack's dev server can serve stale compiled JavaScript. `data-testid` attributes existed in source files but weren't rendered in the browser.

**Root causes identified:**
- `data-testid` attributes are NOT in SSR HTML — they only appear after React hydration on the client
- Browser can cache SSR responses even with `Cache-Control: no-store` (the header only applies to subsequent navigations, not the initial page load)
- `.next/cache` cleanup isn't enough — the full `.next` dir may contain stale compiled output

**Mitigation:**
- `next.config.ts` has `Cache-Control: no-store, must-revalidate` for dev mode
- Start script cleans `.next` dirs on startup
- For critical interactions, wait for a `data-testid` element (proves hydration complete)

**For the doctor consultation page specifically:** Wait for `patient-name-loaded` testId which only renders after BOTH hydration AND API data loading complete. This prevents the race condition where clicks fire during API-response re-renders.

## 6. Always Verify Generated Output

**Problem:** Changed template code, changed spec files, but the generated test files didn't update because:
- Forgot to run `npx tsc` to rebuild the test-gen package
- Checksums matched (spec didn't change, only template did)
- Windows glob `**/*.checksum` doesn't work — use `find` instead
- `.next` served cached old code despite source changes

**Rule:** After ANY template or spec change:
```bash
cd packages/test-gen && npx tsc          # rebuild
find e2e/generated -name "*.checksum" -delete  # clear checksums
npm run test:generate                     # regenerate
grep "your_change" e2e/generated/...      # VERIFY the output
```

## 7. Scope Infrastructure Changes Carefully

**Problem:** Added a 30-second hydration wait to ALL tests via the template. This was only needed for doctor consultation (which has an API data loading race condition). Clinic and web tests don't need it — and it caused 20+ minute test runs (30s timeout × 60 tests).

**Rule:** Don't apply global fixes for local problems. The doctor consultation has a unique issue (API data arrives 1-3s after page load, causing a re-render that drops click events). Other pages don't have this. The fix belongs in the doctor spec, not the template.

## 8. React 19 Controlled Input Fills

**Problem:** Playwright's `fill()` doesn't reliably trigger React 19's `onChange` on controlled inputs. The value appears in the DOM but React's internal state doesn't update.

**Solution:** `reactFill` action that uses the native value setter + `_valueTracker` reset:
```javascript
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
setter.call(el, value);
const tracker = el._valueTracker;
if (tracker) tracker.setValue('');  // Reset React's change detection
el.dispatchEvent(new Event('input', { bubbles: true }));
el.dispatchEvent(new Event('change', { bubbles: true }));
```

**When to use:** Any input that has a debounced search/lookup (clinic username lookup, symptom search, etc.). Regular `fill()` works for simple form inputs.

## 9. Backend Schema vs Frontend Validation

**Problem:** Made form fields optional in the frontend validator but the backend schema still required them. The frontend allowed submission, but the backend returned 400.

**Rule:** When making a field optional, check BOTH:
1. Frontend validator (`apps/admin/lib/validators.ts`)
2. Backend schema (`backend/validators/schemas/createClinicSchema.js`)
3. Database column constraints (`NOT NULL` in DBSetup.sql)
4. Controller defaults (if field is optional, add a default in the controller)

## 10. Run Tests in Background

Tests take 5-7 minutes per app. Running them in the foreground blocks communication with the user. Always use `run_in_background: true` and report results when the notification arrives.

## 11. Warmup Reliability

**Problem:** The warmup step loads all pages to trigger Turbopack compilation. If servers aren't ready, it fails and blocks the entire test run (55 tests "did not run").

**Current state:** Warmup has a 120s timeout but no retry. If one page fails (ERR_CONNECTION_REFUSED), the whole warmup fails.

**Needed:** Health check before warmup starts, or retry logic per page.

## 12. Test All Viewports

Currently tests only run on Desktop Chrome (1280×720). Must add tablet (768×1024) and phone (390×844) viewports. Mobile has different layouts (card views, hamburger menus, touch targets) that desktop tests don't cover. Add as separate Playwright projects so they run in parallel.

**TODO:** Add `local-*-tablet` and `local-*-phone` projects to `playwright.config.ts` using `devices['iPad Mini']` and `devices['iPhone 13']`.

## 13. Component Specs Share the Same File

Component-level specs (SlotTab, ClinicManagerTab, etc.) generate tests in the SAME `dashboard.spec.ts` file as the page-level spec. They have their OWN flow arrays with their own ordering. Fixing the page-level ordering doesn't fix the component-level ordering. Each component spec needs the same create-before-delete discipline.
