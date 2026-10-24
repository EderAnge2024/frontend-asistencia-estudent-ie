import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { asistenciaDocenteService } from '../../services/asistenciaDocente.service';
import { asistenciaEstudianteService } from '../../services/asistenciaEstudiante.service';
import { ArrowLeft, Loader2, Users, Search, AlertCircle, XCircle, CheckCircle } from 'lucide-react';

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
              <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${ESTADO_COLOR[r.estado_asistencia] || 'bg-gray-100 text-gray-500'}`}>
                {r.estado_asistencia}
              </span>
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
    </div>
  );
}
