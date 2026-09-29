import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Loader2, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { asistenciaDocenteService } from '../../services/asistenciaDocente.service';
import { asistenciaEstudianteService } from '../../services/asistenciaEstudiante.service';
import { matriculasService } from '../../services/matriculas.service';
import { estudiantesService } from '../../services/estudiantes.service';
import { descargarExcel } from '../../utils/exportador';

export default function ReportesDirector() {
  const navigate = useNavigate();
  const [generando, setGenerando] = useState(null); // 'docentes' | 'estudiantes' | 'matriculas'
  const [msg, setMsg] = useState(null);

  // Filtros de fecha
  const hoyStr = new Date().toISOString().split('T')[0];
  const inicioMesStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [fechaInicioDoc, setFechaInicioDoc] = useState(inicioMesStr);
  const [fechaFinDoc, setFechaFinDoc] = useState(hoyStr);

  const [fechaInicioEst, setFechaInicioEst] = useState(hoyStr);
  const [fechaFinEst, setFechaFinEst] = useState(hoyStr);

  const formatHora = (ts) => {
    if (!ts) return '--:--';
    return new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatFecha = (f) => {
    if (!f) return '';
    return typeof f === 'string' ? f.split('T')[0] : new Date(f).toLocaleDateString('es-PE');
  };

  // 1. Reporte Asistencia Docentes
  const descargarReporteDocentes = async () => {
    setGenerando('docentes');
    setMsg(null);
    try {
      const res = await asistenciaDocenteService.porInstitucion({
        fecha_inicio: fechaInicioDoc,
        fecha_fin: fechaFinDoc,
      });

      const datos = res.data?.data || [];
      if (datos.length === 0) {
        setMsg({ ok: false, texto: 'No se encontraron asistencias de docentes en el rango seleccionado.' });
        return;
      }

      const filasExcel = datos.map((d, index) => ({
        'N°': index + 1,
        'DNI': d.dni || '',
        'Apellidos': d.apellidos || '',
        'Nombres': d.nombres || '',
        'Fecha': formatFecha(d.fecha),
        'Hora Entrada': formatHora(d.hora_entrada),
        'Hora Salida': formatHora(d.hora_salida),
        'Estado': d.estado_asistencia || '',
        'Método Entrada': d.metodo_entrada || '',
        'Distancia GPS (m)': d.distancia_entrada_metros != null ? Math.round(d.distancia_entrada_metros) : '',
        'Observación': d.observacion || ''
      }));

      const ws = XLSX.utils.json_to_sheet(filasExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Asistencia Docentes');

      const nombreArchivo = `Reporte_Asistencia_Docentes_${fechaInicioDoc}_al_${fechaFinDoc}.xlsx`;
      await descargarExcel(wb, nombreArchivo);
      setMsg({ ok: true, texto: `✅ Reporte de docentes generado correctamente (${datos.length} registros).` });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, texto: e.response?.data?.message || 'Error al generar reporte de docentes.' });
    } finally {
      setGenerando(null);
    }
  };

  // 2. Reporte Asistencia Estudiantes
  const descargarReporteEstudiantes = async () => {
    setGenerando('estudiantes');
    setMsg(null);
    try {
      const res = await asistenciaEstudianteService.porInstitucion({
        fecha_inicio: fechaInicioEst,
        fecha_fin: fechaFinEst,
      });

      const datos = res.data?.data || [];
      if (datos.length === 0) {
        setMsg({ ok: false, texto: 'No se encontraron asistencias de estudiantes en el rango seleccionado.' });
        return;
      }

      const filasExcel = datos.map((e, index) => ({
        'N°': index + 1,
        'DNI': e.dni || '',
        'Apellido Paterno': e.apellido_paterno || '',
        'Apellido Materno': e.apellido_materno || '',
        'Nombres': e.nombres || '',
        'Nivel': e.nivel || '',
        'Grado': e.grado || '',
        'Sección': e.seccion || '',
        'Fecha': formatFecha(e.fecha),
        'Hora Entrada': formatHora(e.hora_entrada),
        'Hora Salida': formatHora(e.hora_salida),
        'Estado Asistencia': e.estado_asistencia || '',
        'Método': e.metodo_entrada || 'QR',
        'Observaciones': e.observacion || ''
      }));

      const ws = XLSX.utils.json_to_sheet(filasExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Asistencia Estudiantes');

      const nombreArchivo = `Reporte_Asistencia_Estudiantes_${fechaInicioEst}_al_${fechaFinEst}.xlsx`;
      await descargarExcel(wb, nombreArchivo);
      setMsg({ ok: true, texto: `✅ Reporte de estudiantes generado correctamente (${datos.length} registros).` });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, texto: e.response?.data?.message || 'Error al generar reporte de estudiantes.' });
    } finally {
      setGenerando(null);
    }
  };

  // 3. Reporte Consolidado de Matrículas / Estudiantes
  const descargarConsolidadoMatriculas = async () => {
    setGenerando('matriculas');
    setMsg(null);
    try {
      // Intentar primero traer matrículas con detalle, o estudiantes registrados
      let datos = [];
      try {
        const resMat = await matriculasService.listar({});
        datos = resMat.data?.data || [];
      } catch (err) {
        console.warn('Fallo al consultar matriculas, intentando estudiantes:', err);
      }

      if (datos.length === 0) {
        const resEst = await estudiantesService.listar({ estado: true });
        datos = resEst.data?.data || [];
      }

      if (datos.length === 0) {
        setMsg({ ok: false, texto: 'No se encontraron registros de estudiantes o matrículas en la institución.' });
        return;
      }

      const filasExcel = datos.map((m, index) => ({
        'N°': index + 1,
        'DNI': m.dni || '',
        'Apellido Paterno': m.apellido_paterno || '',
        'Apellido Materno': m.apellido_materno || '',
        'Nombres': m.nombres || '',
        'Nivel': m.nivel || '',
        'Grado': m.grado || '',
        'Sección': m.seccion || '',
        'Año Académico': m.anio_academico || new Date().getFullYear(),
        'Estado Matrícula': m.estado_matricula || (m.estado ? 'ACTIVO' : 'INACTIVO'),
        'Fecha Registro': formatFecha(m.fecha_matricula || m.created_at)
      }));

      const ws = XLSX.utils.json_to_sheet(filasExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Padrón Matrículas');

      const anioActual = new Date().getFullYear();
      const nombreArchivo = `Consolidado_Matriculas_${anioActual}.xlsx`;
      await descargarExcel(wb, nombreArchivo);
      setMsg({ ok: true, texto: `✅ Consolidado de matrículas generado correctamente (${datos.length} registros).` });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, texto: e.response?.data?.message || 'Error al generar consolidado de matrículas.' });
    } finally {
      setGenerando(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
      <div className="bg-brand-blue text-white pt-10 pb-4 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full active:scale-95">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold">Reportes y Exportación</h1>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {msg && (
          <div className={`flex gap-2 items-center rounded-xl px-4 py-3 text-sm font-semibold
            ${msg.ok ? 'bg-green-50 text-brand-green border border-brand-green' : 'bg-red-50 text-brand-red border border-brand-red'}`}>
            {msg.ok ? <CheckCircle size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
            <span>{msg.texto}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="text-center mb-5">
            <FileText size={44} className="mx-auto text-brand-blue mb-2 opacity-80" />
            <h2 className="font-bold text-brand-black text-base">Descarga de Reportes en Excel</h2>
            <p className="text-xs text-gray-500">
              Genera y descarga en tu celular o computadora los consolidados oficiales en formato compatible con Excel (.xlsx).
            </p>
          </div>

          <div className="space-y-4">
            {/* 1. Reporte Docentes */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-brand-blue">Asistencia de Docentes</span>
                <span className="text-[11px] bg-blue-100 text-brand-blue font-semibold px-2 py-0.5 rounded-full">Rango mensual</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-gray-500 block mb-1">Desde:</label>
                  <input
                    type="date"
                    value={fechaInicioDoc}
                    onChange={(e) => setFechaInicioDoc(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700"
                  />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">Hasta:</label>
                  <input
                    type="date"
                    value={fechaFinDoc}
                    onChange={(e) => setFechaFinDoc(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700"
                  />
                </div>
              </div>
              <button
                onClick={descargarReporteDocentes}
                disabled={generando !== null}
                className="w-full flex items-center justify-center gap-2 bg-brand-blue text-white px-4 py-2.5 rounded-xl font-semibold text-xs active:scale-95 transition-all disabled:opacity-50"
              >
                {generando === 'docentes' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Generando reporte...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Descargar Excel Docentes</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. Reporte Estudiantes */}
            <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-brand-green">Asistencia de Estudiantes</span>
                <span className="text-[11px] bg-green-100 text-brand-green font-semibold px-2 py-0.5 rounded-full">Por fecha o rango</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-gray-500 block mb-1">Desde:</label>
                  <input
                    type="date"
                    value={fechaInicioEst}
                    onChange={(e) => setFechaInicioEst(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700"
                  />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">Hasta:</label>
                  <input
                    type="date"
                    value={fechaFinEst}
                    onChange={(e) => setFechaFinEst(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700"
                  />
                </div>
              </div>
              <button
                onClick={descargarReporteEstudiantes}
                disabled={generando !== null}
                className="w-full flex items-center justify-center gap-2 bg-brand-green text-white px-4 py-2.5 rounded-xl font-semibold text-xs active:scale-95 transition-all disabled:opacity-50"
              >
                {generando === 'estudiantes' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Generando reporte...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Descargar Excel Estudiantes</span>
                  </>
                )}
              </button>
            </div>

            {/* 3. Consolidado Matrículas */}
            <div className="bg-yellow-50/50 border border-yellow-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-yellow-800">Consolidado de Matrículas</span>
                <span className="text-[11px] bg-yellow-100 text-yellow-800 font-semibold px-2 py-0.5 rounded-full">Año escolar</span>
              </div>
              <p className="text-xs text-gray-600">
                Padrón completo de estudiantes matriculados en la institución educativa con niveles, grados y secciones.
              </p>
              <button
                onClick={descargarConsolidadoMatriculas}
                disabled={generando !== null}
                className="w-full flex items-center justify-center gap-2 bg-yellow-600 text-white px-4 py-2.5 rounded-xl font-semibold text-xs active:scale-95 transition-all disabled:opacity-50"
              >
                {generando === 'matriculas' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Generando reporte...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Descargar Consolidado Matrículas</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 text-[11px] text-gray-400 text-center">
            📲 En teléfonos móviles (APK/Android), al presionar descargar podrás guardar el archivo directamente en tu celular o compartirlo por WhatsApp y Google Drive.
          </div>
        </div>
      </div>
    </div>
  );
}
