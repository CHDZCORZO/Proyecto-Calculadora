import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, CircleDollarSign, CalendarDays, CreditCard } from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';

interface DashboardProps {
  montoGlobalActual?: number;
  creditosGlobalesActuales?: number;
  configMensual?: any;
  filtroPeriodo?: string;
}

// Configuración para forzar COMAS (estilo México/EE.UU.)
const formatoMoneda = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const DashboardObjetivos = ({ 
  montoGlobalActual = 0, 
  creditosGlobalesActuales = 0,
  configMensual = {},
  filtroPeriodo = "Mes Completo"
}: DashboardProps) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const today = new Date();
  
  const fechasOperativas = configMensual.fechas_operativas || [];
  const metaMensualBase = configMensual.meta_mensual_base || 150000;
  
  // Días Operativos según el periodo
  let diasOperacionPeriodo = fechasOperativas.length > 0 ? fechasOperativas.length : 24;
  let metaPeriodoBase = metaMensualBase;

  // Si seleccionan una semana, ajustamos la meta y los días de operación proporcionalmente
  if (filtroPeriodo !== "Mes Completo" && filtroPeriodo !== "Acumulado Anual") {
    // Hay 4 semanas, así que dividimos la meta entre 4 para este demo. 
    metaPeriodoBase = metaMensualBase / 4;
    diasOperacionPeriodo = Math.ceil(diasOperacionPeriodo / 4);
  } else if (filtroPeriodo === "Acumulado Anual") {
    // Para el año, multiplicamos por 12
    metaPeriodoBase = metaMensualBase * 12;
    diasOperacionPeriodo = diasOperacionPeriodo * 12;
  }

  let diasTranscurridosPeriodo = 0;
  
  if (isClient) {
    const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    if (fechasOperativas.length > 0) {
      // Filtrar fechas que ya pasaron (esto es para el mes actual)
      diasTranscurridosPeriodo = fechasOperativas.filter((f: string) => f <= todayStr).length;
      
      if (filtroPeriodo === "Acumulado Anual") {
        // Estimación rápida de días transcurridos en el año
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const diffTime = Math.abs(today.getTime() - startOfYear.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // Ajustamos asumiendo ~24 días por mes (quitar domingos)
        diasTranscurridosPeriodo = Math.min(Math.floor((diffDays / 7) * 6), diasOperacionPeriodo);
      } else if (filtroPeriodo !== "Mes Completo") {
         // Ajuste proporcional para semana
         diasTranscurridosPeriodo = Math.min(diasTranscurridosPeriodo, diasOperacionPeriodo);
      }
    } else {
      if (filtroPeriodo === "Acumulado Anual") {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const diffTime = Math.abs(today.getTime() - startOfYear.getTime());
        diasTranscurridosPeriodo = Math.min(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), diasOperacionPeriodo);
      } else {
        diasTranscurridosPeriodo = Math.min(today.getDate(), diasOperacionPeriodo);
      }
    }
  }

  const calcularMetaAlDia = (metaTotal: number, diasOperacion: number, diasTranscurridos: number) => {
    return diasOperacion > 0 ? (metaTotal / diasOperacion) * diasTranscurridos : 0;
  };

  const totalSales = montoGlobalActual;
  const ticketPromedioGlobal = creditosGlobalesActuales > 0 ? totalSales / creditosGlobalesActuales : 0;

  const currentData = {
    meta: metaPeriodoBase,
    real: totalSales,
    ticketPromedio: ticketPromedioGlobal,
    metaAlDia: calcularMetaAlDia(metaPeriodoBase, diasOperacionPeriodo, diasTranscurridosPeriodo)
  };

  const porcentajeCumplimientoAlDia = currentData.metaAlDia > 0 ? Math.min(Math.round((currentData.real / currentData.metaAlDia) * 100), 100) : 0;
  const porcentajeCumplimientoTotal = currentData.meta > 0 ? Math.min(Math.round((currentData.real / currentData.meta) * 100), 100) : 0;
  const proyeccionCierre = diasTranscurridosPeriodo > 0 ? (currentData.real / diasTranscurridosPeriodo) * diasOperacionPeriodo : 0;

  if (!isClient) {
    return <div className="w-full h-96 bg-neutral-900 animate-pulse rounded-3xl" />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto bg-neutral-900 rounded-[2.5rem] p-8 md:p-12 border border-neutral-800 shadow-[0_0_100px_-20px_rgba(79,70,229,0.2)] font-sans text-neutral-100 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />

      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 relative z-10">
        <div>
          <h2 className="text-4xl font-black italic tracking-tight flex items-center gap-3">
            <Target className="w-10 h-10 text-indigo-500" />
            Meta Clearvoice
          </h2>
          <div className="flex items-center gap-2 text-neutral-400 text-base mt-2 font-bold uppercase tracking-widest">
            <CalendarDays className="w-5 h-5" />
            <span suppressHydrationWarning>Día Operativo: {diasTranscurridosPeriodo} de {diasOperacionPeriodo}</span>
          </div>
        </div>

        <div className="flex items-center bg-indigo-500/10 px-6 py-3 rounded-2xl border border-indigo-500/20">
          <span className="text-indigo-400 font-black uppercase text-sm tracking-widest">{filtroPeriodo}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Progress Circle */}
        <div className="col-span-1 lg:col-span-4 bg-neutral-800/40 rounded-3xl p-8 border border-neutral-700/50 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-sm">
          <h3 className="text-neutral-400 text-sm font-black uppercase tracking-widest mb-8">Ritmo vs Meta al Día</h3>
          <div className="relative w-64 h-64 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" className="stroke-neutral-800 stroke-[8px] fill-transparent" />
              <circle
                cx="50" cy="50" r="40"
                className={`${porcentajeCumplimientoAlDia >= 100 ? 'stroke-emerald-500' : 'stroke-indigo-500'} stroke-[8px] fill-transparent transition-all duration-1000 ease-out`}
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - porcentajeCumplimientoAlDia / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="flex flex-col items-center justify-center">
              <span className="text-6xl font-black" suppressHydrationWarning>{porcentajeCumplimientoAlDia}%</span>
              <span className="text-xs text-neutral-400 font-black uppercase tracking-widest mt-2">
                {porcentajeCumplimientoAlDia >= 100 ? 'Excelente' : 'Requiere Foco'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="col-span-1 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-800/40 backdrop-blur-sm rounded-3xl p-8 border border-neutral-700/50 flex flex-col justify-between col-span-1 md:col-span-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  <Target className="w-6 h-6 text-blue-400" />
                </div>
                <h4 className="text-base font-black uppercase tracking-widest text-neutral-300">Progreso de Ventas</h4>
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-end mb-6 gap-6 relative z-10">
              <div>
                <p className="text-sm text-neutral-500 font-black uppercase tracking-widest mb-2">Venta Real</p>
                <p className="text-5xl lg:text-6xl font-black text-white" suppressHydrationWarning>
                  {formatoMoneda.format(currentData.real)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-500 font-black uppercase tracking-widest mb-2">Meta al Día</p>
                <p className="text-3xl font-black text-blue-400" suppressHydrationWarning>
                  {formatoMoneda.format(Math.round(currentData.metaAlDia))}
                </p>
              </div>
            </div>

            <div className="relative w-full h-4 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 mt-4 relative z-10">
              <div
                className="absolute top-0 bottom-0 w-1.5 bg-white z-20 transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                style={{ left: `${(currentData.metaAlDia / currentData.meta) * 100}%` }}
              ></div>
              <div
                className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r ${currentData.real >= currentData.metaAlDia ? 'from-emerald-600 to-emerald-400' : 'from-blue-600 to-blue-400'} z-10 transition-all duration-1000`}
                style={{ width: `${Math.min((currentData.real / currentData.meta) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-4 text-xs text-neutral-500 font-black uppercase tracking-widest relative z-10">
              <span>$0</span>
              <span suppressHydrationWarning>Meta Total: {formatoMoneda.format(currentData.meta)}</span>
            </div>
          </div>

          <div className="bg-neutral-800/40 backdrop-blur-sm rounded-3xl p-8 border border-neutral-700/50 hover:border-emerald-500/30 transition-colors">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <CircleDollarSign className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="text-sm font-black uppercase tracking-widest text-neutral-300">Ticket Promedio</h4>
            </div>
            <p className="text-4xl font-black text-white mb-2" suppressHydrationWarning>
              {formatoMoneda.format(currentData.ticketPromedio)}
            </p>
          </div>

          <div className="bg-neutral-800/40 backdrop-blur-sm rounded-3xl p-8 border border-neutral-700/50 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/20 transition-colors pointer-events-none" />
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <TrendingUp className="w-6 h-6 text-amber-400" />
              </div>
              <h4 className="text-sm font-black uppercase tracking-widest text-neutral-300">Proyección de Cierre</h4>
            </div>
            <p className="text-4xl font-black text-white mb-3 relative z-10" suppressHydrationWarning>
              {formatoMoneda.format(proyeccionCierre)}
            </p>
            <p className={`text-xs font-black uppercase tracking-widest relative z-10 ${proyeccionCierre >= currentData.meta ? 'text-emerald-400' : 'text-amber-400'}`}>
              {proyeccionCierre >= currentData.meta ? 'Superando Meta' : 'Por Debajo de Meta'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};