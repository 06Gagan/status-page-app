const { pool } = require('../config/db');
const crypto = require('crypto');

const Organization = {
    async create(name, slug = null, client = null) {
        const db = client || pool; // Use client if provided, else global pool
        let generatedSlug = slug;
        if (!generatedSlug) {
            generatedSlug = name.toLowerCase().replace(/\s+/g, '-') + '-' + crypto.randomBytes(4).toString('hex');
        }
        const query = 'INSERT INTO Organizations (name, slug) VALUES ($1, $2) RETURNING *';
        const values = [name, generatedSlug];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    async findById(id, client = null) {
        const db = client || pool;
        const query = 'SELECT * FROM Organizations WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    },

    async findBySlug(slug, client = null) {
        const db = client || pool;
        const query = 'SELECT * FROM Organizations WHERE slug = $1';
        const result = await db.query(query, [slug]);
        return result.rows[0];
    },

    async getAll(client = null) {
        const db = client || pool;
        const query = 'SELECT * FROM Organizations ORDER BY name';
        const result = await db.query(query);
        return result.rows;
    },

    async update(id, { name, slug }, client = null) {
        const db = client || pool;
        const fields = [];
        const values = [];
        let query = 'UPDATE Organizations SET ';

        if (name !== undefined) {
            fields.push(`name = $${fields.length + 1}`);
            values.push(name);
        }
        if (slug !== undefined) {
            fields.push(`slug = $${fields.length + 1}`);
            values.push(slug);
        }

        if (fields.length === 0) {
            return this.findById(id, db); // Pass client if in transaction
        }

        fields.push(`updated_at = NOW()`);
        query += fields.join(', ');
        query += ` WHERE id = $${values.length + 1} RETURNING *`;
        values.push(id);

        const result = await db.query(query, values);
        return result.rows[0];
    },

    async delete(id, client = null) {
        const db = client || pool;
        // Note: Cascading deletes for users, teams etc., are handled by DB constraints
        const query = 'DELETE FROM Organizations WHERE id = $1 RETURNING *';
        const result = await db.query(query, [id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }
};

module.exports = Organization;
