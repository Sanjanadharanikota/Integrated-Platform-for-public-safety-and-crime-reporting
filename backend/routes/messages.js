const express = require('express');
const { getMessages, sendMessage, getContacts } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();
const messageLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: 'Too many messages sent in a short time. Please slow down and try again.'
});

router.use(protect);

router.get('/contacts', getContacts);

router.route('/')
    .get(getMessages)
    .post(messageLimiter, sendMessage);

module.exports = router;
