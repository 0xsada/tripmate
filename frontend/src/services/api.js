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

  // Geocoding & Routing (Proxied through backend)
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
