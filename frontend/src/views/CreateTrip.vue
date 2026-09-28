<template>
  <div class="create-trip-page">
    <div class="page-header">
      <router-link to="/dashboard" class="back-link">← Back to Dashboard</router-link>
      <h1 class="page-title">✨ Create New AI Trip</h1>
      <p class="page-subtitle">Provide your travel preferences and let Gemini create a day-by-day plan with OpenStreetMap locations.</p>
    </div>

    <!-- Quick sample presets for testing -->
    <div class="presets-bar">
      <span class="preset-label">Quick Examples:</span>
      <button type="button" class="preset-btn" @click="applyPreset('manali')">🏔️ Manali (Adventure)</button>
      <button type="button" class="preset-btn" @click="applyPreset('goa')">🏖️ Goa (Relaxed)</button>
      <button type="button" class="preset-btn" @click="applyPreset('paris')">🗼 Paris (Cultural)</button>
    </div>

    <div class="trip-workflow-grid">
      <!-- Input Form -->
      <div class="form-container card">
        <h2 class="form-section-title">Trip Preferences</h2>

        <form @submit.prevent="handleGenerate">
          <div class="form-group">
            <label class="form-label" for="destination">Destination *</label>
            <input 
              id="destination" 
              type="text" 
              v-model="form.destination" 
              class="form-control" 
              placeholder="e.g. Manali, Goa, Paris, Tokyo" 
              required
            />
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label" for="startDate">Start Date</label>
              <input 
                id="startDate" 
                type="date" 
                v-model="form.startDate" 
                class="form-control" 
                @change="updateDaysFromDates"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="endDate">End Date</label>
              <input 
                id="endDate" 
                type="date" 
                v-model="form.endDate" 
                class="form-control" 
                @change="updateDaysFromDates"
              />
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label" for="days">Duration (Days)</label>
              <input 
                id="days" 
                type="number" 
                v-model.number="form.days" 
                class="form-control" 
                min="1" 
                max="14"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="budget">Budget</label>
              <input 
                id="budget" 
                type="text" 
                v-model="form.budget" 
                class="form-control" 
                placeholder="e.g. ₹15,000 or Moderate"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="travelStyle">Travel Style</label>
            <select id="travelStyle" v-model="form.travelStyle" class="form-control">
              <option value="Adventure">Adventure & Outdoors</option>
              <option value="Relaxed">Relaxed & Leisure</option>
              <option value="Cultural">Cultural & Heritage</option>
              <option value="Budget-Friendly">Budget Backpacker</option>
              <option value="Luxury">Luxury & Comfort</option>
              <option value="Family-Friendly">Family & Kids</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="interests">Interests</label>
            <input 
              id="interests" 
              type="text" 
              v-model="form.interests" 
              class="form-control" 
              placeholder="e.g. Nature, Photography, Street Food, Temples"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="additionalPreferences">Additional Preferences</label>
            <textarea 
              id="additionalPreferences" 
              v-model="form.additionalPreferences" 
              class="form-control" 
              placeholder="e.g. Vegetarian food options, easy walking routes, scenic sunrise viewpoints"
            ></textarea>
          </div>

          <button 
            type="submit" 
            class="btn btn-primary btn-lg submit-btn" 
            :disabled="generating"
          >
            <span v-if="generating">⏳ Generating with Gemini...</span>
            <span v-else>🤖 Generate AI Itinerary</span>
          </button>
        </form>
      </div>

      <!-- Preview & Results Container -->
      <div class="preview-container">
        <!-- Generating loading state -->
        <div v-if="generating" class="generating-box card">
          <div class="ai-loader">
            <div class="pulse-ring"></div>
            <span class="ai-icon">✨</span>
          </div>
          <h3>Gemini is designing your custom itinerary...</h3>
          <p>Finding the best attractions in {{ form.destination || 'your destination' }} and preparing OpenStreetMap geolocations.</p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="error-banner card">
          <h3>Generation Error</h3>
          <p>{{ error }}</p>
          <button class="btn btn-secondary btn-sm" @click="handleGenerate">Try Again</button>
        </div>

        <!-- Generated Itinerary Display -->
        <div v-else-if="generatedItinerary" class="itinerary-result card">
          <div class="result-header">
            <div>
              <span class="badge badge-accent">AI Generated Plan</span>
              <h2 class="result-title">{{ form.destination }} Trip</h2>
              <p class="result-summary">{{ generatedItinerary.summary }}</p>
            </div>
            <button 
              type="button" 
              class="btn btn-primary" 
              :disabled="saving"
              @click="handleSaveTrip"
            >
              <span v-if="saving">Saving...</span>
              <span v-else>💾 Save Trip</span>
            </button>
          </div>

          <!-- Interactive Map -->
          <div class="map-section">
            <TravelMap 
              ref="travelMapRef"
              :destination="form.destination" 
              :days="generatedItinerary.days"
              :activities="allActivities" 
              :showRoute="true" 
            />
          </div>

          <!-- Day by Day breakdown -->
          <div class="days-list">
            <div class="days-list-header">
              <h3 class="days-heading">🗓️ Day-by-Day Schedule</h3>
              <button 
                type="button" 
                class="btn btn-secondary btn-sm" 
                @click="showDayOnMap('all')"
              >
                🗺️ Show All on Map
              </button>
            </div>

            <div 
              v-for="day in generatedItinerary.days" 
              :key="day.day" 
              class="day-card card"
            >
              <div class="day-header">
                <div class="day-badge-title">
                  <span class="day-badge" :style="{ backgroundColor: getDayColor(day.day) }">Day {{ day.day }}</span>
                  <span class="day-title" v-if="day.title">{{ day.title }}</span>
                </div>
                <button 
                  type="button" 
                  class="btn btn-secondary btn-sm" 
                  style="font-size:0.75rem; padding:0.25rem 0.55rem;"
                  @click="showDayOnMap(day.day)"
                >
                  📍 Filter Day {{ day.day }}
                </button>
              </div>

              <div class="activities-list">
                <div 
                  v-for="(act, actIdx) in day.activities" 
                  :key="actIdx" 
                  class="activity-item"
                >
                  <div class="activity-marker" :style="{ backgroundColor: getDayColor(day.day) + '20', color: getDayColor(day.day) }">
                    {{ actIdx + 1 }}
                  </div>
                  <div class="activity-details">
                    <div class="activity-title-row">
                      <h4 class="activity-name">{{ act.name }}</h4>
                      <button 
                        type="button" 
                        class="focus-btn" 
                        @click="focusActivity(act.name, day.day)"
                        title="Locate on map"
                      >
                        📍 Map
                      </button>
                    </div>
                    <p class="activity-desc">{{ act.description }}</p>
                    <div class="activity-loc">
                      📍 <span>{{ act.location }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state placeholder before generation -->
        <div v-else class="placeholder-box card">
          <div class="placeholder-icon">🗺️</div>
          <h3>Your itinerary will appear here</h3>
          <p>Fill out the preferences on the left and click "Generate AI Itinerary" to see day-by-day activities and an interactive OpenStreetMap view.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import TravelMap from '../components/TravelMap.vue';

const router = useRouter();
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

function showDayOnMap(dayNum) {
  travelMapRef.value?.setDayFilter(dayNum);
}

function focusActivity(name, dayNum) {
  travelMapRef.value?.focusLocation(name, dayNum);
}

const form = ref({
  destination: 'Manali',
  startDate: '',
  endDate: '',
  days: 4,
  budget: '₹15,000',
  travelStyle: 'Adventure',
  interests: 'Nature, Photography',
  additionalPreferences: ''
});

const generating = ref(false);
const saving = ref(false);
const error = ref('');
const generatedItinerary = ref(null);

// Flatten all activities across days for the map
const allActivities = computed(() => {
  if (!generatedItinerary.value?.days) return [];
  const list = [];
  generatedItinerary.value.days.forEach(day => {
    if (day.activities) {
      day.activities.forEach(act => list.push(act));
    }
  });
  return list;
});

function updateDaysFromDates() {
  if (form.value.startDate && form.value.endDate) {
    const start = new Date(form.value.startDate);
    const end = new Date(form.value.endDate);
    if (end >= start) {
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      form.value.days = diffDays;
    }
  }
}

function applyPreset(type) {
  if (type === 'manali') {
    form.value = {
      destination: 'Manali',
      startDate: '',
      endDate: '',
      days: 4,
      budget: '₹15,000',
      travelStyle: 'Adventure',
      interests: 'Nature, Photography, Trekking',
      additionalPreferences: 'Scenic mountain viewpoints, local Himachali food'
    };
  } else if (type === 'goa') {
    form.value = {
      destination: 'Goa',
      startDate: '',
      endDate: '',
      days: 3,
      budget: '₹18,000',
      travelStyle: 'Relaxed',
      interests: 'Beaches, Portuguese Architecture, Sunset Cafes',
      additionalPreferences: 'Beachside shacks and relaxed pace'
    };
  } else if (type === 'paris') {
    form.value = {
      destination: 'Paris',
      startDate: '',
      endDate: '',
      days: 4,
      budget: '€1,200',
      travelStyle: 'Cultural',
      interests: 'Museums, Art, Architecture, Pastries',
      additionalPreferences: 'Walkable exploration with cafe stops'
    };
  }
}

async function handleGenerate() {
  if (!form.value.destination) return;

  generating.value = true;
  error.value = '';
  generatedItinerary.value = null;

  try {
    const res = await api.generateItinerary({
      destination: form.value.destination,
      days: form.value.days,
      startDate: form.value.startDate,
      endDate: form.value.endDate,
      budget: form.value.budget,
      travelStyle: form.value.travelStyle,
      interests: form.value.interests,
      additionalPreferences: form.value.additionalPreferences
    });

    if (res.itinerary) {
      generatedItinerary.value = res.itinerary;
    } else {
      throw new Error('No itinerary data returned from server');
    }
  } catch (err) {
    console.error('Error generating itinerary:', err);
    error.value = err.response?.data?.error || err.message || 'Failed to generate itinerary. Please try again.';
  } finally {
    generating.value = false;
  }
}

async function handleSaveTrip() {
  if (!generatedItinerary.value) return;

  saving.value = true;
  try {
    const payload = {
      title: `${form.value.destination} Trip`,
      destination: form.value.destination,
      startDate: form.value.startDate || null,
      endDate: form.value.endDate || null,
      preferences: {
        budget: form.value.budget,
        travelStyle: form.value.travelStyle,
        interests: form.value.interests,
        additionalPreferences: form.value.additionalPreferences
      },
      itinerary: generatedItinerary.value
    };

    const res = await api.saveTrip(payload);
    if (res.trip?.id) {
      router.push(`/trips/${res.trip.id}`);
    } else {
      router.push('/dashboard');
    }
  } catch (err) {
    console.error('Error saving trip:', err);
    alert('Failed to save trip to database: ' + (err.response?.data?.error || err.message));
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.create-trip-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.back-link {
  font-size: 0.875rem;
  font-weight: 600;
  display: inline-block;
  margin-bottom: 0.5rem;
}

.page-title {
  font-size: 1.85rem;
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.presets-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  background: #ffffff;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.preset-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.preset-btn {
  background: var(--bg-main);
  border: 1px solid var(--border);
  border-radius: 9999px;
  padding: 0.3rem 0.8rem;
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-btn:hover {
  background: var(--primary-light);
  border-color: var(--border-focus);
  color: var(--primary);
}

.trip-workflow-grid {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 900px) {
  .trip-workflow-grid {
    grid-template-columns: 1fr;
  }
}

.form-section-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--border);
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.submit-btn {
  width: 100%;
  margin-top: 0.5rem;
}

/* Preview / Results */
.preview-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.placeholder-box, .generating-box {
  text-align: center;
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.placeholder-icon {
  font-size: 3.5rem;
}

.placeholder-box h3, .generating-box h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-main);
}

.placeholder-box p, .generating-box p {
  color: var(--text-muted);
  max-width: 480px;
  line-height: 1.5;
}

.ai-loader {
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.ai-icon {
  font-size: 1.8rem;
  z-index: 2;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--primary-light);
  animation: pulse 1.6s ease-out infinite;
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(2); opacity: 0; }
}

.itinerary-result {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.result-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0.3rem 0;
  color: var(--text-main);
}

.result-summary {
  color: #334155;
  font-size: 0.95rem;
  max-width: 600px;
}

.days-heading {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.days-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.day-card {
  background: var(--bg-main);
  border: 1px solid var(--border);
}

.day-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.day-badge {
  background: var(--primary);
  color: white;
  font-weight: 700;
  font-size: 0.8rem;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-sm);
}

.day-title {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text-main);
}

.activities-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.activity-item {
  display: flex;
  gap: 0.85rem;
  background: #ffffff;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.activity-marker {
  background: var(--primary-light);
  color: var(--primary);
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

.activity-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 0.2rem;
}

.activity-desc {
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.4;
  margin-bottom: 0.35rem;
}

.activity-loc {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.days-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.day-badge-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.activity-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
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
</style>
