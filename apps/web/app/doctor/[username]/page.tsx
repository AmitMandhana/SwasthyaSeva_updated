"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Shield, Phone, GraduationCap, ArrowLeft, Clock, MapPin, Calendar, Search, Building2 } from "lucide-react";
import Link from "next/link";
import { getDoctorProfile, getDoctorSchedule, type DoctorProfile, type DoctorScheduleSlot } from "@/lib/api";
import { useAnalytics } from "@swasthyaseva/ui";
import { testSpec } from '@swasthyaseva/test-gen';

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS: Record<string, string> = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' };

function formatTime(interval: number) {
  const h = Math.floor(interval / 2);
  const m = (interval % 2) * 30;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function DoctorProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { trackEvent } = useAnalytics();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [slots, setSlots] = useState<DoctorScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    Promise.all([
      getDoctorProfile(username),
      getDoctorSchedule(username),
    ])
      .then(([doc, schedule]) => {
        setDoctor(doc);
        setSlots(schedule);
        trackEvent('doctor_profile_viewed', { doctor: username });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-4xl w-full mx-auto px-4">
          <div className="bg-card rounded-xl overflow-hidden animate-pulse">
            <div className="h-32 bg-muted" />
            <div className="px-6 pt-16 pb-6 space-y-3">
              <div className="h-6 bg-muted rounded w-48" />
              <div className="h-4 bg-muted rounded w-72" />
              <div className="flex gap-2 mt-4">
                <div className="h-6 bg-muted rounded-full w-24" />
                <div className="h-6 bg-muted rounded-full w-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-alt">{error || "Doctor not found"}</p>
          <Link href="/slot-search" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft size={14} /> Back to search
          </Link>
        </div>
      </div>
    );
  }

  const tags = [doctor.tag_1_name, doctor.tag_2_name, doctor.tag_3_name].filter(Boolean);
  const qualifications = [doctor.base_degree_name, doctor.postgrad_name, doctor.super_spec_name].filter(Boolean);

  const slotsByDay = DAY_ORDER
    .map(day => ({ day, slots: slots.filter(s => s.day === day) }))
    .filter(g => g.slots.length > 0);

  const uniqueClinics = Array.from(
    new Map(slots.map(s => [s.clinic.clinic_id, s.clinic])).values()
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <Link href="/slot-search" className="inline-flex items-center gap-1.5 text-sm text-muted-alt hover:text-card-alt transition-colors">
            <ArrowLeft size={14} /> Back to search
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column — Profile card */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl overflow-hidden border border-border sticky top-6">
              {/* Banner */}
              <div className="relative h-24 bg-gradient-to-r from-primary/20 to-primary/5">
                {doctor.banner_link && (
                  <img src={doctor.banner_link} alt="" className="w-full h-full object-cover" />
                )}
              </div>

              {/* Avatar + Info */}
              <div className="relative px-5 pb-5">
                <div className="absolute -top-10 left-5">
                  {doctor.pfp_link ? (
                    <img src={doctor.pfp_link} alt="" className="w-20 h-20 rounded-full object-cover border-3 border-card shadow-lg" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-muted border-3 border-card shadow-lg flex items-center justify-center text-lg font-bold text-muted-alt">
                      {doctor.first_name[0]}{doctor.last_name[0]}
                    </div>
                  )}
                </div>

                <div className="pt-12">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-card-alt">
                      Dr. {doctor.first_name} {doctor.last_name}
                    </h1>
                    {doctor.verified_doctor && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                        <Shield size={11} /> Verified
                      </span>
                    )}
                  </div>

                  {doctor.bio && (
                    <p className="text-sm text-muted-alt mt-2 leading-relaxed whitespace-pre-line">{doctor.bio}</p>
                  )}

                  {doctor.phone && (
                    <p className="text-sm text-muted-alt flex items-center gap-1.5 mt-3">
                      <Phone size={14} className="text-primary" />
                      {doctor.phone.replace(/(\+\d{2})\d{6}(\d{4})/, '$1******$2')}
                    </p>
                  )}
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {tags.map(tag => (
                      <span key={tag} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/15 text-accent">{tag}</span>
                    ))}
                  </div>
                )}

                {/* Qualifications */}
                {qualifications.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h3 className="text-xs font-semibold text-muted-alt uppercase tracking-wide mb-2">Qualifications</h3>
                    <div className="space-y-1.5">
                      {qualifications.map(q => (
                        <div key={q} className="flex items-center gap-2 text-sm text-card-alt">
                          <GraduationCap size={13} className="text-primary shrink-0" />
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extra qualifications */}
                {doctor.extra_qualifications.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {doctor.extra_qualifications.map(eq => (
                      <span key={eq.qualification_code} className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-alt">{eq.name}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column — Schedule, Clinics */}
          <div className="lg:col-span-2 space-y-6">

            {/* Weekly Schedule */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-primary" />
                <h2 className="text-lg font-semibold text-card-alt">Weekly Schedule</h2>
              </div>

              {slotsByDay.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-alt gap-2">
                  <Clock size={24} className="opacity-40" />
                  <p className="text-sm">No scheduled slots available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {slotsByDay.map(({ day, slots: daySlots }) => (
                    <div key={day}>
                      <h3 className="text-sm font-semibold text-card-alt mb-2">{DAY_LABELS[day] || day}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {daySlots.map(s => (
                          <div key={s.slot_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-card-alt">
                                {formatTime(s.start)} – {formatTime(s.end)}
                              </p>
                              <p className="text-xs text-muted-alt flex items-center gap-1 mt-0.5">
                                <Building2 size={11} /> {s.clinic.name}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-primary shrink-0">₹{s.fee}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clinics */}
            {uniqueClinics.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 size={18} className="text-primary" />
                  <h2 className="text-lg font-semibold text-card-alt">Available At</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {uniqueClinics.map((c, i) => (
                    <Link
                      key={c.clinic_id}
                      href={`/clinic/${c.username}`}
                      data-testid={`clinic-link-${i}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 size={18} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-card-alt truncate">{c.name}</p>
                        <p className="text-xs text-muted-alt flex items-center gap-1">
                          <MapPin size={10} /> {c.city}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Book CTA — phone only */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 md:hidden z-30">
        <Link
          href={`/slot-search`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-alt font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <Search size={16} /> Book Appointment
        </Link>
      </div>

      {/* Desktop Book CTA — shown in sidebar on large screens, hidden on small */}
      <div className="hidden md:block fixed bottom-8 right-8 z-30">
        <Link
          href={`/slot-search`}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-alt font-semibold text-sm shadow-lg hover:bg-primary/90 transition-all hover:shadow-xl"
        >
          <Search size={16} /> Book Appointment
        </Link>
      </div>
    </div>
  );
}

export const __test = testSpec({
  route: '/doctor/e2e_doc_primary',
  auth: 'none',
  app: 'web',
  title: 'Doctor Profile',
  elements: {
    backToSearch: { role: 'link', name: /Back to search/ },
    doctorName: { role: 'heading', name: /Dr\./ },
    verifiedBadge: { text: 'Verified' },
    qualificationsHeading: { text: 'Qualifications' },
    scheduleHeading: { text: 'Weekly Schedule' },
    clinicsHeading: { text: 'Available At' },
    bookCta: { role: 'link', name: /Book Appointment/ },
    firstClinicLink: { testId: 'clinic-link-0' },
  },
  flows: [],
  flowTree: {
    name: 'render doctor profile',
    steps: [
      { do: 'waitFor', on: 'doctorName' },
      { expect: 'visible', on: 'doctorName' },
      { expect: 'text', on: 'doctorName', value: 'Dr. E2E Doctor' },
    ],
    children: [
      {
        name: 'profile sections visible',
        steps: [
          { expect: 'visible', on: 'verifiedBadge' },
          { expect: 'visible', on: 'qualificationsHeading' },
          { expect: 'visible', on: 'scheduleHeading' },
          { expect: 'visible', on: 'clinicsHeading' },
        ],
      },
      {
        name: 'book appointment CTA navigates to slot search',
        steps: [
          { expect: 'visible', on: 'bookCta' },
          { do: 'click', on: 'bookCta' },
          { expect: 'urlContains', value: '/slot-search' },
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
        name: 'clinic link navigates to clinic profile',
        steps: [
          { expect: 'visible', on: 'clinicsHeading' },
          { do: 'click', on: 'firstClinicLink' },
          { expect: 'urlContains', value: '/clinic/' },
        ],
      },
    ],
  },
});
