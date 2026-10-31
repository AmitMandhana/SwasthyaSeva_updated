# E2E Test Coverage Audit — 2026-05-30

## Overall Coverage

| App | Interactions | Tested | Coverage |
|-----|-------------|--------|----------|
| Doctor | 102+ | 66 | 65% |
| Clinic | 151+ | 117 | 77% |
| Admin | 139 | 104 | 75% |
| Web | 110 | 44 | 40% |
| **Total** | **502+** | **331** | **66%** |

## Doctor App Gaps (36 missing)

### Login (2 missing)
- Loading/disabled button state while signing in
- Form state reset after successful login

### Dashboard (5 missing)
- Day button click for switching schedule view
- Trend/growth comparison card interactions
- Schedule slot content validation (patient counts)
- Empty state for "No clinics" on specific days
- Patient row click interactions

### Appointments (3 missing)
- Calendar toggle button (selector defined, not used)
- Date range persistence after selection
- Appointment resolve button behavior

### Patients (3 missing)
- Table header sort clicks
- Multi-row interactions (only first row tested)
- Modal scroll for long histories

### Profile (6 missing)
- Avatar file upload end-to-end
- Photo preview modal cancel
- Photo preview modal confirm/save
- Schedule slot click behavior
- Tag pills interactions
- Password change SUCCESS flow (needs test account with known password)

### Consultation (17 missing)
- Referral type button interaction (Referred to / Admitted to)
- Medications edit flow (update existing medication)
- Medications special instructions toggle per med
- Vitals timeline close button verification
- Medical history panel open/close toggle
- Chronic conditions view history button
- Allergic conditions view history button
- Mobile stepper cross-step navigation
- Chief complaint prefill from appointment symptom
- Print prescription button click behavior
- Reset prescription confirm modal cancel
- Complete appointment modal full interaction
- Provisional diagnosis field explicit test
- Investigation suggestions field test
- Lab tests section (add/remove/view)
- Signs found on examination field
- Duration/Refills spinner interaction

## Clinic App Gaps (34 missing)

### Login (1 missing)
- Mode switch form state reset validation

### Dashboard Main (8 missing)
- Column sort direction three-state toggle
- Stats card clicks
- Booking: complaints select, preferred time, status radio
- Admin edit/delete/restore full lifecycle
- Analytics utilization chart in component test
- Leads pagination
- Prescriptions print/export

### AppointmentTab (2 missing)
- Sort column persistence after reload
- Empty state rendering path

### BookAppointmentModal (8 missing)
- Step 3: Country field fill
- Step 4: Complaints combobox selection
- Step 4: Preferred time input
- Step 4: Status radio selection
- Step 4: Fee validation
- Modal close button
- Multiple patient results handling
- OTP attempts warning

### ClinicAdminTab (4 missing)
- Edit admin + save flow
- Delete confirmation flow
- Restore flow
- Toggle active state verification

### LeadTab (3 missing)
- Edit lead + save flow
- Combined status filters
- Pagination navigation

### AuditLogTab (1 missing)
- Pagination

### AnalyticsTab (2 missing)
- Utilization chart in component test
- Refresh with data verification

### PrescriptionTab (3 missing)
- Detail overlay content validation
- Pagination
- Print/download

### ProfileTab (2 missing)
- Avatar upload end-to-end
- Password change SUCCESS flow

## Admin App Gaps (35 missing)

### Dashboard (3 missing)
- Refresh button
- Theme toggle
- Audit log pagination

### DoctorTab (4 missing)
- Preview button
- Image uploads (profile, banner, signature)
- Multi-select interactions (tags, specializations)
- Copy password button

### ClinicTab (5 missing)
- Location picker interaction
- State/country fields
- Edit modal cancel
- Image uploads
- Mobile view

### ClinicManagerTab (4 missing)
- Clinic username async lookup
- Edit modal cancel
- Mobile view
- Refresh button

### SlotTab (6 missing)
- Doctor/clinic async lookups
- Booking fee field
- Time selection validation
- Edit modal cancel
- Mobile view
- Refresh button

### AuditLogTab (6 missing)
- Pagination
- Date range filtering
- Complex filter syntax
- Refresh
- Export
- Mobile view

### ProfileTab (7 missing — orphaned spec)
- All interactions untested

## Web App Gaps (66 missing)

### Landing Page (13 missing)
- Patient/Doctor/Clinic portal CTAs
- Scene navigation
- Scene indicator dots
- Security section
- Get Started CTA
- Footer
- Scroll animations

### Slot Search (9 missing)
- Time of Day filter
- Day of Week filter
- Distance slider
- Multiple tag combinations
- No results state
- Error states
- Map picker full flow
- Location denied error
- Slot card hover

### Clinic Profile (7 missing)
- Avatar verification
- Doctor list at clinic
- Availability hours
- Inquiry error recovery
- Success persistence
- Symptoms optional field
- Per-field errors

### Doctor Profile (8 missing)
- Verified badge
- Avatar verification
- Schedule details
- Clinic selection from list
- Book Appointment sticky button
- Bio content
- Specialization display
- License info

### Patient Dashboard (7 missing)
- Date range filter application
- Past/upcoming toggle
- Appointment card navigation
- View Prescription links
- Status badge colors
- Empty state variations
- Pagination

### Patient Profile (9 missing)
- Edit profile fields (gender, DOB, location, email)
- Save profile changes
- Avatar upload + save
- Password change SUCCESS flow
- Password strength validation
- Field-level errors
- Date picker
- Gender selector

### Prescription Detail (13 missing)
- Valid prescription view (all fields)
- Print button
- Doctor/clinic details
- Vitals display
- Diagnosis fields
- Medications table
- Lab tests + report links
- Doctor signature
- Duration/refills
