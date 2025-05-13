// status-page-app/client/src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../config/api';
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
    const [token, setToken] = useState(sessionStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const setAuthTokenInStorageAndHeaders = useCallback((newToken) => {
        if (newToken) {
            console.log('[AuthContext] Setting new token:', newToken ? newToken.substring(0, 20) + '...' : 'null'); // Log received token (truncated)
            sessionStorage.setItem('token', newToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            setToken(newToken);
        } else {
            console.log('[AuthContext] Clearing token.');
            sessionStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
            setToken(null);
        }
    }, []);

    const fetchUserProfile = useCallback(async (currentToken) => {
        console.log('[AuthContext] fetchUserProfile called with token:', currentToken ? currentToken.substring(0, 20) + '...' : 'null');
        try {
            if (currentToken && !api.defaults.headers.common['Authorization']) {
                 api.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
            }
            const response = await api.get('/auth/profile');
            console.log('[AuthContext] Profile fetched successfully:', response.data);
            setUser(response.data);
            setError(null);
        } catch (err) {
            console.error("[AuthContext] Failed to fetch profile:", err.response?.data || err.message);
            setAuthTokenInStorageAndHeaders(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [setAuthTokenInStorageAndHeaders]);

    useEffect(() => {
        const initialToken = sessionStorage.getItem('token');
        console.log('[AuthContext] useEffect initial check. Token from sessionStorage:', initialToken ? initialToken.substring(0, 20) + '...' : 'null');
        if (initialToken) {
            setToken(initialToken); // Ensure token state is set
            fetchUserProfile(initialToken);
        } else {
            setLoading(false);
            setUser(null);
            setToken(null);
        }
    }, [fetchUserProfile]); // fetchUserProfile is stable due to useCallback

    const login = async (credentials) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/auth/login', credentials);
            if (response.data && response.data.token && response.data.user) {
                console.log('[AuthContext] Login successful. Received token.');
                setAuthTokenInStorageAndHeaders(response.data.token);
                setUser(response.data.user);
                setLoading(false);
                return response.data.user;
            } else {
                throw new Error('Invalid login response from server.');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Login failed.';
            console.error('[AuthContext] Login failed:', errorMessage);
            setError(errorMessage);
            setLoading(false);
            setAuthTokenInStorageAndHeaders(null);
            setUser(null);
            throw new Error(errorMessage);
        }
    };

    const register = async (userData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/auth/register', userData);
            if (response.data && response.data.token && response.data.user) {
                console.log('[AuthContext] Registration successful. Received token.');
                setAuthTokenInStorageAndHeaders(response.data.token);
                setUser(response.data.user);
                setLoading(false);
                return response.data.user;
            } else {
                throw new Error('Invalid registration response from server.');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Registration failed.';
            console.error('[AuthContext] Registration failed:', errorMessage);
            setError(errorMessage);
            setLoading(false);
            setAuthTokenInStorageAndHeaders(null);
            setUser(null);
            throw new Error(errorMessage);
        }
    };

    const logout = useCallback(() => {
        console.log('[AuthContext] Logging out.');
        setAuthTokenInStorageAndHeaders(null);
        setUser(null);
        setError(null);
        setLoading(false); // Important to set loading false if it was true
        navigate('/login', { replace: true });
    }, [setAuthTokenInStorageAndHeaders, navigate]);

    const updateProfileContext = async (profileData) => {
        setError(null);
        try {
            const response = await api.put('/auth/profile', profileData);
            const updatedUser = response.data?.user || response.data;
            if (updatedUser && updatedUser.id) {
                 setUser(updatedUser);
            } else {
                 console.warn("[AuthContext] Profile update response didn't contain expected user object, refetching profile.");
                 await fetchUserProfile(token); // Use current token state
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
        token,
        loading, // This is the auth loading state
        error,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfileContext,
        clearError,
        setError,
        refreshProfile: () => fetchUserProfile(token), // Pass current token
        setAuthToken: setAuthTokenInStorageAndHeaders,
        setUser
    };

    if (loading && !user && sessionStorage.getItem('token')) {
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