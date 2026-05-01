"use client";
import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Calculator, Plus, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface CreditoALiquidar {
  id: number;
  plazo: number;
  tasa: number;
  cat: number;
  pagosAplicados: number;
  saldo: number;
  descuentoActual: number;
}

interface ReglasType {
  [key: string]: number;
}

interface Oferta {
  id: string;
  id_oferta: string;
  plazo: number;
  monto: number;
  descuento: number;
  tasa: number;
  cat_valor: number;
  marca: string;
}

export const CotizadorHerramientas = () => {
  const [capacidadTotal, setCapacidadTotal] = useState<number>(1000);
  const [montoSolicitar, setMontoSolicitar] = useState<number>(0);
  const [edad, setEdad] = useState<number>(35);
  const [tipoTramite, setTipoTramite] = useState<string>('CNCA INTERNO');
  const [creditos, setCreditos] = useState<CreditoALiquidar[]>([]);
  const [reglas, setReglas] = useState<ReglasType>({});
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [resultados, setResultados] = useState<Record<string, Oferta[]>>({});
  const [erroresMarcas, setErroresMarcas] = useState<Record<string, string>>({});
  const [marcasEvaluadas, setMarcasEvaluadas] = useState<string[]>([]);

  // Cargar reglas iniciales
  useEffect(() => {
    const fetchReglas = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('reglas_cotizador').select('*');
      if (data) {
        const r: ReglasType = {};
        data.forEach((row: any) => {
          r[row.regla_key] = Number(row.regla_value);
        });
        setReglas(r);
      }
      setLoading(false);
    };
    fetchReglas();
  }, []);

  const agregarCredito = () => {
    if (creditos.length >= 5) return;
    setCreditos([...creditos, { id: Date.now(), plazo: 0, tasa: 0, cat: 0, pagosAplicados: 0, saldo: 0, descuentoActual: 0 }]);
  };

  const actualizarCredito = (id: number, field: keyof CreditoALiquidar, value: number) => {
    setCreditos(creditos.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const eliminarCredito = (id: number) => {
    setCreditos(creditos.filter(c => c.id !== id));
  };

  // Helper para Incremento de Plazo
  const getMinPlazo = (plazoAnt: number) => {
    if (plazoAnt <= 12) return 36;
    if (plazoAnt <= 24) return 48;
    if (plazoAnt <= 36) return 54;
    if (plazoAnt <= 48) return 54;
    if (plazoAnt <= 54) return 60;
    return 999; // Bloqueado si ya es 60
  };

  // MOTOR DE CÁLCULO
  const calcularOfertas = async () => {
    setCalculando(true);
    setResultados({});
    setErroresMarcas({});

    // Supabase limita a 1000 filas por defecto, paginamos para traer todas las tablas
    let tablasRaw: any[] = [];
    let hasMore = true;
    let from = 0;
    const step = 1000;

    while (hasMore) {
      const { data, error } = await supabase
        .from('tablas_cotizador')
        .select('*')
        .eq('tramite', tipoTramite)
        .order('id')
        .range(from, from + step - 1);
        
      if (error || !data || data.length === 0) {
        hasMore = false;
      } else {
        tablasRaw = [...tablasRaw, ...data];
        from += step;
        if (data.length < step) hasMore = false;
      }
    }

    if (tablasRaw.length === 0) {
      alert(`No hay tablas de cotización cargadas en el sistema para el trámite: ${tipoTramite}.`);
      setCalculando(false);
      return;
    }

    console.log(`Total filas cargadas: ${tablasRaw.length}`);
    const marcasDisponibles = Array.from(new Set(tablasRaw.map((o: any) => o.marca)));
    console.log(`Marcas disponibles:`, marcasDisponibles);
    
    if (!marcasDisponibles.includes('CONSUPAGO') && marcasDisponibles.length > 0) {
      alert(`Error de Paginación: Se trajeron ${tablasRaw.length} filas pero no apareció CONSUPAGO.`);
    }

    const totalSaldos = creditos.reduce((acc, c) => acc + c.saldo, 0);
    const capacidadTotalizada = montoSolicitar > 0 ? 0 : capacidadTotal + creditos.reduce((acc, c) => acc + c.descuentoActual, 0);

    const resultadosTemp: Record<string, Oferta[]> = {};
    const erroresTemp: Record<string, string> = {};

    marcasDisponibles.forEach(marca => {
      // 1. Filtrar las ofertas de esta marca
      const ofertasMarca = tablasRaw.filter((o: any) => o.marca === marca);
      
      // 2. Evaluaciones por cada oferta individual
      const ofertasViables: Oferta[] = [];
      let errorPrincipal = "";

      // Evaluaremos oferta por oferta
      for (const oferta of ofertasMarca) {
        // A. REGLAS GENERALES
        // Diferencial Neto o Monto Solicitado
        const neto = Number(oferta.monto) - totalSaldos;
        if (montoSolicitar > 0) {
          // Modo "Monto a Solicitar": Mostrar ÚNICAMENTE las ofertas cuyo MONTO BRUTO sea exactamente el monto solicitado
          if (Number(oferta.monto) !== montoSolicitar) {
            errorPrincipal = `El monto bruto ($${oferta.monto}) no es exactamente el monto solicitado ($${montoSolicitar})`;
            continue;
          }
        } else {
          // Modo "Capacidad" (Normal): Diferencial Neto
          const difMin = reglas['diferencial_neto_minimo'] || 5000;
          if (neto < difMin) {
            errorPrincipal = `Neto inferior a $${difMin}`;
            continue;
          }
        }

        // Edad Crítica
        const edadCritica = reglas['edad_critica_maxima'] || 85;
        // Plazo está en meses, por lo que lo dividimos entre 12 para sumarlo a la edad actual
        if (edad + (Number(oferta.plazo) / 12) > edadCritica) {
          errorPrincipal = `Edad Crítica excedida (${edadCritica})`;
          continue;
        }

        // Plazo Máximo
        const plazoMax = reglas['plazo_maximo'] || 60;
        if (Number(oferta.plazo) > plazoMax) {
          errorPrincipal = `Plazo mayor al permitido (${plazoMax})`;
          continue;
        }

        // Capacidad (se ignora si estamos pidiendo por monto a solicitar)
        if (montoSolicitar === 0 && Number(oferta.descuento) > capacidadTotalizada) {
          errorPrincipal = `Descuento supera la Capacidad (${capacidadTotalizada})`;
          continue;
        }

        // B. MEJORA DE CAT (Excluye CNCA Interno)
        if (tipoTramite !== 'CNCA INTERNO') {
          // Tomamos el CAT más bajo (el mejor CAT que tiene actualmente el cliente) para asegurar que la nueva oferta sea mejor que TODAS sus deudas.
          const catAnterior = creditos.length > 0 ? Math.min(...creditos.map(c => c.cat)) : 0;
          
          if (creditos.length > 0) {
            if (tipoTramite === 'CNCA') {
              if (Number(oferta.cat_valor) >= catAnterior) {
                errorPrincipal = "El nuevo CAT no es menor al anterior";
                continue;
              }
            } else if (tipoTramite === 'INTERCOMPAÑÍA' || tipoTramite === 'LCOM TERCEROS') {
              const mejoraReq = reglas['mejora_cat_intercompania'] || 0.50; // ej. 50% - 0.5% = 49.5%
              if (Number(oferta.cat_valor) > (catAnterior - mejoraReq)) {
                errorPrincipal = `CAT no mejora por al menos ${mejoraReq}%`;
                continue;
              }
            }
          }
        }

        // C. LÓGICA CNCA INTERNO (Atómica por crédito y marca)
        if (tipoTramite === 'CNCA INTERNO' && creditos.length > 0) {
          let capacidadDisponible = capacidadTotal;
          let todosPasan = true;

          for (const credito of creditos) {
            let pasaEsteCredito = false;
            let reqPlazoMinimo = 0;

            const baseKey = marca.toLowerCase();
            const tasaIdeal = reglas[`${baseKey}_tasa_ideal`] || 999;
            const tasaExt = reglas[`${baseKey}_tasa_extendida`] || 999;
            const pagosMin = reglas[`${baseKey}_pagos_aplicados_min`] || 999;
            const capReq = reglas[`${baseKey}_capacidad_requerida`] || 99999;

            if (credito.tasa <= tasaIdeal) pasaEsteCredito = true;
            else if (credito.pagosAplicados >= pagosMin && credito.tasa <= tasaExt) pasaEsteCredito = true;
            else if (capacidadDisponible >= capReq && credito.tasa <= tasaExt) {
              pasaEsteCredito = true;
              capacidadDisponible -= capReq; // Consume la capacidad!
            } else {
              // Intento por Incremento de Plazo
              reqPlazoMinimo = getMinPlazo(credito.plazo);
              if (Number(oferta.plazo) >= reqPlazoMinimo) {
                pasaEsteCredito = true;
              }
            }

            if (!pasaEsteCredito) {
              todosPasan = false;
              errorPrincipal = `Crédito con Tasa ${credito.tasa}% no cumple reglas base ni incremento de plazo.`;
              break;
            }
          }

          if (!todosPasan) continue;
        }

        // Si llegó hasta aquí, la oferta es Válida.
        ofertasViables.push(oferta);
      }

      // Agrupar por ID de Oferta
      if (ofertasViables.length > 0) {
        const mejoresPorId: Record<string, Oferta> = {};
        ofertasViables.forEach(o => {
          if (!mejoresPorId[o.id_oferta]) {
            mejoresPorId[o.id_oferta] = o;
          } else {
            if (montoSolicitar > 0) {
              // Modo "Monto a Solicitar": Nos quedamos con la opción más cercana al monto solicitado (la de menor monto de las que ya pasaron el filtro)
              if (Number(o.monto) < Number(mejoresPorId[o.id_oferta].monto)) {
                mejoresPorId[o.id_oferta] = o;
              }
            } else {
              // Modo "Capacidad" (Default): Nos quedamos con la de mayor monto posible
              if (Number(o.monto) > Number(mejoresPorId[o.id_oferta].monto)) {
                mejoresPorId[o.id_oferta] = o;
              }
            }
          }
        });
        // Ordenar plazos ascendentemente, y por id_oferta en caso de empate
        resultadosTemp[marca] = Object.values(mejoresPorId).sort((a, b) => {
          if (a.plazo !== b.plazo) return a.plazo - b.plazo;
          return a.id_oferta.localeCompare(b.id_oferta);
        });
      } else {
        erroresTemp[marca] = errorPrincipal || "No hay ofertas viables para este perfil.";
      }
    });

    setResultados(resultadosTemp);
    setErroresMarcas(erroresTemp);
    setMarcasEvaluadas(marcasDisponibles);
    setCalculando(false);
  };

  const totalSaldosFinal = creditos.reduce((acc, c) => acc + c.saldo, 0);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-indigo-500 w-12 h-12" /></div>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* PANEL DE CAPTURA (IZQUIERDA) */}
      <div className="xl:col-span-4 space-y-6 bg-neutral-900/50 backdrop-blur-sm p-8 rounded-[2.5rem] border border-neutral-800 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <h3 className="text-2xl font-black italic uppercase text-white flex items-center gap-2">
          <Calculator className="text-indigo-500" /> Originación
        </h3>
        
        <div className="space-y-5 relative z-10">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Capacidad de Pago</label>
              <div className="relative mt-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                <input 
                  type="number" 
                  value={capacidadTotal === 0 ? '' : capacidadTotal} 
                  onChange={e => {
                    setCapacidadTotal(Number(e.target.value));
                    if (Number(e.target.value) > 0) setMontoSolicitar(0);
                  }} 
                  disabled={montoSolicitar > 0}
                  placeholder="0"
                  className="w-full bg-black/50 border border-neutral-800 rounded-2xl p-4 pl-8 text-white font-black outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm disabled:opacity-30" 
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Monto a Solicitar</label>
              <div className="relative mt-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                <input 
                  type="number" 
                  value={montoSolicitar === 0 ? '' : montoSolicitar} 
                  onChange={e => {
                    setMontoSolicitar(Number(e.target.value));
                    if (Number(e.target.value) > 0) setCapacidadTotal(0);
                  }} 
                  disabled={capacidadTotal > 0}
                  placeholder="0"
                  className="w-full bg-black/50 border border-neutral-800 rounded-2xl p-4 pl-8 text-white font-black outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm disabled:opacity-30" 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Edad</label>
               <input type="number" value={edad === 0 ? '' : edad} onChange={e => setEdad(Number(e.target.value))} className="w-full mt-1 bg-black/50 border border-neutral-800 rounded-2xl p-4 text-white font-black outline-none focus:border-indigo-500 text-lg" />
            </div>
            <div>
               <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Trámite</label>
               <select value={tipoTramite} onChange={e => setTipoTramite(e.target.value)} className="w-full mt-1 bg-black/50 border border-neutral-800 rounded-2xl p-4 text-white font-black outline-none focus:border-indigo-500 text-sm">
                  <option>NUEVO</option>
                  <option>SEGUNDA DISP</option>
                  <option>CNCA INTERNO</option>
                  <option>CNCA</option>
                  <option>INTERCOMPAÑÍA</option>
                  <option>LCOM TERCEROS</option>
               </select>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-neutral-800/80">
          <div className="flex justify-between items-end mb-4">
            <h4 className="text-sm font-black text-neutral-300 uppercase tracking-widest">Créditos a Liquidar</h4>
            <span className="text-[10px] font-bold text-neutral-500 bg-neutral-900 px-2 py-1 rounded-lg border border-neutral-800">{creditos.length} de 5</span>
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {creditos.map((c, i) => (
              <div key={c.id} className="bg-black/30 border border-neutral-800 rounded-2xl p-4 relative group hover:border-neutral-700 transition-colors">
                <button onClick={() => eliminarCredito(c.id)} className="absolute -right-2 -top-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <Trash2 className="w-3 h-3" />
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-neutral-500 font-bold uppercase">Saldo a Liquidar</label>
                    <input type="number" value={c.saldo === 0 ? '' : c.saldo} onChange={e => actualizarCredito(c.id, 'saldo', Number(e.target.value))} className="w-full bg-neutral-900 rounded p-2 text-xs font-bold text-white border border-transparent focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] text-neutral-500 font-bold uppercase">Plazo Actual</label>
                    <input type="number" value={c.plazo === 0 ? '' : c.plazo} onChange={e => actualizarCredito(c.id, 'plazo', Number(e.target.value))} className="w-full bg-neutral-900 rounded p-2 text-xs font-bold text-white border border-transparent focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] text-neutral-500 font-bold uppercase">Tasa (%)</label>
                    <input type="number" step="0.01" value={c.tasa === 0 ? '' : c.tasa} onChange={e => actualizarCredito(c.id, 'tasa', Number(e.target.value))} className="w-full bg-neutral-900 rounded p-2 text-xs font-bold text-white border border-transparent focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] text-neutral-500 font-bold uppercase">Pagos Aplicados</label>
                    <input type="number" value={c.pagosAplicados === 0 ? '' : c.pagosAplicados} onChange={e => actualizarCredito(c.id, 'pagosAplicados', Number(e.target.value))} className="w-full bg-neutral-900 rounded p-2 text-xs font-bold text-white border border-transparent focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] text-neutral-500 font-bold uppercase">Descuento Actual</label>
                    <input type="number" step="0.01" value={c.descuentoActual === 0 ? '' : c.descuentoActual} onChange={e => actualizarCredito(c.id, 'descuentoActual', Number(e.target.value))} className="w-full bg-neutral-900 rounded p-2 text-xs font-bold text-white border border-transparent focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] text-neutral-500 font-bold uppercase">CAT (%)</label>
                    <input type="number" step="0.01" value={c.cat === 0 ? '' : c.cat} onChange={e => actualizarCredito(c.id, 'cat', Number(e.target.value))} className="w-full bg-neutral-900 rounded p-2 text-xs font-bold text-white border border-transparent focus:border-indigo-500 outline-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {creditos.length < 5 && (
            <button 
              onClick={agregarCredito}
              className="w-full mt-4 py-3 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 border-dashed rounded-2xl text-xs font-black text-neutral-400 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nuevo Crédito
            </button>
          )}

          <button 
            onClick={calcularOfertas}
            disabled={calculando}
            className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {calculando ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Calculator className="w-5 h-5" /> Calcular Ofertas</>}
          </button>
          
          <button 
            onClick={() => {
              setCapacidadTotal(1000);
              setMontoSolicitar(0);
              setEdad(35);
              setTipoTramite('CNCA INTERNO');
              setCreditos([]);
              setResultados({});
              setErroresMarcas({});
              setMarcasEvaluadas([]);
            }}
            disabled={calculando}
            className="w-full mt-3 py-4 bg-transparent hover:bg-neutral-800/80 border border-neutral-700 border-dashed text-neutral-400 hover:text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" /> Limpiar Datos
          </button>
        </div>
      </div>

      {/* RESULTADOS MULTIMARCA (DERECHA) */}
      <div className="xl:col-span-8 space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-3xl font-black italic uppercase text-white">Matriz de Ofertas</h3>
           <div className="text-right">
             <span className="block text-xs font-bold text-neutral-500 uppercase tracking-widest">Total a Liquidar</span>
             <span className="block text-xl font-black text-indigo-400">${totalSaldosFinal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
           </div>
        </div>

        {Object.keys(resultados).length === 0 && Object.keys(erroresMarcas).length === 0 ? (
          <div className="h-96 border-4 border-dashed border-neutral-800 rounded-[3rem] flex flex-col items-center justify-center text-neutral-600">
            <Calculator className="w-16 h-16 mb-4 opacity-50" />
            <p className="font-black uppercase tracking-widest">Ingresa datos y calcula</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Iterar sobre todas las marcas evaluadas */}
            {marcasEvaluadas.map(marca => {
              const ofertas = resultados[marca];
              const error = erroresMarcas[marca];
              
              if (error) {
                return (
                  <div key={marca} className="bg-neutral-900/40 border border-red-900/30 rounded-[2.5rem] p-6 opacity-60 backdrop-blur-sm">
                     <div className="flex justify-between items-center mb-4">
                        <span className="font-black italic text-neutral-500 text-xl">{marca}</span>
                        <AlertTriangle className="w-6 h-6 text-red-500/50" />
                     </div>
                     <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                       <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest leading-relaxed">{error}</p>
                     </div>
                  </div>
                );
              }

              if (ofertas && ofertas.length > 0) {
                return (
                  <div key={marca} className="bg-gradient-to-br from-neutral-900 to-black border border-neutral-800 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-center mb-6 relative z-10">
                       <span className="font-black italic text-white text-2xl tracking-tight">{marca}</span>
                       <div className="bg-emerald-500/10 p-2 rounded-full border border-emerald-500/20">
                         <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                       </div>
                    </div>

                    <div className="space-y-3 relative z-10">
                      {ofertas.map((o, idx) => (
                        <div key={`${o.id_oferta}-${idx}`} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-indigo-500/50 transition-colors">
                          <div className="flex justify-between items-center border-b border-neutral-800/50 pb-2">
                            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">ID: {o.id_oferta}</span>
                            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest bg-neutral-800 px-2 py-1 rounded">Plazo: {o.plazo}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="block text-[9px] font-bold text-neutral-500 uppercase">Monto Bruto</span>
                              <span className="block text-lg font-black text-white">${Number(o.monto).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[9px] font-bold text-neutral-500 uppercase">Neto Libre</span>
                              <span className="block text-lg font-black text-emerald-400">${(Number(o.monto) - totalSaldosFinal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800/50">
                            <div className="text-center">
                              <span className="block text-[8px] font-bold text-neutral-500 uppercase">Tasa</span>
                              <span className="block text-sm font-bold text-neutral-300">{Number(o.tasa).toFixed(2)}%</span>
                            </div>
                            <div className="text-center border-x border-neutral-800/50">
                              <span className="block text-[8px] font-bold text-neutral-500 uppercase">CAT</span>
                              <span className="block text-sm font-bold text-neutral-300">{Number(o.cat_valor).toFixed(2)}%</span>
                            </div>
                            <div className="text-center">
                              <span className="block text-[8px] font-bold text-neutral-500 uppercase">Descuento</span>
                              <span className="block text-sm font-bold text-indigo-400">${Number(o.descuento).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return null; // Si no hay ofertas ni error explícito
            })}

          </div>
        )}
      </div>
    </div>
  );
};
