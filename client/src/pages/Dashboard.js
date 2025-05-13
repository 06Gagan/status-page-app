import React, { useEffect, useState, useCallback } from 'react';
import { 
    Box, Typography, Grid, Paper, CircularProgress, Alert, Card, CardContent, Chip, Button 
} from '@mui/material';
import api from '../config/api';
import { useSocket } from '../contexts/SocketContext';
import { Link as RouterLink } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';

function Dashboard() {
    const [summary, setSummary] = useState({ services: [], incidents: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { socket, isConnected } = useSocket();

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [servicesResponse, incidentsResponse] = await Promise.all([
                api.get('/services').catch(e => { console.error("Service fetch error:", e); return null; }), // Catch individual promise errors
                api.get('/incidents').catch(e => { console.error("Incident fetch error:", e); return null; })  // Catch individual promise errors
            ]);

            const fetchedServices = (servicesResponse && Array.isArray(servicesResponse.data)) ? servicesResponse.data : [];
            const fetchedIncidents = (incidentsResponse && Array.isArray(incidentsResponse.data)) ? incidentsResponse.data : [];
            
            setSummary({
                services: fetchedServices,
                incidents: fetchedIncidents
            });

        } catch (err) { // This catch is for errors not caught by individual promise catches or other sync errors
            console.error("🔴 [Dashboard] Error in fetchData's Promise.all or subsequent logic:", err);
            setError('Failed to fetch dashboard data. Please try again.');
            setSummary({ services: [], incidents: [] }); 
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (isConnected && socket) {
            const handleUpdate = (dataType, data) => {
                console.log(`[Socket Dashboard] ${dataType} update:`, data);
                fetchData(); // Refetch all data for simplicity
            };

            socket.on('incidentCreated', (data) => handleUpdate('IncidentCreated', data));
            socket.on('incidentUpdated', (data) => handleUpdate('IncidentUpdated', data));
            socket.on('incidentDeleted', () => fetchData()); // Just refetch
            socket.on('serviceStatusChanged', (data) => handleUpdate('ServiceStatusChanged', data));
            socket.on('serviceCreated', (data) => handleUpdate('ServiceCreated', data));
            socket.on('serviceDeleted', () => fetchData());
            
            return () => {
                if (socket) {
                    socket.off('incidentCreated');
                    socket.off('incidentUpdated');
                    socket.off('incidentDeleted');
                    socket.off('serviceStatusChanged');
                    socket.off('serviceCreated');
                    socket.off('serviceDeleted');
                }
            };
        } else {
            // console.log('🟡 [Dashboard] Socket not connected, skipping event listeners');
        }
    }, [isConnected, socket, fetchData]);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
    }

    // These arrays are now guaranteed to be arrays due to initialization and fetchData logic
    const { services: servicesArray, incidents: incidentsArray } = summary;

    const operationalServices = servicesArray.filter(s => s.status === 'operational').length;
    const issuesExist = servicesArray.some(s => s.status !== 'operational') || incidentsArray.some(i => i.status !== 'resolved' && i.status !== 'completed');
    const ongoingIncidents = incidentsArray.filter(i => i.status !== 'resolved' && i.status !== 'completed');

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                System Status Overview
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card sx={{ backgroundColor: issuesExist ? 'warning.light' : 'success.light', height: '100%', color: issuesExist? 'warning.contrastText' : 'success.contrastText' }}>
                        <CardContent>
                            <Typography variant="h5" component="div" gutterBottom>
                                {issuesExist ? '⚠️ Some Systems Reporting Issues' : '✅ All Systems Operational'}
                            </Typography>
                            <Typography variant="body1">
                                {operationalServices} of {servicesArray.length} services are operational.
                            </Typography>
                            {ongoingIncidents.length > 0 && (
                                <Typography variant="body2" sx={{mt:1, color: 'error.main' }}>
                                    {ongoingIncidents.length} ongoing incident(s).
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>Quick Links</Typography>
                        <Button component={RouterLink} to="/services" sx={{ mr: 1, mb:1 }} variant="outlined">View All Services</Button>
                        <Button component={RouterLink} to="/incidents" sx={{ mr: 1, mb:1 }} variant="outlined">View All Incidents</Button>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
                        Current Service Status
                    </Typography>
                    {servicesArray.length > 0 ? (
                        <Grid container spacing={2}>
                            {servicesArray.slice(0, 6).map(service => ( 
                                <Grid item xs={12} sm={6} md={4} key={service.id}>
                                    <Paper elevation={1} sx={{ p: 2, textAlign:'center' }}>
                                        <Typography variant="subtitle1">{service.name || 'Unnamed Service'}</Typography>
                                        <Chip 
                                            label={service.status ? service.status.replace(/_/g, ' ') : 'Unknown'} 
                                            color={service.status === 'operational' ? 'success' : (service.status === 'under_maintenance' ? 'info' : 'warning')}
                                            size="small"
                                        />
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Typography>No services configured yet.</Typography>
                    )}
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
                        Recent Incidents ({ongoingIncidents.length} Ongoing)
                    </Typography>
                    {incidentsArray.length > 0 ? (
                        <Grid container spacing={2}>
                        {incidentsArray.slice(0, 3).map(incident => ( 
                            <Grid item xs={12} md={4} key={incident.id}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" component={RouterLink} to={`/incidents`} sx={{textDecoration:'none', color:'inherit'}}>{incident.title || 'Untitled Incident'}</Typography>
                                        <Chip 
                                            label={incident.status ? incident.status.replace(/_/g, ' ') : 'Unknown'} 
                                            color={incident.status === 'resolved' || incident.status === 'completed' ? 'success' : 'error'} 
                                            size="small" sx={{my:1}} 
                                        />
                                        <Typography variant="body2" color="text.secondary">
                                            {incident.created_at ? formatDistanceToNow(parseISO(incident.created_at), { addSuffix: true }) : 'Date unknown'}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                        </Grid>
                    ) : (
                        <Typography>No incidents reported.</Typography>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
}

export default Dashboard;
