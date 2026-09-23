import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { estudiantesService } from '../../services/estudiantes.service';
import { qrService } from '../../services/qr.service';
import { ArrowLeft, QrCode, Search, Loader2, RefreshCw, XCircle, CheckCircle, AlertCircle, Printer, Eye, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

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
                      <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm shrink-0">
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
                        <button
                          onClick={() => setQrModal({ estudiante: e, credencial: cred })}
                          className="mt-1 text-xs text-brand-blue font-bold flex items-center gap-1 hover:underline"
                        >
                          <Eye size={12} /> Ver / Imprimir Credencial
                        </button>
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

      {/* Modal Ver / Imprimir Credencial QR */}
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
                <div className="bg-white p-4 rounded-2xl border-2 border-brand-blue/20 shadow-md">
                  <QRCodeSVG value={qrModal.credencial.token_qr} size={180} level="H" includeMargin={true} />
                </div>
              </div>

              <p className="text-xs text-gray-400 font-mono">
                ID: {qrModal.credencial.token_qr?.slice(0, 18)}...
              </p>

              <div className="pt-2 flex gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-brand-yellow text-brand-black font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95"
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

