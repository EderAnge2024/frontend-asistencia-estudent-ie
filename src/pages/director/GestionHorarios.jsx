import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { horariosService } from '../../services/admin.service';
import { ArrowLeft, Loader2, Plus, Clock, Edit3, Trash2, CheckCircle, AlertCircle, X } from 'lucide-react';

const DIAS = [
  { val: 1, label: 'Lunes' },
  { val: 2, label: 'Martes' },
  { val: 3, label: 'Miércoles' },
  { val: 4, label: 'Jueves' },
  { val: 5, label: 'Viernes' },
  { val: 6, label: 'Sábado' },
  { val: 7, label: 'Domingo' }
];

export default function GestionHorarios() {
  const navigate = useNavigate();
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'crear' | {...horario}
  const [form, setForm] = useState({ dia_semana: 1, hora_inicio: '08:00', hora_fin: '14:00', estado: true });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await horariosService.listar();
      setHorarios(res.data?.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setForm({ dia_semana: 1, hora_inicio: '08:00', hora_fin: '14:00', estado: true });
    setModal('crear');
    setMsg(null);
  };

  const abrirEditar = (h) => {
    setForm({ ...h });
    setModal(h);
    setMsg(null);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMsg(null);
    try {
      if (modal === 'crear') {
        await horariosService.crear(form);
      } else {
        await horariosService.actualizar(modal.id_horario, form);
      }
      setMsg({ ok: true, texto: 'Horario guardado correctamente.' });
      cargar();
      setTimeout(() => setModal(null), 1500);
    } catch (err) {
      setMsg({ ok: false, texto: err.response?.data?.message || 'Error al guardar.' });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este horario?')) return;
    try {
      await horariosService.eliminar(id);
      cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
      <div className="bg-brand-blue text-white pt-10 pb-4 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full active:scale-95">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold">Horarios de Asistencia</h1>
          </div>
          <button onClick={abrirCrear} className="bg-brand-yellow text-brand-black px-3 py-1.5 rounded-xl font-bold text-sm flex items-center gap-1 active:scale-95">
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-brand-blue" /></div>
        ) : horarios.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Clock size={48} className="mx-auto mb-3 opacity-30" />
            <p>No hay horarios configurados.</p>
          </div>
        ) : (
          horarios.map(h => {
            const diaObj = DIAS.find(d => d.val === h.dia_semana);
            return (
              <div key={h.id_horario} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-brand-black text-sm">{diaObj ? diaObj.label : `Día ${h.dia_semana}`}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Entrada: <span className="font-semibold text-brand-blue">{h.hora_inicio}</span> · 
                    Salida: <span className="font-semibold text-brand-green">{h.hora_fin}</span>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center ${h.estado ? 'bg-green-100 text-brand-green' : 'bg-red-100 text-brand-red'}`}>
                    {h.estado ? 'Activo' : 'Inactivo'}
                  </span>
                  <button onClick={() => abrirEditar(h)} className="p-2 bg-blue-50 text-brand-blue rounded-lg active:scale-95">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => eliminar(h.id_horario)} className="p-2 bg-red-50 text-brand-red rounded-lg active:scale-95">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setModal(null)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold">{modal === 'crear' ? 'Nuevo Horario' : 'Editar Horario'}</h2>
              <button onClick={() => setModal(null)} className="p-2 bg-gray-100 rounded-full"><X size={16} /></button>
            </div>
            
            {msg && (
              <div className={`flex gap-2 rounded-xl px-4 py-3 text-sm font-semibold items-center
                ${msg.ok ? 'bg-green-50 text-brand-green border border-brand-green' : 'bg-red-50 text-brand-red border border-brand-red'}`}>
                {msg.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {msg.texto}
              </div>
            )}

            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Día de la semana</label>
                <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  value={form.dia_semana} onChange={e => setForm({ ...form, dia_semana: parseInt(e.target.value) })}>
                  {DIAS.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Hora Inicio</label>
                  <input type="time" required value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Hora Fin</label>
                  <input type="time" required value={form.hora_fin} onChange={e => setForm({ ...form, hora_fin: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="estadoHorario" checked={form.estado} onChange={e => setForm({ ...form, estado: e.target.checked })} 
                  className="w-4 h-4 text-brand-blue rounded" />
                <label htmlFor="estadoHorario" className="text-sm font-medium text-brand-black">Horario Activo</label>
              </div>

              <button type="submit" disabled={guardando}
                className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all mt-4">
                {guardando ? 'Guardando...' : 'Guardar Horario'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
