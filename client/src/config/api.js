import axios from 'axios';

// Ensure this baseURL points to your backend server, which is on port 5001
// If you use a .env file for your client (e.g., .env.development),
// you can set REACT_APP_API_URL=http://localhost:5001/api
// Otherwise, hardcode it here for now.
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL, 
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: Global handling for unauthorized errors
      // For example, clear token and redirect to login by calling a logout function
      // from AuthContext if accessible here, or by dispatching a custom event.
      // Directly manipulating localStorage and window.location here can be problematic
      // if AuthContext is not also updated.
      // Example:
      // localStorage.removeItem('token'); 
      // delete api.defaults.headers.common['Authorization'];
      // if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      //    window.location.href = '/login'; // This is a hard redirect
      // }
    }
    return Promise.reject(error);
  }
);

export default api; // This should be the only export default statement
