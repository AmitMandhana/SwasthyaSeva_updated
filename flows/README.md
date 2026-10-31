# SwasthyaSeva Flow Viewer

Unified canvas showing all system flows with shared nodes merged across flows. Figma-style zoomable/pannable interface.

## Quick Start

```bash
cd flows
npm install
node server.js
# Open http://localhost:4001
```

Or use `start.bat` from repo root — flows server starts automatically as the 6th process.

## View Modes

| Mode | Shows | Flows |
|------|-------|-------|
| ALL | Every flow from every app, connected across apps | 41 |
| Patient | Web app patient-facing flows | 9 |
| Doctor | Doctor portal consultation flows | 7 |
| Clinic Admin | Clinic portal admin + booking flows | 17 |
| Admin | Platform admin CRUD flows | 7 |

## Shared Nodes

Flows that share a conceptual step (e.g., "Sees dashboard") are merged into a single hub node on the canvas. Hub nodes show a badge with the number of connected flows.

Add `sharedId` to a node to merge it with other nodes sharing the same ID:
```js
{ id: "n1", type: "start", actor: "user", label: "Opens tab", sharedId: "clinic:dashboard" }
```

## Architecture

```
flows/
  server.js          Express server (port 4001)
  data/
    web.js           Web app flows (patient-facing)
    clinic.js        Clinic portal flows
    admin.js         Admin panel flows
    doctor.js        Doctor portal flows
    cross-app.js     Cross-app journeys
  public/
    index.html       Viewer shell + CDN deps
    renderer.js      React Flow + Dagre unified canvas renderer
    styles.css       Dark theme styles
```

## API

- `GET /api/flows` — All apps combined
- `GET /api/flows/:app` — Single app (web, clinic, admin, doctor, cross-app)

Data files are hot-reloaded on each request (cache busted).

## Adding Flows

Edit any `data/*.js` file. Each flow has:
- **nodes**: Steps in the flow (14 types: start, end, action, decision, input, page, modal, api_call, api_response, db_query, db_result, external_call, external_response, internal, error)
- **edges**: Connections between nodes (10 types: user_action, api_request, api_response, db_query, db_result, external_call, external_response, internal, navigation, error)
- **actors**: Swim lane columns (user, frontend, backend, database, external)

Set `devOnly: true` on nodes/edges that should only appear in Dev Mode.
Set `sharedId: "app:identifier"` on nodes that should merge with other flows.

## Sidebar

- Click a flow name to pan the viewport to that flow's area
- Highlighted flow dims all other nodes for focus
- Search box filters flows by name
- In ALL mode, flows are grouped by app

## Dev Mode Toggle

Top-right toggle switches between:
- **Dev Mode ON**: Shows all nodes including internal backend logic, DB queries, data shapes
- **Dev Mode OFF** (Tester Mode): Shows only User / Frontend / Backend interactions

## Regenerating Flows

See `PROMPT.md` for the reusable prompt to regenerate all flows from the codebase.
