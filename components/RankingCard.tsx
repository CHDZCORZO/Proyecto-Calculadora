"use client";
import React from 'react';
import { Trophy, Flame, Target, Heart, CreditCard } from 'lucide-react';

interface RankingCardProps {
  position: number; name: string; sucursal: string; supervisor: string;
  amount: number; totalVentas: number; metaMensual: number;
  metaAlDia: number; performanceScore: number; photoUrl?: string; badges?: any[];
}

export const RankingCard = ({
  position, name, sucursal, supervisor, amount, totalVentas,
  metaMensual, metaAlDia, performanceScore, photoUrl, badges = []
}: RankingCardProps) => {

  // Lógica de Rareza (Oro, Plata, Bronce)
  const getRareza = () => {
    if (position === 1) return { border: 'border-yellow-500/50', bg: 'from-yellow-600/20 via-neutral-900 to-neutral-950', text: 'text-yellow-500', label: 'ELITE ORO' };
    if (position <= 2) return { border: 'border-slate-400/50', bg: 'from-slate-500/20 via-neutral-900 to-neutral-950', text: 'text-slate-400', label: 'PRO PLATA' };
    if (position <= 3) return { border: 'border-orange-700/50', bg: 'from-orange-900/20 via-neutral-900 to-neutral-950', text: 'text-orange-700', label: 'BRONCE' };
    return { border: 'border-neutral-800', bg: 'from-neutral-800/10 via-neutral-900 to-neutral-950', text: 'text-neutral-500', label: 'ESTÁNDAR' };
  };

  const styles = getRareza();
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val || 0);

  const pctMensual = metaMensual > 0 ? Math.round((amount / metaMensual) * 100) : 0;
  const pctDiario = metaAlDia > 0 ? Math.round((amount / metaAlDia) * 100) : 0;

  return (
    <div
      className={`relative group w-80 h-[540px] rounded-[3rem] border-2 ${styles.border} bg-gradient-to-br ${styles.bg} shadow-2xl overflow-hidden transition-all duration-500 hover:scale-[1.03] animate-in fade-in slide-in-from-bottom-10`}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
      }}
    >

      {/* Efecto de luz radial que sigue al mouse */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none bg-[radial-gradient(600px_circle_at_var(--mouse-x)_var(--mouse-y),rgba(99,102,241,0.1),transparent_40%)]" />

      {/* BRILLO METÁLICO ANIMADO */}
      <div className="absolute inset-0 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent z-20 pointer-events-none" />

      {/* HEADER */}
      <div className="absolute top-8 left-8 right-8 z-10 flex justify-between items-start">
        <span className={`text-6xl font-black italic opacity-30 ${styles.text}`}>{position}</span>
        <div className="text-right">
          <p className={`text-[10px] font-black uppercase tracking-widest ${styles.text}`}>{styles.label}</p>
          <p className="text-sm font-black text-white uppercase">{supervisor}</p>
          <p className="text-[10px] font-medium text-neutral-500 uppercase">{sucursal}</p>
        </div>
      </div>

      {/* SCORE OVERALL */}
      <div className="absolute top-28 left-8 z-20 bg-indigo-600 px-3 py-1 rounded-xl shadow-xl border border-white/20 transform -rotate-6">
        <p className="text-[8px] font-black text-white/80 uppercase leading-none">Overall</p>
        <p className="text-xl font-black text-white italic">{Math.round(performanceScore)}</p>
      </div>

      {/* FOTO */}
      <div className="mt-24 flex justify-center">
        <div className={`w-40 h-40 rounded-full border-4 ${styles.border} bg-neutral-800 shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-500`}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Trophy className={`w-16 h-16 ${styles.text} opacity-20`} />
            </div>
          )}
        </div>
      </div>

      {/* INFO CENTRAL */}
      <div className="mt-6 text-center px-6">
        <h3 className="text-2xl font-black uppercase text-white tracking-tighter">{name}</h3>
        <div className="mt-2 inline-block bg-black/40 px-5 py-1.5 rounded-2xl border border-white/5">
          <span className={`text-xl font-black ${styles.text}`}>{formatCurrency(amount)}</span>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="mt-6 px-8 space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-black uppercase text-neutral-500">
            <span>Progreso Mensual</span>
            <span className="text-white">{pctMensual}%</span>
          </div>
          <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
            <div className={`h-full ${styles.text === 'text-yellow-500' ? 'bg-yellow-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(pctMensual, 100)}%` }} />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-black uppercase text-neutral-500">
            <span>vs Meta al Día</span>
            <span className="text-white">{pctDiario}%</span>
          </div>
          <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(pctDiario, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* CREDITOS (Cambio de nombre y visualización asegurada) */}
      <div className="mt-6 flex justify-center">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
          <CreditCard className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-black text-indigo-100 uppercase">{totalVentas} CRÉDITOS</span>
        </div>
      </div>

      {/* INSIGNIAS */}
      {/* CONTENEDOR LATERAL DE INSIGNIAS (DERECHA DE LA FOTO) */}
      <div className="absolute top-44 right-6 flex flex-col gap-3 z-30">
        {badges && badges.length > 0 && badges.map((badge: any, i: number) => (
          <div
            key={i}
            title={badge.label}
            className={`
              w-10 h-10 rounded-full bg-black/60 border border-white/10 
              flex items-center justify-center shadow-xl backdrop-blur-md 
              transition-all duration-300 hover:scale-125 hover:border-indigo-500
              animate-in fade-in slide-in-from-right-5
            `}
            style={{ transitionDelay: `${i * 100}ms` }}>
            {badge.iconName === 'flame' && <Flame className="w-5 h-5 text-orange-500 animate-pulse" />}
            {badge.iconName === 'target' && <Target className="w-5 h-5 text-indigo-400" />}
            {badge.iconName === 'heart' && <Heart className="w-5 h-5 text-red-500" />}
          </div>
        ))}
      </div>
    </div>
  );
};