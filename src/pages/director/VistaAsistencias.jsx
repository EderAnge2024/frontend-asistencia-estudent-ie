import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { asistenciaDocenteService } from '../../services/asistenciaDocente.service';
import { asistenciaEstudianteService } from '../../services/asistenciaEstudiante.service';
import { ArrowLeft, Loader2, Users, UserCheck, AlertCircle } from 'lucide-react';

const ESTADO_COLOR = {
  PRESENTE:    'bg-green-100 text-brand-green',
  TARDANZA:    'bg-yellow-100 text-yellow-700',
  FALTA:       'bg-red-100 text-brand-red',
  JUSTIFICADO: 'bg-blue-100 text-brand-blue',
};

export default function VistaAsistencias({ tipo }) {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [filtroEstado, setFiltroEstado] = useState('');

  const cargar = async () => {
    setLoading(true); setError('');
    try {
      const params = { fecha_inicio: fecha, fecha_fin: fecha };
      if (filtroEstado) params.estado = filtroEstado;
      let res;
      if (tipo === 'docentes') res = await asistenciaDocenteService.porInstitucion(params);
      else res = await asistenciaEstudianteService.porInstitucion(params);
      setRegistros(res.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al cargar asistencias.');
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [fecha, filtroEstado, tipo]);

  const titulo = tipo === 'docentes' ? 'Asistencia Docentes' : 'Asistencia Estudiantes';
  const formatHora = ts => ts ? new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
      <div className="bg-brand-blue text-white pt-10 pb-4 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full active:scale-95"><ArrowLeft size={18} /></button>
          <h1 className="text-lg font-bold">{titulo}</h1>
          <span className="ml-auto text-xs text-white/60">{registros.length} registros</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-white/60 mb-1">Fecha</p>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full bg-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none" />
          </div>
          <div>
            <p className="text-xs text-white/60 mb-1">Estado</p>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="w-full bg-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
              <option value="">Todos</option>
              {['PRESENTE', 'TARDANZA', 'FALTA', 'JUSTIFICADO'].map(s => (
                <option key={s} value={s} className="text-black">{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {error && (
          <div className="flex gap-2 items-center bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-brand-red text-sm">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-brand-blue" /></div>
        ) : registros.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-30" />
            <p>No hay registros para esta fecha.</p>
          </div>
        ) : registros.map((r, i) => (
          <div key={r.id_asistencia || i} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-brand-black text-sm truncate">
                {tipo === 'docentes'
                  ? (r.nombres || r.apellidos ? `${r.apellidos || ''} ${r.nombres || ''}`.trim() : `Docente ID: ${r.id_docente}`)
                  : `${r.apellido_paterno || ''} ${r.nombres || ''}`}
              </p>
              {tipo === 'docentes' && r.dni && (
                <p className="text-xs text-gray-400">DNI: {r.dni}</p>
              )}
              {tipo === 'estudiantes' && r.grado && (
                <p className="text-xs text-gray-400">{r.nivel} · {r.grado} · Sección {r.seccion}</p>
              )}
              <p className="text-xs text-gray-500 mt-0.5">
                Entrada: <span className="font-medium text-gray-700">{formatHora(r.hora_entrada)}</span> · Salida: <span className="font-medium text-gray-700">{formatHora(r.hora_salida)}</span>
                {r.distancia_entrada_metros !== null && r.distancia_entrada_metros !== undefined && ` · GPS: ${Math.round(r.distancia_entrada_metros)}m`}
                {r.metodo_entrada && ` · (${r.metodo_entrada})`}
              </p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${ESTADO_COLOR[r.estado_asistencia]}`}>
              {r.estado_asistencia}
            </span>
          </div>
        ))}

      </div>
    </div>
  );
}
