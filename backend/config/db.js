// backend/config/db.js
const mongoose = require('mongoose');

/**
 * This function connects to your MongoDB database.
 * We use 'async' and 'await' because connecting to a database takes time.
 */
const connectDB = async () => {
    try {
        // We use the MONGO_URI from the .env file for security
        console.log('Attempting to connect to MongoDB...');
        
        await mongoose.connect(process.env.MONGO_URI);
        
        console.log('✅ MongoDB Connected successfully!');
    } catch (err) {
        // If it fails, we log a warning but keep the server running for UI testing
        console.warn('⚠️ WARNING: MongoDB Connection Failed. UI will work, but data saving may not.');
        console.error('Error:', err.message);
    }
};

// We export this so it can be used in server.js
module.exports = connectDB;
