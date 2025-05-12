const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
    let error = { ...err }; 
    error.message = err.message; 

    if (!(err instanceof ApiError) || err.statusCode >= 500 || process.env.NODE_ENV === 'development') {
        logger.error(`${err.statusCode || 500} - ${error.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, {
            error: {
                message: error.message,
                name: err.name,
                stack: err.stack, 
                statusCode: err.statusCode,
            },
            request: {
                url: req.originalUrl,
                method: req.method,
                ip: req.ip,
                headers: req.headers, 
                body: req.body,     
                query: req.query,
                params: req.params,
            },
        });
    }

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            ...(process.env.NODE_ENV === 'development' && err.stack && { stack: err.stack }),
        });
    }
    
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token. Please log in again.';
        return res.status(401).json({ success: false, message });
    }
    if (err.name === 'TokenExpiredError') {
        const message = 'Your session has expired. Please log in again.';
        return res.status(401).json({ success: false, message });
    }

    return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'An unexpected server error occurred.',
        ...(process.env.NODE_ENV === 'development' && err.stack && { stack: err.stack }),
    });
};

module.exports = errorHandler;