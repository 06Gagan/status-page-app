// status-page-app/server/middleware/validators.js
const { body, param, query } = require('express-validator');

const validateRegistration = [
    body('username').trim().notEmpty().withMessage('Username is required.')
        .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long.'),
    body('email').isEmail().withMessage('Provide a valid email.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    body('organizationName').trim().notEmpty().withMessage('Organization name is required.')
];

const validateLogin = [
    body('email').isEmail().withMessage('Provide a valid email.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.')
];

const validateProfileUpdate = [
    body('username').optional().trim().notEmpty().withMessage('Username cannot be empty if provided.')
        .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long if provided.'),
    body('email').optional().isEmail().withMessage('Provide a valid email if changing.').normalizeEmail()
];

const validatePasswordUpdate = [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long.')
];

const validateIncident = [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('status').isIn(['investigating', 'identified', 'monitoring', 'resolved', 'scheduled', 'in_progress', 'completed', 'verifying', 'under_maintenance', 'degraded_performance', 'partial_outage', 'full_outage', 'operational']).withMessage('Invalid status value'),
    body('severity').optional().isIn(['critical', 'high', 'medium', 'low', 'none']).withMessage('Invalid severity value'),
    body('service_ids').optional().isArray().withMessage('Service IDs must be an array')
        .custom((ids) => ids.every(id => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id) || (typeof id === 'string' && id))) 
        .withMessage('Each service ID must be a valid non-empty string (UUID preferred).'),
    body('components_affected').optional().isArray().withMessage('Components affected must be an array of strings')
        .custom(arr => arr.every(item => typeof item === 'string' && item.trim() !== '')).withMessage('Each component affected must be a non-empty string'),
    body('scheduled_at').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid scheduled_at date format.'),
];

const validateIncidentUpdateLog = [
    body('description').trim().notEmpty().withMessage('Update description is required'),
    body('status').isIn(['investigating', 'identified', 'monitoring', 'resolved', 'scheduled', 'in_progress', 'completed', 'verifying', 'under_maintenance', 'degraded_performance', 'partial_outage', 'full_outage', 'operational']).withMessage('Invalid status value')
];

const validateIncidentId = [
    param('incidentId').isUUID(4).withMessage('Incident ID must be a valid UUID version 4.')
];

// For creating a service (name and status are required)
const validateServiceCreation = [
    body('name').trim().notEmpty().withMessage('Service name is required.'),
    body('description').optional({ checkFalsy: true }).trim(),
    body('status').trim().notEmpty().withMessage('Service status is required.')
        .isIn(['operational', 'degraded_performance', 'partial_outage', 'major_outage', 'under_maintenance'])
        .withMessage('Invalid service status.'),
    body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer.')
];

// For updating a service (all fields are optional, but if provided, they must be valid)
const validateServiceUpdate = [
    body('name').optional().trim().notEmpty().withMessage('Service name cannot be empty if provided.'),
    body('description').optional({ checkFalsy: true }).trim(),
    body('status').optional().trim().notEmpty().withMessage('Service status cannot be empty if provided.')
        .isIn(['operational', 'degraded_performance', 'partial_outage', 'major_outage', 'under_maintenance'])
        .withMessage('Invalid service status.'),
    body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer if provided.')
];

const validateServiceId = [
    param('serviceId').isUUID(4).withMessage('Service ID must be a valid UUID version 4.')
];

const validateTeamCreation = [
    body('name').trim().notEmpty().withMessage('Team name is required.'),
];

const validateTeamUpdate = [ // This was likely intended for team updates
    body('name').optional().trim().notEmpty().withMessage('Team name cannot be empty if provided.'),
];

const validateTeamId = [
    param('teamId').isUUID(4).withMessage('Team ID must be a valid UUID version 4.')
];

const validateUserIdForTeam = [ 
    body('userId').isUUID(4).withMessage('User ID must be a valid UUID version 4.')
];

const validateOrganizationId = [
    param('organizationId').isUUID(4).withMessage('Organization ID must be a valid UUID version 4.'),
];

const validateOrganizationSlug = [
    param('slug').trim().notEmpty().withMessage('Organization slug is required.'),
];

module.exports = {
    validateRegistration,
    validateLogin,
    validateProfileUpdate,
    validatePasswordUpdate,
    validateIncident,
    validateIncidentUpdateLog,
    validateIncidentId,
    validateServiceCreation, // Renamed from validateService for clarity
    validateServiceUpdate,   // New/Updated for service updates
    validateServiceId,
    validateTeamCreation, 
    validateTeamUpdate,   
    validateTeamId,       
    validateUserIdForTeam,       
    validateOrganizationId,
    validateOrganizationSlug
};