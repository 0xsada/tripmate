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

        <form @submit.prevent="handleGenerate" novalidate>
          <!-- Destination Autocomplete Field -->
          <div class="form-group autocomplete-group" ref="autocompleteWrapperRef">
            <label class="form-label" for="destination">Destination *</label>
            <div class="input-with-status">
              <input 
                id="destination" 
                type="text" 
                v-model="destinationInput" 
                @input="onDestinationInput"
                @focus="onDestinationFocus"
                @keydown="onDestinationKeydown"
                class="form-control" 
                :class="{ 'input-error': errors.destination, 'has-selected': form.destinationData }"
                placeholder="Type a city or place (e.g. Paris, Delhi, Tokyo)" 
                autocomplete="off"
                aria-autocomplete="list"
                aria-haspopup="true"
                :aria-expanded="showDropdown"
              />
              <div class="status-indicator">
                <span v-if="searching" class="input-spinner" title="Searching places..."></span>
                <span v-else-if="form.destinationData" class="selected-badge" title="Verified place selected">✓</span>
              </div>
            </div>

            <!-- Autocomplete Suggestions Dropdown -->
            <div 
              v-if="showDropdown" 
              class="autocomplete-dropdown"
              role="listbox"
            >
              <div v-if="searching" class="dropdown-item dropdown-msg">
                <span class="inline-spinner"></span>
                <span>Searching places...</span>
              </div>
              <div v-else-if="searchError" class="dropdown-item dropdown-msg dropdown-error">
                <span>⚠️ {{ searchError }}</span>
              </div>
              <div v-else-if="suggestions.length === 0 && searchAttempted" class="dropdown-item dropdown-msg dropdown-empty">
                <span>No places found. Please select a valid city name.</span>
              </div>
              <div 
                v-else 
                v-for="(item, idx) in suggestions" 
                :key="item.placeId || idx"
                class="dropdown-item suggestion-item"
                :class="{ 'is-highlighted': highlightedIndex === idx }"
                @mousedown.prevent="selectPlace(item)"
                @mouseenter="highlightedIndex = idx"
                role="option"
                :aria-selected="highlightedIndex === idx"
              >
                <span class="suggestion-icon">📍</span>
                <div class="suggestion-info">
                  <div class="suggestion-name-row">
                    <span class="suggestion-name">{{ item.name }}</span>
                    <span v-if="item.country" class="suggestion-country">{{ item.country }}</span>
                  </div>
                  <span class="suggestion-formatted">{{ item.formatted }}</span>
                </div>
              </div>
            </div>

            <!-- Inline Destination Error -->
            <span v-if="errors.destination" class="field-error">{{ errors.destination }}</span>
          </div>

          <!-- Dates Row -->
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label" for="startDate">Start Date *</label>
              <input 
                id="startDate" 
                type="date" 
                v-model="form.startDate" 
                :min="todayDateStr"
                class="form-control" 
                :class="{ 'input-error': errors.startDate }"
                @change="handleStartDateChange"
              />
              <span v-if="errors.startDate" class="field-error">{{ errors.startDate }}</span>
            </div>
            <div class="form-group">
              <label class="form-label" for="endDate">End Date *</label>
              <input 
                id="endDate" 
                type="date" 
                v-model="form.endDate" 
                :min="form.startDate || todayDateStr"
                class="form-control" 
                :class="{ 'input-error': errors.endDate }"
                @change="handleEndDateChange"
              />
              <span v-if="errors.endDate" class="field-error">{{ errors.endDate }}</span>
            </div>
          </div>

          <!-- Duration & Travelers Row -->
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label" for="days">Duration (Days)</label>
              <input 
                id="days" 
                type="number" 
                v-model.number="form.days" 
                class="form-control" 
                min="1" 
                max="30"
                readonly
                title="Calculated automatically from Start Date and End Date"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="travelers">Number of Travelers *</label>
              <input 
                id="travelers" 
                type="number" 
                v-model.number="form.travelers" 
                class="form-control" 
                :class="{ 'input-error': errors.travelers }"
                min="1" 
                max="50"
                step="1"
                placeholder="e.g. 2"
                @input="clearError('travelers')"
              />
              <span v-if="errors.travelers" class="field-error">{{ errors.travelers }}</span>
            </div>
          </div>

          <!-- Budget & Travel Style Row -->
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label" for="budget">Budget *</label>
              <div class="budget-input-group">
                <select v-model="form.currency" class="currency-prefix-select" aria-label="Select Currency">
                  <option value="₹">₹ (INR)</option>
                  <option value="$">$ (USD)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="£">£ (GBP)</option>
                </select>
                <input 
                  id="budget" 
                  type="number" 
                  v-model.number="form.budgetAmount" 
                  class="form-control budget-number-input" 
                  :class="{ 'input-error': errors.budget }"
                  min="1" 
                  step="any"
                  placeholder="e.g. 15000"
                  @input="clearError('budget')"
                />
              </div>
              <span v-if="errors.budget" class="field-error">{{ errors.budget }}</span>
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
          </div>

          <!-- Interests Field -->
          <div class="form-group">
            <label class="form-label" for="interests">Interests / Preferences *</label>
            <input 
              id="interests" 
              type="text" 
              v-model="form.interests" 
              class="form-control" 
              :class="{ 'input-error': errors.interests }"
              placeholder="e.g. Nature, Photography, Street Food, Temples"
              @input="clearError('interests')"
            />
            <span v-if="errors.interests" class="field-error">{{ errors.interests }}</span>
          </div>

          <!-- Additional Preferences -->
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
          <p>Finding the best attractions in {{ form.destinationData?.city || form.destinationData?.name || form.destination || 'your destination' }} and preparing OpenStreetMap geolocations.</p>
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
              <h2 class="result-title">{{ form.destinationData?.city || form.destinationData?.name || form.destination }} Trip</h2>
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
              :destinationCoords="form.destinationData"
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import TravelMap from '../components/TravelMap.vue';

