const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticateToken, authorizeRole, checkOrganizationMembership } = require('../middleware/auth');
const { validateOrganizationSlug, validateOrganizationId } = require('../middleware/validators'); // Assuming you have these
const { handleValidationErrors } = require('../middleware/validateRequest');
const { body } = require('express-validator'); // For inline validation if needed

// --- Public Routes ---
router.get(
    '/:slug', 
    validateOrganizationSlug, 
    handleValidationErrors, 
    organizationController.getOrganizationBySlugForPublic
);

router.get(
    '/:slug/services', 
    validateOrganizationSlug, 
    handleValidationErrors, 
    organizationController.getOrganizationServicesForPublic
);

router.get(
    '/:slug/incidents', 
    validateOrganizationSlug, 
    handleValidationErrors, 
    organizationController.getOrganizationIncidentsForPublic
);

// --- Protected Routes (for authenticated users about their own organization) ---

// Create a new organization (special case, might need admin or specific logic)
// This route might be contentious depending on application flow (e.g. org created at user registration)
// For now, let's assume an admin can create one, or it's part of a specific setup.
// If org is created with user, this route might not be needed or should be admin-only.
router.post(
    '/',
    authenticateToken,
    authorizeRole(['admin']), // Example: only an existing admin can create more orgs
    [
        body('name').trim().notEmpty().withMessage('Organization name is required'),
        body('slug').trim().notEmpty().withMessage('Organization slug is required').isSlug().withMessage('Slug must be valid (e.g. my-cool-org)'),
        body('description').optional({ checkFalsy: true }).trim()
    ],
    handleValidationErrors,
    organizationController.createOrganization 
);


// Get the current authenticated user's organization details
router.get(
    '/my-organization', // Changed path to be more specific for clarity
    authenticateToken,
    organizationController.getMyOrganization
);

// Update the current authenticated user's organization
router.put(
    '/my-organization', // Changed path
    authenticateToken,
    // checkOrganizationMembership, // Not needed if we operate on req.user.organizationId
    authorizeRole(['admin']), // Assuming only admins of that org can update it
    [ // Validation for update
        body('name').optional().trim().notEmpty().withMessage('Organization name cannot be empty'),
        body('slug').optional().trim().notEmpty().withMessage('Organization slug cannot be empty').isSlug().withMessage('Slug must be valid'),
        body('description').optional({ checkFalsy: true }).trim()
    ],
    handleValidationErrors,
    organizationController.updateMyOrganization
);

// Note: Deleting an organization is a very destructive action and usually has complex implications
// (e.g., what happens to users, services, incidents). 
// It's omitted here for simplicity but would require careful design if needed.

module.exports = router;
