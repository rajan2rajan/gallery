import axios from 'axios';

// const API_URL = 'http://localhost:5000/api'; // Make sure this matches your backend port
const API_URL = 'https://rhea-6a65.onrender.com/api'; // Make sure this matches your backend port



const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Don't set Content-Type for FormData (browser will set it with boundary)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  return config;
});

export default api;
