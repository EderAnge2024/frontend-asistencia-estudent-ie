import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { asistenciaDocenteService } from '../../services/asistenciaDocente.service';
import { ArrowLeft, Loader2, CalendarDays, ChevronRight, AlertCircle } from 'lucide-react';

const ESTADO_STYLE = {
  PRESENTE:    'bg-green-100 text-brand-green',
  TARDANZA:    'bg-yellow-100 text-yellow-700',
  FALTA:       'bg-red-100 text-brand-red',
  JUSTIFICADO: 'bg-blue-100 text-brand-blue',
};

export default function HistorialDocente() {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);

  const cargar = async () => {
    setLoading(true); setError('');
    try {
      const res = await asistenciaDocenteService.miAsistencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin });
      setRegistros(res.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al cargar historial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [fechaInicio, fechaFin]);

  const formatHora = (ts) => ts
    ? new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const formatFecha = (f) => new Date(f + 'T00:00:00').toLocaleDateString('es-PE', {
    weekday: 'short', day: 'numeric', month: 'short'
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
      <div className="bg-brand-blue text-white pt-10 pb-4 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full active:scale-95">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold">Mi Historial de Asistencia</h1>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-white/60 mb-1">Desde</p>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
              className="w-full bg-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40" />
          </div>
          <div>
            <p className="text-xs text-white/60 mb-1">Hasta</p>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
              className="w-full bg-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40" />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {error && (
          <div className="flex gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-brand-red text-sm">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-brand-blue" /></div>
        ) : registros.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CalendarDays size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin registros en este período.</p>
          </div>
        ) : (
          registros.map(r => (
            <div key={r.id_asistencia} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="shrink-0">
                <p className="text-sm font-semibold text-brand-black capitalize">{formatFecha(r.fecha)}</p>
                <p className="text-xs text-gray-400">Entrada: {formatHora(r.hora_entrada)} · Salida: {formatHora(r.hora_salida)}</p>
              </div>
              <div className="ml-auto">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${ESTADO_STYLE[r.estado_asistencia] || 'bg-gray-100 text-gray-500'}`}>
                  {r.estado_asistencia}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
