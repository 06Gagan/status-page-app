const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticateToken, authorizeRole, checkOrganizationMembership } = require('../middleware/auth');
const { 
    validateTeamCreation, 
    validateTeamUpdate, 
    validateTeamId, 
    validateUserIdForTeam
} = require('../middleware/validators');
const { handleValidationErrors } = require('../middleware/validateRequest');
const { param } = require('express-validator');

router.post(
    '/',
    authenticateToken,
    checkOrganizationMembership, 
    authorizeRole(['admin']),
    validateTeamCreation,
    handleValidationErrors,
    teamController.createTeam
);

router.get(
    '/',
    authenticateToken,
    checkOrganizationMembership,
    teamController.getTeamsByOrganization
);

router.get(
    '/:teamId',
    authenticateToken,
    checkOrganizationMembership, 
    validateTeamId,
    handleValidationErrors,
    teamController.getTeamById
);

router.put(
    '/:teamId',
    authenticateToken,
    checkOrganizationMembership,
    authorizeRole(['admin']), 
    validateTeamId,
    validateTeamUpdate,
    handleValidationErrors,
    teamController.updateTeam
);

router.delete(
    '/:teamId',
    authenticateToken,
    checkOrganizationMembership,
    authorizeRole(['admin']), 
    validateTeamId,
    handleValidationErrors,
    teamController.deleteTeam
);

router.post(
    '/:teamId/members',
    authenticateToken,
    checkOrganizationMembership,
    authorizeRole(['admin']), 
    validateTeamId,
    validateUserIdForTeam, 
    handleValidationErrors,
    teamController.addMemberToTeam
);

router.delete(
    '/:teamId/members/:memberUserId', 
    authenticateToken,
    checkOrganizationMembership,
    authorizeRole(['admin']),
    validateTeamId,
    [param('memberUserId').isUUID(4).withMessage('Member User ID in path must be a valid UUID version 4.')], 
    handleValidationErrors,
    teamController.removeMemberFromTeam
);

router.get(
    '/:teamId/members',
    authenticateToken,
    checkOrganizationMembership,
    validateTeamId,
    handleValidationErrors,
    teamController.getTeamMembers
);

module.exports = router;
