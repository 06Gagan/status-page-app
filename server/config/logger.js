const winston = require('winston');
const path = require('path');

const MMDDYYYY_HHMMSS_DateFormat = () => {
    return new Date(Date.now()).toLocaleString('en-US', {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, 
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
};

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: MMDDYYYY_HHMMSS_DateFormat }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
            let log = `${timestamp} ${level}: ${stack || message}`;
            if (meta && Object.keys(meta).length && !(meta.error && meta.request)) { // Avoid double logging complex objects if already in message/stack
                 // Only stringify meta if it's not the special error object from errorHandler
                if (meta.service !== 'user-service' || Object.keys(meta).length > 1) { // Avoid logging defaultMeta alone
                    try {
                        const metaString = JSON.stringify(meta);
                        if (metaString !== '{}') {
                             log += ` ${metaString}`;
                        }
                    } catch (e) {
                        // If stringify fails, log as is or a placeholder
                        log += ` [meta non-serializable]`;
                    }
                }
            }
            return log;
        })
    ),
    defaultMeta: { service: 'status-page-service' },
    transports: [
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log'),
        })
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
                let log = `${timestamp} ${level}: ${stack || message}`;
                // Avoid double logging of error object if it's already in message/stack
                if (meta && Object.keys(meta).length && !(meta.error && meta.request) ) {
                    if (meta.service !== 'status-page-service' || Object.keys(meta).length > 1) {
                         try {
                            const metaString = JSON.stringify(meta);
                            if (metaString !== '{}') {
                                 log += ` ${metaString}`;
                            }
                        } catch (e) {
                            log += ` [meta non-serializable]`;
                        }
                    }
                }
                return log;
            })
        )
    }));
}

module.exports = logger;