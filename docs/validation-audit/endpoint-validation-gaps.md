# Endpoint Validation Gaps: Frontend vs Backend

Audit date: 2026-06-17

## CRITICAL

| Endpoint | Issue | Details |
|----------|-------|---------|
| PATCH /api/patient/profile | Password length mismatch | Frontend: 12-char min + complexity. Backend: 6-char min, no complexity. Users can set weak passwords via direct API. |
| PATCH /api/doctor/profile | Password length mismatch | Same as patient profile. |
| POST /api/admin/slots | Input type mismatch | Backend expects `doctor_username`/`clinic_username` strings (resolves to IDs). Frontend schema uses `doctor_id`/`clinic_id` integers. |
| POST /api/doctor/prescriptions/save | No frontend validation | Zero validation schema. `chiefComplain`, `provisionalDiagnosis`, `vitals`, `medications` sent unvalidated. |

## HIGH

| Endpoint | Issue | Details |
|----------|-------|---------|
| POST /api/clinic/booking/create-appointment | No frontend schema | Backend does inline validation. No frontend schema to compare. `appointment_status` enum undocumented. |
| PATCH /api/admin/slots/:id | Missing frontend fields | Backend accepts `watermark_url`, `booking_fee`. Frontend schema omits both. |

## MEDIUM

| Endpoint | Issue | Details |
|----------|-------|---------|
| POST /api/admin/clinics | State optionality | Backend defaults state to "West Bengal" if not provided. Frontend marks as optional. Potential confusion. |

## ALIGNED (No gaps)

| Endpoint | Status |
|----------|--------|
| POST /api/admin/doctors | Frontend and backend schemas match |
| PATCH /api/admin/doctors/:id | Match |
| PATCH /api/admin/clinics/:id | Match |
| POST /api/admin/clinic-managers | Match |
| PATCH /api/admin/clinic-managers/:id | Match |
| POST /api/auth/register/initiate | Match (password auto-generated intentionally) |
| POST /api/patient/login | Match |
