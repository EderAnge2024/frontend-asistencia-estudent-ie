import { api } from './api';

export const qrService = {
  generar: (id_estudiante) => api.post('/qr/generar', { id_estudiante }),
  obtenerPorEstudiante: (id_estudiante) => api.get(`/qr/estudiante/${id_estudiante}`),
  invalidar: (id_credencial) => api.patch(`/qr/${id_credencial}/invalidar`),
  validar: (token_qr) => api.post('/qr/validar', { token_qr }),
};
