import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { estudiantesService } from '../../services/estudiantes.service';
import { qrService } from '../../services/qr.service';
import { ArrowLeft, QrCode, Search, Loader2, RefreshCw, XCircle, CheckCircle, AlertCircle, Printer, Eye, X, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { descargarImagen } from '../../utils/exportador';

export default function GestionQR() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState({}); // { id_estudiante: credencial }
  const [generando, setGenerando] = useState(null);
  const [msg, setMsg] = useState(null);
  const [qrModal, setQrModal] = useState(null); // { estudiante, credencial }

  const buscar = async () => {
    if (!busqueda.trim()) return;
    setLoading(true);
    try {
      const res = await estudiantesService.listar({ busqueda, estado: true });
      const lista = res.data?.data || [];
      setEstudiantes(lista);
      // Cargar QRs de cada estudiante
      const qrs = {};
      await Promise.all(lista.map(async e => {
        try {
          const r = await qrService.obtenerPorEstudiante(e.id_estudiante);
          qrs[e.id_estudiante] = r.data?.data || null;
        } catch { qrs[e.id_estudiante] = null; }
      }));
      setQrData(qrs);
    } finally { setLoading(false); }
  };

  const generarQR = async (id_estudiante) => {
    setGenerando(id_estudiante); setMsg(null);
    try {
      const res = await qrService.generar(id_estudiante);
      const nueva = res.data?.data;
      setQrData(p => ({ ...p, [id_estudiante]: nueva }));
      setMsg({ ok: true, texto: 'QR generado correctamente.' });
    } catch (e) {
      setMsg({ ok: false, texto: e.response?.data?.message || 'Error al generar QR.' });
    } finally { setGenerando(null); }
  };

  const invalidarQR = async (id_estudiante, id_credencial) => {
    setMsg(null);
    try {
      await qrService.invalidar(id_credencial);
      setQrData(p => ({ ...p, [id_estudiante]: null }));
      setMsg({ ok: true, texto: 'Credencial invalidada.' });
    } catch (e) {
      setMsg({ ok: false, texto: e.response?.data?.message || 'Error al invalidar.' });
    }
  };

  const descargarQR = (estudiante, credencial) => {
    try {
      const containerId = qrModal ? 'qr-modal-svg' : `qr-svg-${estudiante.id_estudiante}`;
      const container = document.getElementById(containerId);
      const svg = container ? container.querySelector('svg') : document.querySelector('svg');

      if (!svg) {
        setMsg({ ok: false, texto: 'No se encontró el elemento QR para exportar.' });
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const DOMURL = window.URL || window.webkitURL || window;
      const url = DOMURL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = 600;
        const height = 750;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Fondo blanco
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Borde institucional
        ctx.strokeStyle = '#003366';
        ctx.lineWidth = 6;
        ctx.strokeRect(12, 12, width - 24, height - 24);

        // Cabecera institucional
        ctx.fillStyle = '#003366';
        ctx.fillRect(18, 18, width - 36, 95);

        ctx.fillStyle = '#FFCC00';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CREDENCIAL ESCOLAR QR', width / 2, 58);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText('SISTEMA DE ASISTENCIAS IE', width / 2, 88);

        // Datos del estudiante
        ctx.fillStyle = '#003366';
        ctx.font = 'bold 22px Arial, sans-serif';
        const nombreCompleto = `${estudiante.nombres} ${estudiante.apellido_paterno} ${estudiante.apellido_materno || ''}`.trim();
        ctx.fillText(nombreCompleto, width / 2, 150);

        if (estudiante.dni) {
          ctx.fillStyle = '#555555';
          ctx.font = '16px Arial, sans-serif';
          ctx.fillText(`DNI: ${estudiante.dni}`, width / 2, 180);
        }

        // Dibujar el QR centrado
        const qrSize = 380;
        const qrX = (width - qrSize) / 2;
        const qrY = 210;
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        // Pie
        ctx.fillStyle = '#888888';
        ctx.font = '12px Arial, sans-serif';
        ctx.fillText(`Emitido: ${new Date(credencial.fecha_emision || Date.now()).toLocaleDateString('es-PE')} · Token: ${credencial.token_qr?.slice(0, 14)}...`, width / 2, 640);

        DOMURL.revokeObjectURL(url);

        const nombreLimpio = `${estudiante.dni || estudiante.id_estudiante}_${estudiante.nombres.replace(/\s+/g, '_')}`;
        const nombreArchivo = `QR_${nombreLimpio}.png`;
        descargarImagen(canvas.toDataURL('image/png'), nombreArchivo);
        setMsg({ ok: true, texto: `✅ Imagen QR de ${estudiante.nombres} descargada correctamente.` });
      };

      img.src = url;
    } catch (err) {
      console.error('Error al exportar QR:', err);
      setMsg({ ok: false, texto: 'Error al exportar la imagen del QR.' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
      <div className="bg-brand-blue text-white pt-10 pb-4 px-5 rounded-b-3xl shadow-md print:hidden">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full active:scale-95"><ArrowLeft size={18} /></button>
          <h1 className="text-lg font-bold">Credenciales QR</h1>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-white/10 text-white placeholder-white/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder="Buscar estudiante por nombre o DNI..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
          />
          <button onClick={buscar} disabled={loading}
            className="bg-brand-yellow text-brand-black px-4 rounded-xl font-bold text-sm active:scale-95">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3 print:hidden">
        {msg && (
          <div className={`flex gap-2 items-center rounded-xl px-4 py-3 text-sm font-semibold
            ${msg.ok ? 'bg-green-50 text-brand-green border border-brand-green' : 'bg-red-50 text-brand-red border border-brand-red'}`}>
            {msg.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {msg.texto}
          </div>
        )}

        {estudiantes.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400">
            <QrCode size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Busca un estudiante para gestionar su QR.</p>
          </div>
        )}

        {estudiantes.map(e => {
          const cred = qrData[e.id_estudiante];
          const activo = cred && cred.estado;
          const expirado = cred?.fecha_expiracion && new Date(cred.fecha_expiracion) < new Date();
          return (
            <div key={e.id_estudiante} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-brand-blue/10 rounded-full flex items-center justify-center shrink-0">
                  <QrCode size={18} className="text-brand-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-brand-black text-sm truncate">{e.apellido_paterno} {e.apellido_materno}, {e.nombres}</p>
                  {e.dni && <p className="text-xs text-gray-400">DNI: {e.dni}</p>}
                </div>
              </div>

              {cred ? (
                <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Estado</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activo && !expirado ? 'bg-green-100 text-brand-green' : 'bg-red-100 text-brand-red'}`}>
                      {!activo ? 'Invalidado' : expirado ? 'Expirado' : 'Activo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 pt-1">
                    {cred.token_qr && (
                      <div id={`qr-svg-${e.id_estudiante}`} className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm shrink-0">
                        <QRCodeSVG value={cred.token_qr} size={64} level="M" />
                      </div>
                    )}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Emitido:</span>
                        <span className="text-xs font-medium">{new Date(cred.fecha_emision).toLocaleDateString('es-PE')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Token:</span>
                        <span className="text-xs font-mono text-gray-600 truncate max-w-[120px]">{cred.token_qr?.slice(0, 8)}...</span>
                      </div>
                      {activo && !expirado && (
                        <div className="pt-1 flex flex-col gap-1">
                          <button
                            onClick={() => setQrModal({ estudiante: e, credencial: cred })}
                            className="text-xs text-brand-blue font-bold flex items-center gap-1 hover:underline text-left"
                          >
                            <Eye size={12} /> Ver / Imprimir Credencial
                          </button>
                          <button
                            onClick={() => descargarQR(e, cred)}
                            className="text-xs text-brand-green font-bold flex items-center gap-1 hover:underline text-left"
                          >
                            <Download size={12} /> Descargar Imagen QR (PNG)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-3">Sin credencial QR generada.</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => generarQR(e.id_estudiante)}
                  disabled={generando === e.id_estudiante}
                  className="flex-1 bg-brand-blue text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95">
                  {generando === e.id_estudiante ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {cred ? 'Reemitir QR' : 'Generar QR'}
                </button>
                {cred && activo && !expirado && (
                  <button onClick={() => invalidarQR(e.id_estudiante, cred.id_credencial)}
                    className="flex-1 bg-red-50 text-brand-red py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95">
                    <XCircle size={14} /> Invalidar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Ver / Imprimir / Descargar Credencial QR */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl relative">
            <button
              onClick={() => setQrModal(null)}
              className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 print:hidden"
            >
              <X size={16} />
            </button>

            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="text-sm uppercase font-bold text-gray-400 tracking-wider">Credencial Estudiantil</h3>
                <p className="text-lg font-bold text-brand-blue mt-1">
                  {qrModal.estudiante.nombres}
                </p>
                <p className="text-sm font-semibold text-brand-black">
                  {qrModal.estudiante.apellido_paterno} {qrModal.estudiante.apellido_materno}
                </p>
                {qrModal.estudiante.dni && (
                  <p className="text-xs text-gray-500 mt-0.5">DNI: {qrModal.estudiante.dni}</p>
                )}
              </div>

              <div className="flex justify-center py-2">
                <div id="qr-modal-svg" className="bg-white p-4 rounded-2xl border-2 border-brand-blue/20 shadow-md">
                  <QRCodeSVG value={qrModal.credencial.token_qr} size={180} level="H" includeMargin={true} />
                </div>
              </div>

              <p className="text-xs text-gray-400 font-mono">
                ID: {qrModal.credencial.token_qr?.slice(0, 18)}...
              </p>

              <div className="pt-2 flex flex-col gap-2 print:hidden">
                <button
                  onClick={() => descargarQR(qrModal.estudiante, qrModal.credencial)}
                  className="w-full bg-brand-green text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                >
                  <Download size={16} /> Descargar Imagen QR
                </button>
                <button
                  onClick={() => window.print()}
                  className="w-full bg-brand-yellow text-brand-black font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                >
                  <Printer size={16} /> Imprimir QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
