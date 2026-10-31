"use client";

import { useState, useRef, useEffect } from "react";
import { Link, MapPin } from "lucide-react";
import { getAddressByMapUrl, reverseGeocode } from "../../../lib/api";
import { componentTestSpec } from '@swasthyaseva/test-gen';

const EMBED_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

function parseGoogleMapsLink(url: string): { lat: string; lng: string } | null {
  try {
    const pinMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (pinMatch) return { lat: pinMatch[1], lng: pinMatch[2] };
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };
    const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) return { lat: qMatch[1], lng: qMatch[2] };
    const llMatch = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (llMatch) return { lat: llMatch[1], lng: llMatch[2] };
  } catch {}
  return null;
}

interface LocationPickerProps {
  lat: string;
  lng: string;
  onSelect: (lat: string, lng: string) => void;
  onGmapsExtract?: (data: { lat: string; lng: string; street: string; city: string; state: string; pincode: string }) => void;
}

export default function LocationPicker({ lat, lng, onSelect, onGmapsExtract }: LocationPickerProps) {
  const [gmapsLink, setGmapsLink] = useState("");
  const [gmapsError, setGmapsError] = useState("");
  const [gmapsFetching, setGmapsFetching] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasCoords = lat !== "" && lng !== "";

  useEffect(() => {
    if (hasCoords && iframeRef.current && !iframeRef.current.src) {
      iframeRef.current.src = `https://www.google.com/maps/embed/v1/place?key=${EMBED_API_KEY}&q=${lat},${lng}&zoom=17`;
    }
  }, [hasCoords, lat, lng]);

  function setEmbedSrc(src: string) {
    if (iframeRef.current) iframeRef.current.src = src;
  }

  async function handleGmapsLink(val: string) {
    setGmapsLink(val);
    setGmapsError("");
    if (!val.trim()) return;
    setGmapsFetching(true);
    try {
      if (val.includes("goo.gl") || val.includes("maps.app.goo.gl")) {
        const result = await getAddressByMapUrl(val);
        if (result.lat && result.lng) {
          // Extract place name from resolved URL for embed query
          const nameMatch = result.resolved?.match(/\/maps\/place\/([^/@?]+)/);
          const pName = nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, ' ')) : null;
          setEmbedSrc(`https://www.google.com/maps/embed/v1/place?key=${EMBED_API_KEY}&q=${encodeURIComponent(pName ? `${pName} ${result.lat},${result.lng}` : `${result.lat},${result.lng}`)}&zoom=17`);
          if (onGmapsExtract) {
            onGmapsExtract({ lat: result.lat, lng: result.lng, street: result.street ?? "", city: result.city ?? "", state: result.state ?? "", pincode: result.pincode ?? "" });
          } else {
            onSelect(result.lat, result.lng);
          }
          return;
        }
        const coords = parseGoogleMapsLink(result.resolved);
        if (!coords) { setGmapsError("Could not extract coordinates from this link."); return; }
        setEmbedSrc(`https://www.google.com/maps/embed/v1/place?key=${EMBED_API_KEY}&q=${coords.lat},${coords.lng}&zoom=17`);
        if (onGmapsExtract) {
          const addr = await reverseGeocode(coords.lat, coords.lng).catch(() => ({ street: "", city: "", state: "", pincode: "" }));
          onGmapsExtract({ lat: coords.lat, lng: coords.lng, ...addr });
        } else {
          onSelect(coords.lat, coords.lng);
        }
        return;
      }
      const coords = parseGoogleMapsLink(val);
      if (!coords) { setGmapsError("Could not extract coordinates from this link."); return; }
      setEmbedSrc(`https://www.google.com/maps/embed/v1/place?key=${EMBED_API_KEY}&q=${coords.lat},${coords.lng}&zoom=17`);
      if (onGmapsExtract) {
        const addr = await reverseGeocode(coords.lat, coords.lng).catch(() => ({ street: "", city: "", state: "", pincode: "" }));
        onGmapsExtract({ lat: coords.lat, lng: coords.lng, ...addr });
      } else {
        onSelect(coords.lat, coords.lng);
      }
    } catch {
      setGmapsError("Failed to resolve link");
    } finally {
      setGmapsFetching(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-card-alt mb-1">
          <Link size={12} className="inline mr-1" />
          Google Maps Link
        </label>
        <div className="relative">
          <input
            type="text"
            data-testid="gmaps-link-input"
            value={gmapsLink}
            onChange={(e) => handleGmapsLink(e.target.value)}
            disabled={gmapsFetching}
            placeholder="Paste a Google Maps URL (full or short link)"
            className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-card-alt focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-60"
          />
          {gmapsFetching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-alt animate-pulse">
              Fetching...
            </span>
          )}
        </div>
        {gmapsError && <p className="text-xs text-destructive mt-1">{gmapsError}</p>}
      </div>

      <div className="relative" style={{ height: "250px", borderRadius: "0.5rem", overflow: "hidden" }}>
        <iframe
          ref={iframeRef}
          data-testid="map-iframe"
          width="100%"
          height="250"
          style={{ border: 0, display: hasCoords ? "block" : "none" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {!hasCoords && (
          <div className="flex flex-col items-center justify-center h-full border border-dashed border-border rounded-lg bg-muted/30 text-muted-alt text-sm gap-2">
            <MapPin size={24} className="opacity-40" />
            <span>Paste a Google Maps link above to preview location</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'admin',
  title: 'Location Picker',
  elements: {
    clinicsTab: { testId: 'tab-clinics' },
    searchBar: { testId: 'search-clinics' },
    clinicEditBtn: { testId: 'btn-edit' },
    gmapsLinkInput: { testId: 'gmaps-link-input' },
    emptyPlaceholder: { text: 'Paste a Google Maps link above to preview location' },
    mapIframe: { testId: 'map-iframe' },
  },
  flows: [
    {
      name: 'display empty map placeholder',
      steps: [
        { do: 'click', on: 'clinicsTab' },
        { do: 'waitFor', on: 'clinicEditBtn' },
        { do: 'click', on: 'clinicEditBtn' },
        { do: 'click', on: 'gmapsLinkInput' },
        { expect: 'visible', on: 'gmapsLinkInput' },
      ],
    },
    {
      name: 'paste google maps link with at-sign format',
      after: 'display empty map placeholder',
      steps: [
        { do: 'fill', on: 'gmapsLinkInput', value: 'https://www.google.com/maps/@19.0760,72.8777,17z' },
        { expect: 'visible', on: 'mapIframe' },
      ],
    },
    {
      name: 'paste google maps link with query format',
      after: 'display empty map placeholder',
      steps: [
        { do: 'fill', on: 'gmapsLinkInput', value: 'https://www.google.com/maps?q=28.6139,77.2090' },
        { expect: 'visible', on: 'mapIframe' },
      ],
    },
  ],
});
