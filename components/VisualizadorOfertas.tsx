import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, Calculator, CalendarClock, Scale, Info } from 'lucide-react';

interface OfertaAprobada {
  id: string;
  id_cotizador: string;
  marca: string;
  plazo: number;
  monto_bruto: number;
  descuento: number;
  tasa_mensual: number;
  cat_iva: number;
  monto_neto: number;
}

const mockOfertas: OfertaAprobada[] = [
  { id: '1', id_cotizador: 'COT-001', marca: 'Consubanco', plazo: 60, monto_bruto: 150000, descuento: 4500, tasa_mensual: 2.2, cat_iva: 31.4, monto_neto: 125000 },
  { id: '2', id_cotizador: 'COT-002', marca: 'Opcipres', plazo: 48, monto_bruto: 120000, descuento: 4100, tasa_mensual: 2.5, cat_iva: 35.1, monto_neto: 90000 },
  { id: '3', id_cotizador: 'COT-003', marca: 'Opcipres', plazo: 72, monto_bruto: 200000, descuento: 5800, tasa_mensual: 2.1, cat_iva: 29.8, monto_neto: 175000 },
];

export const VisualizadorOfertas = ({ ofertas = mockOfertas }: { ofertas?: OfertaAprobada[] }) => {
  const [selectedToCompare, setSelectedToCompare] = useState<string[]>([]);

  const toggleCompare = (id: string) => {
    if (selectedToCompare.includes(id)) {
      setSelectedToCompare(prev => prev.filter(p => p !== id));
    } else {
      if (selectedToCompare.length < 3) {
        setSelectedToCompare(prev => [...prev, id]);
      } else {
        alert("Puedes comparar hasta un máximo de 3 ofertas.");
      }
    }
  };

  const comparingOffers = ofertas.filter(o => selectedToCompare.includes(o.id));

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Ofertas Aprobadas</h2>
          <p className="text-neutral-500 text-sm font-medium mt-1">
            Motor de reglas ejecutado exitosamente. Selecciona para comparar.
          </p>
        </div>
        {selectedToCompare.length > 0 && (
          <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg border border-indigo-100 flex items-center gap-2">
            <Scale className="w-5 h-5" />
            <span className="text-sm font-bold">{selectedToCompare.length} / 3 Seleccionadas</span>
          </div>
        )}
      </div>
      
      {/* Grid Principal de Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
        {ofertas.map((oferta) => {
          const isSelected = selectedToCompare.includes(oferta.id);
          return (
            <div 
              key={oferta.id} 
              className={`relative bg-white rounded-3xl p-6 border-2 transition-all duration-300 overflow-hidden flex flex-col ${
                isSelected ? 'border-indigo-500 shadow-lg shadow-indigo-100' : 'border-neutral-200 shadow-sm hover:border-neutral-300'
              }`}
            >
              {/* Etiqueta ID */}
              <div className="absolute top-0 right-0 bg-neutral-100 text-neutral-500 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-neutral-200">
                {oferta.id_cotizador}
              </div>

              {/* Cabecera: Marca y Selección */}
              <div className="flex items-center justify-between mb-5 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-white font-black text-lg">
                    {oferta.marca.substring(0, 1)}
                  </div>
                  <h3 className="font-bold text-lg text-neutral-900">{oferta.marca}</h3>
                </div>
                
                {/* Botón de Comparar */}
                <button 
                  onClick={() => toggleCompare(oferta.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    isSelected 
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  {isSelected ? 'Comparando' : 'Comparar'}
                </button>
              </div>

              {/* Highlight Verde: Monto Neto */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 mb-5 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                <p className="text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-1 mt-1">
                  Monto Neto (Recibe el Cliente)
                </p>
                <p className="text-4xl font-black text-emerald-600 tracking-tighter">
                  ${oferta.monto_neto.toLocaleString()}
                </p>
              </div>

              {/* Grid de Datos 2x2 */}
              <div className="grid grid-cols-2 gap-3 mb-5 flex-grow">
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase">Pago Periódico</p>
                  <p className="text-neutral-900 font-black text-sm">${oferta.descuento.toLocaleString()}</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase">Plazo</p>
                  <p className="text-neutral-900 font-black text-sm">{oferta.plazo} meses</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase">Tasa Mensual</p>
                  <p className="text-neutral-900 font-black text-sm">{oferta.tasa_mensual}%</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase">CAT</p>
                  <p className="text-neutral-900 font-black text-sm">{oferta.cat_iva}%</p>
                </div>
              </div>

              {/* Monto Bruto */}
              <div className="bg-neutral-100/50 p-3 rounded-lg text-center border border-neutral-100">
                <p className="text-xs text-neutral-500 font-bold">Monto Bruto: <span className="text-neutral-800">${oferta.monto_bruto.toLocaleString()}</span></p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla Comparativa */}
      {selectedToCompare.length > 0 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-neutral-200 shadow-sm overflow-x-auto">
          <h3 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
            <Scale className="w-6 h-6 text-indigo-500" />
            Tabla Comparativa
          </h3>
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="p-3 border-b-2 border-neutral-200 text-neutral-500 font-bold text-sm">Métrica</th>
                {comparingOffers.map(o => (
                  <th key={`th-${o.id}`} className="p-3 border-b-2 border-neutral-200 text-neutral-900 font-black text-lg">
                    {o.marca} <span className="text-xs font-normal text-neutral-400 block">{o.id_cotizador}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border-b border-neutral-100 text-neutral-600 font-medium">Monto Neto</td>
                {comparingOffers.map(o => (
                  <td key={`neto-${o.id}`} className="p-3 border-b border-neutral-100 text-emerald-600 font-black text-lg">${o.monto_neto.toLocaleString()}</td>
                ))}
              </tr>
              <tr>
                <td className="p-3 border-b border-neutral-100 text-neutral-600 font-medium">Monto Bruto</td>
                {comparingOffers.map(o => (
                  <td key={`bruto-${o.id}`} className="p-3 border-b border-neutral-100 text-neutral-800 font-bold">${o.monto_bruto.toLocaleString()}</td>
                ))}
              </tr>
              <tr>
                <td className="p-3 border-b border-neutral-100 text-neutral-600 font-medium">Descuento</td>
                {comparingOffers.map(o => (
                  <td key={`desc-${o.id}`} className="p-3 border-b border-neutral-100 text-neutral-800 font-bold">${o.descuento.toLocaleString()}</td>
                ))}
              </tr>
              <tr>
                <td className="p-3 border-b border-neutral-100 text-neutral-600 font-medium">Plazo</td>
                {comparingOffers.map(o => (
                  <td key={`plazo-${o.id}`} className="p-3 border-b border-neutral-100 text-neutral-800 font-bold">{o.plazo} meses</td>
                ))}
              </tr>
              <tr>
                <td className="p-3 text-neutral-600 font-medium">CAT</td>
                {comparingOffers.map(o => (
                  <td key={`cat-${o.id}`} className="p-3 text-neutral-800 font-bold">{o.cat_iva}%</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
