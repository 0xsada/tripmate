const axios = require('axios');

const routeCache = new Map();

/**
 * Calculate driving route between two or more coordinates using OSRM
 * @param {string} coordinatesStr - e.g. "77.1892,32.2396;77.1750,32.2470" (lon,lat;lon,lat)
 * @returns {Promise<Object|null>} Route geojson and summary or null
 */
async function calculateRoute(coordinatesStr) {
  if (!coordinatesStr || typeof coordinatesStr !== 'string') {
    return null;
  }

  const cacheKey = coordinatesStr.trim();
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${encodeURIComponent(coordinatesStr)}?overview=full&geometries=geojson&steps=false`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'AITravelPlanner-StudentPortfolio/1.0'
      },
      timeout: 10000
    });

    if (response.data && response.data.code === 'Ok' && response.data.routes?.length > 0) {
      const primaryRoute = response.data.routes[0];
      const result = {
        distanceMeters: primaryRoute.distance,
        durationSeconds: primaryRoute.duration,
        geometry: primaryRoute.geometry // GeoJSON LineString coordinates: [[lon, lat], ...]
      };

      routeCache.set(cacheKey, result);
      return result;
    }

    return null;
  } catch (error) {
    console.error('OSRM route calculation error:', error.message);
    // Routing is optional, return null on failure so application continues without error
    return null;
  }
}

module.exports = {
  calculateRoute
};
