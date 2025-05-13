import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import theme from './theme';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Services = lazy(() => import('./pages/Services'));
const Incidents = lazy(() => import('./pages/Incidents'));
const Teams = lazy(() => import('./pages/Teams'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicStatusPage = lazy(() => import('./pages/PublicStatus'));
const NotFound = lazy(() => import('./pages/NotFound'));

const RootRedirect = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <SocketProvider>
            <Suspense
              fallback={
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                  <CircularProgress />
                </Box>
              }
            >
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/status/:slug" element={<PublicStatusPage />} />

                <Route element={<Layout />}>
                  <Route index element={<RootRedirect />} />

                  <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                  <Route path="/services" element={<PrivateRoute><Services /></PrivateRoute>} />
                  <Route path="/incidents" element={<PrivateRoute><Incidents /></PrivateRoute>} />
                  <Route path="/teams" element={<PrivateRoute><Teams /></PrivateRoute>} />
                  <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </SocketProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;