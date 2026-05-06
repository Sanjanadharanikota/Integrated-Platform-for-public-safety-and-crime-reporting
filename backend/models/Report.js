const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    crimeType: {
        type: String,
        required: [true, 'Please select a crime type']
    },
    location: {
        type: String,
        required: [true, 'Please add a location']
    },
    priority: {
        type: String,
        enum: ['High', 'Medium', 'Low'],
        default: 'Low'
    },
    status: {
        type: String,
        enum: ['Unassigned', 'Investigating', 'Resolved', 'Rejected'],
        default: 'Unassigned'
    },
    evidence: {
        type: String, // Path to image/file
        default: 'no-image.jpg'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

reportSchema.index({ user: 1, createdAt: -1 });
reportSchema.index({ location: 1, createdAt: -1 });
reportSchema.index({ status: 1, priority: 1 });

module.exports = mongoose.model('Report', reportSchema);
