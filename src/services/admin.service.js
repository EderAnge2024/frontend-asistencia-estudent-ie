import { api } from './api';

export const configuracionService = {
  obtener: () => api.get('/configuracion'),
  guardar: (data) => api.post('/configuracion', data),
};

export const horariosService = {
  listar: () => api.get('/horarios'),
  crear: (data) => api.post('/horarios', data),
  actualizar: (id, data) => api.put(`/horarios/${id}`, data),
  eliminar: (id) => api.delete(`/horarios/${id}`),
};

export const eventosService = {
  listar: (params) => api.get('/eventos', { params }),
  crear: (data) => api.post('/eventos', data),
  actualizar: (id, data) => api.put(`/eventos/${id}`, data),
  cambiarEstado: (id, estado) => api.patch(`/eventos/${id}/estado`, { estado }),
};
