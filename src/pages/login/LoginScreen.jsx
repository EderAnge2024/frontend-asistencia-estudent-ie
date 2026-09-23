import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dni || !password) {
      setError('Por favor ingrese DNI y contrasea.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(dni, password);
      // Redireccion automatica via router
    } catch (err) {
      const msg = err.response?.data?.message || 'Error de conexion. Intente nuevamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-brand-white flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      
      {/* Fondo decorativo Celeste y Azul para dar toque de app institucional */}
      <div className="absolute top-0 w-full h-1/3 bg-gradient-to-b from-brand-blue to-brand-lightblue rounded-b-[40px] shadow-lg z-0"></div>

      <div className="w-full max-w-sm z-10 flex flex-col items-center mt-8">
        
        {/* Logo / Encabezado */}
        <div className="bg-brand-white p-4 rounded-full shadow-xl mb-4 border-4 border-brand-yellow">
          <ShieldCheck className="w-16 h-16 text-brand-blue" />
        </div>
        
        <h1 className="text-2xl font-bold text-brand-black mb-1">AsistenciaDoc</h1>
        <p className="text-sm text-gray-500 mb-8 font-medium">Sistema Institucional Integrado</p>

        {/* Tarjeta del Formulario */}
        <div className="w-full bg-brand-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-100">
          <h2 className="text-xl font-bold text-brand-blue mb-6 text-center">Iniciar Sesion</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-brand-red/10 border-l-4 border-brand-red rounded-md">
              <p className="text-sm text-brand-red font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-brand-black mb-1">Usuario o DNI</label>
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Ingrese su DNI"
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-lightblue focus:border-transparent transition-all bg-gray-50 text-brand-black text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-black mb-1">Contrasea</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-lightblue focus:border-transparent transition-all bg-gray-50 text-brand-black text-lg pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-blue p-1"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-brand-white text-lg transition-all active:scale-95 flex justify-center items-center",
                loading ? "bg-brand-blue/70 cursor-not-allowed" : "bg-brand-blue shadow-lg hover:bg-brand-blue/90"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Conectando...
                </>
              ) : (
                'Ingresar al Sistema'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">Las credenciales estan sincronizadas con su plataforma de monitoreo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}