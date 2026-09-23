import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar el evento de sesion expirada desde axios
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    // Verificar sesion inicial
    const initAuth = async () => {
      try {
        const storedToken = authService.getToken();
        if (storedToken) {
          const res = await authService.verifySession();
          if (res.success) {
            setToken(storedToken);
            setUser(res.data);
            authService.setSession(storedToken, res.data); // actualizar datos en local
          }
        }
      } catch (error) {
        console.error('Error al restaurar sesion:', error);
        authService.clearSession();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (dni, password) => {
    const res = await authService.login(dni, password);
    if (res.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      authService.setSession(res.data.token, res.data.user);
    }
    return res;
  };

  const logout = () => {
    authService.clearSession();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);