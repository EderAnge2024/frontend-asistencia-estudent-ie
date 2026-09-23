import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { estudiantesService } from '../../services/estudiantes.service';
import { matriculasService } from '../../services/matriculas.service';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft, Plus, Search, Loader2, BookOpen, AlertCircle,
  CheckCircle, X, ChevronDown
} from 'lucide-react';

const NIVELES = ['Inicial', 'Primaria', 'Secundaria'];
const GRADOS_POR_NIVEL = {
  'Inicial': ['3 años', '4 años', '5 años'],
  'Primaria': ['1.º', '2.º', '3.º', '4.º', '5.º', '6.º'],
  'Secundaria': ['1.º', '2.º', '3.º', '4.º', '5.º'],
};
const SECCIONES = ['A', 'B', 'C', 'D', 'E'];
const ESTADOS = ['ACTIVO', 'RETIRADO', 'TRASLADADO', 'CULMINADO'];

const EMPTY_FORM = {
  id_estudiante: '', anio_lectivo: new Date().getFullYear(),
  nivel: '', grado: '', seccion: '', estado: 'ACTIVO'
};

export default function GestionMatriculas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [matriculas, setMatriculas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [estudianteBuscado, setEstudianteBuscado] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [filtroGrado, setFiltroGrado] = useState('');
  const [filtroSeccion, setFiltroSeccion] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroGrado) params.grado = filtroGrado;
      if (filtroSeccion) params.seccion = filtroSeccion;
      const res = await matriculasService.listar(params);
      setMatriculas(res.data?.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [filtroGrado, filtroSeccion]);

  useEffect(() => {
    const id = searchParams.get('id_estudiante');
    if (id) {
      setForm(p => ({ ...p, id_estudiante: id }));
      setModal('crear');
    }
  }, []);

  const buscarEstudiante = async () => {
    if (!estudianteBuscado.trim()) return;
    setBuscando(true);
    try {
      const res = await estudiantesService.listar({ busqueda: estudianteBuscado });
      setResultados(res.data?.data || []);
    } finally { setBuscando(false); }
  };

  const seleccionarEstudiante = (e) => {
    setForm(p => ({ ...p, id_estudiante: e.id_estudiante }));
    setResultados([]);
    setEstudianteBuscado(`${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`);
  };

  const guardar = async () => {
    if (!form.id_estudiante || !form.nivel || !form.grado || !form.seccion) {
      setMsg({ ok: false, texto: 'Completa todos los campos obligatorios.' }); return;
    }
    setGuardando(true); setMsg(null);
    try {
      const payload = { ...form, id_institucion: user.id_institucion };
      if (modal === 'crear') {
        await matriculasService.crear(payload);
        setMsg({ ok: true, texto: 'Matrícula registrada.' });
      } else {
        await matriculasService.actualizar(modal.id_matricula, { ...form });
        setMsg({ ok: true, texto: 'Matrícula actualizada.' });
      }
      cargar();
      setTimeout(() => { setModal(null); setMsg(null); }, 1500);
    } catch (e) {
      setMsg({ ok: false, texto: e.response?.data?.message || 'Error al guardar matrícula.' });
    } finally { setGuardando(false); }
  };

  const abrirCrear = () => {
    setForm(EMPTY_FORM); setEstudianteBuscado(''); setResultados([]);
    setModal('crear'); setMsg(null);
  };

  const abrirEditar = (m) => {
    setForm({ ...m });
    setEstudianteBuscado(`${m.apellido_paterno || ''} ${m.apellido_materno || ''}, ${m.nombres || ''}`);
    setModal(m); setMsg(null);
  };

  const cambiarEstado = async (m, estado) => {
    try { await matriculasService.cambiarEstado(m.id_matricula, estado); cargar(); } catch { }
  };

  const ESTADO_COLOR = { ACTIVO: 'bg-green-100 text-brand-green', RETIRADO: 'bg-red-100 text-brand-red', TRASLADADO: 'bg-yellow-100 text-yellow-700', CULMINADO: 'bg-gray-100 text-gray-500' };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
      <div className="bg-brand-blue text-white pt-10 pb-4 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full active:scale-95"><ArrowLeft size={18} /></button>
          <h1 className="text-lg font-bold flex-1">Matrículas</h1>
          <button onClick={abrirCrear} className="bg-brand-yellow text-brand-black px-3 py-2 rounded-xl font-bold text-sm flex items-center gap-1 active:scale-95">
            <Plus size={16} /> Nueva
          </button>
        </div>
        <div className="flex gap-2">
          <select value={filtroGrado} onChange={e => setFiltroGrado(e.target.value)}
            className="flex-1 bg-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
            <option value="">Todos los grados</option>
            {Array.from(new Set(Object.values(GRADOS_POR_NIVEL).flat())).map(g => <option key={g} value={g} className="text-black">{g}</option>)}
          </select>
          <select value={filtroSeccion} onChange={e => setFiltroSeccion(e.target.value)}
            className="flex-1 bg-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
            <option value="">Todas las secciones</option>
            {SECCIONES.map(s => <option key={s} value={s} className="text-black">Sección {s}</option>)}
          </select>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-brand-blue" /></div>
        ) : matriculas.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
            <p>No hay matrículas registradas.</p>
          </div>
        ) : matriculas.map(m => (
          <div key={m.id_matricula} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-brand-black text-sm truncate">
                  {m.apellido_paterno} {m.apellido_materno}, {m.nombres}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{m.nivel} · {m.grado} · Sección {m.seccion} · {m.anio_lectivo}</p>
                {m.dni && <p className="text-xs text-gray-400">DNI: {m.dni}</p>}
                {m.tutor_asignado ? (
                  <p className="text-xs text-brand-blue font-semibold mt-1">
                    👨‍🏫 Tutor: Prof. {m.tutor_asignado.nombres} {m.tutor_asignado.apellidos} ({m.tutor_asignado.grado_tutoria})
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">👨‍🏫 Tutor: Sin tutor asignado a este grado/sección</p>
                )}
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${ESTADO_COLOR[m.estado]}`}>{m.estado}</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => abrirEditar(m)}
                className="flex-1 text-xs bg-blue-50 text-brand-blue font-semibold py-2 rounded-lg active:scale-95">Editar</button>
              {m.estado === 'ACTIVO' && (
                <button onClick={() => cambiarEstado(m, 'RETIRADO')}
                  className="flex-1 text-xs bg-red-50 text-brand-red font-semibold py-2 rounded-lg active:scale-95">Retirar</button>
              )}
            </div>
          </div>
        ))}

      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setModal(null)}>
          <div className="w-full bg-white rounded-t-3xl p-5 space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold">{modal === 'crear' ? 'Nueva Matrícula' : 'Editar Matrícula'}</h2>
              <button onClick={() => setModal(null)} className="p-2 bg-gray-100 rounded-full"><X size={16} /></button>
            </div>

            {msg && (
              <div className={`flex gap-2 rounded-xl px-4 py-3 text-sm font-semibold items-center ${msg.ok ? 'bg-green-50 text-brand-green border border-brand-green' : 'bg-red-50 text-brand-red border border-brand-red'}`}>
                {msg.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {msg.texto}
              </div>
            )}

            {modal === 'crear' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Buscar Estudiante *</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    placeholder="Nombre, DNI o código..."
                    value={estudianteBuscado}
                    onChange={e => setEstudianteBuscado(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && buscarEstudiante()}
                  />
                  <button onClick={buscarEstudiante} disabled={buscando}
                    className="px-4 bg-brand-blue text-white rounded-xl text-sm font-semibold active:scale-95">
                    {buscando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  </button>
                </div>
                {resultados.map(e => (
                  <button key={e.id_estudiante} onClick={() => seleccionarEstudiante(e)}
                    className="w-full text-left px-4 py-2 bg-gray-50 rounded-xl mt-1 text-sm hover:bg-blue-50 active:scale-95">
                    {e.apellido_paterno} {e.apellido_materno}, {e.nombres}
                    {e.dni && <span className="text-gray-400 ml-2">· {e.dni}</span>}
                  </button>
                ))}
                {form.id_estudiante && (
                  <p className="text-xs text-brand-green font-semibold mt-1">✓ Estudiante seleccionado (ID: {form.id_estudiante})</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Año Lectivo *</label>
                <input type="number" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  value={form.anio_lectivo} onChange={e => setForm(p => ({ ...p, anio_lectivo: parseInt(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Estado *</label>
                <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}>
                  {ESTADOS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Nivel *</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                value={form.nivel} onChange={e => setForm(p => ({ ...p, nivel: e.target.value, grado: '' }))}>
                <option value="">Seleccionar nivel...</option>
                {NIVELES.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Grado *</label>
                <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  value={form.grado} onChange={e => setForm(p => ({ ...p, grado: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {(GRADOS_POR_NIVEL[form.nivel] || []).map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Sección *</label>
                <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  value={form.seccion} onChange={e => setForm(p => ({ ...p, seccion: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {SECCIONES.map(s => <option key={s} value={s}>Sección {s}</option>)}
                </select>
              </div>
            </div>

            <button onClick={guardar} disabled={guardando}
              className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2">
              {guardando && <Loader2 size={18} className="animate-spin" />}
              {modal === 'crear' ? 'Registrar Matrícula' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
