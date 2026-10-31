const https = require('https');

const GOOGLE_API_KEY = process.env.GOOGLE_MAP_API_KEY;

function followRedirects(url, maxHops = 6) {
  return new Promise((resolve, reject) => {
    if (maxHops <= 0) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : require('http');
    lib.get(url, { timeout: 8000 }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const next = response.headers.location.startsWith('http')
          ? response.headers.location
          : new URL(response.headers.location, url).href;
        response.resume();
        followRedirects(next, maxHops - 1).then(resolve).catch(reject);
      } else {
        response.resume();
        resolve(url);
      }
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('Timeout')); });
  });
}

function extractCoordsFromUrl(url) {
  // Prefer the precise pin coords (!3d<lat>!4d<lng>) over the viewport center (@lat,lng)
  const pinMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pinMatch) return { lat: pinMatch[1], lng: pinMatch[2] };
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };
  return null;
}

function extractPlaceNameFromUrl(url) {
  const match = url.match(/\/maps\/place\/([^/@?]+)/);
  if (!match) return null;
  return decodeURIComponent(match[1].replace(/\+/g, ' '));
}

/**
 * GET /api/admin/address-by-map-url?url=<maps_url>
 * Resolves short links. If URL is a place URL, uses Find Place + Places Details for accurate address.
 * Falls back to Geocoding API.
 */
