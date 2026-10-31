"use client";

import { useState, useEffect } from "react";
import { Modal, TextField, Button, useToast, SelectField, TagMultiSelect, useAnalytics, validateForm, createUserSchema, OTPInput, formatSlotTime, type SelectOption, type FieldErrors } from "@swasthyaseva/ui";
import { Search, Phone } from "lucide-react";
import {
  lookupPatient,
  sendBookingOTP,
  verifyBookingOTP,
  registerBookingPatient,
  createBookingAppointment,
  getClinicSlots,
  getSymptoms,
  getComplaints,
  type BookingLookupUser,
  type SlotForBooking,
  type SymptomOption,
  type ComplaintOption,
} from "@/lib/api";

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ["Patient ID", "Verify OTP", "Register", "Book"];

export default function BookAppointmentModal({ onClose }: { onClose: () => void }) {
  const { trackEvent } = useAnalytics();
  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState("+91");
  const [users, setUsers] = useState<BookingLookupUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [otp, setOtp] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [authenticatedUserId, setAuthenticatedUserId] = useState<number | null>(null);
  const [patientForm, setPatientForm] = useState({
    first_name: "", last_name: "", email: "", dob: "", gender: "male",
    street_address: "", city: "", state: "", country: "India",
    location_x: "0", location_y: "0",
    occupation: "", attendant_name: "", attendant_relationship: "",
  });
  const [patientFieldErrors, setPatientFieldErrors] = useState<FieldErrors>({});
  // Step 4 state
  const [slots, setSlots] = useState<SlotForBooking[]>([]);
  const [symptomsList, setSymptomsList] = useState<SymptomOption[]>([]);
  const [complaintsList, setComplaintsList] = useState<ComplaintOption[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [symptomCodes, setSymptomCodes] = useState<string[]>([]);
  const [symptomText, setSymptomText] = useState("");
  const [complaintsText, setComplaintsText] = useState("");
  const [recommendedTime, setRecommendedTime] = useState("");
  const [bookingFeePaid, setBookingFeePaid] = useState("");
  const [appointmentStatus, setAppointmentStatus] = useState<"accepted" | "waiting">("accepted");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { addToast } = useToast();

  // Step 1: Search patient by phone
  async function handleSearch() {
    setError("");
    setLoading(true);
    try {
      const result = await lookupPatient(phone);
      setUsers(result.users);
      setIsNewPatient(!result.found);
      setSelectedUserId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  // Step 1: Send OTP
  async function handleSendOTP() {
    setError("");
    setLoading(true);
    try {
      const result = await sendBookingOTP(phone, selectedUserId || undefined);
      setBookingId(result.bookingId);
      setStep(2);
      addToast("OTP sent to patient's phone", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Book Appointment" onClose={onClose} maxWidth="lg">
      {/* Step indicator */}
      <div data-testid="booking-step-indicator" className="flex items-center gap-2 mb-6">
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-6 ${isDone ? "bg-primary" : "bg-border"}`} />}
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                isActive ? "bg-primary text-primary-alt" :
                isDone ? "bg-primary/10 text-primary" :
                "bg-muted text-muted-alt"
              }`}>
                <span>{stepNum}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Patient Identification */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <TextField
                label="Patient Phone"
                data-testid="booking-phone"
                value={phone}
                onChange={setPhone}
                icon={<Phone size={16} />}
                placeholder="+919876543210"
              />
            </div>
            <div className="flex items-end">
              <Button data-testid="booking-search" onClick={handleSearch} disabled={loading || phone.length < 13} icon={<Search size={16} />}>
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>

          {/* Search results */}
          {users.length > 0 && (
            <div data-testid="booking-patient-radio" className="space-y-2">
              <p className="text-sm font-medium text-card-alt">Existing patients found:</p>
              {users.map((u, idx) => (
                <label
                  key={u.user_id}
                  {...(idx === 0 ? { "data-testid": "booking-patient-option" } : {})}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedUserId === u.user_id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="patient"
                    checked={selectedUserId === u.user_id}
                    onChange={() => { setSelectedUserId(u.user_id); setIsNewPatient(false); }}
                    className="accent-primary"
                  />
                  <span className="text-sm text-card-alt">{u.first_name} {u.last_name}</span>
                </label>
              ))}
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isNewPatient
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="patient"
                  checked={isNewPatient}
                  onChange={() => { setSelectedUserId(null); setIsNewPatient(true); }}
                  className="accent-primary"
                />
                <span className="text-sm text-card-alt">Register as new patient</span>
              </label>
            </div>
          )}

          {users.length === 0 && isNewPatient && (
            <div data-testid="booking-new-patient-msg" className="text-sm text-muted-alt bg-muted/50 rounded-lg px-3 py-2">
              No patient found with this phone. OTP will be sent to register a new patient.
            </div>
          )}

          {error && <p data-testid="booking-error" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

          {(selectedUserId || isNewPatient) && (
            <Button data-testid="booking-send-otp" onClick={handleSendOTP} disabled={loading} variant="primary" className="w-full">
              {loading ? "Sending OTP..." : "Send OTP to Patient"}
            </Button>
          )}
        </div>
      )}

      {/* Step 2: OTP Verification */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-alt">
            A 6-digit OTP has been sent to <strong className="text-card-alt">{phone}</strong>.
            Ask the patient to share it.
          </p>

          <OTPInput value={otp} onChange={setOtp} data-testid="booking-otp" autoFocus />

          {attemptsRemaining !== null && (
            <p data-testid="booking-attempts-warning" className="text-sm text-warning">
              Incorrect OTP. {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining.
            </p>
          )}

          {error && <p data-testid="booking-error" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

          <Button
            onClick={async () => {
              setError(""); setLoading(true);
              try {
                const result = await verifyBookingOTP(bookingId, otp);
                if (result.authenticated) {
                  setAuthenticatedUserId(result.userId || null);
                  setAttemptsRemaining(null);
                  if (result.userId) {
                    setStep(4); // existing patient → skip registration
                  } else {
                    setStep(3); // new patient → register
                  }
                  addToast("OTP verified", "success");
                }
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Verification failed";
                if (msg.includes("Maximum")) {
                  setError(msg);
                  addToast("Booking cancelled — max attempts", "error");
                } else {
                  setError(msg);
                  // Try to extract attemptsRemaining from the error response
                  try {
                    const parsed = JSON.parse((err as { message: string }).message);
                    if (parsed.attemptsRemaining != null) setAttemptsRemaining(parsed.attemptsRemaining);
                  } catch {
                    // attemptsRemaining comes from the error body, not message
                  }
                }
              } finally { setLoading(false); }
            }}
            data-testid="booking-verify-otp"
            disabled={loading || otp.length !== 6}
            variant="primary"
            className="w-full"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </Button>

          <button
            data-testid="booking-resend-otp"
            onClick={async () => {
              setError(""); setResendCooldown(60);
              try {
                const result = await sendBookingOTP(phone, selectedUserId || undefined);
                setBookingId(result.bookingId);
                setOtp("");
                setAttemptsRemaining(null);
                addToast("OTP re-sent", "success");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Resend failed");
              }
              const timer = setInterval(() => {
                setResendCooldown((c) => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; });
              }, 1000);
            }}
            disabled={resendCooldown > 0}
            className="w-full text-sm text-primary hover:underline disabled:text-muted-alt disabled:no-underline"
          >
            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
          </button>
        </div>
      )}

      {/* Step 3: Patient Registration */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-alt">
            New patient. Fill in details to create their account.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <TextField label="First Name" data-testid="booking-first-name" value={patientForm.first_name} onChange={(v) => setPatientForm(f => ({ ...f, first_name: v }))} required error={patientFieldErrors.first_name} />
            <TextField label="Last Name" data-testid="booking-last-name" value={patientForm.last_name} onChange={(v) => setPatientForm(f => ({ ...f, last_name: v }))} required error={patientFieldErrors.last_name} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-card-alt mb-1">Phone</label>
              <div className="px-3 py-2 text-sm rounded-lg bg-muted/50 border border-input text-muted-alt">{phone}</div>
            </div>
            <TextField label="Email" data-testid="booking-email" value={patientForm.email} onChange={(v) => setPatientForm(f => ({ ...f, email: v }))} error={patientFieldErrors.email} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-card-alt mb-1">Date of Birth <span className="text-destructive">*</span></label>
              <input
                data-testid="booking-dob"
                type="date"
                value={patientForm.dob}
                onChange={(e) => setPatientForm(f => ({ ...f, dob: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-card-alt"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-alt mb-1">Gender <span className="text-destructive">*</span></label>
              <select
                data-testid="booking-gender"
                value={patientForm.gender}
                onChange={(e) => setPatientForm(f => ({ ...f, gender: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-card-alt"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="others">Others</option>
              </select>
            </div>
          </div>

          <TextField label="Street Address" data-testid="booking-street" value={patientForm.street_address} onChange={(v) => setPatientForm(f => ({ ...f, street_address: v }))} required error={patientFieldErrors.street_address} />

          <div className="grid grid-cols-3 gap-3">
            <TextField label="City" data-testid="booking-city" value={patientForm.city} onChange={(v) => setPatientForm(f => ({ ...f, city: v }))} required error={patientFieldErrors.city} />
            <TextField label="State" data-testid="booking-state" value={patientForm.state} onChange={(v) => setPatientForm(f => ({ ...f, state: v }))} required error={patientFieldErrors.state} />
            <TextField label="Country" data-testid="booking-country" value={patientForm.country} onChange={(v) => setPatientForm(f => ({ ...f, country: v }))} error={patientFieldErrors.country} />
          </div>

          <TextField label="Occupation" value={patientForm.occupation} onChange={(v) => setPatientForm(f => ({ ...f, occupation: v }))} />

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Attendant/Informant Name" value={patientForm.attendant_name} onChange={(v) => setPatientForm(f => ({ ...f, attendant_name: v }))} />
            <TextField label="Relationship with Patient" value={patientForm.attendant_relationship} onChange={(v) => setPatientForm(f => ({ ...f, attendant_relationship: v }))} />
          </div>

          {error && <p data-testid="booking-error" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

          <Button
            onClick={async () => {
              setError("");
              const errs = validateForm(createUserSchema, { ...patientForm, phone } as Record<string, string>);
              setPatientFieldErrors(errs);
              if (Object.keys(errs).length > 0) return;
              setLoading(true);
              try {
                const result = await registerBookingPatient(bookingId, {
                  ...patientForm,
                  phone,
                  location_x: parseFloat(patientForm.location_x) || 0,
                  location_y: parseFloat(patientForm.location_y) || 0,
                });
                trackEvent('patient_registered');
                setAuthenticatedUserId(result.user_id);
                setStep(4);
                addToast(`Patient ${result.first_name} ${result.last_name} registered`, "success");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Registration failed");
              } finally { setLoading(false); }
            }}
            disabled={loading || !patientForm.first_name.trim() || !patientForm.last_name.trim() || !patientForm.dob || !patientForm.street_address.trim() || !patientForm.city.trim() || !patientForm.state.trim()}
            variant="primary"
            className="w-full"
          >
            {loading ? "Registering..." : "Register Patient"}
          </Button>
        </div>
      )}

      {/* Step 4: Appointment Details */}
      {step === 4 && <Step4Content
        bookingId={bookingId}
        slots={slots} setSlots={setSlots}
        symptomsList={symptomsList} setSymptomsList={setSymptomsList}
        complaintsList={complaintsList} setComplaintsList={setComplaintsList}
        selectedSlotId={selectedSlotId} setSelectedSlotId={setSelectedSlotId}
        appointmentDate={appointmentDate} setAppointmentDate={setAppointmentDate}
        symptomCodes={symptomCodes} setSymptomCodes={setSymptomCodes}
        symptomText={symptomText} setSymptomText={setSymptomText}
        complaintsText={complaintsText} setComplaintsText={setComplaintsText}
        recommendedTime={recommendedTime} setRecommendedTime={setRecommendedTime}
        bookingFeePaid={bookingFeePaid} setBookingFeePaid={setBookingFeePaid}
        appointmentStatus={appointmentStatus} setAppointmentStatus={setAppointmentStatus}
        loading={loading} setLoading={setLoading}
        error={error} setError={setError}
        addToast={addToast} onClose={onClose}
      />}
    </Modal>
  );
}

// ── Step 4 extracted to reduce nesting ──

import { componentTestSpec } from '@swasthyaseva/test-gen';

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'clinic',
  title: 'Book Appointment Modal',
  elements: {
    bookAppointmentBtn: { role: 'button', name: /Book Appointment/ },
    modal: { role: 'dialog', name: 'Book Appointment' },
    stepIndicator: { testId: 'booking-step-indicator' },
    phoneInput: { role: 'textbox', name: 'Patient Phone' },
    searchBtn: { role: 'button', name: /Search/ },
    patientRadioFirst: { testId: 'booking-patient-radio' },
    newPatientOption: { text: 'Register as new patient' },
    newPatientMessage: { testId: 'booking-new-patient-msg' },
    sendOtpBtn: { role: 'button', name: /Send OTP to Patient/ },
    otpInput: { testId: 'booking-otp' },
    verifyOtpBtn: { role: 'button', name: /Verify OTP/ },
    resendOtpBtn: { testId: 'booking-resend-otp' },
    attemptsWarning: { testId: 'booking-attempts-warning' },
    errorMsg: { testId: 'booking-error' },
    regFirstName: { testId: 'booking-first-name' },
    regLastName: { testId: 'booking-last-name' },
    regEmail: { testId: 'booking-email' },
    regDob: { testId: 'booking-dob' },
    regGenderSelect: { testId: 'booking-gender' },
    regStreetAddress: { testId: 'booking-street' },
    regCity: { testId: 'booking-city' },
    regState: { testId: 'booking-state' },
    regCountry: { testId: 'booking-country' },
    registerPatientBtn: { role: 'button', name: /Register Patient/ },

    // ── Validation error elements ──
    firstNameError: { testId: 'booking-first-name-error' },
    lastNameError: { testId: 'booking-last-name-error' },
    streetError: { testId: 'booking-street-error' },
    cityError: { testId: 'booking-city-error' },
    stateError: { testId: 'booking-state-error' },
    emailError: { testId: 'booking-email-error' },
    slotSelect: { role: 'combobox', name: 'Select Slot' },
    appointmentDateInput: { testId: 'booking-date' },
    symptomTags: { testId: 'booking-symptom-tags' },
    symptomTextInput: { role: 'textbox', name: 'Symptom Description' },
    complaintsSelect: { role: 'combobox', name: 'Complaints' },
    preferredTimeInput: { testId: 'booking-time' },
    bookingFeeInput: { testId: 'booking-fee' },
    statusRadio: { testId: 'booking-status-radio' },
    bookBtn: { role: 'button', name: /Book Appointment/ },
    bookSubmitBtn: { testId: 'booking-submit' },
  },
  flows: [
    {
      name: 'open modal and search unknown phone shows new patient option',
      steps: [
        { do: 'click', on: 'bookAppointmentBtn' },
        { expect: 'visible', on: 'modal' },
        { expect: 'visible', on: 'stepIndicator' },
        { do: 'fill', on: 'phoneInput', value: '+910000099999' },
        { do: 'click', on: 'searchBtn' },
        { do: 'waitFor', on: 'newPatientMessage' },
        { expect: 'visible', on: 'sendOtpBtn' },
      ],
    },
    {
      name: 'open modal and search existing patient shows radio list',
      steps: [
        { do: 'click', on: 'bookAppointmentBtn' },
        { expect: 'visible', on: 'modal' },
        { do: 'fill', on: 'phoneInput', value: '+910001000001' },
        { do: 'click', on: 'searchBtn' },
        { do: 'waitFor', on: 'patientRadioFirst' },
      ],
    },
    {
      name: 'send and verify OTP advances to registration',
      after: 'open modal and search unknown phone shows new patient option',
      steps: [
        { do: 'click', on: 'sendOtpBtn' },
        { expect: 'visible', on: 'otpInput' },
        { do: 'reactFill', on: 'otpInput', value: '123456' },
        { do: 'click', on: 'verifyOtpBtn' },
        { expect: 'visible', on: 'regFirstName' },
      ],
    },
    {
      name: 'wrong OTP shows error message',
      after: 'open modal and search unknown phone shows new patient option',
      steps: [
        { do: 'click', on: 'sendOtpBtn' },
        { expect: 'visible', on: 'otpInput' },
        { do: 'reactFill', on: 'otpInput', value: '000000' },
        { do: 'click', on: 'verifyOtpBtn' },
        { expect: 'visible', on: 'errorMsg' },
      ],
    },
    {
      name: 'register new patient advances to slot selection',
      after: 'send and verify OTP advances to registration',
      steps: [
        { do: 'fill', on: 'regFirstName', value: 'Test' },
        { do: 'fill', on: 'regLastName', value: 'Patient' },
        { do: 'fill', on: 'regEmail', value: 'test@example.com' },
        { do: 'fill', on: 'regDob', value: '1990-01-01' },
        { do: 'select', on: 'regGenderSelect', value: 'male' },
        { do: 'fill', on: 'regStreetAddress', value: '123 Main St' },
        { do: 'fill', on: 'regCity', value: 'Mumbai' },
        { do: 'fill', on: 'regState', value: 'Maharashtra' },
        { do: 'click', on: 'registerPatientBtn' },
        { expect: 'visible', on: 'slotSelect' },
      ],
    },
    {
      name: 'existing patient skips to slot selection step',
      after: 'open modal and search existing patient shows radio list',
      steps: [
        { do: 'click', on: 'patientRadioFirst' },
        { do: 'click', on: 'sendOtpBtn' },
        { expect: 'visible', on: 'otpInput' },
        { do: 'reactFill', on: 'otpInput', value: '123456' },
        { do: 'click', on: 'verifyOtpBtn' },
        { expect: 'visible', on: 'slotSelect' },
      ],
    },
    {
      name: 'registration without first name keeps register button disabled',
      steps: [
        { do: 'click', on: 'bookAppointmentBtn' },
        { expect: 'visible', on: 'modal' },
        { do: 'fill', on: 'phoneInput', value: '+910000088888' },
        { do: 'click', on: 'searchBtn' },
        { do: 'waitFor', on: 'newPatientMessage' },
        { do: 'click', on: 'sendOtpBtn' },
        { expect: 'visible', on: 'otpInput' },
        { do: 'reactFill', on: 'otpInput', value: '123456' },
        { do: 'click', on: 'verifyOtpBtn' },
        { expect: 'visible', on: 'regFirstName' },
        { do: 'fill', on: 'regLastName', value: 'Patient' },
        { do: 'fill', on: 'regDob', value: '1990-01-01' },
        { expect: 'disabled', on: 'registerPatientBtn' },
      ],
    },
    {
      name: 'step indicator shows progression through OTP and registration steps',
      after: 'send and verify OTP for validation',
      steps: [
        { expect: 'visible', on: 'stepIndicator' },
        { expect: 'visible', on: 'regFirstName' },
      ],
    },
    {
      name: 'resend OTP button is visible on OTP step',
      after: 'open modal and search unknown phone shows new patient option',
      steps: [
        { do: 'click', on: 'sendOtpBtn' },
        { expect: 'visible', on: 'otpInput' },
        { expect: 'visible', on: 'resendOtpBtn' },
      ],
    },
    {
      name: 'existing patient booking shows slot selection and booking form fields',
      after: 'existing patient skips to slot selection step',
      steps: [
        { expect: 'visible', on: 'slotSelect' },
        { expect: 'visible', on: 'symptomTags' },
        { expect: 'visible', on: 'symptomTextInput' },
        { expect: 'visible', on: 'complaintsSelect' },
        { expect: 'visible', on: 'preferredTimeInput' },
        { expect: 'visible', on: 'bookingFeeInput' },
        { expect: 'visible', on: 'statusRadio' },
        { expect: 'disabled', on: 'bookSubmitBtn' },
      ],
    },
    {
      name: 'booking submit button disabled without required fields',
      after: 'existing patient skips to slot selection step',
      steps: [
        { expect: 'visible', on: 'slotSelect' },
        { expect: 'disabled', on: 'bookSubmitBtn' },
        { do: 'fill', on: 'symptomTextInput', value: 'Fever and headache' },
        { expect: 'disabled', on: 'bookSubmitBtn' },
      ],
    },
    // ── Validation base flows (separate phone to avoid collision with register test) ──
    {
      name: 'open modal and search phone for validation',
      steps: [
        { do: 'click', on: 'bookAppointmentBtn' },
        { expect: 'visible', on: 'modal' },
        { do: 'fill', on: 'phoneInput', value: '+910000012345' },
        { do: 'click', on: 'searchBtn' },
        { do: 'waitFor', on: 'newPatientMessage' },
        { expect: 'visible', on: 'sendOtpBtn' },
      ],
    },
    {
      name: 'send and verify OTP for validation',
      after: 'open modal and search phone for validation',
      steps: [
        { do: 'click', on: 'sendOtpBtn' },
        { expect: 'visible', on: 'otpInput' },
        { do: 'reactFill', on: 'otpInput', value: '123456' },
        { do: 'click', on: 'verifyOtpBtn' },
        { expect: 'visible', on: 'regFirstName' },
      ],
    },
    // ── Negative: Patient registration form validation ──
    {
      name: 'empty registration form keeps register button disabled',
      after: 'send and verify OTP for validation',
      steps: [
        { do: 'fill', on: 'regFirstName', value: '' },
        { do: 'fill', on: 'regLastName', value: '' },
        { expect: 'disabled', on: 'registerPatientBtn' },
      ],
    },
    {
      name: 'first name with numbers shows error in registration',
      after: 'send and verify OTP for validation',
      steps: [
        { do: 'fill', on: 'regFirstName', value: 'John123' },
        { do: 'fill', on: 'regLastName', value: 'Doe' },
        { do: 'fill', on: 'regDob', value: '1990-01-01' },
        { do: 'fill', on: 'regStreetAddress', value: '123 Main St' },
        { do: 'fill', on: 'regCity', value: 'Mumbai' },
        { do: 'fill', on: 'regState', value: 'Maharashtra' },
        { do: 'click', on: 'registerPatientBtn' },
        { expect: 'visible', on: 'firstNameError' },
        { expect: 'text', on: 'firstNameError', value: 'Only alphabetic characters are allowed' },
      ],
    },
    {
      name: 'invalid email format shows error in registration',
      after: 'send and verify OTP for validation',
      steps: [
        { do: 'fill', on: 'regFirstName', value: 'John' },
        { do: 'fill', on: 'regLastName', value: 'Doe' },
        { do: 'fill', on: 'regDob', value: '1990-01-01' },
        { do: 'fill', on: 'regEmail', value: 'notanemail' },
        { do: 'fill', on: 'regStreetAddress', value: '123 Main St' },
        { do: 'fill', on: 'regCity', value: 'Mumbai' },
        { do: 'fill', on: 'regState', value: 'Maharashtra' },
        { do: 'click', on: 'registerPatientBtn' },
        { expect: 'visible', on: 'emailError' },
        { expect: 'text', on: 'emailError', value: 'Invalid email format' },
      ],
    },
    {
      name: 'street address with special chars shows error in registration',
      after: 'send and verify OTP for validation',
      steps: [
        { do: 'fill', on: 'regFirstName', value: 'John' },
        { do: 'fill', on: 'regLastName', value: 'Doe' },
        { do: 'fill', on: 'regDob', value: '1990-01-01' },
        { do: 'fill', on: 'regStreetAddress', value: '123 Main St @#$' },
        { do: 'fill', on: 'regCity', value: 'Mumbai' },
        { do: 'fill', on: 'regState', value: 'Maharashtra' },
        { do: 'click', on: 'registerPatientBtn' },
        { expect: 'visible', on: 'streetError' },
        { expect: 'text', on: 'streetError', value: 'Must not contain special characters except , . -' },
      ],
    },
  ],
});

function Step4Content({
  bookingId, slots, setSlots, symptomsList, setSymptomsList,
  complaintsList, setComplaintsList, selectedSlotId, setSelectedSlotId,
  appointmentDate, setAppointmentDate, symptomCodes, setSymptomCodes,
  symptomText, setSymptomText, complaintsText, setComplaintsText,
  recommendedTime, setRecommendedTime, bookingFeePaid, setBookingFeePaid,
  appointmentStatus, setAppointmentStatus, loading, setLoading,
  error, setError, addToast, onClose,
}: {
  bookingId: string;
  slots: SlotForBooking[]; setSlots: (s: SlotForBooking[]) => void;
  symptomsList: SymptomOption[]; setSymptomsList: (s: SymptomOption[]) => void;
  complaintsList: ComplaintOption[]; setComplaintsList: (c: ComplaintOption[]) => void;
  selectedSlotId: number | null; setSelectedSlotId: (id: number | null) => void;
  appointmentDate: string; setAppointmentDate: (d: string) => void;
  symptomCodes: string[]; setSymptomCodes: (c: string[]) => void;
  symptomText: string; setSymptomText: (t: string) => void;
  complaintsText: string; setComplaintsText: (t: string) => void;
  recommendedTime: string; setRecommendedTime: (t: string) => void;
  bookingFeePaid: string; setBookingFeePaid: (f: string) => void;
  appointmentStatus: "accepted" | "waiting"; setAppointmentStatus: (s: "accepted" | "waiting") => void;
  loading: boolean; setLoading: (l: boolean) => void;
  error: string; setError: (e: string) => void;
  addToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  // Load slots, symptoms, complaints on mount
  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    Promise.all([getClinicSlots(), getSymptoms(), getComplaints()]).then(([s, sy, co]) => {
      setSlots(s.slots);
      setSymptomsList(sy.symptoms);
      setComplaintsList(co.complaints);
    }).catch(console.error);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSlot = slots.find((s) => s.slot_id === selectedSlotId);

  function handleSlotChange(slotId: number) {
    setSelectedSlotId(slotId);
    const slot = slots.find((s) => s.slot_id === slotId);
    if (slot) {
      setBookingFeePaid(String(slot.booking_fee || 0));
      setAppointmentDate("");
    }
  }

  const { trackEvent: track } = useAnalytics();

  async function handleBook() {
    setError(""); setLoading(true);
    try {
      const symptomNames = symptomCodes.map(code => {
        const match = symptomsList.find(s => s.symptom_code === code);
        return match ? match.name : code;
      });
      const fullSymptomText = [symptomNames.join('|||'), symptomText].filter(Boolean).join('|||');
      await createBookingAppointment({
        bookingId,
        slot_id: selectedSlotId,
        appointment_date: appointmentDate,
        symptom_code: symptomCodes[0] || "OTHER",
        symptom_text: fullSymptomText,
        complaints: complaintsText || null,
        recommended_time: recommendedTime || null,
        booking_fee_paid: bookingFeePaid ? parseInt(bookingFeePaid, 10) : 0,
        appointment_status: appointmentStatus,
      });
      track('booking_created', { slotId: selectedSlotId, appointmentDate });
      addToast("Appointment booked successfully!", "success");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      {/* Slot selector */}
      <SelectField
        label="Select Slot"
        value={selectedSlotId != null ? String(selectedSlotId) : ""}
        onChange={(val) => handleSlotChange(Number(val))}
        options={slots.map((s) => ({
          value: String(s.slot_id),
          label: `${s.doctor_name || `Doctor #${s.doctor_id}`} — ${s.slot_day} ${formatSlotTime(s.slot_start)}-${formatSlotTime(s.slot_end)} — ₹${s.slot_fee}`,
        }))}
        required
      />

      {/* Date picker — filtered to matching day */}
      {selectedSlot && (
        <div>
          <label className="block text-sm font-medium text-card-alt mb-1">
            Appointment Date <span className="text-destructive">*</span> <span className="text-xs text-muted-alt">({selectedSlot.slot_day} only)</span>
          </label>
          <input
            data-testid="booking-date"
            type="date"
            value={appointmentDate}
            onChange={(e) => setAppointmentDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-card-alt"
          />
        </div>
      )}

      {/* Symptoms */}
      <div data-testid="booking-symptom-tags">
        <label className="block text-sm font-medium text-card-alt mb-1">Symptoms <span className="text-destructive">*</span></label>
        <TagMultiSelect
          options={symptomsList.map((s) => ({ value: s.symptom_code, label: s.name }))}
          selected={symptomCodes}
          onChange={setSymptomCodes}
          placeholder="Select or type symptoms..."
          allowCustom
        />
      </div>

      <TextField
        label="Symptom Description"
        value={symptomText}
        onChange={setSymptomText}
        placeholder="Describe symptoms in detail..."
      />

      {/* Complaints */}
      <SelectField
        label="Complaints"
        value={complaintsText}
        onChange={setComplaintsText}
        options={complaintsList.map((c) => ({ value: c.name, label: c.name }))}
      />

      {/* Time + Fee */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-card-alt mb-1">Preferred Time (optional)</label>
          <input
            data-testid="booking-time"
            type="time"
            value={recommendedTime}
            onChange={(e) => setRecommendedTime(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-card-alt"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-card-alt mb-1">Booking Fee (₹)</label>
          <input
            data-testid="booking-fee"
            type="number"
            value={bookingFeePaid}
            onChange={(e) => setBookingFeePaid(e.target.value)}
            min="0"
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-card-alt"
          />
          {selectedSlot && (
            <p className="text-xs text-muted-alt mt-1">
              Default: ₹{selectedSlot.booking_fee} (from slot configuration)
            </p>
          )}
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-card-alt mb-1">Appointment Status</label>
        <div data-testid="booking-status-radio" className="flex gap-4">
          {(["accepted", "waiting"] as const).map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="booking_status"
                checked={appointmentStatus === s}
                onChange={() => setAppointmentStatus(s)}
                className="accent-primary"
              />
              <span className="text-card-alt capitalize">{s}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <p data-testid="booking-error" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

      <Button
        data-testid="booking-submit"
        onClick={handleBook}
        disabled={loading || !selectedSlotId || !appointmentDate || symptomCodes.length === 0}
        variant="primary"
        className="w-full"
      >
        {loading ? "Booking..." : "Book Appointment"}
      </Button>
    </div>
  );
}
