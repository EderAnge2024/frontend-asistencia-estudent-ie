import axios from 'axios';

// Utilizaremos la URL de la maquina local. 
// En una app movil real, esto deberia apuntar a la IP local (ej. 192.168.1.X) o dominio de produccion.
const defaultHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const API_URL = import.meta.env.VITE_API_URL || `http://${defaultHost}:5000/api/v1`;


export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Interceptor para inyectar el token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('asis_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores 401 (Sesion Expirada)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Evitar loop si el error es en el propio login
      if (error.config.url !== '/auth/login') {
        console.warn('Sesion expirada o invalida');
        localStorage.removeItem('asis_token');
        localStorage.removeItem('asis_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);