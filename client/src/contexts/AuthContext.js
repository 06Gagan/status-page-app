// status-page-app/client/src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../config/api'; // Your pre-configured Axios instance
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

const AuthContextObject = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContextObject);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null); // Initialized to null
    const [loading, setLoading] = useState(true); // True until initial check is done
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // This function is the single source of truth for setting/clearing token related things
    const handleNewToken = useCallback((newToken) => {
        if (newToken) {
            console.log(`[AuthContext] handleNewToken: Setting token (first 20): ${newToken.substring(0,20)}...`);
            sessionStorage.setItem('token', newToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            setToken(newToken); // Update React state
        } else {
            console.log('[AuthContext] handleNewToken: Clearing token.');
            sessionStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
            setToken(null); // Update React state
        }
    }, []);

    const fetchUserProfile = useCallback(async (currentTokenForFetch) => {
        console.log(`[AuthContext] fetchUserProfile called with token (first 20): ${currentTokenForFetch ? currentTokenForFetch.substring(0,20)+'...' : 'null'}`);
        if (!currentTokenForFetch) {
            setUser(null); // No user if no token
            setLoading(false);
            return;
        }
        try {
            // Axios instance 'api' should use its interceptor or default header
            const response = await api.get('/auth/profile');
            console.log('[AuthContext] Profile fetched successfully:', response.data);
            setUser(response.data);
            setError(null);
        } catch (err) {
            console.error("[AuthContext] Failed to fetch profile:", err.response?.data || err.message);
            handleNewToken(null); // Clear everything if profile fetch fails (token likely invalid)
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [handleNewToken]);

    // Effect for initial load: check sessionStorage for a token
    useEffect(() => {
        const initialToken = sessionStorage.getItem('token');
        console.log(`[AuthContext] Initial load: Token from sessionStorage (first 20): ${initialToken ? initialToken.substring(0,20)+'...' : 'null'}`);
        if (initialToken) {
            handleNewToken(initialToken); // Set up token state and Axios default
            fetchUserProfile(initialToken);
        } else {
            setLoading(false); // No token, not loading, not authenticated
            setUser(null);
            setToken(null);
        }
    }, [handleNewToken, fetchUserProfile]); // Dependencies are stable callbacks

    const login = async (credentials) => {
        setLoading(true); // Indicate login process started
        setError(null);
        try {
            const response = await api.post('/auth/login', credentials);
            if (response.data && response.data.token && response.data.user) {
                const receivedToken = response.data.token;
                console.log(`[AuthContext] Login successful. Token from server (first 20): ${receivedToken.substring(0,20)}...`);
                handleNewToken(receivedToken);
                setUser(response.data.user);
                setLoading(false); // Login process finished
                return response.data.user;
            } else {
                throw new Error('Invalid login response from server.');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Login failed.';
            console.error('[AuthContext] Login failed:', errorMessage);
            setError(errorMessage);
            handleNewToken(null); // Clear token on failed login
            setUser(null);
            setLoading(false); // Login process finished (with error)
            throw new Error(errorMessage);
        }
    };

    const register = async (userData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/auth/register', userData);
            if (response.data && response.data.token && response.data.user) {
                const receivedToken = response.data.token;
                handleNewToken(receivedToken);
                setUser(response.data.user);
                setLoading(false);
                return response.data.user;
            } else {
                throw new Error('Invalid registration response from server.');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Registration failed.';
            setError(errorMessage);
            handleNewToken(null);
            setUser(null);
            setLoading(false);
            throw new Error(errorMessage);
        }
    };

    const logout = useCallback(() => {
        console.log('[AuthContext] Logging out.');
        handleNewToken(null);
        setUser(null);
        setError(null);
        setLoading(false);
        navigate('/login', { replace: true });
    }, [handleNewToken, navigate]);

    const updateProfileContext = async (profileData) => {
        setError(null);
        try {
            const response = await api.put('/auth/profile', profileData);
            const updatedUser = response.data?.user || response.data;
            if (updatedUser && updatedUser.id) {
                 setUser(updatedUser);
            } else {
                 await fetchUserProfile(token); // Refetch with current token state
            }
            return updatedUser;
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Profile update failed.';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const clearError = () => setError(null);

    const isAuthenticated = !!user && !!token;

    const value = {
        user,
        token, // The current token from React state
        loading, // Auth loading state
        error,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfileContext,
        clearError,
        setError,
        refreshProfile: () => fetchUserProfile(token), // Use current token state for refresh
        // setAuthToken is not directly exposed; use login/logout/initial load
        setUser // Expose setUser if needed for direct manipulation (use with caution)
    };

    // Show loading indicator only during the very initial token check
    if (loading && !token && !user && sessionStorage.getItem('token')) {
         // This case is when there's a token in storage, but we haven't verified it yet.
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Initializing session...</Typography>
            </Box>
        );
    }

    return (
        <AuthContextObject.Provider value={value}>
            {children}
        </AuthContextObject.Provider>
    );
};

export default AuthContextObject;