// backend/routes/alerts.js
const express = require('express');
const { createAlert, getAlerts } = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('Citizen'), createAlert);
router.get('/', authorize('Police', 'Admin'), getAlerts);

module.exports = router;
