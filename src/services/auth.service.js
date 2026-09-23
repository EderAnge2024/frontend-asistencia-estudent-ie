import { api } from './api';

export const authService = {
  login: async (dni, password) => {
    const response = await api.post('/auth/login', { dni, password });
    return response.data; // { success, data: { token, user } }
  },
  
  verifySession: async () => {
    const response = await api.get('/auth/me');
    return response.data; // { success, data: user }
  },
  
  setSession: (token, user) => {
    localStorage.setItem('asis_token', token);
    localStorage.setItem('asis_user', JSON.stringify(user));
  },
  
  clearSession: () => {
    localStorage.removeItem('asis_token');
    localStorage.removeItem('asis_user');
  },
  
  getToken: () => localStorage.getItem('asis_token'),
  getUser: () => {
    const u = localStorage.getItem('asis_user');
    return u ? JSON.parse(u) : null;
  }
};