// status-page-app/server/models/User.js
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const Organization = require('./Organization'); // Assuming Organization model has findByName and create
const Team = require('./Team'); // Assuming Team model has findByNameAndOrg and create

const User = {
    async createWithOrganizationAndTeam({ username, email, password, organizationName, teamName = 'Default Team' }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let organization;
            let userRole = 'member'; // Default for joining an existing org

            // Find or Create Organization
            const existingOrg = await Organization.findByName(organizationName, client);
            if (existingOrg) {
                organization = existingOrg;
            } else {
                const slug = organizationName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                // The Organization.create method should handle potential slug collisions if slug needs to be unique
                organization = await Organization.create(organizationName, slug, '', client); // Pass client
                userRole = 'admin'; // First user of a new org is admin
            }

            if (!organization || !organization.id) {
                throw new Error('Failed to find or create organization.');
            }

            // Create User
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            const userQuery = `
                INSERT INTO Users (username, email, password_hash, organization_id, role)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, username, email, organization_id, role;
            `;
            const userValues = [username, email, password_hash, organization.id, userRole];
            const userResult = await client.query(userQuery, userValues);
            const newUser = userResult.rows[0];

            if (!newUser || !newUser.id) {
                throw new Error('Failed to create user.');
            }

            // Find or Create Default Team for the Organization
            let defaultTeam;
            const existingDefaultTeam = await Team.findByNameAndOrg(teamName, organization.id, client);
            if (existingDefaultTeam) {
                defaultTeam = existingDefaultTeam;
            } else {
                defaultTeam = await Team.create(teamName, organization.id, client); // Pass client
            }
            
            if (!defaultTeam || !defaultTeam.id) {
                throw new Error('Failed to find or create default team.');
            }

            // Add user to the default team
            // Team.addMember should handle if user is already a member (e.g., ON CONFLICT DO NOTHING)
            await Team.addMember(defaultTeam.id, newUser.id, userRole === 'admin' ? 'admin' : 'member', client); // Pass client, assign admin to default team if they created org

            await client.query('COMMIT');
            return newUser; // Return the created user object

        } catch (error) {
            await client.query('ROLLBACK');
            // Log the detailed error for server-side debugging
            console.error('Error in User.createWithOrganizationAndTeam:', error);
            // Check for specific database unique constraint errors to provide clearer messages
            if (error.code === '23505') { // Unique violation
                if (error.constraint && error.constraint.includes('users_email_key')) {
                    throw new Error('Email address already in use.');
                }
                if (error.constraint && error.constraint.includes('users_username_key')) {
                    throw new Error('Username already taken.');
                }
                 // If Organization.create doesn't handle find-or-create and throws unique error for name/slug
                if (error.constraint && (error.constraint.includes('organizations_name_key') || error.constraint.includes('organizations_slug_key'))) {
                    // This should ideally be handled by the find-or-create logic for Organization
                    // but if it still occurs, it means the find-or-create failed or wasn't robust.
                    throw new Error('Organization name or slug conflict during registration process.');
                }
                // If Team.create doesn't handle find-or-create and throws unique error for team name + org_id
                 if (error.constraint && error.constraint.includes('unique_team_name_org')) {
                    // This should ideally be handled by the find-or-create logic for Team
                    throw new Error('Default team conflict during registration process.');
                }
            }
            throw error; // Re-throw other errors
        } finally {
            client.release();
        }
    },

    async findByEmail(email, client = null) {
        const db = client || pool;
        const query = `
            SELECT u.*, o.name as organization_name, o.slug as organization_slug 
            FROM Users u 
            LEFT JOIN Organizations o ON u.organization_id = o.id 
            WHERE u.email = $1
        `;
        const result = await db.query(query, [email]);
        return result.rows[0];
    },

    async findById(id, client = null) {
        const db = client || pool;
        const query = `
            SELECT u.id, u.username, u.email, u.organization_id, u.role, u.created_at, u.updated_at,
                   o.name as organization_name, o.slug as organization_slug
            FROM Users u
            LEFT JOIN Organizations o ON u.organization_id = o.id
            WHERE u.id = $1
        `;
        const result = await db.query(query, [id]);
        return result.rows[0];
    },

    async comparePassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    },

    async updateProfile(id, { username, email }, client = null) {
        const db = client || pool;
        const fields = [];
        const values = [];
        let queryIndex = 1;

        if (username) {
            fields.push(`username = $${queryIndex++}`);
            values.push(username);
        }
        if (email) {
            fields.push(`email = $${queryIndex++}`);
            values.push(email);
        }

        if (fields.length === 0) {
            return null; 
        }

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `UPDATE Users SET ${fields.join(', ')} WHERE id = $${queryIndex} RETURNING *`;
        const result = await db.query(query, values);
        return result.rows[0];
    },

    async updatePassword(id, newPassword, client = null) {
        const db = client || pool;
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);
        const query = 'UPDATE Users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id';
        const result = await db.query(query, [password_hash, id]);
        return result.rows[0];
    }
};

module.exports = User;