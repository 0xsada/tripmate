const axios = require('axios');

// In-memory cache for geocoding results to minimize external calls
const geocodeCache = new Map();

// Rate limiter queue for Nominatim public usage policy
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimitedRequest(fn) {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - timeSinceLast);
  }
  lastRequestTime = Date.now();
  return fn();
}

/**
 * Geocode via OpenStreetMap Photon API (fast, high-availability OSM geocoder)
 */
async function geocodeViaPhoton(query) {
  try {
    const response = await axios.get('https://photon.komoot.io/api/', {
      params: {
        q: query.trim(),
        limit: 1
      },
      headers: {
        'User-Agent': 'TravelPlannerApp/1.0 (student-portfolio)'
      },
      timeout: 8000
    });

    if (response.data?.features && response.data.features.length > 0) {
      const feat = response.data.features[0];
      const props = feat.properties || {};
      const coords = feat.geometry?.coordinates || [];
      if (coords.length >= 2) {
        return {
          latitude: coords[1],
          longitude: coords[0],
          display_name: [props.name, props.city || props.town || props.county, props.state, props.country]
            .filter(Boolean)
            .join(', ')
        };
      }
    }
  } catch (err) {
    console.warn(`Photon geocoding failed for "${query}":`, err.message);
  }
  return null;
}

/**
 * Geocode a query string using OpenStreetMap Nominatim with Photon fallback
 * @param {string} query - Location to search
 * @returns {Promise<Object|null>} { latitude, longitude, display_name }
 */
async function geocodeLocation(query) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return null;
  }

  const normalizedQuery = query.trim().toLowerCase();

  // Check cache first
  if (geocodeCache.has(normalizedQuery)) {
    return geocodeCache.get(normalizedQuery);
  }

  let result = null;

  // 1. Try Nominatim first
  try {
    result = await rateLimitedRequest(async () => {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query.trim(),
          format: 'json',
          addressdetails: 1,
          limit: 1
        },
        headers: {
          'User-Agent': 'TravelPlannerApp-StudentPortfolio/1.0 (contact: travelplanner.app.dev@gmail.com)'
        },
        timeout: 8000
      });

      if (response.data && response.data.length > 0) {
        const item = response.data[0];
        return {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          display_name: item.display_name
        };
      }
      return null;
    });
  } catch (error) {
    const status = error.response?.status;
    console.warn(`Nominatim geocoding notice for "${query}" (status: ${status || error.message}). Trying fallback OpenStreetMap service...`);
  }

  // 2. Fallback to OpenStreetMap Photon if Nominatim was rate-limited or yielded no result
  if (!result) {
    result = await geocodeViaPhoton(query);
  }

  // 3. If still no result and contains commas, try broader landmark/city
  if (!result && query.includes(',')) {
    const parts = query.split(',');
    const simplifiedQuery = parts.slice(0, 2).join(',').trim();
    if (simplifiedQuery && simplifiedQuery.toLowerCase() !== normalizedQuery) {
      result = await geocodeViaPhoton(simplifiedQuery);
    }
  }

  if (result) {
    geocodeCache.set(normalizedQuery, result);
    return result;
  }

  return null;
}

/**
 * Batch geocode multiple locations with caching and rate limiting
 * @param {string[]} locations
 * @returns {Promise<Object[]>}
 */
async function batchGeocodeLocations(locations) {
  const results = {};
  for (const loc of locations) {
    if (!loc) continue;
    const geo = await geocodeLocation(loc);
    if (geo) {
      results[loc] = geo;
    }
  }
  return results;
}

module.exports = {
  geocodeLocation,
  batchGeocodeLocations,
  geocodeCache
};
