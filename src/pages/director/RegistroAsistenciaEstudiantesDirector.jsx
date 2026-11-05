import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { asistenciaEstudianteService } from '../../services/asistenciaEstudiante.service';
import {
  ArrowLeft, QrCode, CheckCircle, XCircle, Loader2,
  Users, Camera, CameraOff, Search, AlertCircle, RefreshCw,
  LogIn, LogOut, UserCheck, Clock, ShieldCheck
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { registerPlugin } from '@capacitor/core';

const WifiPlugin = registerPlugin('WifiPlugin');

export default function RegistroAsistenciaEstudiantesDirector() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados principales
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [tokenQR, setTokenQR] = useState('');
  const [resultado, setResultado] = useState(null); // { ok, mensaje, data, esSalida, esCompleto }
  const [error, setError] = useState('');
  const [modoRegistro, setModoRegistro] = useState('INGRESO'); // 'INGRESO' | 'SALIDA'

  // Cámara QR
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [iniciandoCamara, setIniciandoCamara] = useState(false);
  const html5QrCodeRef = useRef(null);
  const pausadoRef = useRef(false);
  const inputRef = useRef(null);

  // Filtros de búsqueda para el director
  const [busqueda, setBusqueda] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroGrado, setFiltroGrado] = useState('');
  const [filtroSeccion, setFiltroSeccion] = useState('');

  // Cargar estudiantes de la institución
  const cargarEstudiantes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await asistenciaEstudianteService.buscarParaDirector({
        busqueda: busqueda.trim() || undefined,
        nivel: filtroNivel || undefined,
        grado: filtroGrado || undefined,
        seccion: filtroSeccion || undefined,
      });
      setEstudiantes(res.data?.data || []);
    } catch (e) {
      console.warn('Error al buscar estudiantes para director:', e);
      setError(e.response?.data?.message || 'Error al consultar estudiantes.');
      setEstudiantes([]);
    } finally {
      setLoading(false);
    }
  }, [busqueda, filtroNivel, filtroGrado, filtroSeccion]);

  useEffect(() => {
    cargarEstudiantes();
  }, [cargarEstudiantes]);

  // Limpiar cámara al desmontar
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Procesar código QR
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
        dispositivo: 'Panel Director / Cámara Móvil',
        modo: modoRegistro,
      });
      const data = res.data?.data;
      const esSalida = data?._accion === 'SALIDA' || modoRegistro === 'SALIDA';
      const nombreEstudiante = `${data?.apellido_paterno || ''} ${data?.nombres || ''}`.trim();
      const detalleAula = data?.grado ? `${data?.nivel || ''} · ${data?.grado}° ${data?.seccion || ''}` : '';
      const horaFormateada = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

      setResultado({
        ok: true,
        esSalida,
        mensaje: esSalida
          ? `✅ Salida registrada: ${nombreEstudiante}`
          : `✅ Ingreso registrado: ${nombreEstudiante}`,
        detalleAula,
        hora: horaFormateada,
        data,
      });
      setTokenQR('');
      cargarEstudiantes();
    } catch (e) {
      const codigo = e.response?.data?.code || e.response?.data?.errorCode;
      const msg = e.response?.data?.message || 'Error al procesar asistencia por QR.';
      setResultado({
        ok: codigo === 'ATTENDANCE_COMPLETE',
        esCompleto: codigo === 'ATTENDANCE_COMPLETE',
        mensaje: msg,
      });
    } finally {
      setRegistrando(false);
      setTimeout(() => setResultado(null), 6000);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!tokenQR.trim()) return;
    await procesarTokenQR(tokenQR);
    inputRef.current?.focus();
  };

  // Registro Manual de Ingreso por el Director (Determina PRESENTE o TARDANZA automáticamente)
  const registrarIngresoManual = async (id_estudiante, estadoForzado = null) => {
    setError('');
    setRegistrando(true);
    try {
      const payload = {
        id_estudiante,
        modo: 'INGRESO',
      };
      if (estadoForzado) {
        payload.estado_asistencia = estadoForzado;
      }
      const res = await asistenciaEstudianteService.registrarManual(payload);
      const data = res.data?.data;
      const horaFormateada = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

      setResultado({
        ok: true,
        esSalida: false,
        mensaje: `✅ Ingreso manual registrado (${data?.estado_asistencia || 'OK'})`,
        hora: horaFormateada,
        data,
      });
      cargarEstudiantes();
      setTimeout(() => setResultado(null), 5000);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al registrar ingreso manual.');
    } finally {
      setRegistrando(false);
    }
  };

  // Registro Manual de Salida por el Director
  const registrarSalidaManual = async (id_estudiante) => {
    setError('');
    setRegistrando(true);
    try {
      const res = await asistenciaEstudianteService.registrarSalida(id_estudiante);
      const data = res.data?.data;
      const horaFormateada = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

      setResultado({
        ok: true,
        esSalida: true,
        mensaje: '✅ Salida manual registrada correctamente.',
        hora: horaFormateada,
        data,
      });
      cargarEstudiantes();
      setTimeout(() => setResultado(null), 5000);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al registrar salida.');
    } finally {
      setRegistrando(false);
    }
  };

  // Cámara QR
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
      try {
        if (WifiPlugin && WifiPlugin.requestCameraPermission) {
          await WifiPlugin.requestCameraPermission();
        }
      } catch (ePlugin) {
        console.warn('WifiPlugin.requestCameraPermission no disponible:', ePlugin);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      const qrRegionId = 'qr-reader-director';

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
      setError('No se pudo abrir la cámara. Verifique los permisos de cámara en la app o navegador.');
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

  // Métricas rápidas de los estudiantes listados
  const presentes = estudiantes.filter(e => e._asistencia_hoy === 'PRESENTE').length;
  const tardanzas = estudiantes.filter(e => e._asistencia_hoy === 'TARDANZA').length;
  const totalConRegistro = estudiantes.filter(e => e._asistencia_hoy).length;

  const hoyStr = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-8">
      {/* Header Institucional del Director */}
      <div className="bg-brand-blue text-white pt-10 pb-5 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => { detenerCamara(); navigate('/director'); }}
            className="p-2 bg-white/10 rounded-full active:scale-95 transition-all"
            aria-label="Volver al panel"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight truncate">Registro de Asistencia de Estudiantes</h1>
            <p className="text-xs text-brand-lightblue flex items-center gap-1.5 font-medium">
              <ShieldCheck size={14} className="text-brand-yellow shrink-0" />
              <span>Módulo del Director · Cobertura Institucional Toda la IE</span>
            </p>
          </div>
        </div>
        <p className="text-xs text-white/70 capitalize px-1">{hoyStr}</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Resumen institucional rápido */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100">
            <p className="text-xl font-bold text-brand-blue">{estudiantes.length}</p>
            <p className="text-[10px] text-gray-400">Listados</p>
          </div>
          <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100">
            <p className="text-xl font-bold text-brand-green">{presentes}</p>
            <p className="text-[10px] text-gray-400">Presentes</p>
          </div>
          <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100">
            <p className="text-xl font-bold text-yellow-600">{tardanzas}</p>
            <p className="text-[10px] text-gray-400">Tardanzas</p>
          </div>
          <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100">
            <p className="text-xl font-bold text-brand-red">{Math.max(0, estudiantes.length - totalConRegistro)}</p>
            <p className="text-[10px] text-gray-400">Sin Registro</p>
          </div>
        </div>

        {/* Mensaje de Resultado de Escaneo / Confirmación Visual */}
        {resultado && (() => {
          const esCompleto = resultado.esCompleto;
          const esSalida = resultado.esSalida;
          const clases = esCompleto
            ? 'bg-blue-50 border-blue-400 text-blue-700'
            : esSalida
              ? 'bg-amber-50 border-amber-400 text-amber-800'
              : resultado.ok
                ? 'bg-green-50 border-brand-green text-brand-green'
                : 'bg-red-50 border-brand-red text-brand-red';

          const Icono = esCompleto ? AlertCircle : esSalida ? CheckCircle : resultado.ok ? CheckCircle : XCircle;

          return (
            <div className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 shadow-md border text-sm font-semibold transition-all ${clases}`}>
              <Icono size={22} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold">{resultado.mensaje}</p>
                {resultado.detalleAula && (
                  <p className="text-xs font-semibold text-gray-700 mt-0.5">
                    Aula: {resultado.detalleAula}
                  </p>
                )}
                {resultado.hora && (
                  <p className="font-normal text-xs text-gray-600 mt-0.5">
                    Hora: {resultado.hora}
                    {resultado.data?.estado_asistencia && ` · Estado: ${resultado.data.estado_asistencia}`}
                  </p>
                )}
              </div>
              <button onClick={() => setResultado(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
          );
        })()}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-brand-red rounded-xl px-4 py-3 text-brand-red text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-brand-red font-bold">✕</button>
          </div>
        )}

        {/* SELECTOR EXPLICITO DE ACCION: INGRESO O SALIDA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Acción a registrar:</span>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
              modoRegistro === 'INGRESO' ? 'bg-blue-100 text-brand-blue' : 'bg-amber-100 text-amber-800'
            }`}>
              {modoRegistro === 'INGRESO' ? 'Modo Ingreso Activo' : 'Modo Salida Activo'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setModoRegistro('INGRESO');
                setError('');
              }}
              className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                modoRegistro === 'INGRESO'
                  ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20 ring-2 ring-brand-blue/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
              }`}
            >
              <LogIn size={18} className={modoRegistro === 'INGRESO' ? 'text-brand-yellow' : 'text-gray-400'} />
              <span>1. Ingreso</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModoRegistro('SALIDA');
                setError('');
              }}
              className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                modoRegistro === 'SALIDA'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 ring-2 ring-amber-600/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
              }`}
            >
              <LogOut size={18} className={modoRegistro === 'SALIDA' ? 'text-amber-200' : 'text-gray-400'} />
              <span>2. Salida</span>
            </button>
          </div>

          <p className={`text-[11px] font-medium px-2 py-1.5 rounded-lg flex items-center gap-1.5 ${
            modoRegistro === 'INGRESO' ? 'bg-blue-50/70 text-brand-blue' : 'bg-amber-50/70 text-amber-900'
          }`}>
            <Clock size={14} className="shrink-0" />
            <span>
              {modoRegistro === 'INGRESO'
                ? 'El sistema determina automáticamente PRESENTE o TARDANZA según el horario y tolerancia configurados.'
                : 'Modo Salida registra la hora de término de la jornada escolar.'}
            </span>
          </p>
        </div>

        {/* MÓDULO 1: ESCÁNER QR */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera size={20} className={modoRegistro === 'INGRESO' ? 'text-brand-blue' : 'text-amber-600'} />
              <p className="font-bold text-brand-black text-sm">
                Escáner QR ({modoRegistro === 'INGRESO' ? 'Ingreso' : 'Salida'})
              </p>
            </div>
            {camaraActiva && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-brand-green animate-pulse">
                Cámara Activa
              </span>
            )}
          </div>

          <style>{`
            #qr-reader-director {
              width: 100% !important;
              min-height: 260px !important;
              position: relative !important;
              background-color: #000 !important;
              border-radius: 1rem !important;
              overflow: hidden !important;
            }
            #qr-reader-director video {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
              display: block !important;
              border-radius: 1rem !important;
            }
            #qr-reader-director__scan_region {
              border: none !important;
            }
            #qr-reader-director__dashboard_section_csr {
              display: none !important;
            }
          `}</style>

          <div className={`${(camaraActiva || iniciandoCamara) ? 'block' : 'hidden'} relative rounded-2xl overflow-hidden bg-black aspect-square max-w-xs mx-auto shadow-inner`}>
            <div id="qr-reader-director" className="w-full h-full"></div>

            {iniciandoCamara && (
              <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-white gap-3 z-10">
                <Loader2 size={32} className="animate-spin text-brand-yellow" />
                <p className="text-xs font-semibold">Iniciando cámara...</p>
              </div>
            )}

            {!iniciandoCamara && camaraActiva && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                <div className="w-56 h-56 border-2 border-brand-yellow rounded-2xl opacity-80 animate-pulse"></div>
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
                : modoRegistro === 'INGRESO'
                  ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20 hover:bg-blue-900'
                  : 'bg-amber-600 text-white shadow-md shadow-amber-600/20 hover:bg-amber-700'}`}
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
                <span>Activar Cámara ({modoRegistro === 'INGRESO' ? 'Registrar Ingreso' : 'Registrar Salida'})</span>
              </>
            )}
          </button>

          {/* Lector de código o pistola escáner */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1.5 flex items-center gap-1">
              <QrCode size={14} className="text-gray-400" /> O ingresa el token QR / pistola lectora:
            </p>
            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                placeholder="Token o código del QR..."
                value={tokenQR}
                onChange={e => setTokenQR(e.target.value)}
                disabled={registrando}
              />
              <button
                type="submit"
                disabled={registrando || !tokenQR.trim()}
                className={`px-4 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all text-white ${
                  modoRegistro === 'INGRESO' ? 'bg-brand-blue hover:bg-blue-900' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {registrando ? <Loader2 size={16} className="animate-spin" /> : modoRegistro === 'INGRESO' ? 'Ingreso' : 'Salida'}
              </button>
            </form>
          </div>
        </div>

        {/* MÓDULO 2: BUSCADOR Y REGISTRO MANUAL DE ESTUDIANTES */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search size={18} className="text-brand-blue" />
              <h2 className="font-bold text-brand-black text-sm">Búsqueda y Registro Manual</h2>
            </div>
            <button
              onClick={cargarEstudiantes}
              disabled={loading}
              className="text-xs text-brand-blue font-semibold flex items-center gap-1 active:scale-95"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualizar
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Localiza a cualquier estudiante de la institución por <b>Nombres, Apellidos o DNI</b> para registrar su asistencia sin necesidad del código QR.
          </p>

          {/* Campo de búsqueda por texto */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por DNI, nombres o apellidos..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600 bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros por Nivel, Grado y Sección */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Nivel</label>
              <select
                value={filtroNivel}
                onChange={e => setFiltroNivel(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="">Todos los niveles</option>
                <option value="Primaria">Primaria</option>
                <option value="Secundaria">Secundaria</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Grado</label>
              <select
                value={filtroGrado}
                onChange={e => setFiltroGrado(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="">Todos</option>
                {['1', '2', '3', '4', '5', '6'].map(g => (
                  <option key={g} value={g}>{g}°</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Sección</label>
              <select
                value={filtroSeccion}
                onChange={e => setFiltroSeccion(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="">Todas</option>
                {['A', 'B', 'C', 'D', 'UNICA'].map(s => (
                  <option key={s} value={s}>Secc. {s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* LISTADO DE ESTUDIANTES */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-gray-500 font-semibold uppercase">Estudiantes ({estudiantes.length})</p>
            {registrando && <span className="text-xs text-brand-blue font-bold flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Procesando...</span>}
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={32} className="animate-spin text-brand-blue" />
            </div>
          ) : estudiantes.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 p-6 text-gray-400">
              <Users size={44} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-gray-600">No se encontraron estudiantes.</p>
              <p className="text-xs text-gray-400 mt-1">Verifica los términos de búsqueda o filtros seleccionados.</p>
            </div>
          ) : (
            estudiantes.map((est, i) => {
              const asistencia = est._asistencia_hoy;
              const tieneSalida = Boolean(est._hora_salida_hoy);

              return (
                <div
                  key={est.id_estudiante || i}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-gray-200"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xs font-bold text-gray-400 w-6 pt-0.5 text-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-brand-black text-sm truncate">
                        {est.apellido_paterno} {est.apellido_materno || ''}, {est.nombres}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {est.dni && (
                          <span className="text-xs text-gray-500 font-medium">
                            DNI: {est.dni}
                          </span>
                        )}
                        <span className="text-[10px] bg-blue-50 text-brand-blue font-bold px-2 py-0.5 rounded-md">
                          {est.nivel} · {est.grado}° {est.seccion}
                        </span>
                        {tieneSalida && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                            ✓ Jornada Completa
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones de Asistencia */}
                  <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                    {asistencia ? (
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            asistencia === 'PRESENTE' ? 'bg-green-100 text-brand-green' :
                            asistencia === 'TARDANZA' ? 'bg-yellow-100 text-yellow-800' :
                            asistencia === 'JUSTIFICADO' ? 'bg-blue-100 text-brand-blue' :
                            'bg-red-100 text-brand-red'
                          }`}>
                            {asistencia === 'PRESENTE' ? '✓ Presente' : asistencia}
                          </span>

                          {!tieneSalida && modoRegistro === 'SALIDA' && (
                            <button
                              onClick={() => registrarSalidaManual(est.id_estudiante)}
                              disabled={registrando}
                              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                              title="Registrar salida"
                            >
                              <LogOut size={13} /> Salida
                            </button>
                          )}
                        </div>

                        {est._hora_entrada_hoy && (
                          <span className="text-[10px] text-gray-400">
                            ↑ {new Date(est._hora_entrada_hoy).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                            {tieneSalida
                              ? ` · ↓ ${new Date(est._hora_salida_hoy).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
                              : ' · Salida pendiente'}
                          </span>
                        )}
                      </div>
                    ) : (
                      modoRegistro === 'INGRESO' ? (
                        <div className="flex items-center gap-1.5">
                          {/* Botón regular: cálculo automático según horario y tolerancia */}
                          <button
                            onClick={() => registrarIngresoManual(est.id_estudiante)}
                            disabled={registrando}
                            className="text-xs bg-brand-green hover:bg-green-700 text-white font-bold px-3.5 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 shadow-sm shadow-green-600/20 disabled:opacity-50"
                            title="Registrar ingreso regular (evalúa PRESENTE / TARDANZA automáticamente)"
                          >
                            <UserCheck size={14} />
                            <span>Registrar Ingreso</span>
                          </button>

                          {/* Menú de excepciones manuales para el director */}
                          <button
                            onClick={() => registrarIngresoManual(est.id_estudiante, 'JUSTIFICADO')}
                            disabled={registrando}
                            className="text-[11px] bg-blue-50 text-brand-blue border border-blue-200 hover:bg-blue-100 font-semibold px-2 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-50"
                            title="Registrar como Justificado"
                          >
                            Justificar
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                          Sin ingreso registrado
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
