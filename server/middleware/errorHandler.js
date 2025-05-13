// status-page-app/server/middleware/errorHandler.js
const httpStatus = require('http-status'); // Ensure this package is installed
const logger = require('../config/logger');
// const ApiError = require('../utils/ApiError'); // ApiError is used by the error source, not directly here for status codes

const errorHandler = (err, req, res, next) => {
    let { statusCode, message } = err;

    // If statusCode is not set, or if httpStatus itself is not working, default to 500.
    // Use a direct number if httpStatus[statusCode] might be undefined.
    let effectiveStatusCode = statusCode || httpStatus.INTERNAL_SERVER_ERROR || 500;
    
    // If the error is not operational (e.g., a programming error), ensure it's a generic 500.
    if (err.isOperational === undefined || !err.isOperational) {
        effectiveStatusCode = httpStatus.INTERNAL_SERVER_ERROR || 500;
        message = httpStatus[effectiveStatusCode] || 'An unexpected error occurred';
    }
    
    // Ensure finalStatusCode is a number
    const finalStatusCode = Number(effectiveStatusCode) || 500;

    const response = {
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    };

    if (process.env.NODE_ENV === 'development' || err.isOperational) {
        logger.error(err.message || 'Error in errorHandler', { 
            statusCode: finalStatusCode,
            errorDetails: err, 
            stack: err.stack, 
            url: req.originalUrl, 
            method: req.method, 
            ip: req.ip,
            service: logger.defaultMeta?.service 
        });
    } else {
         logger.error(`Operational/Generic Error: ${message}`, { 
            statusCode: finalStatusCode, 
            url: req.originalUrl, 
            method: req.method, 
            ip: req.ip 
        });
    }
    
    if (finalStatusCode < 100 || finalStatusCode > 599) {
        logger.error(`CRITICAL: Attempted to send invalid status code in errorHandler: ${finalStatusCode}. Defaulting to 500.`);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error due to status code misconfiguration.',
        });
    } else {
        res.status(finalStatusCode).json(response);
    }
};

module.exports = errorHandler;