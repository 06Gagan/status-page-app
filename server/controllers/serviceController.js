// status-page-app/server/controllers/serviceController.js
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const logger = require('../config/logger');
const Service = require('../models/Service');

const serviceController = {
    async createService(req, res, next) {
        try {
            const { name, description, status, order } = req.body;
            const organization_id = req.user.organizationId;

            if (!name) {
                return next(new ApiError(httpStatus.BAD_REQUEST || 400, 'Service name is required.'));
            }
            if (!organization_id) {
                return next(new ApiError(httpStatus.BAD_REQUEST || 400, 'Organization context is missing.'));
            }

            const newServiceData = { 
                name, 
                description, 
                status: status || 'operational', 
                organization_id,
                order: order || 0 
            };
            const newService = await Service.create(newServiceData);
            
            const io = req.app.get('socketio');
            if (io) {
                const room = `organization-${organization_id}`;
                const eventPayload = { ...newService, organization_id: organization_id };
                io.to(room).emit('serviceCreated', eventPayload);
                logger.info(`Socket event "serviceCreated" emitted to room ${room}`, { serviceId: newService.id, orgId: organization_id });
            }
            
            res.status(httpStatus.CREATED || 201).json(newService);
        } catch (error) {
            logger.error('Error creating service:', { message: error.message, stack: error.stack, userId: req.user.userId });
            next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR || 500, 'Failed to create service.'));
        }
    },

    async getServicesByOrganization(req, res, next) {
        try {
            const organization_id = req.user.organizationId;
            const services = await Service.findAllByOrganizationId(organization_id);
            res.json(services);
        } catch (error) {
            logger.error('Error fetching services by organization:', { message: error.message, stack: error.stack, userId: req.user.userId });
            next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR || 500, 'Failed to fetch services.'));
        }
    },

    async getServiceById(req, res, next) {
        try {
            const { serviceId } = req.params;
            const organization_id = req.user.organizationId;

            const service = await Service.findById(serviceId);
            if (!service) {
                return next(new ApiError(httpStatus.NOT_FOUND || 404, 'Service not found.'));
            }
            if (service.organization_id !== organization_id) {
                return next(new ApiError(httpStatus.FORBIDDEN || 403, 'You are not authorized to access this service.'));
            }
            res.json(service);
        } catch (error) {
            logger.error(`Error fetching service by ID ${req.params.serviceId}:`, { message: error.message, stack: error.stack, userId: req.user.userId });
            next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR || 500, 'Failed to fetch service details.'));
        }
    },

    async updateService(req, res, next) {
        try {
            const { serviceId } = req.params;
            const { name, description, status, order } = req.body;
            const organization_id = req.user.organizationId;

            const existingService = await Service.findById(serviceId);
            if (!existingService) {
                return next(new ApiError(httpStatus.NOT_FOUND || 404, 'Service not found.'));
            }
            if (existingService.organization_id !== organization_id) {
                return next(new ApiError(httpStatus.FORBIDDEN || 403, 'You are not authorized to update this service.'));
            }

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (description !== undefined) updateData.description = description;
            if (status !== undefined) updateData.status = status;
            if (order !== undefined) updateData.order = order;

            if (Object.keys(updateData).length === 0 && req.method === 'PUT') {
                 return res.status(httpStatus.OK || 200).json(existingService);
            }

            const updatedService = await Service.update(serviceId, updateData);

            const io = req.app.get('socketio');
            if (io) {
                const room = `organization-${organization_id}`;
                const eventPayload = { ...updatedService, organization_id: organization_id };
                io.to(room).emit('serviceUpdated', eventPayload);
                logger.info(`Socket event "serviceUpdated" emitted to room ${room}`, { serviceId: updatedService.id, newStatus: updatedService.status, orgId: organization_id });
            }
            
            res.json(updatedService);
        } catch (error) {
            logger.error(`Error updating service ${req.params.serviceId}:`, { message: error.message, stack: error.stack, userId: req.user.userId });
            next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR || 500, 'Failed to update service.'));
        }
    },

    async deleteService(req, res, next) {
        try {
            const { serviceId } = req.params;
            const organization_id = req.user.organizationId;

            const service = await Service.findById(serviceId);
            if (!service) {
                return next(new ApiError(httpStatus.NOT_FOUND || 404, 'Service not found.'));
            }
            if (service.organization_id !== organization_id) {
                return next(new ApiError(httpStatus.FORBIDDEN || 403, 'You are not authorized to delete this service.'));
            }

            await Service.delete(serviceId);

            const io = req.app.get('socketio');
            if (io) {
                const room = `organization-${organization_id}`;
                io.to(room).emit('serviceDeleted', { id: serviceId, organization_id: organization_id });
                logger.info(`Socket event "serviceDeleted" emitted to room ${room}`, { serviceId, orgId: organization_id });
            }
            
            res.status(httpStatus.OK || 200).json({ message: 'Service deleted successfully.' });
        } catch (error) {
            logger.error(`Error deleting service ${req.params.serviceId}:`, { message: error.message, stack: error.stack, userId: req.user.userId });
            next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR || 500, 'Failed to delete service.'));
        }
    }
};

module.exports = serviceController;