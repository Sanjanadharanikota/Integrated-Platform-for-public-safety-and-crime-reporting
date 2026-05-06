const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    body: {
        type: String,
        required: [true, 'Please add a message'],
        trim: true
    },
    report: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

messageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });
messageSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
