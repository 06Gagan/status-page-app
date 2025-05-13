// status-page-app/client/src/pages/PublicStatus.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import {
    Container, Typography, Box, List, ListItem, ListItemText,
    CircularProgress, Alert, Paper, Divider, Chip, Grid, Link,
    ListItemIcon
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CircleIcon from '@mui/icons-material/Circle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import HistoryIcon from '@mui/icons-material/History';
import BusinessIcon from '@mui/icons-material/Business';

const serviceStatusOptions = [
    { value: 'operational', label: 'Operational', color: 'success', IconComponent: CheckCircleOutlineIcon },
    { value: 'degraded_performance', label: 'Degraded Performance', color: 'warning', IconComponent: ReportProblemOutlinedIcon },
    { value: 'partial_outage', label: 'Partial Outage', color: 'warning', IconComponent: ReportProblemOutlinedIcon },
    { value: 'major_outage', label: 'Major Outage', color: 'error', IconComponent: ErrorOutlineIcon },
    { value: 'under_maintenance', label: 'Under Maintenance', color: 'info', IconComponent: ConstructionOutlinedIcon },
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
    const IconToRender = option?.IconComponent || CircleIcon; 
    return option ? { ...option, icon: <IconToRender fontSize="inherit" /> } : { value, label: value, color: 'default', icon: <CircleIcon fontSize="inherit" /> };
};

function PublicStatusPage() {
    const theme = useTheme();
    const { slug } = useParams();
    const { user, isAuthenticated } = useAuth(); 
    const { socket, isConnected } = useSocket();

    const [organization, setOrganization] = useState(null); // Will store { id, name, slug }
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
            const orgPromise = api.get(`/organizations/${slug}`); // This should return { id, name, slug }
            const servicesPromise = api.get(`/organizations/${slug}/services`);
            const incidentsPromise = api.get(`/organizations/${slug}/incidents`);

            const [orgResponse, servicesResponse, incidentsResponse] = await Promise.all([
                orgPromise,
                servicesPromise,
                incidentsPromise
            ]);
            
            // IMPORTANT: Ensure orgResponse.data contains the 'id' of the organization
            if (orgResponse.data && orgResponse.data.id) {
                setOrganization(orgResponse.data);
            } else {
                // Fallback if org details (especially ID) are not fetched
                setOrganization({ name: slug, slug: slug, id: null }); 
                console.warn("Organization details (especially ID) not fetched for slug:", slug);
            }
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
            setOrganization({ name: slug, slug: slug, id: null });
            setServices([]);
            setIncidents([]);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Effect for joining the organization-specific room via socket
    useEffect(() => {
        if (isConnected && socket && organization && organization.id) {
            const roomToJoin = `organization-${organization.id}`;
            console.log(`[PublicStatusPage] Attempting to join room: ${roomToJoin}`);
            socket.emit('joinPublicRoom', organization.id); // Send org ID to server
        } else {
            if (isConnected && socket && organization && !organization.id) {
                console.warn('[PublicStatusPage] Socket connected, but organization ID is missing. Cannot join room.');
            }
        }
    }, [isConnected, socket, organization]);


    // Socket event listeners for real-time updates
    useEffect(() => {
        if (isConnected && socket && organization && organization.id) {
            console.log(`[PublicStatusPage] Socket connected, setting up data listeners for org ID: ${organization.id}`);

            const handleServiceCreated = (newService) => {
                if (newService && newService.organization_id === organization.id) {
                    console.log('[PublicStatusPage] Socket event: serviceCreated', newService);
                    setServices(prevServices => {
                        if (prevServices.find(s => s.id === newService.id)) return prevServices;
                        return [newService, ...prevServices];
                    });
                }
            };
            const handleServiceUpdated = (updatedService) => {
                 if (updatedService && updatedService.organization_id === organization.id) {
                    console.log('[PublicStatusPage] Socket event: serviceUpdated', updatedService);
                    setServices(prevServices => 
                        prevServices.map(s => s.id === updatedService.id ? updatedService : s)
                    );
                }
            };
            const handleServiceDeleted = (deletedData) => {
                if (deletedData && deletedData.organization_id === organization.id) {
                    console.log('[PublicStatusPage] Socket event: serviceDeleted', deletedData);
                    setServices(prevServices => prevServices.filter(s => s.id !== deletedData.id));
                }
            };
            const handleIncidentCreated = (newIncident) => {
                 if (newIncident && newIncident.organization_id === organization.id) {
                    console.log('[PublicStatusPage] Socket event: incidentCreated', newIncident);
                    setIncidents(prevIncidents => {
                         if (prevIncidents.find(i => i.id === newIncident.id)) return prevIncidents;
                         return [newIncident, ...prevIncidents];
                    });
                }
            };
            const handleIncidentUpdated = (updatedIncident) => {
                if (updatedIncident && updatedIncident.organization_id === organization.id) {
                    console.log('[PublicStatusPage] Socket event: incidentUpdated', updatedIncident);
                    setIncidents(prevIncidents =>
                        prevIncidents.map(inc => inc.id === updatedIncident.id ? updatedIncident : inc)
                    );
                }
            };
            const handleIncidentDeleted = (deletedData) => {
                 if (deletedData && deletedData.organization_id === organization.id) {
                    console.log('[PublicStatusPage] Socket event: incidentDeleted', deletedData);
                    setIncidents(prevIncidents => prevIncidents.filter(inc => inc.id !== deletedData.id));
                }
            };

            socket.on('serviceCreated', handleServiceCreated);
            socket.on('serviceUpdated', handleServiceUpdated);
            socket.on('serviceDeleted', handleServiceDeleted);
            socket.on('incidentCreated', handleIncidentCreated);
            socket.on('incidentUpdated', handleIncidentUpdated);
            socket.on('incidentDeleted', handleIncidentDeleted);

            return () => {
                console.log(`[PublicStatusPage] Cleaning up socket listeners for org ID: ${organization.id}`);
                socket.off('serviceCreated', handleServiceCreated);
                socket.off('serviceUpdated', handleServiceUpdated);
                socket.off('serviceDeleted', handleServiceDeleted);
                socket.off('incidentCreated', handleIncidentCreated);
                socket.off('incidentUpdated', handleIncidentUpdated);
                socket.off('incidentDeleted', handleIncidentDeleted);
            };
        } else {
             console.log('[PublicStatusPage] Socket not connected, or org data (with ID) not loaded. Listeners not set.');
        }
    }, [isConnected, socket, organization]);


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

    if (loading && services.length === 0 && incidents.length === 0) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                    <CircularProgress size={60} />
                    <Typography variant="h6" sx={{ ml: 2 }}>Loading Status...</Typography>
                </Box>
            </Container>
        );
    }

    if (error && services.length === 0 && incidents.length === 0) { 
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
                    Page loaded: {new Date().toLocaleString()}. Updates should appear in real-time.
                </Typography>
            </Paper>

            {loading && <Box sx={{textAlign: 'center', my: 2}}><CircularProgress size={24} /><Typography variant="caption" sx={{ml:1}}>Checking for updates...</Typography></Box>}
            {error && !loading && <Alert severity="warning" sx={{mb: 2}}>Could not fetch initial data: {error}. Displaying cached or partial data if available.</Alert>}

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
                 !loading && <Typography>No services configured for this status page.</Typography>
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