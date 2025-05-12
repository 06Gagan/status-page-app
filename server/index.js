require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const logger = require('./config/logger');
const allRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

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
    socket.on('clientEvent', (data) => {
        logger.info(`Received clientEvent from ${socket.id}:`, data);
        if (socket.user && socket.user.organizationId) {
            io.to(`organization-${socket.user.organizationId}`).emit('serverEvent', { message: 'Event received and processed by server', data });
        }
    });
});
app.set('socketio', io);

app.set('trust proxy', 1); 

const corsOptions = {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(helmet());

// Adjust Rate Limiter for Development
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Increased limit for dev
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: 'Too many requests from this IP, please try again after 15 minutes.'
    },
    // keyGenerator: (req, res) => req.ip // Default, ensure 'trust proxy' is set if behind a reverse proxy
});
app.use('/api/', apiLimiter); // Apply to all /api routes, or be more specific

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

app.get('/', (req, res) => {
    res.send('Status Page API Running');
});

if (typeof allRoutes !== 'function' && Object.keys(allRoutes).length === 0 && allRoutes.constructor === Object) {
    logger.error('CRITICAL: allRoutes is an empty object or not a function! It might not have been exported correctly from ./routes/index.js or an issue in a sub-router.', { routerType: typeof allRoutes });
}
app.use('/api', allRoutes); // allRoutes should already be protected by apiLimiter if it's applied to /api/

app.use('/api/*', (req, res, next) => {
    next(ApiError.notFound('The requested API endpoint does not exist.'));
});

if (typeof errorHandler !== 'function') {
    logger.error('CRITICAL: errorHandler is not a function! It might not have been exported correctly from ./middleware/errorHandler.js. Value:', { handlerType: typeof errorHandler });
}
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

module.exports = { app, server };
