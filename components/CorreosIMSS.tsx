"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '../utils/supabase/client';
import { getUsersList } from '../app/actions/users';
import { 
  Mail, 
  Search, 
  Trash2, 
  Copy, 
  Check, 
  FileText, 
  ExternalLink, 
  Clock, 
  RefreshCw, 
  Inbox, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ImssFirma {
  id: string;
  token: string;
  file_path: string;
  nss: string;
  status: string;
  created_at: string;
  created_by: string | null;
}

// Mapeo manual de prefijos de correo a nombres legibles
const mapEmailToName = (email: string) => {
  if (!email) return "Sin Asesor";
  const prefix = email.split('@')[0].toLowerCase();
  const mappings: { [key: string]: string } = {
    mruiz: "Fernanda Ruiz",
    adiaz: "Ana Diaz",
    xbernal: "Ximena Bernal",
    yivarra: "Yamilet Ibarra",
    khernandez: "Kathia Hernandez",
    rlevario: "Rosa Levario",
    lmarin: "Luis Marin",
    egarcia: "Erick Garcia",
    rcervantes: "Raul Cervantes",
    amedina: "Axel Medina",
    acruz: "Ana Cruz",
    mlopez: "Massiel Lopez",
    chernandez: "C. Hernandez",
    emiranda: "E. Miranda",
    ggil: "G. Gil",
    rlopez: "R. Lopez",
    gesquivel: "G. Esquivel"
  };
  return mappings[prefix] || prefix.toUpperCase();
};

export function CorreosIMSS() {
  const [data, setData] = useState<ImssFirma[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [error, setError] = useState("");

  const supabase = createClient();

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      // 1. Obtener usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      // 2. Obtener el rol del usuario
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const userRole = roleData?.role;
      setUserRole(userRole || null);

      // 3. Obtener listado de usuarios para mapear asesores
      try {
        const users = await getUsersList();
        setUsersList(users || []);
      } catch (userErr) {
        console.error("Error al obtener lista de usuarios:", userErr);
      }

      // 4. Construir consulta filtrada
      let query = supabase
        .from('imss_firmas')
        .select('*');

      // Si el rol es Asesor (o cualquier otro no supervisor/gerente/admin), solo ve lo propio
      if (userRole === 'Asesor' || !['Administrador', 'Gerente', 'Supervisor'].includes(userRole || '')) {
        query = query.eq('created_by', user.id);
      }

      const { data: firmas, error: dbError } = await query.order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setData((firmas as ImssFirma[]) || []);
    } catch (err: any) {
      console.error(err);
      setError("Error al cargar los registros de estatus de firmas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyLink = (token: string, id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}/firmar/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteRecord = async (id: string, filePath: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.")) {
      return;
    }

    setDeletingId(id);
    try {
      // 1. Eliminar de la base de datos
      const { error: dbError } = await supabase
        .from('imss_firmas')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // 2. Eliminar del storage (opcional, pero buena práctica si existe)
      if (filePath) {
        await supabase.storage
          .from('imss_documents')
          .remove([filePath]);
      }

      setData(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      console.error(err);
      alert("Hubo un error al eliminar el registro.");
    } finally {
      setDeletingId(null);
    }
  };

  // Formatear fecha
  const formatearFecha = (fechaStr: string) => {
    try {
      const date = new Date(fechaStr);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return fechaStr;
    }
  };

  // Filtro de datos base para estadísticas y dashboard (sin aplicar filtro de estatus)
  const dataFilteredForStats = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.nss.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.file_path.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = !selectedMonth || item.created_at.startsWith(selectedMonth);
      return matchesSearch && matchesMonth;
    });
  }, [data, searchTerm, selectedMonth]);

  // Estadísticas globales filtradas
  const total = dataFilteredForStats.length;

  // Clasificación de NSS únicos globales
  const { nssUnicos, firmados, pendientes } = useMemo(() => {
    // Agrupar estados por NSS
    const nssGroups: { [nss: string]: string[] } = {};
    dataFilteredForStats.forEach(d => {
      if (!nssGroups[d.nss]) {
        nssGroups[d.nss] = [];
      }
      nssGroups[d.nss].push(d.status);
    });

    let firmadosCount = 0;
    let pendientesCount = 0;

    Object.values(nssGroups).forEach(statuses => {
      if (statuses.includes('firmado')) {
        firmadosCount++;
      } else {
        pendientesCount++;
      }
    });

    return {
      nssUnicos: Object.keys(nssGroups).length,
      firmados: firmadosCount,
      pendientes: pendientesCount
    };
  }, [dataFilteredForStats]);

  // Agrupación de estadísticas por asesor (calculadas por NSS únicos)
  const advisorStats = useMemo(() => {
    // 1. Agrupar solicitudes por asesor
    const advisorGroups: { [key: string]: ImssFirma[] } = {};
    
    dataFilteredForStats.forEach(item => {
      const userId = item.created_by || null;
      const key = userId || 'sin_asesor';
      if (!advisorGroups[key]) {
        advisorGroups[key] = [];
      }
      advisorGroups[key].push(item);
    });

    // 2. Calcular estadísticas por cada asesor
    const stats = Object.entries(advisorGroups).map(([key, items]) => {
      const userId = key === 'sin_asesor' ? null : key;
      const u = usersList.find(user => user.id === userId);
      const email = u?.email || '';
      const name = userId ? (u?.nombre || mapEmailToName(email)) : 'Sin Asesor';

      // Agrupar por NSS para este asesor
      const nssGroups: { [nss: string]: string[] } = {};
      items.forEach(item => {
        if (!nssGroups[item.nss]) {
          nssGroups[item.nss] = [];
        }
        nssGroups[item.nss].push(item.status);
      });

      let firmadosUnicos = 0;
      let pendientesUnicos = 0;

      Object.values(nssGroups).forEach(statuses => {
        if (statuses.includes('firmado')) {
          firmadosUnicos++;
        } else {
          pendientesUnicos++;
        }
      });

      return {
        id: userId,
        name,
        email,
        total: items.length, // total solicitudes
        uniqueNssCount: Object.keys(nssGroups).length, // total NSS únicos
        firmados: firmadosUnicos, // NSS únicos firmados
        pendientes: pendientesUnicos // NSS únicos pendientes
      };
    });

    return stats.sort((a, b) => b.total - a.total);
  }, [dataFilteredForStats, usersList]);

  // Filtrado de datos final para la lista (aplica estatus)
  const filteredData = useMemo(() => {
    return dataFilteredForStats.filter(item => {
      const matchesStatus = statusFilter === 'todos' || 
                            (statusFilter === 'firmados' && item.status === 'firmado') ||
                            (statusFilter === 'pendientes' && item.status === 'pendiente');

      return matchesStatus;
    });
  }, [dataFilteredForStats, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-neutral-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin w-12 h-12 text-indigo-500" />
        <span className="text-neutral-500 uppercase font-black tracking-widest text-xs">Cargando registros...</span>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 text-neutral-100 font-sans max-w-[1600px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* CABECERA */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-800 pb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Mail className="text-indigo-500 w-8 h-8" />
            <h1 className="text-5xl font-black italic tracking-tighter text-white">
              ESTATUS <span className="text-indigo-500">FIRMAS</span>
            </h1>
          </div>
          <p className="text-lg text-neutral-500 font-medium uppercase tracking-widest">
            Control de Formatos y Enlaces para Firmas de Actualización IMSS
          </p>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-xs font-black uppercase tracking-wider text-neutral-400 hover:text-white hover:border-neutral-700 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </header>

      {/* ESTADÍSTICAS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-neutral-900/40 backdrop-blur-sm rounded-3xl p-6 border border-neutral-700/30 flex flex-col justify-between hover:border-indigo-500/20 transition-all">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-black uppercase text-neutral-500 tracking-widest">Total Generados</span>
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-4xl font-black text-white">{total}</p>
        </div>

        <div className="bg-neutral-900/40 backdrop-blur-sm rounded-3xl p-6 border border-neutral-700/30 flex flex-col justify-between hover:border-violet-500/20 transition-all">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-black uppercase text-neutral-500 tracking-widest">NSS Únicos</span>
            <Search className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-4xl font-black text-violet-400">{nssUnicos}</p>
        </div>

        <div className="bg-neutral-900/40 backdrop-blur-sm rounded-3xl p-6 border border-neutral-700/30 flex flex-col justify-between hover:border-emerald-500/20 transition-all">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-black uppercase text-neutral-500 tracking-widest">Firmados</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-4xl font-black text-emerald-400">{firmados}</p>
        </div>

        <div className="bg-neutral-900/40 backdrop-blur-sm rounded-3xl p-6 border border-neutral-700/30 flex flex-col justify-between hover:border-amber-500/20 transition-all">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-black uppercase text-neutral-500 tracking-widest">Pendientes</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-4xl font-black text-amber-400">{pendientes}</p>
        </div>
      </section>

      {/* FILTROS Y CONTROLES */}
      <section className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-neutral-900/30 p-6 rounded-3xl border border-neutral-800/80">
        {/* BUSCADOR */}
        <div className="flex-1 max-w-md relative flex items-center">
          <Search className="w-5 h-5 text-neutral-500 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por NSS o archivo..."
            className="w-full bg-black/40 border border-neutral-800 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-indigo-500 text-sm font-bold text-white placeholder:text-neutral-600 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-6">
          {/* FILTRO DE FECHA (MES) */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase text-neutral-500 tracking-widest">Filtrar Mes:</span>
            <div className="relative flex items-center bg-black/40 border border-neutral-800 rounded-2xl px-4 py-2.5">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-white outline-none [color-scheme:dark]"
              />
              {selectedMonth && (
                <button 
                  onClick={() => setSelectedMonth('')}
                  className="ml-3 text-neutral-500 hover:text-white text-[10px] font-black uppercase tracking-wider"
                >
                  Todos
                </button>
              )}
            </div>
          </div>

          {/* SELECT DE FILTRADO */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase text-neutral-500 tracking-widest hidden sm:inline">Estatus:</span>
            <div className="bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800 flex gap-2">
              {(['todos', 'firmados', 'pendientes'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                    statusFilter === filter 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DESGLOSE POR ASESOR */}
      {['Administrador', 'Gerente', 'Supervisor'].includes(userRole || '') && advisorStats.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Solicitudes por Asesor
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {advisorStats.map((stat) => {
              const porcentajeFirma = stat.uniqueNssCount > 0 ? Math.round((stat.firmados / stat.uniqueNssCount) * 100) : 0;
              return (
                <div 
                  key={stat.id || 'sin_asesor'} 
                  className="bg-neutral-900/20 backdrop-blur-sm rounded-[2rem] p-6 border border-neutral-800/80 hover:border-neutral-700/80 transition-all flex flex-col justify-between space-y-5 group animate-in fade-in slide-in-from-bottom-2 duration-500"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors">{stat.name}</h3>
                        <p className="text-[10px] text-neutral-500 font-bold mt-0.5">{stat.email || 'Sin correo registrado'}</p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-neutral-900 border border-neutral-800 text-neutral-400 px-3 py-1 rounded-xl">
                        {stat.total} {stat.total === 1 ? 'solicitud' : 'solicitudes'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-black/40 p-3 rounded-xl border border-neutral-800/40 text-center">
                        <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">NSS Únicos</p>
                        <p className="text-base font-black text-white mt-1">{stat.uniqueNssCount}</p>
                      </div>
                      <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 text-center">
                        <p className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest">Firmados</p>
                        <p className="text-base font-black text-emerald-400 mt-1">{stat.firmados}</p>
                      </div>
                      <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 text-center">
                        <p className="text-[8px] font-black text-amber-500/60 uppercase tracking-widest">Pendientes</p>
                        <p className="text-base font-black text-amber-400 mt-1">{stat.pendientes}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-neutral-400">
                      <span>Estatus Firmas</span>
                      <span>{porcentajeFirma}% completado</span>
                    </div>
                    <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-neutral-800/60">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${porcentajeFirma}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* LISTADO DE REGISTROS */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <p className="text-sm font-bold uppercase tracking-wide">{error}</p>
        </div>
      )}

      <section className="space-y-6">
        <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Registro de Solicitudes
        </h2>
        {filteredData.length > 0 ? (
          <div className="bg-neutral-900/20 rounded-[2.5rem] border border-neutral-800/80 overflow-hidden shadow-2xl">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/50">
                    <th className="py-5 px-8 text-xs font-black uppercase text-neutral-400 tracking-widest">NSS</th>
                    {['Administrador', 'Gerente', 'Supervisor'].includes(userRole || '') && (
                      <th className="py-5 px-6 text-xs font-black uppercase text-neutral-400 tracking-widest">Asesor</th>
                    )}
                    <th className="py-5 px-6 text-xs font-black uppercase text-neutral-400 tracking-widest">Fecha Generación</th>
                    <th className="py-5 px-6 text-xs font-black uppercase text-neutral-400 tracking-widest text-center">Estatus</th>
                    <th className="py-5 px-6 text-xs font-black uppercase text-neutral-400 tracking-widest">Enlace de Firma</th>
                    <th className="py-5 px-6 text-xs font-black uppercase text-neutral-400 tracking-widest text-center">Documento</th>
                    {userRole === 'Administrador' && (
                      <th className="py-5 px-8 text-xs font-black uppercase text-neutral-400 tracking-widest text-right">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {filteredData.map((item) => {
                    const docUrl = `/api/documentos/${encodeURIComponent(item.file_path)}`;
                    const firmaLink = typeof window !== 'undefined' ? `${window.location.origin}/firmar/${item.token}` : '';
                    
                    return (
                      <tr key={item.id} className="hover:bg-neutral-900/30 transition-colors">
                        <td className="py-5 px-8 text-sm font-black text-white tracking-wider">{item.nss}</td>
                        {['Administrador', 'Gerente', 'Supervisor'].includes(userRole || '') && (
                          <td className="py-5 px-6 text-xs font-bold text-indigo-400">
                            {(() => {
                              const u = usersList.find(usr => usr.id === item.created_by);
                              return u ? (u.nombre || mapEmailToName(u.email)) : 'Sin Asesor';
                            })()}
                          </td>
                        )}
                        <td className="py-5 px-6 text-xs font-bold text-neutral-400">{formatearFecha(item.created_at)}</td>
                        <td className="py-5 px-6 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            item.status === 'firmado' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {item.status === 'firmado' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            {item.status}
                          </span>
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-2 max-w-[280px]">
                            <input
                              type="text"
                              readOnly
                              value={firmaLink}
                              className="bg-black/40 border border-neutral-800 text-[10px] text-neutral-500 font-bold px-3 py-1.5 rounded-xl outline-none w-full select-all"
                            />
                            <button
                              onClick={() => copyLink(item.token, item.id)}
                              className={`flex-shrink-0 p-1.5 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white ${copiedId === item.id ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' : ''}`}
                              title="Copiar Enlace de Firma"
                            >
                              {copiedId === item.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-xs font-black uppercase tracking-wider transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Ver PDF
                          </a>
                        </td>
                        {userRole === 'Administrador' && (
                          <td className="py-5 px-8 text-right">
                            <button
                              onClick={() => deleteRecord(item.id, item.file_path)}
                              disabled={deletingId === item.id}
                              className="p-2 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500/60 hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-50"
                              title="Eliminar Registro"
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="block lg:hidden divide-y divide-neutral-800">
              {filteredData.map((item) => {
                const docUrl = `/api/documentos/${encodeURIComponent(item.file_path)}`;
                const firmaLink = typeof window !== 'undefined' ? `${window.location.origin}/firmar/${item.token}` : '';

                return (
                  <div key={item.id} className="p-6 space-y-4 bg-neutral-900/10 hover:bg-neutral-900/20 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">NSS</p>
                        <p className="text-base font-black text-white mt-0.5 tracking-wider">{item.nss}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.status === 'firmado' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {item.status === 'firmado' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {item.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {['Administrador', 'Gerente', 'Supervisor'].includes(userRole || '') && (
                        <div>
                          <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Asesor</p>
                          <p className="text-xs font-bold text-indigo-400 mt-0.5">
                            {(() => {
                              const u = usersList.find(usr => usr.id === item.created_by);
                              return u ? (u.nombre || mapEmailToName(u.email)) : 'Sin Asesor';
                            })()}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Fecha Generación</p>
                        <p className="text-xs font-bold text-neutral-300 mt-0.5">{formatearFecha(item.created_at)}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Enlace de Firma</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={firmaLink}
                          className="bg-black/40 border border-neutral-800 text-[10px] text-neutral-500 font-bold px-3 py-2.5 rounded-xl outline-none w-full select-all"
                        />
                        <button
                          onClick={() => copyLink(item.token, item.id)}
                          className={`flex-shrink-0 p-2.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white ${copiedId === item.id ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' : ''}`}
                        >
                          {copiedId === item.id ? <Check className="w-4.5 h-4.5" /> : <Copy className="w-4.5 h-4.5" />}
                        </button>
                      </div>
                    </div>

                    <div className={`flex items-center pt-2 border-t border-neutral-800/60 ${userRole === 'Administrador' ? 'justify-between' : 'justify-start'}`}>
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-xs font-black uppercase tracking-wider transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ver Documento PDF
                      </a>

                      {userRole === 'Administrador' && (
                        <button
                          onClick={() => deleteRecord(item.id, item.file_path)}
                          disabled={deletingId === item.id}
                          className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500/60 hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-50"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-4.5 h-4.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-4.5 h-4.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-32 text-center border-4 border-dashed border-neutral-800/50 rounded-[3rem] bg-neutral-900/10">
            <Inbox className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500 font-black uppercase tracking-[0.3em] text-xl">Sin Registros</p>
            <p className="text-neutral-600 text-sm mt-2 font-bold uppercase">No se han encontrado formatos de estatus de firmas</p>
          </div>
        )}
      </section>
    </div>
  );
}

