import React from 'react';

export function Footer() {
  return (
    <footer className="w-full bg-black/40 border-t border-neutral-800 py-6 px-6 mt-auto">
      <div className="max-w-[1600px] mx-auto flex flex-row items-center justify-center gap-4 text-left">
        <div className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden shadow-[0_0_20px_-5px_rgba(79,70,229,0.3)] bg-neutral-900 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] md:text-xs font-black text-neutral-400 uppercase tracking-widest">
            © 2026 H. Corzo, Inc. y sus filiales. Todos los derechos reservados. — v1.2.0
          </p>
          <p className="text-[9px] md:text-[10px] font-bold text-indigo-500/80 uppercase tracking-[0.2em]">
            Desarrollado con mentalidad de crecimiento.
          </p>
        </div>
      </div>
    </footer>
  );
}
