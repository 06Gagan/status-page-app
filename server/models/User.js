const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const Organization = require('./Organization');
const Team = require('./Team');
const logger = require('../config/logger');

const User = {
    async createWithOrganizationAndTeam({ username, email, password, organizationName, organizationSlug, teamName = 'Default Team' }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Pass client to Organization.create
            const newOrganization = await Organization.create(organizationName, organizationSlug, client);
            if (!newOrganization || !newOrganization.id) {
                throw new Error('Failed to create organization during registration transaction.');
            }
            const organization_id = newOrganization.id;

            const hashedPassword = await bcrypt.hash(password, 10);
            const userQuery = `
                INSERT INTO Users (username, email, password_hash, organization_id, role)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, username, email, organization_id, role, created_at, updated_at;
            `;
            const userValues = [username, email, hashedPassword, organization_id, 'admin'];
            // Use client for this query as well
            const userResult = await client.query(userQuery, userValues);
            const newUser = userResult.rows[0];
            if (!newUser || !newUser.id) {
                throw new Error('Failed to create user during registration transaction.');
            }

            const actualTeamName = teamName && teamName.trim() !== '' ? teamName : 'Default Team';
            // Pass client to Team.create
            const defaultTeam = await Team.create(actualTeamName, organization_id, client);
            if (!defaultTeam || !defaultTeam.id) {
                throw new Error('Failed to create default team during registration transaction.');
            }
            
            // Pass client to Team.addMember
            await Team.addMember(defaultTeam.id, newUser.id, 'admin', client);

            await client.query('COMMIT');
            return {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                organization_id: newUser.organization_id,
                role: newUser.role,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            
            logger.error('🔴 DETAILED DB ERROR in User.createWithOrganizationAndTeam transaction:', {
                errorMessage: error.message,
                errorCode: error.code, 
                errorDetail: error.detail, 
                errorConstraint: error.constraint, 
                errorStack: error.stack,
            });

            if (error.code === '23505') { // unique_violation
                if (error.constraint && error.constraint.includes('organizations_name_key')) {
                    throw new Error('Organization name already exists.');
                } else if (error.constraint && error.constraint.includes('organizations_slug_key')) {
                    throw new Error('Organization slug already exists.');
                } else if (error.constraint && error.constraint.includes('users_email_key')) {
                    throw new Error('Email already exists.');
                } else if (error.constraint && error.constraint.includes('users_username_key')) {
                    throw new Error('Username already exists.');
                } else if (error.constraint && error.constraint.includes('unique_team_name_org')) {
                    throw new Error(`Team name '${teamName || 'Default Team'}' already exists for this organization.`);
                }
                throw new Error(`A unique value constraint ('${error.constraint || 'unknown'}') was violated: ${error.detail || error.message}`);
            }
            throw new Error(`User registration failed due to a database error (Code: ${error.code || 'N/A'}). Check server logs for details.`);
        } finally {
            client.release();
        }
    },
    
    async createSimpleUser({ username, email, password, organization_id, role = 'member' }) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `
            INSERT INTO Users (username, email, password_hash, organization_id, role) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id, username, email, organization_id, role, created_at;
            `;
        const values = [username, email, hashedPassword, organization_id, role];
        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
             if (error.code === '23505' && error.constraint === 'users_email_key') {
                throw new Error('Email already exists.');
            }
            if (error.code === '23505' && error.constraint === 'users_username_key') {
                throw new Error('Username already exists.');
            }
            logger.error('Error in createSimpleUser:', { message: error.message, stack: error.stack, code: error.code });
            throw error;
        }
    },

    async findByEmail(email) {
        const query = 'SELECT * FROM Users WHERE email = $1';
        const result = await pool.query(query, [email]);
        return result.rows[0];
    },

    async findById(id) {
        const query = `
            SELECT u.id, u.username, u.email, u.organization_id, u.role, u.created_at, u.updated_at,
                   o.name as organization_name, o.slug as organization_slug
            FROM Users u
            LEFT JOIN Organizations o ON u.organization_id = o.id
            WHERE u.id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    async comparePassword(candidatePassword, hashedPassword) {
        return bcrypt.compare(candidatePassword, hashedPassword);
    },

    async updateProfile(id, { username, email }) {
        const fieldsToUpdate = [];
        const values = [];
        let paramCount = 1;

        if (username) {
            fieldsToUpdate.push(`username = $${paramCount++}`);
            values.push(username);
        }
        if (email) {
            fieldsToUpdate.push(`email = $${paramCount++}`);
            values.push(email);
        }

        if (fieldsToUpdate.length === 0) {
            return this.findById(id);
        }

        fieldsToUpdate.push(`updated_at = NOW()`);

        const query = `
            UPDATE Users 
            SET ${fieldsToUpdate.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, username, email, organization_id, role, created_at, updated_at;
        `;
        values.push(id);

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') { 
                 if (error.constraint === 'users_email_key') {
                    throw new Error('Email already taken.');
                } else if (error.constraint === 'users_username_key') {
                    throw new Error('Username already taken.');
                }
            }
            logger.error('Error in updateProfile:', { message: error.message, stack: error.stack, code: error.code });
            throw error;
        }
    },

    async updatePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const query = `
            UPDATE Users 
            SET password_hash = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, username, email; 
        `;
        const values = [hashedPassword, id];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    async findByOrganizationId(organization_id) {
        const query = 'SELECT id, username, email, role FROM Users WHERE organization_id = $1 ORDER BY username';
        const result = await pool.query(query, [organization_id]);
        return result.rows;
    }
};

module.exports = User;

