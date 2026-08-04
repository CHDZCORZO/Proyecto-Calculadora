"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RankingSection } from '../components/RankingSection';
import { CotizadorHerramientas } from '../components/CotizadorHerramientas';
import { ActualizacionIMSS } from '../components/ActualizacionIMSS';
import { CorreosIMSS } from '../components/CorreosIMSS';
import { ConsultaIMSS } from '../components/ConsultaIMSS';
import { LayoutDashboard, Wrench, RefreshCw, Mail, Search } from 'lucide-react';
import { createClient } from '../utils/supabase/client';

export default function MainApp() {
  const [activeTab, setActiveTab] = useState<'ranking' | 'herramientas' | 'actualizacion_imss' | 'correos_imss' | 'consulta_imss'>('ranking');
  const [prefillNombre, setPrefillNombre] = useState<string>('');
  const [prefillCorreo, setPrefillCorreo] = useState<string>('');
  const [role, setRole] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('user_roles').select('role, disabled').eq('id', user.id).single();
        if (data) {
          if (data.disabled) {
            await supabase.auth.signOut();
            window.location.href = '/login';
            return;
          }
          setRole(data.role);
        }
      }
    }
    fetchRole();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* HEADER GLOBAL */}
      <header className="border-b border-neutral-800 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <h1 className="text-2xl font-black italic tracking-tighter">
            CLEARVOICE <span className="text-indigo-500">PRO</span>
          </h1>

          {/* NAVEGACIÓN POR PESTAÑAS */}
          <nav className="flex bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800">
            <button 
              onClick={() => setActiveTab('ranking')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'ranking' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
            >
              <LayoutDashboard className="w-4 h-4" /> Ranking 50/50
            </button>
            <button 
              onClick={() => setActiveTab('herramientas')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'herramientas' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
            >
              <Wrench className="w-4 h-4" /> Herramientas
            </button>
            <button 
              onClick={() => setActiveTab('actualizacion_imss')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'actualizacion_imss' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
            >
              <RefreshCw className="w-4 h-4" /> Actualización IMSS
            </button>
            <button 
              onClick={() => setActiveTab('correos_imss')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'correos_imss' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
            >
              <Mail className="w-4 h-4" /> Estatus Firmas
            </button>
            <button 
              onClick={() => setActiveTab('consulta_imss')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'consulta_imss' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
            >
              <Search className="w-4 h-4" /> Consulta IMSS
            </button>
          </nav>

          <div className="flex items-center gap-4">
             {role === 'Administrador' || role === 'Gerente' ? (
               <Link href="/admin" className="text-xs font-black uppercase text-indigo-400 hover:text-indigo-300 transition-colors">
                 Panel Admin
               </Link>
             ) : null}
             <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} className="text-xs font-black uppercase text-red-500 hover:text-red-400 transition-colors ml-4">
               Cerrar Sesión
             </button>
             <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest hidden md:inline ml-4">Live Engine</span>
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </header>

      {/* CONTENIDO DINÁMICO */}
      <div className="w-full">
        {activeTab === 'ranking' ? (
          <RankingSection />
        ) : activeTab === 'herramientas' ? (
          <CotizadorHerramientas />
        ) : activeTab === 'actualizacion_imss' ? (
          <ActualizacionIMSS 
            prefilledNombre={prefillNombre}
            prefilledCorreoAnterior={prefillCorreo}
            onClearPrefill={() => {
              setPrefillNombre('');
              setPrefillCorreo('');
            }}
          />
        ) : activeTab === 'correos_imss' ? (
          <CorreosIMSS />
        ) : (
          <ConsultaIMSS 
            onStartActualizacion={(nombre, correo) => {
              setPrefillNombre(nombre);
              setPrefillCorreo(correo);
              setActiveTab('actualizacion_imss');
            }}
          />
        )}
      </div>
    </div>
  );
}