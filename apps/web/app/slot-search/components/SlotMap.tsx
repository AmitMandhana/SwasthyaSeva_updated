"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { componentTestSpec } from '@swasthyaseva/test-gen';
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PublicSlotClinic } from "@/lib/api";

// Blue pin — user location
const userLocationIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Green pin — clinic result (per-index for testId)
function clinicMarkerIcon(idx: number, highlighted: boolean) {
  const size = highlighted ? 30 : 25;
  const height = highlighted ? 44 : 37;
  const fill = highlighted ? "#16a34a" : "#22c55e";
  const stroke = highlighted ? "#14532d" : "#15803d";
  const r = highlighted ? 4.5 : 4;
  return L.divIcon({
    className: "",
    html: `<div data-testid="slot-map-clinic-marker-${idx}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${size}" height="${height}">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="${r}" fill="white"/>
  </svg></div>`,
    iconSize: [size, height],
    iconAnchor: [Math.floor(size / 2), height],
    popupAnchor: [1, -height + 3],
  });
}

function MapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

type Props = {
  center: [number, number];
  clinics: PublicSlotClinic[];
  highlightedClinicId: number | null;
  onMarkerClick: (clinicId: number) => void;
};

export default function SlotMap({ center, clinics, highlightedClinicId, onMarkerClick }: Props) {
  return (
    <div data-testid="slot-map-container" style={{ height: "100%", width: "100%" }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenter center={center} />

        {/* User location marker */}
        <Marker position={center} icon={userLocationIcon}>
          <Popup>Your location</Popup>
        </Marker>

        {/* Clinic markers */}
        {clinics.map((clinic, idx) => (
          <Marker
            key={clinic.clinic_id}
            position={[clinic.location_y, clinic.location_x]}
            icon={clinicMarkerIcon(idx, highlightedClinicId === clinic.clinic_id)}
            eventHandlers={{
              click: () => onMarkerClick(clinic.clinic_id),
            }}
          >
            <Popup>
              <div data-testid={`slot-map-clinic-popup`}>
                <strong>{clinic.clinic_name || "Clinic"}</strong>
                <br />
                {clinic.street_address}, {clinic.city}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/slot-search',
  app: 'web',
  title: 'Slot Map',
  elements: {
    useMyLocationBtn: { role: 'button', name: 'Use My Location' },
    slotResults: { testId: 'slot-search-results' },
    mapContainer: { testId: 'slot-map-container' },
    userLocationPopup: { text: 'Your location' },
    firstClinicMarker: { testId: 'slot-map-clinic-marker-0' },
    clinicPopup: { testId: 'slot-map-clinic-popup' },
  },
  flows: [
    {
      name: 'render map with user location marker',
      steps: [
        { do: 'click', on: 'useMyLocationBtn' },
        { do: 'waitFor', on: 'mapContainer' },
        { expect: 'visible', on: 'mapContainer' },
      ],
    },
    {
      name: 'show clinic popup on marker click',
      after: 'render map with user location marker',
      steps: [
        { do: 'waitFor', on: 'slotResults' },
        { do: 'click', on: 'firstClinicMarker' },
        { expect: 'visible', on: 'clinicPopup' },
      ],
    },
  ],
});
