import XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Solicita permisos de almacenamiento en Android si es necesario.
 */
export async function solicitarPermisosAlmacenamiento() {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Filesystem.checkPermissions();
      if (status.publicStorage !== 'granted') {
        const res = await Filesystem.requestPermissions();
        return res.publicStorage === 'granted';
      }
      return true;
    } catch (e) {
      console.warn('Verificación o solicitud de permisos de almacenamiento:', e);
      return false;
    }
  }
  return true;
}

/**
 * Guarda un archivo en el dispositivo y abre el diálogo nativo de Compartir/Guardar en Android/iOS.
 */
async function guardarYCompartirNativo({ nombreArchivo, dataBase64, mimeType, titulo, texto }) {
  await solicitarPermisosAlmacenamiento();

  let savedFile;
  try {
    // 1. Intentar escribir en el directorio Documents del dispositivo
    savedFile = await Filesystem.writeFile({
      path: nombreArchivo,
      data: dataBase64,
      directory: Directory.Documents,
      recursive: true,
    });
  } catch (docErr) {
    console.warn('No se pudo guardar en Documents, usando Cache:', docErr);
    // Fallback a Cache (siempre accesible sin restricciones de permisos)
    savedFile = await Filesystem.writeFile({
      path: nombreArchivo,
      data: dataBase64,
      directory: Directory.Cache,
      recursive: true,
    });
  }

  // 2. Invocar diálogo nativo de Android (Guardar en Drive, Guardar en Archivos, Compartir en WhatsApp, etc.)
  try {
    await Share.share({
      title: titulo || nombreArchivo,
      text: texto || `Descarga de archivo: ${nombreArchivo}`,
      url: savedFile.uri,
      dialogTitle: `Guardar o compartir ${nombreArchivo}`,
    });
    return { ok: true, metodo: 'share', uri: savedFile.uri };
  } catch (shareErr) {
    if (
      shareErr.name === 'AbortError' ||
      shareErr.message?.toLowerCase().includes('cancel') ||
      shareErr.message?.toLowerCase().includes('dismiss')
    ) {
      return { ok: true, metodo: 'guardado_local', uri: savedFile.uri };
    }
    console.warn('Share nativo finalizó:', shareErr);
    return { ok: true, metodo: 'guardado_local', uri: savedFile.uri };
  }
}

/**
 * Descarga o comparte un libro de Excel en PC y Celulares (Android / iOS / Web).
 * @param {XLSX.WorkBook} workbook - Objeto de libro de trabajo XLSX
 * @param {string} nombreArchivo - Nombre del archivo con extensión .xlsx
 */
export async function descargarExcel(workbook, nombreArchivo) {
  try {
    // A) En APK / Android / iOS nativo con Capacitor
    if (Capacitor.isNativePlatform()) {
      const base64Data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      return await guardarYCompartirNativo({
        nombreArchivo,
        dataBase64: base64Data,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        titulo: nombreArchivo,
        texto: `Reporte Excel oficial: ${nombreArchivo}`,
      });
    }

    // B) En Navegador Web (PC o Móvil Web)
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const blob = new Blob([excelBuffer], { type: mimeType });

    if (typeof navigator !== 'undefined' && navigator.canShare) {
      try {
        const file = new File([blob], nombreArchivo, { type: mimeType, lastModified: Date.now() });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: nombreArchivo,
            text: `Reporte generado: ${nombreArchivo}`,
          });
          return { ok: true, metodo: 'share' };
        }
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') return { ok: true, metodo: 'cancelado' };
        console.warn('Web Share falló, procediendo a descarga directa:', shareErr);
      }
    }

    if (typeof window !== 'undefined') {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 2000);

      return { ok: true, metodo: 'download' };
    }

    XLSX.writeFile(workbook, nombreArchivo);
    return { ok: true, metodo: 'xlsx' };
  } catch (err) {
    console.error('Error al descargar Excel:', err);
    throw new Error('No se pudo generar ni descargar el archivo Excel: ' + err.message);
  }
}

/**
 * Descarga una imagen Blob, dataURL o Canvas en PC y Celulares.
 * @param {Blob|string} imageBlobOrDataUrl - Blob de la imagen o dataURL
 * @param {string} nombreArchivo - Nombre del archivo .png
 */
