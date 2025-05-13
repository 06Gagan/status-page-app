import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../config/api';
import {
    Container, Typography, Box, List, ListItem, ListItemText,
    CircularProgress, Alert, Button, TextField, Dialog, DialogActions,
    DialogContent, DialogTitle, IconButton, Select, MenuItem,
    FormControl, InputLabel, Paper, Grid, Chip, Tooltip,
    Accordion, AccordionSummary, AccordionDetails, Divider,
    Checkbox, OutlinedInput
} from '@mui/material';
import { useTheme } from '@mui/material/styles'; // Import useTheme
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
// import DeleteIcon from '@mui/icons-material/Delete'; // Was unused
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CommentIcon from '@mui/icons-material/Comment';
import CircleIcon from '@mui/icons-material/Circle';
// import ListItemIcon from '@mui/material/ListItemIcon'; // Was unused

const incidentStatusOptions = [
    { value: 'investigating', label: 'Investigating', color: 'warning' },
    { value: 'identified', label: 'Identified', color: 'info' },
    { value: 'monitoring', label: 'Monitoring', color: 'primary' },
    { value: 'resolved', label: 'Resolved', color: 'success' },
    { value: 'scheduled', label: 'Scheduled', color: 'secondary' }
];

const incidentSeverityOptions = [
    { value: 'critical', label: 'Critical', color: 'error' },
    { value: 'high', label: 'High', color: 'error' },
    { value: 'medium', label: 'Medium', color: 'warning' },
    { value: 'low', label: 'Low', color: 'info' },
];

const getStatusColor = (statusValue, type = 'status') => {
    const options = type === 'status' ? incidentStatusOptions : incidentSeverityOptions;
    const option = options.find(opt => opt.value === statusValue);
    return option ? option.color : 'default';
};


