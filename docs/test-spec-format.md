# Test Spec Format Reference

Living reference for the `testSpec()` format used in frontend test annotations.

## Schema

The `testSpec()` function takes a single object with the following top-level fields:

```ts
testSpec({
  route: string,
  auth: AuthPreset,
  app: 'web' | 'admin' | 'doctor' | 'clinic',
  title: string,
  elements: Record<string, ElementLocator>,
  flows: TestFlow[],
})
```

| Field      | Type                            | Description                              |
|------------|---------------------------------|------------------------------------------|
| `route`    | `string`                        | The page route (e.g., `'/slot-search'`)  |
| `auth`     | `AuthPreset`                    | Authentication requirement for the page  |
| `app`      | `'web' \| 'admin' \| 'doctor' \| 'clinic'` | Which app this page belongs to |
| `title`    | `string`                        | Human-readable test suite title          |
| `elements` | `Record<string, ElementLocator>` | Named element references                |
| `flows`    | `TestFlow[]`                    | Test flows to execute                    |

---

## Element Locators

Each element locator identifies a DOM element using one of four strategies. Only one strategy should be used per locator.

### `role` + `name` -- Playwright `getByRole`

```ts
{ role: 'button', name: 'Submit' }
{ role: 'heading', name: /welcome/i }
{ role: 'textbox', name: 'Email' }
```

The `name` field can be a **string** or a **RegExp**.

### `testId` -- Playwright `getByTestId`

```ts
{ testId: 'slot-card' }
{ testId: 'booking-modal' }
```

### `text` -- Playwright `getByText`

```ts
{ text: 'Welcome' }
{ text: 'No results found' }
```

### `css` -- **REMOVED** (no longer allowed)

CSS selectors are banned by the validator. Use `testId`, `role`, or `text` instead.
Add `data-testid` attributes to components when no role or text selector fits.

---

## Actions

Actions are specified in a test step's `do` field. They describe what to do with the target element.

| Action       | Description                        | Requires `value`       |
|--------------|------------------------------------|------------------------|
| `click`      | Click an element                   | No                     |
| `fill`       | Fill an input field                | Yes (the text to type) |
| `select`     | Select a dropdown option           | Yes (the option value) |
| `check`      | Check a checkbox                   | No                     |
| `hover`      | Hover over an element              | No                     |
| `press`      | Press a keyboard key               | Yes (e.g., `'Enter'`)  |
| `waitFor`    | Wait for an element to appear      | No                     |
| `navigate`   | Navigate to a URL                  | Yes (the URL)          |
| `reload`     | Reload the page and wait for idle  | No                     |
| `screenshot` | Take a screenshot                  | Optional (name)        |

### Action examples

```ts
{ element: 'loginBtn', do: 'click' }
{ element: 'emailInput', do: 'fill', value: 'test@example.com' }
{ element: 'roleSelect', do: 'select', value: 'doctor' }
{ element: 'termsCheckbox', do: 'check' }
{ element: 'submitBtn', do: 'hover' }
{ element: 'searchInput', do: 'press', value: 'Enter' }
{ element: 'loadingSpinner', do: 'waitFor' }
{ do: 'navigate', value: '/dashboard' }
{ do: 'screenshot', value: 'after-login' }
```

---

## Assertions

Assertions are specified in a test step's `expect` field. They describe what to verify about the target element or page state.

| Assertion      | Description                          | Requires `value`          |
|----------------|--------------------------------------|---------------------------|
| `visible`      | Element is visible                   | No                        |
| `hidden`       | Element is hidden                    | No                        |
| `text`         | Element has specific text            | Yes (the expected text)   |
| `value`        | Input has specific value             | Yes (the expected value)  |
| `url`          | Page URL matches                     | Yes (the expected URL)    |
| `urlContains`  | URL contains substring               | Yes (the substring)       |
| `count`        | Element count equals N               | Yes (`number`)            |
| `countMin`     | Element count >= N                   | Yes (`number`)            |
| `countMax`     | Element count <= N                   | Yes (`number`)            |
| `hasClass`     | Element has a CSS class              | Yes (the class name)      |
| `enabled`      | Element is enabled                   | No                        |
| `disabled`     | Element is disabled                  | No                        |
| `checked`      | Checkbox is checked                  | No                        |

### Assertion examples

