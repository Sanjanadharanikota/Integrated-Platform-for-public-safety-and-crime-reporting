const express = require('express');
const {
    getReports,
    getReport,
    createReport,
    updateReport,
    deleteReport,
    getMapStats
} = require('../controllers/reportController');

const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();
const reportLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 8,
    message: 'Too many reports submitted too quickly. Please wait and try again.'
});

// Public routes
router.get('/map-stats', getMapStats);

// Protected routes
router.use(protect);

router
    .route('/')
    .get(getReports)
    .post(authorize('Citizen'), reportLimiter, upload.single('evidence'), createReport);

router
    .route('/:id')
    .get(getReport)
    .put(authorize('Police', 'Admin'), updateReport)
    .delete(authorize('Admin'), deleteReport);

module.exports = router;
