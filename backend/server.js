// backend/server.js
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const connectDB = require('./config/db');

/**
 * 1. Initialize Express & DB
 */
const app = express();
connectDB();

/**
 * 2. Import Routes
 */
const auth = require('./routes/auth');
const reports = require('./routes/reports');
const users = require('./routes/users');
const alerts = require('./routes/alerts');
const chat = require('./routes/chat');
const notifications = require('./routes/notifications');
const messages = require('./routes/messages');

/**
 * 3. Middleware Setup
 */
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser()); // Use cookie parser for HTTP-only JWT storage
app.use(cors({
    origin: true,
    credentials: true
}));
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(self)');
    next();
});

/**
 * 4. Mount Routes
 */
app.use('/api/auth', auth);
app.use('/api/reports', reports);
app.use('/api/users', users);
app.use('/api/alerts', alerts);
app.use('/api/chat', chat);
app.use('/api/notifications', notifications);
app.use('/api/messages', messages);
app.get('/api/health', (_req, res) => {
    res.status(200).json({ success: true, status: 'ok' });
});

/**
 * 5. Root Route (Serves UI)
 */
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(frontendDistPath));

app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.use((err, _req, res, _next) => {
    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message || 'Request failed'
        });
    }
});

/**
 * 6. Start the server
 */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`👉 Visit: http://localhost:${PORT}`);
});
