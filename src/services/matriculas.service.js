import { api } from './api';

export const matriculasService = {
  listar: (params) => api.get('/matriculas', { params }),
  obtener: (id) => api.get(`/matriculas/${id}`),
  crear: (data) => api.post('/matriculas', data),
  actualizar: (id, data) => api.put(`/matriculas/${id}`, data),
  cambiarEstado: (id, estado) => api.patch(`/matriculas/${id}/estado`, { estado }),
  historialEstudiante: (id_estudiante) => api.get(`/matriculas/estudiante/${id_estudiante}`),
};
