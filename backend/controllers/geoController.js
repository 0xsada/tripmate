const axios = require('axios');
const geocoding = require('../services/geocoding');
const routing = require('../services/routing');

/**
 * GET /api/autocomplete?text=...&type=city
 * Proxies place autocomplete requests to Geoapify
 */
async function autocomplete(req, res) {
  try {
    const { text, type = 'city', limit = 6 } = req.query;

    if (!text || text.trim().length < 2) {
      return res.json({ results: [] });
    }

    const apiKey = process.env.GEOAPIFY_API_KEY || process.env.VITE_GEOAPIFY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Geoapify API key is not configured on server' });
    }

    const response = await axios.get('https://api.geoapify.com/v1/geocode/autocomplete', {
      params: {
        text: text.trim(),
        type,
        apiKey,
        limit: Math.min(10, Math.max(1, parseInt(limit, 10) || 6))
      },
      timeout: 8000
    });

    const features = response.data?.features || [];
    const results = features.map((f) => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates || [];
      return {
        name: p.name || p.city || p.formatted || '',
        city: p.city || p.name || '',
        state: p.state || '',
        country: p.country || '',
        countryCode: p.country_code || '',
        latitude: p.lat ?? (coords.length >= 2 ? coords[1] : null),
        longitude: p.lon ?? (coords.length >= 2 ? coords[0] : null),
        formatted: p.formatted || [p.name, p.state, p.country].filter(Boolean).join(', '),
        placeId: p.place_id || ''
      };
    });

    res.json({ results });
  } catch (error) {
    console.error('Geoapify autocomplete error:', error.message);
    const status = error.response?.status || 500;
    res.status(status).json({
      error: error.response?.data?.message || error.message || 'Autocomplete service failed'
    });
  }
}

/**
 * GET /api/geocode?query=...
 * Proxies geocoding requests to Nominatim with caching
 */
async function geocode(req, res) {
  try {
    const { query, locations } = req.query;

    // Handle batch if locations comma or array provided
    if (locations) {
      const locList = Array.isArray(locations) ? locations : locations.split('|');
      const batchResult = await geocoding.batchGeocodeLocations(locList);
      return res.json({ results: batchResult });
    }

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const result = await geocoding.geocodeLocation(query);
    if (!result) {
      return res.status(404).json({ error: `Location "${query}" not found` });
    }

    res.json(result);
  } catch (error) {
    console.error('geocode endpoint error:', error);
    res.status(500).json({ error: 'Geocoding service error' });
  }
}

/**
 * GET /api/route?coords=lon1,lat1;lon2,lat2
 * Proxies routing requests to OSRM
 */
async function getRoute(req, res) {
  try {
    const { coords } = req.query;
    if (!coords) {
      return res.status(400).json({ error: 'coords parameter is required (format: lon1,lat1;lon2,lat2)' });
    }

    const route = await routing.calculateRoute(coords);
    if (!route) {
      return res.status(404).json({ error: 'Route could not be calculated' });
    }

    res.json(route);
  } catch (error) {
    console.error('getRoute endpoint error:', error);
    res.status(500).json({ error: 'Routing service error' });
  }
}

module.exports = {
  autocomplete,
  geocode,
  getRoute
};
