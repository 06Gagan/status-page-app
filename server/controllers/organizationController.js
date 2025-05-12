const { pool } = require('../config/db'); // Correct DB import
const ApiError = require('../utils/ApiError');
const Organization = require('../models/Organization'); // Using the Organization model
const Service = require('../models/Service');
const Incident = require('../models/Incident');

const organizationController = {
    async createOrganization(req, res, next) {
        try {
            const { name, slug, description } = req.body;
            const newOrganization = await Organization.create(name, slug, description);
            
            // Link the creating user to this new organization
            // This logic might be better placed during user registration or a dedicated "claim organization" step
            // For now, assuming this route is for admins or a specific setup flow.
            // If the user creating this org should be part of it:
            if (req.user && req.user.userId) {
                 await pool.query('UPDATE Users SET organization_id = $1 WHERE id = $2', [newOrganization.id, req.user.userId]);
            }

            res.status(201).json(newOrganization);
        } catch (error) {
            if (error.code === '23505') { 
                return next(ApiError.conflict('Organization name or slug already exists.'));
            }
            next(error);
        }
    },

    async getMyOrganization(req, res, next) {
        try {
            if (!req.user || !req.user.organizationId) {
                return next(ApiError.notFound('User is not associated with an organization.'));
            }
            const organization = await Organization.findById(req.user.organizationId);
            if (!organization) {
                return next(ApiError.notFound('Organization not found for this user.'));
            }
            res.json(organization);
        } catch (error) {
            next(error);
        }
    },

    async getOrganizationBySlugForPublic(req, res, next) {
        try {
            const { slug } = req.params;
            const organization = await Organization.findBySlug(slug);
            if (!organization) {
                return next(ApiError.notFound('Organization not found.'));
            }
            res.json(organization);
        } catch (error) {
            next(error);
        }
    },
    
    async getOrganizationServicesForPublic(req, res, next) {
        try {
            const { slug } = req.params;
            const result = await Service.findByOrganizationSlug(slug);
             if (!result.organization) {
                return next(ApiError.notFound('Organization not found.'));
            }
            res.json(result.services);
        } catch (error) {
            next(error);
        }
    },

    async getOrganizationIncidentsForPublic(req, res, next) {
        try {
            const { slug } = req.params;
            const result = await Incident.findByOrganizationSlug(slug);
            if (!result.organization) {
                return next(ApiError.notFound('Organization not found.'));
            }
            res.json(result.incidents);
        } catch (error) {
            next(error);
        }
    },

    async updateMyOrganization(req, res, next) {
        try {
            if (!req.user || !req.user.organizationId) {
                return next(ApiError.forbidden('User not associated with an organization.'));
            }
            // Add role check if only admins can update
            if (req.user.role !== 'admin') {
                 return next(ApiError.forbidden('Only admins can update the organization.'));
            }

            const { name, slug, description } = req.body;
            const updatedOrganization = await Organization.update(req.user.organizationId, { name, slug, description });
            if (!updatedOrganization) {
                return next(ApiError.notFound('Organization not found or update failed.'));
            }
            res.json(updatedOrganization);
        } catch (error) {
             if (error.code === '23505') { 
                return next(ApiError.conflict('Organization name or slug already exists.'));
            }
            next(error);
        }
    }
};

module.exports = organizationController;
