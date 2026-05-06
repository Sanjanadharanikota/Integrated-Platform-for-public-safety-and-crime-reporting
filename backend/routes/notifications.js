// backend/routes/notifications.js
const express = require('express');
const {
    getNotifications,
    markAsRead,
    clearNotifications
} = require('../controllers/notificationController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getNotifications)
    .delete(clearNotifications);

router.route('/:id')
    .put(markAsRead);

module.exports = router;
