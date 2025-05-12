const { pool } = require('../config/db');
const Organization = require('./Organization');

const Incident = {
    async create({ title, description, status, severity, service_ids, components_affected, user_id, organization_id, scheduled_at = null }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const incidentQuery = `
                INSERT INTO Incidents (title, description, status, severity, user_id, organization_id, components_affected, scheduled_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *;
            `;
            const incidentValues = [title, description, status, severity, user_id, organization_id, components_affected || null, scheduled_at];
            const incidentResult = await client.query(incidentQuery, incidentValues);
            const newIncident = incidentResult.rows[0];

            if (service_ids && service_ids.length > 0) {
                const serviceIncidentQuery = `
                    INSERT INTO IncidentServices (incident_id, service_id)
                    VALUES ($1, $2);
                `;
                for (const service_id of service_ids) {
                    await client.query(serviceIncidentQuery, [newIncident.id, service_id]);
                }
            }
            
            const initialUpdateQuery = `
                INSERT INTO IncidentUpdates (incident_id, user_id, description, status)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;
            const initialUpdateDescription = scheduled_at ? `Maintenance scheduled: ${description}` : `Incident reported: ${description}`; 
            await client.query(initialUpdateQuery, [newIncident.id, user_id, initialUpdateDescription, status]);

            await client.query('COMMIT');
            return newIncident;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async addUpdate({ incident_id, user_id, description, status }) {
        const query = `
            INSERT INTO IncidentUpdates (incident_id, user_id, description, status)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [incident_id, user_id, description, status];
        const result = await pool.query(query, values);

        const updateIncidentQuery = `
            UPDATE Incidents
            SET status = $1, updated_at = NOW()
            WHERE id = $2 RETURNING resolved_at; 
        `;
        // If status is resolved, set resolved_at, unless it's already set.
        // This logic might be better in the update method or a dedicated resolve method.
        if (status === 'resolved') {
            const incidentCheck = await pool.query('SELECT resolved_at FROM Incidents WHERE id = $1', [incident_id]);
            if (incidentCheck.rows.length > 0 && !incidentCheck.rows[0].resolved_at) {
                 await pool.query('UPDATE Incidents SET status = $1, resolved_at = NOW(), updated_at = NOW() WHERE id = $2', [status, incident_id]);
            } else {
                 await pool.query(updateIncidentQuery, [status, incident_id]);
            }
        } else {
            await pool.query(updateIncidentQuery, [status, incident_id]);
        }
        
        return result.rows[0];
    },

    async findById(id) {
        const incidentQuery = `
            SELECT i.*, u.username as reporter_username
            FROM Incidents i
            LEFT JOIN Users u ON i.user_id = u.id
            WHERE i.id = $1;
        `;
        const incidentResult = await pool.query(incidentQuery, [id]);
        if (incidentResult.rows.length === 0) {
            return null;
        }
        const incident = incidentResult.rows[0];

        const updatesQuery = `
            SELECT iu.*, u.username as updater_username
            FROM IncidentUpdates iu
            LEFT JOIN Users u ON iu.user_id = u.id
            WHERE iu.incident_id = $1
            ORDER BY iu.created_at DESC;
        `;
        const updatesResult = await pool.query(updatesQuery, [id]);
        incident.updates = updatesResult.rows;

        const servicesQuery = `
            SELECT s.id, s.name, s.status as service_status
            FROM Services s
            JOIN IncidentServices iserv ON s.id = iserv.service_id
            WHERE iserv.incident_id = $1;
        `;
        const servicesResult = await pool.query(servicesQuery, [id]);
        incident.affected_services = servicesResult.rows;
        
        return incident;
    },

    async findAllByOrganizationId(organization_id) {
        const query = `
            SELECT i.*, u.username as reporter_username
            FROM Incidents i
            LEFT JOIN Users u ON i.user_id = u.id
            WHERE i.organization_id = $1
            ORDER BY i.created_at DESC;
        `;
        const result = await pool.query(query, [organization_id]);
        
        const incidentsWithDetails = await Promise.all(result.rows.map(async (incident) => {
            const updatesQuery = `
                SELECT iu.*, u.username as updater_username
                FROM IncidentUpdates iu
                LEFT JOIN Users u ON iu.user_id = u.id
                WHERE iu.incident_id = $1
                ORDER BY iu.created_at ASC; 
            `;
            const updatesResult = await pool.query(updatesQuery, [incident.id]);
            incident.updates = updatesResult.rows;

            const servicesQuery = `
                SELECT s.id, s.name, s.status as service_status
                FROM Services s
                JOIN IncidentServices iserv ON s.id = iserv.service_id
                WHERE iserv.incident_id = $1;
            `;
            const servicesResult = await pool.query(servicesQuery, [incident.id]);
            incident.affected_services = servicesResult.rows;
            return incident;
        }));
        return incidentsWithDetails;
    },

    async update(id, { title, description, status, severity, components_affected, service_ids, user_id_for_update, scheduled_at, resolved_at }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
    
            const currentIncidentResult = await client.query('SELECT * FROM Incidents WHERE id = $1', [id]);
            if (currentIncidentResult.rows.length === 0) {
                throw new Error('Incident not found');
            }
            const currentIncident = currentIncidentResult.rows[0];
    
            let updateLogDescription = "Incident details updated.";
            const updatesMade = [];

            const updateFields = {};
            if (title !== undefined && title !== currentIncident.title) {
                updateFields.title = title;
                updatesMade.push(`Title changed to "${title}"`);
            }
            if (description !== undefined && description !== currentIncident.description) {
                updateFields.description = description;
                updatesMade.push(`Description updated.`);
            }
            if (status !== undefined && status !== currentIncident.status) {
                updateFields.status = status;
                updatesMade.push(`Status changed to "${status}"`);
            }
            if (severity !== undefined && severity !== currentIncident.severity) {
                updateFields.severity = severity;
                updatesMade.push(`Severity changed to "${severity}"`);
            }
            if (components_affected !== undefined ) { // Compare arrays properly if needed, for now just if provided
                updateFields.components_affected = components_affected;
                updatesMade.push(`Affected components updated.`);
            }
            if (scheduled_at !== undefined) {
                updateFields.scheduled_at = scheduled_at;
                 updatesMade.push(`Scheduled time updated.`);
            }
             if (resolved_at !== undefined && status === 'resolved') { // Only set resolved_at if status is resolved
                updateFields.resolved_at = resolved_at;
                updatesMade.push(`Resolved time updated.`);
            } else if (status === 'resolved' && !currentIncident.resolved_at) { // Auto-set resolved_at if moving to resolved
                updateFields.resolved_at = 'NOW()'; // Use database NOW()
                updatesMade.push(`Marked as resolved.`);
            }


            if (Object.keys(updateFields).length > 0) {
                const setClauses = Object.keys(updateFields).map((key, index) => `"${key}" = $${index + 1}`).join(', ');
                const values = Object.values(updateFields);
                values.push(id); // For WHERE id = $N

                const incidentQuery = `
                    UPDATE Incidents
                    SET ${setClauses}, updated_at = NOW()
                    WHERE id = $${values.length}
                    RETURNING *;
                `;
                await client.query(incidentQuery, values);
            }
            
            if (updatesMade.length > 0) {
                updateLogDescription = updatesMade.join('. ') + '.';
            }
    
            if (service_ids !== undefined) { 
                await client.query('DELETE FROM IncidentServices WHERE incident_id = $1', [id]);
                if (service_ids.length > 0) {
                    const serviceIncidentQuery = `
                        INSERT INTO IncidentServices (incident_id, service_id)
                        VALUES ($1, $2);
                    `;
                    for (const service_id of service_ids) {
                        await client.query(serviceIncidentQuery, [id, service_id]);
                    }
                    if (updatesMade.length === 0) { 
                        updateLogDescription = "Affected services updated.";
                    } else {
                        updateLogDescription += " Affected services also updated.";
                    }
                } else if (updatesMade.length === 0) { // If only services were changed (to empty)
                     updateLogDescription = "Affected services removed.";
                } else {
                     updateLogDescription += " Affected services also updated (cleared).";
                }
            }
            
            // Only add an update entry if there were meaningful changes.
            if (updatesMade.length > 0 || service_ids !== undefined) {
                 const incidentUpdateQuery = `
                    INSERT INTO IncidentUpdates (incident_id, user_id, description, status)
                    VALUES ($1, $2, $3, $4);
                `;
                const statusForUpdateLog = status || currentIncident.status;
                await client.query(incidentUpdateQuery, [id, user_id_for_update, updateLogDescription, statusForUpdateLog]);
            }

            await client.query('COMMIT');
            const finalIncident = await this.findById(id); // Fetch the fully updated incident
            return finalIncident;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
    
    async delete(id) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM IncidentServices WHERE incident_id = $1', [id]);
            await client.query('DELETE FROM IncidentUpdates WHERE incident_id = $1', [id]);
            const result = await client.query('DELETE FROM Incidents WHERE id = $1 RETURNING *;', [id]);
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
            return { organization: null, incidents: [] };
        }
        const incidents = await this.findAllByOrganizationId(organization.id);
        return { organization, incidents };
    }
};

module.exports = Incident;