import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
    Container, Box, TextField, Button, Typography, Alert, Paper, Link, 
    Grid, Divider, CircularProgress 
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Avatar from '@mui/material/Avatar';

function Register() {
    // Personal Information
    const [name, setName] = useState(''); // This will be sent as 'username'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Organization Information
    const [organizationName, setOrganizationName] = useState('');
    const [organizationSlug, setOrganizationSlug] = useState(''); 
    const [organizationDescription, setOrganizationDescription] = useState('');
    
    // Team Information
    const [teamName, setTeamName] = useState(''); 
    // const [teamDescription, setTeamDescription] = useState(''); // Team description not in backend model for creation

    const { register, error: authError, setError, loading } = useAuth(); // Correctly use setError
    const [formError, setFormError] = useState('');
    const navigate = useNavigate();

    const handleSlugGeneration = (orgName) => {
        const slug = orgName
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-') 
            .replace(/[^\w-]+/g, '') 
            .replace(/--+/g, '-'); 
        setOrganizationSlug(slug);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError('');
        if (setError) setError(null); // Use setError from context to clear previous auth errors

        if (!name || !email || !password || !organizationName || !organizationSlug) {
            setFormError('Please fill in all required personal and organization fields (including slug).');
            return;
        }
        if (password !== confirmPassword) {
            setFormError('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            setFormError('Password must be at least 6 characters long.');
            return;
        }
        if (name.length < 3) {
            setFormError('Name (username) must be at least 3 characters long.');
            return;
        }

        const userData = {
            username: name, 
            email,
            password,
            organizationName,
            organizationSlug, // Including slug
            organizationDescription, // Including description
            teamName: teamName || 'Default Team', // Including team name
        };

        try {
            await register(userData);
            navigate('/dashboard'); 
        } catch (err) {
            // AuthContext's register function already sets authError from server
            // No need to setFormError here if authError is displayed
        }
    };

    return (
        <Container component="main" maxWidth="md">
            <Paper elevation={3} sx={{ marginTop: 4, marginBottom: 4, padding: { xs: 2, sm: 3, md: 4 } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                        <PersonAddIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Create Account
                    </Typography>
                </Box>

                {(authError || formError) && (
                    <Alert severity="error" sx={{ width: '100%', mt: 2, mb: 2 }} onClose={() => { setFormError(''); if (setError) setError(null); }}>
                        {authError || formError}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Typography variant="h6" gutterBottom>Personal Information</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                id="name"
                                label="Full Name (becomes Username)"
                                name="name"
                                autoComplete="name"
                                autoFocus
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                id="email"
                                label="Email Address"
                                name="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                name="password"
                                label="Password (min. 6 characters)"
                                type="password"
                                id="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                name="confirmPassword"
                                label="Confirm Password"
                                type="password"
                                id="confirmPassword"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6" gutterBottom>Organization Information</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                id="organizationName"
                                label="Organization Name"
                                name="organizationName"
                                value={organizationName}
                                onChange={(e) => {
                                    setOrganizationName(e.target.value);
                                    handleSlugGeneration(e.target.value); 
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                id="organizationSlug"
                                label="Organization Slug"
                                name="organizationSlug"
                                value={organizationSlug}
                                onChange={(e) => setOrganizationSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                helperText="This will be used in your status page URL (e.g., my-company)."
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                id="organizationDescription"
                                label="Organization Description (Optional)"
                                name="organizationDescription"
                                multiline
                                rows={3}
                                value={organizationDescription}
                                onChange={(e) => setOrganizationDescription(e.target.value)}
                            />
                        </Grid>
                    </Grid>
                    
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6" gutterBottom>Team Information</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                id="teamName"
                                label="Initial Team Name (e.g., General)"
                                name="teamName"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                helperText="A default team will be created for your organization. If blank, 'Default Team' will be used."
                            />
                        </Grid>
                    </Grid> 

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Create Account'}
                    </Button>
                    <Box textAlign="center">
                        <Link component={RouterLink} to="/login" variant="body2">
                            Already have an account? Sign In
                        </Link>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
}

export default Register;
