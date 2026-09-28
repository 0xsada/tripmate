# ✈️ AI Travel Planner (Full-Stack Web Application)

A beginner-friendly full-stack AI travel planner web application built with **Vue 3**, **Node.js/Express**, **PostgreSQL**, **Google Gemini AI**, and **OpenStreetMap & Leaflet**.

> **Note on Maps:** This project uses 100% open-source mapping. **NO Google Maps API** or credit card is required. It leverages **OpenStreetMap** for tiles, **Leaflet** for interactive maps, **Nominatim** for geocoding, and **OSRM** for driving route calculation.

---

## 🌟 Features

- **Google Authentication**: Secure Google Sign-In with backend token verification using `google-auth-library` and PostgreSQL session persistence. Includes a 1-click Demo Sign-In for instant local testing.
- **AI-Powered Itinerary Generation**: Uses **Google Gemini AI** (`gemini-3.8-flash` / `gemini-3.5-flash`) to generate structured day-by-day itineraries with specific attractions, real-world locations, and descriptions.
- **Interactive OpenStreetMap with Leaflet**:
  - OpenStreetMap tiles without API keys
  - Auto-geocoding of attraction names via Nominatim
  - **Day-Wise Locations Option**: Filter and view locations day-by-day or all together with distinct day color themes (`D1.1`, `D2.1`, etc.)
  - **Daily Driving Routes**: Calculates and draws OSRM route paths specific to the active day's itinerary stops
  - Custom numbered markers with popup activity descriptions and 1-click focus from schedule cards
  - Dynamic route lines between stops via OSRM (Open Source Routing Machine)
- **Trip Dashboard & Management**: Create, view, print/export, and delete personal trips with PostgreSQL JSONB storage.

---

## 🏗️ Project Architecture & Tech Stack

```text
travel-planner/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TravelMap.vue    # Leaflet + OpenStreetMap + Nominatim + OSRM
│   │   │   └── TripCard.vue     # Dashboard trip card display
│   │   ├── views/
│   │   │   ├── Login.vue        # Google Sign-in & demo login
│   │   │   ├── Dashboard.vue    # User's saved trips
│   │   │   ├── CreateTrip.vue   # Trip form + Gemini generation
│   │   │   └── TripDetails.vue  # Full itinerary & interactive map
│   │   ├── services/
│   │   │   └── api.js           # Axios API client
│   │   ├── router/
│   │   │   └── index.js         # Vue Router with navigation guards
│   │   ├── assets/
│   │   │   └── style.css        # Clean, modern custom stylesheet
│   │   ├── App.vue
│   │   └── main.js
│   ├── package.json
│   ├── vite.config.js
│   ├── .env
│   └── .env.example
│
├── backend/
│   ├── controllers/
│   │   ├── authController.js    # Google auth & session management
│   │   ├── tripController.js    # Gemini generator & CRUD for trips
│   │   └── geoController.js     # Nominatim and OSRM proxy
│   ├── routes/
│   │   ├── authRoutes.js        # /api/auth/*
│   │   ├── tripRoutes.js        # /api/trips/*
│   │   └── geoRoutes.js         # /api/geocode, /api/route
│   ├── services/
│   │   ├── gemini.js            # Gemini API integration & JSON validator
│   │   ├── geocoding.js         # Nominatim geocoder with cache & rate limiting
│   │   └── routing.js           # OSRM routing engine
│   ├── middleware/
│   │   └── auth.js              # Session-based auth verification
│   ├── db/
│   │   ├── index.js             # pg connection pool & auto-migration
│   │   └── schema.sql           # PostgreSQL table definitions
│   ├── server.js                # Express app entry point
│   ├── package.json
│   ├── .env
│   └── .env.example
│
└── README.md
```

---

## 📋 Prerequisites

- **Node.js** v20+ or v22+
- **PostgreSQL** running on `localhost:5432`
- **Google Gemini API Key** (obtainable free from [Google AI Studio](https://aistudio.google.com/))
- **Google OAuth Client ID** (from [Google Cloud Console](https://console.cloud.google.com/apis/credentials))

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)

```env
PORT=5000
DATABASE_URL=postgresql://your_postgres_user:your_password@localhost:5432/travel_planner
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=
SESSION_SECRET=travel_planner_secret_session_key_2025
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

> **Note:** Notice there are **no Google Maps keys** in either file.

---

## 🗄️ Database Setup

1. Start your PostgreSQL service (if not already running):
   ```bash
   # On Linux/systemd:
   sudo systemctl start postgresql
   ```

2. Create the database:
   ```bash
   createdb -U postgres travel_planner
   # OR inside psql:
   # CREATE DATABASE travel_planner;
   ```

3. Initialize the schema:
   ```bash
   psql -U postgres -d travel_planner -f backend/db/schema.sql
   ```
   *(The backend also automatically runs `CREATE TABLE IF NOT EXISTS` on server startup if the database exists).*

---

## 🚀 Running the Application Locally

### 1. Start Backend Server

```bash
cd backend
npm install
npm run dev
```

The Express server will start on `http://localhost:5000`.

### 2. Start Frontend Server

Open a second terminal window:

```bash
cd frontend
npm install
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🌐 API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Service health check | No |
| `GET` | `/api/auth/me` | Get currently signed-in user | No |
| `POST` | `/api/auth/google` | Verify Google ID token & login | No |
| `POST` | `/api/auth/demo` | 1-Click demo login for testing | No |
| `POST` | `/api/auth/logout` | Destroy session & logout | Yes |
| `POST` | `/api/trips/generate` | Generate itinerary using Gemini | No |
| `POST` | `/api/trips` | Save a new trip | Yes |
| `GET` | `/api/trips` | List all saved trips for user | Yes |
| `GET` | `/api/trips/:id` | Get details for single trip | Yes |
| `DELETE` | `/api/trips/:id` | Delete a trip | Yes |
| `GET` | `/api/geocode?query=...` | Proxy to OpenStreetMap Nominatim | No |
| `GET` | `/api/route?coords=...` | Proxy to OSRM driving route | No |

---

## 🔒 OpenStreetMap Nominatim Compliance

Nominatim is a shared community service. This application respects the [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/):
- Sends a valid identifying `User-Agent`
- Throttles requests with a rate limiter (at least 1.1s between outgoing requests)
- Caches repeated location queries in memory to avoid redundant traffic.