const router = useRouter();
const travelMapRef = ref(null);
const autocompleteWrapperRef = ref(null);

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

// Today helper in YYYY-MM-DD
function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
const todayDateStr = getTodayStr();

function getDateOffsetStr(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Form state
const destinationInput = ref('');
const form = ref({
  destination: '',
  destinationData: null,
  startDate: '',
  endDate: '',
  days: 4,
  travelers: 1,
  currency: '₹',
  budgetAmount: 15000,
  travelStyle: 'Adventure',
  interests: '',
  additionalPreferences: ''
});

// Validation errors state
const errors = ref({
  destination: '',
  startDate: '',
  endDate: '',
  travelers: '',
  budget: '',
  interests: ''
});

function clearError(field) {
  if (errors.value[field]) {
    errors.value[field] = '';
  }
}

// Autocomplete state
const suggestions = ref([]);
const searching = ref(false);
const searchAttempted = ref(false);
const searchError = ref('');
const showDropdown = ref(false);
const highlightedIndex = ref(-1);

let debounceTimer = null;
let currentAbortController = null;

function onDestinationInput() {
  clearError('destination');
  form.value.destinationData = null; // Typing invalidates previous selection
  form.value.destination = destinationInput.value;
  searchAttempted.value = false;
  searchError.value = '';

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }

  const query = destinationInput.value.trim();
  if (query.length < 2) {
    suggestions.value = [];
    searching.value = false;
    showDropdown.value = false;
    highlightedIndex.value = -1;
    return;
  }

  showDropdown.value = true;
  searching.value = true;

  // Debounce API requests by 350ms
  debounceTimer = setTimeout(async () => {
    await fetchSuggestions(query);
  }, 350);
}

function onDestinationFocus() {
  if (destinationInput.value.trim().length >= 2 && suggestions.value.length > 0) {
    showDropdown.value = true;
  }
}

