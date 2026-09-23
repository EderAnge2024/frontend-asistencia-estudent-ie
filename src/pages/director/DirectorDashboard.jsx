import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { asistenciaDocenteService } from '../../services/asistenciaDocente.service';
import { asistenciaEstudianteService } from '../../services/asistenciaEstudiante.service';
import {
  LogOut, User, MapPin, Users, QrCode, Settings,
  CalendarDays, ClipboardList, BarChart3, BookOpen, Loader2, ChevronRight
} from 'lucide-react';

export default function DirectorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [resumenDoc, setResumenDoc] = useState(null);
  const [resumenEst, setResumenEst] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [rDoc, rEst] = await Promise.all([
          asistenciaDocenteService.resumen({}).catch(() => null),
          asistenciaEstudianteService.resumen({}).catch(() => null),
        ]);
        setResumenDoc(rDoc?.data?.data || null);
        setResumenEst(rEst?.data?.data || null);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const hoy = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

  const menus = [
    { icon: <Users size={22} />, label: 'Estudiantes', path: '/director/estudiantes', color: 'text-brand-blue bg-blue-50' },
    { icon: <BookOpen size={22} />, label: 'Matrículas', path: '/director/matriculas', color: 'text-purple-600 bg-purple-50' },
    { icon: <QrCode size={22} />, label: 'Credenciales QR', path: '/director/qr', color: 'text-brand-yellow bg-yellow-50' },
    { icon: <ClipboardList size={22} />, label: 'Asistencia Docentes', path: '/director/asistencia-docentes', color: 'text-brand-green bg-green-50' },
    { icon: <ClipboardList size={22} />, label: 'Asistencia Estudiantes', path: '/director/asistencia-estudiantes', color: 'text-brand-lightblue bg-sky-50' },
    { icon: <CalendarDays size={22} />, label: 'Horarios', path: '/director/horarios', color: 'text-orange-500 bg-orange-50' },
    { icon: <CalendarDays size={22} />, label: 'Eventos', path: '/director/eventos', color: 'text-pink-500 bg-pink-50' },
    { icon: <Settings size={22} />, label: 'Configuración', path: '/director/configuracion', color: 'text-gray-500 bg-gray-50' },
    { icon: <BarChart3 size={22} />, label: 'Reportes', path: '/director/reportes', color: 'text-indigo-500 bg-indigo-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
      {/* Header */}
      <div className="bg-brand-blue text-white pt-10 pb-5 px-5 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-brand-yellow">AsistenciaDoc</h1>
          <button onClick={logout} className="p-2 bg-white/10 rounded-full active:scale-95">
            <LogOut size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center border-2 border-brand-yellow shrink-0">
            <User size={28} className="text-brand-blue" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-brand-lightblue font-semibold uppercase">Director</p>
            <h2 className="text-base font-bold truncate">{user?.nombres} {user?.apellidos}</h2>
            <p className="text-xs text-white/70 truncate">{user?.institucion_nombre}</p>
          </div>
        </div>
        <p className="text-xs text-white/50 mt-3 capitalize">{hoy}</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Resumen docentes */}
        {!loading && resumenDoc && (
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Docentes hoy</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Presentes', value: resumenDoc.presentes, color: 'text-brand-green' },
                { label: 'Tardanzas', value: resumenDoc.tardanzas, color: 'text-brand-yellow' },
                { label: 'Faltas', value: resumenDoc.faltas, color: 'text-brand-red' },
                { label: 'Total', value: resumenDoc.total, color: 'text-brand-blue' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumen estudiantes */}
        {!loading && resumenEst && (
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Estudiantes hoy</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Presentes', value: resumenEst.presentes, color: 'text-brand-green' },
                { label: 'Tardanzas', value: resumenEst.tardanzas, color: 'text-brand-yellow' },
                { label: 'Faltas', value: resumenEst.faltas, color: 'text-brand-red' },
                { label: 'Total', value: resumenEst.total, color: 'text-brand-blue' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-6"><Loader2 size={28} className="animate-spin text-brand-blue" /></div>
        )}

        {/* Menú principal */}
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Módulos</p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {menus.map(m => (
              <button
                key={m.path}
                onClick={() => navigate(m.path)}
                className="w-full flex items-center gap-4 px-4 py-4 active:bg-gray-50 transition-all"
              >
                <div className={`p-2.5 rounded-xl ${m.color}`}>{m.icon}</div>
                <span className="flex-1 text-left font-semibold text-brand-black text-sm">{m.label}</span>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
