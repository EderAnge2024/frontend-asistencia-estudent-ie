/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-white': '#FFFFFF',
        'brand-blue': '#1E3A8A', // AZUL (Principal)
        'brand-lightblue': '#38BDF8', // CELESTE
        'brand-yellow': '#FACC15', // AMARILLO (Acento)
        'brand-green': '#10B981', // VERDE (Acento/Exito)
        'brand-black': '#0F172A', // NEGRO (Textos)
        'brand-red': '#EF4444', // ROJO (Errores)
      }
    },
  },
  plugins: [],
}