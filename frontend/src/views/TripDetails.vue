<template>
  <div class="trip-details-page">
    <div class="details-topbar">
      <router-link to="/dashboard" class="back-link">← Back to Dashboard</router-link>
      <div class="actions" v-if="trip">
        <button class="btn btn-secondary btn-sm" @click="handlePrint">
          🖨️ Print / Save PDF
        </button>
        <button class="btn btn-danger btn-sm" @click="handleDelete">
          🗑️ Delete Trip
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-box card">
      <div class="spinner"></div>
      <p>Loading trip details...</p>
    </div>

    <div v-else-if="error" class="error-banner card">
      <h3>Error</h3>
      <p>{{ error }}</p>
      <router-link to="/dashboard" class="btn btn-primary btn-sm">Return to Dashboard</router-link>
    </div>

    <div v-else-if="trip" class="trip-content">
      <!-- Trip Header Card -->
      <div class="trip-header-card card">
        <div class="header-tags">
          <span class="badge badge-primary">AI Travel Plan</span>
          <span class="badge badge-accent" v-if="trip.preferences?.travelStyle">
            {{ trip.preferences.travelStyle }}
          </span>
          <span class="badge" v-if="trip.preferences?.budget" style="background:#f1f5f9; color:#475569;">
            {{ trip.preferences.budget }}
          </span>
        </div>

        <h1 class="trip-main-title">{{ trip.title }}</h1>
        
        <div class="trip-meta-row">
          <div class="meta-item">
            <span class="meta-icon">📍</span>
            <strong>Destination:</strong> {{ trip.destination }}
          </div>
          <div class="meta-item" v-if="trip.start_date">
            <span class="meta-icon">📅</span>
            <strong>Dates:</strong> {{ formatDate(trip.start_date) }} <span v-if="trip.end_date">to {{ formatDate(trip.end_date) }}</span>
          </div>
          <div class="meta-item" v-if="trip.preferences?.travelers">
            <span class="meta-icon">👥</span>
            <strong>Travelers:</strong> {{ trip.preferences.travelers }}
          </div>
          <div class="meta-item" v-if="trip.preferences?.interests">
            <span class="meta-icon">🎯</span>
            <strong>Interests:</strong> {{ trip.preferences.interests }}
          </div>
        </div>

        <p class="itinerary-summary" v-if="trip.itinerary?.summary">
          {{ trip.itinerary.summary }}
        </p>
      </div>

      <!-- Main Layout: Itinerary & Map -->
      <div class="details-grid">
        <!-- Day by Day Itinerary -->
        <div class="itinerary-section">
          <div class="section-header-row">
            <h2 class="section-heading">🗓️ Day-by-Day Itinerary</h2>
            <button 
              type="button" 
              class="btn btn-secondary btn-sm" 
              @click="showDayOnMap('all')"
            >
              🗺️ Show All on Map
            </button>
          </div>

          <div class="days-container">
            <div 
              v-for="day in trip.itinerary?.days" 
              :key="day.day" 
              class="day-block card"
            >
              <div class="day-title-row">
                <div class="day-badge-title">
                  <span class="day-number-tag" :style="{ backgroundColor: getDayColor(day.day) }">
                    Day {{ day.day }}
                  </span>
                  <h3 class="day-theme-title" v-if="day.title">{{ day.title }}</h3>
                </div>
                <button 
                  type="button" 
                  class="btn btn-secondary btn-sm day-map-btn" 
                  @click="showDayOnMap(day.day)"
                >
                  📍 Filter Day {{ day.day }}
                </button>
              </div>

              <div class="activities-wrapper">
                <div 
                  v-for="(activity, aIdx) in day.activities" 
                  :key="aIdx" 
                  class="activity-row"
                >
                  <div class="activity-marker-num" :style="{ backgroundColor: getDayColor(day.day) + '20', color: getDayColor(day.day) }">
                    {{ aIdx + 1 }}
                  </div>
                  <div class="activity-info">
                    <div class="activity-header-line">
                      <h4 class="act-name">{{ activity.name }}</h4>
                      <button 
                        type="button" 
                        class="focus-btn" 
                        @click="focusActivity(activity.name, day.day)"
                        title="Locate on Map"
                      >
                        📍 Map
                      </button>
                    </div>
                    <p class="act-desc">{{ activity.description }}</p>
                    <div class="act-loc">
                      📍 <span>{{ activity.location }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sticky Interactive Map -->
        <div class="map-sticky-wrapper">
          <div class="map-container">
            <TravelMap 
              ref="travelMapRef"
              :destination="trip.destination" 
              :destinationCoords="trip.preferences?.destinationData"
              :days="trip.itinerary?.days"
              :activities="allActivities" 
              :title="`${trip.destination} Map`" 
              :showRoute="true" 
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';
import TravelMap from '../components/TravelMap.vue';

const route = useRoute();
const router = useRouter();

const trip = ref(null);
const loading = ref(true);
const error = ref('');
const travelMapRef = ref(null);

const DAY_COLORS = [
  '#4f46e5', // Day 1
  '#059669', // Day 2
  '#d97706', // Day 3
  '#7c3aed', // Day 4
  '#e11d48', // Day 5
  '#0891b2', // Day 6
  '#ea580c', // Day 7
  '#475569'  // Day 8+
];

function getDayColor(dayNum) {
  if (!dayNum) return '#4f46e5';
  const idx = (Math.max(1, dayNum) - 1) % DAY_COLORS.length;
  return DAY_COLORS[idx];
}

const allActivities = computed(() => {
  if (!trip.value?.itinerary?.days) return [];
  const list = [];
  trip.value.itinerary.days.forEach(day => {
    if (day.activities) {
      day.activities.forEach(act => list.push(act));
    }
  });
  return list;
});

onMounted(async () => {
  const tripId = route.params.id;
  try {
    const res = await api.getTripById(tripId);
    if (res.trip) {
      trip.value = res.trip;
    } else {
      error.value = 'Trip not found';
    }
  } catch (err) {
    console.error('Error loading trip details:', err);
    error.value = err.response?.data?.error || 'Failed to load trip';
  } finally {
    loading.value = false;
  }
});

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function showDayOnMap(dayNum) {
  travelMapRef.value?.setDayFilter(dayNum);
}

function focusActivity(name, dayNum) {
  travelMapRef.value?.focusLocation(name, dayNum);
}

function handlePrint() {
  window.print();
}

async function handleDelete() {
  if (!confirm('Are you sure you want to delete this trip?')) return;
  try {
    await api.deleteTrip(trip.value.id);
    router.push('/dashboard');
  } catch (err) {
    console.error('Error deleting trip:', err);
    alert('Failed to delete trip');
  }
}
</script>

<style scoped>
.trip-details-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.details-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back-link {
  font-size: 0.9rem;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 0.65rem;
}

.trip-header-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.header-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.trip-main-title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.2;
}

