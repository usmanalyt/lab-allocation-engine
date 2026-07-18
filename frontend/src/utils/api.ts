import axios from 'axios';

const api = axios.create({
  // If VITE_API_URL is set in production, use it. Otherwise, fall back to localhost.
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lab_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to catch Vercel SPA routing returning index.html instead of an API error
api.interceptors.response.use(
  (response) => {
    if (typeof response.data === 'string' && response.data.toLowerCase().includes('<!doctype html>')) {
      return Promise.reject(new Error("API returned an HTML page. Please verify your VITE_API_URL environment variable in Vercel is pointing to your backend."));
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;