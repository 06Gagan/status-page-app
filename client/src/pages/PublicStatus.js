import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import {
    Container, Typography, Box, List, ListItem, ListItemText,
    CircularProgress, Alert, Paper, Divider, Chip, Grid, Link,
    ListItemIcon // Import ListItemIcon
} from '@mui/material';
import { useTheme } from '@mui/material/styles'; // Import useTheme
import CircleIcon from '@mui/icons-material/Circle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import HistoryIcon from '@mui/icons-material/History';
import BusinessIcon from '@mui/icons-material/Business';

const serviceStatusOptions = [
    { value: 'operational', label: 'Operational', color: 'success', icon: <CheckCircleOutlineIcon fontSize="inherit" /> },
    { value: 'degraded_performance', label: 'Degraded Performance', color: 'warning', icon: <ReportProblemOutlinedIcon fontSize="inherit" /> },
    { value: 'partial_outage', label: 'Partial Outage', color: 'warning', icon: <ReportProblemOutlinedIcon fontSize="inherit" /> },
    { value: 'major_outage', label: 'Major Outage', color: 'error', icon: <ErrorOutlineIcon fontSize="inherit" /> },
    { value: 'under_maintenance', label: 'Under Maintenance', color: 'info', icon: <ConstructionOutlinedIcon fontSize="inherit" /> },
];

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

const getStatusDisplay = (value, type = 'service') => {
    const options = type === 'service' ? serviceStatusOptions : (type === 'incident' ? incidentStatusOptions : incidentSeverityOptions);
    const option = options.find(opt => opt.value === value);
    return option || { value, label: value, color: 'default', icon: <CircleIcon fontSize="inherit" /> };
};


