import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { asistenciaDocenteService } from '../../services/asistenciaDocente.service';
import {
  LogOut, User, MapPin, Clock, CheckCircle, XCircle,
  Users, QrCode, ClipboardList, AlertCircle, Loader2, BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ESTADO_COLOR = {
  PRESENTE: 'text-brand-green',
  TARDANZA: 'text-brand-yellow',
  FALTA: 'text-brand-red',
  JUSTIFICADO: 'text-brand-lightblue',
};

export default function DocenteDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [asistenciaHoy, setAsistenciaHoy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marcando, setMarcando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarAsistencia = useCallback(async () => {
    try {
      const res = await asistenciaDocenteService.miAsistencia({});
      setAsistenciaHoy(res.data?.data?.[0] || null);
    } catch {
      setAsistenciaHoy(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarAsistencia(); }, [cargarAsistencia]);

  const obtenerUbicacion = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GPS no disponible en este dispositivo.'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitud: pos.coords.latitude, longitud: pos.coords.longitude }),
      (err) => {
        if (err.code === 1) reject(new Error('Permiso de ubicación denegado. Actívalo en configuración.'));
        else if (err.code === 2) reject(new Error('No se pudo obtener la ubicación. Verifica que el GPS esté activado.'));
        else reject(new Error('Tiempo de espera agotado al obtener la ubicación.'));
      },
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    );
  });

  const marcarEntrada = async () => {
    setMarcando(true); setError(''); setMensaje('');
    try {
      const coords = await obtenerUbicacion();
      const res = await asistenciaDocenteService.registrarEntrada({
        latitud: coords.latitud,
        longitud: coords.longitud,
        dispositivo: navigator.userAgent,
      });
      setMensaje(`✅ Entrada registrada — ${res.data?.data?.estado_asistencia}`);
      cargarAsistencia();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Error al registrar entrada.');
    } finally {
      setMarcando(false);
    }
  };

  const marcarSalida = async () => {
    setMarcando(true); setError(''); setMensaje('');
    try {
      const coords = await obtenerUbicacion();
      await asistenciaDocenteService.registrarSalida({
        latitud: coords.latitud,
        longitud: coords.longitud,
        dispositivo: navigator.userAgent,
      });
      setMensaje('✅ Salida registrada correctamente.');
      cargarAsistencia();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Error al registrar salida.');
    } finally {
      setMarcando(false);
    }
  };

  const fechaHoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const yaEntro  = !!asistenciaHoy?.hora_entrada;
  const yaSalio  = !!asistenciaHoy?.hora_salida;

  const formatHora = (ts) => ts
    ? new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
      {/* Header */}
      <div className="bg-brand-blue text-white pt-10 pb-5 px-5 shadow-lg rounded-b-3xl">
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-xl font-bold text-brand-yellow">AsistenciaDoc</h1>
          <button onClick={logout} className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all">
            <LogOut size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center border-2 border-brand-yellow shrink-0">
            <User size={28} className="text-brand-blue" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-brand-lightblue font-semibold uppercase tracking-wide">{user?.rol}</p>
            <h2 className="text-lg font-bold truncate">{user?.nombres} {user?.apellidos}</h2>
            <p className="text-xs text-white/70 truncate">{user?.institucion_nombre}</p>
          </div>
        </div>

        {/* Sección asignada */}
        {user?.tutor && (
          <div className="mt-4 bg-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
            <BookOpen size={16} className="text-brand-yellow shrink-0" />
            <span className="text-sm font-semibold">
              {user.nivel} · {user.grado} · Sección {user.seccion}
            </span>
            <span className="ml-auto text-xs bg-brand-yellow text-brand-black px-2 py-0.5 rounded-full font-bold">Tutor</span>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 pt-5 space-y-4">
        {/* Fecha */}
        <p className="text-center text-sm text-gray-500 capitalize font-medium">{fechaHoy}</p>

        {/* Mensajes */}
        {mensaje && (
          <div className="bg-green-50 border border-brand-green rounded-xl px-4 py-3 flex items-center gap-2 text-brand-green text-sm font-semibold">
            <CheckCircle size={18} /> {mensaje}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-brand-red rounded-xl px-4 py-3 flex items-center gap-2 text-brand-red text-sm font-semibold">
            <XCircle size={18} /> {error}
          </div>
        )}

        {/* Tarjeta estado asistencia */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase mb-3">Mi asistencia hoy</p>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 size={24} className="animate-spin text-brand-blue" /></div>
          ) : (
            <div className="flex gap-4">
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <Clock size={18} className="mx-auto text-brand-blue mb-1" />
                <p className="text-xs text-gray-400">Entrada</p>
                <p className="text-base font-bold text-brand-black">{formatHora(asistenciaHoy?.hora_entrada)}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <Clock size={18} className="mx-auto text-brand-green mb-1" />
                <p className="text-xs text-gray-400">Salida</p>
                <p className="text-base font-bold text-brand-black">{formatHora(asistenciaHoy?.hora_salida)}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <AlertCircle size={18} className="mx-auto text-brand-yellow mb-1" />
                <p className="text-xs text-gray-400">Estado</p>
                <p className={`text-sm font-bold ${ESTADO_COLOR[asistenciaHoy?.estado_asistencia] || 'text-gray-400'}`}>
                  {asistenciaHoy?.estado_asistencia || 'Sin registro'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Botones de marcado */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={marcarEntrada}
            disabled={marcando || yaEntro}
            className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl font-bold text-sm transition-all active:scale-95
              ${yaEntro
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-brand-blue text-white shadow-md shadow-brand-blue/30 hover:bg-blue-800'}`}
          >
            {marcando ? <Loader2 size={24} className="animate-spin" /> : <MapPin size={24} />}
            <span>{yaEntro ? '✓ Entrada registrada' : 'Marcar Entrada'}</span>
          </button>
          <button
            onClick={marcarSalida}
            disabled={marcando || !yaEntro || yaSalio}
            className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl font-bold text-sm transition-all active:scale-95
              ${(!yaEntro || yaSalio)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-brand-green text-white shadow-md shadow-brand-green/30 hover:bg-green-700'}`}
          >
            {marcando ? <Loader2 size={24} className="animate-spin" /> : <MapPin size={24} />}
            <span>{yaSalio ? '✓ Salida registrada' : 'Marcar Salida'}</span>
          </button>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {user?.tutor && (
            <QuickCard
              icon={<QrCode size={26} />}
              label="Asistencia Estudiantes"
              color="bg-brand-yellow text-brand-black"
              onClick={() => navigate('/docente/asistencia-estudiantes')}
            />
          )}
          {user?.tutor && (
            <QuickCard
              icon={<Users size={26} />}
              label="Mis Estudiantes"
              color="bg-brand-lightblue text-white"
              onClick={() => navigate('/docente/mis-estudiantes')}
            />
          )}
          <QuickCard
            icon={<ClipboardList size={26} />}
            label="Mi Historial"
            color="bg-white text-brand-blue border border-gray-200"
            onClick={() => navigate('/docente/historial')}
          />
        </div>
      </div>
    </div>
  );
}

function QuickCard({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl font-semibold text-sm shadow-sm active:scale-95 transition-all ${color}`}
    >
      {icon}
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}
