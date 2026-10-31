# Flow Regeneration Prompt

Paste this to Claude to regenerate all flow data by reading the codebase:

---

Read the entire SwasthyaSeva codebase — all 4 apps (web, clinic, admin, doctor), the backend (routes, controllers, middleware, queries, utils), and shared packages (ui, theme).

For each app, trace every user-facing flow from entry to completion through all actors:
- **User** (patient, doctor, clinic admin, platform admin)
- **Frontend** (React component logic, state changes, navigation)
- **Backend** (Express handlers, middleware, validation)
- **Database** (SQL queries, Supabase calls, transactions)
- **External** (SMS, Cloudinary, Google Maps, Turnstile)

Output as JS files in `flows/data/` following the existing schema (see any existing file for reference). Each flow needs:
- **Nodes** with: id, type (start/end/action/decision/input/page/modal/api_call/api_response/db_query/db_result/external_call/external_response/internal/error), actor, label, detail (description, file, handler, dataShape, code, errorCases), devOnly flag
- **Edges** with: from, to, type (user_action/api_request/api_response/db_query/db_result/external_call/external_response/internal/navigation/error), label, detail, devOnly flag

Mark internal backend logic (hashing, encryption, JWT, DB queries) as `devOnly: true` so they can be hidden in tester mode.

Include error branches as `type: "error"` edges branching to error nodes.

Include cross-app flows for journeys that span multiple apps (e.g., patient on web → clinic admin books via portal).

Add `sharedId` to nodes that represent the same conceptual step across flows — these merge into single hub nodes on the unified canvas. Use format `app:identifier` (e.g., `sharedId: "clinic:dashboard"`). Common shared nodes: login pages, dashboards, page hubs that lead to multiple sub-flows.

Verify the flow data matches the actual code — check file paths, function names, API endpoints, and data shapes against the real codebase.
