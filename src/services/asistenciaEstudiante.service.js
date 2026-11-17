import { api } from './api';

export const asistenciaEstudianteService = {
  registrarQR: (data) => api.post('/asistencias/estudiantes/qr', data),
  registrarManual: (data) => api.post('/asistencias/estudiantes/manual', data),
  registrarSalida: (id_estudiante) => api.post(`/asistencias/estudiantes/salida/${id_estudiante}`),
  buscarParaDirector: (params) => api.get('/asistencias/estudiantes/buscar', { params }),
  porEstudiante: (id, params) => api.get(`/asistencias/estudiantes/estudiante/${id}`, { params }),
  porInstitucion: (params) => api.get('/asistencias/estudiantes', { params }),
  resumen: (params) => api.get('/asistencias/estudiantes/resumen', { params }),
  actualizar: (id, data) => api.put(`/asistencias/estudiantes/${id}`, data),
  eliminar: (id) => api.delete(`/asistencias/estudiantes/${id}`),
  cerrarDia: (fecha) => api.post('/asistencias/estudiantes/cerrar-dia', fecha ? { fecha } : {}),
  informeMensual: (params) => api.get('/asistencias/estudiantes/informe-mensual', { params }),
};
