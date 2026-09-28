require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { initDb } = require('./db');

const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');
const geoRoutes = require('./routes/geoRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with credentials for frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl) or allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in local development
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'travel_planner_secret_session_key_2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if running with HTTPS in production
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Travel Planner API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api', geoRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server and verify DB
async function startServer() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 Travel Planner Backend running on port ${PORT}`);
    console.log(`📍 API endpoints:`);
    console.log(`   - Auth:     http://localhost:${PORT}/api/auth`);
    console.log(`   - Trips:    http://localhost:${PORT}/api/trips`);
    console.log(`   - Geocode:  http://localhost:${PORT}/api/geocode`);
    console.log(`   - Route:    http://localhost:${PORT}/api/route`);
    console.log(`===============================================`);
  });
}

startServer();

module.exports = app;
