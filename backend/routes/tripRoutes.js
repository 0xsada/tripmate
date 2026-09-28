const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { requireAuth } = require('../middleware/auth');

// Itinerary generation (can be accessed by authenticated user)
router.post('/generate', tripController.generateItinerary);

// Trip management routes (protected by requireAuth)
router.post('/', requireAuth, tripController.createTrip);
router.get('/', requireAuth, tripController.getTrips);
router.get('/:id', requireAuth, tripController.getTripById);
router.delete('/:id', requireAuth, tripController.deleteTrip);

module.exports = router;