export async function descargarImagen(imageBlobOrDataUrl, nombreArchivo) {
  try {
    // A) En APK / Android / iOS nativo
    if (Capacitor.isNativePlatform()) {
      let base64Data = '';
      if (typeof imageBlobOrDataUrl === 'string') {
        base64Data = imageBlobOrDataUrl.includes(',')
          ? imageBlobOrDataUrl.split(',')[1]
          : imageBlobOrDataUrl;
      } else if (imageBlobOrDataUrl instanceof Blob) {
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result;
            resolve(typeof res === 'string' && res.includes(',') ? res.split(',')[1] : res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(imageBlobOrDataUrl);
        });
      }

      return await guardarYCompartirNativo({
        nombreArchivo,
        dataBase64: base64Data,
        mimeType: 'image/png',
        titulo: nombreArchivo,
        texto: `Credencial QR: ${nombreArchivo}`,
      });
    }

    // B) En Navegador Web
    let blob = imageBlobOrDataUrl;
    if (typeof imageBlobOrDataUrl === 'string' && imageBlobOrDataUrl.startsWith('data:')) {
      const parts = imageBlobOrDataUrl.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const uInt8Array = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      blob = new Blob([uInt8Array], { type: contentType });
    }

    if (typeof navigator !== 'undefined' && navigator.canShare && blob instanceof Blob) {
      try {
        const file = new File([blob], nombreArchivo, { type: 'image/png', lastModified: Date.now() });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: nombreArchivo,
            text: `Credencial QR: ${nombreArchivo}`,
          });
          return { ok: true, metodo: 'share' };
        }
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') return { ok: true, metodo: 'cancelado' };
      }
    }

    const url = blob instanceof Blob ? window.URL.createObjectURL(blob) : imageBlobOrDataUrl;
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      if (blob instanceof Blob) window.URL.revokeObjectURL(url);
    }, 2000);

    return { ok: true, metodo: 'download' };
  } catch (err) {
    console.error('Error al descargar imagen:', err);
    throw new Error('No se pudo descargar la imagen: ' + err.message);
  }
}

/**
 * Descarga o comparte un archivo PDF (instancia jsPDF) en PC y Celulares.
 * @param {jsPDF} doc - Instancia de jsPDF
 * @param {string} nombreArchivo - Nombre del archivo con extensión .pdf
 */
export async function descargarPDF(doc, nombreArchivo) {
  try {
    if (Capacitor.isNativePlatform()) {
      const dataUri = doc.output('datauristring');
      const base64Data = dataUri.split(',')[1];
      return await guardarYCompartirNativo({
        nombreArchivo,
        dataBase64: base64Data,
        mimeType: 'application/pdf',
        titulo: nombreArchivo,
        texto: `Reporte PDF: ${nombreArchivo}`,
      });
    }

    // Web / PC
    doc.save(nombreArchivo);
    return { ok: true, metodo: 'download' };
  } catch (err) {
    console.error('Error al descargar PDF:', err);
    throw new Error('No se pudo generar ni descargar el archivo PDF: ' + err.message);
  }
}

/**
 * Genera un reporte en PDF a partir de una tabla con formato y encabezado oficial.
 */
