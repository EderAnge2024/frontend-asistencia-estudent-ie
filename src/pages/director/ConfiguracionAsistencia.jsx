import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { configuracionService } from '../../services/admin.service';
import { ArrowLeft, Save, MapPin, Loader2, AlertCircle, CheckCircle, Wifi } from 'lucide-react';

export default function ConfiguracionAsistencia() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [obteniendoWifi, setObteniendoWifi] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({
    latitud_ie: '',
    longitud_ie: '',
    radio_permitido_metros: 50,
    tolerancia_entrada_min: 15,
    tolerancia_salida_min: 15,
    permitir_registro_manual: false,
    wifi_ssid: '',
    wifi_bssid: '',
    estado: true
  });

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await configuracionService.obtener();
        if (res.data?.data) {
          setForm(res.data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMsg(null);
    try {
      await configuracionService.guardar(form);
      setMsg({ ok: true, texto: 'Configuración guardada correctamente.' });
    } catch (err) {
      setMsg({ ok: false, texto: err.response?.data?.message || 'Error al guardar configuración.' });
    } finally {
      setGuardando(false);
    }
  };

  const obtenerUbicacionActual = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm((prev) => ({
            ...prev,
            latitud_ie: position.coords.latitude.toString(),
            longitud_ie: position.coords.longitude.toString()
          }));
          setMsg({ ok: true, texto: 'Coordenadas GPS obtenidas correctamente.' });
        },
        (error) => {
          alert('Error obteniendo ubicación. Asegúrese de tener el GPS activado.');
        }
      );
    }
  };

  const obtenerWifiActual = async () => {
    setObteniendoWifi(true);
    setMsg(null);
    try {
      // 1. Intentar detección automática nativa (App Móvil Capacitor en Android/iOS)
      const isNative = typeof window !== 'undefined' && 
                       window.Capacitor && 
                       typeof window.Capacitor.isNativePlatform === 'function' && 
                       window.Capacitor.isNativePlatform();

      if (isNative) {
        if (window.Capacitor.Plugins?.Wifi?.getWifiInfo) {
          const info = await window.Capacitor.Plugins.Wifi.getWifiInfo();
          if (info && info.ssid) {
            setForm(prev => ({
              ...prev,
              wifi_ssid: info.ssid,
              wifi_bssid: info.bssid || prev.wifi_bssid
            }));
            setMsg({ ok: true, texto: `✅ Red Wi-Fi detectada automáticamente: "${info.ssid}"` });
            return;
          }
        }
      }

      // 2. Intentar detección por Web Network Information API (si la red o navegador la expone)
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn && conn.type === 'wifi' && conn.ssid) {
        setForm(prev => ({
          ...prev,
          wifi_ssid: conn.ssid
        }));
        setMsg({ ok: true, texto: `✅ Red Wi-Fi detectada automáticamente: "${conn.ssid}"` });
        return;
      }

      // 3. Si no fue posible detectar automáticamente (ej. navegador de PC por privacidad o sin permiso de ubicación en el celular)
      setMsg({
        ok: false,
        texto: '⚠️ No se pudo detectar la red Wi-Fi automáticamente (restringido por privacidad del navegador o sin permisos). Por favor, escribe el nombre de tu red manualmente en el campo inferior.'
      });
    } catch (err) {
      console.error('Error al detectar Wi-Fi:', err);
      setMsg({
        ok: false,
        texto: '⚠️ No se pudo detectar la red Wi-Fi automáticamente. Por favor, escribe el nombre de tu red manualmente en el campo inferior.'
      });
    } finally {
      setObteniendoWifi(false);
    }
  };




  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin text-brand-blue" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
      <div className="bg-brand-blue text-white pt-10 pb-4 px-5 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full active:scale-95"><ArrowLeft size={18} /></button>
          <h1 className="text-lg font-bold flex-1">Configuración GPS y Asistencia</h1>
        </div>
      </div>

      <div className="px-4 pt-4">
        {msg && (
          <div className={`flex gap-2 mb-4 items-center rounded-xl px-4 py-3 text-sm font-semibold
            ${msg.ok ? 'bg-green-50 text-brand-green border border-brand-green' : 'bg-red-50 text-brand-red border border-brand-red'}`}>
            {msg.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {msg.texto}
          </div>
        )}

        <form onSubmit={guardar} className="space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
            <h2 className="font-bold text-brand-black flex items-center gap-2 border-b pb-2">
              <MapPin size={18} className="text-brand-blue" /> Ubicación de la Institución
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Latitud</label>
                <input type="text" name="latitud_ie" value={form.latitud_ie} onChange={handleChange} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Longitud</label>
                <input type="text" name="longitud_ie" value={form.longitud_ie} onChange={handleChange} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
              </div>
            </div>
            
            <button type="button" onClick={obtenerUbicacionActual}
              className="w-full bg-blue-50 text-brand-blue py-2 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 active:scale-95 hover:bg-blue-100 transition-all">
              <MapPin size={16} /> Usar mi ubicación actual
            </button>
            
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Radio permitido (metros)</label>
              <input type="number" name="radio_permitido_metros" value={form.radio_permitido_metros} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
            <h2 className="font-bold text-brand-black flex items-center gap-2 border-b pb-2">
              Reglas y Tolerancias
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Tolerancia Entrada (min)</label>
                <input type="number" name="tolerancia_entrada_min" value={form.tolerancia_entrada_min} onChange={handleChange} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Tolerancia Salida (min)</label>
                <input type="number" name="tolerancia_salida_min" value={form.tolerancia_salida_min} onChange={handleChange} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
              </div>
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="permitir_registro_manual" name="permitir_registro_manual" 
                checked={form.permitir_registro_manual} onChange={handleChange} className="w-4 h-4 text-brand-blue rounded" />
              <label htmlFor="permitir_registro_manual" className="text-sm font-medium text-brand-black">Permitir registro manual de asistencia</label>
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="estado" name="estado" 
                checked={form.estado} onChange={handleChange} className="w-4 h-4 text-brand-blue rounded" />
              <label htmlFor="estado" className="text-sm font-medium text-brand-black">Configuración Activa</label>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
            <h2 className="font-bold text-brand-black flex items-center gap-2 border-b pb-2">
              <Wifi size={18} className="text-brand-blue" /> Seguridad Wi-Fi (Opcional)
            </h2>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">SSID Wi-Fi (Nombre de Red)</label>
              <input type="text" name="wifi_ssid" value={form.wifi_ssid} onChange={handleChange} placeholder="Ej. Red_Colegio_Oficial"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">BSSID Wi-Fi (MAC del Router)</label>
              <input type="text" name="wifi_bssid" value={form.wifi_bssid} onChange={handleChange} placeholder="Ej. 00:11:22:33:44:55"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            
            <button
              type="button"
              onClick={obtenerWifiActual}
              disabled={obteniendoWifi}
              className="w-full bg-blue-50 text-brand-blue py-2.5 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 active:scale-95 hover:bg-blue-100 transition-all mt-1"
            >
              {obteniendoWifi ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
              Obtener Wi-Fi actual
            </button>
            <p className="text-xs text-gray-400">
              📲 En la App Móvil (Android/iOS), este botón obtendrá automáticamente el SSID y BSSID (MAC) del router de la institución al que estés conectado.
            </p>
          </div>

          <button type="submit" disabled={guardando}
            className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4">
            {guardando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Guardar Configuración
          </button>
        </form>
      </div>
    </div>
  );
}

