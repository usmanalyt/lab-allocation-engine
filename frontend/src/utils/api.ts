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

export default api;