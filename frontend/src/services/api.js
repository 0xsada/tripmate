import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const api = {
  // Authentication
  async getMe() {
    try {
      const response = await client.get('/api/auth/me');
      return response.data;
    } catch (err) {
      if (err.response && err.response.status === 401) {
        return { user: null, authenticated: false };
      }
      throw err;
    }
  },

  async googleLogin(authData) {
    const payload = typeof authData === 'string' ? { credential: authData } : authData;
    const response = await client.post('/api/auth/google', payload);
    return response.data;
  },

  async demoLogin() {
    const response = await client.post('/api/auth/demo');
    return response.data;
  },

  async logout() {
    const response = await client.post('/api/auth/logout');
    return response.data;
  },

  // Trips
  async generateItinerary(tripData) {
    const response = await client.post('/api/trips/generate', tripData);
    return response.data;
  },

  async saveTrip(tripData) {
    const response = await client.post('/api/trips', tripData);
    return response.data;
  },

  async getTrips() {
    const response = await client.get('/api/trips');
    return response.data;
  },

  async getTripById(id) {
    const response = await client.get(`/api/trips/${id}`);
    return response.data;
  },

  async deleteTrip(id) {
    const response = await client.delete(`/api/trips/${id}`);
    return response.data;
  },

  // Geocoding & Routing (Proxied through backend or direct Geoapify)
  async autocomplete(text, { signal = null, type = 'city', limit = 6 } = {}) {
    if (!text || text.trim().length < 2) {
      return [];
    }

    const geoapifyKey = import.meta.env.VITE_GEOAPIFY_API_KEY;

    // 1. Try backend proxy first
    try {
      const response = await client.get('/api/autocomplete', {
        params: { text: text.trim(), type, limit },
        signal
      });
      if (response.data && Array.isArray(response.data.results)) {
        return response.data.results;
      }
    } catch (err) {
      if (axios.isCancel(err) || err.name === 'CanceledError' || err.name === 'AbortError') {
        throw err; // Propagate cancellation to debounce handler
      }
      console.warn('Backend autocomplete proxy notice, trying direct client lookup:', err.message);
    }

    // 2. Direct Geoapify fallback if backend proxy failed and frontend key exists
    if (geoapifyKey) {
      try {
        const response = await axios.get('https://api.geoapify.com/v1/geocode/autocomplete', {
          params: {
            text: text.trim(),
            type,
            apiKey: geoapifyKey,
            limit
          },
          signal
        });
        const features = response.data?.features || [];
        return features.map((f) => {
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
      } catch (directErr) {
        if (axios.isCancel(directErr) || directErr.name === 'CanceledError' || directErr.name === 'AbortError') {
          throw directErr;
        }
        console.error('Direct Geoapify autocomplete failed:', directErr.message);
      }
    }

    return [];
  },

  async geocode(query) {
    try {
      const response = await client.get('/api/geocode', {
        params: { query }
      });
      return response.data;
    } catch {
      return null;
    }
  },

  async batchGeocode(locations) {
    try {
      const response = await client.get('/api/geocode', {
        params: { locations: locations.join('|') }
      });
      return response.data?.results || {};
    } catch {
      return {};
    }
  },

  async getRoute(coords) {
    try {
      const response = await client.get('/api/route', {
        params: { coords }
      });
      return response.data;
    } catch {
      return null;
    }
  }
};

export default api;
