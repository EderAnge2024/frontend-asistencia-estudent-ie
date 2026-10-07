import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Loader2, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { asistenciaDocenteService } from '../../services/asistenciaDocente.service';
import { asistenciaEstudianteService } from '../../services/asistenciaEstudiante.service';
import { matriculasService } from '../../services/matriculas.service';
import { estudiantesService } from '../../services/estudiantes.service';
import { descargarExcel, exportarTablaPDF } from '../../utils/exportador';

export default function ReportesDirector() {
  const navigate = useNavigate();
  const [generando, setGenerando] = useState(null); // 'docentes_excel' | 'docentes_pdf' | 'estudiantes_excel' | 'estudiantes_pdf' | 'matriculas_excel' | 'matriculas_pdf'
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
  const descargarReporteDocentes = async (formato = 'excel') => {
    setGenerando(`docentes_${formato}`);
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

      if (formato === 'excel') {
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
          'Observación': d.observacion || '',
        }));

        const ws = XLSX.utils.json_to_sheet(filasExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Asistencia Docentes');

        const nombreArchivo = `Reporte_Asistencia_Docentes_${fechaInicioDoc}_al_${fechaFinDoc}.xlsx`;
        await descargarExcel(wb, nombreArchivo);
        setMsg({ ok: true, texto: `✅ Reporte Excel de docentes descargado/compartido (${datos.length} registros).` });
      } else {
        const columnasPDF = ['N°', 'DNI', 'Docente', 'Fecha', 'Entrada', 'Salida', 'Estado', 'Método', 'Observación'];
        const filasPDF = datos.map((d, index) => [
          index + 1,
          d.dni || '',
          `${d.apellidos || ''}, ${d.nombres || ''}`.trim(),
          formatFecha(d.fecha),
          formatHora(d.hora_entrada),
          formatHora(d.hora_salida),
          d.estado_asistencia || '',
          d.metodo_entrada || '',
          d.observacion || '',
        ]);
        const nombreArchivo = `Reporte_Asistencia_Docentes_${fechaInicioDoc}_al_${fechaFinDoc}.pdf`;
        await exportarTablaPDF({
          titulo: 'REPORTE DE ASISTENCIA DE DOCENTES',
          subtitulo: `Período: del ${fechaInicioDoc} al ${fechaFinDoc} · Total: ${datos.length} registros`,
          columnas: columnasPDF,
          filas: filasPDF,
          nombreArchivo,
          orientacion: 'landscape',
        });
        setMsg({ ok: true, texto: `✅ Reporte PDF de docentes descargado/compartido (${datos.length} registros).` });
      }
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, texto: e.response?.data?.message || 'Error al generar reporte de docentes: ' + e.message });
    } finally {
      setGenerando(null);
    }
  };

  // 2. Reporte Asistencia Estudiantes
  const descargarReporteEstudiantes = async (formato = 'excel') => {
    setGenerando(`estudiantes_${formato}`);
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

      if (formato === 'excel') {
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
          'Observaciones': e.observacion || '',
        }));

        const ws = XLSX.utils.json_to_sheet(filasExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Asistencia Estudiantes');

        const nombreArchivo = `Reporte_Asistencia_Estudiantes_${fechaInicioEst}_al_${fechaFinEst}.xlsx`;
        await descargarExcel(wb, nombreArchivo);
        setMsg({ ok: true, texto: `✅ Reporte Excel de estudiantes descargado/compartido (${datos.length} registros).` });
      } else {
        const columnasPDF = ['N°', 'DNI', 'Estudiante', 'Grado/Secc', 'Fecha', 'Entrada', 'Salida', 'Estado', 'Método'];
        const filasPDF = datos.map((e, index) => [
          index + 1,
          e.dni || '',
          `${e.apellido_paterno || ''} ${e.apellido_materno || ''}, ${e.nombres || ''}`.trim(),
          `${e.grado || ''} ${e.seccion || ''} (${e.nivel || ''})`.trim(),
          formatFecha(e.fecha),
          formatHora(e.hora_entrada),
          formatHora(e.hora_salida),
          e.estado_asistencia || '',
          e.metodo_entrada || 'QR',
        ]);
        const nombreArchivo = `Reporte_Asistencia_Estudiantes_${fechaInicioEst}_al_${fechaFinEst}.pdf`;
        await exportarTablaPDF({
          titulo: 'REPORTE DE ASISTENCIA DE ESTUDIANTES',
          subtitulo: `Período: del ${fechaInicioEst} al ${fechaFinEst} · Total: ${datos.length} registros`,
          columnas: columnasPDF,
          filas: filasPDF,
          nombreArchivo,
          orientacion: 'landscape',
        });
        setMsg({ ok: true, texto: `✅ Reporte PDF de estudiantes descargado/compartido (${datos.length} registros).` });
      }
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, texto: e.response?.data?.message || 'Error al generar reporte de estudiantes: ' + e.message });
    } finally {
      setGenerando(null);
    }
  };

  // 3. Reporte Consolidado de Matrículas / Estudiantes
  const descargarConsolidadoMatriculas = async (formato = 'excel') => {
    setGenerando(`matriculas_${formato}`);
    setMsg(null);
    try {
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

      const anioActual = new Date().getFullYear();

      if (formato === 'excel') {
        const filasExcel = datos.map((m, index) => ({
          'N°': index + 1,
          'DNI': m.dni || '',
          'Apellido Paterno': m.apellido_paterno || '',
          'Apellido Materno': m.apellido_materno || '',
          'Nombres': m.nombres || '',
          'Nivel': m.nivel || '',
          'Grado': m.grado || '',
          'Sección': m.seccion || '',
          'Año Académico': m.anio_academico || anioActual,
          'Estado Matrícula': m.estado_matricula || (m.estado ? 'ACTIVO' : 'INACTIVO'),
          'Fecha Registro': formatFecha(m.fecha_matricula || m.created_at),
        }));

        const ws = XLSX.utils.json_to_sheet(filasExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Padrón Matrículas');

        const nombreArchivo = `Consolidado_Matriculas_${anioActual}.xlsx`;
        await descargarExcel(wb, nombreArchivo);
        setMsg({ ok: true, texto: `✅ Consolidado Excel de matrículas descargado/compartido (${datos.length} registros).` });
      } else {
        const columnasPDF = ['N°', 'DNI', 'Estudiante', 'Nivel', 'Grado', 'Secc.', 'Año', 'Estado'];
        const filasPDF = datos.map((m, index) => [
          index + 1,
          m.dni || '',
          `${m.apellido_paterno || ''} ${m.apellido_materno || ''}, ${m.nombres || ''}`.trim(),
          m.nivel || '',
          m.grado || '',
          m.seccion || '',
          m.anio_academico || anioActual,
          m.estado_matricula || (m.estado ? 'ACTIVO' : 'INACTIVO'),
        ]);
        const nombreArchivo = `Consolidado_Matriculas_${anioActual}.pdf`;
        await exportarTablaPDF({
          titulo: 'CONSOLIDADO GENERAL DE MATRÍCULAS',
          subtitulo: `Año Académico ${anioActual} · Total: ${datos.length} estudiantes registrados`,
          columnas: columnasPDF,
          filas: filasPDF,
          nombreArchivo,
          orientacion: 'landscape',
        });
        setMsg({ ok: true, texto: `✅ Consolidado PDF de matrículas descargado/compartido (${datos.length} registros).` });
      }
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, texto: e.response?.data?.message || 'Error al generar consolidado de matrículas: ' + e.message });
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
          <div
            className={`flex gap-2 items-center rounded-xl px-4 py-3 text-sm font-semibold ${
              msg.ok
                ? 'bg-green-50 text-brand-green border border-brand-green'
                : 'bg-red-50 text-brand-red border border-brand-red'
            }`}
          >
            {msg.ok ? <CheckCircle size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
            <span>{msg.texto}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="text-center mb-5">
            <FileText size={44} className="mx-auto text-brand-blue mb-2 opacity-80" />
            <h2 className="font-bold text-brand-black text-base">Descarga de Reportes Oficiales</h2>
            <p className="text-xs text-gray-500">
              Genera y descarga en tu dispositivo (APK / Celular / PC) los reportes en formato <b>Excel (.xlsx)</b> o <b>PDF (.pdf)</b>.
            </p>
          </div>

          <div className="space-y-4">
            {/* 1. Reporte Docentes */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-brand-blue">Asistencia de Docentes</span>
                <span className="text-[11px] bg-blue-100 text-brand-blue font-semibold px-2 py-0.5 rounded-full">
                  Rango de fechas
                </span>
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
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => descargarReporteDocentes('excel')}
                  disabled={generando !== null}
                  className="flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-800 text-white px-3 py-2.5 rounded-xl font-semibold text-xs active:scale-95 transition-all disabled:opacity-50"
                >
                  {generando === 'docentes_excel' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={15} />
                  )}
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => descargarReporteDocentes('pdf')}
                  disabled={generando !== null}
                  className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2.5 rounded-xl font-semibold text-xs active:scale-95 transition-all disabled:opacity-50"
                >
                  {generando === 'docentes_pdf' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <FileText size={15} />
                  )}
                  <span>PDF (.pdf)</span>
                </button>
              </div>
            </div>

            {/* 2. Reporte Estudiantes */}
            <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-brand-green">Asistencia de Estudiantes</span>
                <span className="text-[11px] bg-green-100 text-brand-green font-semibold px-2 py-0.5 rounded-full">
                  Por fecha o rango
                </span>
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
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => descargarReporteEstudiantes('excel')}
                  disabled={generando !== null}
                  className="flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-800 text-white px-3 py-2.5 rounded-xl font-semibold text-xs active:scale-95 transition-all disabled:opacity-50"
                >
                  {generando === 'estudiantes_excel' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={15} />
                  )}
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => descargarReporteEstudiantes('pdf')}
                  disabled={generando !== null}
                  className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2.5 rounded-xl font-semibold text-xs active:scale-95 transition-all disabled:opacity-50"
                >
                  {generando === 'estudiantes_pdf' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <FileText size={15} />
                  )}
                  <span>PDF (.pdf)</span>
                </button>
              </div>
            </div>

            {/* 3. Consolidado Matrículas */}
            <div className="bg-yellow-50/50 border border-yellow-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-yellow-800">Consolidado de Matrículas</span>
                <span className="text-[11px] bg-yellow-100 text-yellow-800 font-semibold px-2 py-0.5 rounded-full">
                  Año escolar
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Padrón general con listado de estudiantes, grados, secciones y estado de matrícula.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => descargarConsolidadoMatriculas('excel')}
                  disabled={generando !== null}
                  className="flex items-center justify-center gap-1.5 bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-2.5 rounded-xl font-semibold text-xs active:scale-95 transition-all disabled:opacity-50"
                >
                  {generando === 'matriculas_excel' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={15} />
                  )}
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => descargarConsolidadoMatriculas('pdf')}
                  disabled={generando !== null}
                  className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2.5 rounded-xl font-semibold text-xs active:scale-95 transition-all disabled:opacity-50"
                >
                  {generando === 'matriculas_pdf' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <FileText size={15} />
                  )}
                  <span>PDF (.pdf)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 text-[11px] text-gray-500 text-center">
            📲 <b>En la aplicación APK / Celular:</b> Al presionar descargar, se guardará el archivo en tu dispositivo y se abrirá el selector para abrirlo con tu visor favorito o compartirlo directamente por WhatsApp, Drive o Correo.
          </div>
        </div>
      </div>
    </div>
  );
}
