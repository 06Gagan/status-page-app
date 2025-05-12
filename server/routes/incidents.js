const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { authenticateToken, authorizeRole, checkOrganizationMembership } = require('../middleware/auth');
const { validateIncident, validateIncidentId, validateIncidentUpdateLog } = require('../middleware/validators');
const { handleValidationErrors } = require('../middleware/validateRequest');

// All routes in this file are protected and require the user to be authenticated
// and part of an organization.
router.use(authenticateToken);
router.use(checkOrganizationMembership); // Ensures req.user.organizationId is available

router.post(
    '/',
    authorizeRole(['admin', 'editor']), // Example: only admins or editors can create incidents
    validateIncident,
    handleValidationErrors,
    incidentController.createIncident
);

router.get(
    '/',
    incidentController.getIncidentsByOrganization // Gets incidents for the user's current organization
);

router.get(
    '/:incidentId',
    validateIncidentId,
    handleValidationErrors,
    incidentController.getIncidentById
);

router.put(
    '/:incidentId',
    authorizeRole(['admin', 'editor']),
    validateIncidentId,
    validateIncident, // Using the same validation for update; ensure controller handles optional fields
    handleValidationErrors,
    incidentController.updateIncident
);

router.post(
    '/:incidentId/updates',
    authorizeRole(['admin', 'editor']),
    validateIncidentId,
    validateIncidentUpdateLog,
    handleValidationErrors,
    incidentController.addIncidentUpdate
);

router.delete(
    '/:incidentId',
    authorizeRole(['admin']), // Example: only admins can delete incidents
    validateIncidentId,
    handleValidationErrors,
    incidentController.deleteIncident
);

module.exports = router;
