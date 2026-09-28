<template>
  <div class="login-page">
    <div class="login-card card">
      <div class="login-header">
        <img :src="logoUrl" alt="Romeio" class="login-logo-img" />
        <h1 class="login-title">Romeio</h1>
        <p class="login-subtitle">Plan your next trip with AI</p>
      </div>

      <div class="login-body">
        <div v-if="error" class="error-banner">
          {{ error }}
        </div>

        <div v-if="loading" class="loading-spinner">
          <div class="spinner"></div>
          <span>Signing in...</span>
        </div>

        <div v-show="!loading" class="auth-buttons-container">
          <!-- Google Identity Services Render Target -->
          <div id="googleBtn" class="google-btn-wrapper"></div>

          <div class="divider">
            <span>or test locally</span>
          </div>

          <!-- Quick Demo Login Button for Evaluators/Students -->
          <button 
            type="button" 
            class="btn btn-secondary demo-btn" 
            @click="handleDemoLogin"
          >
            ⚡ Quick Demo Login (Instant Test)
          </button>
        </div>

        <div class="features-summary">
          <div class="feature-item">
            <span class="feature-icon">✨</span>
            <span>Gemini AI Day-by-Day Itineraries</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🗺️</span>
            <span>OpenStreetMap & Leaflet Interactive Maps</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📍</span>
            <span>Automatic Nominatim Geocoding</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import logoUrl from '../assets/logo.png';

const router = useRouter();
const loading = ref(false);
const error = ref('');

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

onMounted(async () => {
  // Check if user is already logged in
  try {
    const authData = await api.getMe();
    if (authData.authenticated && authData.user) {
      router.push('/dashboard');
      return;
    }
  } catch {
    // Not logged in, proceed
  }

  // Initialize Google Identity Services
  initGoogleSignIn();
});

function initGoogleSignIn() {
  if (typeof window !== 'undefined' && window.google?.accounts?.id && googleClientId) {
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredentialResponse,
      auto_select: false
    });

    const btnContainer = document.getElementById('googleBtn');
    if (btnContainer) {
      window.google.accounts.id.renderButton(btnContainer, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 280
      });
    }
  } else {
    // Script might still be loading, retry in a moment
    setTimeout(() => {
      if (window.google?.accounts?.id && googleClientId) {
        initGoogleSignIn();
      }
    }, 500);
  }
}

async function handleGoogleCredentialResponse(response) {
  loading.value = true;
  error.value = '';

  try {
    const res = await api.googleLogin(response.credential);
    if (res.user) {
      router.push('/dashboard');
    }
  } catch (err) {
    console.error('Google Sign-in error:', err);
    error.value = err.response?.data?.error || 'Failed to authenticate with Google';
  } finally {
    loading.value = false;
  }
}

async function handleDemoLogin() {
  loading.value = true;
  error.value = '';

  try {
    const res = await api.demoLogin();
    if (res.user) {
      router.push('/dashboard');
    }
  } catch (err) {
    console.error('Demo Login error:', err);
    error.value = err.response?.data?.error || 'Failed to sign in with demo user';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.login-card {
  max-width: 440px;
  width: 100%;
  text-align: center;
  padding: 2.5rem 2rem;
  box-shadow: var(--shadow-lg);
  border-radius: var(--radius-lg);
}

.login-header {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-logo-img {
  width: 76px;
  height: 76px;
  object-fit: contain;
  margin-bottom: 0.75rem;
}

.login-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 0.35rem;
}

.login-subtitle {
  font-size: 1rem;
  color: var(--text-muted);
}

.auth-buttons-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.google-btn-wrapper {
  min-height: 44px;
  display: flex;
  justify-content: center;
}

.divider {
  width: 100%;
  text-align: center;
  border-bottom: 1px solid var(--border);
  line-height: 0.1em;
  margin: 0.5rem 0;
}

.divider span {
  background: #fff;
  padding: 0 10px;
  color: var(--text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.demo-btn {
  width: 100%;
  max-width: 280px;
}

.features-summary {
  text-align: left;
  background: var(--bg-main);
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.feature-icon {
  font-size: 1.1rem;
}

.error-banner {
  background-color: var(--danger-light);
  color: var(--danger);
  border: 1px solid #fecaca;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 0;
  color: var(--primary);
  font-weight: 600;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--primary-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