export async function exportarTablaPDF({
  titulo,
  subtitulo,
  columnas,
  filas,
  nombreArchivo,
  orientacion = 'portrait',
}) {
  const doc = new jsPDF({
    orientation: orientacion,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = orientacion === 'landscape' ? 297 : 210;
  const pageHeight = orientacion === 'landscape' ? 210 : 297;

  // Cabecera institucional azul
  doc.setFillColor(0, 51, 102);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(230, 230, 230);
  doc.text(subtitulo || `Fecha de emisión: ${new Date().toLocaleDateString('es-PE')}`, 14, 18);

  // Tabla usando autoTable
  autoTable(doc, {
    startY: 28,
    head: [columnas],
    body: filas,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [0, 51, 102],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [247, 250, 252],
    },
    margin: { left: 10, right: 10 },
  });

  // Numeración de páginas en pie
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Sistema de Asistencias IE · Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  return await descargarPDF(doc, nombreArchivo);
}

/**
 * Genera un PDF de Credencial Escolar con QR oficial.
 */
export async function exportarCredencialQRPDF({ estudiante, credencial, qrDataUrl, nombreArchivo }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [100, 150], // Formato tarjeta escolar
  });

  // Fondo blanco y marco institucional
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(1.5);
  doc.rect(3, 3, 94, 144);

  // Cabecera institucional
  doc.setFillColor(0, 51, 102);
  doc.rect(4, 4, 92, 22, 'F');

  doc.setTextColor(255, 204, 0); // Amarillo
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CREDENCIAL ESCOLAR QR', 50, 12, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('SISTEMA DE ASISTENCIAS IE', 50, 18, { align: 'center' });

  // Estudiante
  const nombreCompleto = `${estudiante.nombres} ${estudiante.apellido_paterno} ${estudiante.apellido_materno || ''}`.trim();
  doc.setTextColor(0, 51, 102);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(nombreCompleto, 50, 36, { align: 'center' });

  if (estudiante.dni) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`DNI: ${estudiante.dni}`, 50, 42, { align: 'center' });
  }

  // QR Image
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', 15, 48, 70, 70);
  }

  // Detalle pie
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  const fecha = credencial?.fecha_emision
    ? new Date(credencial.fecha_emision).toLocaleDateString('es-PE')
    : new Date().toLocaleDateString('es-PE');
  doc.text(`Emisión: ${fecha}`, 50, 125, { align: 'center' });
  if (credencial?.token_qr) {
    doc.text(`Token: ${credencial.token_qr.slice(0, 16)}...`, 50, 131, { align: 'center' });
  }

  return await descargarPDF(doc, nombreArchivo);
}

export const NOMBRES_MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

/**
 * Crea una hoja de cálculo (Worksheet) de Excel con el formato de matriz mensual
 * idéntico al registro pedagógico escolar peruano:
 * - Días hábiles de lunes a viernes (L, M, M, J, V)
 * - Iniciales P (Presente), T (Tardanza), F (Falta), J (Justificado)
 * - Totales por estudiante
 */
