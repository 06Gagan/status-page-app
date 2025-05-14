// status-page-app/server/models/Organization.js
const { pool } = require('../config/db');

const Organization = {
    async create(name, slug, description = '', client = null) {
        const db = client || pool;
        const query = `
            INSERT INTO Organizations (name, slug, description) 
            VALUES ($1, $2, $3) 
            RETURNING *
        `;
        const values = [name, slug, description];
        try {
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            // Let createWithOrganizationAndTeam in User.js handle more specific error messages
            console.error("Error in Organization.create:", error);
            throw error; 
        }
    },

    async findById(id, client = null) {
        const db = client || pool;
        const query = 'SELECT * FROM Organizations WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    },

    async findByName(name, client = null) {
        const db = client || pool;
        const query = 'SELECT * FROM Organizations WHERE name = $1';
        const result = await db.query(query, [name]);
        return result.rows[0];
    },
    
    async findBySlug(slug, client = null) { // Used by public status page
        const db = client || pool;
        const query = 'SELECT id, name, slug FROM Organizations WHERE slug = $1';
        const result = await db.query(query, [slug]);
        return result.rows[0];
    },

    async update(id, { name, slug, description }, client = null) {
        const db = client || pool;
        const fields = [];
        const values = [];
        let queryIndex = 1;

        if (name !== undefined) { fields.push(`name = $${queryIndex++}`); values.push(name); }
        if (slug !== undefined) { fields.push(`slug = $${queryIndex++}`); values.push(slug); }
        if (description !== undefined) { fields.push(`description = $${queryIndex++}`); values.push(description); }
        
        if (fields.length === 0) return null; // Or fetch and return current

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `UPDATE Organizations SET ${fields.join(', ')} WHERE id = $${queryIndex} RETURNING *`;
        const result = await db.query(query, values);
        return result.rows[0];
    }
};

module.exports = Organization;