```ts
{ element: 'welcomeMsg', expect: 'visible' }
{ element: 'errorBanner', expect: 'hidden' }
{ element: 'pageTitle', expect: 'text', value: 'Dashboard' }
{ element: 'emailInput', expect: 'value', value: 'test@example.com' }
{ expect: 'url', value: '/dashboard' }
{ expect: 'urlContains', value: '/search' }
{ element: 'slotCards', expect: 'count', value: 5 }
{ element: 'searchResults', expect: 'countMin', value: 1 }
{ element: 'searchResults', expect: 'countMax', value: 10 }
{ element: 'activeTab', expect: 'hasClass', value: 'selected' }
{ element: 'submitBtn', expect: 'enabled' }
{ element: 'submitBtn', expect: 'disabled' }
{ element: 'termsCheckbox', expect: 'checked' }
```

---

## Auth Presets

The `auth` field controls how the test runner sets up authentication before running flows.

| Preset              | Description                              |
|---------------------|------------------------------------------|
| `'none'`            | No auth; test as anonymous user          |
| `'optional'`        | Page works with or without auth          |
| `'required'`        | Must be logged in (generic user)         |
| `'role:admin'`      | Logged in as an admin user               |
| `'role:doctor'`     | Logged in as a doctor user               |
| `'role:clinic'`     | Logged in as a clinic entity user        |
| `'role:clinic_admin'` | Logged in as a clinic admin user       |
| `'role:patient'`    | Logged in as a patient user              |

When a role-based preset is used, the test runner will authenticate with credentials matching that role before executing any flows.

---

## Flow Tree (`flowTree`)

The preferred format for complex pages. Instead of flat `flows[]` with `after:` chains, `flowTree` defines a tree where each root-to-leaf path becomes one test.

```ts
testSpec({
  route: '/dashboard',
  auth: 'role:doctor',
  app: 'doctor',
  title: 'Dashboard',
  elements: { ... },
  flows: [],  // keep empty when using flowTree
  flowTree: {
    name: 'root',
    steps: [
      { do: 'waitFor', on: 'pageLoaded' },
    ],
    children: [
      {
        name: 'section A',
        steps: [
          { expect: 'visible', on: 'sectionA' },
        ],
        children: [
          {
            name: 'fill form and submit',
            steps: [
              { do: 'fill', on: 'nameInput', value: 'Test' },
              { do: 'click', on: 'submitBtn' },
              { expect: 'visible', on: 'successMsg' },
            ],
          },
          {
            name: 'empty submit shows error',
            steps: [
              { do: 'click', on: 'submitBtn' },
              { expect: 'visible', on: 'errorMsg' },
            ],
          },
        ],
      },
    ],
  },
})
```

**How it works:**
- Each root-to-leaf path generates one test case
- Parent steps are prepended to child steps automatically
- The test name is the chain: `"root > section A > fill form and submit"`
- Siblings are independent — they share the parent but not each other's state
- Use `flowTree` for pages with many independent sections or branching logic

**Generated tests from the example above:**
1. `root > section A > fill form and submit` — runs root steps → section A steps → fill+submit steps
2. `root > section A > empty submit shows error` — runs root steps → section A steps → empty submit steps

### FlowNode interface

```ts
interface FlowNode {
  name: string;       // Node name (becomes part of test name)
  steps: TestStep[];  // Steps to execute at this node
  children?: FlowNode[]; // Child branches (each leaf = one test)
}
```

### When to use `flowTree` vs `flows[]`

| Use case | Format |
|----------|--------|
| Simple page with linear flows | `flows[]` with `after:` |
| Complex page with many sections | `flowTree` |
| Branching logic (valid/invalid inputs) | `flowTree` |
| Multiple independent test groups | `flowTree` |

### Rules for sibling branches

Sibling children share the same parent steps but are independent tests. Each sibling starts from a fresh page load with parent steps replayed. This means:
- Siblings CANNOT rely on state from other siblings
- If sibling A creates data (e.g., registers a user), sibling B gets a fresh page and won't see that data
- For data dependencies between tests, use `seedApi` or restructure as parent→child instead of siblings

---

## Seed API (`seedApi`)

For pages with dynamic routes (e.g., `/consultation/[id]`), `seedApi` creates fresh test data before each test and cleans up after.

```ts
testSpec({
  route: '/dashboard/consultation/0',  // 0 = placeholder, replaced by seeded ID
  auth: 'role:doctor',
  app: 'doctor',
  title: 'Consultation Form',
  seedApi: {
    endpoint: '/api/test/create-appointment',
    method: 'POST',
    body: {
      doctor_id: 9,
      user_id: 1,
      slot_id: 33,
      appointment_date: new Date().toISOString().slice(0, 10),
      symptom_code: 'FEVER',
      symptom_text: 'Fever and body ache',
    },
    routeParam: 'appointment_id',  // response field used to replace route param
  },
  elements: { ... },
  flows: [],
  flowTree: { ... },
})
```