export function crearHojaMatrizMensual({ estudiantes, mes, anio, tituloHoja }) {
  const diasSemanaLetra = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const diasEnMes = new Date(anio, mes, 0).getDate();
  const diasLectivos = [];

  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(anio, mes - 1, d);
    const dayOfWeek = fecha.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Lunes a Viernes
      diasLectivos.push({
        dia: d,
        letra: diasSemanaLetra[dayOfWeek],
      });
    }
  }

  const nombreMes = NOMBRES_MESES[mes - 1] || `MES ${mes}`;
  const tituloPrincipal = (tituloHoja || `ASISTENCIA ${nombreMes} ${anio}`).toUpperCase();

  // Fila 0 (Excel 1): vacía
  const r0 = [];
  // Fila 1 (Excel 2): Título centrado
  const r1 = ['', '', '', tituloPrincipal];
  // Fila 2 (Excel 3): vacía
  const r2 = [];
  // Fila 3 (Excel 4): DIAS DE LA SEMANA
  const r3 = ['', '', '', 'DIAS DE LA SEMANA'];
  // Fila 4 (Excel 5): Cabecera con Letras de días
  const r4 = ['N°', 'DNI', 'Apellidos y nombres'];
  diasLectivos.forEach(dl => r4.push(dl.letra));
  r4.push('TOTAL P', 'TOTAL T', 'TOTAL F', 'TOTAL J');

  // Fila 5 (Excel 6): Números de días
  const r5 = ['', '', ''];
  diasLectivos.forEach(dl => r5.push(dl.dia));
  r5.push('', '', '', '');

  const aoa = [r0, r1, r2, r3, r4, r5];

  // Filas de datos
  estudiantes.forEach((est, idx) => {
    const nombreCompleto = `${est.apellido_paterno || ''} ${est.apellido_materno || ''}, ${est.nombres || ''}`.trim().toUpperCase();
    const fila = [idx + 1, est.dni || '', nombreCompleto];

    let pCount = 0;
    let tCount = 0;
    let fCount = 0;
    let jCount = 0;

    diasLectivos.forEach(dl => {
      const val = est.dias?.[dl.dia] || '';
      fila.push(val);
      if (val === 'P') pCount++;
      else if (val === 'T') tCount++;
      else if (val === 'F') fCount++;
      else if (val === 'J') jCount++;
    });

    fila.push(pCount, tCount, fCount, jCount);
    aoa.push(fila);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Configurar anchos de columnas
  const cols = [
    { wch: 5 },  // A: N°
    { wch: 12 }, // B: DNI
    { wch: 38 }, // C: Apellidos y nombres
  ];
  diasLectivos.forEach(() => cols.push({ wch: 4.5 }));
  cols.push({ wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 });
  ws['!cols'] = cols;

  // Merges
  const ultColIndex = 3 + diasLectivos.length - 1;
  const merges = [
    // Título principal en fila 1 (Excel fila 2): D2 a última columna
    { s: { r: 1, c: 3 }, e: { r: 1, c: Math.max(3, ultColIndex) } },
    // "DIAS DE LA SEMANA" en fila 3 (Excel fila 4): D4 a última columna de días
    { s: { r: 3, c: 3 }, e: { r: 3, c: Math.max(3, ultColIndex) } },
    // N°: merge filas 4 y 5 (r: 4, c: 0 a r: 5, c: 0)
    { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
    // DNI: merge filas 4 y 5 (r: 4, c: 1 a r: 5, c: 1)
    { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },
    // Apellidos y nombres: merge filas 4 y 5 (r: 4, c: 2 a r: 5, c: 2)
    { s: { r: 4, c: 2 }, e: { r: 5, c: 2 } },
    // TOTAL P: merge filas 4 y 5
    { s: { r: 4, c: ultColIndex + 1 }, e: { r: 5, c: ultColIndex + 1 } },
    // TOTAL T: merge filas 4 y 5
    { s: { r: 4, c: ultColIndex + 2 }, e: { r: 5, c: ultColIndex + 2 } },
    // TOTAL F: merge filas 4 y 5
    { s: { r: 4, c: ultColIndex + 3 }, e: { r: 5, c: ultColIndex + 3 } },
    // TOTAL J: merge filas 4 y 5
    { s: { r: 4, c: ultColIndex + 4 }, e: { r: 5, c: ultColIndex + 4 } },
  ];
  ws['!merges'] = merges;

  // Aplicar estilos y colores idénticos al registro pedagógico escolar
  const bordeGris = { style: 'thin', color: { rgb: 'D0D7DE' } };
  const bordes = { top: bordeGris, bottom: bordeGris, left: bordeGris, right: bordeGris };

  // Fila 1 (Excel fila 2): Título centrado
  const refTitulo = XLSX.utils.encode_cell({ r: 1, c: 3 });
  if (ws[refTitulo]) {
    ws[refTitulo].s = {
      font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: '0F5132' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // Fila 3 (Excel fila 4): DIAS DE LA SEMANA
  const refDiasSemana = XLSX.utils.encode_cell({ r: 3, c: 3 });
  if (ws[refDiasSemana]) {
    ws[refDiasSemana].s = {
      fill: { fgColor: { rgb: '0F5132' } }, // Verde oscuro oficial
      font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: bordes,
    };
  }

  // Fila 4 (Excel fila 5): Cabeceras
  for (let c = 0; c < 3; c++) {
    const ref = XLSX.utils.encode_cell({ r: 4, c });
    if (ws[ref]) {
      ws[ref].s = {
        fill: { fgColor: { rgb: '0F5132' } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: bordes,
      };
    }
  }
  diasLectivos.forEach((_, i) => {
    const ref = XLSX.utils.encode_cell({ r: 4, c: 3 + i });
    if (ws[ref]) {
      ws[ref].s = {
        fill: { fgColor: { rgb: '198754' } }, // Verde medio
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: bordes,
      };
    }
  });
  for (let c = ultColIndex + 1; c <= ultColIndex + 4; c++) {
    const ref = XLSX.utils.encode_cell({ r: 4, c });
    if (ws[ref]) {
      ws[ref].s = {
        fill: { fgColor: { rgb: '0F5132' } },
        font: { name: 'Calibri', sz: 9, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: bordes,
      };
    }
  }

  // Fila 5 (Excel fila 6): Números de días (fondo verde suave)
  diasLectivos.forEach((_, i) => {
    const ref = XLSX.utils.encode_cell({ r: 5, c: 3 + i });
    if (ws[ref]) {
      ws[ref].s = {
        fill: { fgColor: { rgb: 'D1E7DD' } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F5132' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: bordes,
      };
    }
  });

  // Filas de datos de estudiantes
  estudiantes.forEach((est, idx) => {
    const r = 6 + idx;
    const refNum = XLSX.utils.encode_cell({ r, c: 0 });
    if (ws[refNum]) ws[refNum].s = { alignment: { horizontal: 'center' }, border: bordes, font: { sz: 9.5 } };

    const refDni = XLSX.utils.encode_cell({ r, c: 1 });
    if (ws[refDni]) ws[refDni].s = { alignment: { horizontal: 'center' }, border: bordes, font: { sz: 9.5 } };

    const refNom = XLSX.utils.encode_cell({ r, c: 2 });
    if (ws[refNom]) ws[refNom].s = { alignment: { horizontal: 'left' }, border: bordes, font: { sz: 9.5 } };

    diasLectivos.forEach((dl, i) => {
      const c = 3 + i;
      const ref = XLSX.utils.encode_cell({ r, c });
      const val = est.dias?.[dl.dia] || '';
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };

      if (val === 'P') {
        ws[ref].s = {
          fill: { fgColor: { rgb: 'D1E7DD' } }, // Verde suave
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F5132' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: bordes,
        };
      } else if (val === 'T') {
        ws[ref].s = {
          fill: { fgColor: { rgb: 'FFF3CD' } }, // Amarillo suave
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '856404' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: bordes,
        };
      } else if (val === 'F') {
        ws[ref].s = {
          fill: { fgColor: { rgb: 'F8D7DA' } }, // Rojo suave
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '842029' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: bordes,
        };
      } else if (val === 'J') {
        ws[ref].s = {
          fill: { fgColor: { rgb: 'CFF4FC' } }, // Celeste suave
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '055160' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: bordes,
        };
      } else {
        ws[ref].s = { alignment: { horizontal: 'center' }, border: bordes };
      }
    });

    for (let c = ultColIndex + 1; c <= ultColIndex + 4; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref]) {
        ws[ref].s = {
          alignment: { horizontal: 'center' },
          border: bordes,
          font: { bold: true, sz: 9.5 },
        };
      }
    }
  });

  return ws;
}

/**
 * Exporta el libro de Excel con la matriz mensual coloreada (P/T/F/J por día).
 */
export async function exportarMatrizMensualExcel({
  estudiantes = [],
  mes,
  anio,
  tituloGeneral = 'REPORTE MENSUAL DE ASISTENCIA',
  nombreArchivo,
  agruparPorGradoSeccion = false,
}) {
  const wb = XLSX.utils.book_new();
  const nombreMes = NOMBRES_MESES[mes - 1] || `MES_${mes}`;

  if (agruparPorGradoSeccion) {
    const grupos = {};
    estudiantes.forEach(est => {
      const nivel = est.nivel || '';
      const grado = est.grado ? `${est.grado}°` : '';
      const seccion = est.seccion ? `Secc ${est.seccion}` : '';
      const clave = `${nivel} ${grado} ${seccion}`.trim() || 'General';
      if (!grupos[clave]) grupos[clave] = [];
      grupos[clave].push(est);
    });

    const nombresGrupos = Object.keys(grupos);
    if (nombresGrupos.length === 0) {
      throw new Error('No se encontraron estudiantes para generar el reporte.');
    }

    nombresGrupos.forEach(grupo => {
      const tituloHoja = `${grupo} - ${nombreMes} ${anio}`;
      const ws = crearHojaMatrizMensual({
        estudiantes: grupos[grupo],
        mes,
        anio,
        tituloHoja,
      });
      const nombrePestana = grupo.slice(0, 31).replace(/[:\\\/\?\*\[\]]/g, '_');
      XLSX.utils.book_append_sheet(wb, ws, nombrePestana);
    });
  } else {
    const ws = crearHojaMatrizMensual({
      estudiantes,
      mes,
      anio,
      tituloHoja: `${tituloGeneral} - ${nombreMes} ${anio}`,
    });
    const nombrePestana = `${nombreMes} ${anio}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, nombrePestana);
  }

  const finalName = nombreArchivo || `Informe_Asistencia_Estudiantes_${nombreMes}_${anio}.xlsx`;
  return await descargarExcel(wb, finalName);
}

/**
 * Exporta el informe mensual en PDF (formato horizontal A4) con las celdas coloreadas.
 */
export async function exportarMatrizMensualPDF({
  estudiantes = [],
  mes,
  anio,
  tituloGeneral = 'REPORTE MENSUAL DE ASISTENCIA',
  nombreArchivo,
  agruparPorGradoSeccion = false,
}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const nombreMes = NOMBRES_MESES[mes - 1] || `MES_${mes}`;
  const diasSemanaLetra = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const diasEnMes = new Date(anio, mes, 0).getDate();
  const diasLectivos = [];

  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(anio, mes - 1, d);
    const dayOfWeek = fecha.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      diasLectivos.push({ dia: d, letra: diasSemanaLetra[dayOfWeek] });
    }
  }

  let tablas = [];
  if (agruparPorGradoSeccion) {
    const grupos = {};
    estudiantes.forEach(est => {
      const nivel = est.nivel || '';
      const grado = est.grado ? `${est.grado}°` : '';
      const seccion = est.seccion ? `Secc ${est.seccion}` : '';
      const clave = `${nivel} ${grado} ${seccion}`.trim() || 'General';
      if (!grupos[clave]) grupos[clave] = [];
      grupos[clave].push(est);
    });
    tablas = Object.keys(grupos).map(k => ({
      titulo: `${k} - ${nombreMes} ${anio}`,
      lista: grupos[k],
    }));
  } else {
    tablas = [{
      titulo: `${tituloGeneral} - ${nombreMes} ${anio}`,
      lista: estudiantes,
    }];
  }

  tablas.forEach((t, tIdx) => {
    if (tIdx > 0) doc.addPage('a4', 'landscape');

    // Cabecera institucional
    doc.setFillColor(15, 81, 50); // Verde oscuro
    doc.rect(0, 0, 297, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(t.titulo, 10, 8);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Leyenda: P = Presente (Verde) · T = Tardanza (Amarillo) · F = Falta (Rojo) · J = Justificado (Celeste)`, 10, 14);

    const columnas = ['N°', 'DNI', 'Apellidos y nombres', ...diasLectivos.map(dl => `${dl.letra}\n${dl.dia}`), 'P', 'T', 'F', 'J'];

    const filas = t.lista.map((est, idx) => {
      const nombre = `${est.apellido_paterno || ''} ${est.apellido_materno || ''}, ${est.nombres || ''}`.trim();
      let pCount = 0, tCount = 0, fCount = 0, jCount = 0;
      const celdasDias = diasLectivos.map(dl => {
        const v = est.dias?.[dl.dia] || '';
        if (v === 'P') pCount++;
        else if (v === 'T') tCount++;
        else if (v === 'F') fCount++;
        else if (v === 'J') jCount++;
        return v;
      });
      return [idx + 1, est.dni || '', nombre, ...celdasDias, pCount, tCount, fCount, jCount];
    });

    autoTable(doc, {
      startY: 21,
      head: [columnas],
      body: filas,
      theme: 'grid',
      styles: {
        fontSize: 6.5,
        cellPadding: 0.8,
        halign: 'center',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [15, 81, 50],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.5,
      },
      columnStyles: {
        0: { cellWidth: 7 },
        1: { cellWidth: 15 },
        2: { cellWidth: 40, halign: 'left' },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const val = String(data.cell.raw || '');
          if (val === 'P') {
            data.cell.styles.fillColor = [209, 231, 221]; // verde claro
            data.cell.styles.textColor = [15, 81, 50];    // verde oscuro
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'T') {
            data.cell.styles.fillColor = [255, 243, 205]; // amarillo claro
            data.cell.styles.textColor = [133, 100, 4];   // marrón/dorado
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'F') {
            data.cell.styles.fillColor = [248, 215, 218]; // rojo claro
            data.cell.styles.textColor = [132, 32, 41];   // rojo oscuro
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'J') {
            data.cell.styles.fillColor = [207, 244, 252]; // celeste
            data.cell.styles.textColor = [5, 81, 96];     // azul oscuro
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: 6, right: 6 },
    });
  });

  const finalName = nombreArchivo || `Informe_Asistencia_Estudiantes_${nombreMes}_${anio}.pdf`;
  return await descargarPDF(doc, finalName);
}
