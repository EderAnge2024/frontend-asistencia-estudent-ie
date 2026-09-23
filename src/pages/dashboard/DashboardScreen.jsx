// Este archivo redirige al dashboard correcto según el rol del usuario.
// La lógica real está en AppRouter.jsx → DashboardRedirect.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function DashboardScreen() {
  const { user } = useAuth();
  const ROLES_DIRECTOR = ['DIRECTOR', 'ADMIN', 'SUBDIRECTOR', 'SECRETARIO'];
  if (!user) return <Navigate to="/login" replace />;
  if (ROLES_DIRECTOR.includes(user.rol)) return <Navigate to="/director" replace />;
  return <Navigate to="/docente" replace />;
}