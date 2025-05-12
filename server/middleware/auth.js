const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return next(ApiError.unauthorized('Authentication token missing.'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return next(ApiError.unauthorized('User not found or token invalid.'));
        }

        req.user = { 
            userId: user.id,
            organizationId: user.organization_id,
            role: user.role,
            email: user.email // Adding email here if needed by other parts, like password update
        };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(ApiError.unauthorized('Token expired.'));
        }
        if (err.name === 'JsonWebTokenError') {
            return next(ApiError.forbidden('Invalid token structure.'));
        }
        
        logger.error('Authentication error during token verification or user lookup:', { message: err.message, name: err.name, code: err.code, stack: err.stack });
        return next(ApiError.internalServerError('Authentication failed.'));
    }
};

const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return next(ApiError.unauthorized('User role not available for authorization check.'));
        }
        if (!Array.isArray(roles)) {
            logger.error('authorizeRole: roles parameter must be an array');
            return next(ApiError.internalServerError('Server configuration error for authorization.'));
        }
        if (!roles.includes(req.user.role)) {
            return next(ApiError.forbidden(`User role '${req.user.role}' is not authorized for this resource.`));
        }
        next();
    };
};

const checkOrganizationMembership = async (req, res, next) => {
    if (!req.user || !req.user.organizationId) {
        return next(ApiError.forbidden('User is not associated with an organization or organization ID is missing from token.'));
    }

    if (req.params.organizationId && req.params.organizationId !== req.user.organizationId) {
        return next(ApiError.forbidden('Access denied to this organization\'s resources. User belongs to a different organization.'));
    }
    
    next();
};

module.exports = {
    authenticateToken,
    authorizeRole,
    checkOrganizationMembership,
};
