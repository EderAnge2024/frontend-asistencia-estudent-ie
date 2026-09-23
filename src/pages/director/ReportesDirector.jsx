import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download } from 'lucide-react';

export default function ReportesDirector() {
  const navigate = useNavigate();

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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
          <FileText size={48} className="mx-auto text-brand-blue mb-3 opacity-80" />
          <h2 className="font-bold text-brand-black mb-2">Módulo de Reportes</h2>
          <p className="text-sm text-gray-500 mb-4">
            Selecciona el tipo de reporte que deseas generar. Los reportes se descargarán en formato Excel (.xlsx) o PDF para impresión.
          </p>
          
          <div className="space-y-3 mt-5">
            <button className="w-full flex items-center justify-between bg-blue-50 text-brand-blue px-4 py-3 rounded-xl font-semibold active:scale-95 transition-all">
              <span>Asistencia de Docentes (Mes actual)</span>
              <Download size={18} />
            </button>
            <button className="w-full flex items-center justify-between bg-green-50 text-brand-green px-4 py-3 rounded-xl font-semibold active:scale-95 transition-all">
              <span>Asistencia de Estudiantes (Día actual)</span>
              <Download size={18} />
            </button>
            <button className="w-full flex items-center justify-between bg-yellow-50 text-yellow-700 px-4 py-3 rounded-xl font-semibold active:scale-95 transition-all">
              <span>Consolidado Anual de Matrículas</span>
              <Download size={18} />
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400">
            * La exportación detallada de reportes estará disponible en la próxima actualización del sistema.
          </div>
        </div>
      </div>
    </div>
  );
}