.trip-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  font-size: 0.925rem;
  color: #334155;
  background: var(--bg-main);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.itinerary-summary {
  font-size: 1rem;
  color: #475569;
  line-height: 1.6;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.75rem;
  align-items: start;
}

@media (max-width: 960px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.section-heading {
  font-size: 1.35rem;
  font-weight: 700;
}

.days-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.day-block {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.day-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.day-badge-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.day-number-tag {
  color: white;
  font-weight: 700;
  font-size: 0.8rem;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-sm);
}

.day-theme-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-main);
}

.day-map-btn {
  font-size: 0.775rem;
  padding: 0.25rem 0.6rem;
}

.activities-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.activity-row {
  display: flex;
  gap: 0.85rem;
  background: var(--bg-main);
  padding: 0.85rem 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.activity-marker-num {
  font-weight: 700;
  font-size: 0.85rem;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-info {
  flex: 1;
}

.activity-header-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.act-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
}

.focus-btn {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.15s;
}

.focus-btn:hover {
  background: var(--primary-light);
  border-color: var(--border-focus);
}

.act-desc {
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.45;
  margin-bottom: 0.35rem;
}

.act-loc {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.map-sticky-wrapper {
  position: sticky;
  top: 85px;
}

.loading-box, .error-banner {
  text-align: center;
  padding: 3rem 1.5rem;
}
</style>
