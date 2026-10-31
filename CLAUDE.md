# CLAUDE.md

## Production URLs
- **Web**: https://swasthyaseva.online
- **Clinic**: https://clinic.swasthyaseva.online
- **Doctor**: https://doctor.swasthyaseva.online
- **Admin**: https://admin.swasthyaseva.online

## Engineering Discipline

### Investigate, Never Guess
When something is broken:
1. **Read the evidence first.** Logs, network requests, error output — before forming any theory.
2. **If evidence is insufficient, add logging.** Instrument the relevant code path, then recreate the bug and read the new output.
3. **If still unclear, refine the logging.** Update it to cover the gaps, recreate again. Repeat until the root cause is visible in the data.
4. **Compare expected vs actual.** What does the server send? What does the client receive? Where's the gap?
5. **Only then form a theory** grounded in what you observed.
6. **Verify the fix** using the same evidence that revealed the problem.

Never apply speculative fixes (bumping timeouts, adding flags, switching tools) hoping they work. If you don't know why something is broken, you can't know if your change fixed it.

### Before Dismissing Anything
- When the user points something out, investigate it. Don't explain it away.
- A thing you think is "harmless" might be the root cause. Check before concluding.
- If you're about to say "that's fine" or "that's expected" — verify first.

### Accountability
- Every fix must be verified, not assumed to work.
- If something fails after your fix, the diagnosis was wrong — go back to step 1, don't stack another guess on top.

### Asking Questions
- Always use the AskUserQuestion tool — never ask questions inline in chat text.
- Provide concrete options (2-4), not open-ended questions.
- For each option, include: a clear label, a description with pros/cons, and tradeoffs.
- Put your recommended option first and mark it with "(Recommended)".
- If you're genuinely blocked and need a decision, ask. Otherwise, make the reasonable call and keep going.

## Shell
- The working directory is already `SwasthyaSeva`. Do not prefix commands with `cd c:/Users/enthu/SwasthyaSeva &&`. Just run commands directly.

## Git Branching
- Never commit directly to `main` unless the user explicitly asks to.
- At the start of work, check the current branch. Continue on that branch, or create a new one if on `main`.
- Branch naming: `fix/short-desc`, `feat/short-desc`, `chore/short-desc`.

## Git Commits
- Never add Co-Authored-By lines to commit messages.
- Always check file contents (git diff or read) BEFORE running git add + git commit. Verify only the intended change is included. Never batch multiple changes into one commit.
- Always run `git add` and `git commit` as separate commands. Never chain them with `&&`.

## CI/CD
- Push to the branch before creating a PR. Don't accumulate dozens of local commits.
- If CI fails, fix it immediately before continuing other work.
- **Before pushing**, you MUST run ALL of these locally. No exceptions. Do not push or create a PR until every step passes:
  1. Backend tests: `cd backend && npm test`
  2. Swagger generation + lint: `cd backend && npm run swagger && npx spectral lint swagger.json --ruleset .spectral.yaml`
  3. Swagger route coverage: `cd backend && node scripts/check-swagger-coverage.js`
  4. Contract tests: `cd backend && node scripts/contract-test.js`
  5. Frontend build: `npx turbo run build`
  6. Validate E2E specs: `node packages/test-gen/dist/generator.js validate`
  7. Generate E2E tests: `node packages/test-gen/dist/generator.js generate`
  These are the exact steps CI runs. If any fail locally, don't push.
- **After creating a PR**, verify CI with `gh run list --limit 3`. If it fails, check with `gh run view <id> --log-failed` and fix immediately.

## Dev Servers
- Start: `.\swasthyaseva start` (run in PowerShell, not bash)
- Stop: `.\swasthyaseva stop` (run in PowerShell, not bash)
- Health check: `.\swasthyaseva health` — pings all 6 servers, shows status + latency
- NEVER use `cmd.exe`, `Start-Process`, `&` backgrounding, or bash to run swasthyaseva.bat. Always use PowerShell directly.
- `.\swasthyaseva start` blocks the terminal (streams logs). Run it with `run_in_background: true` in the PowerShell tool.
- `.\swasthyaseva stop` kills all servers by port and exits immediately.
- Before running E2E tests, always run `.\swasthyaseva health` to confirm all servers are live.

