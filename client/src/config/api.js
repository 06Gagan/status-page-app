// status-page-app/client/src/config/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api/v1'; // Ensure your base URL is correct

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add the token to every request
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      // console.log(`[AxiosInterceptor] Sending token (first 20): ${token.substring(0,20)}... for request to ${config.url}`);
    } else {
      // console.log(`[AxiosInterceptor] No token found in sessionStorage for request to ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Response interceptor to handle global errors like 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Potentially handle global unauthorized error, e.g., by logging out user
      // This might conflict with AuthContext's own error handling, so use carefully.
      // For now, AuthContext handles its own 401s from /auth/profile.
      console.warn('[AxiosInterceptor] Received 401 Unauthorized error for a request.');
    }
    return Promise.reject(error);
  }
);

export default api;