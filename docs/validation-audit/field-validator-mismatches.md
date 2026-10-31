# Field Validator Mismatches: Frontend vs Backend

Audit date: 2026-06-17

## HIGH Severity

| Field | Issue | Frontend | Backend | Impact |
|-------|-------|----------|---------|--------|
| state | Abbreviation rejection | Rejects "AP", only accepts "Andhra Pradesh" | Normalizes "ap" -> "Andhra Pradesh" | Frontend blocks valid input |
| gender | Single-letter rejection | Rejects "m"/"f"/"o" | Normalizes to "male"/"female"/"other" | Frontend blocks valid input |
| code | Uppercase requirement | Rejects "abc123" (must be uppercase) | Normalizes to "ABC123" | Frontend blocks valid input |
| positiveInteger/slotFee/slotTime | parseInt vs Number | `Number("10abc")` = NaN (rejects) | `parseInt("10abc", 10)` = 10 (accepts) | Asymmetric validation |
| phone | Type handling | Validates raw string | Normalizes with +91 prefix | Works but asymmetric |
| dob | Type handling | Validates ISO string via `new Date(v)` | Expects Date object, normalizes string | Works but validates on different types |
| booleanField | Missing validator | NO frontend validator exists | Full normalize/validate | Frontend crash risk |
| createDoctorSchema | Missing fields | No tag_1/tag_2/tag_3, verified_doctor | Has all fields | Frontend can't validate these |
| createClinicSchema | Missing field | No verified field | Has verified field | Frontend can't validate this |
| updateSlotSchema | Missing fields | No booking_fee, watermark_url | Has both | Frontend can't validate these |

## MEDIUM Severity

| Field | Issue | Frontend | Backend | Impact |
|-------|-------|----------|---------|--------|
| name | No normalization | Sends raw input | Title-cases ("john" -> "John") | Silent server correction |
| city | No normalization | Sends raw input | Title-cases | Silent server correction |
| email | No normalization | Sends raw input | Lowercases | Silent server correction |
| country | No normalization | Sends raw input | Maps "in"/"bharat" -> "India" | Silent server correction |
| location_x/y | Precision | Accepts any float | Rounds to 6 decimals | Silent precision loss |
| dob | Error message | "Must be a valid date" | "Must be a Date" | Cosmetic |

## LOW Severity

| Field | Issue | Details |
|-------|-------|---------|
| pincode | Whitespace | Both handle correctly |
| slotDay/prescriptionFormat | Error message spacing | Cosmetic difference |