async function getAddressByMapUrlHandler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url query param required' });
  try {
    const resolved = await followRedirects(url);
    const coords = extractCoordsFromUrl(resolved);
    if (!coords) return res.json({ resolved });

    if (!GOOGLE_API_KEY) return res.json({ resolved, lat: coords.lat, lng: coords.lng });

    // --- Try Places Details via Find Place (for place URLs with a name) ---
    const placeName = extractPlaceNameFromUrl(resolved);
    if (placeName) {
      try {
        const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(placeName)}&inputtype=textquery&locationbias=point:${coords.lat},${coords.lng}&fields=place_id&key=${GOOGLE_API_KEY}`;
        const findData = await httpsGet(findUrl);
        const placeId = findData.candidates?.[0]?.place_id;
        if (placeId) {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,address_components,formatted_address&key=${GOOGLE_API_KEY}`;
          const detailsData = await httpsGet(detailsUrl);
          const r = detailsData.result;
          if (r?.address_components) {
            const get = (...types) => r.address_components.find(c => types.some(t => c.types.includes(t)))?.long_name ?? '';
            const city = get('locality') || get('administrative_area_level_3') || get('administrative_area_level_2');
            const state = get('administrative_area_level_1');
            const pincode = get('postal_code');
            const country = get('country');
            // Strip city/state/pincode/country from formatted_address to get street
            let street = '';
            if (r.formatted_address) {
              const suffixParts = [city, state, pincode, country].filter(Boolean);
              let addr = r.formatted_address;
              for (const part of suffixParts) {
                const idx = addr.lastIndexOf(`, ${part}`);
                if (idx !== -1) addr = addr.substring(0, idx);
              }
              // Also strip sublocality if it's at the end
              addr = addr.trim().replace(/,$/, '').trim();
              const sublocality = get('sublocality_level_1') || get('sublocality');
              if (sublocality) {
                const sIdx = addr.lastIndexOf(`, ${sublocality}`);
                if (sIdx !== -1) addr = addr.substring(0, sIdx);
              }
              street = addr.trim().replace(/,$/, '').trim();
            }
            return res.json({
              resolved,
              lat: String(r.geometry?.location?.lat ?? coords.lat),
              lng: String(r.geometry?.location?.lng ?? coords.lng),
              street,
              city,
              state,
              pincode,
            });
          }
        }
      } catch (e) {
        console.error('[FindPlace] ERROR', e.message);
      }
    }

    // --- Fallback: Geocoding API ---
    try {
      const data = await httpsGet(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${GOOGLE_API_KEY}`
      );
      const result = (data.results ?? [])[0];
      if (result) {
        const comps = result.address_components ?? [];
        const get = (...types) => comps.find(c => types.some(t => c.types.includes(t)))?.long_name ?? '';
        const city = get('locality') || get('administrative_area_level_3') || get('administrative_area_level_2');
        const state = get('administrative_area_level_1');
        const pincode = get('postal_code');
        const country = get('country');
        let street = '';
        if (result.formatted_address) {
          const suffixParts = [city, state, pincode, country].filter(Boolean);
          let addr = result.formatted_address;
          for (const part of suffixParts) {
            const idx = addr.lastIndexOf(`, ${part}`);
            if (idx !== -1) addr = addr.substring(0, idx);
          }
          const sublocality = get('sublocality_level_1') || get('sublocality');
          if (sublocality) {
            const sIdx = addr.lastIndexOf(`, ${sublocality}`);
            if (sIdx !== -1) addr = addr.substring(0, sIdx);
          }
          street = addr.trim().replace(/,$/, '').trim();
        }
        return res.json({
          resolved, lat: coords.lat, lng: coords.lng,
          street, city, state, pincode,
        });
      }
    } catch (e) {
      console.error('[Geocode] ERROR', e.message);
    }

    return res.json({ resolved, lat: coords.lat, lng: coords.lng });
  } catch (err) {
    console.error('[AddressByMapUrl] ERROR', err.message);
    return res.status(500).json({ error: 'Failed to process map URL' });
  }
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 8000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('Timeout')); });
  });
}

/**
 * GET /api/admin/places/autocomplete?input=<text>
 */
async function placesAutocompleteHandler(req, res) {
  const { input } = req.query;
  if (!input) return res.status(400).json({ error: 'input query param required' });

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:in&types=geocode&key=${GOOGLE_API_KEY}`;
  try {
    const data = await httpsGet(url);
    return res.json({ predictions: data.predictions ?? [] });
  } catch (err) {
    console.error('[PlacesAutocomplete] ERROR', err.message);
    return res.status(500).json({ error: 'Failed to fetch autocomplete' });
  }
}

/**
 * GET /api/admin/places/details?place_id=<id>
 */
async function placesDetailsHandler(req, res) {
  const { place_id } = req.query;
  if (!place_id) return res.status(400).json({ error: 'place_id query param required' });

  const fields = 'geometry,address_components,formatted_address';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&fields=${fields}&key=${GOOGLE_API_KEY}`;
  try {
    const data = await httpsGet(url);
    const result = data.result;
    if (!result) return res.status(404).json({ error: 'Place not found' });

    const comps = result.address_components ?? [];
    const get = (...types) => comps.find(c => types.some(t => c.types.includes(t)))?.long_name ?? '';
    const getShort = (...types) => comps.find(c => types.some(t => c.types.includes(t)))?.short_name ?? '';

    return res.json({
      lat: String(result.geometry.location.lat),
      lng: String(result.geometry.location.lng),
      street: [get('street_number'), get('route')].filter(Boolean).join(' ') || get('sublocality_level_1') || get('sublocality'),
      city: get('locality') || get('administrative_area_level_2'),
      state: get('administrative_area_level_1'),
      pincode: get('postal_code'),
      formatted_address: result.formatted_address ?? '',
    });
  } catch (err) {
    console.error('[PlacesDetails] ERROR', err.message);
    return res.status(500).json({ error: 'Failed to fetch place details' });
  }
}

/**
 * GET /api/admin/geocode/reverse?lat=<lat>&lng=<lng>
 */
async function reverseGeocodeHandler(req, res) {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
  if (!GOOGLE_API_KEY) return res.status(500).json({ error: 'API key not configured' });
  try {
    const data = await httpsGet(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`);
    const result = (data.results ?? [])[0];
    if (!result) return res.status(404).json({ error: 'No results' });
    const comps = result.address_components ?? [];
    const get = (...types) => comps.find(c => types.some(t => c.types.includes(t)))?.long_name ?? '';
    const city = get('locality') || get('administrative_area_level_3') || get('administrative_area_level_2');
    const state = get('administrative_area_level_1');
    const pincode = get('postal_code');
    const country = get('country');
    let street = '';
    if (result.formatted_address) {
      const suffixParts = [city, state, pincode, country].filter(Boolean);
      let addr = result.formatted_address;
      for (const part of suffixParts) {
        const idx = addr.lastIndexOf(`, ${part}`);
        if (idx !== -1) addr = addr.substring(0, idx);
      }
      street = addr.trim().replace(/,$/, '').trim();
    }
    return res.json({ street, city, state, pincode });
  } catch (err) {
    console.error('[ReverseGeocode] ERROR', err.message);
    return res.status(500).json({ error: 'Reverse geocode failed' });
  }
}

module.exports = { placesAutocompleteHandler, placesDetailsHandler, getAddressByMapUrlHandler, reverseGeocodeHandler };
