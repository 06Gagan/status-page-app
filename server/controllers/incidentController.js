// status-page-app/server/controllers/incidentController.js
const Incident = require('../models/Incident');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const logger = require('../config/logger');

const incidentController = {
    async createIncident(req, res, next) {
        try {
            const { title, description, status, severity, service_ids, components_affected, scheduled_at } = req.body;
            const user_id = req.user.userId;
            const organization_id = req.user.organizationId;

            if (!title || !description || !status) {
                return next(new ApiError(httpStatus.BAD_REQUEST || 400, 'Title, description, and status are required for an incident.'));
            }
            if (!organization_id) {
                return next(new ApiError(httpStatus.BAD_REQUEST || 400, 'Organization context is missing.'));
            }

            const newIncidentData = {
                title, description, status, severity, service_ids, 
                components_affected, user_id, organization_id, scheduled_at
            };
            const newIncidentWithDetails = await Incident.create(newIncidentData); 
            
            const io = req.app.get('socketio');
            if (io) {
                const room = `organization-${organization_id}`;
                const eventPayload = { ...newIncidentWithDetails, organization_id: organization_id };
                io.to(room).emit('incidentCreated', eventPayload);
                logger.info(`Socket event "incidentCreated" emitted to room ${room}`, { incidentId: newIncidentWithDetails.id, orgId: organization_id });
            }
            
            res.status(httpStatus.CREATED || 201).json(newIncidentWithDetails);
        } catch (error) {
            logger.error('Error creating incident:', { message: error.message, stack: error.stack, userId: req.user.userId });
            next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR || 500, 'Failed to create incident.'));
        }
    },

    async getIncidentsByOrganization(req, res, next) {
        try {
            const organization_id = req.user.organizationId;
            const incidents = await Incident.findAllByOrganizationId(organization_id);
            res.json(incidents);
        } catch (error) {
            logger.error('Error fetching incidents by organization:', { message: error.message, stack: error.stack, userId: req.user.userId });
            next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR || 500, 'Failed to fetch incidents.'));
        }
    },

    async getIncidentById(req, res, next) {
        try {
            const { incidentId } = req.params;
            const organization_id = req.user.organizationId;
            const incident = await Incident.findById(incidentId, organization_id);
            if (!incident) {
                return next(new ApiError(httpStatus.NOT_FOUND || 404, 'Incident not found or not accessible.'));
            }
            res.json(incident);
        } catch (error) {
            logger.error(`Error fetching incident by ID ${req.params.incidentId}:`, { message: error.message, stack: error.stack, userId: req.user.userId });
            next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR || 500, 'Failed to fetch incident details.'));
        }
    },

    async updateIncident(req, res, next) {
        try {
            const { incidentId } = req.params;
            const { title, description, status, severity, components_affected, service_ids, scheduled_at, resolved_at, update_description } = req.body;
            const organization_id = req.user.organizationId;
            const user_id_for_update = req.user.userId;

            const existingIncident = await Incident.findById(incidentId, organization_id);
            if (!existingIncident) {
                return next(new ApiError(httpStatus.NOT_FOUND || 404, 'Incident not found or not accessible.'));
            }

            const updateData = {
                title, description, status, severity, components_affected, service_ids,
                user_id_for_update, 
                update_log_description: update_description || `Incident details updated. New status: ${status || existingIncident.status}`,
                scheduled_at,
                resolved_at: (status === 'resolved' && !existingIncident.resolved_at) ? new Date() : (status !== 'resolved' ? null : existingIncident.resolved_at)
            };
            
            const updatedIncidentWithDetails = await Incident.update(incidentId, updateData);

            const io = req.app.get('socketio');
             if (io) {
                const room = `organization-${organization_id}`;
                const eventPayload = { ...updatedIncidentWithDetails, organization_id: organization_id };
                io.to(room).emit('incidentUpdated', eventPayload);
                logger.info(`Socket event "incidentUpdated" emitted to room ${room}`, { incidentId: updatedIncidentWithDetails.id, orgId: organization_id });
            }
            res.json(updatedIncidentWithDetails);
        } catch (error) {
            logger.error(`Error updating incident ${req.params.incidentId}:`, { message: error.message, stack: error.stack, userId: req.user.userId });
            next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR || 500, 'Failed to update incident.'));
        }
    },
    
    async addIncidentUpdate(req, res, next) {
        try {
            const { incidentId } = req.params;
            const { description, status } = req.body;
            const user_id = req.user.userId;
            const organization_id = req.user.organizationId;

            const incident = await Incident.findById(incidentId, organization_id);
            if (!incident) {
                return next(new ApiError(httpStatus.NOT_FOUND || 404, 'Incident not found or not accessible.'));
            }

            const newUpdateAndIncident = await Incident.addUpdate({
                incident_id: incidentId, user_id, description, status
            });

            const io = req.app.get('socketio');
            if (io) {
                const room = `organization-${organization_id}`;
                const eventPayload = { ...newUpdateAndIncident.incident, organization_id: organization_id };
                io.to(room).emit('incidentUpdated', eventPayload); 
                logger.info(`Socket event "incidentUpdated" (via addIncidentUpdate) emitted to room ${room}`, { incidentId, orgId: organization_id });
            }
            res.status(httpStatus.CREATED || 201).json(newUpdateAndIncident.update);
        } catch (error) {
            logger.error(`Error adding update to incident ${req.params.incidentId}:`, { message: error.message, stack: error.stack, userId: req.user.userId });
            next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR || 500, 'Failed to add incident update.'));
        }
    },

    async deleteIncident(req, res, next) {
        try {
            const { incidentId } = req.params;
            const organization_id = req.user.organizationId;

            const incident = await Incident.findById(incidentId, organization_id);
            if (!incident) {
                return next(new ApiError(httpStatus.NOT_FOUND || 404, 'Incident not found or not accessible.'));
            }

            await Incident.delete(incidentId);
            
            const io = req.app.get('socketio');
            if (io) {
                const room = `organization-${organization_id}`;
                io.to(room).emit('incidentDeleted', { id: incidentId, organization_id: organization_id });
                logger.info(`Socket event "incidentDeleted" emitted to room ${room}`, { incidentId, orgId: organization_id });
            }
            res.status(httpStatus.OK || 200).json({ message: 'Incident deleted successfully.' });
        } catch (error) {
            logger.error(`Error deleting incident ${req.params.incidentId}:`, { message: error.message, stack: error.stack, userId: req.user.userId });
            next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR || 500, 'Failed to delete incident.'));
        }
    }
};

module.exports = incidentController;