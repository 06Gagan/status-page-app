// status-page-app/client/src/pages/Profile.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../config/api';
import {
    Container, Box, Typography, TextField, Button,
    CircularProgress, Alert, Grid, Paper, List, ListItem,
    ListItemText, Divider, Link
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Link as RouterLink } from 'react-router-dom';

function Profile() {
    const { user, token, loading: authLoading, updateProfileContext } = useAuth();

    const [profileData, setProfileData] = useState(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const [loadingProfile, setLoadingProfile] = useState(true);
    const [updateError, setUpdateError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [updateSuccess, setUpdateSuccess] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const fetchFullProfileData = useCallback(async () => {
        if (!token) {
            setLoadingProfile(false);
            return;
        }
        setLoadingProfile(true);
        setUpdateError(''); 
        try {
            const response = await api.get('/auth/profile');
            setProfileData(response.data);
            setName(response.data.username || '');
            setEmail(response.data.email || '');
        } catch (error) {
            console.error("Error fetching full profile data:", error);
            setUpdateError(error.response?.data?.message || "Failed to load profile data.");
        } finally {
            setLoadingProfile(false);
        }
    }, [token]);

    useEffect(() => {
        if (!authLoading) { // Wait for auth context to finish initial loading
            if (user && token) { // Check if user and token are available
                // Set initial form values from context if available, then fetch full profile
                setName(user.username || '');
                setEmail(user.email || '');
                fetchFullProfileData(); 
            } else {
                setUpdateError("Not authenticated. Please log in.");
                setLoadingProfile(false);
            }
        }
    }, [user, token, authLoading, fetchFullProfileData]);


    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setUpdateError('');
        setUpdateSuccess('');
        setIsUpdatingProfile(true);
        try {
            const updatedUserData = await updateProfileContext({ username: name, email });
            // updateProfileContext should update the global user state.
            // We can also update local form fields if the returned object is consistent.
            if (updatedUserData) {
                setName(updatedUserData.username || name);
                setEmail(updatedUserData.email || email);
            }
            setUpdateSuccess('Profile updated successfully!');
        } catch (err) {
            setUpdateError(err.message || 'Failed to update profile.');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');
        if (newPassword !== confirmNewPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError("New password must be at least 6 characters long.");
            return;
        }
        setIsUpdatingPassword(true);
        try {
            await api.put('/auth/profile/password', 
                { currentPassword, newPassword }
            );
            setPasswordSuccess('Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err) {
            setPasswordError(err.response?.data?.message || err.message || 'Failed to update password.');
        } finally {
            setIsUpdatingPassword(false);
        }
    };
    
    if (authLoading || loadingProfile) {
        return (
            <Container>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    if (!profileData && !loadingProfile) { 
        return (
            <Container>
                <Alert severity="error">{updateError || "Could not load profile. Please try again."}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>My Profile</Typography>
            <Grid container spacing={4}>
                <Grid item xs={12} md={7}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Profile Information</Typography>
                        {updateError && !updateSuccess && <Alert severity="error" sx={{ mb: 2 }}>{updateError}</Alert>}
                        {updateSuccess && <Alert severity="success" sx={{ mb: 2 }}>{updateSuccess}</Alert>}
                        <Box component="form" onSubmit={handleProfileUpdate} noValidate>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="name"
                                label="Name"
                                name="name"
                                autoComplete="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isUpdatingProfile}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="email"
                                label="Email Address"
                                name="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isUpdatingProfile}
                            />
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                                disabled={isUpdatingProfile}
                            >
                                {isUpdatingProfile ? <CircularProgress size={24} /> : 'Update Profile'}
                            </Button>
                        </Box>
                        <Divider sx={{ my: 3 }} />
                        <Typography variant="h6" gutterBottom>Change Password</Typography>
                        {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}
                        {passwordSuccess && <Alert severity="success" sx={{ mb: 2 }}>{passwordSuccess}</Alert>}
                        <Box component="form" onSubmit={handlePasswordUpdate} noValidate>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="currentPassword"
                                label="Current Password"
                                type="password"
                                id="currentPassword"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                disabled={isUpdatingPassword}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="newPassword"
                                label="New Password"
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={isUpdatingPassword}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="confirmNewPassword"
                                label="Confirm New Password"
                                type="password"
                                id="confirmNewPassword"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                disabled={isUpdatingPassword}
                            />
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                                disabled={isUpdatingPassword}
                            >
                                {isUpdatingPassword ? <CircularProgress size={24} /> : 'Change Password'}
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6">My Teams</Typography>
                            {user?.role === 'admin' && 
                                <Button component={RouterLink} to="/teams" size="small" startIcon={<AddCircleOutlineIcon />}>Manage Teams</Button>
                            }
                        </Box>
                        {profileData?.teams && profileData.teams.length > 0 ? (
                            <List dense>
                                {profileData.teams.map(team => (
                                    <ListItem key={team.id} disablePadding>
                                        <ListItemText primary={team.name} secondary={`Role: ${team.role || 'Member'}`} />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Typography color="text.secondary">You are not part of any teams yet.</Typography>
                        )}
                    </Paper>
                    <Paper sx={{ p: 3 }}>
                         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6">My Organization's Services</Typography>
                             {(user?.role === 'admin' || user?.role === 'editor') && 
                                <Button component={RouterLink} to="/services" size="small" startIcon={<AddCircleOutlineIcon />}>Manage Services</Button>
                            }
                        </Box>
                        {profileData?.services && profileData.services.length > 0 ? (
                            <List dense>
                                {profileData.services.slice(0, 5).map(service => ( 
                                    <ListItem key={service.id} disablePadding>
                                        <ListItemText primary={service.name} secondary={`Status: ${service.status}`} />
                                    </ListItem>
                                ))}
                                {profileData.services.length > 5 && <ListItemText secondary="...and more." />}
                            </List>
                        ) : (
                            <Typography color="text.secondary">No services configured for your organization.</Typography>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}

export default Profile;