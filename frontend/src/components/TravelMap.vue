<template>
  <div class="travel-map-wrapper">
    <div class="map-header">
      <div class="map-title-row">
        <h3 class="map-title">🗺️ Interactive Map (OpenStreetMap & Leaflet)</h3>
        <span v-if="loading" class="map-status badge badge-primary">Geocoding locations...</span>
        <span v-else-if="displayedMarkers.length === 0 && destinationCoords" class="map-status badge badge-accent">📍 Destination centered</span>
        <span v-else class="map-status badge badge-accent">{{ displayedMarkers.length }} locations on map</span>
      </div>
      <p class="map-subtitle">
        Locations discovered by Gemini and geocoded via OpenStreetMap. Filter day-by-day to explore daily routes.
      </p>

      <!-- Day-wise Locations Filter Bar -->
      <div class="day-filter-bar" v-if="availableDays.length > 0">
        <span class="day-filter-label">📅 Day Selection:</span>
        <div class="day-buttons-scroll">
          <button 
            type="button"
            class="day-filter-btn" 
            :class="{ active: selectedDay === 'all' }"
            @click="setDayFilter('all')"
          >
            All Days ({{ totalLocationsCount }})
          </button>

          <button 
            v-for="d in availableDays" 
            :key="d.day"
            type="button"
            class="day-filter-btn" 
            :class="{ active: selectedDay === d.day }"
            :style="selectedDay === d.day ? { backgroundColor: getDayColor(d.day), borderColor: getDayColor(d.day), color: '#ffffff' } : {}"
            @click="setDayFilter(d.day)"
          >
            <span class="day-dot" :style="{ backgroundColor: getDayColor(d.day) }"></span>
            Day {{ d.day }}
            <span class="day-count">({{ d.activities?.length || 0 }})</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Map container -->
    <div ref="mapContainer" class="leaflet-map-element"></div>

    <!-- Current View Status / Route Info -->
    <div class="map-meta-info" v-if="selectedDay !== 'all' || routeSummary">
      <div v-if="selectedDay !== 'all'" class="day-indicator">
        Showing locations for <strong>Day {{ selectedDay }}</strong> ({{ displayedMarkers.length }} stops)
      </div>
      <div v-if="routeSummary" class="route-info-box">
        🚗 <strong>Day Route via OSRM:</strong> {{ (routeSummary.distanceMeters / 1000).toFixed(1) }} km (approx. {{ Math.round(routeSummary.durationSeconds / 60) }} mins driving)
      </div>
    </div>

    <!-- Location pill list below map for easy jumping -->
    <div class="locations-bar" v-if="displayedMarkers.length > 0">
      <button 
        v-for="item in displayedMarkers" 
        :key="item.id"
        class="location-pill"
        @click="zoomToMarker(item)"
      >
        <span class="pill-number" :style="{ backgroundColor: getDayColor(item.dayNumber) }">
          {{ item.displayLabel }}
        </span>
        <span class="pill-name">{{ item.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import L from 'leaflet';
import api from '../services/api';

const props = defineProps({
  destination: {
    type: String,
    default: ''
  },
  destinationCoords: {
    type: Object,
    default: null
  },
  days: {
    type: Array,
    default: () => []
  },
  activities: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: ''
  },
  showRoute: {
    type: Boolean,
    default: true
  }
});

const mapContainer = ref(null);
let map = null;
let markersLayer = null;
let routeLayer = null;

const loading = ref(false);
const selectedDay = ref('all'); // 'all' or day number (1, 2, ...)
const allGeocodedItems = ref([]);
const routeSummary = ref(null);

const DAY_COLORS = [
  '#4f46e5', // Day 1: Indigo
  '#059669', // Day 2: Emerald
  '#d97706', // Day 3: Amber
  '#7c3aed', // Day 4: Violet
  '#e11d48', // Day 5: Rose
  '#0891b2', // Day 6: Cyan
  '#ea580c', // Day 7: Orange
  '#475569'  // Day 8+: Slate
];

function getDayColor(dayNum) {
  if (!dayNum) return '#4f46e5';
  const idx = (Math.max(1, dayNum) - 1) % DAY_COLORS.length;
  return DAY_COLORS[idx];
}

// Compute normalized list of days
const availableDays = computed(() => {
  if (props.days && props.days.length > 0) {
    return props.days;
  }
  return [];
});

// Normalized flat list of all activities with day numbers attached
const normalizedActivities = computed(() => {
  if (props.days && props.days.length > 0) {
    const list = [];
    props.days.forEach((dayObj) => {
      const dNum = dayObj.day || 1;
      (dayObj.activities || []).forEach((act, actIdx) => {
        list.push({
          ...act,
          dayNumber: dNum,
          dayTitle: dayObj.title || '',
          dayIndex: actIdx + 1,
          id: `d${dNum}-a${actIdx + 1}`
        });
      });
    });
    return list;
  }

  // Fallback to plain activities array
  return (props.activities || []).map((act, idx) => ({
    ...act,
    dayNumber: 1,
    dayIndex: idx + 1,
    id: `a${idx + 1}`
  }));
});

const totalLocationsCount = computed(() => normalizedActivities.value.length);

// Filtered markers based on selectedDay
const displayedMarkers = computed(() => {
  if (selectedDay.value === 'all') {
    return allGeocodedItems.value;
  }
  return allGeocodedItems.value.filter(item => item.dayNumber === selectedDay.value);
});

// Leaflet custom marker icon
const createNumberedIcon = (label, color = '#4f46e5') => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background: ${color};
        color: #ffffff;
        border: 2px solid #ffffff;
        border-radius: 50%;
        min-width: 32px;
        height: 32px;
        padding: 0 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 11px;
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.35);
      ">
        ${label}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
};

