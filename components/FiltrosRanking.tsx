import React from 'react';
import { Search, Filter, SlidersHorizontal, MapPin, Users, Briefcase } from 'lucide-react';

export const FiltrosRanking = () => {
  return (
    <div className="w-full bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 mb-8">
      <div className="flex items-center gap-2 mb-4 text-neutral-800 font-bold">
        <Filter className="w-5 h-5" />
        <h3>Filtros del Ranking</h3>
      </div>
      
      {/* Contenedor de Inputs Responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        
        {/* Buscador por Nombre */}
        <div className="lg:col-span-2 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-neutral-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre del ejecutivo..."
            className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Filtro: Marca */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Briefcase className="h-4 w-4 text-neutral-400" />
          </div>
          <select className="w-full pl-9 pr-8 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-700 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white">
            <option value="">Todas las Marcas</option>
            <option value="OPCIPRES">OPCIPRES</option>
            <option value="CONSUBANCO">CONSUBANCO</option>
            <option value="MAS NOMINA">MAS NOMINA</option>
            <option value="CONSUPAGO">CONSUPAGO</option>
          </select>
        </div>

        {/* Filtro: Tipo de Trámite / Producto */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Briefcase className="h-4 w-4 text-neutral-400" />
          </div>
          <select className="w-full pl-9 pr-8 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-700 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white">
            <option value="">Todos los Productos</option>
            <option value="NUEVO">NUEVO</option>
            <option value="SEGUNDA DISP">SEGUNDA DISP</option>
            <option value="CNCA INTERNO">CNCA INTERNO</option>
            <option value="CNCA">CNCA</option>
            <option value="INTERCOMPAÑÍA">INTERCOMPAÑÍA</option>
            <option value="LCOM TERCEROS">LCOM TERCEROS</option>
          </select>
        </div>

        {/* Filtro: Sucursal */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-4 w-4 text-neutral-400" />
          </div>
          <select className="w-full pl-9 pr-8 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-700 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white">
            <option value="">Todas las Sucursales</option>
            <option value="norte">CDMX Norte</option>
            <option value="sur">CDMX Sur</option>
            <option value="mty">Monterrey</option>
            <option value="gdl">Guadalajara</option>
          </select>
        </div>

        {/* Filtro: Supervisor */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Users className="h-4 w-4 text-neutral-400" />
          </div>
          <select className="w-full pl-9 pr-8 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-700 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white">
            <option value="">Todos los Supervisores</option>
            <option value="sup1">Alejandro Gómez</option>
            <option value="sup2">María Fernanda Ruiz</option>
            <option value="sup3">Carlos Slim</option>
          </select>
        </div>
      </div>

      {/* Botones de acción adicionales */}
      <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-end gap-3">
        <button className="px-4 py-2 text-sm font-semibold text-neutral-500 hover:text-neutral-800 transition-colors">
          Limpiar Filtros
        </button>
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
};
