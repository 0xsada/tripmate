const express = require('express');
const router = express.Router();
const geoController = require('../controllers/geoController');

router.get('/geocode', geoController.geocode);
router.get('/route', geoController.getRoute);

module.exports = router;
