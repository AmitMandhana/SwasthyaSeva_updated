"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { MapPin, Loader2, Search } from "lucide-react";
import { TagMultiSelect, TabPillMultiSelect, useAnalytics, formatSlotTime, Button } from "@swasthyaseva/ui";
import {
  searchSlots,
  getTags,
  type PublicSlot,
  type Tag,
  type SearchParams,
} from "@/lib/api";
import dynamic from "next/dynamic";
import Link from "next/link";
import SlotBookingModal from "./components/SlotBookingModal";
import { testSpec } from '@swasthyaseva/test-gen';
import { DEV_MODE, TURNSTILE_SITE_KEY } from "@/lib/env";

// Lazy load map (leaflet needs window)
const SlotMap = dynamic(() => import("./components/SlotMap"), { ssr: false });

// ── Constants ──

const TIME_RANGES = [
  { key: "MIDNIGHT", label: "12am-3am" },
  { key: "EARLY_MORNING", label: "3am-6am" },
  { key: "MORNING", label: "6am-9am" },
  { key: "DAY", label: "9am-12pm" },
  { key: "NOON", label: "12pm-3pm" },
  { key: "AFTERNOON", label: "3pm-6pm" },
  { key: "EVENING", label: "6pm-9pm" },
  { key: "NIGHT", label: "9pm-12am" },
];

// Exponential scale ×3
const PRICE_STOPS = [0, 50, 150, 450, 1350, 4050];
const DISTANCE_STOPS = [0, 2, 6, 18, 54, 162];

type SortMode = "distance" | "price_asc" | "price_desc";

