const db = require('../db');
const gemini = require('../services/gemini');

/**
 * POST /api/trips/generate
 * Calls Gemini to generate structured itinerary JSON
 */
async function generateItinerary(req, res) {
  try {
    const {
      destination,
      destinationData,
      days,
      startDate,
      endDate,
      travelers,
      budget,
      travelStyle,
      interests,
      additionalPreferences
    } = req.body;

    // Destination validation
    if (!destination || (typeof destination === 'string' && !destination.trim())) {
      return res.status(400).json({ error: 'Destination is required' });
    }

    // Dates validation
    if (!startDate) {
      return res.status(400).json({ error: 'Start date is required' });
    }
    if (!endDate) {
      return res.status(400).json({ error: 'End date is required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ error: 'Valid start date is required' });
    }
    if (isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Valid end date is required' });
    }
    if (end < start) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    // Travelers validation
    const numTravelers = parseInt(travelers, 10);
    if (!numTravelers || isNaN(numTravelers) || numTravelers < 1) {
      return res.status(400).json({ error: 'Number of travelers must be at least 1' });
    }

    // Budget validation
    if (!budget || (typeof budget === 'string' && !budget.trim())) {
      return res.status(400).json({ error: 'Please enter your budget' });
    }

    // Interests validation
    if (!interests || (typeof interests === 'string' && !interests.trim())) {
      return res.status(400).json({ error: 'Please enter your travel interests' });
    }

    // Determine number of days
    let numDays = parseInt(days, 10);
    if (!numDays || isNaN(numDays)) {
      const diffTime = Math.abs(end - start);
      numDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }

    const destString = typeof destination === 'string' 
      ? destination.trim() 
      : (destination.formatted || destination.name || 'Destination');

    // Call Gemini Service
    const itinerary = await gemini.generateTripItinerary({
      destination: destString,
      destinationData: destinationData || (typeof destination === 'object' ? destination : null),
      days: numDays,
      startDate,
      endDate,
      travelers: numTravelers,
      budget: typeof budget === 'string' ? budget.trim() : String(budget),
      travelStyle: travelStyle || 'Balanced',
      interests: typeof interests === 'string' ? interests.trim() : String(interests),
      additionalPreferences: additionalPreferences || ''
    });

    res.json({
      success: true,
      itinerary
    });
  } catch (error) {
    console.error('generateItinerary error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate itinerary with AI' });
  }
}

/**
 * POST /api/trips
 * Saves a new trip to the database
 */
async function createTrip(req, res) {
  try {
    const userId = req.user.id;
    const {
      title,
      destination,
      destinationData,
      startDate,
      endDate,
      preferences,
      itinerary
    } = req.body;

    if (!destination || !itinerary) {
      return res.status(400).json({ error: 'Destination and itinerary are required to save a trip' });
    }

    const destName = typeof destination === 'string' 
      ? destination.trim() 
      : (destination.formatted || destination.name || 'Trip');

    const tripTitle = title && title.trim() ? title.trim() : `${destName} Trip`;

    const tripPreferences = preferences ? { ...preferences } : {};
    if (destinationData) {
      tripPreferences.destinationData = destinationData;
    } else if (typeof destination === 'object' && destination !== null) {
      tripPreferences.destinationData = destination;
    }

    const result = await db.query(
      `INSERT INTO trips (user_id, title, destination, start_date, end_date, preferences, itinerary)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        tripTitle,
        destName,
        startDate || null,
        endDate || null,
        JSON.stringify(tripPreferences),
        JSON.stringify(itinerary)
      ]
    );

    res.status(201).json({
      message: 'Trip saved successfully',
      trip: result.rows[0]
    });
  } catch (error) {
    console.error('createTrip error:', error);
    res.status(500).json({ error: 'Failed to save trip to database' });
  }
}

/**
 * GET /api/trips
 * Get all trips for the authenticated user
 */
async function getTrips(req, res) {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT id, user_id, title, destination, start_date, end_date, preferences, itinerary, created_at
       FROM trips
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      trips: result.rows
    });
  } catch (error) {
    console.error('getTrips error:', error);
    res.status(500).json({ error: 'Failed to retrieve trips' });
  }
}

/**
 * GET /api/trips/:id
 * Get single trip by ID for the authenticated user
 */
async function getTripById(req, res) {
  try {
    const userId = req.user.id;
    const tripId = parseInt(req.params.id, 10);

    if (isNaN(tripId)) {
      return res.status(400).json({ error: 'Invalid trip ID' });
    }

    const result = await db.query(
      `SELECT id, user_id, title, destination, start_date, end_date, preferences, itinerary, created_at
       FROM trips
       WHERE id = $1 AND user_id = $2`,
      [tripId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json({
      trip: result.rows[0]
    });
  } catch (error) {
    console.error('getTripById error:', error);
    res.status(500).json({ error: 'Failed to retrieve trip' });
  }
}

/**
 * DELETE /api/trips/:id
 * Delete a trip
 */
async function deleteTrip(req, res) {
  try {
    const userId = req.user.id;
    const tripId = parseInt(req.params.id, 10);

    if (isNaN(tripId)) {
      return res.status(400).json({ error: 'Invalid trip ID' });
    }

    const result = await db.query(
      'DELETE FROM trips WHERE id = $1 AND user_id = $2 RETURNING id',
      [tripId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found or unauthorized' });
    }

    res.json({
      message: 'Trip deleted successfully',
      deletedId: tripId
    });
  } catch (error) {
    console.error('deleteTrip error:', error);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
}

module.exports = {
  generateItinerary,
  createTrip,
  getTrips,
  getTripById,
  deleteTrip
};
