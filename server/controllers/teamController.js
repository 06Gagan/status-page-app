// status-page-app/server/controllers/teamController.js
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const Team = require('../models/Team'); 
const logger = require('../config/logger');

const teamController = {
    async createTeam(req, res, next) {
        try {
            const { name } = req.body;
            const organization_id = req.user.organizationId;

            if (!name) {
                return next(ApiError.badRequest('Team name is required.'));
            }
            if (!organization_id) {
                return next(ApiError.badRequest('Organization context is missing for creating a team.'));
            }

            const newTeam = await Team.create(name, organization_id);
            res.status(201).json(newTeam);
        } catch (error) {
            if (error.message && error.message.includes('unique_team_name_org')) {
                 return next(ApiError.conflict('A team with this name already exists in your organization.'));
            }
            logger.error('Error creating team:', { message: error.message, stack: error.stack, userId: req.user.userId });
            next(ApiError.internalServerError('Failed to create team.'));
        }
    },

    async getTeamsByOrganization(req, res, next) {
        try {
            const organization_id = req.user.organizationId;
            if (!organization_id) {
                return next(ApiError.badRequest('Organization context is missing.'));
            }
            const teams = await Team.findAllByOrganizationId(organization_id);
            res.json(teams);
        } catch (error) {
            logger.error('Error fetching teams by organization:', { message: error.message, stack: error.stack, userId: req.user.userId });
            next(ApiError.internalServerError('Failed to fetch teams.'));
        }
    },

    async getTeamById(req, res, next) {
        try {
            const { teamId } = req.params;
            const organization_id = req.user.organizationId;

            const team = await Team.findById(teamId);
            if (!team) {
                return next(ApiError.notFound('Team not found.'));
            }
            if (team.organization_id !== organization_id) {
                return next(ApiError.forbidden('You are not authorized to access this team.'));
            }
            res.json(team);
        } catch (error) {
            logger.error(`Error fetching team by ID ${req.params.teamId}:`, { message: error.message, stack: error.stack, userId: req.user.userId });
            next(ApiError.internalServerError('Failed to fetch team details.'));
        }
    },

    async updateTeam(req, res, next) {
        try {
            const { teamId } = req.params;
            const { name } = req.body;
            const organization_id = req.user.organizationId;

            if (!name) {
                return next(ApiError.badRequest('Team name is required for update.'));
            }

            const team = await Team.findById(teamId);
            if (!team) {
                return next(ApiError.notFound('Team not found.'));
            }
            if (team.organization_id !== organization_id) {
                return next(ApiError.forbidden('You are not authorized to update this team.'));
            }

            const updatedTeam = await Team.update(teamId, name);
            res.json(updatedTeam);
        } catch (error) {
             if (error.message && error.message.includes('unique_team_name_org')) {
                 return next(ApiError.conflict('A team with this name already exists in your organization.'));
            }
            logger.error(`Error updating team ${req.params.teamId}:`, { message: error.message, stack: error.stack, userId: req.user.userId });
            next(ApiError.internalServerError('Failed to update team.'));
        }
    },

    async deleteTeam(req, res, next) {
        try {
            const { teamId } = req.params;
            const organization_id = req.user.organizationId;

            const team = await Team.findById(teamId);
            if (!team) {
                return next(ApiError.notFound('Team not found.'));
            }
            if (team.organization_id !== organization_id) {
                return next(ApiError.forbidden('You are not authorized to delete this team.'));
            }

            await Team.delete(teamId);
            res.status(200).json({ message: 'Team deleted successfully.' });
        } catch (error) {
            logger.error(`Error deleting team ${req.params.teamId}:`, { message: error.message, stack: error.stack, userId: req.user.userId });
            next(ApiError.internalServerError('Failed to delete team.'));
        }
    },

    async addMemberToTeam(req, res, next) {
        try {
            const { teamId } = req.params;
            const { userId, role } = req.body; 
            const organization_id = req.user.organizationId; 

            const team = await Team.findById(teamId);
            if (!team || team.organization_id !== organization_id) {
                return next(ApiError.forbidden('Team not found or not accessible.'));
            }
            
            const newMember = await Team.addMember(teamId, userId, role || 'member');
            res.status(201).json(newMember);
        } catch (error) {
            if (error.message && error.message.includes('User is already a member')) {
                return next(ApiError.conflict(error.message));
            }
            if (error.code === '23503') { // Foreign key violation
                 return next(ApiError.badRequest('User to be added not found or team does not exist.'));
            }
            logger.error(`Error adding member to team ${req.params.teamId}:`, { message: error.message, stack: error.stack, userId: req.user.userId, memberToAdd: userId });
            next(ApiError.internalServerError('Failed to add member to team.'));
        }
    },

    async removeMemberFromTeam(req, res, next) {
        try {
            const { teamId, memberUserId } = req.params; 
            const organization_id = req.user.organizationId; 

            const team = await Team.findById(teamId);
            if (!team || team.organization_id !== organization_id) {
                return next(ApiError.forbidden('Team not found or not accessible.'));
            }
            
            const result = await Team.removeMember(teamId, memberUserId);
            if (!result) {
                return next(ApiError.notFound('Team member not found or not removed.'));
            }
            res.status(200).json({ message: 'Member removed from team successfully.' });
        } catch (error) {
            logger.error(`Error removing member ${req.params.memberUserId} from team ${req.params.teamId}:`, { message: error.message, stack: error.stack, userId: req.user.userId });
            next(ApiError.internalServerError('Failed to remove member from team.'));
        }
    },

    async getTeamMembers(req, res, next) {
        try {
            const { teamId } = req.params;
            const organization_id = req.user.organizationId;

            const team = await Team.findById(teamId);
            if (!team || team.organization_id !== organization_id) {
                return next(ApiError.forbidden('Team not found or not accessible.'));
            }

            const members = await Team.findMembers(teamId);
            res.json(members);
        } catch (error) {
            logger.error(`Error fetching members for team ${req.params.teamId}:`, { message: error.message, stack: error.stack, userId: req.user.userId });
            next(ApiError.internalServerError('Failed to fetch team members.'));
        }
    }
};

module.exports = teamController;