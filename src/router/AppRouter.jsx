import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../pages/login/LoginScreen';

// Docente
import DocenteDashboard from '../pages/docente/DocenteDashboard';
import MisEstudiantes from '../pages/docente/MisEstudiantes';
import AsistenciaEstudiantes from '../pages/docente/AsistenciaEstudiantes';
import HistorialDocente from '../pages/docente/HistorialDocente';

// Director / Admin
import DirectorDashboard from '../pages/director/DirectorDashboard';
import GestionEstudiantes from '../pages/director/GestionEstudiantes';
import GestionMatriculas from '../pages/director/GestionMatriculas';
import GestionQR from '../pages/director/GestionQR';
import VistaAsistencias from '../pages/director/VistaAsistencias';
import ConfiguracionAsistencia from '../pages/director/ConfiguracionAsistencia';
import GestionHorarios from '../pages/director/GestionHorarios';
import GestionEventos from '../pages/director/GestionEventos';
import ReportesDirector from '../pages/director/ReportesDirector';

const ROLES_DIRECTOR = ['DIRECTOR', 'ADMIN', 'SUBDIRECTOR', 'SECRETARIO'];
const ROLES_DOCENTE  = ['DOCENTE', 'DIRECTOR', 'ADMIN'];

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-white text-brand-blue font-semibold text-sm">Cargando...</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-white text-brand-blue font-semibold text-sm">Cargando...</div>;
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

const RoleRoute = ({ children, roles }) => {
  const { user } = useAuth();
  const userRol = user?.rol?.toUpperCase() || "";
  if (!roles.includes(userRol)) return <Navigate to="/login" replace />;
  return children;
};

// Redirige al dashboard correcto
const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  
  const userRol = user?.rol?.toUpperCase() || "";
  if (ROLES_DIRECTOR.includes(userRol)) return <Navigate to="/director" replace />;
  if (ROLES_DOCENTE.includes(userRol)) return <Navigate to="/docente" replace />;
  
  return <Navigate to="/login" replace />;
};

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* PÃºblico */}
        <Route path="/login" element={<PublicRoute><LoginScreen /></PublicRoute>} />

        {/* RedirecciÃ³n automÃ¡tica */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardRedirect /></PrivateRoute>} />

        {/* === RUTAS DOCENTE === */}
        <Route path="/docente" element={<PrivateRoute><RoleRoute roles={ROLES_DOCENTE}><DocenteDashboard /></RoleRoute></PrivateRoute>} />
        <Route path="/docente/mis-estudiantes" element={<PrivateRoute><RoleRoute roles={ROLES_DOCENTE}><MisEstudiantes /></RoleRoute></PrivateRoute>} />
        <Route path="/docente/asistencia-estudiantes" element={<PrivateRoute><RoleRoute roles={ROLES_DOCENTE}><AsistenciaEstudiantes /></RoleRoute></PrivateRoute>} />
        <Route path="/docente/historial" element={<PrivateRoute><RoleRoute roles={ROLES_DOCENTE}><HistorialDocente /></RoleRoute></PrivateRoute>} />

        {/* === RUTAS DIRECTOR === */}
        <Route path="/director" element={<PrivateRoute><RoleRoute roles={ROLES_DIRECTOR}><DirectorDashboard /></RoleRoute></PrivateRoute>} />
        <Route path="/director/estudiantes" element={<PrivateRoute><RoleRoute roles={ROLES_DIRECTOR}><GestionEstudiantes /></RoleRoute></PrivateRoute>} />
        <Route path="/director/matriculas" element={<PrivateRoute><RoleRoute roles={ROLES_DIRECTOR}><GestionMatriculas /></RoleRoute></PrivateRoute>} />
        <Route path="/director/qr" element={<PrivateRoute><RoleRoute roles={ROLES_DIRECTOR}><GestionQR /></RoleRoute></PrivateRoute>} />
        <Route path="/director/asistencia-docentes" element={<PrivateRoute><RoleRoute roles={ROLES_DIRECTOR}><VistaAsistencias tipo="docentes" /></RoleRoute></PrivateRoute>} />
        <Route path="/director/asistencia-estudiantes" element={<PrivateRoute><RoleRoute roles={ROLES_DIRECTOR}><VistaAsistencias tipo="estudiantes" /></RoleRoute></PrivateRoute>} />
        <Route path="/director/configuracion" element={<PrivateRoute><RoleRoute roles={ROLES_DIRECTOR}><ConfiguracionAsistencia /></RoleRoute></PrivateRoute>} />
        <Route path="/director/horarios" element={<PrivateRoute><RoleRoute roles={ROLES_DIRECTOR}><GestionHorarios /></RoleRoute></PrivateRoute>} />
        <Route path="/director/eventos" element={<PrivateRoute><RoleRoute roles={ROLES_DIRECTOR}><GestionEventos /></RoleRoute></PrivateRoute>} />
        <Route path="/director/reportes" element={<PrivateRoute><RoleRoute roles={ROLES_DIRECTOR}><ReportesDirector /></RoleRoute></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

