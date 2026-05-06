// backend/controllers/alertController.js
const Alert = require('../models/Alert');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Create emergency alert
// @route   POST /api/alerts
// @access  Private (Citizen)
exports.createAlert = async (req, res) => {
    try {
        const { location, coordinates } = req.body;
        
        const alert = await Alert.create({
            user: req.user.id,
            location,
            coordinates
        });

        res.status(201).json({
            success: true,
            data: alert
        });

        // NOTIFICATION: Notify all Police and Admins about SOS alert
        const officials = await User.find({ role: { $in: ['Police', 'Admin'] } });
        const notifications = officials.map(off => ({
            user: off._id,
            title: 'URGENT: SOS ALERT',
            message: `Emergency SOS triggered in ${alert.location}. Check tracking dashboard.`,
            type: 'Emergency'
        }));
        await Notification.insertMany(notifications);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get all alerts
// @route   GET /api/alerts
// @access  Private (Police/Admin)
exports.getAlerts = async (req, res) => {
    try {
        const alerts = await Alert.find()
            .populate('user', 'name email')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: alerts.length,
            data: alerts
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
