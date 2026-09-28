<template>
  <div class="app-container">
    <!-- Main Top Navbar -->
    <header class="navbar">
      <router-link to="/dashboard" class="nav-brand">
        <img :src="logoUrl" alt="Roamio" class="brand-logo" />
        <span class="brand-text">Romeio</span>
      </router-link>

      <div class="nav-actions" v-if="user">
        <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
        <router-link to="/create-trip" class="nav-link">+ New Trip</router-link>

        <div class="user-profile">
          <img 
            :src="user.profile_picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'" 
            :alt="user.name" 
            class="user-avatar"
          />
          <span class="user-name">{{ user.name }}</span>
        </div>

        <button @click="handleLogout" class="btn btn-secondary btn-sm" title="Log Out">
          Log Out
        </button>
      </div>

      <div class="nav-actions" v-else-if="$route.path !== '/login'">
        <router-link to="/login" class="btn btn-primary btn-sm">
          Sign In
        </router-link>
      </div>
    </header>

    <!-- Main Content Body -->
    <main class="main-content">
      <router-view :key="$route.fullPath" @auth-change="checkUser" />
    </main>


  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from './services/api';
import logoUrl from './assets/logo.png';

const router = useRouter();
const route = useRoute();
const user = ref(null);

async function checkUser() {
  try {
    const auth = await api.getMe();
    if (auth && auth.authenticated && auth.user) {
      user.value = auth.user;
    } else {
      user.value = null;
    }
  } catch {
    user.value = null;
  }
}

async function handleLogout() {
  try {
    await api.logout();
    user.value = null;
    router.push('/login');
  } catch (err) {
    console.error('Logout failed:', err);
    user.value = null;
    router.push('/login');
  }
}

onMounted(() => {
  checkUser();
});

watch(
  () => route.path,
  () => {
    checkUser();
  }
);
</script>

<style scoped>
.nav-link {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-muted);
  transition: color 0.15s;
}

.nav-link:hover, .router-link-active {
  color: var(--primary);
  text-decoration: none;
}

.app-footer {
  background-color: var(--bg-card);
  border-top: 1px solid var(--border);
  padding: 1.5rem;
  margin-top: auto;
  text-align: center;
  font-size: 0.825rem;
  color: var(--text-muted);
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.osm-credit a {
  color: var(--primary);
}
</style>
