// status-page-app/server/routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticateToken, authorizeRole, checkOrganizationMembership } = require('../middleware/auth');
// Updated to use specific validators
const { validateServiceCreation, validateServiceUpdate, validateServiceId } = require('../middleware/validators'); 
const { handleValidationErrors } = require('../middleware/validateRequest');

router.use(authenticateToken);
router.use(checkOrganizationMembership);

router.post(
    '/',
    authorizeRole(['admin', 'editor']),
    validateServiceCreation, // Use for creating
    handleValidationErrors,
    serviceController.createService
);

router.get(
    '/',
    serviceController.getServicesByOrganization
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
    validateServiceUpdate, // Use for updating (makes fields optional)
    handleValidationErrors,
    serviceController.updateService
);

router.delete(
    '/:serviceId',
    authorizeRole(['admin']),
    validateServiceId,
    handleValidationErrors,
    serviceController.deleteService
);

module.exports = router;