| Server  | Port | Central Log                      | Local Log                |
|---------|------|----------------------------------|--------------------------|
| Backend | 5000 | `output/logs/backend.output.log` | `backend/server.log`     |
| Web     | 3000 | `output/logs/web.output.log`     | `apps/web/frontend.log`  |
| Admin   | 3001 | `output/logs/admin.output.log`   | `apps/admin/frontend.log`|
| Doctor  | 3002 | `output/logs/doctor.output.log`  | `apps/doctor/frontend.log`|
| Clinic  | 3003 | `output/logs/clinic.output.log`  | `apps/clinic/frontend.log`|
| Flows   | 4001 | `output/logs/flows.output.log`   | `flows/server.log`       |

OTPs and backend debug output appear in `backend/server.log`.

## Test Credentials
Test login credentials for all apps are in `test-credentials.local.md` (gitignored).

## Chrome DevTools MCP
- When using the Chrome DevTools MCP, close unused tabs. Keep a maximum of 6 tabs open at once. If more, close some before opening new ones.
- If pages serve stale content after code changes, check for stale service workers: run `navigator.serviceWorker.getRegistrations()` in the console and unregister any found. The apps don't use service workers — any registration is leftover from dependencies.

## Observability
- Axiom logging and the admin Server Logs / User Journey tabs were removed. Nothing sends request, response, or browser event data to a third party.
- Backend request logs go to stdout only. Use the hosting provider's log viewer.

## Research
- When research is needed (looking up documentation, APIs, libraries, etc.), use the WebFetch MCP tools (`smart_fetch`, `search_web`, `extract_content`, etc.) to browse the web and extract information.

## Planning
- When planning, always output the plan to a markdown file (not inline in chat).
- Always ask questions to remove ambiguity before starting implementation.
- When implementation is asked to be planned, always plan commits (as many as possible), acceptance criteria, and tests (if applicable).

## Session Context
- After a PR is done, save a session summary as a timestamped markdown file in `docs/sessions/` (e.g., `2026-06-17-form-validation-fields-qa.md`).
- Include: what was done, branch, test results, remaining work, and key decisions.
- This is the source of truth for continuing work across conversations.

## Testing

### E2E Testing Standards
- **Read `docs/e2e-testing-standards.md` before writing or fixing any E2E test.** It defines account naming, phone ranges, data lifecycle, locator conventions, and backend guards.
- Key rules: never hardcode entity IDs (use `resolveEntities: true`), never use `+919` phones in tests, all test entities use `e2e_` prefix, OTP inputs use `reactFill` with `testId: 'booking-otp'`.

### E2E Test Generation
- Frontend test spec format: `docs/test-spec-format.md`
- Backend API annotation format: `docs/api-annotation-format.md`
- Generate tests: `npm run test:generate`
- Run E2E: `npm run test:e2e`
- View report: `npm run test:e2e:report`

### E2E Test Run Rules
- **Never pipe test commands through `tail`, `grep`, `head`, or any filter.** Run them raw so all output is captured. Piping swallows errors and makes runs appear stuck.
- **Run `--project=setup` first**, then run the 4 core projects together:
  ```
  npx playwright test --project=setup
  npx playwright test --project=local-admin --project=local-doctor --project=local-clinic --project=local-web
  ```
  Never run bare `npx playwright test` — it includes cross-app, prescription-pdf, and screenshot projects that are not part of the standard suite.
- **Read results from JSON reports**, not stdout. After each run, check `test-results/logs/test-run-*.json` for structured pass/fail/error data. Use `ls test-results/logs/ | tail -1` to find the latest report.

