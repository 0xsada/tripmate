const geocoding = require('../services/geocoding');
const routing = require('../services/routing');

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
  geocode,
  getRoute
};
