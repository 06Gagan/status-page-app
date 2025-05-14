// status-page-app/client/src/pages/Dashboard.js
import React, { useEffect, useState, useCallback } from 'react';
import { 
    Box, Typography, Grid, CircularProgress, Alert, Card, CardContent, 
    Chip, Button, useTheme, CardHeader, Divider 
} from '@mui/material';
import api from '../config/api'; 
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext'; 
import { Link as RouterLink } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

function Dashboard() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [summary, setSummary] = useState({ services: [], incidents: [] });
    const [loading, setLoading] = useState(true); 
    const [error, setError] = useState(null);
    const { socket, isConnected } = useSocket();
    const theme = useTheme();

    const fetchData = useCallback(async () => {
        if (authLoading || !isAuthenticated) { 
            if (!isAuthenticated && !authLoading) setError("Not authenticated. Please log in.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [servicesResponse, incidentsResponse] = await Promise.all([
                api.get('/services').catch(e => { console.error("Service fetch error:", e); return { data: [] }; }), 
                api.get('/incidents').catch(e => { console.error("Incident fetch error:", e); return { data: [] }; })
            ]);
            
            setSummary({
                services: servicesResponse.data || [],
                incidents: incidentsResponse.data || []
            });

        } catch (err) { 
            console.error("🔴 [Dashboard] Error in fetchData:", err);
            setError(err.response?.data?.message || 'Failed to fetch dashboard data. Please try again.');
            setSummary({ services: [], incidents: [] }); 
        } finally {
            setLoading(false);
        }
    }, [authLoading, isAuthenticated]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (isConnected && socket && isAuthenticated) { 
            const handleUpdate = (dataType, data) => {
                console.log(`[Dashboard.js Socket] ${dataType} update:`, data);
                fetchData(); 
            };

            socket.on('incidentCreated', (data) => handleUpdate('IncidentCreated', data));
            socket.on('incidentUpdated', (data) => handleUpdate('IncidentUpdated', data));
            socket.on('incidentDeleted', (data) => handleUpdate('IncidentDeleted', data));
            socket.on('serviceCreated', (data) => handleUpdate('ServiceCreated', data));
            socket.on('serviceUpdated', (data) => handleUpdate('ServiceUpdated', data));
            socket.on('serviceDeleted', (data) => handleUpdate('ServiceDeleted', data));
            
            return () => {
                if (socket) {
                    socket.off('incidentCreated');
                    socket.off('incidentUpdated');
                    socket.off('incidentDeleted');
                    socket.off('serviceCreated');
                    socket.off('serviceUpdated');
                    socket.off('serviceDeleted');
                }
            };
        }
    }, [isConnected, socket, fetchData, isAuthenticated]);

    if (authLoading || loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert 
                severity="error" 
                sx={{ 
                    m: 3, 
                    borderRadius: 2, 
                    boxShadow: theme.shadows[1] 
                }}
            >
                {error}
            </Alert>
        );
    }
    
    const { services: servicesArray, incidents: incidentsArray } = summary;

    const operationalServices = servicesArray.filter(s => s.status === 'operational').length;
    const issuesExist = servicesArray.some(s => s.status !== 'operational') || incidentsArray.some(i => i.status !== 'resolved' && i.status !== 'completed');
    const ongoingIncidents = incidentsArray.filter(i => i.status !== 'resolved' && i.status !== 'completed');

    // Get status icon based on system status
    const getStatusIcon = () => {
        if (!issuesExist) {
            return <CheckCircleOutlineIcon fontSize="large" sx={{ color: theme.palette.success.main }} />;
        } else if (ongoingIncidents.length > 0) {
            return <ErrorOutlineIcon fontSize="large" sx={{ color: theme.palette.error.main }} />;
        } else {
            return <WarningAmberIcon fontSize="large" sx={{ color: theme.palette.warning.main }} />;
        }
    };

    // Get status color based on service status
    const getServiceStatusColor = (status) => {
        switch (status) {
            case 'operational': return 'success';
            case 'under_maintenance': return 'info';
            case 'degraded_performance': return 'warning';
            case 'partial_outage': return 'warning';
            case 'major_outage': return 'error';
            default: return 'default';
        }
    };

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h4" fontWeight={600} gutterBottom>
                    System Overview
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Monitor your services and incidents in real-time
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Status Overview Card */}
                <Grid item xs={12} md={8}>
                    <Card 
                        elevation={0} 
                        sx={{ 
                            height: '100%',
                            borderWidth: 2,
                            borderStyle: 'solid',
                            borderColor: issuesExist 
                                ? (ongoingIncidents.length > 0 ? theme.palette.error.light : theme.palette.warning.light) 
                                : theme.palette.success.light
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                {getStatusIcon()}
                                <Typography variant="h5" component="div" fontWeight={600} sx={{ ml: 1 }}>
                                    {issuesExist 
                                        ? (ongoingIncidents.length > 0 ? 'System Issues Detected' : 'Minor Issues Reported') 
                                        : 'All Systems Operational'}
                                </Typography>
                            </Box>
                            
                            <Box sx={{ my: 2 }}>
                                <Typography variant="body1">
                                    <strong>{operationalServices}</strong> of <strong>{servicesArray.length}</strong> services are operational.
                                </Typography>
                                {ongoingIncidents.length > 0 && (
                                    <Typography 
                                        variant="body1" 
                                        sx={{ 
                                            mt: 1,
                                            color: theme.palette.error.main,
                                            fontWeight: 500
                                        }}
                                    >
                                        {ongoingIncidents.length} active {ongoingIncidents.length === 1 ? 'incident' : 'incidents'} requiring attention
                                    </Typography>
                                )}
                            </Box>
                            
                            <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Button 
                                    component={RouterLink} 
                                    to="/services" 
                                    variant="outlined"
                                    size="small"
                                >
                                    Services
                                </Button>
                                <Button 
                                    component={RouterLink} 
                                    to="/incidents" 
                                    variant="outlined"
                                    size="small"
                                    color={ongoingIncidents.length > 0 ? "error" : "primary"}
                                >
                                    {ongoingIncidents.length > 0 ? `View ${ongoingIncidents.length} Incidents` : "Incidents"}
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Quick Stats Card */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }} elevation={0}>
                        <CardHeader title="Quick Statistics" />
                        <Divider />
                        <CardContent sx={{ p: 2 }}>
                            <Box sx={{ py: 1.5, px: 2, borderRadius: 2, bgcolor: theme.palette.background.default, mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">Total Services</Typography>
                                <Typography variant="h5" fontWeight={600}>{servicesArray.length}</Typography>
                            </Box>
                            <Box sx={{ py: 1.5, px: 2, borderRadius: 2, bgcolor: theme.palette.background.default }}>
                                <Typography variant="subtitle2" color="text.secondary">Recent Incidents</Typography>
                                <Typography variant="h5" fontWeight={600}>{incidentsArray.length}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Service Status Section */}
                <Grid item xs={12}>
                    <Box sx={{ mt: 2, mb: 3 }}>
                        <Typography variant="h5" fontWeight={600} gutterBottom>
                            Service Status
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Current operational status of your services
                        </Typography>
                    </Box>

                    {servicesArray.length > 0 ? (
                        <Grid container spacing={2}>
                            {servicesArray.slice(0, 6).map(service => ( 
                                <Grid item xs={12} sm={6} md={4} key={service.id}>
                                    <Card elevation={0} sx={{ height: '100%' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Typography variant="h6" fontWeight={500}>
                                                    {service.name || 'Unnamed Service'}
                                                </Typography>
                                                <Chip 
                                                    label={service.status ? service.status.replace(/_/g, ' ') : 'Unknown'} 
                                                    color={getServiceStatusColor(service.status)}
                                                    size="small"
                                                    sx={{ textTransform: 'capitalize' }}
                                                />
                                            </Box>
                                            {service.description && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                    {service.description}
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Card elevation={0} sx={{ p: 3, textAlign: 'center', bgcolor: theme.palette.background.default }}>
                            <Typography variant="body1">No services configured yet.</Typography>
                            <Button 
                                component={RouterLink} 
                                to="/services" 
                                variant="outlined" 
                                sx={{ mt: 2 }}
                            >
                                Add Services
                            </Button>
                        </Card>
                    )}
                </Grid>

                {/* Recent Incidents Section */}
                <Grid item xs={12}>
                    <Box sx={{ mt: 4, mb: 3 }}>
                        <Typography variant="h5" fontWeight={600} gutterBottom>
                            Recent Incidents {ongoingIncidents.length > 0 && `(${ongoingIncidents.length} Active)`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Latest incidents affecting your services
                        </Typography>
                    </Box>

                    {incidentsArray.length > 0 ? (
                        <Grid container spacing={2}>
                            {incidentsArray.slice(0, 3).map(incident => ( 
                                <Grid item xs={12} md={4} key={incident.id}>
                                    <Card elevation={0} sx={{ height: '100%' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Typography 
                                                variant="h6" 
                                                component={RouterLink} 
                                                to={`/incidents`} 
                                                sx={{
                                                    textDecoration: 'none', 
                                                    color: theme.palette.text.primary,
                                                    display: 'block',
                                                    mb: 2,
                                                    '&:hover': {
                                                        color: theme.palette.primary.main,
                                                    }
                                                }}
                                            >
                                                {incident.title || 'Untitled Incident'}
                                            </Typography>
                                            
                                            <Chip 
                                                label={incident.status ? incident.status.replace(/_/g, ' ') : 'Unknown'} 
                                                color={(incident.status === 'resolved' || incident.status === 'completed') ? 'success' : 'error'} 
                                                size="small" 
                                                sx={{ mb: 2, textTransform: 'capitalize' }} 
                                            />
                                            
                                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                                                <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    {incident.created_at ? formatDistanceToNow(parseISO(incident.created_at), { addSuffix: true }) : 'Date unknown'}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Card elevation={0} sx={{ p: 3, textAlign: 'center', bgcolor: theme.palette.background.default }}>
                            <Typography variant="body1">No incidents reported.</Typography>
                            <Button 
                                component={RouterLink} 
                                to="/incidents" 
                                variant="outlined" 
                                sx={{ mt: 2 }}
                            >
                                View Incidents
                            </Button>
                        </Card>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
}

export default Dashboard;