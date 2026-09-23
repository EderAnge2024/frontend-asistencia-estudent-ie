import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { estudiantesService } from '../../services/estudiantes.service';
import { ArrowLeft, Users, Loader2, Search, UserCheck, AlertCircle } from 'lucide-react';

export default function MisEstudiantes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await estudiantesService.misEstudiantes();
        setEstudiantes(res.data?.data || []);
      } catch (e) {
        setError(e.response?.data?.message || 'Error al cargar estudiantes.');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const filtrados = estudiantes.filter(e => {
    const q = busqueda.toLowerCase();
    return (
      e.nombres?.toLowerCase().includes(q) ||
      e.apellido_paterno?.toLowerCase().includes(q) ||
      e.apellido_materno?.toLowerCase().includes(q) ||
      e.dni?.includes(q) ||
      e.codigo_estudiante?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-brand-blue text-white pt-10 pb-4 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full active:scale-95 transition-all">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold">Mis Estudiantes</h1>
        </div>
        <div className="bg-white/10 rounded-xl px-4 py-2 text-sm">
          <span className="font-semibold">{user?.nivel} · {user?.grado} · Sección {user?.seccion}</span>
          <span className="ml-2 text-white/60">| {filtrados.length} alumnos</span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-3">
        {/* Buscador */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            placeholder="Buscar por nombre, DNI o código..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-brand-blue" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-2 text-brand-red text-sm">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </div>
        )}

        {!loading && !error && filtrados.length === 0 && (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <Users size={48} className="mb-3 opacity-30" />
            <p className="font-medium">No se encontraron estudiantes</p>
            <p className="text-sm mt-1">
              {busqueda ? 'Prueba con otra búsqueda.' : 'No hay alumnos matriculados en tu sección este año.'}
            </p>
          </div>
        )}

        {filtrados.map((est, i) => (
          <div key={est.id_estudiante} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-full flex items-center justify-center shrink-0">
              <span className="text-brand-blue font-bold text-sm">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-brand-black truncate">
                {est.apellido_paterno} {est.apellido_materno}, {est.nombres}
              </p>
              <div className="flex gap-3 mt-0.5">
                {est.dni && <span className="text-xs text-gray-400">DNI: {est.dni}</span>}
                {est.codigo_estudiante && <span className="text-xs text-gray-400">Cód: {est.codigo_estudiante}</span>}
              </div>
            </div>
            <UserCheck size={18} className="text-brand-green shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
