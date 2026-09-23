import { api } from './api';

export const asistenciaDocenteService = {
  registrarEntrada: (data) => api.post('/asistencias-docentes/entrada', data),
  registrarSalida: (data) => api.post('/asistencias-docentes/salida', data),
  miAsistencia: (params) => api.get('/asistencias-docentes/mia', { params }),
  porInstitucion: (params) => api.get('/asistencias-docentes/institucion', { params }),
  resumen: (params) => api.get('/asistencias-docentes/resumen', { params }),
};
