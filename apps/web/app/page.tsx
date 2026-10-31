'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, ArrowRight, Shield, Stethoscope, Building2, Clock, MapPin, Star, ChevronDown, Calendar, FileText, Activity, Users, BarChart3, ClipboardList, Pill, Heart } from "lucide-react";
import Link from "next/link";
import { Mascot } from "@swasthyaseva/ui";
import { LottieAnimation, LOTTIE_URLS } from './components/Illustrations';
import { testSpec } from '@swasthyaseva/test-gen';

/* ─── Scroll progress hook for a sticky container ─── */
function useScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    function onScroll() {
      const el = ref.current;
      if (!el) return;
      // Total scrollable distance = container height - one viewport
      const totalScroll = el.offsetHeight - window.innerHeight;
      if (totalScroll <= 0) return;
      // How far we've scrolled past the container's top edge
      const scrolled = window.scrollY - el.offsetTop;
      setProgress(Math.max(0, Math.min(1, scrolled / totalScroll)));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [ref]);
  return progress;
}

/* ─── Mouse glow ─── */
function useMouseGlow() {
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('.mouse-glow');
    if (!target) return;
    const rect = (target as HTMLElement).getBoundingClientRect();
    (target as HTMLElement).style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    (target as HTMLElement).style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);
}

/* ─── Helper: map progress range to 0-1 ─── */
function rangeProgress(progress: number, start: number, end: number) {
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return (progress - start) / (end - start);
}

/* ─── Helper: interpolate with easing ─── */
function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ─── Scene data ─── */
const scenes = [
  {
    role: "Patient",
    icon: Search,
    title: "Priya needs a doctor",
    subtitle: "It's 9 PM. Her child has a fever. She opens SwasthyaSeva.",
    steps: [
      "Searches for pediatricians nearby",
      "Filters by slots available tomorrow morning",
      "Books a 9:30 AM appointment in 30 seconds",
      "Gets instant confirmation with directions",
    ],

    features: [
      { icon: Calendar, label: "Appointments", desc: "Upcoming & past visits" },
      { icon: FileText, label: "Prescriptions", desc: "Digital records" },
      { icon: Heart, label: "Medical History", desc: "All in one place" },
      { icon: Activity, label: "Health Analytics", desc: "Track your vitals" },
    ],
    cta: { label: "Try it yourself", href: "/slot-search" },
  },
  {
    role: "Doctor",
    icon: Stethoscope,
    title: "Dr. Mehta starts his day",
    subtitle: "8:45 AM. He opens his dashboard to see today's patients.",
    steps: [
      "Reviews the queue — 12 patients today",
      "Opens the child's record and past prescriptions",
      "Examines, diagnoses, writes a digital prescription",
      "Prescription instantly available to patient",
    ],

    features: [
      { icon: Users, label: "Patient Queue", desc: "Today's appointments" },
      { icon: ClipboardList, label: "Consultation", desc: "Vitals, diagnosis, Rx" },
      { icon: Pill, label: "Prescriptions", desc: "Write & manage digitally" },
      { icon: FileText, label: "Medical Records", desc: "Full patient history" },
    ],
    cta: { label: "Doctor Portal", href: "http://localhost:3002/login" },
  },
  {
    role: "Clinic",
    icon: Building2,
    title: "CityHealth manages it all",
    subtitle: "The admin monitors operations from one screen.",
    steps: [
      "Views all appointments across doctors",
      "Checks revenue and patient analytics",
      "Manages schedules and slot availability",
      "Reviews audit logs for compliance",
    ],

    features: [
      { icon: Calendar, label: "Appointments", desc: "Across all doctors" },
      { icon: BarChart3, label: "Analytics", desc: "Revenue & patient data" },
      { icon: Users, label: "Lead Generation", desc: "Convert inquiries" },
      { icon: Shield, label: "Audit Logs", desc: "Compliance & security" },
    ],
    cta: { label: "Clinic Portal", href: "http://localhost:3003/login" },
  },
];

const stats = [
  { icon: MapPin, label: "Clinics", value: "50+" },
  { icon: Star, label: "Verified Doctors", value: "200+" },
  { icon: Clock, label: "Avg. Booking", value: "<1 min" },
];

/* ─── Scroll Sections ─── */
// Layout: Hero starts visible. Scrolling fades it out and cycles scenes.
// 0.00-0.10  Hero visible (static, no animation needed)
// 0.10-0.15  Hero fades out
// 0.15-0.38  Scene 1 (Patient)
// 0.38-0.61  Scene 2 (Doctor)
// 0.61-0.84  Scene 3 (Clinic)
// 0.84-0.92  Security
// 0.92-1.00  CTA + Footer

