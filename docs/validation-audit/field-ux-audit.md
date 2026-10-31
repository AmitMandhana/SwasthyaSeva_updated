# Field UX Audit

Audit date: 2026-06-17

## Critical Issues (act on these)

### 1. OTP Input — Single bland textbox
- **Where:** Doctor login, clinic login, web login, booking modal
- **Problem:** Just a plain text input with `maxLength=6`. No visual digit separation, no auto-submit, no paste handling.
- **Fix:** Create `OTPInput` component with 6 individual digit boxes, auto-advance, paste support, auto-submit on complete.

### 2. Password Fields — No show/hide toggle
- **Where:** ALL login pages, ALL profile password change, admin create doctor/clinic/manager forms
- **Problem:** `type="password"` with no visibility toggle. Users can't verify what they typed.
- **Fix:** Add eye icon toggle to TextField when `type="password"`.

### 3. Phone Inputs — Inconsistent format
- **Where:** ALL login pages, booking modal, admin forms
- **Problem:** Some expect `+919876543210`, some expect `9876543210`. No formatting, no prefix display.
- **Fix:** TextField should show "+91" prefix when used for phone. Enforce 10-digit after prefix.

### 4. TextField Missing Props
- **Missing:** `maxLength`, `inputMode`, `min`, `max`, `step`, `pattern`
- **Impact:** Can't constrain OTP to numeric, can't limit field lengths, can't set number ranges from the component.

### 5. Raw Textareas Not Using TextAreaField
- **Where:** Doctor consultation — advice, diagnosis (5+ instances)
- **Problem:** Raw `<textarea>` without maxLength, character counter, or error display.
- **Fix:** Migrate to TextAreaField.

### 6. Number Fields — No constraints
- **Where:** Vitals (height, weight, BP), fees, durations, refills
- **Problem:** `type="number"` but no min/max in UI. Or worse, TextField with no type at all.
- **Fix:** TextField needs `min`/`max` props. Use consistently.

## Medium Issues

### 7. Date Inputs — No min/max
- Native `<input type="date">` without constraints. Past dates allowed for follow-ups.

### 8. Search Inputs — No clear button
- No "X" to clear search text. No loading indicator during search.

### 9. Email/URL Fields — Validation not enforced
- TextField supports `type="email"` but it's never used. No URL validation pattern.

### 10. No RadioGroup component
- Clinic booking uses raw `<input type="radio">`. Should have a shared component.

## Field Type Inventory

| Type | Shared Component | Count | Key Gaps |
|------|-----------------|-------|----------|
| Text | TextField | ~50+ | No maxLength, no pattern |
| Password | TextField | ~15 | No show/hide toggle |
| OTP | Plain input | 4 | No digit boxes, bland design |
| Phone | TextField | ~10 | No +91 prefix, inconsistent format |
| Number | TextField / input | ~12 | No min/max in component |
| Date | Native input | 3 | No constraints |
| Time | Native input | 1 | No slot validation |
| Select | SelectField | ~20 | Good — searchable, keyboard nav |
| Multi-select | TagMultiSelect | ~5 | Good — chips, search |
| Textarea | TextAreaField / raw | ~10 | 5+ raw, no counter |
| Toggle | ToggleSwitch | ~8 | Good — accessible |
| Checkbox | Checkbox | ~3 | Good — touch targets |
| File | ImageUpload | ~6 | No drag-drop |
| Search | FilterSearchBar | ~5 | Good — chips, debounce |
| Radio | Raw input | 1 | No shared component |