### E2E Test Iteration Process
Follow this loop every time you work on tests:
1. **Run tests** for one server at a time (e.g., `npx playwright test --project=local-doctor`).
2. **Read ALL logs** — `test-results/*/error-context.md`, `test-results/*/test-failed-*.png`, `backend/server.log`, and the frontend logs (`apps/*/frontend.log`).
3. **List out** every warning, error, and failure. Categorize them (locator issues, timing, API errors, pointer intercept, etc.).
4. **Investigate** root causes before fixing. Check the actual component code, DOM structure, and API responses.
5. **Fix all identified issues** in one batch, then regenerate tests (`npm run test:generate`), rebuild test-gen if templates changed (`cd packages/test-gen && npx tsc`).
6. **Re-run and repeat** until 100% pass with 0 retries.

**NEVER re-run tests just to check results.** Read existing `test-results/` first. Only re-run AFTER making code changes.

### E2E Test Quality Standards
- **Every test must be self-contained.** Tests create their own data via `seedApi` or `data.setup.ts` and clean up after. No manual seeding scripts required.
- **Tests must simulate real end-user behavior.** No shortcuts, no skipping steps, no testing internal state. Click what users click, fill what users fill, verify what users see.
- **No hardcoded test data.** Use dynamic expressions (`new Date()`, API lookups) for dates, IDs, etc.
- **No cheap tactics.** Don't use `force: true` clicks, don't skip OTP verification, don't stub out APIs. If something is hard to test, fix the test infrastructure — don't weaken the test.
- **For external services (SMS/OTP):** Use fixed values in `DEV_MODE` only at the *generation* layer (e.g., `generateOTP()` returns `'123456'`). Never modify the verification logic. The app must behave identically to production except for the external call being skipped.
- **No retries.** Tests must pass reliably on the first attempt. If a test is flaky, fix the root cause (timing, locator, layout) — don't mask it with retries.
- **Check backend logs.** After every test run, check `backend/server.log` for warnings, errors, pool issues, and unexpected 500s. These indicate real bugs.

### Backend API Docs
- Generate swagger: `cd backend && npm run swagger`
- View docs: `http://localhost:5000/api/docs`

## Significant Changes Require Approval

Any unplanned or unapproved change that goes beyond trivial bug fixes requires explicit user approval before implementation:

1. **Ask before acting.** Use the AskUserQuestion tool with concrete options, pros/cons for each, and a recommendation. This applies to:
   - Validation rule changes (frontend or backend)
   - Schema changes (adding/removing/modifying fields)
   - API contract changes (request/response format)
   - New dependencies or architectural patterns
   - UI behavior changes (error display, form flow, navigation)
   - Test infrastructure changes (new endpoints, data setup, cleanup logic)
   - Any change that affects user-facing behavior
2. **Document rationale** in `docs/decisions/` — one file per decision with: the problem, options considered, chosen approach, and why. Name files descriptively (e.g., `password-min-length-12-vs-6.md`).
3. **Create GitHub issues** for each identified problem before fixing. Reference the issue number in the commit message.
4. **E2E tests must cover both positive AND negative cases** for every form field. For each valid-data test, add a sibling invalid-data test that verifies the error message.
5. **Negative tests must be strategically targeted** to catch frontend-backend mismatches: boundary values (max length, min length), pattern edge cases, type coercion differences, normalization gaps.
6. **Audit files** live in `docs/validation-audit/`:
   - `field-validator-mismatches.md` — frontend vs backend field rule differences
   - `endpoint-validation-gaps.md` — per-endpoint validation coverage
   - `error-display-gaps.md` — per-form error UX status

## UI Critique Loop

Iterative UI improvement cycle using the UI Critique MCP tool and Playwright.

