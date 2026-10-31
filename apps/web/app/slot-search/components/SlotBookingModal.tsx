"use client";

import { Phone, X, Stethoscope, Clock, MapPin } from "lucide-react";
import { componentTestSpec } from '@swasthyaseva/test-gen';
import { formatSlotTime } from "@swasthyaseva/ui";
import type { PublicSlot } from "@/lib/api";

export default function SlotBookingModal({
  slot,
  onClose,
}: {
  slot: PublicSlot;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl bg-card border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-card-alt">Book Appointment</h2>
          <button data-testid="booking-modal-close" onClick={onClose} className="p-1 rounded-md text-muted-alt hover:text-card-alt hover:bg-muted transition-colors" aria-label="Close booking modal">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Doctor info */}
          <div className="flex items-center gap-3">
            {slot.doctor.pfp_link ? (
              <img src={slot.doctor.pfp_link} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-alt font-bold">
                {slot.doctor.first_name[0]}{slot.doctor.last_name[0]}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-card-alt">
                Dr. {slot.doctor.first_name} {slot.doctor.last_name}
              </p>
              {slot.doctor.base_degree_name && (
                <p className="text-xs text-muted-alt">{slot.doctor.base_degree_name}</p>
              )}
            </div>
          </div>

          {/* Slot details */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-card-alt">
              <Clock size={14} className="text-primary" />
              <span className="font-medium">{slot.slot_day}</span>
              <span className="text-muted-alt">
                {formatSlotTime(slot.slot_start)} – {formatSlotTime(slot.slot_end)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-card-alt">
              <Stethoscope size={14} className="text-primary" />
              <span>Consultation Fee: <strong>₹{slot.slot_fee}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-card-alt">
              <MapPin size={14} className="text-primary" />
              <span>{slot.clinic.clinic_name || "Clinic"} — {slot.clinic.street_address}, {slot.clinic.city}</span>
            </div>
          </div>

          {/* Call to action */}
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-alt">
              To book this appointment, please call the clinic. The receptionist will assist you with the booking.
            </p>

            <a
              data-testid="booking-modal-call-link"
              href={`tel:${slot.clinic.phone}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-base font-semibold bg-primary text-primary-alt hover:opacity-90 transition-opacity"
            >
              <Phone size={18} />
              Call {slot.clinic.phone}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/slot-search',
  app: 'web',
  title: 'Slot Booking Modal',
  elements: {
    useMyLocationBtn: { role: 'button', name: 'Use My Location' },
    slotResults: { testId: 'slot-search-results' },
    firstBookBtn: { testId: 'slot-book-btn-0' },
    heading: { text: 'Book Appointment' },
    consultationFee: { text: /Consultation Fee/ },
    callClinicLink: { testId: 'booking-modal-call-link' },
    ctaMessage: { text: /please call the clinic/ },
    closeBtn: { testId: 'booking-modal-close' },
  },
  flows: [
    {
      name: 'open modal',
      steps: [
        { do: 'click', on: 'useMyLocationBtn' },
        { do: 'waitFor', on: 'slotResults' },
        { do: 'click', on: 'firstBookBtn' },
        { do: 'waitFor', on: 'heading' },
        { expect: 'visible', on: 'heading' },
      ],
    },
    {
      name: 'view modal content',
      after: 'open modal',
      steps: [
        { expect: 'visible', on: 'consultationFee' },
        { expect: 'visible', on: 'callClinicLink' },
        { expect: 'visible', on: 'ctaMessage' },
      ],
    },
    {
      name: 'close modal via close button',
      after: 'open modal',
      steps: [
        { expect: 'visible', on: 'heading' },
        { do: 'click', on: 'closeBtn' },
        { expect: 'hidden', on: 'heading' },
      ],
    },
  ],
});
