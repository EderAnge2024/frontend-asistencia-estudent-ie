import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { asistenciaDocenteService } from '../../services/asistenciaDocente.service';
import { asistenciaEstudianteService } from '../../services/asistenciaEstudiante.service';
import { ArrowLeft, Loader2, Users, Search, AlertCircle, XCircle, CheckCircle, Edit3, Trash2, X } from 'lucide-react';

const ESTADO_COLOR = {
  PRESENTE:    'bg-green-100 text-brand-green',
  TARDANZA:    'bg-yellow-100 text-yellow-700',
  FALTA:       'bg-red-100 text-brand-red',
  JUSTIFICADO: 'bg-blue-100 text-brand-blue',
};

/** Devuelve la fecha actual en zona horaria Lima en formato YYYY-MM-DD */
function getFechaHoyLima() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

export default function VistaAsistencias({ tipo }) {
  const navigate = useNavigate();
  const [registros, setRegistros]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [fecha, setFecha]                 = useState(() => getFechaHoyLima());
  const [filtroEstado, setFiltroEstado]   = useState('');
  const [filtroNivel, setFiltroNivel]     = useState('');
  const [filtroGrado, setFiltroGrado]     = useState('');
  const [filtroSeccion, setFiltroSeccion] = useState('');

  // Estado para Cerrar Día
  const [confirmando, setConfirmando]         = useState(false);
  const [cerrando, setCerrando]               = useState(false);
  const [resultadoCierre, setResultadoCierre] = useState(null); // { ok, mensaje, marcados }

  // Estado para editar / anular asistencia (estudiantes)
  const [registroAEditar, setRegistroAEditar] = useState(null);
  const [nuevoEstadoEditar, setNuevoEstadoEditar] = useState('PRESENTE');
  const [observacionEditar, setObservacionEditar] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { fecha_inicio: fecha, fecha_fin: fecha };
      if (filtroEstado) params.estado = filtroEstado;
      let res;
      if (tipo === 'docentes') {
        res = await asistenciaDocenteService.porInstitucion(params);
      } else {
        if (filtroNivel)   params.nivel   = filtroNivel;
        if (filtroGrado)   params.grado   = filtroGrado;
        if (filtroSeccion) params.seccion = filtroSeccion;
        res = await asistenciaEstudianteService.porInstitucion(params);
      }
      setRegistros(res.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al cargar asistencias.');
    } finally { setLoading(false); }
  }, [fecha, filtroEstado, filtroNivel, filtroGrado, filtroSeccion, tipo]);

  useEffect(() => { cargar(); }, [cargar]);

  const ejecutarCierreDia = async () => {
    setConfirmando(false);
    setCerrando(true);
    setResultadoCierre(null);
    try {
      const svc = tipo === 'docentes' ? asistenciaDocenteService : asistenciaEstudianteService;
      const res = await svc.cerrarDia(fecha);
      const data = res.data?.data;
      setResultadoCierre({
        ok:       true,
        mensaje:  data?.mensaje  || 'Cierre de día completado.',
        marcados: data?.marcados ?? 0,
      });
      await cargar(); // recarga para mostrar las FALTAs nuevas
    } catch (e) {
      setResultadoCierre({
        ok:       false,
        mensaje:  e.response?.data?.message || 'Error al cerrar el día.',
        marcados: 0,
      });
    } finally {
      setCerrando(false);
    }
  };

  const abrirModalEditar = (r) => {
    setRegistroAEditar(r);
    setNuevoEstadoEditar(r.estado_asistencia || 'PRESENTE');
    setObservacionEditar(r.observaciones || '');
  };

  const handleGuardarEdicion = async () => {
    if (!registroAEditar) return;
    setGuardandoEdicion(true);
    try {
      await asistenciaEstudianteService.actualizar(registroAEditar.id_asistencia, {
        estado_asistencia: nuevoEstadoEditar,
        observaciones: observacionEditar.trim() || undefined,
      });
      setRegistroAEditar(null);
      cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al actualizar asistencia.');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleEliminarAsistencia = async () => {
    if (!registroAEditar) return;
    const nombre = `${registroAEditar.apellido_paterno || ''} ${registroAEditar.nombres || ''}`.trim();
    if (!window.confirm(`¿Estás seguro de eliminar el registro de asistencia de ${nombre}?`)) return;

    setGuardandoEdicion(true);
    try {
      await asistenciaEstudianteService.eliminar(registroAEditar.id_asistencia);
      setRegistroAEditar(null);
      cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar asistencia.');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const titulo    = tipo === 'docentes' ? 'Asistencia Docentes' : 'Asistencia Estudiantes';
  const formatHora = ts => ts ? new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const esHoy     = fecha === getFechaHoyLima();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">

      {/* ===== HEADER ===== */}
      <div className="bg-brand-blue text-white pt-10 pb-4 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full active:scale-95">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold">{titulo}</h1>
          <span className="ml-auto text-xs text-white/60">{registros.length} registros</span>
        </div>

        {/* Filtros */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-white/60 mb-1">Fecha</p>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full bg-white text-brand-black text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>
            <div>
              <p className="text-xs text-white/60 mb-1">Estado</p>
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="w-full bg-white text-brand-black text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <option value="">Todos</option>
                <option value="PRESENTE">PRESENTE</option>
                <option value="TARDANZA">TARDANZA</option>
                <option value="FALTA">FALTA</option>
                <option value="JUSTIFICADO">JUSTIFICADO</option>
              </select>
            </div>
          </div>

          {tipo === 'estudiantes' && (
            <div className="grid grid-cols-3 gap-2">
              <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)}
                className="w-full bg-white text-brand-black text-xs sm:text-sm rounded-xl px-2 py-2 focus:outline-none">
                <option value="">Todos niveles</option>
                <option value="Primaria">Primaria</option>
                <option value="Secundaria">Secundaria</option>
              </select>
              <select value={filtroGrado} onChange={e => setFiltroGrado(e.target.value)}
                className="w-full bg-white text-brand-black text-xs sm:text-sm rounded-xl px-2 py-2 focus:outline-none">
                <option value="">Todos grados</option>
                {['1','2','3','4','5','6'].map(g => <option key={g} value={g}>{g}°</option>)}
              </select>
              <select value={filtroSeccion} onChange={e => setFiltroSeccion(e.target.value)}
                className="w-full bg-white text-brand-black text-xs sm:text-sm rounded-xl px-2 py-2 focus:outline-none">
                <option value="">Todas secc.</option>
                {['A','B','C','D'].map(s => <option key={s} value={s}>Secc. {s}</option>)}
              </select>
            </div>
          )}

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={cargar}
              disabled={loading || cerrando}
              className="flex items-center justify-center gap-2 bg-brand-yellow text-brand-black text-sm font-bold py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'Buscando...' : 'Buscar'}
            </button>

            <button
              onClick={() => setConfirmando(true)}
              disabled={loading || cerrando}
              className="flex items-center justify-center gap-2 bg-red-500 text-white text-sm font-bold py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60"
            >
              {cerrando ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              {cerrando ? 'Cerrando...' : 'Cerrar Día'}
            </button>
          </div>
        </div>
      </div>

      {/* ===== CONTENIDO ===== */}
      <div className="px-4 pt-4 space-y-2">

        {/* Banner resultado cierre */}
        {resultadoCierre && (
          <div className={`flex gap-3 items-start rounded-xl px-4 py-3 text-sm font-semibold border ${
            resultadoCierre.ok
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-brand-red border-red-200'
          }`}>
            {resultadoCierre.ok
              ? <CheckCircle size={18} className="shrink-0 mt-0.5" />
              : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p>{resultadoCierre.mensaje}</p>
              {resultadoCierre.ok && resultadoCierre.marcados > 0 && (
                <p className="text-xs font-normal mt-0.5 text-green-600">
                  {resultadoCierre.marcados} falta(s) marcadas automáticamente en el sistema.
                </p>
              )}
            </div>
            <button onClick={() => setResultadoCierre(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>
        )}

        {/* Error general */}
        {error && (
          <div className="flex gap-2 items-center bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-brand-red text-sm">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-brand-blue" />
          </div>
        ) : registros.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-30" />
            <p>No hay registros para esta fecha.</p>
            {esHoy && (
              <p className="text-xs mt-2 text-gray-300">
                Usa <span className="font-semibold">"Cerrar Día"</span> al finalizar la jornada para marcar las faltas automáticamente.
              </p>
            )}
          </div>
        ) : (
          registros.map((r, i) => (
            <div key={r.id_asistencia || i} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-brand-black text-sm truncate">
                  {tipo === 'docentes'
                    ? (r.nombres || r.apellidos
                        ? `${r.apellidos || ''} ${r.nombres || ''}`.trim()
                        : `Docente ID: ${r.id_docente}`)
                    : `${r.apellido_paterno || ''} ${r.nombres || ''}`}
                </p>
                {tipo === 'docentes' && r.dni && (
                  <p className="text-xs text-gray-400">DNI: {r.dni}</p>
                )}
                {tipo === 'estudiantes' && r.grado && (
                  <p className="text-xs text-gray-400">{r.nivel} · {r.grado} · Sección {r.seccion}</p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">
                  Entrada: <span className="font-medium text-gray-700">{formatHora(r.hora_entrada)}</span>
                  {' · '}Salida: <span className="font-medium text-gray-700">{formatHora(r.hora_salida)}</span>
                  {r.distancia_entrada_metros != null && ` · GPS: ${Math.round(r.distancia_entrada_metros)}m`}
                  {r.metodo_entrada && ` · (${r.metodo_entrada})`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${ESTADO_COLOR[r.estado_asistencia] || 'bg-gray-100 text-gray-500'}`}>
                    {r.estado_asistencia}
                  </span>
                  {tipo === 'estudiantes' && (
                    <button
                      type="button"
                      onClick={() => abrirModalEditar(r)}
                      className="p-1 text-gray-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg active:scale-95 transition-all"
                      title="Editar o corregir asistencia (cambiar a Falta/Justificado o Eliminar)"
                    >
                      <Edit3 size={15} />
                    </button>
                  )}
                </div>
                {tipo === 'estudiantes' && r.estado_asistencia !== 'FALTA' && (
                  r.hora_salida ? (
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                      ✓ Toda la clase
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">
                      Salida pendiente
                    </span>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== MODAL CONFIRMACIÓN CERRAR DÍA ===== */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-8">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle size={32} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-brand-black">¿Cerrar el día?</h2>
              <p className="text-sm text-gray-500">
                Los <span className="font-semibold text-brand-black">
                  {tipo === 'docentes' ? 'docentes' : 'estudiantes'}
                </span> que{' '}
                <span className="font-semibold text-red-500">no registraron asistencia</span>{' '}
                el <span className="font-semibold">{fecha}</span> serán marcados automáticamente como{' '}
                <span className="font-bold text-red-600">FALTA</span>.
              </p>
              <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 w-full text-left">
                ⚠️ Esta acción no se puede deshacer fácilmente. Asegúrate de que la jornada escolar haya concluido.
              </p>
              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                <button
                  onClick={() => setConfirmando(false)}
                  className="py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={ejecutarCierreDia}
                  className="py-3 rounded-2xl bg-red-500 text-white font-bold text-sm active:scale-95 transition-all"
                >
                  Sí, Cerrar Día
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar o Corregir Asistencia por Error */}
      {registroAEditar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setRegistroAEditar(null)}>
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-brand-black flex items-center gap-1.5">
                  <Edit3 size={18} className="text-brand-blue" />
                  <span>Corregir Asistencia</span>
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {registroAEditar.apellido_paterno} {registroAEditar.apellido_materno || ''}, {registroAEditar.nombres}
                </p>
                <p className="text-[11px] text-gray-400">
                  {registroAEditar.nivel} · {registroAEditar.grado} {registroAEditar.seccion} · Fecha: {fecha}
                </p>
              </div>
              <button onClick={() => setRegistroAEditar(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-600 uppercase block">Seleccionar nuevo estado:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: 'FALTA', label: '❌ Falta', desc: 'No vino / Inasistencia', color: 'border-red-300 text-brand-red bg-red-50/70' },
                  { val: 'JUSTIFICADO', label: 'ℹ️ Justificado', desc: 'Inasistencia con justificación', color: 'border-blue-300 text-brand-blue bg-blue-50/70' },
                  { val: 'PRESENTE', label: '✓ Presente', desc: 'Asistió a clases', color: 'border-green-300 text-brand-green bg-green-50/70' },
                  { val: 'TARDANZA', label: '⏰ Tardanza', desc: 'Llegó con tardanza', color: 'border-yellow-300 text-yellow-800 bg-yellow-50/70' },
                ].map(op => {
                  const activo = nuevoEstadoEditar === op.val;
                  return (
                    <button
                      key={op.val}
                      type="button"
                      onClick={() => setNuevoEstadoEditar(op.val)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        activo ? `${op.color} ring-2 ring-brand-blue shadow-sm font-bold` : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <p className="text-sm font-bold">{op.label}</p>
                      <p className="text-[10px] text-gray-500 font-normal leading-tight mt-0.5">{op.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Motivo / Observación (Opcional):</label>
                <input
                  type="text"
                  value={observacionEditar}
                  onChange={e => setObservacionEditar(e.target.value)}
                  placeholder="Ej. Se corrigió: el estudiante no vino hoy"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <button
                type="button"
                disabled={guardandoEdicion}
                onClick={handleGuardarEdicion}
                className="w-full bg-brand-blue hover:bg-blue-900 text-white py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {guardandoEdicion ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                <span>Guardar Corrección</span>
              </button>

              <button
                type="button"
                disabled={guardandoEdicion}
                onClick={handleEliminarAsistencia}
                className="w-full bg-red-50 text-brand-red hover:bg-red-100 border border-red-200 py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                title="Elimina el registro de asistencia de la base de datos"
              >
                <Trash2 size={14} />
                <span>Eliminar Registro de Asistencia</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
