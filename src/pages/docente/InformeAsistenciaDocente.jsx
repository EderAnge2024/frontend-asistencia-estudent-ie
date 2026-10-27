import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { asistenciaEstudianteService } from '../../services/asistenciaEstudiante.service';
import { exportarMatrizMensualExcel, exportarMatrizMensualPDF, NOMBRES_MESES } from '../../utils/exportador';
import {
  ArrowLeft, FileSpreadsheet, FileText, Loader2, CheckCircle,
  AlertCircle, Calendar, BookOpen, Filter, RotateCcw
} from 'lucide-react';

export default function InformeAsistenciaDocente() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const fechaActual = new Date();
  const [mes, setMes] = useState(fechaActual.getMonth() + 1);
  const [anio, setAnio] = useState(fechaActual.getFullYear());

  // Detectar si el usuario es tutor
  const esTutor = Boolean(
    user?.tutor === true ||
    String(user?.tutor).toLowerCase() === 'true' ||
    String(user?.tutor).toLowerCase() === 'si' ||
    String(user?.tutor).toLowerCase() === 't' ||
    user?.tutor === 1 ||
    user?.tutor === '1' ||
    !!user?.grado_tutoria ||
    (user?.grado && user?.seccion) ||
    ['DOCENTE', 'PROFESOR', 'DIRECTOR', 'ADMIN', 'ADMINISTRADOR'].includes(user?.rol?.toUpperCase())
  );

  // Extraer valores iniciales seguros de la asignación del docente
  const extraerGradoInicial = () => {
    if (user?.grado && !String(user.grado).includes('-')) {
      const match = String(user.grado).match(/\d+/);
      if (match) return match[0];
    }
    if (user?.grado_tutoria) {
      const match = String(user.grado_tutoria).match(/\d+/);
      if (match) return match[0];
    }
    return '1';
  };

  const extraerSeccionInicial = () => {
    if (user?.seccion) {
      const s = String(user.seccion).trim().toUpperCase();
      if (s === 'UNICA' || s === 'ÚNICA') return 'A';
      return s;
    }
    if (user?.grado_tutoria) {
      const matchLetra = String(user.grado_tutoria).match(/["']([A-Za-z])["']/) ||
                         String(user.grado_tutoria).match(/\b([A-Za-z])\b/);
      if (matchLetra) return matchLetra[1].toUpperCase();
    }
    return 'A';
  };

  const [nivel, setNivel] = useState(user?.nivel || 'Secundaria');
  const [grado, setGrado] = useState(extraerGradoInicial());
  const [seccion, setSeccion] = useState(extraerSeccionInicial());

  const [generando, setGenerando] = useState(null);
  const [msg, setMsg] = useState(null);

  // Sincronizar si el usuario carga tarde desde AuthContext
  useEffect(() => {
    if (user?.nivel && !nivel) setNivel(user.nivel);
    if (user?.grado && grado === '1') setGrado(extraerGradoInicial());
    if (user?.seccion && seccion === 'A') setSeccion(extraerSeccionInicial());
  }, [user]);

  const aulaTexto = esTutor
    ? `${user?.nivel || nivel} · ${user?.grado ? `${user.grado}°` : `${grado}°`} · Sección ${user?.seccion || seccion}`
    : 'Docente de aula';

  const restablecerAulaAsignada = () => {
    if (user?.nivel) setNivel(user.nivel);
    setGrado(extraerGradoInicial());
    setSeccion(extraerSeccionInicial());
    setMsg(null);
  };

  const descargarInforme = async (formato = 'excel') => {
    setGenerando(`informe_${formato}`);
    setMsg(null);
    try {
      const params = {
        mes,
        anio,
        nivel: nivel || user?.nivel || 'Secundaria',
        grado: grado || user?.grado || '1',
      };

      // Si la sección no es 'TODAS' ni 'UNICA', enviarla como filtro
      const secUpper = (seccion || '').toUpperCase();
      if (secUpper && secUpper !== 'TODAS' && secUpper !== 'UNICA' && secUpper !== 'ÚNICA') {
        params.seccion = secUpper;
      }

      let res = await asistenciaEstudianteService.informeMensual(params);
      let estudiantes = res.data?.data || [];

      // Si no se encontraron estudiantes con la sección específica, intentar sin filtro de sección
      if (estudiantes.length === 0 && params.seccion) {
        const fallbackParams = { ...params };
        delete fallbackParams.seccion;
        const resFallback = await asistenciaEstudianteService.informeMensual(fallbackParams);
        if (resFallback.data?.data?.length > 0) {
          estudiantes = resFallback.data.data;
        }
      }

      if (estudiantes.length === 0) {
        setMsg({
          ok: false,
          texto: `No se encontraron estudiantes matriculados en ${params.nivel} ${params.grado}° ${seccion ? `Sección ${seccion}` : ''} para el período seleccionado.`,
        });
        return;
      }

      const nombreMes = NOMBRES_MESES[mes - 1] || `MES_${mes}`;
      const nivelLimpio = (nivel || user?.nivel || 'NIVEL').toUpperCase();
      const gradoLimpio = grado ? `${grado}°` : '';
      const seccionLimpia = seccion ? `SECCION_${seccion}` : '';
      const tituloGeneral = `${nivelLimpio} ${gradoLimpio} ${seccionLimpia}`.trim();
      const extension = formato === 'excel' ? 'xlsx' : 'pdf';

      const nombreArchivo = `Informe_Asistencia_${tituloGeneral.replace(/\s+/g, '_')}_${nombreMes}_${anio}.${extension}`;

      if (formato === 'excel') {
        await exportarMatrizMensualExcel({
          estudiantes,
          mes,
          anio,
          tituloGeneral,
          nombreArchivo,
          agruparPorGradoSeccion: false,
        });
      } else {
        await exportarMatrizMensualPDF({
          estudiantes,
          mes,
          anio,
          tituloGeneral,
          nombreArchivo,
          agruparPorGradoSeccion: false,
        });
      }

      setMsg({
        ok: true,
        texto: `✅ Informe (${formato.toUpperCase()}) de ${nombreMes} ${anio} generado con éxito (${estudiantes.length} estudiantes).`,
      });
    } catch (e) {
      console.error(e);
      setMsg({
        ok: false,
        texto: e.response?.data?.message || 'Error al generar informe: ' + e.message,
      });
    } finally {
      setGenerando(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-8">
      {/* Header */}
      <div className="bg-brand-blue text-white pt-10 pb-5 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white/10 rounded-full active:scale-95 transition-all"
            aria-label="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold">Informe Mensual de Asistencia</h1>
        </div>

        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 text-sm">
          <BookOpen size={16} className="text-brand-yellow shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{aulaTexto}</p>
            <p className="text-xs text-white/70">Aula asignada como Tutor / Docente</p>
          </div>
          {(user?.grado || user?.grado_tutoria) && (
            <button
              onClick={restablecerAulaAsignada}
              className="text-xs flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg text-white font-medium shrink-0 active:scale-95 transition-all"
              title="Restablecer a mi aula asignada"
            >
              <RotateCcw size={12} />
              <span>Mi Aula</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Mensaje feedback */}
        {msg && (
          <div
            className={`flex gap-2 items-center rounded-2xl px-4 py-3.5 text-sm font-semibold border ${
              msg.ok
                ? 'bg-green-50 text-brand-green border-green-200'
                : 'bg-red-50 text-brand-red border-red-200'
            }`}
          >
            {msg.ok ? (
              <CheckCircle size={20} className="shrink-0" />
            ) : (
              <AlertCircle size={20} className="shrink-0" />
            )}
            <span className="flex-1">{msg.texto}</span>
          </div>
        )}

        {/* Tarjeta de configuración */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className="font-bold text-brand-black text-sm">Registro Pedagógico Oficial</h2>
              <p className="text-xs text-gray-500">
                Matriz mensual oficial con días lectivos (L a V) y estados <b>P</b> (Presente), <b>T</b> (Tardanza), <b>F</b> (Falta) y <b>J</b> (Justificado).
              </p>
            </div>
          </div>

          {/* Configuración de Aula (Nivel, Grado, Sección) */}
          <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-3.5 space-y-3">
            <p className="text-xs font-bold text-brand-blue flex items-center gap-1.5 uppercase tracking-wide">
              <Filter size={14} /> Aula de tutoría a emitir:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Nivel
                </label>
                <select
                  value={nivel}
                  onChange={(e) => setNivel(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-brand-black text-xs font-semibold rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  <option value="Secundaria">Secundaria</option>
                  <option value="Primaria">Primaria</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Grado
                </label>
                <select
                  value={grado}
                  onChange={(e) => setGrado(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-brand-black text-xs font-semibold rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  {['1', '2', '3', '4', '5', '6'].map((g) => (
                    <option key={g} value={g}>
                      {g}° {nivel === 'Primaria' ? 'Primaria' : 'Secundaria'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Sección
                </label>
                <select
                  value={seccion}
                  onChange={(e) => setSeccion(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-brand-black text-xs font-semibold rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  <option value="A">Sección A</option>
                  <option value="B">Sección B</option>
                  <option value="C">Sección C</option>
                  <option value="UNICA">Única</option>
                  <option value="TODAS">Todas</option>
                </select>
              </div>
            </div>
          </div>

          {/* Configuración de Fecha (Mes y Año) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                Mes escolar
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value, 10))}
                className="w-full bg-gray-50 border border-gray-200 text-brand-black text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-blue font-medium"
              >
                {NOMBRES_MESES.map((nom, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                Año lectivo
              </label>
              <select
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value, 10))}
                className="w-full bg-gray-50 border border-gray-200 text-brand-black text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-blue font-medium"
              >
                {[anio - 1, anio, anio + 1].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-blue-50/60 rounded-xl p-3 text-xs text-brand-blue space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Calendar size={14} /> Estructura del formato generado:
            </p>
            <p className="text-gray-600">
              • Encabezado con <b>N°</b>, <b>DNI</b>, <b>Apellidos y nombres</b>.
            </p>
            <p className="text-gray-600">
              • Columnas para cada día hábil del mes con inicial coloreada <b>(P / T / F / J)</b>.
            </p>
            <p className="text-gray-600">
              • Resumen final automático con totales de presentes, tardanzas, faltas y justificados.
            </p>
          </div>

          {/* Botones de Descarga */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => descargarInforme('excel')}
              disabled={generando !== null}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
            >
              {generando === 'informe_excel' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={18} />
              )}
              <span>Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => descargarInforme('pdf')}
              disabled={generando !== null}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-all shadow-md shadow-red-600/20 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
            >
              {generando === 'informe_pdf' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <FileText size={18} />
              )}
              <span>PDF (.pdf)</span>
            </button>
          </div>

          {!esTutor && (
            <p className="text-xs text-center text-amber-600 bg-amber-50 rounded-xl p-2 font-medium">
              ℹ️ Selecciona el aula y mes escolar para emitir el informe correspondiente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