**How it works:**
- `beforeEach`: POST to `seedApi.endpoint` → gets back `{ appointment_id: 42 }`
- Route becomes `/dashboard/consultation/42` (replaces trailing `0`)
- `afterEach`: DELETE `/api/test/appointment/42` (automatic cleanup)

### Available seed endpoints

| Endpoint | Creates | Returns | Cleanup |
|----------|---------|---------|---------|
| `POST /api/test/create-appointment` | 1 appointment | `{ appointment_id }` | `DELETE /api/test/appointment/:id` |
| `POST /api/test/seed-patient-prescription` | 1 completed appointment + prescription + medication | `{ appointment_id }` | `DELETE /api/test/appointment/:id` |
| `POST /api/test/seed-baseline` | 8 appointments + 1 prescription + 2 medications | `{ appointmentIds, prescriptionIds, medicationIds }` | `POST /api/test/cleanup-baseline` |

---

## Flow Dependencies (flat `flows[]`)

Flows can declare dependencies on other flows using the `after` field. This ensures that a prerequisite flow runs first to set up necessary state.

```ts
flows: [
  {
    name: 'login',
    steps: [
      { element: 'emailInput', do: 'fill', value: 'test@example.com' },
      { element: 'submitBtn', do: 'click' },
    ],
  },
  {
    name: 'view profile',
    after: 'login',
    steps: [
      { element: 'profileLink', do: 'click' },
      { element: 'profileName', expect: 'visible' },
    ],
  },
]
```

The test runner resolves the dependency graph and executes flows in the correct order. If flow B declares `after: 'login'`, the `login` flow will always run before flow B regardless of array position.

---

## Cross-App Flows

Some test scenarios span multiple apps (e.g., a doctor creates a slot in the doctor app, then a patient books it in the web app). Cross-app flows handle this by changing the `app` field between steps.

Within a flow, individual steps can specify an `app` override to switch context:

```ts
{
  name: 'cross-app booking',
  steps: [
    // Step runs in the doctor app
    { app: 'doctor', element: 'createSlotBtn', do: 'click' },
    { app: 'doctor', element: 'slotForm', do: 'fill', value: '10:00 AM' },
    { app: 'doctor', element: 'saveBtn', do: 'click' },
    // Step switches to the web app
    { app: 'web', do: 'navigate', value: '/slot-search' },
    { app: 'web', element: 'searchBtn', do: 'click' },
    { app: 'web', element: 'bookBtn', do: 'click' },
  ],
}
```

When the `app` changes between steps, the test runner switches to the corresponding app's URL and authentication context.

---

## Naming Conventions

### Element names

Use **camelCase** descriptive names that indicate both the element type and purpose:

- `loginBtn` -- a login button
- `emailInput` -- an email input field
- `searchResults` -- the search results container
- `slotCard` -- a single slot card
- `bookingModal` -- the booking modal dialog
- `errorBanner` -- an error message banner

### Flow names

Use **lowercase with spaces**, written as descriptive phrases:

- `'login with valid credentials'`
- `'search with geolocation'`
- `'book a slot'`
- `'cancel appointment'`
- `'view admin dashboard tabs'`

---

## Examples

### 1. Login Page (Web)

```ts
testSpec({
  route: '/login',
  auth: 'none',
  app: 'web',
  title: 'Login Page',
  elements: {
    phoneInput: { role: 'textbox', name: 'Phone Number' },
    sendOtpBtn: { role: 'button', name: 'Send OTP' },
    otpInput: { role: 'textbox', name: 'OTP' },
    verifyBtn: { role: 'button', name: 'Verify' },
    errorMsg: { testId: 'login-error' },
    welcomeText: { text: 'Welcome back' },
  },
  flows: [
    {
      name: 'send otp',
      steps: [
        { element: 'phoneInput', do: 'fill', value: '9876543210' },
        { element: 'sendOtpBtn', do: 'click' },
        { element: 'otpInput', expect: 'visible' },
      ],
    },
    {
      name: 'verify otp and login',
      after: 'send otp',
      steps: [
        { element: 'otpInput', do: 'fill', value: '123456' },
        { element: 'verifyBtn', do: 'click' },
        { expect: 'urlContains', value: '/dashboard' },
      ],
    },
    {
      name: 'show error for invalid phone',
      steps: [
        { element: 'phoneInput', do: 'fill', value: '123' },
        { element: 'sendOtpBtn', do: 'click' },
        { element: 'errorMsg', expect: 'visible' },
        { element: 'errorMsg', expect: 'text', value: 'Invalid phone number' },
      ],
    },
  ],
})
```

### 2. CRUD Tabs (Admin Dashboard)

