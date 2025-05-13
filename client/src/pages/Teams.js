// status-page-app/client/src/pages/Teams.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../config/api';
import {
    Container, Typography, Box, List, ListItem, ListItemText,
    CircularProgress, Alert, Button, TextField, Dialog, DialogActions,
    DialogContent, DialogTitle, IconButton,
    Select, MenuItem, FormControl, InputLabel, Paper, Grid,
    ListItemSecondaryAction
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';

function Teams() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { token, user, isAuthenticated, loading: authLoading } = useAuth();

    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [createError, setCreateError] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState('');
    const [openMembersDialog, setOpenMembersDialog] = useState(false);

    const [organizationUsers, setOrganizationUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
    const [addMemberError, setAddMemberError] = useState('');
    const [isAddingMember, setIsAddingMember] = useState(false);

    const isAdmin = user?.role === 'admin';

    const fetchTeams = useCallback(async () => {
        if (!token || !isAuthenticated) return;
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/teams');
            setTeams(response.data || []);
        } catch (err) {
            console.error("Error fetching teams:", err);
            const message = err.response?.data?.message || err.message || 'Failed to fetch teams';
            setError(`Error fetching teams: ${message}`);
            setTeams([]);
        } finally {
            setLoading(false);
        }
    }, [token, isAuthenticated]);

    const fetchOrganizationUsers = useCallback(async () => {
        if (!token || !isAdmin) return;
        setUsersLoading(true);
        setAddMemberError(''); // Clear previous errors
        try {
            // This now correctly calls GET /api/v1/users
            const response = await api.get('/users'); 
            setOrganizationUsers(response.data || []);
            if (!response.data || response.data.length === 0) {
                setAddMemberError('No other users found in your organization to add.');
            }
        } catch (err) {
            console.warn("Error fetching organization users:", err);
            setOrganizationUsers([]); 
            setAddMemberError('Could not load users. Ensure the API endpoint is correct and the server is running.');
        } finally {
            setUsersLoading(false);
        }
    }, [token, isAdmin]);


    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchTeams();
            if (isAdmin) {
                fetchOrganizationUsers(); // Call this when the component mounts if user is admin
            }
        } else if (!authLoading && !isAuthenticated) {
            setError("Not authenticated. Please log in.");
            setLoading(false);
        }
    }, [token, authLoading, isAuthenticated, fetchTeams, isAdmin, fetchOrganizationUsers]);

    const handleOpenCreateDialog = () => {
        setNewTeamName('');
        setCreateError('');
        setIsCreating(false);
        setOpenCreateDialog(true);
    };

    const handleCloseCreateDialog = () => {
        if (isCreating) return;
        setOpenCreateDialog(false);
    };

    const handleCreateTeam = async () => {
        if (isCreating || !isAdmin) return;
        if (!newTeamName.trim()) {
            setCreateError('Team name cannot be empty.');
            return;
        }
        setCreateError('');
        setIsCreating(true);
        try {
             const response = await api.post('/teams', { name: newTeamName.trim() });
            setTeams(prevTeams => [...prevTeams, response.data]);
            setNewTeamName('');
            handleCloseCreateDialog();
        } catch (err) {
            console.error("Error creating team:", err);
            const message = err.response?.data?.message || err.message || 'Failed to create team';
            setCreateError(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenMembersDialog = async (team) => {
        setSelectedTeam(team);
        setMembersLoading(true);
        setMembersError('');
        setTeamMembers([]);
        setSelectedUserToAdd('');
        setAddMemberError('');
        // Fetch organization users again here if it might have changed or if not fetched initially
        if (isAdmin && organizationUsers.length === 0 && !usersLoading) {
            fetchOrganizationUsers();
        }
        setOpenMembersDialog(true);
        try {
            const response = await api.get(`/teams/${team.id}/members`);
            setTeamMembers(response.data || []);
        } catch (err) {
            console.error("Error fetching team members:", err);
            setMembersError(err.response?.data?.message || err.message || 'Failed to fetch members.');
        } finally {
            setMembersLoading(false);
        }
    };

    const handleCloseMembersDialog = () => {
        setOpenMembersDialog(false);
        setSelectedTeam(null);
    };

    const handleAddMember = async () => {
        if (!selectedTeam || !selectedUserToAdd || !isAdmin || isAddingMember) return;
        setIsAddingMember(true);
        setAddMemberError('');
        try {
            // Your backend teamController for addMemberToTeam expects { userId, role }
            // Role can be defaulted to 'member' or you can add a UI element for it
            await api.post(`/teams/${selectedTeam.id}/members`, { userId: selectedUserToAdd, role: 'member' });
            // Refresh members list for the current team
            const response = await api.get(`/teams/${selectedTeam.id}/members`);
            setTeamMembers(response.data || []);
            setSelectedUserToAdd(''); // Reset selection
        } catch (err) {
            console.error("Error adding member:", err);
            setAddMemberError(err.response?.data?.message || err.message || 'Failed to add member.');
        } finally {
            setIsAddingMember(false);
        }
    };

    const handleRemoveMember = async (memberUserId) => {
        if (!selectedTeam || !memberUserId || !isAdmin) return;
        // Optional: Add a confirmation dialog before removing
        try {
            await api.delete(`/teams/${selectedTeam.id}/members/${memberUserId}`);
            // Refresh members list by filtering out the removed member
            setTeamMembers(prevMembers => prevMembers.filter(member => (member.user_id || member.id) !== memberUserId));
        } catch (err) {
            console.error("Error removing member:", err);
            // Display this error in the members dialog or as a general page error
            setMembersError(err.response?.data?.message || err.message || 'Failed to remove member.');
        }
    };


    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Manage Teams
                </Typography>

                {isAdmin && (
                    <Button
                        variant="contained"
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={handleOpenCreateDialog}
                        sx={{ mb: 2 }}
                    >
                        Create New Team
                    </Button>
                )}

                {loading && <CircularProgress />}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {!loading && !error && teams.length === 0 && isAuthenticated && (
                    <Typography>No teams found for your organization.</Typography>
                )}
                {!loading && !error && teams.length > 0 && isAuthenticated && (
                    <Paper elevation={2}>
                        <List>
                            {teams.map((team) => (
                                <ListItem key={team.id} divider
                                    secondaryAction={
                                        isAdmin && <IconButton edge="end" aria-label="members" onClick={() => handleOpenMembersDialog(team)}>
                                            <GroupIcon />
                                        </IconButton>
                                    }
                                >
                                    <ListItemText
                                        primary={team.name}
                                        secondary={`ID: ${team.id} | Created: ${new Date(team.created_at).toLocaleDateString()}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}
            </Box>

            {isAdmin && (
                <>
                    <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog} maxWidth="sm" fullWidth>
                        <DialogTitle>Create New Team</DialogTitle>
                        <DialogContent>
                            <TextField
                                autoFocus
                                margin="dense"
                                id="name"
                                label="Team Name"
                                type="text"
                                fullWidth
                                variant="outlined"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                error={!!createError}
                                helperText={createError}
                                disabled={isCreating}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseCreateDialog} disabled={isCreating}>Cancel</Button>
                            <Button onClick={handleCreateTeam} disabled={isCreating} variant="contained">
                                {isCreating ? <CircularProgress size={24} /> : "Create"}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {selectedTeam && (
                        <Dialog open={openMembersDialog} onClose={handleCloseMembersDialog} maxWidth="md" fullWidth>
                            <DialogTitle>Manage Members for: {selectedTeam.name}</DialogTitle>
                            <DialogContent>
                                {membersError && <Alert severity="error" sx={{ mb: 2 }}>{membersError}</Alert>}

                                <Typography variant="h6" gutterBottom>Add New Member</Typography>
                                <Grid container spacing={2} alignItems="center" sx={{mb: 2}}>
                                    <Grid item xs={8}>
                                        <FormControl fullWidth error={!!addMemberError}>
                                            <InputLabel id="select-user-label">Select User</InputLabel>
                                            <Select
                                                labelId="select-user-label"
                                                id="select-user"
                                                value={selectedUserToAdd}
                                                label="Select User"
                                                onChange={(e) => setSelectedUserToAdd(e.target.value)}
                                                disabled={isAddingMember || usersLoading}
                                            >
                                                {usersLoading && <MenuItem value=""><em>Loading users...</em></MenuItem>}
                                                {!usersLoading && organizationUsers.length === 0 && <MenuItem value="" disabled><em>No other users available to add</em></MenuItem>}
                                                {organizationUsers.map(orgUser => (
                                                    // Prevent adding users already in the team to the dropdown
                                                    !teamMembers.find(tm => (tm.user_id || tm.id) === orgUser.id) &&
                                                    <MenuItem key={orgUser.id} value={orgUser.id}>
                                                        {orgUser.username} ({orgUser.email})
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            {addMemberError && <Typography color="error" variant="caption" sx={{mt:1}}>{addMemberError}</Typography>}
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Button
                                            onClick={handleAddMember}
                                            disabled={isAddingMember || !selectedUserToAdd || usersLoading}
                                            variant="contained"
                                            fullWidth
                                            startIcon={<AddCircleOutlineIcon />}
                                        >
                                            {isAddingMember ? <CircularProgress size={24} /> : "Add"}
                                        </Button>
                                    </Grid>
                                </Grid>
                                
                                <Typography variant="h6" gutterBottom sx={{mt: 2}}>Current Members</Typography>
                                {membersLoading && <CircularProgress size={24} />}
                                {!membersLoading && teamMembers.length === 0 && !membersError && (
                                    <Typography>No members in this team yet.</Typography>
                                )}
                                {!membersLoading && teamMembers.length > 0 && (
                                    <List>
                                        {teamMembers.map((member) => (
                                            <ListItem key={member.user_id || member.id} divider>
                                                <ListItemText
                                                    primary={member.username || `User ID: ${member.user_id || member.id}`}
                                                    secondary={`Role: ${member.role || 'Member'}`}
                                                />
                                                <ListItemSecondaryAction>
                                                    <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveMember(member.user_id || member.id)} disabled={!isAdmin}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={handleCloseMembersDialog}>Close</Button>
                            </DialogActions>
                        </Dialog>
                    )}
                </>
            )}
        </Container>
    );
}

export default Teams;