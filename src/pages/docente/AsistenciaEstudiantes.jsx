import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { estudiantesService } from '../../services/estudiantes.service';
import { asistenciaEstudianteService } from '../../services/asistenciaEstudiante.service';
import {
  ArrowLeft, QrCode, CheckCircle, XCircle, Loader2,
  Users, Camera, BookOpen, AlertCircle
} from 'lucide-react';

export default function AsistenciaEstudiantes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [tokenQR, setTokenQR] = useState('');
  const [resultado, setResultado] = useState(null); // { ok, mensaje, estudiante }
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await estudiantesService.misEstudiantes();
        setEstudiantes(res.data?.data || []);
      } catch {
        setEstudiantes([]);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const presentes = estudiantes.filter(e => e._asistencia_hoy === 'PRESENTE').length;
  const totalHoy = estudiantes.filter(e => e._asistencia_hoy).length;

  const registrarQR = async (e) => {
    e.preventDefault();
    if (!tokenQR.trim()) return;
    setRegistrando(true); setResultado(null); setError('');
    try {
      const res = await asistenciaEstudianteService.registrarQR({
        token_qr: tokenQR.trim(),
        dispositivo: navigator.userAgent,
      });
      const data = res.data?.data;
      setResultado({ ok: true, mensaje: 'Asistencia registrada', data });
      setTokenQR('');
      setTimeout(() => setResultado(null), 4000);
    } catch (e) {
      const msg = e.response?.data?.message || 'Error al registrar asistencia.';
      setResultado({ ok: false, mensaje: msg });
      setTimeout(() => setResultado(null), 4000);
    } finally {
      setRegistrando(false);
      inputRef.current?.focus();
    }
  };

  const registrarManual = async (id_estudiante) => {
    setError('');
    try {
      await asistenciaEstudianteService.registrarManual({
        id_estudiante,
        estado_asistencia: 'PRESENTE',
      });
      setResultado({ ok: true, mensaje: 'Asistencia manual registrada.' });
      setTimeout(() => setResultado(null), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al registrar asistencia manual.');
    }
  };

  const fecha = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
      {/* Header */}
      <div className="bg-brand-blue text-white pt-10 pb-4 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full active:scale-95">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold">Control de Asistencia</h1>
        </div>
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 text-sm">
          <BookOpen size={14} className="text-brand-yellow" />
          <span className="font-semibold">{user?.nivel} · {user?.grado} · Sección {user?.seccion}</span>
        </div>
        <p className="text-xs text-white/60 mt-1 capitalize px-1">{fecha}</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Resumen rápido */}
        {!loading && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-brand-blue">{estudiantes.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Total</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-brand-green">{presentes}</p>
              <p className="text-xs text-gray-400 mt-0.5">Presentes</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-brand-red">{estudiantes.length - totalHoy}</p>
              <p className="text-xs text-gray-400 mt-0.5">Sin registro</p>
            </div>
          </div>
        )}

        {/* Resultado flash */}
        {resultado && (
          <div className={`flex items-center gap-3 rounded-2xl px-4 py-4 shadow-md border text-sm font-semibold
            ${resultado.ok
              ? 'bg-green-50 border-brand-green text-brand-green'
              : 'bg-red-50 border-brand-red text-brand-red'}`}
          >
            {resultado.ok
              ? <CheckCircle size={22} className="shrink-0" />
              : <XCircle size={22} className="shrink-0" />
            }
            <div>
              <p>{resultado.mensaje}</p>
              {resultado.ok && resultado.data && (
                <p className="font-normal text-xs mt-0.5 text-gray-600">
                  ID Estudiante: {resultado.data.id_estudiante} · {resultado.data.estado_asistencia}
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

        {/* Escáner QR (input de texto que recibe el resultado del lector) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <QrCode size={20} className="text-brand-blue" />
            <p className="font-bold text-brand-black">Escanear QR del estudiante</p>
          </div>
          <form onSubmit={registrarQR} className="flex gap-2">
            <input
              ref={inputRef}
              autoFocus
              className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              placeholder="Apunta el lector QR aquí..."
              value={tokenQR}
              onChange={e => setTokenQR(e.target.value)}
              disabled={registrando}
            />
            <button
              type="submit"
              disabled={registrando || !tokenQR.trim()}
              className="bg-brand-blue text-white px-4 rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-95 transition-all"
            >
              {registrando ? <Loader2 size={18} className="animate-spin" /> : 'OK'}
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">
            💡 Usa un lector QR conectado al celular o escribe el código manualmente.
          </p>
        </div>

        {/* Lista de estudiantes */}
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Lista del aula</p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={28} className="animate-spin text-brand-blue" /></div>
          ) : estudiantes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users size={40} className="mx-auto mb-2 opacity-30" />
              <p>No hay estudiantes en tu sección.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {estudiantes.map((est, i) => (
                <div key={est.id_estudiante} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-black text-sm truncate">
                      {est.apellido_paterno} {est.apellido_materno}, {est.nombres}
                    </p>
                    {est.dni && <p className="text-xs text-gray-400">DNI: {est.dni}</p>}
                  </div>
                  <button
                    onClick={() => registrarManual(est.id_estudiante)}
                    className="text-xs bg-brand-green/10 text-brand-green font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-all hover:bg-brand-green/20"
                  >
                    ✓ Manual
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
