import { api } from './api';

export const asistenciaEstudianteService = {
  registrarQR: (data) => api.post('/asistencias/estudiantes/qr', data),
  registrarManual: (data) => api.post('/asistencias/estudiantes/manual', data),
  registrarSalida: (id_estudiante) => api.post(`/asistencias/estudiantes/salida/${id_estudiante}`),
  porEstudiante: (id, params) => api.get(`/asistencias/estudiantes/estudiante/${id}`, { params }),
  porInstitucion: (params) => api.get('/asistencias/estudiantes', { params }),
  resumen: (params) => api.get('/asistencias/estudiantes/resumen', { params }),
};
