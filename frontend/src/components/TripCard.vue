<template>
  <div class="trip-card card">
    <div class="trip-card-header">
      <div class="trip-icon">📍</div>
      <div class="trip-title-info">
        <h3 class="trip-title">{{ trip.title }}</h3>
        <p class="trip-destination">{{ trip.destination }}</p>
      </div>
    </div>

    <div class="trip-card-body">
      <div class="trip-meta" v-if="trip.start_date">
        <span class="meta-item">
          📅 {{ formatDate(trip.start_date) }} <span v-if="trip.end_date">→ {{ formatDate(trip.end_date) }}</span>
        </span>
      </div>

      <p class="trip-summary" v-if="trip.itinerary?.summary">
        {{ trip.itinerary.summary }}
      </p>

      <div class="trip-tags">
        <span class="badge badge-primary">
          {{ trip.itinerary?.days?.length || 'Multiple' }} Days
        </span>
        <span class="badge badge-accent" v-if="trip.preferences?.travelStyle">
          {{ trip.preferences.travelStyle }}
        </span>
        <span class="badge" v-if="trip.preferences?.budget" style="background: #f1f5f9; color: #475569;">
          {{ trip.preferences.budget }}
        </span>
      </div>
    </div>

    <div class="trip-card-footer">
      <router-link :to="`/trips/${trip.id}`" class="btn btn-primary btn-sm">
        View Itinerary & Map →
      </router-link>
      <button 
        class="btn btn-danger btn-sm" 
        @click="$emit('delete', trip.id)"
        title="Delete Trip"
      >
        🗑️
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  trip: {
    type: Object,
    required: true
  }
});

defineEmits(['delete']);

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
</script>

<style scoped>
.trip-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.trip-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.trip-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.trip-icon {
  font-size: 1.5rem;
  background: var(--bg-main);
  border-radius: var(--radius-sm);
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.trip-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.25;
}

.trip-destination {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.trip-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.trip-meta {
  font-size: 0.825rem;
  color: var(--text-muted);
}

.trip-summary {
  font-size: 0.875rem;
  color: #334155;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.trip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: auto;
}

.trip-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.85rem;
  border-top: 1px solid var(--border);
}
</style>