function initMap() {
  if (!mapContainer.value || map) return;

  map = L.map(mapContainer.value, {
    scrollWheelZoom: true
  }).setView([20.5937, 78.9629], 5);

  // OpenStreetMap raster tiles (strictly OpenStreetMap, no Google Maps)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  }).addTo(map);

  markersLayer = L.featureGroup().addTo(map);
  routeLayer = L.featureGroup().addTo(map);

  setTimeout(() => {
    map?.invalidateSize();
  }, 300);
}

async function loadAndPlotLocations() {
  if (!map) return;

  loading.value = true;
  markersLayer.clearLayers();
  routeLayer.clearLayers();
  allGeocodedItems.value = [];
  routeSummary.value = null;

  const destLat = props.destinationCoords?.latitude ?? props.destinationCoords?.lat ?? null;
  const destLon = props.destinationCoords?.longitude ?? props.destinationCoords?.lon ?? null;

  const timeoutId = setTimeout(() => {
    if (loading.value) {
      console.warn('Map geocoding safeguard reached (12s). Releasing loading state.');
      loading.value = false;
    }
  }, 12000);

  try {
    const activitiesToGeocode = normalizedActivities.value.filter(a => a && (a.location || a.name));

    // If destination only (no activities)
    if (activitiesToGeocode.length === 0 && (props.destination || (destLat != null && destLon != null))) {
      let lat = destLat;
      let lon = destLon;
      let displayName = props.destination;

      if (lat == null || lon == null) {
        const destGeo = await api.geocode(props.destination);
        if (destGeo) {
          lat = destGeo.latitude;
          lon = destGeo.longitude;
          displayName = destGeo.display_name || props.destination;
        }
      }

      if (lat != null && lon != null) {
        const marker = L.marker([lat, lon], {
          icon: createNumberedIcon('★', '#4f46e5')
        }).bindPopup(`
          <div class="custom-map-popup">
            <h4>${props.destination || 'Destination'}</h4>
            <p>${displayName}</p>
          </div>
        `);
        markersLayer.addLayer(marker);
        map.setView([lat, lon], 12);
      }
      loading.value = false;
      return;
    }

    // Prepare batch queries
    const locationQueries = activitiesToGeocode.map(a => a.location || `${a.name}, ${props.destination}`);
    const geocodeResults = await api.batchGeocode(locationQueries);

    const geocodedList = [];

    activitiesToGeocode.forEach((activity) => {
      const query = activity.location || `${activity.name}, ${props.destination}`;
      let geo = geocodeResults[query];

      if (!geo && props.destination && geocodeResults[props.destination]) {
        geo = geocodeResults[props.destination];
      }

      const lat = geo?.latitude;
      const lon = geo?.longitude;

      if (lat != null && lon != null) {
        const dayColor = getDayColor(activity.dayNumber);
        const displayLabel = `D${activity.dayNumber}.${activity.dayIndex}`;

        const marker = L.marker([lat, lon], {
          icon: createNumberedIcon(displayLabel, dayColor)
        });

        marker.bindPopup(`
          <div class="custom-map-popup">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:5px;">
              <span style="background:${dayColor}; color:white; font-size:11px; font-weight:700; padding:2px 7px; border-radius:4px;">
                Day ${activity.dayNumber}
              </span>
              <span style="font-size:11px; color:#64748b; font-weight:600;">Activity #${activity.dayIndex}</span>
            </div>
            <h4>${activity.name}</h4>
            <p>${activity.description || ''}</p>
            <div class="popup-loc">📍 ${activity.location || geo.display_name}</div>
          </div>
        `);

        geocodedList.push({
          id: activity.id,
          name: activity.name,
          dayNumber: activity.dayNumber,
          dayIndex: activity.dayIndex,
          displayLabel,
          lat,
          lon,
          marker
        });
      }
    });

    allGeocodedItems.value = geocodedList;

    // Fallback: If no activity markers could be plotted, but we have destination coordinates, plot the destination center
    if (geocodedList.length === 0 && destLat != null && destLon != null) {
      const destMarker = L.marker([destLat, destLon], {
        icon: createNumberedIcon('★', '#4f46e5')
      }).bindPopup(`
        <div class="custom-map-popup">
          <h4>${props.destination || 'Destination'}</h4>
          <p>Destination center</p>
        </div>
      `);
      markersLayer.addLayer(destMarker);
      map.setView([destLat, destLon], 12);
    } else {
      // Render markers based on current selectedDay
      renderActiveLayer();
    }

  } catch (error) {
    console.error('Error plotting map locations:', error);
  } finally {
    clearTimeout(timeoutId);
    loading.value = false;
    map?.invalidateSize();
  }
}

