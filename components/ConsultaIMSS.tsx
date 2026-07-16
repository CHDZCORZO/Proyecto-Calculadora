"use client";
import React, { useState } from 'react';
import { createClient } from '../utils/supabase/client';
import { 
  Search, 
  User, 
  Mail, 
  FileText, 
  Copy, 
  Check, 
  ArrowRight,
  ShieldAlert,
  Loader2,
  Inbox,
  UserCheck
} from 'lucide-react';

interface PadronRecord {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  curp: string;
  rfc: string;
  correo: string;
  tipo_cliente: string;
}

interface ConsultaIMSSProps {
  onStartActualizacion?: (nombre: string, correoAnterior: string) => void;
}

export function ConsultaIMSS({ onStartActualizacion }: ConsultaIMSSProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<PadronRecord | null>(null);
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setRecord(null);
    setSearched(false);

    const term = searchTerm.trim().toUpperCase();
    if (!term) return;

    if (term.length !== 10 && term.length !== 18) {
      setError("La búsqueda debe ser un RFC a 10 dígitos o un CURP a 18 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('padron_imss')
        .select('*')
        .or(`curp.eq.${term},rfc.eq.${term}`)
        .limit(1);

      if (dbError) throw dbError;

      setRecord(data && data.length > 0 ? data[0] : null);
      setSearched(true);
    } catch (err: any) {
      console.error(err);
      setError("Ocurrió un error al buscar en el padrón.");
    } finally {
      setLoading(false);
    }
  };

  const copyCorreo = () => {
    if (!record?.correo) return;
    navigator.clipboard.writeText(record.correo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 md:p-12 text-neutral-100 font-sans max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* CABECERA */}
      <div className="bg-neutral-900/50 p-8 rounded-[3rem] border border-neutral-800 shadow-2xl space-y-8">
        <div className="flex items-center gap-4 border-b border-neutral-800 pb-6">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
            <Search className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Consulta IMSS</h2>
            <p className="text-neutral-500 text-sm font-bold uppercase tracking-widest mt-1">Buscador de Correos y Datos Registrados</p>
          </div>
        </div>

        {/* INPUT DE BÚSQUEDA */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-black uppercase text-neutral-400 tracking-widest ml-2">
              Buscar por CURP o RFC (10 Dígitos)
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative flex items-center">
                <Search className="w-5 h-5 text-neutral-500 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="EJ: OIMJ560922 o OIMJ560922HDGRRM01"
                  required
                  maxLength={18}
                  className="w-full bg-black/40 border border-neutral-800 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-indigo-500 text-sm font-bold text-white placeholder:text-neutral-700 tracking-widest transition-colors uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    Buscar
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-neutral-500 ml-2 uppercase font-bold">
              Introduce exactamente 10 caracteres para RFC o 18 caracteres para CURP
            </p>
          </div>
        </form>

        {/* ERROR DE VALIDACIÓN */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm font-bold uppercase flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* VISTA DE RESULTADOS */}
        {searched && (
          <div className="pt-6 border-t border-neutral-800 animate-in fade-in zoom-in-95 duration-500">
            {record ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-emerald-400 font-black uppercase text-sm tracking-wider ml-2">
                  <UserCheck className="w-5 h-5" />
                  Registro Encontrado
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/30 p-8 rounded-3xl border border-neutral-800">
                  {/* Nombre */}
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Nombre Completo</span>
                    <p className="text-2xl font-black text-white uppercase tracking-tight">
                      {record.nombre} {record.apellido_paterno} {record.apellido_materno}
                    </p>
                  </div>

                  {/* Correo Principal */}
                  <div className="space-y-1 md:col-span-2 border-t border-neutral-800/50 pt-4 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                    <div>
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-indigo-400" /> Correo Registrado
                      </span>
                      <p className="text-xl font-bold text-indigo-400 mt-1 select-all break-all">
                        {record.correo}
                      </p>
                    </div>
                    <button
                      onClick={copyCorreo}
                      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
                        copied 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copiar Correo
                        </>
                      )}
                    </button>
                  </div>

                  {/* CURP */}
                  <div className="space-y-1 border-t border-neutral-800/50 pt-4">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-neutral-400" /> CURP
                    </span>
                    <p className="text-sm font-black text-white tracking-widest uppercase">
                      {record.curp}
                    </p>
                  </div>

                  {/* RFC */}
                  <div className="space-y-1 border-t border-neutral-800/50 pt-4">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-neutral-400" /> RFC (10 Dígitos)
                    </span>
                    <p className="text-sm font-black text-white tracking-widest uppercase">
                      {record.rfc}
                    </p>
                  </div>

                  {/* Tipo de Cliente */}
                  <div className="space-y-1 border-t border-neutral-800/50 pt-4">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-neutral-400" /> Tipo de Cliente
                    </span>
                    <p className="mt-1">
                      <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {record.tipo_cliente || "Jubilado"}
                      </span>
                    </p>
                  </div>
                </div>

                {onStartActualizacion && (
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={() => {
                        const nombreCompleto = `${record.nombre} ${record.apellido_paterno} ${record.apellido_materno}`.trim();
                        onStartActualizacion(nombreCompleto, record.correo);
                      }}
                      className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest py-4 px-8 rounded-2xl transition-all shadow-xl shadow-indigo-900/20 text-xs"
                    >
                      Iniciar Formato de Actualización
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center border-2 border-dashed border-neutral-800 rounded-3xl bg-neutral-900/20">
                <Inbox className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                <h4 className="text-neutral-500 font-black uppercase tracking-widest text-sm">Sin Coincidencias</h4>
                <p className="text-neutral-600 text-xs mt-1 uppercase font-bold">
                  No se encontró ningún registro con el CURP o RFC ingresado.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