```ts
testSpec({
  route: '/dashboard',
  auth: 'role:admin',
  app: 'admin',
  title: 'Admin Dashboard CRUD Tabs',
  elements: {
    usersTab: { role: 'tab', name: 'Users' },
    clinicsTab: { role: 'tab', name: 'Clinics' },
    doctorsTab: { role: 'tab', name: 'Doctors' },
    dataTable: { testId: 'data-table' },
    tableRows: { testId: 'data-table-row' },
    addBtn: { role: 'button', name: 'Add New' },
    editBtn: { role: 'button', name: 'Edit' },
    deleteBtn: { role: 'button', name: 'Delete' },
    confirmDeleteBtn: { role: 'button', name: 'Confirm' },
    searchInput: { role: 'textbox', name: 'Search' },
  },
  flows: [
    {
      name: 'navigate between tabs',
      steps: [
        { element: 'usersTab', do: 'click' },
        { element: 'dataTable', expect: 'visible' },
        { element: 'tableRows', expect: 'countMin', value: 1 },
        { element: 'clinicsTab', do: 'click' },
        { element: 'dataTable', expect: 'visible' },
        { element: 'doctorsTab', do: 'click' },
        { element: 'dataTable', expect: 'visible' },
      ],
    },
    {
      name: 'search and filter',
      steps: [
        { element: 'usersTab', do: 'click' },
        { element: 'searchInput', do: 'fill', value: 'test' },
        { element: 'searchInput', do: 'press', value: 'Enter' },
        { element: 'tableRows', expect: 'countMin', value: 0 },
      ],
    },
    {
      name: 'delete with confirmation',
      after: 'navigate between tabs',
      steps: [
        { element: 'usersTab', do: 'click' },
        { element: 'deleteBtn', do: 'click' },
        { element: 'confirmDeleteBtn', expect: 'visible' },
        { element: 'confirmDeleteBtn', do: 'click' },
      ],
    },
  ],
})
```

### 3. Modal Interaction (Booking Modal)

```ts
testSpec({
  route: '/slot-search',
  auth: 'role:patient',
  app: 'web',
  title: 'Booking Modal Interaction',
  elements: {
    searchInput: { role: 'textbox', name: 'Search doctors' },
    searchBtn: { role: 'button', name: 'Search' },
    slotCards: { testId: 'slot-card' },
    bookBtn: { role: 'button', name: 'Book Now' },
    bookingModal: { role: 'dialog', name: 'Confirm Booking' },
    patientNameInput: { role: 'textbox', name: 'Patient Name' },
    confirmBtn: { role: 'button', name: 'Confirm' },
    cancelBtn: { role: 'button', name: 'Cancel' },
    successMsg: { text: 'Booking confirmed' },
  },
  flows: [
    {
      name: 'search for slots',
      steps: [
        { element: 'searchInput', do: 'fill', value: 'Cardiology' },
        { element: 'searchBtn', do: 'click' },
        { element: 'slotCards', expect: 'countMin', value: 1 },
      ],
    },
    {
      name: 'open and close modal',
      after: 'search for slots',
      steps: [
        { element: 'bookBtn', do: 'click' },
        { element: 'bookingModal', expect: 'visible' },
        { element: 'cancelBtn', do: 'click' },
        { element: 'bookingModal', expect: 'hidden' },
      ],
    },
    {
      name: 'complete booking',
      after: 'search for slots',
      steps: [
        { element: 'bookBtn', do: 'click' },
        { element: 'bookingModal', expect: 'visible' },
        { element: 'patientNameInput', do: 'fill', value: 'Test Patient' },
        { element: 'confirmBtn', do: 'click' },
        { element: 'successMsg', expect: 'visible' },
        { element: 'bookingModal', expect: 'hidden' },
      ],
    },
  ],
})
```

### 4. Form Submission (Clinic Inquiry)

