"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { componentTestSpec } from '@swasthyaseva/test-gen';
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type Props = {
  onPick: (lat: number, lng: number) => void;
};

export default function LocationPicker({ onPick }: Props) {
  const [pin, setPin] = useState<[number, number] | null>(null);

  function handleClick(lat: number, lng: number) {
    setPin([lat, lng]);
    onPick(lat, lng);
  }

  // Default center: India
  const defaultCenter: [number, number] = [20.5937, 78.9629];

  return (
    <div data-testid="location-picker-map" style={{ height: "100%", width: "100%" }}>
      <MapContainer
        center={defaultCenter}
        zoom={5}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={handleClick} />
        {pin && <Marker position={pin} icon={markerIcon} />}
      </MapContainer>
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/slot-search',
  app: 'web',
  title: 'Location Picker Map',
  elements: {
    pickOnMapBtn: { role: 'button', name: 'Pick on Map' },
    mapPickerModal: { text: 'Pick your location' },
    mapContainer: { testId: 'location-picker-map' },
    tileLayer: { testId: 'location-picker-container' },
    marker: { testId: 'location-picker-map' },
    mapPickerCloseBtn: { role: 'button', name: 'Close' },
  },
  flows: [
    {
      name: 'open map picker',
      steps: [
        { do: 'click', on: 'pickOnMapBtn' },
        { do: 'waitFor', on: 'mapPickerModal' },
        { expect: 'visible', on: 'mapPickerModal' },
      ],
    },
    {
      name: 'render map centered on India',
      after: 'open map picker',
      steps: [
        { do: 'waitFor', on: 'mapContainer' },
        { expect: 'visible', on: 'mapContainer' },
      ],
    },
    {
      name: 'close map picker',
      after: 'render map centered on India',
      steps: [
        { do: 'click', on: 'mapPickerCloseBtn' },
        { expect: 'hidden', on: 'mapPickerModal' },
      ],
    },
  ],
});
