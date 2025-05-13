// status-page-app/server/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const clientToken = authHeader && authHeader.split(' ')[1];

    if (clientToken == null) {
        logger.warn('[authenticateToken] No token provided by client.');
        return next(ApiError.unauthorized('Authentication token required.'));
    }
    
    logger.info(`[authenticateToken] DEBUG_MODE: Token received from client for verification: "${clientToken}"`);

    const secretForVerification = process.env.JWT_SECRET;
    logger.info(`[authenticateToken] DEBUG: Actual JWT_SECRET used for verification: "${secretForVerification}"`);

    if (!secretForVerification || secretForVerification.length < 16 || secretForVerification === 'your-super-secret-jwt-key-change-this-in-production') {
        logger.error('[authenticateToken] CRITICAL: JWT_SECRET is missing, placeholder, or too short. This will cause all token verifications to fail.');
        return next(ApiError.internalServerError('Server authentication configuration error (secret key issue).'));
    }

    try {
        const decodedClient = jwt.verify(clientToken, secretForVerification);
        
        const user = await User.findById(decodedClient.userId); 
        if (!user) {
            logger.warn(`[authenticateToken] Authenticated user ID ${decodedClient.userId} not found in database.`);
            return next(ApiError.unauthorized('User associated with token not found.'));
        }

        req.user = { 
            userId: user.id,
            organizationId: user.organization_id,
            role: user.role,
            email: user.email
        };
        logger.info(`[authenticateToken] Client token verified successfully for user ID: ${req.user.userId}`);
        next();
    } catch (err) {
        logger.warn(`[authenticateToken] Client token verification failed. Error: ${err.name}, Message: ${err.message}`);
        if (err.name === 'TokenExpiredError') {
            return next(ApiError.unauthorized('Token expired.'));
        }
        if (err.name === 'JsonWebTokenError') { 
            return next(ApiError.forbidden('Invalid token.'));
        }
        logger.error('[authenticateToken] Unexpected error during client token verification:', { message: err.message, stack: err.stack });
        return next(ApiError.internalServerError('Authentication failed due to an unexpected error.'));
    }
};

const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            logger.warn('Authorization check failed: User role not found on request.', { userId: req.user?.id });
            return next(ApiError.unauthorized('User role not available for authorization check.'));
        }
        if (!Array.isArray(roles)) {
            logger.error('authorizeRole: roles parameter must be an array');
            return next(ApiError.internalServerError('Server configuration error for authorization.'));
        }
        if (!roles.includes(req.user.role)) {
            logger.warn(`Authorization failed: User ${req.user.id} (role: ${req.user.role}) attempted action requiring roles: ${roles.join(',')}`);
            return next(ApiError.forbidden(`User role '${req.user.role}' is not authorized for this resource.`));
        }
        next();
    };
};

const checkOrganizationMembership = async (req, res, next) => {
    if (!req.user || !req.user.organizationId) {
        logger.warn('Organization membership check failed: User not associated with an organization or organizationId missing from req.user.', { userId: req.user?.id });
        return next(ApiError.forbidden('User is not associated with an organization or organization ID is missing.'));
    }
    if (req.params.organizationId && req.params.organizationId !== req.user.organizationId) {
        logger.warn(`Organization membership check failed: User ${req.user.userId} attempted to access resources for org ${req.params.organizationId} but belongs to ${req.user.organizationId}.`);
        return next(ApiError.forbidden('Access denied to this organization\'s resources.'));
    }
    next();
};

module.exports = {
    authenticateToken,
    authorizeRole,
    checkOrganizationMembership,
};