```ts
testSpec({
  route: '/inquiry',
  auth: 'none',
  app: 'clinic',
  title: 'Clinic Inquiry Form',
  elements: {
    nameInput: { role: 'textbox', name: 'Full Name' },
    emailInput: { role: 'textbox', name: 'Email' },
    phoneInput: { role: 'textbox', name: 'Phone' },
    messageInput: { role: 'textbox', name: 'Message' },
    categorySelect: { role: 'combobox', name: 'Category' },
    termsCheckbox: { role: 'checkbox', name: /terms/i },
    submitBtn: { role: 'button', name: 'Submit Inquiry' },
    successBanner: { testId: 'success-banner' },
    errorList: { testId: 'error-list' },
    fieldError: { testId: 'field-error' },
  },
  flows: [
    {
      name: 'submit valid inquiry',
      steps: [
        { element: 'nameInput', do: 'fill', value: 'John Doe' },
        { element: 'emailInput', do: 'fill', value: 'john@example.com' },
        { element: 'phoneInput', do: 'fill', value: '9876543210' },
        { element: 'categorySelect', do: 'select', value: 'general' },
        { element: 'messageInput', do: 'fill', value: 'I would like to inquire about services.' },
        { element: 'termsCheckbox', do: 'check' },
        { element: 'submitBtn', do: 'click' },
        { element: 'successBanner', expect: 'visible' },
        { element: 'successBanner', expect: 'text', value: 'Inquiry submitted successfully' },
      ],
    },
    {
      name: 'show validation errors on empty submit',
      steps: [
        { element: 'submitBtn', do: 'click' },
        { element: 'fieldError', expect: 'countMin', value: 3 },
        { element: 'submitBtn', expect: 'enabled' },
      ],
    },
    {
      name: 'show error for invalid email',
      steps: [
        { element: 'nameInput', do: 'fill', value: 'John Doe' },
        { element: 'emailInput', do: 'fill', value: 'not-an-email' },
        { element: 'submitBtn', do: 'click' },
        { element: 'errorList', expect: 'visible' },
      ],
    },
  ],
})
```

---

## Component Test Specs

For non-page component files (modals, tabs, form sections), use `componentTestSpec()` instead of `testSpec()`.

### When to Use

Any `.tsx` file in `apps/*/app/` that:
- Renders interactive UI (buttons, inputs, modals, etc.)
- Is NOT `page.tsx`, `layout.tsx`, or a client wrapper (`Client*.tsx` / `*Client.tsx`)

Files that do NOT need `__test`: `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, client wrappers, illustration/SVG files, and anything in `packages/ui/`.

### Schema

```ts
import { componentTestSpec } from '@swasthyaseva/test-gen';

export const __test = componentTestSpec({
  parentRoute: '/dashboard',       // Page URL where this component renders
  app: 'clinic',                   // Which app
  title: 'Book Appointment Modal', // Test suite title
  elements: { ... },               // Same as testSpec
  flows: [ ... ],                  // Same as testSpec
});
```

### Key Differences from `testSpec()`

| Field | `testSpec()` | `componentTestSpec()` |
|-------|-------------|----------------------|
| `route` | Page URL | Not used |
| `parentRoute` | Not used | Page URL where component renders |
| `auth` | Required | Not used (inherited from parent page) |
| `app` | Required | Required |

### `parentRoute` Rules

- Always use the **page URL**, not the parent component name
- If a component renders on multiple pages, use an array: `parentRoute: ['/dashboard', '/settings']`
- The validator checks that every `parentRoute` matches an existing page spec's `route` in the same app

### Self-Contained Flows

Each component's flows are independent. Include trigger steps (like clicking a button to open a modal) in the component's own flows:

```ts
// BookAppointmentModal.tsx
componentTestSpec({
  parentRoute: '/dashboard',
  app: 'clinic',
  title: 'Book Appointment Modal',
  elements: {
    openBtn: { role: 'button', name: 'Book Appointment' },
    modal: { role: 'dialog' },
    phoneInput: { role: 'textbox', name: 'Phone' },
    lookupBtn: { role: 'button', name: 'Lookup' },
  },
  flows: [
    {
      name: 'open modal and search patient',
      steps: [
        { do: 'click', on: 'openBtn' },
        { do: 'waitFor', on: 'modal' },
        { do: 'fill', on: 'phoneInput', value: '9876543210' },
        { do: 'click', on: 'lookupBtn' },
      ],
    },
  ],
});
```

### Tab Component Example

```ts
// DoctorTab.tsx
componentTestSpec({
  parentRoute: '/dashboard',
  app: 'admin',
  title: 'Doctor Management Tab',
  elements: {
    tab: { role: 'tab', name: 'Doctors' },
    searchBar: { role: 'textbox', name: /search/i },
    addBtn: { role: 'button', name: /Add Doctor/ },
    table: { testId: 'doctor-table' },
  },
  flows: [
    {
      name: 'switch to doctors tab and view list',
      steps: [
        { do: 'click', on: 'tab' },
        { expect: 'visible', on: 'table' },
        { expect: 'visible', on: 'addBtn' },
      ],
    },
    {
      name: 'search for a doctor',
      after: 'switch to doctors tab and view list',
      steps: [
        { do: 'fill', on: 'searchBar', value: 'smith' },
        { do: 'press', on: 'searchBar', value: 'Enter' },
        { expect: 'visible', on: 'table' },
      ],
    },
  ],
});
```
