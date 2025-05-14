// status-page-app/client/src/pages/Services.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../config/api';
import {
    Typography, Box, CircularProgress, Alert, Button, TextField, Dialog, DialogActions,
    DialogContent, DialogContentText, DialogTitle, IconButton,
    Select, MenuItem, FormControl, InputLabel,
    Chip, Tooltip, useTheme, Card, CardContent, Grid 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
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
    const theme = useTheme();

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
        if (!token || !isAuthenticated) {
            if (!authLoading) setError("Not authenticated. Please log in.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/services');
            setServices(response.data || []);
        } catch (err) {
            console.error("Error fetching services:", err);
            setError(err.response?.data?.message || err.message || 'Failed to fetch services');
            setServices([]);
        } finally {
            setLoading(false);
        }
    }, [token, isAuthenticated, authLoading]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchServices();
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
                await api.put(`/services/${currentService.id}`, payload);
            } else {
                await api.post('/services', payload);
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
            prevServices.map(s => s.id === serviceId ? { ...s, status: newStatus, updated_at: new Date().toISOString() } : s)
        );

        try {
            await api.put(`/services/${serviceId}`, { status: newStatus });
            fetchServices(); 
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
            await api.delete(`/services/${serviceToDelete.id}`);
            fetchServices(); 
            handleCloseDeleteDialog();
        } catch (err) {
            console.error("Error deleting service:", err);
            setError(err.response?.data?.message || `Failed to delete service ${serviceToDelete.name}.`);
        } finally {
            setIsDeleting(false);
        }
    };

    if (authLoading && loading) { 
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight={600} gutterBottom>
                        Services
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage and monitor your service components
                    </Typography>
                </Box>

                {canManage && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleOpenCreateDialog}
                        sx={{ height: 'fit-content' }}
                    >
                        Add Service
                    </Button>
                )}
            </Box>

            {error && (
                <Alert 
                    severity="error" 
                    sx={{ mb: 3, borderRadius: 2 }}
                >
                    {error}
                </Alert>
            )}

            {!loading && services.length === 0 && isAuthenticated && (
                <Card elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: theme.palette.background.default }}>
                    <Typography variant="h6" gutterBottom>No services found</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        Add your first service to start monitoring its status
                    </Typography>
                    {canManage && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpenCreateDialog}
                        >
                            Create Service
                        </Button>
                    )}
                </Card>
            )}

            {services.length > 0 && isAuthenticated && (
                <Grid container spacing={2}>
                    {services.map((service) => (
                        <Grid item xs={12} key={service.id}>
                            <Card elevation={0}>
                                <CardContent sx={{ p: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box>
                                            <Typography variant="h6" fontWeight={500}>
                                                {service.name}
                                            </Typography>
                                            {service.description && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                    {service.description}
                                                </Typography>
                                            )}
                                            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Chip
                                                    icon={<CircleIcon sx={{ fontSize: 12 }} />}
                                                    label={serviceStatusOptions.find(s => s.value === service.status)?.label || service.status}
                                                    color={getStatusColor(service.status)}
                                                    size="small"
                                                    sx={{ textTransform: 'capitalize' }}
                                                />
                                                <Typography variant="body2" color="text.secondary">
                                                    Order: {service.order || 0}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {canManage && (
                                                <FormControl size="small" sx={{ minWidth: 180 }} variant="outlined">
                                                    <InputLabel id={`status-select-label-${service.id}`}>Status</InputLabel>
                                                    <Select
                                                        labelId={`status-select-label-${service.id}`}
                                                        value={service.status}
                                                        label="Status"
                                                        onChange={(e) => handleStatusChange(service.id, e.target.value)}
                                                    >
                                                        {serviceStatusOptions.map(option => (
                                                            <MenuItem key={option.value} value={option.value}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                    <CircleIcon sx={{ fontSize: 12, mr: 1, color: `${option.color}.main` }} />
                                                                    {option.label}
                                                                </Box>
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            )}
                                            
                                            {canManage && (
                                                <Tooltip title="Edit service">
                                                    <IconButton 
                                                        onClick={() => handleOpenEditDialog(service)}
                                                        size="small"
                                                        sx={{ color: theme.palette.primary.main }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            
                                            {canDelete && (
                                                <Tooltip title="Delete service">
                                                    <IconButton 
                                                        onClick={() => handleOpenDeleteDialog(service)}
                                                        size="small"
                                                        sx={{ color: theme.palette.error.main }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Create/Edit Dialog */}
            <Dialog
                open={openCreateEditDialog}
                onClose={handleCloseCreateEditDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    elevation: 2,
                    sx: { borderRadius: 3 }
                }}
            >
                <DialogTitle>
                    {isEditing ? 'Edit Service' : 'Create New Service'}
                </DialogTitle>
                <DialogContent>
                    {dialogError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {dialogError}
                        </Alert>
                    )}
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Service Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        required
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        margin="dense"
                        label="Description (optional)"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={serviceDescription}
                        onChange={(e) => setServiceDescription(e.target.value)}
                        multiline
                        rows={2}
                        sx={{ mb: 2 }}
                    />
                    <FormControl fullWidth variant="outlined" margin="dense" sx={{ mb: 2 }}>
                        <InputLabel id="service-status-label">Status</InputLabel>
                        <Select
                            labelId="service-status-label"
                            value={serviceStatus}
                            onChange={(e) => setServiceStatus(e.target.value)}
                            label="Status"
                        >
                            {serviceStatusOptions.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <CircleIcon sx={{ fontSize: 12, mr: 1, color: `${option.color}.main` }} />
                                        {option.label}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        margin="dense"
                        label="Display Order"
                        type="number"
                        fullWidth
                        variant="outlined"
                        value={serviceOrder}
                        onChange={(e) => setServiceOrder(e.target.value)}
                        helperText="Lower numbers appear first (0 is first)"
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button 
                        onClick={handleCloseCreateEditDialog} 
                        color="inherit"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmitService} 
                        variant="contained"
                        disabled={isSubmitting || !serviceName.trim()}
                    >
                        {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    elevation: 2,
                    sx: { borderRadius: 3 }
                }}
            >
                <DialogTitle>
                    Confirm Deletion
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the service <strong>{serviceToDelete?.name}</strong>?
                        This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button 
                        onClick={handleCloseDeleteDialog} 
                        color="inherit"
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleDeleteService} 
                        color="error"
                        variant="contained"
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default Services;