export default function SlotSearchPage() {
  // Location
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Tags
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [nameQuery, setNameQuery] = useState("");

  // Filters
  const [priceIdx, setPriceIdx] = useState(PRICE_STOPS.length - 1);
  const [distanceIdx, setDistanceIdx] = useState(DISTANCE_STOPS.length - 1);
  const [selectedTimeRanges, setSelectedTimeRanges] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("distance");

  // Results
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  // Turnstile
  const isDevMode = DEV_MODE;
  const turnstileWidgetRef = useRef<TurnstileInstance | null>(null);
  const turnstileTokenRef = useRef<string | null>(isDevMode ? 'dev-bypass' : null);
  const [turnstileReady, setTurnstileReady] = useState(isDevMode);

  // Map highlight
  const [highlightedClinicId, setHighlightedClinicId] = useState<number | null>(null);
  const [bookingSlot, setBookingSlot] = useState<PublicSlot | null>(null);

  const { trackEvent } = useAnalytics();

  // Debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load tags and request location on mount
  useEffect(() => {
    getTags().then(setAllTags).catch(console.error);
    useMyLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search logic ──
  const doSearch = useCallback(async () => {
    if (userLat == null || userLng == null || !turnstileTokenRef.current) return;

    setLoading(true);
    setError("");
    try {
      const params: SearchParams = {
        lat: userLat,
        lng: userLng,
        maxDistanceKm: DISTANCE_STOPS[distanceIdx],
        maxFee: PRICE_STOPS[priceIdx],
      };
      if (selectedTags.length > 0) params.tags = selectedTags;
      if (selectedTimeRanges.length > 0) params.timeRanges = selectedTimeRanges;
      if (selectedDays.length > 0) params.days = selectedDays;
      if (nameQuery.trim()) params.name = nameQuery.trim();

      const results = await searchSlots(params, turnstileTokenRef.current);
      setSlots(results);
      setSearched(true);
      trackEvent('slot_search', { results: results.length, tags: selectedTags });
      turnstileWidgetRef.current?.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [userLat, userLng, selectedTags, priceIdx, distanceIdx, selectedTimeRanges, selectedDays, nameQuery]);

  // Debounced search on filter changes (only if location and token are ready)
  useEffect(() => {
    if (userLat == null || userLng == null || !turnstileReady) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(doSearch, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [doSearch, userLat, userLng, turnstileReady]);

  // ── Sort results ──
  const sortedSlots = [...slots].sort((a, b) => {
    if (sortMode === "price_asc") return a.slot_fee - b.slot_fee;
    if (sortMode === "price_desc") return b.slot_fee - a.slot_fee;
    return a.distance_km - b.distance_km;
  });

  // ── Location handlers ──
  function useMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleMapPick(lat: number, lng: number) {
    setUserLat(lat);
    setUserLng(lng);
    setShowMapPicker(false);
  }

  // ── Unique clinics for map ──
  const clinicMarkers = Array.from(
    new Map(
      sortedSlots.map((s) => [s.clinic.clinic_id, s.clinic])
    ).values()
  );

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-background overflow-hidden">
      {/* Turnstile (invisible) — skipped in dev mode */}
      {!isDevMode && (
        <Turnstile
          ref={turnstileWidgetRef}
          siteKey={TURNSTILE_SITE_KEY}
          options={{ action: "slot-search", refreshExpired: "auto", size: "invisible" }}
          onSuccess={(token) => { turnstileTokenRef.current = token; setTurnstileReady(true); }}
        />
      )}

      {/* Top bar: Tags + Location */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Tags + Location in one row */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center max-w-xs w-full">
              <Search size={14} className="absolute left-2.5 text-muted-alt pointer-events-none" />
              <input
                type="text"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="Doctor or clinic name..."
                maxLength={100}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background text-card-alt placeholder:text-muted-alt focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <span data-testid="slot-search-tag-filter">
              <TagMultiSelect
                options={allTags.map((t) => ({ value: t.tag_code, label: t.name }))}
                selected={selectedTags}
                onChange={setSelectedTags}
                placeholder="Filter by tags..."
                className="flex-1 max-w-sm"
              />
            </span>
            <Button
              onClick={useMyLocation}
              size="sm"
              icon={<MapPin size={14} />}
              className="shrink-0"
            >
              Use My Location
            </Button>
            <button
              data-testid="btn-pick-map"
              onClick={() => setShowMapPicker(true)}
              title="Pick on Map"
              aria-label="Pick on Map"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border bg-card text-card-alt hover:bg-muted transition-colors shrink-0"
            >
              <MapPin size={14} /> Pick on Map
            </button>
          </div>
        </div>
      </div>

      {/* Main content — 3-column layout: filters | map | results */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 py-4 overflow-hidden min-h-0">
        {/* Left sidebar — filters (scrollable) */}
        <aside className="w-full lg:w-56 shrink-0 space-y-5 overflow-y-auto">
          {/* Price range */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-card-alt">Max Price</label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-alt">₹</span>
                <input
                  data-testid="slot-search-max-price-input"
                  type="number"
                  min={0}
                  value={PRICE_STOPS[priceIdx]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const closest = PRICE_STOPS.reduce((ci, s, i) => Math.abs(s - v) < Math.abs(PRICE_STOPS[ci] - v) ? i : ci, 0);
                    setPriceIdx(closest);
                  }}
                  className="w-16 px-1.5 py-0.5 text-xs rounded border border-border bg-background text-card-alt text-right"
                />
              </div>
            </div>
            <input
              data-testid="slot-search-max-price-slider"
              type="range"
              min={0}
              max={PRICE_STOPS.length - 1}
              value={priceIdx}
              onChange={(e) => setPriceIdx(Number(e.target.value))}
              className="w-full mt-1 accent-primary"
            />
            <div className="flex justify-between text-sm text-muted-alt">
              <span>₹0</span>
              <span>₹{PRICE_STOPS[PRICE_STOPS.length - 1]}+</span>
            </div>
          </div>

          {/* Distance range */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-card-alt">Max Distance</label>
              <div className="flex items-center gap-1">
                <input
                  data-testid="slot-search-max-distance-input"
                  type="number"
                  min={0}
                  value={DISTANCE_STOPS[distanceIdx]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const closest = DISTANCE_STOPS.reduce((ci, s, i) => Math.abs(s - v) < Math.abs(DISTANCE_STOPS[ci] - v) ? i : ci, 0);
                    setDistanceIdx(closest);
                  }}
                  className="w-16 px-1.5 py-0.5 text-xs rounded border border-border bg-background text-card-alt text-right"
                />
                <span className="text-xs text-muted-alt">km</span>
              </div>
            </div>
            <input
              data-testid="slot-search-max-distance-slider"
              type="range"
              min={0}
              max={DISTANCE_STOPS.length - 1}
              value={distanceIdx}
              onChange={(e) => setDistanceIdx(Number(e.target.value))}
              className="w-full mt-1 accent-primary"
            />
            <div className="flex justify-between text-sm text-muted-alt">
              <span>0 km</span>
              <span>{DISTANCE_STOPS[DISTANCE_STOPS.length - 1]}+ km</span>
            </div>
          </div>

          <hr className="border-border" />

          {/* Time of day */}
          <div>
            <span className="text-sm font-medium text-card-alt">Time of Day</span>
            <TabPillMultiSelect
              options={TIME_RANGES}
              selected={selectedTimeRanges}
              onChange={setSelectedTimeRanges}
              className="mt-2"
            />
          </div>

          {/* Day of week */}
          <div>
            <span className="text-sm font-medium text-card-alt">Day of Week</span>
            <TabPillMultiSelect
              options={[
                { key: "SUN", label: "Sun" },
                { key: "MON", label: "Mon" },
                { key: "TUE", label: "Tue" },
                { key: "WED", label: "Wed" },
                { key: "THU", label: "Thu" },
                { key: "FRI", label: "Fri" },
                { key: "SAT", label: "Sat" },
              ]}
              selected={selectedDays}
              onChange={setSelectedDays}
              className="mt-2"
            />
          </div>

          <hr className="border-border" />

          {/* Sort by */}
          <div>
            <span className="text-sm font-medium text-card-alt">Sort By</span>
            <div className="mt-2 space-y-1">
              {([
                ["distance", "Distance"],
                ["price_asc", "Price (Low → High)"],
                ["price_desc", "Price (High → Low)"],
              ] as [SortMode, string][]).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    data-testid={`sort-${val}`}
                    type="radio"
                    name="sort"
                    checked={sortMode === val}
                    onChange={() => setSortMode(val)}
                    className="accent-primary"
                  />
                  <span className="text-card-alt">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Center — map (hidden when booking modal is open to prevent z-index bleed) */}
        <div className={`flex-1 min-h-0 min-w-0 flex flex-col ${bookingSlot ? 'invisible' : ''}`}>
          {userLat != null && userLng != null ? (
            <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-border">
              <SlotMap
                center={[userLat, userLng]}
                clinics={clinicMarkers}
                highlightedClinicId={highlightedClinicId}
                onMarkerClick={setHighlightedClinicId}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-alt text-sm">
              Waiting for location access. If blocked, try picking on map.
            </div>
          )}
        </div>

        {/* Right panel — results (scrollable) */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col min-h-0 overflow-hidden">
          {/* Status */}
          {loading && (
            <div className="flex items-center gap-2 text-muted-alt text-sm py-2">
              <Loader2 size={16} className="animate-spin" /> Searching...
            </div>
          )}
          {error && <p className="text-destructive text-sm py-2">{error}</p>}
          {!loading && searched && sortedSlots.length === 0 && (
            <p className="text-muted-alt text-sm py-2">No slots found matching your criteria.</p>
          )}

          {/* Slot cards */}
          {sortedSlots.length > 0 && (
            <div data-testid="slot-search-results" className="flex-1 overflow-y-auto space-y-3 pr-1">
              {sortedSlots.map((slot, slotIdx) => (
                <div
                  key={slot.slot_id}
                  data-testid={`slot-card-${slotIdx}`}
                  className={`p-3 rounded-lg border transition-colors ${
                    highlightedClinicId === slot.clinic.clinic_id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                  onMouseEnter={() => setHighlightedClinicId(slot.clinic.clinic_id)}
                  onMouseLeave={() => setHighlightedClinicId(null)}
                >
                  {/* Doctor info */}
                  <div className="flex items-start gap-3 mb-2">
                    {slot.doctor.pfp_link ? (
                      <img
                        src={slot.doctor.pfp_link}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-alt text-sm font-bold shrink-0">
                        {slot.doctor.first_name[0]}
                        {slot.doctor.last_name[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/doctor/${slot.doctor.username}`}
                        data-testid={`slot-doctor-link-${slotIdx}`}
                        className="text-sm font-semibold text-card-alt truncate block hover:text-primary hover:underline transition-colors"
                      >
                        Dr. {slot.doctor.first_name} {slot.doctor.last_name}
                      </Link>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {slot.doctor.base_degree_name && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            {slot.doctor.base_degree_name.length > 25
                              ? slot.doctor.base_degree_name.split(" ").map(w => w[0]).join("")
                              : slot.doctor.base_degree_name}
                          </span>
                        )}
                        {[slot.doctor.tag_1_name, slot.doctor.tag_2_name, slot.doctor.tag_3_name]
                          .filter(Boolean)
                          .map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs px-1.5 py-0.5 rounded bg-accent/15 text-accent"
                            >
                              {tag}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Clinic info */}
                  <Link
                    href={`/clinic/${slot.clinic.username}`}
                    data-testid={`slot-clinic-link-${slotIdx}`}
                    className="text-xs text-muted-alt truncate block hover:text-primary hover:underline transition-colors"
                  >
                    {slot.clinic.clinic_name || "Clinic"} — {slot.clinic.street_address}, {slot.clinic.city}
                  </Link>

                  {/* Slot details + Book button */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <div className="text-sm">
                      <span className="font-medium text-card-alt">{slot.slot_day}</span>
                      <span className="text-muted-alt ml-1">
                        {formatSlotTime(slot.slot_start)}–{formatSlotTime(slot.slot_end)}
                      </span>
                      <div className="mt-0.5">
                        <span className="text-sm font-bold text-primary">₹{slot.slot_fee}</span>
                        <span className="text-xs text-muted-alt ml-2">{slot.distance_km} km</span>
                      </div>
                    </div>
                    <Button
                      data-testid={`slot-book-btn-${slotIdx}`}
                      onClick={() => { trackEvent('slot_selected', { doctor: slot.doctor?.username, clinic: slot.clinic?.username, fee: slot.slot_fee }); setBookingSlot(slot); }}
                      size="xs"
                      className="shrink-0"
                    >
                      Book
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking info modal */}
      {bookingSlot && (
        <SlotBookingModal slot={bookingSlot} onClose={() => setBookingSlot(null)} />
      )}

      {/* Map picker modal */}
      {showMapPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-medium text-card-alt">Pick your location</span>
              <button
                onClick={() => setShowMapPicker(false)}
                className="text-muted-alt hover:text-card-alt"
              >
                Close
              </button>
            </div>
            <div data-testid="location-picker-container" className="h-96">
              <LocationPicker onPick={handleMapPick} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Location picker sub-component (lazy loaded inside modal) ──
const LocationPicker = dynamic(() => import("./components/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center text-muted-alt">Loading map...</div>,
});

export const __test = testSpec({
  route: '/slot-search',
  auth: 'optional',
  app: 'web',
  title: 'Slot Search',
  elements: {
    nameSearchInput: { role: 'textbox', name: 'Doctor or clinic name...' },
    tagFilter: { testId: 'slot-search-tag-filter' },
    tagFilterCombobox: { testId: 'tag-filter-combobox' },
    firstTagOption: { testId: 'tag-option-PED' },
    useMyLocationBtn: { role: 'button', name: 'Use My Location' },
    pickOnMapBtn: { role: 'button', name: 'Pick on Map' },
    maxPriceInput: { testId: 'slot-search-max-price-input' },
    maxDistanceInput: { testId: 'slot-search-max-distance-input' },
    sortByPriceAsc: { testId: 'sort-price_asc' },
    sortByPriceDesc: { testId: 'sort-price_desc' },
    slotResults: { testId: 'slot-search-results' },
    firstBookBtn: { testId: 'slot-book-btn-0' },
    firstDoctorLink: { testId: 'slot-doctor-link-0' },
    firstClinicLink: { testId: 'slot-clinic-link-0' },
    bookAppointmentHeading: { text: 'Book Appointment' },
    mapPickerModal: { text: 'Pick your location' },
    mapPickerCloseBtn: { role: 'button', name: 'Close' },
    noResults: { text: 'No slots found matching your criteria.' },
    locationWaiting: { text: 'Waiting for location access. If blocked, try picking on map.' },
    locationPickerContainer: { testId: 'location-picker-container' },
  },
  flows: [],
  flowTree: {
    name: 'slot search',
    steps: [],
    children: [
      {
        name: 'search with geolocation (web-02)',
        steps: [
          { do: 'click', on: 'useMyLocationBtn' },
          { do: 'waitFor', on: 'slotResults' },
          { expect: 'hidden', on: 'locationWaiting' },
          { expect: 'visible', on: 'slotResults' },
          { expect: 'countMin', on: 'firstBookBtn', value: 1 },
        ],
        children: [
          {
            name: 'results are visible',
            steps: [],
          },
          {
            name: 'adjust price and distance filters (web-04)',
            steps: [
              { do: 'fill', on: 'maxPriceInput', value: '2000' },
              { do: 'waitFor', on: 'slotResults' },
              { expect: 'visible', on: 'slotResults' },
            ],
          },
          {
            name: 'search by doctor or clinic name (web-05)',
            steps: [
              { do: 'fill', on: 'nameSearchInput', value: 'Rahul' },
              { do: 'waitFor', on: 'slotResults' },
              { expect: 'visible', on: 'slotResults' },
            ],
          },
          {
            name: 'change sort order (web-06)',
            steps: [
              { do: 'click', on: 'sortByPriceAsc' },
              { expect: 'checked', on: 'sortByPriceAsc' },
            ],
          },
          {
            name: 'open booking modal (web-07)',
            steps: [
              { do: 'click', on: 'firstBookBtn' },
              { do: 'waitFor', on: 'bookAppointmentHeading' },
              { expect: 'visible', on: 'bookAppointmentHeading' },
            ],
          },
          {
            name: 'navigate to doctor profile (web-08)',
            steps: [
              { do: 'click', on: 'firstDoctorLink' },
              { expect: 'urlContains', value: '/doctor/' },
            ],
          },
          {
            name: 'navigate to clinic profile (web-09)',
            steps: [
              { do: 'click', on: 'firstClinicLink' },
              { expect: 'urlContains', value: '/clinic/' },
            ],
          },
          {
            name: 'sort by price descending',
            steps: [
              { do: 'jsClick', on: 'sortByPriceDesc' },
              { expect: 'visible', on: 'slotResults' },
            ],
          },
          {
            name: 'empty results with aggressive filters',
            steps: [
              { do: 'fill', on: 'maxPriceInput', value: '0' },
              { do: 'fill', on: 'maxDistanceInput', value: '0' },
              { do: 'waitFor', on: 'noResults' },
              { expect: 'visible', on: 'noResults' },
            ],
          },
          {
            name: 'adjust distance filter and verify results',
            steps: [
              { do: 'fill', on: 'maxDistanceInput', value: '6' },
              { do: 'waitFor', on: 'slotResults' },
              { expect: 'visible', on: 'slotResults' },
            ],
          },
          {
            name: 'select tag filter and verify filtered results',
            steps: [
              { do: 'click', on: 'tagFilterCombobox' },
              { do: 'waitFor', on: 'firstTagOption' },
              { do: 'click', on: 'firstTagOption' },
              { do: 'waitFor', on: 'slotResults' },
              { expect: 'visible', on: 'slotResults' },
            ],
          },
        ],
      },
      {
        name: 'pick location on map (web-02)',
        steps: [
          { do: 'click', on: 'pickOnMapBtn' },
          { do: 'waitFor', on: 'mapPickerModal' },
          { expect: 'visible', on: 'mapPickerModal' },
          { expect: 'visible', on: 'locationPickerContainer' },
        ],
        children: [
          {
            name: 'map picker modal opens and shows container',
            steps: [],
          },
          {
            name: 'close map picker modal',
            steps: [
              { do: 'click', on: 'mapPickerCloseBtn' },
              { expect: 'hidden', on: 'mapPickerModal' },
            ],
          },
        ],
      },
    ],
  },
});
