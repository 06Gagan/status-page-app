const Incident = require('../models/Incident');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const { pool } = require('../config/db'); // For direct DB access if needed for complex ops

const incidentController = {
    async createIncident(req, res, next) {
        try {
            const { title, description, status, severity, service_ids, components_affected, scheduled_at } = req.body;
            const user_id = req.user.userId;
            const organization_id = req.user.organizationId;

            if (!title || !description || !status) {
                return next(ApiError.badRequest('Title, description, and status are required for an incident.'));
            }
            if (!organization_id) {
                return next(ApiError.badRequest('Organization context is missing.'));
            }

            const newIncident = await Incident.create({
                title,
                description,
                status,
                severity,
                service_ids,
                components_affected,
                user_id,
                organization_id,
                scheduled_at
            });
            
            const io = req.app.get('socketio');
            if (io && organization_id) {
                io.to(`organization-${organization_id}`).emit('incidentCreated', newIncident);
                // Also emit service status updates if services are affected and their status changes
                if (service_ids && service_ids.length > 0) {
                    // This logic might be more complex if an incident implies a specific status change for services
                    // For now, just notifying about the incident.
                }
            }
            
            res.status(201).json(newIncident);
        } catch (error) {
            logger.error('Error creating incident:', { message: error.message, stack: error.stack });
            next(ApiError.internalServerError('Failed to create incident.'));
        }
    },

    async getIncidentsByOrganization(req, res, next) {
        try {
            const organization_id = req.user.organizationId;
            if (!organization_id) {
                return next(ApiError.badRequest('Organization context is missing.'));
            }
            const incidents = await Incident.findAllByOrganizationId(organization_id);
            res.json(incidents);
        } catch (error) {
            logger.error('Error fetching incidents by organization:', { message: error.message, stack: error.stack });
            next(ApiError.internalServerError('Failed to fetch incidents.'));
        }
    },

    async getIncidentById(req, res, next) {
        try {
            const { incidentId } = req.params;
            const organization_id = req.user.organizationId;

            const incident = await Incident.findById(incidentId);
            if (!incident) {
                return next(ApiError.notFound('Incident not found.'));
            }
            if (incident.organization_id !== organization_id) {
                return next(ApiError.forbidden('You are not authorized to access this incident.'));
            }
            res.json(incident);
        } catch (error) {
            logger.error(`Error fetching incident by ID ${req.params.incidentId}:`, { message: error.message, stack: error.stack });
            next(ApiError.internalServerError('Failed to fetch incident details.'));
        }
    },

    async updateIncident(req, res, next) {
        try {
            const { incidentId } = req.params;
            const { title, description, status, severity, components_affected, service_ids, scheduled_at, resolved_at } = req.body;
            const organization_id = req.user.organizationId;
            const user_id_for_update = req.user.userId;


            const incident = await Incident.findById(incidentId);
            if (!incident) {
                return next(ApiError.notFound('Incident not found.'));
            }
            if (incident.organization_id !== organization_id) {
                return next(ApiError.forbidden('You are not authorized to update this incident.'));
            }

            const updatedIncident = await Incident.update(incidentId, {
                title,
                description,
                status,
                severity,
                components_affected,
                service_ids,
                user_id_for_update,
                scheduled_at,
                resolved_at
            });

            const io = req.app.get('socketio');
             if (io && organization_id) {
                const fullUpdatedIncident = await Incident.findById(incidentId); // Fetch with all details for broadcast
                io.to(`organization-${organization_id}`).emit('incidentUpdated', fullUpdatedIncident);
            }

            res.json(updatedIncident);
        } catch (error) {
            logger.error(`Error updating incident ${req.params.incidentId}:`, { message: error.message, stack: error.stack });
            next(ApiError.internalServerError('Failed to update incident.'));
        }
    },
    
    async addIncidentUpdate(req, res, next) {
        try {
            const { incidentId } = req.params;
            const { description, status } = req.body;
            const user_id = req.user.userId;
            const organization_id = req.user.organizationId;

            const incident = await Incident.findById(incidentId);
            if (!incident) {
                return next(ApiError.notFound('Incident not found.'));
            }
            if (incident.organization_id !== organization_id) {
                return next(ApiError.forbidden('You are not authorized to update this incident.'));
            }

            const newUpdate = await Incident.addUpdate({
                incident_id: incidentId,
                user_id,
                description,
                status
            });

            const io = req.app.get('socketio');
            if (io && organization_id) {
                const fullIncidentWithUpdate = await Incident.findById(incidentId); // Fetch with all details for broadcast
                io.to(`organization-${organization_id}`).emit('incidentUpdated', fullIncidentWithUpdate); // Or a more specific 'incidentUpdateAdded'
            }

            res.status(201).json(newUpdate);
        } catch (error) {
            logger.error(`Error adding update to incident ${req.params.incidentId}:`, { message: error.message, stack: error.stack });
            next(ApiError.internalServerError('Failed to add incident update.'));
        }
    },

    async deleteIncident(req, res, next) {
        try {
            const { incidentId } = req.params;
            const organization_id = req.user.organizationId;

            const incident = await Incident.findById(incidentId);
            if (!incident) {
                return next(ApiError.notFound('Incident not found.'));
            }
            if (incident.organization_id !== organization_id) {
                return next(ApiError.forbidden('You are not authorized to delete this incident.'));
            }

            await Incident.delete(incidentId);
            
            const io = req.app.get('socketio');
            if (io && organization_id) {
                io.to(`organization-${organization_id}`).emit('incidentDeleted', { id: incidentId, organization_id });
            }
            
            res.status(200).json({ message: 'Incident deleted successfully.' });
        } catch (error) {
            logger.error(`Error deleting incident ${req.params.incidentId}:`, { message: error.message, stack: error.stack });
            next(ApiError.internalServerError('Failed to delete incident.'));
        }
    }
};

module.exports = incidentController;
