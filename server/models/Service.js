const { pool } = require('../config/db');
const Organization = require('./Organization'); 

const Service = {
    async create({ name, description, status, organization_id, order = 0 }) {
        const query = `
            INSERT INTO Services (name, description, status, organization_id, "order")
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [name, description, status, organization_id, order];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    async findById(id) {
        const query = 'SELECT * FROM Services WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    async findAllByOrganizationId(organization_id) {
        const query = 'SELECT * FROM Services WHERE organization_id = $1 ORDER BY "order" ASC, name ASC';
        const result = await pool.query(query, [organization_id]);
        return result.rows;
    },

    async update(id, { name, description, status, order }) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            fields.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (description !== undefined) {
            fields.push(`description = $${paramCount++}`);
            values.push(description);
        }
        if (status !== undefined) {
            fields.push(`status = $${paramCount++}`);
            values.push(status);
        }
         if (order !== undefined) {
            fields.push(`"order" = $${paramCount++}`);
            values.push(order);
        }
        
        if (fields.length === 0) {
            return this.findById(id); 
        }

        fields.push(`updated_at = NOW()`); 

        const querySet = fields.join(', ');
        const query = `UPDATE Services SET ${querySet} WHERE id = $${paramCount} RETURNING *`; 
        values.push(id);
        
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    async delete(id) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM IncidentServices WHERE service_id = $1', [id]);
            await client.query('DELETE FROM ServiceDependencies WHERE service_id = $1 OR depends_on_service_id = $1', [id]);
            await client.query('DELETE FROM Metrics WHERE service_id = $1', [id]);
            await client.query('DELETE FROM MaintenancePeriods WHERE service_id = $1', [id]);
            const result = await client.query('DELETE FROM Services WHERE id = $1 RETURNING *;', [id]);
            await client.query('COMMIT');
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async findByOrganizationSlug(slug) {
        const organization = await Organization.findBySlug(slug);
        if (!organization) {
            return { organization: null, services: [] };
        }
        const services = await this.findAllByOrganizationId(organization.id);
        return { organization, services };
    }
};

module.exports = Service;