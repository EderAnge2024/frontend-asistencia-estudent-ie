import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { estudiantesService } from '../../services/estudiantes.service';
import { ArrowLeft, Plus, Search, Loader2, User, AlertCircle, CheckCircle, X, Edit3, FileSpreadsheet, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const EMPTY = { nombres: '', apellido_paterno: '', apellido_materno: '', dni: '', codigo_estudiante: '' };

export default function GestionEstudiantes() {
  const navigate = useNavigate();
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(null); // null | 'crear' | 'masivo' | { ...estudiante }
  const [form, setForm] = useState(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, texto }

  // Estados para Carga Masiva
  const [previaExcel, setPreviaExcel] = useState([]);
  const [procesandoMasivo, setProcesandoMasivo] = useState(false);
  const [msgMasivo, setMsgMasivo] = useState(null);

  const cargar = async (b = busqueda) => {
    setLoading(true);
    try {
      const res = await estudiantesService.listar({ busqueda: b, estado: true });
      setEstudiantes(res.data?.data || []);
    } catch {
      setEstudiantes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => { setForm(EMPTY); setModal('crear'); setMsg(null); };
  const abrirEditar = (e) => { setForm({ ...e }); setModal(e); setMsg(null); };
  const abrirMasivo = () => { setPreviaExcel([]); setModal('masivo'); setMsgMasivo(null); };
  const cerrar = () => { setModal(null); setMsg(null); setMsgMasivo(null); setPreviaExcel([]); };

  const guardar = async () => {
    if (!form.nombres || !form.apellido_paterno) {
      setMsg({ ok: false, texto: 'Nombres y apellido paterno son obligatorios.' }); return;
    }
    setGuardando(true); setMsg(null);
    try {
      if (modal === 'crear') {
        await estudiantesService.crear(form);
        setMsg({ ok: true, texto: 'Estudiante registrado correctamente.' });
      } else {
        await estudiantesService.actualizar(modal.id_estudiante, form);
        setMsg({ ok: true, texto: 'Estudiante actualizado.' });
      }
      cargar();
      setTimeout(cerrar, 1500);
    } catch (e) {
      setMsg({ ok: false, texto: e.response?.data?.message || 'Error al guardar.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleFileUpload = (evt) => {
    const file = evt.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        if (json.length === 0) {
          setMsgMasivo({ ok: false, texto: 'El archivo Excel no contiene filas de datos.' });
          return;
        }
        setPreviaExcel(json);
        setMsgMasivo({ ok: true, texto: `✅ ${json.length} filas detectadas en el archivo.` });
      } catch (err) {
        setMsgMasivo({ ok: false, texto: 'Error al leer el archivo Excel/CSV.' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const procesarCargaMasiva = async () => {
    if (previaExcel.length === 0) return;
    setProcesandoMasivo(true); setMsgMasivo(null);
    try {
      const res = await estudiantesService.cargaMasiva(previaExcel);
      const data = res.data?.data;
      setMsgMasivo({
        ok: true,
        texto: `🎉 ¡Carga completada! Insertados: ${data.insertados}, Actualizados: ${data.actualizados}, Matriculados: ${data.matriculados}.`
      });
      cargar();
      setTimeout(cerrar, 2500);
    } catch (e) {
      setMsgMasivo({ ok: false, texto: e.response?.data?.message || 'Error en la carga masiva.' });
    } finally {
      setProcesandoMasivo(false);
    }
  };

  const descargarPlantilla = () => {
    const datosEjemplo = [
      {
        Nombres: 'Juan Carlos',
        'Apellido Paterno': 'Perez',
        'Apellido Materno': 'Gomez',
        DNI: '71234567',
        Codigo: 'EST101',
        Nivel: 'Secundaria',
        Grado: '2',
        Seccion: 'B'
      },
      {
        Nombres: 'María Elena',
        'Apellido Paterno': 'Quispe',
        'Apellido Materno': 'Rojas',
        DNI: '72345678',
        Codigo: 'EST102',
        Nivel: 'Secundaria',
        Grado: '2',
        Seccion: 'A'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(datosEjemplo);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
    XLSX.writeFile(wb, 'Plantilla_Carga_Masiva_Estudiantes.xlsx');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
      {/* Header */}
      <div className="bg-brand-blue text-white pt-10 pb-4 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full active:scale-95">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold flex-1">Gestión de Estudiantes</h1>
          <button onClick={abrirMasivo} className="bg-white/10 text-white px-3 py-2 rounded-xl font-semibold text-xs flex items-center gap-1 active:scale-95 border border-white/20">
            <FileSpreadsheet size={15} /> Carga Excel
          </button>
          <button onClick={abrirCrear} className="bg-brand-yellow text-brand-black px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 active:scale-95">
            <Plus size={15} /> Nuevo
          </button>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
          <input
            className="w-full bg-white/10 text-white placeholder-white/50 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder="Buscar por nombre, DNI o código..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); cargar(e.target.value); }}
          />
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-brand-blue" /></div>
        ) : estudiantes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <User size={48} className="mx-auto mb-3 opacity-30" />
            <p>No hay estudiantes registrados.</p>
            <div className="flex gap-2 justify-center mt-3">
              <button onClick={abrirCrear} className="text-brand-blue font-semibold text-sm">+ Individual</button>
              <button onClick={abrirMasivo} className="text-brand-blue font-semibold text-sm">📊 Carga Masiva Excel</button>
            </div>
          </div>
        ) : estudiantes.map((e, i) => (
          <div key={e.id_estudiante} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-blue/10 rounded-full flex items-center justify-center shrink-0">
              <span className="text-brand-blue font-bold text-xs">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-brand-black text-sm truncate">
                {e.apellido_paterno} {e.apellido_materno}, {e.nombres}
              </p>
              <div className="flex gap-3">
                {e.dni && <span className="text-xs text-gray-400">DNI: {e.dni}</span>}
                {e.codigo_estudiante && <span className="text-xs text-gray-400">Cód: {e.codigo_estudiante}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => abrirEditar(e)} className="p-2 bg-blue-50 text-brand-blue rounded-lg active:scale-95">
                <Edit3 size={14} />
              </button>
              <button onClick={() => navigate(`/director/matriculas?id_estudiante=${e.id_estudiante}`)}
                className="p-2 bg-purple-50 text-purple-600 rounded-lg active:scale-95 text-xs font-bold">
                Mat.
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Carga Masiva */}
      {modal === 'masivo' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={cerrar}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-brand-green" size={24} />
                <h2 className="text-lg font-bold text-brand-black">Carga Masiva de Estudiantes</h2>
              </div>
              <button onClick={cerrar} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={16} /></button>
            </div>

            <p className="text-xs text-gray-500">
              Sube un archivo Excel (<code>.xlsx</code> / <code>.csv</code>) con más de 300 estudiantes. El sistema creará sus registros y los matriculará automáticamente en sus grados y secciones.
            </p>

            <button
              onClick={descargarPlantilla}
              className="w-full bg-green-50 text-brand-green py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-brand-green/20 hover:bg-green-100 active:scale-95"
            >
              <Download size={16} /> Descargar Plantilla Modelo (.xlsx)
            </button>

            {msgMasivo && (
              <div className={`flex gap-2 rounded-xl px-4 py-3 text-sm font-semibold items-center ${msgMasivo.ok ? 'bg-green-50 text-brand-green border border-brand-green' : 'bg-red-50 text-brand-red border border-brand-red'}`}>
                {msgMasivo.ok ? <CheckCircle size={18} /> : <AlertCircle size={18} />} {msgMasivo.texto}
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload size={32} className="mx-auto text-brand-blue mb-2 opacity-60" />
              <p className="text-sm font-semibold text-gray-700">Haz clic aquí para seleccionar tu archivo Excel</p>
              <p className="text-xs text-gray-400 mt-1">Soporta archivos .xlsx, .xls y .csv</p>
            </div>

            {previaExcel.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase">Vista previa (Primeros 5 registros):</p>
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-xs text-left text-gray-600">
                    <thead className="bg-gray-100 uppercase text-[10px] text-gray-500 font-bold">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Apellidos y Nombres</th>
                        <th className="p-2">DNI</th>
                        <th className="p-2">Grado/Sec</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previaExcel.slice(0, 5).map((row, idx) => {
                        const apNom = row['Apellidos y nombres'] || row['APELLIDOS Y NOMBRES'] || row['Apellidos y Nombres'] || `${row['Apellido Paterno'] || row.apellido_paterno || ''} ${row.Nombres || row.nombres || ''}`;
                        const dniVal = row.DNI || row.dni || row['D N I'] || '-';
                        const gradoVal = row.Grado || row.grado || row['GRADO'] || '1';
                        return (
                          <tr key={idx} className="border-t">
                            <td className="p-2 font-bold">{idx + 1}</td>
                            <td className="p-2 truncate max-w-[180px] font-medium">{apNom}</td>
                            <td className="p-2">{dniVal}</td>
                            <td className="p-2 font-bold text-brand-blue">{gradoVal}</td>
                          </tr>
                        );
                      })}

                    </tbody>
                  </table>
                </div>
                {previaExcel.length > 5 && (
                  <p className="text-xs text-gray-400 text-center">... y {previaExcel.length - 5} estudiantes más.</p>
                )}
              </div>
            )}

            <button
              onClick={procesarCargaMasiva}
              disabled={procesandoMasivo || previaExcel.length === 0}
              className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md"
            >
              {procesandoMasivo ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
              {procesandoMasivo ? `Importando ${previaExcel.length} estudiantes...` : `Iniciar Carga Masiva (${previaExcel.length} estudiantes)`}
            </button>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Individual */}
      {modal !== null && modal !== 'masivo' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={cerrar}>
          <div className="w-full bg-white rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-brand-black">
                {modal === 'crear' ? 'Nuevo Estudiante' : 'Editar Estudiante'}
              </h2>
              <button onClick={cerrar} className="p-2 bg-gray-100 rounded-full"><X size={16} /></button>
            </div>

            {msg && (
              <div className={`flex gap-2 rounded-xl px-4 py-3 text-sm font-semibold items-center
                ${msg.ok ? 'bg-green-50 text-brand-green border border-brand-green' : 'bg-red-50 text-brand-red border border-brand-red'}`}>
                {msg.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {msg.texto}
              </div>
            )}

            {[
              { key: 'nombres', label: 'Nombres *' },
              { key: 'apellido_paterno', label: 'Apellido Paterno *' },
              { key: 'apellido_materno', label: 'Apellido Materno' },
              { key: 'dni', label: 'DNI' },
              { key: 'codigo_estudiante', label: 'Código' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">{f.label}</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}

            <button
              onClick={guardar}
              disabled={guardando}
              className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {guardando ? <Loader2 size={18} className="animate-spin" /> : null}
              {modal === 'crear' ? 'Registrar Estudiante' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

