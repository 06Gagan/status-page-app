// status-page-app/server/index.js
require('dotenv').config(); 
const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io'); 
const cors = require('cors');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 
const morgan = require('morgan');

const logger = require('./config/logger'); 
const allRoutes = require('./routes/index'); 
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');
const httpStatus = require('http-status'); 
const jwt = require('jsonwebtoken'); 
const User = require('./models/User'); 

const app = express();
const server = http.createServer(app); 

// Configure allowed origins
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ["http://localhost:3000"];
logger.info(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// MODIFIED Socket.IO authentication middleware
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
            logger.info(`Socket authenticated for user ${user.id}, org ${user.organization_id}`);
            next();
        } catch (err) {
            logger.error('Socket authentication error:', { message: err.message });
            logger.warn('Socket connection with invalid token, proceeding as unauthenticated.');
            next();
        }
    } else {
        logger.info('Socket connection attempt without token (public viewer).');
        next();
    }
});

io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    if (socket.user && socket.user.organizationId) {
        const roomName = `organization-${socket.user.organizationId}`;
        socket.join(roomName);
        logger.info(`Socket ${socket.id} (User ${socket.user.id}) joined room: ${roomName}`);
    }

    socket.on('joinPublicRoom', (orgId) => {
        if (orgId) {
            const roomName = `organization-${orgId}`;
            socket.join(roomName);
            logger.info(`Socket ${socket.id} (public viewer) joined room: ${roomName}`);
        } else {
            logger.warn(`Socket ${socket.id} tried to join public room without orgId.`);
        }
    });
    
    socket.on('disconnect', (reason) => {
        logger.info(`Socket disconnected: ${socket.id}. Reason: ${reason}`);
    });
});

app.set('socketio', io); 
app.set('trust proxy', 1); 

// CORS configuration
const corsOptions = {
    origin: allowedOrigins,
    optionsSuccessStatus: 200,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
})); 

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 10000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: 'Too many requests from this IP, please try again after 15 minutes.'
    },
});

app.use('/api/v1/', apiLimiter); 

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Routes
app.use('/api/v1', allRoutes); 

// 404 handler for API routes
app.use('/api/v1/*', (req, res, next) => { 
    next(new ApiError(httpStatus.NOT_FOUND || 404, 'The requested API endpoint does not exist.'));
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => { 
    logger.info(`Server running on port ${PORT}`);
    console.log(`Server running on port ${PORT}`); 
});

module.exports = { app, server };