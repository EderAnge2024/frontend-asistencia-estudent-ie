import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { estudiantesService } from '../../services/estudiantes.service';
import { asistenciaEstudianteService } from '../../services/asistenciaEstudiante.service';
import {
  ArrowLeft, QrCode, CheckCircle, XCircle, Loader2,
  Users, Camera, CameraOff, BookOpen, AlertCircle, RefreshCw
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { registerPlugin } from '@capacitor/core';

const WifiPlugin = registerPlugin('WifiPlugin');

export default function AsistenciaEstudiantes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [tokenQR, setTokenQR] = useState('');
  const [resultado, setResultado] = useState(null); // { ok, mensaje, data }
  const [error, setError] = useState('');
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [iniciandoCamara, setIniciandoCamara] = useState(false);
  
  const inputRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const pausadoRef = useRef(false);

  const cargarEstudiantes = async () => {
    try {
      const res = await estudiantesService.misEstudiantes();
      setEstudiantes(res.data?.data || []);
    } catch (e) {
      console.warn('No se pudo cargar misEstudiantes:', e);
      setEstudiantes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEstudiantes();
    return () => {
      // Limpiar cámara al desmontar componente
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const procesarTokenQR = async (token) => {
    if (!token || !token.trim() || registrando) return;
    setRegistrando(true);
    setResultado(null);
    setError('');

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(100);
      }
      const res = await asistenciaEstudianteService.registrarQR({
        token_qr: token.trim(),
        dispositivo: 'Cámara Móvil / Lector QR',
      });
      const data = res.data?.data;
      setResultado({
        ok: true,
        mensaje: `Asistencia Registrada: ${data?.nombres || ''} ${data?.apellido_paterno || ''}`.trim() || 'Asistencia registrada con éxito',
        data
      });
      setTokenQR('');
      cargarEstudiantes();
    } catch (e) {
      const msg = e.response?.data?.message || 'Error al registrar asistencia por QR.';
      setResultado({ ok: false, mensaje: msg });
    } finally {
      setRegistrando(false);
      // Auto ocultar resultado luego de 4 segundos
      setTimeout(() => {
        setResultado(prev => (prev?.mensaje === token ? null : prev));
      }, 4000);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!tokenQR.trim()) return;
    await procesarTokenQR(tokenQR);
    inputRef.current?.focus();
  };

  const registrarManual = async (id_estudiante) => {
    setError('');
    try {
      await asistenciaEstudianteService.registrarManual({
        id_estudiante,
        estado_asistencia: 'PRESENTE',
      });
      setResultado({ ok: true, mensaje: 'Asistencia manual registrada correctamente.' });
      cargarEstudiantes();
      setTimeout(() => setResultado(null), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al registrar asistencia manual.');
    }
  };

  // Manejo de la Cámara
  const toggleCamara = async () => {
    if (camaraActiva) {
      detenerCamara();
    } else {
      await iniciarCamara();
    }
  };

  const iniciarCamara = async () => {
    setIniciandoCamara(true);
    setCamaraActiva(true);
    setError('');

    try {
      // 1. Solicitar permiso nativo de cámara en Android si está en la app
      try {
        if (WifiPlugin && WifiPlugin.requestCameraPermission) {
          await WifiPlugin.requestCameraPermission();
        }
      } catch (ePlugin) {
        console.warn('WifiPlugin.requestCameraPermission no disponible:', ePlugin);
      }

      // 2. Dar tiempo al navegador para renderizar el contenedor en el layout
      await new Promise((resolve) => setTimeout(resolve, 200));

      const qrRegionId = 'qr-reader-video';

      // Limpiar escáner anterior si existiera
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch (_) {}
      }

      const qrScanner = new Html5Qrcode(qrRegionId);
      html5QrCodeRef.current = qrScanner;

      // 3. Detectar cámaras disponibles y seleccionar cámara trasera
      let cameraConfig = { facingMode: 'environment' };
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const trasera = devices.find(d =>
            /back|rear|trasera|environment/i.test(d.label)
          ) || devices[devices.length - 1];
          if (trasera && trasera.id) {
            cameraConfig = trasera.id;
          }
        }
      } catch (errDev) {
        console.warn('No se pudo listar cámaras con getCameras:', errDev);
      }

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const edge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.max(200, Math.floor(edge * 0.7));
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: 1.0,
      };

      await qrScanner.start(
        cameraConfig,
        config,
        async (decodedText) => {
          if (pausadoRef.current) return;
          pausadoRef.current = true;
          await procesarTokenQR(decodedText);
          setTimeout(() => {
            pausadoRef.current = false;
          }, 2500);
        },
        () => {}
      );
    } catch (err) {
      console.error('Error al iniciar cámara:', err);
      setError('No se pudo abrir la cámara. Asegúrese de otorgar permisos de cámara a la aplicación en los Ajustes del celular.');
      setCamaraActiva(false);
    } finally {
      setIniciandoCamara(false);
    }
  };

  const detenerCamara = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error al detener cámara:', err);
      }
      html5QrCodeRef.current = null;
    }
    setCamaraActiva(false);
  };

  const presentes = estudiantes.filter(e => e._asistencia_hoy === 'PRESENTE').length;
  const totalHoy = estudiantes.filter(e => e._asistencia_hoy).length;

  const hoyStr = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
      {/* Header */}
      <div className="bg-brand-blue text-white pt-10 pb-4 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => { detenerCamara(); navigate(-1); }} className="p-2 bg-white/10 rounded-full active:scale-95">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold">Control de Asistencia Estudiantil</h1>
        </div>
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 text-sm">
          <BookOpen size={14} className="text-brand-yellow shrink-0" />
          <span className="font-semibold truncate">
            {user?.nivel || 'Nivel'} · {user?.grado ? `${user?.grado}°` : 'Grado'} · Sección {user?.seccion || 'Única'}
          </span>
        </div>
        <p className="text-xs text-white/60 mt-1 capitalize px-1">{hoyStr}</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Resumen de aula */}
        {!loading && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-brand-blue">{estudiantes.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Total Aula</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-brand-green">{presentes}</p>
              <p className="text-xs text-gray-400 mt-0.5">Presentes</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-brand-red">{estudiantes.length - totalHoy}</p>
              <p className="text-xs text-gray-400 mt-0.5">Pendientes</p>
            </div>
          </div>
        )}

        {/* Mensaje de Resultado de Escaneo */}
        {resultado && (
          <div className={`flex items-center gap-3 rounded-2xl px-4 py-4 shadow-md border text-sm font-semibold transition-all
            ${resultado.ok
              ? 'bg-green-50 border-brand-green text-brand-green'
              : 'bg-red-50 border-brand-red text-brand-red'}`}
          >
            {resultado.ok
              ? <CheckCircle size={24} className="shrink-0 text-brand-green" />
              : <XCircle size={24} className="shrink-0 text-brand-red" />
            }
            <div className="flex-1 min-w-0">
              <p className="font-bold">{resultado.mensaje}</p>
              {resultado.ok && resultado.data && (
                <p className="font-normal text-xs mt-0.5 text-gray-600">
                  Hora: {new Date().toLocaleTimeString('es-PE')} · Estado: {resultado.data.estado_asistencia || 'PRESENTE'}
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-brand-red rounded-xl px-4 py-3 text-brand-red text-sm">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </div>
        )}

        {/* MÓDULO DE ESCÁNER POR CÁMARA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera size={20} className="text-brand-blue" />
              <p className="font-bold text-brand-black text-sm">Escáner QR con Cámara</p>
            </div>
            {camaraActiva && (
              <span className="text-[11px] bg-green-100 text-brand-green font-semibold px-2 py-0.5 rounded-full animate-pulse">
                Cámara en vivo
              </span>
            )}
          </div>

          {/* Estilos para que el video HTML5 llene el marco en Android */}
          <style>{`
            #qr-reader-video {
              width: 100% !important;
              min-height: 280px !important;
              position: relative !important;
              background-color: #000 !important;
              border-radius: 1rem !important;
              overflow: hidden !important;
            }
            #qr-reader-video video {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
              display: block !important;
              border-radius: 1rem !important;
            }
            #qr-reader-video__scan_region {
              border: none !important;
            }
            #qr-reader-video__dashboard_section_csr {
              display: none !important;
            }
          `}</style>

          {/* Contenedor del video del escáner */}
          <div className={`${(camaraActiva || iniciandoCamara) ? 'block' : 'hidden'} relative rounded-2xl overflow-hidden bg-black aspect-square max-w-sm mx-auto shadow-inner`}>
            <div id="qr-reader-video" className="w-full h-full"></div>

            {iniciandoCamara && (
              <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-white gap-3 z-10">
                <Loader2 size={36} className="animate-spin text-brand-yellow" />
                <p className="text-xs font-semibold">Conectando con la cámara trasera...</p>
              </div>
            )}

            {!iniciandoCamara && camaraActiva && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                <div className="w-60 h-60 border-2 border-brand-yellow rounded-2xl opacity-80 animate-pulse"></div>
              </div>
            )}

            {registrando && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-2 z-20">
                <Loader2 size={32} className="animate-spin text-brand-yellow" />
                <p className="text-xs font-semibold">Registrando asistencia...</p>
              </div>
            )}
          </div>

          <button
            onClick={toggleCamara}
            disabled={iniciandoCamara}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all
              ${camaraActiva
                ? 'bg-red-50 text-brand-red border border-red-200 hover:bg-red-100'
                : 'bg-brand-blue text-white shadow-md shadow-brand-blue/20 hover:bg-blue-900'}`}
          >
            {iniciandoCamara ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Iniciando cámara...</span>
              </>
            ) : camaraActiva ? (
              <>
                <CameraOff size={18} />
                <span>Detener Cámara</span>
              </>
            ) : (
              <>
                <Camera size={18} />
                <span>Activar Cámara para Escanear</span>
              </>
            )}
          </button>

          {/* Input de texto alternativo / pistola lectora */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1.5 flex items-center gap-1">
              <QrCode size={14} className="text-gray-400" /> O ingresa el código del token manualmente:
            </p>
            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                placeholder="Token o código QR..."
                value={tokenQR}
                onChange={e => setTokenQR(e.target.value)}
                disabled={registrando}
              />
              <button
                type="submit"
                disabled={registrando || !tokenQR.trim()}
                className="bg-brand-yellow text-brand-black px-4 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all"
              >
                {registrando ? <Loader2 size={16} className="animate-spin" /> : 'OK'}
              </button>
            </form>
          </div>
        </div>

        {/* Lista de estudiantes del aula */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 font-semibold uppercase">Estudiantes del Aula</p>
            <button onClick={cargarEstudiantes} className="text-xs text-brand-blue font-semibold flex items-center gap-1">
              <RefreshCw size={12} /> Actualizar
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={28} className="animate-spin text-brand-blue" /></div>
          ) : estudiantes.length === 0 ? (
            <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-gray-100 p-4">
              <Users size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No hay estudiantes asignados a esta sección.</p>
              <p className="text-xs text-gray-400 mt-1">Los estudiantes matriculados aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {estudiantes.map((est, i) => {
                const yaRegistro = est._asistencia_hoy === 'PRESENTE';
                return (
                  <div key={est.id_estudiante || i} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-400 w-5 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-brand-black text-sm truncate">
                        {est.apellido_paterno} {est.apellido_materno}, {est.nombres}
                      </p>
                      {est.dni && <p className="text-xs text-gray-400">DNI: {est.dni}</p>}
                    </div>

                    {yaRegistro ? (
                      <span className="text-xs bg-green-100 text-brand-green font-bold px-2.5 py-1 rounded-full">
                        ✓ Presente
                      </span>
                    ) : (
                      <button
                        onClick={() => registrarManual(est.id_estudiante)}
                        className="text-xs bg-brand-green/10 text-brand-green font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-all hover:bg-brand-green/20"
                      >
                        ✓ Manual
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
