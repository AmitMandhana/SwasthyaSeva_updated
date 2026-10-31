"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Shield, Phone, MapPin, FileText, Building2, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { getClinicProfile, submitInquiry, type ClinicProfile } from "@/lib/api";
import { Input } from "@swasthyaseva/ui";
import { testSpec } from '@swasthyaseva/test-gen';

export default function ClinicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [clinic, setClinic] = useState<ClinicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    getClinicProfile(username)
      .then(setClinic)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-3xl w-full mx-auto px-4">
          <div data-testid="clinic-loading-skeleton" className="bg-card rounded-xl overflow-hidden animate-pulse">
            <div className="h-48 bg-muted" />
            <div className="px-6 pt-16 pb-6 space-y-3">
              <div className="h-6 bg-muted rounded w-48" />
              <div className="h-4 bg-muted rounded w-72" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p data-testid="clinic-error-message" className="text-lg text-muted-alt">{error || "Clinic not found"}</p>
          <Link
            href="/slot-search"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft size={14} /> Back to search
          </Link>
        </div>
      </div>
    );
  }

  const addressParts = [clinic.street_address, clinic.city, clinic.state].filter(Boolean);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/slot-search"
          className="inline-flex items-center gap-1.5 text-sm text-muted-alt hover:text-card-alt mb-4 transition-colors"
        >
          <ArrowLeft size={14} /> Back to search
        </Link>

        <div className="bg-card rounded-xl overflow-hidden">
          {/* Banner */}
          <div data-testid="clinic-banner" className="relative h-48 bg-gradient-to-r from-primary/20 to-primary/5">
            {clinic.banner_link && (
              <img
                src={clinic.banner_link}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Profile header */}
          <div className="relative px-6 pb-4">
            <div className="absolute -top-14 left-6" data-testid="clinic-profile-image">
              {clinic.pfp_link ? (
                <img
                  src={clinic.pfp_link}
                  alt=""
                  className="w-28 h-28 rounded-full object-cover border-4 border-card shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-muted border-4 border-card shadow-lg flex items-center justify-center">
                  <Building2 size={32} className="text-muted-alt" />
                </div>
              )}
            </div>

            <div className="pt-16">
              <div className="flex items-center gap-2">
                <h1 data-testid="clinic-name" className="text-2xl font-bold text-card-alt">
                  {clinic.clinic_name || "Clinic"}
                </h1>
                {clinic.verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                    <Shield size={12} /> Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-alt mt-0.5">
                {addressParts.join(", ") || "—"}
              </p>
            </div>
          </div>

          {/* Contact & Details */}
          <div className="px-6 pb-4 space-y-2">
            {clinic.phone && (
              <p className="text-sm text-muted-alt flex items-center gap-2">
                <Phone size={14} className="text-primary" /> {clinic.phone}
              </p>
            )}
            {clinic.license_no && (
              <p className="text-sm text-muted-alt flex items-center gap-2">
                <FileText size={14} className="text-primary" /> Reg. No.{" "}
                {clinic.license_no}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="px-6 pb-6">
            <h3 className="text-sm font-semibold text-card-alt mb-2">
              Location
            </h3>
            <div className="space-y-1 text-sm text-muted-alt">
              {clinic.street_address && (
                <p className="flex items-center gap-2">
                  <MapPin size={14} className="text-primary shrink-0" />{" "}
                  {clinic.street_address}
                </p>
              )}
              <p>
                {[clinic.city, clinic.state, clinic.pincode]
                  .filter(Boolean)
                  .join(", ")}
                {clinic.country && clinic.country !== "India"
                  ? `, ${clinic.country}`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Inquiry Form */}
        <InquiryForm clinicId={clinic.clinic_id} />
      </div>
    </div>
  );
}

export const __test = testSpec({
  route: '/clinic/e2e_clinic_primary',
  auth: 'none',
  app: 'web',
  title: 'Clinic Profile',
  elements: {
    backToSearch: { role: 'link', name: /Back to search/ },
    bannerImage: { testId: 'clinic-banner' },
    profileImage: { testId: 'clinic-profile-image' },
    clinicName: { testId: 'clinic-name' },
    locationHeading: { role: 'heading', name: 'Location' },
    inquiryFormHeading: { role: 'heading', name: 'Contact This Clinic' },
    inquiryNameInput: { role: 'textbox', name: 'Your name' },
    inquiryPhoneInput: { role: 'textbox', name: 'Phone number' },
    inquirySymptomsInput: { role: 'textbox', name: 'Describe your symptoms (optional)' },
    submitInquiryBtn: { role: 'button', name: 'Submit Inquiry' },
    inquirySuccessMessage: { text: 'Inquiry submitted successfully!' },
    verifiedBadge: { text: 'Verified' },
  },
  flows: [],
  flowTree: {
    name: 'render clinic profile',
    steps: [
      { do: 'waitFor', on: 'clinicName' },
      { expect: 'visible', on: 'clinicName' },
      { expect: 'visible', on: 'bannerImage' },
      { expect: 'visible', on: 'locationHeading' },
    ],
    children: [
      {
        name: 'profile and contact sections visible',
        steps: [
          { expect: 'visible', on: 'profileImage' },
          { expect: 'visible', on: 'inquiryFormHeading' },
          { expect: 'visible', on: 'inquiryNameInput' },
          { expect: 'visible', on: 'inquiryPhoneInput' },
          { expect: 'visible', on: 'inquirySymptomsInput' },
          { expect: 'visible', on: 'submitInquiryBtn' },
        ],
      },
      {
        name: 'inquiry form',
        steps: [
          { expect: 'visible', on: 'inquiryFormHeading' },
        ],
        children: [
          {
            name: 'submit valid inquiry shows success and hides form',
            steps: [
              { do: 'fill', on: 'inquiryNameInput', value: 'Test Patient' },
              { do: 'fill', on: 'inquiryPhoneInput', value: '9999999999' },
              { do: 'fill', on: 'inquirySymptomsInput', value: 'Fever and headache' },
              { do: 'click', on: 'submitInquiryBtn' },
              { do: 'waitFor', on: 'inquirySuccessMessage' },
              { expect: 'visible', on: 'inquirySuccessMessage' },
              { expect: 'hidden', on: 'submitInquiryBtn' },
            ],
          },
          {
            name: 'submit without required fields stays on form',
            steps: [
              { do: 'fill', on: 'inquiryNameInput', value: '' },
              { do: 'click', on: 'submitInquiryBtn' },
              { expect: 'visible', on: 'submitInquiryBtn' },
            ],
          },
        ],
      },
      {
        name: 'back to search navigates to slot search',
        steps: [
          { do: 'click', on: 'backToSearch' },
          { expect: 'urlContains', value: '/slot-search' },
        ],
      },
      {
        name: 'verified badge visible for verified clinic',
        steps: [
          { expect: 'visible', on: 'verifiedBadge' },
        ],
      },
    ],
  },
});

function InquiryForm({ clinicId }: { clinicId: number }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [symptom, setSymptom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { setError("Name and phone are required"); return; }
    setError(""); setSubmitting(true);
    try {
      await submitInquiry({ clinic_id: clinicId, patient_name: name.trim(), patient_phone: phone.trim(), symptom_text: symptom.trim() || undefined });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-6 bg-card rounded-xl border border-border p-6 text-center">
        <p className="text-success font-medium">Inquiry submitted successfully!</p>
        <p className="text-sm text-muted-alt mt-1">The clinic will contact you soon.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-card rounded-xl border border-border p-6">
      <h3 className="text-sm font-semibold text-card-alt mb-4">Contact This Clinic</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required
        />
        <Input
          type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" required
        />
        <textarea
          value={symptom} onChange={(e) => setSymptom(e.target.value)} placeholder="Describe your symptoms (optional)" rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-card-alt placeholder:text-muted-alt resize-none"
        />
        {error && <p data-testid="clinic-inquiry-error" className="text-sm text-destructive">{error}</p>}
        <button
          type="submit" disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-alt hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Send size={14} /> {submitting ? "Submitting..." : "Submit Inquiry"}
        </button>
      </form>
    </div>
  );
}
