import * as XLSX from 'xlsx';

/**
 * Descarga o comparte un libro de Excel en PC y Celulares (Android / iOS / Web).
 * @param {XLSX.WorkBook} workbook - Objeto de libro de trabajo XLSX
 * @param {string} nombreArchivo - Nombre del archivo con extensión .xlsx
 */
export async function descargarExcel(workbook, nombreArchivo) {
  try {
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const blob = new Blob([excelBuffer], { type: mimeType });

    // 1. En celulares (Android/iOS): intentar usar Web Share API para permitir guardar o enviar por WhatsApp/Drive
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
        if (shareErr.name === 'AbortError') {
          return { ok: true, metodo: 'cancelado' };
        }
        console.warn('Web Share falló, procediendo a descarga directa:', shareErr);
      }
    }

    // 2. Descarga directa con Blob URL
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

    // 3. Fallback directo con la librería XLSX
    XLSX.writeFile(workbook, nombreArchivo);
    return { ok: true, metodo: 'xlsx' };
  } catch (err) {
    console.error('Error al descargar Excel:', err);
    throw new Error('No se pudo generar ni descargar el archivo Excel: ' + err.message);
  }
}

/**
 * Descarga una imagen Blob o Canvas en PC y Celulares.
 * @param {Blob|string} imageBlobOrDataUrl - Blob de la imagen o dataURL
 * @param {string} nombreArchivo - Nombre del archivo .png
 */
export async function descargarImagen(imageBlobOrDataUrl, nombreArchivo) {
  try {
    let blob = imageBlobOrDataUrl;
    if (typeof imageBlobOrDataUrl === 'string' && imageBlobOrDataUrl.startsWith('data:')) {
      // Convertir dataURL a Blob
      const parts = imageBlobOrDataUrl.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const uInt8Array = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      blob = new Blob([uInt8Array], { type: contentType });
    }

    // Intentar Web Share API para móviles (permite guardar en Fotos o enviar por WhatsApp)
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

    // Descarga por enlace
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