function Incidents() {
    const theme = useTheme(); // Initialize theme
    const [incidents, setIncidents] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { token, user, isAuthenticated, loading: authLoading } = useAuth();

    const [openCreateEditDialog, setOpenCreateEditDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentIncident, setCurrentIncident] = useState(null);
    const [incidentTitle, setIncidentTitle] = useState('');
    const [incidentDescription, setIncidentDescription] = useState('');
    const [incidentStatus, setIncidentStatus] = useState('investigating');
    const [incidentSeverity, setIncidentSeverity] = useState('medium');
    const [componentsAffected, setComponentsAffected] = useState('');
    const [affectedServiceIds, setAffectedServiceIds] = useState([]);
    const [scheduledAt, setScheduledAt] = useState('');
    const [dialogError, setDialogError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
    const [incidentForUpdate, setIncidentForUpdate] = useState(null);
    const [updateDescription, setUpdateDescription] = useState('');
    const [updateStatus, setUpdateStatus] = useState('');
    const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
    const [updateDialogError, setUpdateDialogError] = useState('');


    const canManage = user?.role === 'admin' || user?.role === 'editor';

    const fetchIncidents = useCallback(async () => {
        if (!token || !isAuthenticated) return;
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/incidents', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIncidents(response.data || []);
        } catch (err) {
            console.error("Error fetching incidents:", err);
            setError(err.response?.data?.message || err.message || 'Failed to fetch incidents');
            setIncidents([]);
        } finally {
            setLoading(false);
        }
    }, [token, isAuthenticated]);

    const fetchServicesForSelect = useCallback(async () => {
        if (!token || !isAuthenticated) return;
        try {
            const response = await api.get('/services', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setServices(response.data || []);
        } catch (err) {
            console.error("Error fetching services for select:", err);
        }
    }, [token, isAuthenticated]);


    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchIncidents();
            fetchServicesForSelect();
        } else if (!authLoading && !isAuthenticated) {
            setError("Not authenticated. Please log in.");
            setLoading(false);
        }
    }, [authLoading, isAuthenticated, fetchIncidents, fetchServicesForSelect]);

    const resetDialogFields = () => {
        setIncidentTitle('');
        setIncidentDescription('');
        setIncidentStatus('investigating');
        setIncidentSeverity('medium');
        setComponentsAffected('');
        setAffectedServiceIds([]);
        setScheduledAt('');
        setDialogError('');
        setIsSubmitting(false);
    };

    const handleOpenCreateDialog = () => {
        setIsEditing(false);
        setCurrentIncident(null);
        resetDialogFields();
        setOpenCreateEditDialog(true);
    };

    const handleOpenEditDialog = (incident) => {
        setIsEditing(true);
        setCurrentIncident(incident);
        setIncidentTitle(incident.title);
        setIncidentDescription(incident.description);
        setIncidentStatus(incident.status);
        setIncidentSeverity(incident.severity);
        setComponentsAffected(Array.isArray(incident.components_affected) ? incident.components_affected.join(', ') : '');
        setAffectedServiceIds(Array.isArray(incident.services_affected) ? incident.services_affected.map(s => s.id) : []);
        setScheduledAt(incident.scheduled_at ? new Date(incident.scheduled_at).toISOString().slice(0, 16) : '');
        setDialogError('');
        setIsSubmitting(false);
        setOpenCreateEditDialog(true);
    };

    const handleCloseCreateEditDialog = () => {
        if (isSubmitting) return;
        setOpenCreateEditDialog(false);
    };

    const handleSubmitIncident = async () => {
        if (isSubmitting || !canManage) return;
        if (!incidentTitle.trim()) {
            setDialogError('Incident title cannot be empty.');
            return;
        }
        if (!incidentDescription.trim() && !isEditing) {
            setDialogError('Initial description/update cannot be empty.');
            return;
        }

        setDialogError('');
        setIsSubmitting(true);

        const payload = {
            title: incidentTitle.trim(),
            description: incidentDescription.trim(),
            status: incidentStatus,
            severity: incidentSeverity,
            components_affected: componentsAffected.split(',').map(s => s.trim()).filter(s => s),
            serviceIds: affectedServiceIds,
            scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
            update_description: isEditing ? (incidentDescription.trim() || `Incident details updated. New status: ${incidentStatus}`) : undefined
        };

        try {
            if (isEditing && currentIncident) {
                await api.put(`/incidents/${currentIncident.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await api.post('/incidents', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchIncidents();
            handleCloseCreateEditDialog();
        } catch (err) {
            console.error("Error submitting incident:", err);
            setDialogError(err.response?.data?.message || err.message || 'Failed to save incident.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenUpdateDialog = (incident) => {
        setIncidentForUpdate(incident);
        setUpdateDescription('');
        setUpdateStatus(incident.status);
        setUpdateDialogError('');
        setIsSubmittingUpdate(false);
        setOpenUpdateDialog(true);
    };

    const handleCloseUpdateDialog = () => {
        if (isSubmittingUpdate) return;
        setOpenUpdateDialog(false);
        setIncidentForUpdate(null);
    };

    const handleSubmitUpdate = async () => {
        if (isSubmittingUpdate || !incidentForUpdate || !canManage) return;
        if (!updateDescription.trim()) {
            setUpdateDialogError('Update description cannot be empty.');
            return;
        }
        setUpdateDialogError('');
        setIsSubmittingUpdate(true);

        const payload = {
            description: updateDescription.trim(),
            status: updateStatus,
        };

        try {
            await api.post(`/incidents/${incidentForUpdate.id}/updates`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchIncidents();
            handleCloseUpdateDialog();
        } catch (err) {
            console.error("Error submitting incident update:", err);
            setUpdateDialogError(err.response?.data?.message || err.message || 'Failed to add update.');
        } finally {
            setIsSubmittingUpdate(false);
        }
    };


    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Manage Incidents
                </Typography>

                {canManage && (
                    <Button
                        variant="contained"
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={handleOpenCreateDialog}
                        sx={{ mb: 2 }}
                    >
                        Create New Incident
                    </Button>
                )}

                {loading && <CircularProgress />}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {!loading && !error && incidents.length === 0 && isAuthenticated && (
                    <Typography>No incidents found for your organization.</Typography>
                )}
                {!loading && !error && incidents.length > 0 && isAuthenticated && (
                    incidents.map((incident) => (
                        <Paper key={incident.id} elevation={2} sx={{ mb: 2 }}>
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Grid container spacing={1} alignItems="center">
                                        <Grid item xs={12} sm={5}>
                                            <Typography variant="h6">{incident.title}</Typography>
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <Chip
                                                icon={<CircleIcon sx={{ fontSize: 12 }} />}
                                                label={incidentStatusOptions.find(s => s.value === incident.status)?.label || incident.status}
                                                color={getStatusColor(incident.status, 'status')}
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={6} sm={2}>
                                            <Chip
                                                label={incidentSeverityOptions.find(s => s.value === incident.severity)?.label || incident.severity}
                                                color={getStatusColor(incident.severity, 'severity')}
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={2} textAlign={{sm: 'right'}}>
                                            {canManage && (
                                                <>
                                                <Tooltip title="Edit Incident">
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(incident); }}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Add Update">
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenUpdateDialog(incident); }}>
                                                        <CommentIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                </>
                                            )}
                                        </Grid>
                                    </Grid>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Reported: {new Date(incident.created_at).toLocaleString()}
                                        {incident.reporter_username && ` by ${incident.reporter_username}`}
                                        {incident.scheduled_at && ` | Scheduled for: ${new Date(incident.scheduled_at).toLocaleString()}`}
                                    </Typography>
                                    <Typography variant="body1" paragraph>
                                        {incident.description}
                                    </Typography>
                                    {incident.components_affected && incident.components_affected.length > 0 && (
                                        <Typography variant="body2" sx={{mb:1}}>
                                            <strong>Components Affected:</strong> {incident.components_affected.join(', ')}
                                        </Typography>
                                    )}
                                    {incident.services_affected && incident.services_affected.length > 0 && (
                                        <Typography variant="body2" sx={{mb:1}}>
                                            <strong>Services Affected:</strong> {incident.services_affected.map(s => s.name).join(', ')}
                                        </Typography>
                                    )}
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="subtitle2" gutterBottom>Updates:</Typography>
                                    {incident.updates && incident.updates.length > 0 ? (
                                        <List dense disablePadding>
                                            {incident.updates.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(upd => (
                                                <ListItem key={upd.id} sx={{ display: 'block', mb: 1, borderLeft: `3px solid ${theme.palette[getStatusColor(upd.status, 'status')]?.main || theme.palette.grey[400]}`, pl:1.5 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(upd.created_at).toLocaleString()}
                                                        {upd.username && ` by ${upd.username}`}
                                                        {' - Status: '}
                                                        <Chip
                                                            icon={<CircleIcon sx={{ fontSize: 10 }} />}
                                                            label={incidentStatusOptions.find(s => s.value === upd.status)?.label || upd.status}
                                                            color={getStatusColor(upd.status, 'status')}
                                                            size="small"
                                                            sx={{height: 'auto', '.MuiChip-label': {fontSize: '0.7rem', lineHeight: '1.2'}}}
                                                        />
                                                    </Typography>
                                                    <Typography variant="body2">{upd.description}</Typography>
                                                </ListItem>
                                            ))}
                                        </List>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">No updates posted yet.</Typography>
                                    )}
                                </AccordionDetails>
                            </Accordion>
                        </Paper>
                    ))
                )}
            </Box>

            {canManage && (
                <Dialog open={openCreateEditDialog} onClose={handleCloseCreateEditDialog} maxWidth="md" fullWidth>
                    <DialogTitle>{isEditing ? 'Edit Incident' : 'Create New Incident'}</DialogTitle>
                    <DialogContent>
                        {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
                        <TextField autoFocus margin="dense" id="incidentTitle" label="Incident Title" type="text" fullWidth variant="outlined" value={incidentTitle} onChange={(e) => setIncidentTitle(e.target.value)} disabled={isSubmitting} sx={{ mb: 2 }} />
                        <TextField margin="dense" id="incidentDescription" label={isEditing ? "Update Description (optional)" : "Initial Description / Update"} type="text" fullWidth multiline rows={4} variant="outlined" value={incidentDescription} onChange={(e) => setIncidentDescription(e.target.value)} disabled={isSubmitting} sx={{ mb: 2 }} />
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth margin="dense" disabled={isSubmitting}>
                                    <InputLabel id="incident-status-label">Status</InputLabel>
                                    <Select labelId="incident-status-label" value={incidentStatus} label="Status" onChange={(e) => setIncidentStatus(e.target.value)}>
                                        {incidentStatusOptions.map(option => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth margin="dense" disabled={isSubmitting}>
                                    <InputLabel id="incident-severity-label">Severity</InputLabel>
                                    <Select labelId="incident-severity-label" value={incidentSeverity} label="Severity" onChange={(e) => setIncidentSeverity(e.target.value)}>
                                        {incidentSeverityOptions.map(option => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                        <FormControl fullWidth margin="dense" sx={{ mb: 2 }} disabled={isSubmitting}>
                            <InputLabel id="affected-services-label">Affected Services (Optional)</InputLabel>
                            <Select
                                labelId="affected-services-label"
                                multiple
                                value={affectedServiceIds}
                                onChange={(e) => setAffectedServiceIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                input={<OutlinedInput label="Affected Services (Optional)" />}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {selected.map((value) => {
                                            const serviceName = services.find(s => s.id === value)?.name || value;
                                            return <Chip key={value} label={serviceName} size="small"/>;
                                        })}
                                    </Box>
                                )}
                            >
                                {services.length === 0 && <MenuItem disabled>Loading services...</MenuItem>}
                                {services.map((service) => (
                                    <MenuItem key={service.id} value={service.id}>
                                        <Checkbox checked={affectedServiceIds.indexOf(service.id) > -1} />
                                        <ListItemText primary={service.name} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField margin="dense" id="componentsAffected" label="Components Affected (comma-separated, optional)" type="text" fullWidth variant="outlined" value={componentsAffected} onChange={(e) => setComponentsAffected(e.target.value)} disabled={isSubmitting} sx={{ mb: 2 }} />
                        <TextField margin="dense" id="scheduledAt" label="Scheduled For (Optional)" type="datetime-local" fullWidth variant="outlined" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} InputLabelProps={{ shrink: true }} disabled={isSubmitting} />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseCreateEditDialog} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleSubmitIncident} disabled={isSubmitting} variant="contained">
                            {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Save Changes' : 'Create Incident')}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            {canManage && incidentForUpdate && (
                 <Dialog open={openUpdateDialog} onClose={handleCloseUpdateDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>Add Update to: {incidentForUpdate.title}</DialogTitle>
                    <DialogContent>
                        {updateDialogError && <Alert severity="error" sx={{ mb: 2 }}>{updateDialogError}</Alert>}
                        <TextField autoFocus margin="dense" id="updateDescription" label="Update Description" type="text" fullWidth multiline rows={4} variant="outlined" value={updateDescription} onChange={(e) => setUpdateDescription(e.target.value)} disabled={isSubmittingUpdate} sx={{ mb: 2 }} />
                        <FormControl fullWidth margin="dense" disabled={isSubmittingUpdate}>
                            <InputLabel id="update-status-label">New Incident Status</InputLabel>
                            <Select labelId="update-status-label" value={updateStatus} label="New Incident Status" onChange={(e) => setUpdateStatus(e.target.value)}>
                                {incidentStatusOptions.map(option => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseUpdateDialog} disabled={isSubmittingUpdate}>Cancel</Button>
                        <Button onClick={handleSubmitUpdate} disabled={isSubmittingUpdate} variant="contained">
                            {isSubmittingUpdate ? <CircularProgress size={24} /> : "Post Update"}
                        </Button>
                    </DialogActions>
                 </Dialog>
            )}

        </Container>
    );
}

export default Incidents;