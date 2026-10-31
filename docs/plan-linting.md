# Linting Plan: OpenAPI Standards + Test Spec Validation

## 1. Backend: OpenAPI Linting with Spectral

**Tool:** `@stoplight/spectral-cli` — industry-standard OpenAPI linter with 100+ built-in rules.

### What it enforces
- All paths have descriptions/summaries
- All responses have descriptions
- All parameters have descriptions
- Valid OpenAPI 2.0 schema structure
- No unused definitions
- Consistent naming conventions
- Security definitions are properly referenced

### Implementation
1. Install `@stoplight/spectral-cli` as a backend devDependency
2. Create `.spectral.yaml` at backend root with:
   - Extend `spectral:oas` (built-in OpenAPI ruleset)
   - Custom rules for SwasthyaSeva conventions (e.g., all routes must have tags, all protected routes must declare security)
3. Add npm script: `"lint:openapi": "spectral lint swagger.json"`
4. Add a **route coverage checker** script (`scripts/check-swagger-coverage.js`) that:
   - Parses all route files to extract defined routes (method + path)
   - Parses swagger.json to extract documented routes
   - Reports any routes missing documentation
5. Add npm script: `"lint:openapi:coverage": "node scripts/check-swagger-coverage.js"`

### Scripts (backend/package.json)
```json
"lint:openapi": "spectral lint swagger.json --ruleset .spectral.yaml",
"lint:openapi:coverage": "node scripts/check-swagger-coverage.js",
"lint:api": "npm run swagger && npm run lint:openapi && npm run lint:openapi:coverage"
```

## 2. Frontend: Test Spec Linting via test-gen validate

**Tool:** Built into `@swasthyaseva/test-gen` CLI as a `validate` subcommand.

### What it enforces
- **Coverage:** Every `page.tsx` file in `apps/*/app/` MUST have a `__test` export
- **Schema validation:** Each test spec has all required fields (route, auth, app, title, elements, flows)
- **Locator validation:** Each element has exactly one valid locator type (role+name, testId, text, css)
- **Flow validation:**
  - Every flow has a name and at least one step
  - No duplicate flow names within a spec
  - Every `after` reference points to an existing flow name
  - No circular `after` dependencies
- **Step validation:**
  - Each step has either `do` (action) or `expect` (assertion), not both, not neither
  - `on` references must match an element name in `elements`
  - Actions requiring `value` (fill, select, press, navigate) must have one
  - Assertions requiring `value` (text, value, url, urlContains, count, countMin, countMax, hasClass) must have one
- **Auth validation:** Auth preset must be one of the defined values

### Implementation
1. Add `src/validator.ts` to `packages/test-gen/` with all validation rules
2. Add `validate` subcommand to the CLI generator: `npx test-gen validate`
3. Output: file-by-file report with errors and warnings, exit code 1 if any errors

### Scripts (root package.json)
```json
"lint:specs": "npx test-gen validate"
```

## 3. Unified Lint Command

Root `package.json`:
```json
"lint:testing": "npm run lint:specs && cd backend && npm run lint:api"
```

## 4. CI Integration

Add linting steps to `.github/workflows/ci.yml`:
- After swagger generation: `npm run lint:openapi`
- After test generation: `npm run lint:specs`
- Both must pass before E2E tests run

## Commits
1. `feat: add Spectral OpenAPI linting for backend`
2. `feat: add swagger route coverage checker`
3. `feat: add test-gen validate command for spec linting`
4. `feat: add unified lint:testing script and CI integration`