### Tools
- **Playwright script**: `e2e/capture-screenshots.spec.ts` — captures all pages at 3 viewports (desktop 1024x900, tablet 768x1024, phone 390x844). Screenshots go to `docs/screenshots/<version>/<app>/<page>/`. Bump the `VERSION` constant in the script for each iteration.
- **UI Critique MCP**: Use `mcp__ui-critique__critique_page` for folder-based critique (all viewports together). Use `mcp__ui-critique__critique_ui` for individual screenshots when needed. Always use `prompt_mode: "replace"` with the custom prompt from `docs/ui-critique-prompt.md`. Model: always `gemini-2.5-flash-lite`.
- **Custom prompt**: `docs/ui-critique-prompt.md` contains the full system prompt. It keeps the design knowledge base (cognitive laws, Nielsen's heuristics, typography, spatial systems, etc.) but prioritizes actionable suggestions over scores.

### Critique Call Pattern
```
# Primary: all viewports at once
mcp__ui-critique__critique_page(
  folder_path: "c:/Users/enthu/SwasthyaSeva/docs/screenshots/<version>/<app>/<page>",
  page_context: "<app name> — <page name>",
  custom_prompt: <contents of docs/ui-critique-prompt.md code block>,
  prompt_mode: "replace",
  model: "gemini-2.5-flash-lite"
)

# For single screenshots (modals, specific states)
mcp__ui-critique__critique_ui(
  image_path: "<absolute path to screenshot>",
  page_context: "<app name> — <page name> — <viewport>",
  custom_prompt: <contents of docs/ui-critique-prompt.md code block>,
  prompt_mode: "replace",
  model: "gemini-2.5-flash-lite"
)
```

### The Loop
1. **Capture**: Run `npx playwright test --project=screenshots` to screenshot all pages at all viewports.
2. **Critique**: For each page folder, call `critique_page` with the custom prompt. One call per page.
3. **Compile**: Read ALL critique results. Find **recurring patterns and common themes** across pages — not individual pixel nitpicks. Group by theme (e.g., "text too small on phone across 8 pages", "inconsistent card spacing in all dashboard tabs", "empty states are bland everywhere").
4. **Present to user**: Show the top recurring themes with examples. Do NOT implement anything yet.
5. **Calibrate**: User decides which themes to act on, which to ignore, which to prioritize. This is a conversation, not a checklist.
6. **Fix**: Implement only the calibrated fixes. One commit per logical fix.
7. **Re-capture**: Bump `VERSION`, re-run screenshots.
8. **Re-critique**: Verify fixes, find remaining issues. Present new themes.
9. **Repeat** until acceptable.

**Key principle**: Gemini sees pixels, not code. Its job is to find better designs, layouts, and UX patterns from a purely visual perspective. It does NOT evaluate hover/focus/active states. After each critique round, compile themes and discuss with the user before touching any code.

### critique_page (primary — all viewports at once)
For each app, iterate through its page folders in `docs/screenshots/<version>/<app>/`:
```
docs/screenshots/v8/doctor/login/        → critique_page(folder_path, "doctor — login")
docs/screenshots/v8/doctor/dashboard/    → critique_page(folder_path, "doctor — dashboard")
docs/screenshots/v8/admin/modal-add-doctor/ → critique_page(folder_path, "admin — add doctor modal")
...
```
Each folder contains `<name>-desktop.png`, `<name>-tablet.png`, `<name>-phone.png` (plus fold screenshots if scrollable). The MCP groups them by filename keywords automatically.

Parallelize critique calls where possible (multiple agents, one per page). Compile all results into one report per app, then a combined report.

### critique_ui (secondary — single screenshot deep-dive)
Use when you need a deeper look at a specific viewport or state:
- A modal that only has one screenshot (no 3-viewport folder)
- Re-checking a single viewport after a fix
- Investigating a specific issue flagged by critique_page
```
critique_ui(image_path, "doctor — consultation — phone", custom_prompt, prompt_mode="replace", model="gemini-2.5-flash-lite")
```

### Screenshot Robustness
- Always restart dev servers before capturing (`.\start stop` then `.\start`).
- Run E2E auth setup first (`npx playwright test --project=setup`) so auth tokens exist.
- If a page shows empty/loading state, check backend logs — the data may not exist.
- For pages with dynamic routes (consultation, prescription), the script resolves real IDs via API.
- Folds: the script auto-captures scrollable content in multiple fold screenshots.

### Version Rules
- **NEVER delete previous versions.** Each capture creates a new version directory (v1, v2, v3...).
- Previous versions serve as visual history for comparison.
- Increment `VERSION` in `e2e/capture-screenshots.spec.ts` before each new capture.
- `docs/screenshots/` is gitignored (large binaries).
