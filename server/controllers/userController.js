// status-page-app/server/controllers/userController.js
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status'); // Ensure this package is installed
const logger = require('../config/logger');

const userController = {
    async getAllUsersInOrg(req, res, next) {
        if (!req.user || !req.user.organizationId) {
            const statusCode = httpStatus.UNAUTHORIZED || 401;
            return next(new ApiError(statusCode, 'User or organization not identified.'));
        }
        
        const organizationId = req.user.organizationId;

        try {
            const query = `
                SELECT id, username, email, role 
                FROM Users 
                WHERE organization_id = $1 
                ORDER BY username ASC
            `;
            const { rows } = await pool.query(query, [organizationId]);
            
            logger.info(`Fetched ${rows.length} users for organization ID: ${organizationId} by user ${req.user.userId}`);
            const successStatusCode = httpStatus.OK || 200;
            res.status(successStatusCode).json(rows);

        } catch (error) {
            logger.error('Error fetching users for organization:', { 
                organizationId, 
                userId: req.user.userId, 
                error: error.message, 
                stack: error.stack 
            });
            const errorStatusCode = httpStatus.INTERNAL_SERVER_ERROR || 500;
            next(new ApiError(errorStatusCode, 'Could not retrieve users.'));
        }
    }
};

module.exports = userController;