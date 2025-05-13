import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../config/api';
import {
    Container, Typography, Box, List, ListItem, ListItemText,
    CircularProgress, Alert, Button, TextField, Dialog, DialogActions,
    DialogContent, DialogContentText, DialogTitle, IconButton,
    Select, MenuItem, FormControl, InputLabel, Paper,
    Chip, Tooltip
} from '@mui/material';
// import Grid from '@mui/material/Grid'; // Was unused
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CircleIcon from '@mui/icons-material/Circle';

const serviceStatusOptions = [
    { value: 'operational', label: 'Operational', color: 'success' },
    { value: 'degraded_performance', label: 'Degraded Performance', color: 'warning' },
    { value: 'partial_outage', label: 'Partial Outage', color: 'warning' },
    { value: 'major_outage', label: 'Major Outage', color: 'error' },
    { value: 'under_maintenance', label: 'Under Maintenance', color: 'info' },
];

const getStatusColor = (statusValue) => {
    const option = serviceStatusOptions.find(opt => opt.value === statusValue);
    return option ? option.color : 'default';
};

function Services() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { token, user, isAuthenticated, loading: authLoading } = useAuth();

    const [openCreateEditDialog, setOpenCreateEditDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentService, setCurrentService] = useState(null);
    const [serviceName, setServiceName] = useState('');
    const [serviceDescription, setServiceDescription] = useState('');
    const [serviceStatus, setServiceStatus] = useState('operational');
    const [serviceOrder, setServiceOrder] = useState(0);
    const [dialogError, setDialogError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);


    const canManage = user?.role === 'admin' || user?.role === 'editor';
    const canDelete = user?.role === 'admin';

    const fetchServices = useCallback(async () => {
        if (!token || !isAuthenticated) return;
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/services', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setServices(response.data || []);
        } catch (err) {
            console.error("Error fetching services:", err);
            setError(err.response?.data?.message || err.message || 'Failed to fetch services');
            setServices([]);
        } finally {
            setLoading(false);
        }
    }, [token, isAuthenticated]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchServices();
        } else if (!authLoading && !isAuthenticated) {
            setError("Not authenticated. Please log in.");
            setLoading(false);
        }
    }, [authLoading, isAuthenticated, fetchServices]);

    const handleOpenCreateDialog = () => {
        setIsEditing(false);
        setCurrentService(null);
        setServiceName('');
        setServiceDescription('');
        setServiceStatus('operational');
        setServiceOrder(0);
        setDialogError('');
        setIsSubmitting(false);
        setOpenCreateEditDialog(true);
    };

    const handleOpenEditDialog = (service) => {
        setIsEditing(true);
        setCurrentService(service);
        setServiceName(service.name);
        setServiceDescription(service.description || '');
        setServiceStatus(service.status);
        setServiceOrder(service.order || 0);
        setDialogError('');
        setIsSubmitting(false);
        setOpenCreateEditDialog(true);
    };

    const handleCloseCreateEditDialog = () => {
        if (isSubmitting) return;
        setOpenCreateEditDialog(false);
    };

    const handleSubmitService = async () => {
        if (isSubmitting || !canManage) return;
        if (!serviceName.trim()) {
            setDialogError('Service name cannot be empty.');
            return;
        }
        setDialogError('');
        setIsSubmitting(true);

        const payload = {
            name: serviceName.trim(),
            description: serviceDescription.trim(),
            status: serviceStatus,
            order: parseInt(serviceOrder, 10) || 0,
        };

        try {
            if (isEditing && currentService) {
                await api.put(`/services/${currentService.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await api.post('/services', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchServices();
            handleCloseCreateEditDialog();
        } catch (err) {
            console.error("Error submitting service:", err);
            setDialogError(err.response?.data?.message || err.message || 'Failed to save service.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (serviceId, newStatus) => {
        if (!canManage) return;
        const originalServices = [...services];
        setServices(prevServices =>
            prevServices.map(s => s.id === serviceId ? { ...s, status: newStatus } : s)
        );

        try {
            await api.put(`/services/${serviceId}`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Error updating service status:", err);
            setError(`Failed to update status for service ${serviceId}.`);
            setServices(originalServices);
        }
    };

    const handleOpenDeleteDialog = (service) => {
        setServiceToDelete(service);
        setOpenDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        if (isDeleting) return;
        setOpenDeleteDialog(false);
        setServiceToDelete(null);
    };

    const handleDeleteService = async () => {
        if (!serviceToDelete || !canDelete || isDeleting) return;
        setIsDeleting(true);
        try {
            await api.delete(`/services/${serviceToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchServices();
            handleCloseDeleteDialog();
        } catch (err) {
            console.error("Error deleting service:", err);
            setError(err.response?.data?.message || `Failed to delete service ${serviceToDelete.name}.`);
        } finally {
            setIsDeleting(false);
        }
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Manage Services
                </Typography>

                {canManage && (
                    <Button
                        variant="contained"
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={handleOpenCreateDialog}
                        sx={{ mb: 2 }}
                    >
                        Create New Service
                    </Button>
                )}

                {loading && <CircularProgress />}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {!loading && !error && services.length === 0 && isAuthenticated && (
                    <Typography>No services found for your organization.</Typography>
                )}
                {!loading && !error && services.length > 0 && isAuthenticated && (
                    <Paper elevation={2}>
                        <List>
                            {services.map((service) => (
                                <ListItem key={service.id} divider>
                                    <ListItemText
                                        primary={service.name}
                                        secondary={
                                            <>
                                                <Typography component="span" variant="body2" color="text.primary">
                                                    {service.description || "No description"}
                                                </Typography>
                                                <br />
                                                <Chip
                                                    icon={<CircleIcon sx={{ fontSize: 12 }} />}
                                                    label={serviceStatusOptions.find(s => s.value === service.status)?.label || service.status}
                                                    color={getStatusColor(service.status)}
                                                    size="small"
                                                    sx={{ mt: 0.5, mr: 1 }}
                                                />
                                                 Order: {service.order || 0}
                                            </>
                                        }
                                    />
                                    {canManage && (
                                        <FormControl size="small" sx={{ m: 1, minWidth: 180, mr: 2 }} variant="outlined">
                                            <InputLabel id={`status-select-label-${service.id}`}>Status</InputLabel>
                                            <Select
                                                labelId={`status-select-label-${service.id}`}
                                                value={service.status}
                                                label="Status"
                                                onChange={(e) => handleStatusChange(service.id, e.target.value)}
                                            >
                                                {serviceStatusOptions.map(option => (
                                                    <MenuItem key={option.value} value={option.value}>
                                                        <CircleIcon sx={{ fontSize: 12, mr: 1, color: `${option.color}.main` }} />
                                                        {option.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                    {canManage && (
                                        <Tooltip title="Edit Service">
                                            <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEditDialog(service)} sx={{mr:1}}>
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {canDelete && (
                                         <Tooltip title="Delete Service">
                                            <IconButton edge="end" aria-label="delete" onClick={() => handleOpenDeleteDialog(service)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}
            </Box>

            {canManage && (
                <Dialog open={openCreateEditDialog} onClose={handleCloseCreateEditDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>{isEditing ? 'Edit Service' : 'Create New Service'}</DialogTitle>
                    <DialogContent>
                        {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
                        <TextField
                            autoFocus
                            margin="dense"
                            id="serviceName"
                            label="Service Name"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={serviceName}
                            onChange={(e) => setServiceName(e.target.value)}
                            disabled={isSubmitting}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            margin="dense"
                            id="serviceDescription"
                            label="Description (Optional)"
                            type="text"
                            fullWidth
                            multiline
                            rows={3}
                            variant="outlined"
                            value={serviceDescription}
                            onChange={(e) => setServiceDescription(e.target.value)}
                            disabled={isSubmitting}
                            sx={{ mb: 2 }}
                        />
                        <FormControl fullWidth margin="dense" sx={{ mb: 2 }} disabled={isSubmitting}>
                            <InputLabel id="service-status-label">Status</InputLabel>
                            <Select
                                labelId="service-status-label"
                                id="serviceStatus"
                                value={serviceStatus}
                                label="Status"
                                onChange={(e) => setServiceStatus(e.target.value)}
                            >
                                {serviceStatusOptions.map(option => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            margin="dense"
                            id="serviceOrder"
                            label="Display Order (Optional, e.g., 0, 1, 2)"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={serviceOrder}
                            onChange={(e) => setServiceOrder(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseCreateEditDialog} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleSubmitService} disabled={isSubmitting} variant="contained">
                            {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Save Changes' : 'Create Service')}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            {canDelete && serviceToDelete && (
                 <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
                    <DialogTitle>Confirm Delete</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to delete the service: <strong>{serviceToDelete.name}</strong>? This action cannot be undone.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>Cancel</Button>
                        <Button onClick={handleDeleteService} disabled={isDeleting} color="error" variant="contained">
                             {isDeleting ? <CircularProgress size={24} /> : "Delete"}
                        </Button>
                    </DialogActions>
                 </Dialog>
            )}

        </Container>
    );
}

export default Services;