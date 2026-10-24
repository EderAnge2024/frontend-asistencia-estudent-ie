import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { asistenciaEstudianteService } from '../../services/asistenciaEstudiante.service';
import { exportarMatrizMensualExcel, exportarMatrizMensualPDF, NOMBRES_MESES } from '../../utils/exportador';
import {
  ArrowLeft, FileSpreadsheet, FileText, Loader2, CheckCircle,
  AlertCircle, Calendar, BookOpen, Download
} from 'lucide-react';

export default function InformeAsistenciaDocente() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const fechaActual = new Date();
  const [mes, setMes] = useState(fechaActual.getMonth() + 1);
  const [anio, setAnio] = useState(fechaActual.getFullYear());
  const [generando, setGenerando] = useState(false);
  const [msg, setMsg] = useState(null);

  const aulaTexto = user?.tutor
    ? `${user.nivel || 'Nivel'} · ${user.grado || 'Grado'} · Sección ${user.seccion || 'Única'}`
    : 'No asignado como tutor';

  const descargarInforme = async (formato = 'excel') => {
    setGenerando(`informe_${formato}`);
    setMsg(null);
    try {
      const params = {
        mes,
        anio,
        nivel: user?.nivel,
        grado: user?.grado,
        seccion: user?.seccion,
      };

      const res = await asistenciaEstudianteService.informeMensual(params);
      const estudiantes = res.data?.data || [];

      if (estudiantes.length === 0) {
        setMsg({
          ok: false,
          texto: 'No se encontraron estudiantes matriculados en tu sección para el período seleccionado.',
        });
        return;
      }

      const nombreMes = NOMBRES_MESES[mes - 1] || `MES_${mes}`;
      const nivelLimpio = (user?.nivel || 'NIVEL').toUpperCase();
      const gradoLimpio = user?.grado ? `${user.grado}°` : '';
      const seccionLimpia = user?.seccion ? `SECCION ${user.seccion}` : '';
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
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
      {/* Header */}
      <div className="bg-brand-blue text-white pt-10 pb-5 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white/10 rounded-full active:scale-95 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold">Informe Mensual de Asistencia</h1>
        </div>

        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 text-sm">
          <BookOpen size={16} className="text-brand-yellow shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold truncate">{aulaTexto}</p>
            <p className="text-xs text-white/70">Aula asignada como Tutor</p>
          </div>
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
            <span>{msg.texto}</span>
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
                Matriz mensual de días hábiles con iniciales <b>P</b> (Presente), <b>T</b> (Tardanza), <b>F</b> (Falta) y <b>J</b> (Justificado).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                Mes escolar
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value, 10))}
                className="w-full bg-gray-50 border border-gray-200 text-brand-black text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-blue"
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
                Año
              </label>
              <select
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value, 10))}
                className="w-full bg-gray-50 border border-gray-200 text-brand-black text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-blue"
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
              • Columnas para cada día lectivo (Lunes a Viernes) con inicial <b>(P / T / F / J)</b>.
            </p>
            <p className="text-gray-600">
              • Resumen final automático con totales de presentes, tardanzas y faltas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => descargarInforme('excel')}
              disabled={generando !== null || !user?.tutor}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 text-xs sm:text-sm"
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
              disabled={generando !== null || !user?.tutor}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-all shadow-md shadow-red-600/20 disabled:opacity-50 text-xs sm:text-sm"
            >
              {generando === 'informe_pdf' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <FileText size={18} />
              )}
              <span>PDF (.pdf)</span>
            </button>
          </div>

          {!user?.tutor && (
            <p className="text-xs text-center text-brand-red font-semibold">
              ⚠️ Solo los docentes asignados como tutores pueden generar el informe de su aula.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