async function fetchSuggestions(query) {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();

  searching.value = true;
  searchError.value = '';
  searchAttempted.value = true;

  try {
    const results = await api.autocomplete(query, {
      signal: currentAbortController.signal,
      type: 'city',
      limit: 6
    });

    suggestions.value = results || [];
    highlightedIndex.value = -1;
    showDropdown.value = true;
  } catch (err) {
    if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
      return; // Request was aborted in flight
    }
    console.error('Geoapify autocomplete error:', err);
    searchError.value = 'Failed to load place suggestions.';
    suggestions.value = [];
  } finally {
    searching.value = false;
  }
}

function selectPlace(item) {
  form.value.destinationData = {
    name: item.name,
    city: item.city || item.name,
    state: item.state || '',
    country: item.country || '',
    countryCode: item.countryCode || '',
    latitude: item.latitude,
    longitude: item.longitude,
    formatted: item.formatted,
    placeId: item.placeId
  };
  destinationInput.value = item.formatted;
  form.value.destination = item.formatted;
  showDropdown.value = false;
  suggestions.value = [];
  highlightedIndex.value = -1;
  clearError('destination');
}

function onDestinationKeydown(e) {
  if (!showDropdown.value || suggestions.value.length === 0) {
    if (e.key === 'ArrowDown' && destinationInput.value.trim().length >= 2) {
      showDropdown.value = true;
      e.preventDefault();
    }
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (highlightedIndex.value < suggestions.value.length - 1) {
      highlightedIndex.value++;
    } else {
      highlightedIndex.value = 0;
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (highlightedIndex.value > 0) {
      highlightedIndex.value--;
    } else {
      highlightedIndex.value = suggestions.value.length - 1;
    }
  } else if (e.key === 'Enter') {
    if (highlightedIndex.value >= 0 && suggestions.value[highlightedIndex.value]) {
      e.preventDefault();
      selectPlace(suggestions.value[highlightedIndex.value]);
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    showDropdown.value = false;
  }
}

function handleClickOutside(e) {
  if (autocompleteWrapperRef.value && !autocompleteWrapperRef.value.contains(e.target)) {
    showDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  if (debounceTimer) clearTimeout(debounceTimer);
  if (currentAbortController) currentAbortController.abort();
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

function handleStartDateChange() {
  clearError('startDate');
  updateDaysFromDates();
  if (form.value.endDate && form.value.startDate && form.value.endDate < form.value.startDate) {
    errors.value.endDate = 'End date cannot be before start date';
  } else {
    clearError('endDate');
  }
}

function handleEndDateChange() {
  clearError('endDate');
  updateDaysFromDates();
  if (form.value.startDate && form.value.endDate && form.value.endDate < form.value.startDate) {
    errors.value.endDate = 'End date cannot be before start date';
  }
}

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
    const pStart = getDateOffsetStr(7);
    const pEnd = getDateOffsetStr(10);
    destinationInput.value = 'Manali, Himachal Pradesh, India';
    form.value = {
      destination: 'Manali, Himachal Pradesh, India',
      destinationData: {
        name: 'Manali',
        city: 'Manali',
        state: 'Himachal Pradesh',
        country: 'India',
        countryCode: 'in',
        latitude: 32.2432,
        longitude: 77.1892,
        formatted: 'Manali, Himachal Pradesh, India',
        placeId: 'preset_manali'
      },
      startDate: pStart,
      endDate: pEnd,
      days: 4,
      travelers: 2,
      currency: '₹',
      budgetAmount: 15000,
      travelStyle: 'Adventure',
      interests: 'Nature, Photography, Trekking',
      additionalPreferences: 'Scenic mountain viewpoints, local Himachali food'
    };
  } else if (type === 'goa') {
    const pStart = getDateOffsetStr(14);
    const pEnd = getDateOffsetStr(16);
    destinationInput.value = 'Goa, India';
    form.value = {
      destination: 'Goa, India',
      destinationData: {
        name: 'Goa',
        city: 'Panaji',
        state: 'Goa',
        country: 'India',
        countryCode: 'in',
        latitude: 15.2993,
        longitude: 74.1240,
        formatted: 'Goa, India',
        placeId: 'preset_goa'
      },
      startDate: pStart,
      endDate: pEnd,
      days: 3,
      travelers: 2,
      currency: '₹',
      budgetAmount: 18000,
      travelStyle: 'Relaxed',
      interests: 'Beaches, Portuguese Architecture, Sunset Cafes',
      additionalPreferences: 'Beachside shacks and relaxed pace'
    };
  } else if (type === 'paris') {
    const pStart = getDateOffsetStr(30);
    const pEnd = getDateOffsetStr(33);
    destinationInput.value = 'Paris, France';
    form.value = {
      destination: 'Paris, France',
      destinationData: {
        name: 'Paris',
        city: 'Paris',
        state: 'Ile-de-France',
        country: 'France',
        countryCode: 'fr',
        latitude: 48.8566,
        longitude: 2.3522,
        formatted: 'Paris, France',
        placeId: 'preset_paris'
      },
      startDate: pStart,
      endDate: pEnd,
      days: 4,
      travelers: 2,
      currency: '€',
      budgetAmount: 1200,
      travelStyle: 'Cultural',
      interests: 'Museums, Art, Architecture, Pastries',
      additionalPreferences: 'Walkable exploration with cafe stops'
    };
  }

  // Clear all validation errors when preset applied
  errors.value = {
    destination: '',
    startDate: '',
    endDate: '',
    travelers: '',
    budget: '',
    interests: ''
  };
  showDropdown.value = false;
}

function validateForm() {
  let isValid = true;
  errors.value = {
    destination: '',
    startDate: '',
    endDate: '',
    travelers: '',
    budget: '',
    interests: ''
  };

  // 1. Destination validation
  const destText = destinationInput.value ? destinationInput.value.trim() : '';
  if (!destText) {
    errors.value.destination = 'Destination is required';
    isValid = false;
  } else if (!form.value.destinationData) {
    errors.value.destination = 'Please select a destination from the suggestions.';
    isValid = false;
  }

  // 2. Start Date validation
  if (!form.value.startDate) {
    errors.value.startDate = 'Start date is required';
    isValid = false;
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(form.value.startDate);
    if (isNaN(start.getTime())) {
      errors.value.startDate = 'Please enter a valid start date';
      isValid = false;
    } else if (start < today) {
      errors.value.startDate = 'Start date cannot be in the past';
      isValid = false;
    }
  }

  // 3. End Date validation
  if (!form.value.endDate) {
    errors.value.endDate = 'End date is required';
    isValid = false;
  } else {
    const start = form.value.startDate ? new Date(form.value.startDate) : null;
    const end = new Date(form.value.endDate);
    if (isNaN(end.getTime())) {
      errors.value.endDate = 'Please enter a valid end date';
      isValid = false;
    } else if (start && end < start) {
      errors.value.endDate = 'End date cannot be before start date';
      isValid = false;
    }
  }

  // 4. Travelers validation
  if (form.value.travelers === '' || form.value.travelers === null || form.value.travelers === undefined) {
    errors.value.travelers = 'Number of travelers is required';
    isValid = false;
  } else {
    const num = Number(form.value.travelers);
    if (isNaN(num) || !Number.isInteger(num)) {
      errors.value.travelers = 'Number of travelers must be a whole number';
      isValid = false;
    } else if (num < 1) {
      errors.value.travelers = 'Number of travelers must be at least 1';
      isValid = false;
    } else if (num > 50) {
      errors.value.travelers = 'Number of travelers cannot exceed 50';
      isValid = false;
    }
  }

  // 5. Budget validation
  if (form.value.budgetAmount === '' || form.value.budgetAmount === null || form.value.budgetAmount === undefined) {
    errors.value.budget = 'Please enter your budget';
    isValid = false;
  } else {
    const bNum = Number(form.value.budgetAmount);
    if (isNaN(bNum)) {
      errors.value.budget = 'Budget must be a valid number';
      isValid = false;
    } else if (bNum <= 0) {
      errors.value.budget = 'Budget must be greater than 0';
      isValid = false;
    }
  }

  // 6. Interests validation
  const interestsVal = form.value.interests ? form.value.interests.trim() : '';
  if (!interestsVal) {
    errors.value.interests = 'Please enter your travel interests or preferences';
    isValid = false;
  } else if (interestsVal.length < 3) {
    errors.value.interests = 'Please provide meaningful travel interests (e.g. Nature, Food, Museums)';
    isValid = false;
  }

  return isValid;
}

async function handleGenerate() {
  if (!validateForm()) {
    return;
  }

  generating.value = true;
  error.value = '';
  generatedItinerary.value = null;

  try {
    const formattedBudget = `${form.value.currency}${form.value.budgetAmount}`;
    const res = await api.generateItinerary({
      destination: form.value.destination,
      destinationData: form.value.destinationData,
      days: form.value.days,
      startDate: form.value.startDate,
      endDate: form.value.endDate,
      travelers: form.value.travelers,
      budget: formattedBudget,
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
    const formattedBudget = `${form.value.currency}${form.value.budgetAmount}`;
    const tripTitle = `${form.value.destinationData?.city || form.value.destinationData?.name || form.value.destination} Trip`;

    const payload = {
      title: tripTitle,
      destination: form.value.destination,
      destinationData: form.value.destinationData,
      startDate: form.value.startDate || null,
      endDate: form.value.endDate || null,
      preferences: {
        travelers: form.value.travelers,
        budget: formattedBudget,
        travelStyle: form.value.travelStyle,
        interests: form.value.interests,
        additionalPreferences: form.value.additionalPreferences,
        destinationData: form.value.destinationData
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

/* Form validation styles */
.field-error {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--danger);
  margin-top: 0.35rem;
}

.form-control.input-error {
  border-color: var(--danger);
  background-color: #fffbfa;
}

.form-control.input-error:focus {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

/* Autocomplete field styles */
.autocomplete-group {
  position: relative;
}

.input-with-status {
  position: relative;
  display: flex;
  align-items: center;
}

.status-indicator {
  position: absolute;
  right: 0.75rem;
  display: flex;
  align-items: center;
  pointer-events: none;
}

.selected-badge {
  color: #059669;
  font-weight: 800;
  font-size: 0.85rem;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--primary-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.inline-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--primary-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.autocomplete-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  max-height: 260px;
  overflow-y: auto;
  z-index: 1000;
}

.dropdown-item {
  padding: 0.65rem 0.85rem;
  font-size: 0.875rem;
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.12s;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.is-highlighted {
  background-color: var(--primary-light);
}

.suggestion-icon {
  font-size: 1rem;
  margin-top: 0.1rem;
  flex-shrink: 0;
}

.suggestion-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.suggestion-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.suggestion-name {
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-country {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-main);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.suggestion-formatted {
  font-size: 0.775rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.1rem;
}

.dropdown-msg {
  color: var(--text-muted);
  cursor: default;
  justify-content: center;
  padding: 1rem;
  font-size: 0.85rem;
}

.dropdown-empty {
  color: #475569;
}

.dropdown-error {
  color: var(--danger);
}

/* Budget input group */
.budget-input-group {
  display: flex;
  align-items: stretch;
}

.currency-prefix-select {
  border: 1px solid var(--border);
  border-right: none;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  background-color: var(--bg-main);
  color: var(--text-main);
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.65rem 0.5rem;
  cursor: pointer;
  outline: none;
}

.currency-prefix-select:focus {
  border-color: var(--primary);
}

.budget-number-input {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  flex: 1;
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