async function renderActiveLayer() {
  if (!map || !markersLayer || !routeLayer) return;

  markersLayer.clearLayers();
  routeLayer.clearLayers();
  routeSummary.value = null;

  const currentItems = displayedMarkers.value;
  if (currentItems.length === 0) return;

  const coords = [];
  currentItems.forEach(item => {
    markersLayer.addLayer(item.marker);
    coords.push({ lon: item.lon, lat: item.lat });
  });

  // Fit view bounds
  if (markersLayer.getLayers().length > 0) {
    map.fitBounds(markersLayer.getBounds(), { padding: [50, 50], maxZoom: 15 });
  }

  // Draw OSRM driving route for the selected day's sequential stops
  if (props.showRoute && coords.length >= 2) {
    await plotOSRMRoute(coords, selectedDay.value !== 'all' ? getDayColor(selectedDay.value) : '#4f46e5');
  }
}

async function plotOSRMRoute(coords, color = '#4f46e5') {
  try {
    const coordsStr = coords.map(c => `${c.lon},${c.lat}`).join(';');
    const routeData = await api.getRoute(coordsStr);

    if (routeData && routeData.geometry && routeData.geometry.coordinates) {
      routeSummary.value = {
        distanceMeters: routeData.distanceMeters,
        durationSeconds: routeData.durationSeconds
      };

      const latLngs = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]);

      const polyline = L.polyline(latLngs, {
        color: color,
        weight: 5,
        opacity: 0.8,
        dashArray: '6, 8',
        lineCap: 'round'
      });

      routeLayer.addLayer(polyline);
    }
  } catch (err) {
    console.warn('Could not calculate OSRM route:', err);
  }
}

function setDayFilter(day) {
  selectedDay.value = day;
  renderActiveLayer();
}

function zoomToMarker(item) {
  if (!map || !item) return;
  map.setView([item.lat, item.lon], 15, { animate: true });
  item.marker.openPopup();
}

function focusLocation(activityName, dayNumber) {
  if (dayNumber && selectedDay.value !== 'all' && selectedDay.value !== dayNumber) {
    selectedDay.value = dayNumber;
    renderActiveLayer();
  }

  nextTick(() => {
    const target = allGeocodedItems.value.find(item => 
      item.name.toLowerCase().includes(activityName.toLowerCase()) ||
      activityName.toLowerCase().includes(item.name.toLowerCase())
    );

    if (target) {
      zoomToMarker(target);
    }
  });
}

defineExpose({
  setDayFilter,
  focusLocation,
  zoomToMarker
});

onMounted(() => {
  nextTick(() => {
    initMap();
    loadAndPlotLocations();
  });
});

watch(
  () => [props.days, props.activities, props.destination, props.destinationCoords],
  () => {
    nextTick(() => {
      loadAndPlotLocations();
    });
  },
  { deep: true }
);

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<style scoped>
.travel-map-wrapper {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.map-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.map-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.map-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
}

.map-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Day Filter Bar */
.day-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--bg-main);
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  flex-wrap: wrap;
}

.day-filter-label {
  font-size: 0.825rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
}

.day-buttons-scroll {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.day-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 9999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
}

.day-filter-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.day-filter-btn.active {
  background-color: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
}

.day-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.day-count {
  font-size: 0.75rem;
  opacity: 0.85;
}

.leaflet-map-element {
  width: 100%;
  height: 460px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: #e5e7eb;
}

.map-meta-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.day-indicator {
  font-size: 0.85rem;
  color: #334155;
}

.route-info-box {
  background: var(--primary-light);
  color: var(--primary);
  border: 1px solid #c7d2fe;
  padding: 0.55rem 0.85rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}

.locations-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-top: 0.25rem;
  max-height: 120px;
  overflow-y: auto;
}

.location-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--bg-main);
  border: 1px solid var(--border);
  padding: 0.3rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.775rem;
  font-weight: 600;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
}

.location-pill:hover {
  background: var(--primary-light);
  border-color: var(--border-focus);
  color: var(--primary);
}

.pill-number {
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
