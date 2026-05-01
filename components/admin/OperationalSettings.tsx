import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../hooks/useAppStore';

export const OperationalSettings = () => {
  const { state, isLoaded, updateSettings } = useAppStore();
  const [diasOperacion, setDiasOperacion] = useState(24);
  const [diasTranscurridos, setDiasTranscurridos] = useState(14);

  useEffect(() => {
    if (isLoaded) {
      setDiasOperacion(state.settings.diasOperacionMensual);
      setDiasTranscurridos(state.settings.diasTranscurridosMensual);
    }
  }, [isLoaded, state.settings]);

  const handleSave = () => {
    updateSettings({
      diasOperacionMensual: diasOperacion,
      diasTranscurridosMensual: diasTranscurridos,
    });
    alert('Configuración guardada exitosamente.');
  };

  if (!isLoaded) return <div className="animate-pulse h-32 bg-neutral-900 rounded-xl" />;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-white mb-4">Configuración Operativa Mensual</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-semibold text-neutral-400 mb-2">
            Total Días Hábiles del Mes
          </label>
          <input
            type="number"
            min="1"
            max="31"
            value={diasOperacion}
            onChange={(e) => setDiasOperacion(Number(e.target.value))}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-neutral-400 mb-2">
            Días Transcurridos
          </label>
          <input
            type="number"
            min="1"
            max={diasOperacion}
            value={diasTranscurridos}
            onChange={(e) => setDiasTranscurridos(Number(e.target.value))}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md"
        >
          Guardar Configuración
        </button>
      </div>
    </div>
  );
};
