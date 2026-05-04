"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardObjetivos } from './DashboardObjetivos';
import { RankingCard } from './RankingCard';
import { useAppStore } from '../hooks/useAppStore';
import { Filter, Trophy as TrophyIcon, LayoutDashboard, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export function RankingSection() {
  const [rawVentas, setRawVentas] = useState<any[]>([]);
  const [datosExcel, setDatosExcel] = useState<any[]>([]);
  const [fotosGuardadas, setFotosGuardadas] = useState<{ [key: string]: string }>({});
  const [configMensual, setConfigMensual] = useState<any>({});
  const [filtroProducto, setFiltroProducto] = useState("Todos");
  const [filtroSucursal, setFiltroSucursal] = useState("Todas");
  const [filtroPeriodo, setFiltroPeriodo] = useState("Mes Completo");
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // 1. CARGAR DATOS DE SUPABASE
  useEffect(() => {
    const fetchAllData = async () => {
      setIsDataLoaded(false);
      const year = selectedMonth.split('-')[0];

      // Fetch Ventas Detalle
      let query = supabase.from('ventas_detalle').select('*');
      if (filtroPeriodo === "Acumulado Anual") {
         query = query.like('mes_ano', `${year}-%`);
      } else {
         query = query.eq('mes_ano', selectedMonth);
      }
      
      const { data: ventasData } = await query.limit(50000);
      if (ventasData) setRawVentas(ventasData);
      else setRawVentas([]);

      // Fetch Fotos
      const { data: fotosData } = await supabase.from('asesores_meta').select('nombre, photo_url');
      if (fotosData) {
        const fotosMap: { [key: string]: string } = {};
        fotosData.forEach(f => {
          fotosMap[f.nombre.toUpperCase()] = f.photo_url;
        });
        setFotosGuardadas(fotosMap);
      }

      // Fetch Configuración Mensual
      // Si es acumulado anual, intentaremos sumar las metas de los meses? Por ahora tomamos la meta base del mes actual para simplificar.
      const { data: configData } = await supabase.from('config_metas').select('*').eq('mes_ano', selectedMonth).single();
      
      if (configData) {
        setConfigMensual(configData);
      } else {
        setConfigMensual({});
      }

      setIsDataLoaded(true);
    };

    fetchAllData();
  }, [selectedMonth, filtroPeriodo]);

  // 2. FILTRADO Y AGRUPACIÓN LOCAL POR PERIODO, SUCURSAL Y PRODUCTO
  useEffect(() => {
    // Filtrar rawVentas
    const filtered = rawVentas.filter(venta => {
      // Filtro Producto
      if (filtroProducto !== "Todos" && venta.tipo_producto !== filtroProducto) return false;
      
      // Filtro Sucursal
      if (filtroSucursal !== "Todas" && venta.sucursal !== filtroSucursal) return false;

      // Filtro Periodo
      if (filtroPeriodo === "Mes Completo" || filtroPeriodo === "Acumulado Anual") return true;
      if (!venta.fecha_venta) return true; // Fallback
      
      const day = parseInt(venta.fecha_venta.split('-')[2], 10);
      if (filtroPeriodo === "Semana 1") return day >= 1 && day <= 7;
      if (filtroPeriodo === "Semana 2") return day >= 8 && day <= 14;
      if (filtroPeriodo === "Semana 3") return day >= 15 && day <= 21;
      if (filtroPeriodo === "Semana 4") return day >= 22;
      return true;
    });

    // Agrupar
    const grouped: { [key: string]: any } = {};
    filtered.forEach(v => {
      const clave = v.nombre.toUpperCase();
      if (!grouped[clave]) {
        grouped[clave] = {
          nombre: v.nombre,
          monto_total: 0,
          total_ventas: 0,
          sucursal: v.sucursal,
          supervisor: v.supervisor,
          tipo_producto: v.tipo_producto,
          foliosSet: new Set()
        };
      }
      grouped[clave].monto_total += Number(v.monto);
      grouped[clave].foliosSet.add(v.id_sap_venta);
    });

    const finalData = Object.values(grouped).map(g => ({
      ...g,
      total_ventas: g.foliosSet.size
    }));

    setDatosExcel(finalData);
  }, [rawVentas, filtroPeriodo, filtroProducto, filtroSucursal]);

  if (!isDataLoaded) return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin w-16 h-16 text-indigo-500" />
      <span className="text-neutral-500 uppercase font-black tracking-widest text-xs">Cargando Sistema...</span>
    </div>
  );

  // 2. LÓGICA DE PRODUCTOS Y SUCURSALES ÚNICAS
  const productosUnicos = ["Todos", ...Array.from(new Set(rawVentas.map(a => a.tipo_producto).filter(Boolean)))].sort();
  const sucursalesUnicas = ["Todas", ...Array.from(new Set(rawVentas.map(a => a.sucursal).filter(Boolean)))].sort();

  // 3. LÓGICA DE PUNTUACIÓN 50/50 Y RANKING
  const montoMaximo = Math.max(...datosExcel.map(a => a.monto_total), 1);
  const foliosMaximos = Math.max(...datosExcel.map(a => a.total_ventas), 1);

  const displayStaff = datosExcel
    .map(advisor => {
      // Fórmula Ponderada: 50% Monto + 50% Folios
      const scoreMonto = (advisor.monto_total / montoMaximo) * 50;
      const scoreFolios = (advisor.total_ventas / foliosMaximos) * 50;
      return {
        ...advisor,
        performanceScore: scoreMonto + scoreFolios,
        // BUSCAMOS LA FOTO AQUÍ:
        photoUrl: fotosGuardadas[advisor.nombre?.toUpperCase()] || null
      };
    })
    .sort((a, b) => b.performanceScore - a.performanceScore); // El Ranking ahora es por Score

  // 4. Cálculo de Totales para el Dashboard Superior
  const montoGlobalActual = displayStaff.reduce((acc, curr) => acc + curr.monto_total, 0);
  const creditosGlobalesActuales = displayStaff.reduce((acc, curr) => acc + curr.total_ventas, 0);

  return (
    <div className="p-6 md:p-12 text-neutral-100 font-sans selection:bg-indigo-500/30">
      <div className="max-w-[1600px] mx-auto space-y-16">

        {/* CABECERA */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-800 pb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <TrophyIcon className="text-indigo-500 w-8 h-8" />
              <h1 className="text-5xl font-black italic tracking-tighter text-white">
                CLEARVOICE <span className="text-indigo-500">PERFORMANCE</span>
              </h1>
            </div>
            <p className="text-lg text-neutral-500 font-medium uppercase tracking-widest">
              Ranking de Productividad • Basado en SAP
            </p>
          </div>

        </header>

        {/* SECCIÓN 1: DASHBOARD GLOBAL */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <DashboardObjetivos
            montoGlobalActual={montoGlobalActual}
            creditosGlobalesActuales={creditosGlobalesActuales}
            configMensual={configMensual}
            filtroPeriodo={filtroPeriodo}
          />
        </section>

        {/* SECCIÓN 2: RANKING DINÁMICO */}
        <section className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-3xl font-black uppercase italic text-white">Elite Ranking 50/50</h2>

            {/* FILTROS */}
            <div className="flex flex-wrap gap-4 bg-neutral-900 p-3 rounded-2xl border border-neutral-800 shadow-inner">
              {/* Filtro Mes */}
              <div className="flex items-center gap-2 px-3 border-r border-neutral-800">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-black uppercase outline-none text-neutral-200 cursor-pointer"
                />
              </div>

              {/* Filtro Periodo */}
              <div className="flex items-center gap-2 px-3 border-r border-neutral-800">
                <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                <select
                  value={filtroPeriodo}
                  onChange={(e) => setFiltroPeriodo(e.target.value)}
                  className="bg-transparent text-xs font-black uppercase outline-none text-neutral-200 cursor-pointer"
                >
                  <option value="Mes Completo" className="bg-neutral-900">Mes Completo</option>
                  <option value="Semana 1" className="bg-neutral-900">Semana 1 (Días 1-7)</option>
                  <option value="Semana 2" className="bg-neutral-900">Semana 2 (Días 8-14)</option>
                  <option value="Semana 3" className="bg-neutral-900">Semana 3 (Días 15-21)</option>
                  <option value="Semana 4" className="bg-neutral-900">Semana 4 (Días 22+)</option>
                  <option value="Acumulado Anual" className="bg-neutral-900 text-indigo-400 font-bold">Acumulado Anual</option>
                </select>
              </div>

              {/* Filtro Sucursal */}
              <div className="flex items-center gap-2 px-3 border-r border-neutral-800">
                <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                <select
                  value={filtroSucursal}
                  onChange={(e) => setFiltroSucursal(e.target.value)}
                  className="bg-transparent text-xs font-black uppercase outline-none text-neutral-200 cursor-pointer"
                >
                  {sucursalesUnicas.map(s => <option key={s} value={s} className="bg-neutral-900">{s}</option>)}
                </select>
              </div>

              {/* Filtro Producto */}
              <div className="flex items-center gap-2 px-3">
                <Filter className="w-4 h-4 text-indigo-500" />
                <select
                  value={filtroProducto}
                  onChange={(e) => setFiltroProducto(e.target.value)}
                  className="bg-transparent text-xs font-black uppercase outline-none text-neutral-200 cursor-pointer"
                >
                  {productosUnicos.map(prod => (
                    <option key={prod} value={prod} className="bg-neutral-900">{prod}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* GRID DE CARTAS GIGANTES */}
          <div className="bg-neutral-900/30 p-10 rounded-[4rem] border border-neutral-800/50 shadow-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-12 place-items-center">
              {displayStaff.length > 0 ? (() => {
                const metaGlobalBase = configMensual.meta_mensual_base || 150000;
                const metasIndividuales = configMensual.metas_individuales || {};
                const fechasOperativas = configMensual.fechas_operativas || [];

                const diasOperativos = fechasOperativas.length > 0 ? fechasOperativas.length : 24;

                const today = new Date();
                const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                let diasTranscurridos = 0;
                if (fechasOperativas.length > 0) {
                  diasTranscurridos = fechasOperativas.filter((f: string) => f <= todayStr).length;
                } else {
                  diasTranscurridos = Math.min(today.getDate(), diasOperativos);
                }

                return displayStaff.map((advisor, index) => {
                  const metaMensualBase = metasIndividuales[advisor.nombre?.toUpperCase()] || metaGlobalBase;
                  const metaAlDiaBase = diasOperativos > 0 ? (metaMensualBase / diasOperativos) * diasTranscurridos : 0;
                  
                  const badges = [];

                  // Insignia de Fuego: Para el Top 3 del ranking
                  if (index < 3) {
                    badges.push({ id: 'top', iconName: 'flame', label: 'Líder de Ventas' });
                  }

                  // Insignia de Meta: Si ya superó el 100% de la meta mensual
                  if (advisor.monto_total >= metaMensualBase) {
                    badges.push({ id: 'goal', iconName: 'target', label: 'Meta Cumplida' });
                  }

                  // Insignia de Constancia: Si tiene más de 10 créditos (folios únicos)
                  if (advisor.total_ventas >= 15) {
                    badges.push({ id: 'pro', iconName: 'heart', label: 'Asesor Pro' });
                  }

                  return (
                    <RankingCard
                      key={index}
                      position={index + 1}
                      name={advisor.nombre}
                      amount={advisor.monto_total}
                      sucursal={advisor.sucursal}
                      supervisor={advisor.supervisor}
                      totalVentas={advisor.total_ventas}
                      performanceScore={advisor.performanceScore}
                      metaMensual={metaMensualBase}
                      metaAlDia={metaAlDiaBase}
                      badges={badges}
                      photoUrl={advisor.photoUrl}
                    />
                  );
                });
              })() : (
                <div className="col-span-full py-32 text-center border-4 border-dashed border-neutral-800/50 rounded-[3rem] w-full bg-neutral-900/20">
                  <p className="text-neutral-600 font-black uppercase tracking-[0.3em] text-xl">Sin Datos de Reporte</p>
                  <p className="text-neutral-700 text-sm mt-2 font-bold uppercase">Sube el Excel de ClearVoice en el Panel de Administración</p>
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}