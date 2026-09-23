import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventosService } from '../../services/admin.service';
import { ArrowLeft, Loader2, Plus, Calendar, Edit3, CheckCircle, AlertCircle, X } from 'lucide-react';

const TIPOS = ['REUNION', 'CAPACITACION', 'ACTIVIDAD', 'ASAMBLEA', 'OTRO'];

export default function GestionEventos() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'crear' | {...evento}
  const [form, setForm] = useState({ tipo_evento: 'REUNION', titulo: '', descripcion: '', fecha: '', hora_inicio: '08:00', hora_fin: '10:00', estado: 'ACTIVO' });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await eventosService.listar({});
      setEventos(res.data?.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setForm({ tipo_evento: 'REUNION', titulo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], hora_inicio: '08:00', hora_fin: '10:00', estado: 'ACTIVO' });
    setModal('crear');
    setMsg(null);
  };

  const abrirEditar = (e) => {
    setForm({ 
      ...e,
      fecha: new Date(e.fecha).toISOString().split('T')[0]
    });
    setModal(e);
    setMsg(null);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMsg(null);
    try {
      if (modal === 'crear') {
        await eventosService.crear(form);
      } else {
        await eventosService.actualizar(modal.id_evento, form);
      }
      setMsg({ ok: true, texto: 'Evento guardado correctamente.' });
      cargar();
      setTimeout(() => setModal(null), 1500);
    } catch (err) {
      setMsg({ ok: false, texto: err.response?.data?.message || 'Error al guardar.' });
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await eventosService.cambiarEstado(id, estado);
      cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const ESTADO_STYLE = {
    ACTIVO: 'bg-green-100 text-brand-green',
    FINALIZADO: 'bg-gray-100 text-gray-500',
    CANCELADO: 'bg-red-100 text-brand-red'
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
      <div className="bg-brand-blue text-white pt-10 pb-4 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full active:scale-95">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold">Eventos e Institución</h1>
          </div>
          <button onClick={abrirCrear} className="bg-brand-yellow text-brand-black px-3 py-1.5 rounded-xl font-bold text-sm flex items-center gap-1 active:scale-95">
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-brand-blue" /></div>
        ) : eventos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Calendar size={48} className="mx-auto mb-3 opacity-30" />
            <p>No hay eventos registrados.</p>
          </div>
        ) : (
          eventos.map(ev => {
            return (
              <div key={ev.id_evento} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-brand-blue uppercase tracking-wider">{ev.tipo_evento}</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${ESTADO_STYLE[ev.estado] || 'bg-gray-100 text-gray-500'}`}>
                    {ev.estado}
                  </span>
                </div>
                <h3 className="font-bold text-brand-black mb-1 leading-tight">{ev.titulo}</h3>
                <p className="text-xs text-gray-500 mb-3">{ev.descripcion}</p>
                <div className="text-xs text-gray-400 mb-3">
                  <p>📅 {new Date(ev.fecha).toLocaleDateString('es-PE')}</p>
                  <p>⏰ {ev.hora_inicio} - {ev.hora_fin}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => abrirEditar(ev)} className="flex-1 bg-blue-50 text-brand-blue py-2 rounded-xl text-xs font-semibold active:scale-95 flex items-center justify-center gap-1">
                    <Edit3 size={14} /> Editar
                  </button>
                  {ev.estado === 'ACTIVO' && (
                    <button onClick={() => cambiarEstado(ev.id_evento, 'FINALIZADO')} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-xs font-semibold active:scale-95">
                      Finalizar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setModal(null)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold">{modal === 'crear' ? 'Nuevo Evento' : 'Editar Evento'}</h2>
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
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Tipo de Evento</label>
                <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  value={form.tipo_evento} onChange={e => setForm({ ...form, tipo_evento: e.target.value })}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Título</label>
                <input type="text" required value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Descripción</label>
                <textarea rows="2" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Fecha</label>
                <input type="date" required value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
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
              
              {modal !== 'crear' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Estado</label>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="FINALIZADO">FINALIZADO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                </div>
              )}

              <button type="submit" disabled={guardando}
                className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all mt-4">
                {guardando ? 'Guardando...' : 'Guardar Evento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
