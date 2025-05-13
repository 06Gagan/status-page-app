// status-page-app/server/index.js
require('dotenv').config(); // MUST BE THE VERY FIRST LINE
const express = require('express');
const http = require('http'); // Needed for Socket.IO
const { Server } = require('socket.io'); // Socket.IO
const cors = require('cors');
const helmet = require('helmet'); // For security headers
const rateLimit = require('express-rate-limit'); // For rate limiting
const morgan = require('morgan'); // For HTTP request logging

const logger = require('./config/logger'); // Your logger
const allRoutes = require('./routes'); // Your main router from routes/index.js
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');
const httpStatus = require('http-status'); // For HTTP status codes
const jwt = require('jsonwebtoken'); // For socket auth if needed directly
const User = require('./models/User'); // For socket auth if needed directly

const app = express();
const server = http.createServer(app); // Create HTTP server for Express and Socket.IO

// --- Socket.IO Setup ---
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Socket.IO authentication middleware (from your original file)
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            if (!user || !user.organization_id) {
                logger.warn(`Socket Auth: User not found or no organization_id for token UID ${decoded.userId}`);
                return next(new Error('Authentication error: User not found or invalid.'));
            }
            socket.user = {
                id: user.id,
                organizationId: user.organization_id,
                role: user.role
            };
            next();
        } catch (err) {
            logger.error('Socket authentication error:', { message: err.message });
            next(new Error('Authentication error: Invalid token.'));
        }
    } else {
        logger.warn('Socket connection attempt without token.');
        next(new Error('Authentication error: Token not provided.'));
    }
});

io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}, User ID: ${socket.user?.id}, Org ID: ${socket.user?.organizationId}`);
    if (socket.user && socket.user.organizationId) {
        const roomName = `organization-${socket.user.organizationId}`;
        socket.join(roomName);
        logger.info(`Socket ${socket.id} (User ${socket.user.id}) joined room: ${roomName}`);
    } else {
        logger.warn(`Socket ${socket.id} connected but no organizationId found in socket.user. Cannot join room.`);
    }
    socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
    });
    socket.on('clientEvent', (data) => { // Example event
        logger.info(`Received clientEvent from ${socket.id}:`, data);
        if (socket.user && socket.user.organizationId) {
            io.to(`organization-${socket.user.organizationId}`).emit('serverEvent', { message: 'Event received and processed by server', data });
        }
    });
});
app.set('socketio', io); // Make io accessible in controllers if needed

// --- Express Middleware ---
app.set('trust proxy', 1); // If behind a reverse proxy like Nginx or Heroku

const corsOptions = {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000", // Use CORS_ORIGIN from .env
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(helmet()); // Basic security headers

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 1000 : 100, // More requests in dev
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: 'Too many requests from this IP, please try again after 15 minutes.'
    },
});
// Apply rate limiter to all /api/v1 routes
app.use('/api/v1/', apiLimiter); // Important: Apply before mounting routes

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    // Log to file in production (via Winston logger)
    app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// --- API Routes ---
// Mount your main router from routes/index.js under /api/v1
app.use('/api/v1', allRoutes); // <<< THIS IS THE KEY LINE FOR THE BASE PATH

// --- Error Handling ---
// Handle 404 for any API routes not matched above
app.use('/api/v1/*', (req, res, next) => { // Specific to /api/v1 for 404s
    next(new ApiError(httpStatus.NOT_FOUND, 'The requested API endpoint does not exist.'));
});

// Centralized Error Handler (must be last)
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => { // Use http server to listen, so Socket.IO works
    logger.info(`Server running on port ${PORT}`);
    console.log(`Server running on port ${PORT}`); // For quick console feedback
});

module.exports = { app, server }; // Export for testing or other purposes if needed