function PublicStatusPage() {
    const theme = useTheme(); // Initialize theme
    const { slug } = useParams();
    const { user, isAuthenticated } = useAuth(); // Get user and isAuthenticated for conditional link
    const [organization, setOrganization] = useState(null);
    const [services, setServices] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        if (!slug) {
            setError("Organization slug not provided.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const orgPromise = api.get(`/organizations/${slug}`);
            const servicesPromise = api.get(`/organizations/${slug}/services`);
            const incidentsPromise = api.get(`/organizations/${slug}/incidents`);

            const [orgResponse, servicesResponse, incidentsResponse] = await Promise.all([
                orgPromise,
                servicesPromise,
                incidentsPromise
            ]);

            setOrganization(orgResponse.data || { name: slug, slug: slug });
            setServices(servicesResponse.data || []);
            setIncidents(incidentsResponse.data || []);

        } catch (err) {
            console.error("Error fetching public status data:", err);
            const message = err.response?.data?.message || err.message || 'Failed to load status information.';
            if (err.response?.status === 404) {
                setError(`Status page for '${slug}' not found.`);
            } else {
                setError(message);
            }
            setOrganization({ name: slug, slug: slug });
            setServices([]);
            setIncidents([]);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const activeIncidents = incidents.filter(inc => inc.status !== 'resolved' && inc.status !== 'completed');
    const resolvedIncidents = incidents.filter(inc => inc.status === 'resolved' || inc.status === 'completed').sort((a,b) => new Date(b.resolved_at || b.updated_at) - new Date(a.resolved_at || a.updated_at)).slice(0, 5);

    const overallSystemStatus = () => {
        if (services.some(s => s.status === 'major_outage')) return getStatusDisplay('major_outage');
        if (services.some(s => s.status === 'partial_outage')) return getStatusDisplay('partial_outage');
        if (services.some(s => s.status === 'degraded_performance')) return getStatusDisplay('degraded_performance');
        if (services.some(s => s.status === 'under_maintenance')) return getStatusDisplay('under_maintenance');
        if (services.every(s => s.status === 'operational') && services.length > 0) return getStatusDisplay('operational');
        return { label: "Status Unknown", color: "default", icon: <CircleIcon fontSize="inherit" /> };
    };

    const currentOverallStatus = overallSystemStatus();

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                    <CircularProgress size={60} />
                    <Typography variant="h6" sx={{ ml: 2 }}>Loading Status...</Typography>
                </Box>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Alert severity="error" icon={<ErrorOutlineIcon fontSize="inherit" />}>
                    <Typography variant="h6">Error Loading Status Page</Typography>
                    {error}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, mb: 4, borderRadius: '12px', border: '1px solid #e0e0e0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                     <BusinessIcon sx={{ fontSize: '2.5rem', mr: 1.5, color: 'primary.main' }} />
                    <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {organization?.name || slug} Status
                    </Typography>
                </Box>
                <Chip
                    icon={currentOverallStatus.icon}
                    label={currentOverallStatus.label}
                    color={currentOverallStatus.color}
                    sx={{ p: 2, fontSize: '1.1rem', fontWeight: 'medium', mb: 3 }}
                />
                <Divider sx={{ my: 2 }}/>
                <Typography variant="caption" color="text.secondary">
                    Last updated: {new Date().toLocaleString()} (Note: This is client render time. Real-time updates via WebSockets would be ideal here.)
                </Typography>
            </Paper>

            {activeIncidents.length > 0 && (
                <Box mb={4}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'medium', color: 'text.primary', borderLeft: '4px solid', borderColor: 'error.main', pl: 1.5, mb: 2 }}>
                        Active Incidents
                    </Typography>
                    {activeIncidents.map(incident => {
                        const incStatus = getStatusDisplay(incident.status, 'incident');
                        const incSeverity = getStatusDisplay(incident.severity, 'severity');
                        return (
                            <Paper key={incident.id} elevation={2} sx={{ p: 2.5, mb: 2, borderRadius: '8px', borderLeft: `5px solid ${theme.palette[incStatus.color]?.main || theme.palette.grey[500]}` }}>
                                <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'medium' }}>{incident.title}</Typography>
                                <Grid container spacing={1} sx={{ mb: 1 }}>
                                    <Grid item>
                                        <Chip label={incStatus.label} color={incStatus.color} size="small" />
                                    </Grid>
                                    <Grid item>
                                        <Chip label={`Severity: ${incSeverity.label}`} color={incSeverity.color} size="small" variant="outlined" />
                                    </Grid>
                                </Grid>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Reported: {new Date(incident.created_at).toLocaleString()}
                                    {incident.scheduled_at && ` | Scheduled for: ${new Date(incident.scheduled_at).toLocaleString()}`}
                                </Typography>
                                <Typography variant="body1" paragraph sx={{mb: 1}}>
                                    {incident.updates && incident.updates.length > 0 ? incident.updates.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0].description : incident.description}
                                </Typography>
                                {incident.services_affected && incident.services_affected.length > 0 && (
                                    <Typography variant="caption" display="block" color="textSecondary">
                                        Affected Services: {incident.services_affected.map(s => s.name).join(', ')}
                                    </Typography>
                                )}
                            </Paper>
                        );
                    })}
                </Box>
            )}

            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'medium', color: 'text.primary', borderLeft: '4px solid', borderColor: 'primary.main', pl: 1.5, mb: 2 }}>
                Service Status
            </Typography>
            {services.length > 0 ? (
                <List component={Paper} elevation={2} sx={{ borderRadius: '8px', p:0 }}>
                    {services.sort((a, b) => (a.order || 0) - (b.order || 0)).map((service, index) => {
                        const servStatus = getStatusDisplay(service.status, 'service');
                        return (
                            <React.Fragment key={service.id}>
                                <ListItem sx={{ py: 1.5 }}>
                                    <ListItemIcon sx={{minWidth: '40px', color: `${servStatus.color}.main`}}>
                                        {servStatus.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={<Typography variant="h6" component="span" sx={{ fontWeight: 'medium' }}>{service.name}</Typography>}
                                        secondary={service.description}
                                    />
                                    <Chip
                                        label={servStatus.label}
                                        color={servStatus.color}
                                        sx={{ fontWeight: 'medium' }}
                                    />
                                </ListItem>
                                {index < services.length - 1 && <Divider component="li" />}
                            </React.Fragment>
                        );
                    })}
                </List>
            ) : (
                <Typography>No services configured for this status page.</Typography>
            )}

            {resolvedIncidents.length > 0 && (
                <Box mt={5}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'medium', color: 'text.primary', borderLeft: '4px solid', borderColor: 'grey.500', pl: 1.5, mb: 2 }}>
                        <HistoryIcon sx={{verticalAlign: 'middle', mr: 0.5}}/> Recent Incident History
                    </Typography>
                     {resolvedIncidents.map(incident => {
                        const incStatus = getStatusDisplay(incident.status, 'incident');
                        return (
                            <Paper key={incident.id} elevation={1} sx={{ p: 2, mb: 2, borderRadius: '8px', opacity: 0.85 }}>
                                <Typography variant="subtitle1" component="h4" gutterBottom sx={{ fontWeight: 'medium' }}>{incident.title}</Typography>
                                <Chip label={incStatus.label} color={incStatus.color} size="small" sx={{mb:1}} />
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Resolved: {new Date(incident.resolved_at || incident.updated_at).toLocaleString()}
                                </Typography>
                                <Typography variant="body2" paragraph sx={{mb:0}}>
                                     {incident.updates && incident.updates.length > 0 ? incident.updates.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0].description : incident.description}
                                </Typography>
                            </Paper>
                        );
                    })}
                </Box>
            )}
             <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary', fontSize: '0.9rem' }}>
                Powered by Your Status Page App.
                {user && isAuthenticated && (
                     <Typography variant="caption" display="block" sx={{mt:1}}>
                        <Link component={RouterLink} to="/dashboard">Go to Dashboard</Link>
                    </Typography>
                )}
            </Box>
        </Container>
    );
}

export default PublicStatusPage;