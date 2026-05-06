// backend/models/Alert.js
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    location: {
        type: String,
        required: [true, 'Location name is required']
    },
    coordinates: {
        lat: Number,
        lng: Number
    },
    status: {
        type: String,
        enum: ['Urgent', 'Addressed'],
        default: 'Urgent'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Alert', alertSchema);
