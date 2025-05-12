const Service = require('../models/Service');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const serviceController = {
    async createService(req, res, next) {
        try {
            const { name, description, status, order } = req.body;
            const organization_id = req.user.organizationId;

            if (!name || !status) {
                return next(ApiError.badRequest('Service name and status are required.'));
            }
            if (!organization_id) {
                return next(ApiError.badRequest('Organization context is missing.'));
            }

            const newService = await Service.create({ 
                name, 
                description, 
                status, 
                organization_id,
                order 
            });
            res.status(201).json(newService);
        } catch (error) {
            logger.error('Error creating service:', { message: error.message, stack: error.stack });
            next(ApiError.internalServerError('Failed to create service.'));
        }
    },

    async getServicesByOrganization(req, res, next) {
        try {
            const organization_id = req.user.organizationId;
            if (!organization_id) {
                return next(ApiError.badRequest('Organization context is missing.'));
            }
            const services = await Service.findAllByOrganizationId(organization_id);
            res.json(services);
        } catch (error) {
            logger.error('Error fetching services by organization:', { message: error.message, stack: error.stack });
            next(ApiError.internalServerError('Failed to fetch services.'));
        }
    },

    async getServiceById(req, res, next) {
        try {
            const { serviceId } = req.params;
            const organization_id = req.user.organizationId;

            const service = await Service.findById(serviceId);
            if (!service) {
                return next(ApiError.notFound('Service not found.'));
            }
            // Ensure the service belongs to the user's organization
            if (service.organization_id !== organization_id) {
                return next(ApiError.forbidden('You are not authorized to access this service.'));
            }
            res.json(service);
        } catch (error) {
            logger.error(`Error fetching service by ID ${req.params.serviceId}:`, { message: error.message, stack: error.stack });
            next(ApiError.internalServerError('Failed to fetch service details.'));
        }
    },

    async updateService(req, res, next) {
        try {
            const { serviceId } = req.params;
            const { name, description, status, order } = req.body;
            const organization_id = req.user.organizationId;

            const service = await Service.findById(serviceId);
            if (!service) {
                return next(ApiError.notFound('Service not found.'));
            }
            if (service.organization_id !== organization_id) {
                return next(ApiError.forbidden('You are not authorized to update this service.'));
            }

            const updatedService = await Service.update(serviceId, { name, description, status, order });
            res.json(updatedService);
        } catch (error) {
            logger.error(`Error updating service ${req.params.serviceId}:`, { message: error.message, stack: error.stack });
            next(ApiError.internalServerError('Failed to update service.'));
        }
    },

    async deleteService(req, res, next) {
        try {
            const { serviceId } = req.params;
            const organization_id = req.user.organizationId;

            const service = await Service.findById(serviceId);
            if (!service) {
                return next(ApiError.notFound('Service not found.'));
            }
            if (service.organization_id !== organization_id) {
                return next(ApiError.forbidden('You are not authorized to delete this service.'));
            }

            await Service.delete(serviceId);
            res.status(200).json({ message: 'Service deleted successfully.' });
        } catch (error) {
            logger.error(`Error deleting service ${req.params.serviceId}:`, { message: error.message, stack: error.stack });
            next(ApiError.internalServerError('Failed to delete service.'));
        }
    }
};

module.exports = serviceController;
