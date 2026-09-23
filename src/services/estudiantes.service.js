import { api } from './api';

export const estudiantesService = {
  // Director: CRUD completo
  listar: (params) => api.get('/estudiantes', { params }),
  obtener: (id) => api.get(`/estudiantes/${id}`),
  crear: (data) => api.post('/estudiantes', data),
  actualizar: (id, data) => api.put(`/estudiantes/${id}`, data),
  toggleEstado: (id, estado) => api.patch(`/estudiantes/${id}/estado`, { estado }),
  cargaMasiva: (data) => api.post('/estudiantes/carga-masiva', { estudiantes: data }),
  // Docente tutor: mis estudiantes
  misEstudiantes: () => api.get('/estudiantes/mis-estudiantes'),
};

