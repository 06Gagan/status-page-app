const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticateToken, authorizeRole, checkOrganizationMembership } = require('../middleware/auth');
const { validateService, validateServiceId } = require('../middleware/validators');
const { handleValidationErrors } = require('../middleware/validateRequest');

// All routes below this are protected and require the user to be part of an organization
router.use(authenticateToken);
router.use(checkOrganizationMembership); // Ensures user has an organizationId

router.post(
    '/',
    authorizeRole(['admin', 'editor']), // Example: only admins or editors can create services
    validateService,
    handleValidationErrors,
    serviceController.createService
);

router.get(
    '/',
    serviceController.getServicesByOrganization // Gets services for the user's current organization
);

router.get(
    '/:serviceId',
    validateServiceId,
    handleValidationErrors,
    serviceController.getServiceById
);

router.put(
    '/:serviceId',
    authorizeRole(['admin', 'editor']),
    validateServiceId,
    validateService, // Use the same validation as for creation, but all fields are optional in controller
    handleValidationErrors,
    serviceController.updateService
);

router.delete(
    '/:serviceId',
    authorizeRole(['admin']), // Example: only admins can delete services
    validateServiceId,
    handleValidationErrors,
    serviceController.deleteService
);

module.exports = router;
