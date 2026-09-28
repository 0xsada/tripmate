# ✈️ AI Travel Planner

A full-stack AI itinerary generator and route visualizer using 100% open-source mapping.

---

## 💡 Why This Project Was Created

Planning trips manually takes hours of researching attractions, routes, and schedules. Furthermore, most AI travel planners rely on paid mapping services (like Google Maps API) that require credit cards and billing setups.

This project was built to provide a free, open-source alternative that:
- Generates tailored day-by-day travel itineraries using Google Gemini AI.
- Uses **OpenStreetMap**, **Leaflet**, and **OSRM** for maps and routes—requiring **zero paid map APIs or credit cards**.

---

## 📌 What Is the Project?

An end-to-end web application where users enter a destination, duration, budget, and travel interests to receive a complete itinerary with interactive day-wise map routes.

- **Frontend:** Vue 3, Vite, Leaflet
- **Backend:** Node.js, Express, PostgreSQL
- **AI & Geodata:** Google Gemini API, OpenStreetMap (Nominatim geocoding & OSRM routing)

---

## 🚀 How to Run

### 1. Prerequisites
- **Node.js** (v18+)
- **PostgreSQL** running locally
- **Google Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))

### 2. Database Setup
```bash
createdb -U postgres travel_planner
psql -U postgres -d travel_planner -f backend/db/schema.sql
```
*(Tables are also automatically created on backend start if the database exists).*

### 3. Environment Variables

**`backend/.env`**:
```env
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/travel_planner
GEMINI_API_KEY=<your_gemini_api_key>
SESSION_SECRET=<random_secret>
FRONTEND_URL=http://localhost:5173
```

**`frontend/.env`**:
```env
VITE_API_URL=http://localhost:5000
```

### 4. Start the Application

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

Visit **`http://localhost:5173`** in your browser. *(Use the 1-click **Demo Login** for instant local testing).*
