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
          <!-- Google Identity Services Official Render Target -->
          <div 
            v-show="gisButtonRendered" 
            id="googleBtn" 
            class="google-btn-wrapper"
          ></div>

          <!-- Native Fallback Google Button (Guaranteed to be visible at all times) -->
          <button
            v-show="!gisButtonRendered"
            type="button"
            class="google-custom-btn"
            @click="handleCustomGoogleSignIn"
            :disabled="loading"
            title="Continue with Google"
          >
            <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div class="divider">
            <span>or test locally</span>
          </div>

          <!-- Quick Demo Login Button for Evaluators/Students -->
          <button 
            type="button" 
            class="btn btn-secondary demo-btn" 
            @click="handleDemoLogin"
            :disabled="loading"
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
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import logoUrl from '../assets/logo.png';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const gisButtonRendered = ref(false);

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let initPollTimer = null;

onMounted(async () => {
  // 1. Check if OAuth redirect returned access_token in URL hash
  if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token=')) {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    if (accessToken) {
      window.history.replaceState(null, '', window.location.pathname);
      await authenticateWithAccessToken(accessToken);
      return;
    }
  }

  // 2. Check if OAuth returned error in query string
  if (typeof window !== 'undefined' && window.location.search) {
    const searchParams = new URLSearchParams(window.location.search);
    const oauthError = searchParams.get('error');
    if (oauthError) {
      error.value = 'Google authentication error: ' + oauthError;
    }
  }

  // 3. Check if user is already authenticated
  try {
    const authData = await api.getMe();
    if (authData.authenticated && authData.user) {
      router.push('/dashboard');
      return;
    }
  } catch {
    // Not logged in, proceed
  }

  // 4. Initialize Google Identity Services
  initGoogleSignIn();
});

onBeforeUnmount(() => {
  if (initPollTimer) {
    clearInterval(initPollTimer);
    initPollTimer = null;
  }
});

function initGoogleSignIn() {
  if (!googleClientId) return;

  let attempts = 0;
  const maxAttempts = 35; // Check for up to 7 seconds (35 * 200ms)

  initPollTimer = setInterval(() => {
    attempts++;

    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      clearInterval(initPollTimer);
      initPollTimer = null;

      try {
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

          // Check if Google rendered child elements/iframe
          setTimeout(() => {
            if (btnContainer.children && btnContainer.children.length > 0) {
              gisButtonRendered.value = true;
            }
          }, 350);
        }
      } catch (err) {
        console.warn('Google Identity Services renderButton failed:', err);
      }
    } else if (attempts >= maxAttempts) {
      clearInterval(initPollTimer);
      initPollTimer = null;
      // Fallback custom button remains active and ready
    }
  }, 200);
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

async function authenticateWithAccessToken(accessToken) {
  loading.value = true;
  error.value = '';

  try {
    const res = await api.googleLogin({ access_token: accessToken });
    if (res.user) {
      router.push('/dashboard');
    }
  } catch (err) {
    console.error('Google access token login failed:', err);
    error.value = err.response?.data?.error || 'Failed to authenticate with Google access token';
  } finally {
    loading.value = false;
  }
}

async function handleCustomGoogleSignIn() {
  loading.value = true;
  error.value = '';

  if (!googleClientId) {
    loading.value = false;
    error.value = 'Google Client ID is not configured in .env';
    return;
  }

  // Strategy 1: Use Google OAuth2 token client (popup)
  if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'openid email profile',
        callback: async (tokenRes) => {
          if (tokenRes.error) {
            loading.value = false;
            if (tokenRes.error !== 'access_denied') {
              error.value = 'Google Sign-in error: ' + (tokenRes.error_description || tokenRes.error);
            }
            return;
          }
          if (tokenRes.access_token) {
            await authenticateWithAccessToken(tokenRes.access_token);
          }
        },
        error_callback: (err) => {
          loading.value = false;
          console.error('Google token client error:', err);
          error.value = 'Google Sign-In was cancelled or encountered an error.';
        }
      });
      tokenClient.requestAccessToken();
      return;
    } catch (err) {
      console.warn('Token client init error, falling back:', err);
    }
  }

  // Strategy 2: If GIS accounts.id is loaded, trigger prompt
  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    try {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('GIS prompt not displayed:', notification.getNotDisplayedReason());
          fallbackToOAuthPopup();
        }
      });
      loading.value = false;
      return;
    } catch (e) {
      console.warn('GIS prompt error:', e);
    }
  }

  // Strategy 3: Standard OAuth2 Popup / Redirect fallback
  fallbackToOAuthPopup();
}

function fallbackToOAuthPopup() {
  const redirectUri = window.location.origin + '/login';
  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(googleClientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&prompt=select_account`;

  const popup = window.open(oauthUrl, 'GoogleLogin', 'width=520,height=620,top=100,left=100');
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    // Popup was blocked by browser, redirect current tab
    window.location.href = oauthUrl;
  } else {
    // Poll popup for redirect callback with hash
    const popupPoll = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(popupPoll);
          loading.value = false;
          return;
        }
        if (popup.location && popup.location.href.includes(window.location.origin)) {
          const hash = popup.location.hash;
          popup.close();
          clearInterval(popupPoll);
          if (hash && hash.includes('access_token=')) {
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get('access_token');
            if (token) {
              authenticateWithAccessToken(token);
            }
          }
        }
      } catch {
        // Cross-origin access while popup is on accounts.google.com (expected)
      }
    }, 500);
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
  width: 100%;
}

.google-btn-wrapper {
  min-height: 44px;
  display: flex;
  justify-content: center;
  width: 100%;
}

/* Custom Google Button */
.google-custom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  max-width: 280px;
  height: 44px;
  background-color: #ffffff;
  color: #3c4043;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: background-color 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.google-custom-btn:hover:not(:disabled) {
  background-color: #f8fafd;
  border-color: #d2e3fc;
  box-shadow: 0 1px 3px rgba(60, 64, 67, 0.25);
}

.google-custom-btn:active:not(:disabled) {
  background-color: #eeeeee;
}

.google-custom-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.google-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
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
