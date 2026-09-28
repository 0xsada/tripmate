import { createRouter, createWebHistory } from 'vue-router';
import api from '../services/api';

import Login from '../views/Login.vue';
import Dashboard from '../views/Dashboard.vue';
import CreateTrip from '../views/CreateTrip.vue';
import TripDetails from '../views/TripDetails.vue';

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { guestOnly: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/create-trip',
    name: 'CreateTrip',
    component: CreateTrip,
    meta: { requiresAuth: true }
  },
  {
    path: '/trips/:id',
    name: 'TripDetails',
    component: TripDetails,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  let isAuthenticated = false;
  try {
    const auth = await api.getMe();
    isAuthenticated = !!(auth && auth.authenticated && auth.user);
  } catch {
    isAuthenticated = false;
  }

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ path: '/login' });
  }

  if (to.meta.guestOnly && isAuthenticated) {
    return next({ path: '/dashboard' });
  }

  next();
});

export default router;
