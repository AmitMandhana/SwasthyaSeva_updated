/**
 * Cross-App Flows — Journeys spanning multiple apps
 * These flows trace end-to-end user journeys across web, clinic, admin, and backend
 */

module.exports = {
  app: "cross-app",
  name: "Cross-App Flows",
  actors: ["user", "frontend", "backend", "database", "external"],
  flows: [

    // ─── Patient Books via Web → Clinic ───
    {
      id: "patient-web-to-clinic-booking",
      name: "Full Booking Journey (Web → Clinic)",
      description: "Patient finds slot on web app, calls clinic, clinic admin books appointment via portal",
      nodes: [
        // Web app phase
        { id: "w1", type: "start", actor: "user", label: "Patient opens web app", detail: { description: "Patient (no auth) navigates to localhost:3000/slot-search" } },
        { id: "w2", type: "action", actor: "frontend", label: "[Web] Slot search", detail: { description: "Geolocation + Turnstile → POST /api/public/slots/search → results displayed" } },
        { id: "w3", type: "action", actor: "user", label: "Patient finds suitable slot" },
        { id: "w4", type: "action", actor: "user", label: "Clicks 'Book'", detail: { description: "SlotBookingModal opens showing clinic phone number" } },
        { id: "w5", type: "action", actor: "user", label: "Calls clinic phone", detail: { description: "Patient calls the clinic's phone number displayed in modal (tel: link)" } },

        // Clinic portal phase
        { id: "c1", type: "action", actor: "user", label: "Clinic admin opens portal", detail: { description: "Clinic staff logs into localhost:3003 as clinic_admin" } },
        { id: "c2", type: "action", actor: "frontend", label: "[Clinic] Opens Book Appointment" },
        { id: "c3", type: "api_call", actor: "frontend", label: "POST /booking/lookup", detail: { description: "Search patient by phone" } },
        { id: "c4", type: "decision", actor: "frontend", label: "Patient found?" },

        // New patient branch
        { id: "c5", type: "api_call", actor: "frontend", label: "POST /booking/send-otp" },
        { id: "c6", type: "external_call", actor: "external", label: "SMS OTP sent to patient" },
        { id: "c7", type: "action", actor: "user", label: "Patient shares OTP with receptionist" },
        { id: "c8", type: "api_call", actor: "frontend", label: "POST /booking/verify-otp" },
        { id: "c9", type: "decision", actor: "frontend", label: "New or existing?" },
        { id: "c10", type: "api_call", actor: "frontend", label: "POST /booking/register-patient", detail: { description: "Encrypt PII, create user account" } },
        { id: "c10b", type: "internal", actor: "backend", label: "Encrypt PII + bcrypt + INSERT", detail: { description: "AES-256-GCM encrypt name/phone/email. bcrypt hash password. SHA-256 phone_hash. INSERT INTO users." }, devOnly: true },

        // Booking phase (both paths converge)
        { id: "c11", type: "action", actor: "frontend", label: "[Clinic] Step 4: Select slot + date" },
        { id: "c12", type: "api_call", actor: "frontend", label: "POST /booking/create-appointment" },
        { id: "c13", type: "internal", actor: "backend", label: "Transaction: lock → index → insert", detail: { description: "BEGIN → FOR UPDATE lock → MAX(recommended_index)+1 → COUNT visit_no → INSERT appointment → COMMIT", handler: "createAppointment()", file: "backend/queries/create/createAppointment.js" }, devOnly: true },
        { id: "c14", type: "db_query", actor: "database", label: "INSERT appointment", devOnly: true },
        { id: "c15", type: "api_response", actor: "frontend", label: "Appointment created" },
        { id: "c16", type: "action", actor: "frontend", label: "Toast + close modal + refresh list" },
        { id: "c17", type: "end", actor: "user", label: "Appointment booked" },
      ],
      edges: [
        // Web phase
        { from: "w1", to: "w2", type: "navigation", label: "/slot-search" },
        { from: "w2", to: "w3", type: "user_action", label: "Browse results" },
        { from: "w3", to: "w4", type: "user_action", label: "Click Book" },
        { from: "w4", to: "w5", type: "user_action", label: "Call clinic" },

        // Transition: phone call
        { from: "w5", to: "c1", type: "user_action", label: "Phone call to clinic" },

        // Clinic phase
        { from: "c1", to: "c2", type: "user_action", label: "Book Appointment button" },
        { from: "c2", to: "c3", type: "user_action", label: "Enter phone + Search" },
        { from: "c3", to: "c4", type: "api_response" },
        { from: "c4", to: "c5", type: "internal", label: "Not found → Send OTP" },
        { from: "c4", to: "c5", type: "internal", label: "Found → Select + Send OTP" },
        { from: "c5", to: "c6", type: "api_request", label: "OTP via SMS" },
        { from: "c6", to: "c7", type: "external_response", label: "Patient receives SMS" },
        { from: "c7", to: "c8", type: "user_action", label: "Enter OTP" },
        { from: "c8", to: "c9", type: "api_response" },
        { from: "c9", to: "c10", type: "internal", label: "New patient" },
        { from: "c9", to: "c11", type: "internal", label: "Existing patient (skip registration)" },
        { from: "c10", to: "c10b", type: "api_request", devOnly: true },
        { from: "c10", to: "c11", type: "api_response", label: "Patient registered" },
        { from: "c10b", to: "c11", type: "internal", devOnly: true },

        // Booking
        { from: "c11", to: "c12", type: "user_action", label: "Fill details + Book" },
        { from: "c12", to: "c13", type: "api_request", devOnly: true },
        { from: "c13", to: "c14", type: "internal", devOnly: true },
        { from: "c12", to: "c15", type: "api_request", label: "POST /booking/create-appointment" },
        { from: "c14", to: "c15", type: "db_result", devOnly: true },
        { from: "c15", to: "c16", type: "api_response", label: "201 Created" },
        { from: "c16", to: "c17", type: "user_action" },
      ],
    },

  ],
};
