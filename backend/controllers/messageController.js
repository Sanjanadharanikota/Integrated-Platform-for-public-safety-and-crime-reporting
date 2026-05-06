const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get messages for current user
// @route   GET /api/messages
// @access  Private
exports.getMessages = async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [{ sender: req.user.id }, { recipient: req.user.id }]
        })
            .populate('sender', 'name role')
            .populate('recipient', 'name role')
            .sort('createdAt')
            .lean();

        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get allowed contacts for current user
// @route   GET /api/messages/contacts
// @access  Private
exports.getContacts = async (req, res) => {
    try {
        const query = req.user.role === 'Citizen'
            ? { role: { $in: ['Police', 'Admin'] }, isActive: true }
            : { role: 'Citizen', isActive: true };

        const users = await User.find(query).select('name role email').sort('name').lean();

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Send a message between citizen and police/admin
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
    try {
        const { recipientId, body, reportId } = req.body;

        if (!recipientId || !body) {
            return res.status(400).json({ success: false, message: 'Recipient and message are required' });
        }

        const recipient = await User.findById(recipientId);

        if (!recipient) {
            return res.status(404).json({ success: false, message: 'Recipient not found' });
        }

        if (recipient._id.toString() === req.user.id) {
            return res.status(400).json({ success: false, message: 'You cannot send a message to yourself' });
        }

        const senderRole = req.user.role;
        const recipientRole = recipient.role;
        const validCitizenFlow =
            (senderRole === 'Citizen' && ['Police', 'Admin'].includes(recipientRole)) ||
            (['Police', 'Admin'].includes(senderRole) && recipientRole === 'Citizen');

        if (!validCitizenFlow) {
            return res.status(403).json({
                success: false,
                message: 'Messages are only allowed between citizens and police/admin users'
            });
        }

        const message = await Message.create({
            sender: req.user.id,
            recipient: recipientId,
            body,
            report: reportId || null
        });

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name role')
            .populate('recipient', 'name role');

        res.status(201).json({
            success: true,
            data: populatedMessage
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
