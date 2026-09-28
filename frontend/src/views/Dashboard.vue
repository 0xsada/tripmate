<template>
  <div class="dashboard-page">
    <div class="dashboard-header">
      <div>
        <h1 class="welcome-heading">Welcome, {{ firstName }} 👋</h1>
        <p class="subheading">Manage your travel itineraries and explore upcoming adventures.</p>
      </div>
      <router-link to="/create-trip" class="btn btn-primary btn-lg">
        ✨ Create New Trip
      </router-link>
    </div>

    <div class="dashboard-content">
      <div class="section-title-row">
        <h2 class="section-title">My Trips</h2>
        <span class="badge badge-primary">{{ trips.length }} saved</span>
      </div>

      <div v-if="loading" class="loading-state card">
        <div class="spinner"></div>
        <p>Loading your trips...</p>
      </div>

      <div v-else-if="trips.length === 0" class="empty-state card">
        <div class="empty-icon">🏖️</div>
        <h3>No trips planned yet</h3>
        <p>Let AI craft your personalized day-by-day vacation itinerary with interactive OpenStreetMap integration.</p>
        <router-link to="/create-trip" class="btn btn-primary">
          Plan Your First Trip
        </router-link>
      </div>

      <div v-else class="trips-grid">
        <TripCard 
          v-for="trip in trips" 
          :key="trip.id" 
          :trip="trip" 
          @delete="handleDeleteTrip"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import TripCard from '../components/TripCard.vue';

const router = useRouter();
const user = ref(null);
const trips = ref([]);
const loading = ref(true);

const firstName = computed(() => {
  if (!user.value?.name) return 'Traveler';
  return user.value.name.split(' ')[0];
});

onMounted(async () => {
  await loadUserData();
  await loadTrips();
});

async function loadUserData() {
  try {
    const authData = await api.getMe();
    if (!authData.authenticated || !authData.user) {
      router.push('/login');
      return;
    }
    user.value = authData.user;
  } catch (error) {
    console.error('Error fetching user:', error);
    router.push('/login');
  }
}

async function loadTrips() {
  loading.value = true;
  try {
    const res = await api.getTrips();
    trips.value = res.trips || [];
  } catch (error) {
    console.error('Error loading trips:', error);
  } finally {
    loading.value = false;
  }
}

async function handleDeleteTrip(tripId) {
  if (!confirm('Are you sure you want to delete this trip itinerary?')) return;

  try {
    await api.deleteTrip(tripId);
    trips.value = trips.value.filter(t => t.id !== tripId);
  } catch (error) {
    console.error('Error deleting trip:', error);
    alert('Failed to delete trip. Please try again.');
  }
}
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.welcome-heading {
  font-size: 1.85rem;
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 0.25rem;
}

.subheading {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.section-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-main);
}

.trips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.empty-state {
  text-align: center;
  padding: 3.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-icon {
  font-size: 3.5rem;
}

.empty-state h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-main);
}

.empty-state p {
  color: var(--text-muted);
  max-width: 450px;
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 0;
  color: var(--text-muted);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--primary-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
