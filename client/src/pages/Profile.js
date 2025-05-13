import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [teams, setTeams] = useState([]);
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const [profileRes, teamsRes, servicesRes] = await Promise.all([
          api.get('/auth/profile', { signal: controller.signal }),
          api.get('/teams', { signal: controller.signal }),
          api.get('/services', { signal: controller.signal })
        ]);

        if (isMounted) {
          setFormData(prev => ({
            ...prev,
            name: profileRes.data.data?.name || '',
            email: profileRes.data.data?.email || ''
          }));
          setTeams(teamsRes.data.data || []);
          setServices(servicesRes.data.data || []);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        if (isMounted) {
          setError('Failed to fetch user data');
          console.error('Error fetching user data:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('New passwords do not match');
        }
        if (!formData.currentPassword) {
          throw new Error('Current password is required to set a new password');
        }
      }

      await updateProfile({
        name: formData.name,
        email: formData.email,
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      setSuccess('Profile updated successfully');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Profile Information
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                margin="normal"
                required
              />
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Change Password
              </Typography>
              <TextField
                fullWidth
                label="Current Password"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="New Password"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                margin="normal"
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ mt: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Update Profile'}
              </Button>
            </form>
          </Paper>
        </Grid>

        {/* Teams and Services */}
        <Grid item xs={12} md={6}>
          {/* Teams Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">My Teams</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={() => window.location.href = '/teams'}
              >
                Manage Teams
              </Button>
            </Box>
            <List>
              {teams.map((team) => (
                <React.Fragment key={team.id}>
                  <ListItem>
                    <ListItemText
                      primary={team.name}
                      secondary={team.description}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
              {teams.length === 0 && (
                <ListItem>
                  <ListItemText primary="No teams found" />
                </ListItem>
              )}
            </List>
          </Paper>

          {/* Services Section */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">My Services</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={() => window.location.href = '/services'}
              >
                Manage Services
              </Button>
            </Box>
            <List>
              {services.map((service) => (
                <React.Fragment key={service.id}>
                  <ListItem>
                    <ListItemText
                      primary={service.name}
                      secondary={service.description}
                    />
                    <Chip
                      label={service.status}
                      color={
                        service.status === 'operational' ? 'success' :
                        service.status === 'degraded' ? 'warning' :
                        'error'
                      }
                      size="small"
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
              {services.length === 0 && (
                <ListItem>
                  <ListItemText primary="No services found" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile; 