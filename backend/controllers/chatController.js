// backend/controllers/chatController.js
const chatResponses = require('../utils/chatBrain');

// @desc    Handle chatbot queries (Rule-Based)
// @route   POST /api/chat
// @access  Public
exports.getChatResponse = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, error: "Message is required" });
        }

        const input = message.toLowerCase();
        let response = chatResponses["default"];

        // Keyword Matching Logic
        // Find the first keyword that exists in the user input
        for (const key in chatResponses) {
            if (input.includes(key) && key !== "default") {
                response = chatResponses[key];
                break;
            }
        }

        res.status(200).json({
            success: true,
            data: response
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
