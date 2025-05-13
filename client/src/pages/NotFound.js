import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper
} from '@mui/material';

function NotFound() {
  const navigate = useNavigate();

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h1" color="primary" gutterBottom>
            404
          </Typography>
          <Typography component="h2" variant="h5" gutterBottom>
            Page Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" paragraph>
            The page you are looking for might have been removed, had its name changed,
            or is temporarily unavailable.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/dashboard')}
              sx={{ mr: 2 }}
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default NotFound; 