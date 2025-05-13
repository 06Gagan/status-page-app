// status-page-app/server/models/Team.js
const { pool } = require('../config/db');

const Team = {
    async create(name, organization_id, client = null) {
        const db = client || pool;
        const query = 'INSERT INTO Teams (name, organization_id) VALUES ($1, $2) RETURNING *';
        const values = [name, organization_id];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    async findById(id, client = null) {
        const db = client || pool;
        const query = 'SELECT * FROM Teams WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    },

    async findAllByOrganizationId(organization_id, client = null) {
        const db = client || pool;
        const query = 'SELECT * FROM Teams WHERE organization_id = $1 ORDER BY name';
        const result = await db.query(query, [organization_id]);
        return result.rows;
    },

    async update(id, name, client = null) {
        const db = client || pool;
        const query = 'UPDATE Teams SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
        const values = [name, id];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    async delete(id, client = null) {
        const db = client || pool;
        await db.query('DELETE FROM TeamMembers WHERE team_id = $1', [id]);
        const result = await db.query('DELETE FROM Teams WHERE id = $1 RETURNING *', [id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    },

    async addMember(team_id, user_id, role = 'member', client = null) { 
        const db = client || pool;
        const query = 'INSERT INTO TeamMembers (team_id, user_id, role) VALUES ($1, $2, $3) RETURNING *';
        const values = [team_id, user_id, role];
        try {
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') { 
                throw new Error('User is already a member of this team.');
            }
            throw error;
        }
    },

    async removeMember(team_id, user_id, client = null) {
        const db = client || pool;
        const query = 'DELETE FROM TeamMembers WHERE team_id = $1 AND user_id = $2 RETURNING *';
        const values = [team_id, user_id];
        const result = await db.query(query, values);
        return result.rows.length > 0 ? result.rows[0] : null; 
    },

    async findMembers(team_id, client = null) {
        const db = client || pool;
        const query = `
            SELECT u.id as user_id, u.username, u.email, tm.role, tm.joined_at
            FROM Users u
            JOIN TeamMembers tm ON u.id = tm.user_id
            WHERE tm.team_id = $1
            ORDER BY u.username;
        `;
        const result = await db.query(query, [team_id]);
        return result.rows;
    },

    async findTeamsByUserId(user_id, client = null) {
        const db = client || pool;
        const query = `
            SELECT t.id, t.name, t.organization_id, tm.role
            FROM Teams t
            JOIN TeamMembers tm ON t.id = tm.team_id
            WHERE tm.user_id = $1
            ORDER BY t.name;
        `;
        const result = await db.query(query, [user_id]);
        return result.rows;
    }
};

module.exports = Team;