export default function Home() {
  useMouseGlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(containerRef);

  // Hero: fully visible at 0, fades out 10-15%
  const heroFadeOut = ease(rangeProgress(progress, 0.10, 0.15));

  // Scene progresses
  const sceneRanges: [number, number][] = [
    [0.15, 0.38],
    [0.38, 0.61],
    [0.61, 0.84],
  ];

  // Security + CTA
  const secP = ease(rangeProgress(progress, 0.84, 0.90));
  const ctaP = ease(rangeProgress(progress, 0.90, 0.96));
  const footerP = ease(rangeProgress(progress, 0.96, 1.0));

  return (
    <div ref={containerRef} style={{ height: '500vh' }} className="relative">
      {/* Sticky viewport */}
      <div className="sticky top-16 overflow-hidden bg-background" style={{ height: 'calc(100vh - 64px)' }}>

        {/* ═══ HERO ═══ */}
        <div
          className="absolute inset-0 flex items-center bg-dot-grid transition-none"
          style={{
            opacity: 1 - heroFadeOut,
            transform: `scale(${1 + heroFadeOut * 0.08})`,
            pointerEvents: heroFadeOut > 0.8 ? 'none' : 'auto',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 70% 60% at 70% 40%, oklch(0.6 0.15 250 / 0.07), transparent 70%)' }}
          />
          <div className="relative max-w-6xl mx-auto px-6 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-sm font-medium text-primary uppercase tracking-wider block">
                  Healthcare, simplified
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mt-3">
                  Your health,{' '}
                  <span className="text-primary">your schedule</span>
                </h1>
                <p className="text-lg text-muted-alt mt-5 max-w-lg leading-relaxed">
                  Find verified doctors near you, book appointments in seconds, and keep your medical records in one place.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link href="/slot-search" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold bg-primary text-primary-alt hover:bg-primary/90 transition-colors">
                    <Search size={18} /> Find Doctors
                  </Link>
                  <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold border-2 border-border text-foreground hover:border-primary hover:text-primary transition-colors">
                    Sign In <ArrowRight size={18} />
                  </Link>
                </div>
                <div className="mt-10 flex gap-8">
                  {stats.map((s) => (
                    <div key={s.label} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <s.icon size={18} className="text-primary" />
                      </div>
                      <div>
                        <p data-testid={`stat-value-${s.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="text-lg font-bold text-foreground leading-tight">{s.value}</p>
                        <p data-testid={`stat-label-${s.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="text-xs text-muted-alt">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden lg:flex items-center justify-center">
                <LottieAnimation url={LOTTIE_URLS.doctorNotepad} style={{ width: 420, height: 420 }} />
              </div>
            </div>

            {/* Scroll hint */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-muted-alt animate-bounce">
              <p className="text-xs mb-1">Scroll to explore</p>
              <ChevronDown size={20} />
            </div>
          </div>
        </div>

        {/* ═══ TRUST STRIP ═══ */}
        <div
          className="absolute inset-x-0 bottom-0 border-t border-border bg-card/50 transition-none"
          style={{
            opacity: heroFadeOut > 0.3 && progress < 0.18 ? Math.min(1, (heroFadeOut - 0.3) * 3) : progress >= 0.18 ? 1 - ease(rangeProgress(progress, 0.18, 0.22)) : 0,
            transform: `translateY(${heroFadeOut < 0.3 ? 60 : 0}px)`,
            pointerEvents: 'none',
          }}
        >
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-center gap-8 text-muted-alt text-sm">
            <span className="font-medium">Trusted by clinics across India</span>
            <span className="hidden sm:inline text-border">|</span>
            <span>OTP-verified</span>
            <span className="hidden sm:inline text-border">|</span>
            <span>Encrypted records</span>
            <span className="hidden sm:inline text-border">|</span>
            <span>24/7 booking</span>
          </div>
        </div>

        {/* ═══ STORY SCENES ═══ */}
        {scenes.map((scene, i) => {
          const [start, end] = sceneRanges[i];
          const sceneP = rangeProgress(progress, start, end);
          const exitP = ease(rangeProgress(sceneP, 0.8, 1));
          const isActive = sceneP > 0.05 && sceneP < 0.95;
          const isOdd = i % 2 === 1;

          // Parallax offsets — text moves slower, cards move faster
          const parallaxBase = rangeProgress(sceneP, 0.1, 0.8);
          const textParallax = parallaxBase * -20;
          const cardParallax = parallaxBase * -35;

          return (
            <div
              key={scene.role}
              className="absolute inset-0 flex items-center transition-none"
              style={{
                opacity: isActive ? (sceneP >= 0.8 ? 1 - exitP : 1) : 0,
                pointerEvents: isActive ? 'auto' : 'none',
              }}
            >
              <div className="max-w-6xl mx-auto px-6 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  {/* Text side — stagger via CSS animation-delay */}
                  <div
                    className={isOdd ? 'lg:order-2' : ''}
                    style={{ transform: `translateY(${textParallax}px)` }}
                  >
                    <div className={`flex items-center gap-3 mb-4 ${isActive ? 'animate-[fade-in-up_0.5s_ease-out_0ms_forwards]' : 'opacity-0'}`}>
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <scene.icon size={20} className="text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                        {scene.role}
                      </span>
                    </div>
                    <h3 className={`text-3xl font-bold text-foreground mb-2 ${isActive ? 'animate-[fade-in-up_0.5s_ease-out_50ms_forwards]' : 'opacity-0'}`}>
                      {scene.title}
                    </h3>
                    <p className={`text-card-alt/70 mb-8 italic ${isActive ? 'animate-[fade-in-up_0.5s_ease-out_100ms_forwards]' : 'opacity-0'}`}>
                      {scene.subtitle}
                    </p>

                    {/* Steps — stagger 100ms apart */}
                    <div className="space-y-4 mb-8">
                      {scene.steps.map((step, j) => (
                        <div
                          key={j}
                          className={`flex gap-4 items-start ${isActive ? 'animate-[fade-in-up_0.4s_ease-out_forwards]' : 'opacity-0'}`}
                          style={{ animationDelay: isActive ? `${200 + j * 100}ms` : undefined }}
                        >
                          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {j + 1}
                          </span>
                          <p className="text-sm text-card-alt leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>

                    <div className={isActive ? 'animate-[fade-in-up_0.4s_ease-out_700ms_forwards]' : 'opacity-0'}>
                      <Link
                        href={scene.cta.href}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-alt hover:bg-primary/90 transition-colors"
                      >
                        {scene.cta.label} <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>

                  {/* Feature showcase — stagger 100ms apart, parallax offset */}
                  <div
                    className={`flex items-center justify-center ${isOdd ? 'lg:order-1' : ''}`}
                    style={{ transform: `translateY(${cardParallax}px)` }}
                  >
                    <div className="mouse-glow rounded-2xl border border-border/60 bg-card p-6 w-full max-w-sm">
                      <p className={`text-xs text-muted-alt uppercase tracking-wider mb-4 ${isActive ? 'animate-[fade-in-up_0.4s_ease-out_300ms_forwards]' : 'opacity-0'}`}>
                        {scene.role} features
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {scene.features.map((f, fi) => (
                          <div
                            key={f.label}
                            className={`rounded-xl bg-background border border-border/40 p-3 flex flex-col gap-1.5 ${isActive ? 'animate-[fade-in-up_0.4s_ease-out_forwards]' : 'opacity-0'}`}
                            style={{ animationDelay: isActive ? `${400 + fi * 100}ms` : undefined }}
                          >
                            <f.icon size={18} className="text-primary" />
                            <span className="text-sm font-medium text-card-alt">{f.label}</span>
                            <span className="text-xs text-muted-alt">{f.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scene indicator dots */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                {scenes.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${idx === i ? 'bg-primary' : 'bg-border'}`}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* ═══ SECURITY ═══ */}
        <div
          className="absolute inset-0 flex items-center transition-none"
          style={{
            opacity: secP > 0 ? (progress < 0.92 ? secP : 1 - ease(rangeProgress(progress, 0.92, 0.95))) : 0,
            pointerEvents: secP > 0.3 && progress < 0.93 ? 'auto' : 'none',
          }}
        >
          <div className="max-w-6xl mx-auto px-6 w-full">
            <div className="max-w-2xl" style={{ transform: `translateY(${(1 - secP) * 30}px)` }}>
                <Shield size={24} className="text-primary mb-3" />
                <h2 className="text-2xl font-bold text-foreground mb-3">Your data stays between you and your doctor</h2>
                <p className="text-muted-alt leading-relaxed mb-6">
                  Every record is encrypted. Every login is OTP-verified. Role-based permissions ensure only authorized eyes see your health data.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {["OTP verification", "Encrypted records", "Role-based access", "Audit logging"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-card-alt">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {item}
                    </div>
                  ))}
                </div>
            </div>
          </div>
        </div>

        {/* ═══ CTA + FOOTER ═══ */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center transition-none"
          style={{
            opacity: ctaP,
            pointerEvents: ctaP > 0.3 ? 'auto' : 'none',
          }}
        >
          <div className="max-w-6xl mx-auto px-6 w-full">
            <div
              className="rounded-2xl border border-border bg-card/50 p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8 mouse-glow"
              style={{ transform: `scale(${0.9 + ctaP * 0.1})` }}
            >
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-foreground">Ready to find your doctor?</h2>
                <p className="text-muted-alt mt-2 max-w-md">
                  Hundreds of verified doctors. Book in under a minute.
                </p>
              </div>
              <Link
                href="/slot-search"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold bg-primary text-primary-alt hover:bg-primary/90 transition-colors shrink-0"
              >
                Get Started <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div
            className="absolute bottom-0 inset-x-0 border-t border-border bg-card/30"
            style={{ opacity: footerP }}
          >
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-alt">
                <Mascot size={20} />
                <span>SwasthyaSeva</span>
              </div>
              <p className="text-xs text-muted-alt">
                Made with care in India
              </p>
            </div>
          </div>
        </div>

        {/* ═══ SCROLL PROGRESS BAR ═══ */}
        <div className="absolute top-16 right-4 w-1 h-32 bg-border/30 rounded-full overflow-hidden z-50">
          <div
            className="w-full bg-primary rounded-full transition-none"
            style={{ height: `${progress * 100}%` }}
          />
        </div>

      </div>
    </div>
  );
}

export const __test = testSpec({
  route: '/',
  auth: 'none',
  app: 'web',
  title: 'Landing Page',
  elements: {
    heroHeading: { role: 'heading', name: 'Your health, your schedule' },
    heroSubtext: { text: 'Find verified doctors near you' },
    findDoctorsBtn: { role: 'link', name: 'Find Doctors' },
    signInBtn: { role: 'link', name: 'Sign In' },
    clinicsStatValue: { testId: 'stat-value-clinics' },
    clinicsStatLabel: { testId: 'stat-label-clinics' },
    verifiedDoctorsStatValue: { testId: 'stat-value-verified-doctors' },
    verifiedDoctorsStatLabel: { testId: 'stat-label-verified-doctors' },
    avgBookingStatValue: { testId: 'stat-value-avg-booking' },
    avgBookingStatLabel: { testId: 'stat-label-avg-booking' },
    scrollHint: { text: 'Scroll to explore' },
    healthcareLabel: { text: 'Healthcare, simplified' },
  },
  flows: [],
  flowTree: {
    name: 'render landing page',
    steps: [
      { do: 'waitFor', on: 'heroHeading' },
      { expect: 'visible', on: 'heroHeading' },
      { expect: 'visible', on: 'heroSubtext' },
      { expect: 'visible', on: 'healthcareLabel' },
      { expect: 'visible', on: 'scrollHint' },
    ],
    children: [
      {
        name: 'Find Doctors CTA navigates to slot search',
        steps: [
          { expect: 'visible', on: 'findDoctorsBtn' },
          { do: 'click', on: 'findDoctorsBtn' },
          { expect: 'urlContains', value: '/slot-search' },
        ],
      },
      {
        name: 'Sign In CTA navigates to login',
        steps: [
          { do: 'click', on: 'signInBtn' },
          { expect: 'urlContains', value: '/login' },
        ],
      },
      {
        name: 'stats section shows correct values',
        steps: [
          { expect: 'visible', on: 'clinicsStatValue' },
          { expect: 'text', on: 'clinicsStatValue', value: '50+' },
          { expect: 'visible', on: 'clinicsStatLabel' },
          { expect: 'visible', on: 'verifiedDoctorsStatValue' },
          { expect: 'text', on: 'verifiedDoctorsStatValue', value: '200+' },
          { expect: 'visible', on: 'verifiedDoctorsStatLabel' },
          { expect: 'visible', on: 'avgBookingStatValue' },
          { expect: 'text', on: 'avgBookingStatValue', value: '<1 min' },
          { expect: 'visible', on: 'avgBookingStatLabel' },
        ],
      },
    ],
  },
});
