// status-page-app/server/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Assuming User model has findById
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        logger.warn('Authentication attempt failed: No token provided.');
        return next(ApiError.unauthorized('Authentication token required.'));
    }

    const currentJwtSecretForVerify = process.env.JWT_SECRET;
    if (!currentJwtSecretForVerify || currentJwtSecretForVerify === 'your-super-secret-jwt-key-change-this-in-production') {
        logger.error('[authenticateToken] CRITICAL: JWT_SECRET is missing or is placeholder during token verification. This will cause all token verifications to fail.');
        return next(ApiError.internalServerError('Server authentication configuration error.'));
    }
    // logger.info(`[authenticateToken] Verifying token with JWT_SECRET: ${currentJwtSecretForVerify ? 'SET (value hidden)' : 'NOT SET'}`); // For extreme debug, but be careful logging secrets

    try {
        const decoded = jwt.verify(token, currentJwtSecretForVerify);
        
        // Fetch user details to ensure user still exists and has necessary info
        const user = await User.findById(decoded.userId); 
        if (!user) {
            logger.warn(`Authenticated user ID ${decoded.userId} not found in database.`);
            return next(ApiError.unauthorized('User associated with token not found.'));
        }

        req.user = { 
            userId: user.id, // Use user.id from the database record
            organizationId: user.organization_id, // from DB
            role: user.role, // from DB
            email: user.email // from DB, if needed by other parts like password update
        };
        // logger.info(`[authenticateToken] Token verified successfully for user ID: ${req.user.userId}`);
        next();
    } catch (err) {
        logger.warn(`[authenticateToken] Token verification failed. Error: ${err.name}, Message: ${err.message}`);
        if (err.name === 'TokenExpiredError') {
            return next(ApiError.unauthorized('Token expired.'));
        }
        if (err.name === 'JsonWebTokenError') { // Catches invalid signature, malformed token, etc.
            return next(ApiError.forbidden('Invalid token.'));
        }
        // For other unexpected errors during verification
        logger.error('Unexpected error during token verification:', { message: err.message, stack: err.stack });
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
    // This check is relevant if an :organizationId is part of the URL param
    // and you want to ensure the user belongs to *that specific* org.
    // If routes are just for "the user's own org", then req.user.organizationId is sufficient.
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