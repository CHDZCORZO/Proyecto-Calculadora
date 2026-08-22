"use client";

import React, { useEffect, useState } from 'react';
import ExcelJS from 'exceljs';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  LayoutDashboard,
  ShieldCheck,
  Target,
  User,
  Trash2,
  Settings2
} from 'lucide-react';
import Link from 'next/link';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '../../utils/supabase/client';
import { createUser, getUsersList, deleteUserAccount, updateUserAccount } from '../actions/users';

export default function AdminPage() {
  const supabase = createClient();
  const [uploadStatus, setUploadStatus] = useState<{
    msg: string;
    type: 'idle' | 'loading' | 'success' | 'error';
  }>({ msg: '', type: 'idle' });

  // ----------------------------------------------------
  // ESTADOS DE CONFIGURACIÓN MENSUAL
  // ----------------------------------------------------
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const [uploadMonth, setUploadMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const [metaBase, setMetaBase] = useState(150000);
  const [fechasOperativas, setFechasOperativas] = useState<Date[]>([]);
  const [metasIndividuales, setMetasIndividuales] = useState<{ [key: string]: number }>({});
  const [isClient, setIsClient] = useState(false);

  // ----------------------------------------------------
  // ESTADOS DE ARCHIVOS DE COTIZACIÓN
  // ----------------------------------------------------
  const [archivosCargados, setArchivosCargados] = useState<any[]>([]);

  // ----------------------------------------------------
  // ESTADOS DE GESTIÓN DE USUARIOS
  // ----------------------------------------------------
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userMsg, setUserMsg] = useState('');

  // Estados de edición de usuario
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<any | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editDisabled, setEditDisabled] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editMsg, setEditMsg] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const openEditModal = (u: any) => {
    setSelectedUserToEdit(u);
    setEditNombre(u.nombre || '');
    setEditRole(u.role || 'Asesor');
    setEditDisabled(!!u.disabled);
    setEditPassword('');
    setEditMsg('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToEdit) return;

    setEditLoading(true);
    setEditMsg('');

    try {
      const updates: any = {};
      if (editNombre !== selectedUserToEdit.nombre) updates.nombre = editNombre;
      if (editRole !== selectedUserToEdit.role) updates.role = editRole;
      if (editDisabled !== selectedUserToEdit.disabled) updates.disabled = editDisabled;
      if (editPassword) updates.password = editPassword;

      if (Object.keys(updates).length === 0) {
        setEditMsg('No hay cambios que guardar.');
        setEditLoading(false);
        return;
      }

      const res = await updateUserAccount(selectedUserToEdit.id, updates);
      if (res.success) {
        alert('Usuario actualizado correctamente.');
        setSelectedUserToEdit(null);
        fetchUsers();
      } else {
        setEditMsg(`Error: ${res.error}`);
      }
    } catch (err: any) {
      setEditMsg(`Error: ${err.message}`);
    } finally {
      setEditLoading(false);
    }
  };

  // ----------------------------------------------------
  // ESTADOS DE REGLAS DE COTIZADOR
  // ----------------------------------------------------
  const [reglasCotizador, setReglasCotizador] = useState<any[]>([]);
  const [guardandoReglas, setGuardandoReglas] = useState(false);
  const [reglasMsg, setReglasMsg] = useState('');
  const [uploadPadronStatus, setUploadPadronStatus] = useState<{msg: string, type: 'idle' | 'loading' | 'success' | 'error'}>({ msg: '', type: 'idle' });

  const fetchReglasCotizador = async () => {
    const { data } = await supabase.from('reglas_cotizador').select('*').order('marca');
    if (data) setReglasCotizador(data);
  };

  const guardarReglas = async () => {
    setGuardandoReglas(true);
    setReglasMsg('');
    try {
      const { error } = await supabase.from('reglas_cotizador').upsert(
        reglasCotizador.map(r => ({
          id: r.id,
          marca: r.marca,
          regla_key: r.regla_key,
          regla_value: r.regla_value,
          descripcion: r.descripcion
        }))
      );
      if (error) throw error;
      setReglasMsg('Reglas guardadas correctamente.');
      setTimeout(() => setReglasMsg(''), 3000);
    } catch (err: any) {
      setReglasMsg(`Error: ${err.message}`);
    }
    setGuardandoReglas(false);
  };

  const fetchUsers = async () => {
    const users = await getUsersList();
    setUsersList(users);
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el acceso de ${email}?`)) return;
    
    setUserMsg('Eliminando usuario...');
    const res = await deleteUserAccount(userId);
    if (res.success) {
      setUserMsg(`Usuario ${email} eliminado.`);
      fetchUsers();
    } else {
      setUserMsg(`Error al eliminar: ${res.error}`);
    }
  };

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    const { data, error } = await supabase.from('user_roles').select('role').eq('id', user.id).single();
    if (error) {
      console.error("Error fetching role:", error);
      alert("Error al verificar permisos: " + error.message);
      window.location.href = '/';
      return;
    }
    if (!data || (data.role !== 'Administrador' && data.role !== 'Gerente')) {
      alert("No tienes permisos para acceder a esta área. Tu rol es: " + (data?.role || 'Desconocido'));
      window.location.href = '/';
      return;
    }
    setIsClient(true);
  };

  useEffect(() => {
    checkAccess();
  }, []);

  const fetchArchivos = async () => {
    const { data } = await supabase
      .from('archivos_cargados')
      .select('*')
      .order('fecha_carga', { ascending: false });
    if (data) setArchivosCargados(data);
  };

  useEffect(() => {
    if (isClient) {
      fetchArchivos();
      fetchUsers();
      fetchReglasCotizador();
    }
  }, [isClient]);

  const eliminarArchivo = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este archivo? Se borrarán todas sus ofertas asociadas.')) return;
    try {
      const { error } = await supabase.from('archivos_cargados').delete().eq('id', id);
      if (error) {
        console.error("Error al eliminar archivo:", error);
        alert("Error al eliminar archivo: " + error.message);
      } else {
        alert("Archivo y sus ofertas asociadas eliminados correctamente.");
        fetchArchivos();
      }
    } catch (err: any) {
      console.error(err);
      alert("Error inesperado: " + err.message);
    }
  };

  const eliminarPadron = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este archivo? Se borrarán todos los registros del padrón IMSS.')) return;
    try {
      const { error } = await supabase.rpc('eliminar_padron_imss', { p_id: id });
      if (error) {
        console.error("Error al eliminar padrón:", error);
        alert("Error al eliminar padrón: " + error.message);
      } else {
        alert("Padrón IMSS y todos sus registros eliminados correctamente.");
        fetchArchivos();
      }
    } catch (err: any) {
      console.error(err);
      alert("Error inesperado: " + err.message);
    }
  };

  useEffect(() => {
    setIsClient(true);
    fetchArchivos();
  }, []);

  // Cargar configuración al cambiar el mes seleccionado
  useEffect(() => {
    if (!isClient) return;
    const fetchConfig = async () => {
      const { data, error } = await supabase
        .from('config_metas')
        .select('*')
        .eq('mes_ano', selectedMonth)
        .single();

      if (data) {
        setMetaBase(data.meta_mensual_base || 150000);
        setFechasOperativas((data.fechas_operativas || []).map((d: string) => new Date(d + 'T12:00:00Z')));
        setMetasIndividuales(data.metas_individuales || {});
      } else {
        setMetaBase(150000);
        setFechasOperativas([]);
        setMetasIndividuales({});
      }
    };
    fetchConfig();
  }, [selectedMonth, isClient]);

  const guardarConfiguracion = async (nuevasFechas?: Date[], nuevaMetaBase?: number, nuevasMetasIndiv?: { [key: string]: number }) => {
    const fechasToSave = (nuevasFechas ?? fechasOperativas).map(d => {
      const tzoffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzoffset).toISOString().split('T')[0];
    });

    const configToSave = {
      mes_ano: selectedMonth,
      meta_mensual_base: nuevaMetaBase ?? metaBase,
      fechas_operativas: fechasToSave,
      metas_individuales: nuevasMetasIndiv ?? metasIndividuales
    };

    const { error } = await supabase
      .from('config_metas')
      .upsert(configToSave, { onConflict: 'mes_ano' });

    if (error) {
      console.error('Error saving config:', error);
    }
  };

  const procesarExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus({ msg: 'Validando folios únicos y procesando montos...', type: 'loading' });

    try {
      const workbook = new ExcelJS.Workbook();
      const reader = new FileReader();

      reader.onload = async (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.getWorksheet(1);
        const foliosGlobalesYaSumados = new Set();
        const ventasDetalle: any[] = [];

        if (worksheet) {
          let dateColIndex = -1;

          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
              row.eachCell((cell, colNumber) => {
                const headerName = cell.value?.toString().trim().toLowerCase();
                if (headerName === "fecha de venta") {
                  dateColIndex = colNumber;
                }
              });
            } else if (rowNumber > 1) {
              const nombreAsesor = row.getCell(1).value?.toString()?.trim();
              const montoRaw = row.getCell(2).value;
              const tipoProducto = row.getCell(5).value?.toString()?.trim() || "Otros";
              const sucursal = row.getCell(7).value?.toString()?.trim() || "General";
              const supervisor = row.getCell(8).value?.toString()?.trim() || "Sin Supervisor";
              const idSapVenta = row.getCell(9).value?.toString()?.trim();

              let fechaRaw = dateColIndex !== -1 ? row.getCell(dateColIndex).value : null;
              let fechaParsed = null;
              
              if (fechaRaw instanceof Date) {
                 fechaParsed = fechaRaw.toISOString().split('T')[0];
              } else if (typeof fechaRaw === 'string') {
                 // DD/MM/YYYY -> YYYY-MM-DD
                 const parts = fechaRaw.trim().split('/');
                 if (parts.length === 3) {
                   fechaParsed = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                 }
              }

              let montoLimpio = 0;
              if (typeof montoRaw === 'number') {
                montoLimpio = montoRaw;
              } else if (typeof montoRaw === 'string') {
                montoLimpio = parseFloat(montoRaw.replace(/[^0-9.-]/g, '')) || 0;
              }

              if (nombreAsesor && idSapVenta) {
                if (!foliosGlobalesYaSumados.has(idSapVenta)) {
                  foliosGlobalesYaSumados.add(idSapVenta);
                  ventasDetalle.push({
                    id_sap_venta: idSapVenta,
                    fecha_venta: fechaParsed || `${uploadMonth}-01`,
                    monto: montoLimpio,
                    nombre: nombreAsesor, // Keep original case or upper? Keep original, we can uppercase when matching photos
                    sucursal,
                    supervisor,
                    tipo_producto: tipoProducto,
                    mes_ano: uploadMonth,
                  });
                }
              }
            }
          });

          // 1. Borramos los datos viejos de ESTE MES en ventas_detalle
          await supabase.from('ventas_detalle').delete().eq('mes_ano', uploadMonth);
          
          // 2. Insertamos los nuevos en chunks de 1000
          const chunkSize = 1000;
          for (let i = 0; i < ventasDetalle.length; i += chunkSize) {
            const chunk = ventasDetalle.slice(i, i + chunkSize);
            const { error } = await supabase.from('ventas_detalle').insert(chunk);
            if (error) throw error;
          }

          // Para mantener retrocompatibilidad momentánea, no borraremos ventas_excel aún.
          // Pero ya no escribiremos en ella. (Opcional: puedes eliminarla si quieres).


          setUploadStatus({
            msg: `¡Éxito! ${ventasDetalle.length} folios procesados correctamente.`,
            type: 'success'
          });
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error(error);
      setUploadStatus({ msg: 'Error crítico: Verifica el formato del archivo o la base de datos.', type: 'error' });
    }
  };

  const [uploadTablasStatus, setUploadTablasStatus] = useState<{msg: string, type: 'idle' | 'loading' | 'success' | 'error'}>({ msg: '', type: 'idle' });
  const [uploadTablasConvenio, setUploadTablasConvenio] = useState('IMSS PENSIONADOS');
  const [uploadTablasMarca, setUploadTablasMarca] = useState('OPCIPRES');
  const [uploadTablasTramite, setUploadTablasTramite] = useState('CNCA INTERNO');

  const procesarTablasCotizador = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadTablasMarca || !uploadTablasTramite || !uploadTablasConvenio) {
      setUploadTablasStatus({ msg: 'Selecciona Convenio, Marca y Trámite antes de subir', type: 'error' });
      return;
    }

    setUploadTablasStatus({ msg: 'Procesando tablas de cotización...', type: 'loading' });

    try {
      const workbook = new ExcelJS.Workbook();
      const reader = new FileReader();

      reader.onload = async (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.getWorksheet(1);
        const filasAInsertar: any[] = [];

        if (worksheet) {
          // Asumimos las columnas: ID (1), Plazo (2), Monto (3), Descuento (4), Tasa (5), CAT (6), [Marca (7) ignorada/sobrescrita]
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Saltar encabezados
              const id_oferta = row.getCell(1).value?.toString()?.trim() || "";
              
              const cleanNumber = (val: any) => {
                if (typeof val === 'number') return val;
                if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.-]/g, '')) || 0;
                return 0;
              };

              const plazo = cleanNumber(row.getCell(2).value);
              const monto = cleanNumber(row.getCell(3).value);
              const descuento = cleanNumber(row.getCell(4).value);
              const tasa = cleanNumber(row.getCell(5).value);
              const cat_valor = cleanNumber(row.getCell(6).value);
              // Usamos la marca, tramite y convenio seleccionados en la UI
              const marca = uploadTablasMarca;
              const tramite = uploadTablasTramite;
              const convenio = uploadTablasConvenio;

              if (marca && tramite && plazo > 0 && monto > 0) {
                filasAInsertar.push({
                  id_oferta, plazo, monto, descuento, tasa, cat_valor, marca, tramite, convenio
                });
              }
            }
          });

          // Insertar en archivos_cargados primero
          const { data: archivoNuevo, error: errorArchivo } = await supabase
            .from('archivos_cargados')
            .insert({
              nombre: file.name,
              marca: uploadTablasMarca,
              tramite: uploadTablasTramite,
              convenio: uploadTablasConvenio
            })
            .select()
            .single();

          if (errorArchivo || !archivoNuevo) {
            throw new Error('Error al registrar el archivo');
          }

          // Asignar archivo_id a cada fila
          const filasConArchivo = filasAInsertar.map(f => ({ ...f, archivo_id: archivoNuevo.id }));

          // Insertar nuevos en chunks
          const chunkSize = 1000;
          for (let i = 0; i < filasConArchivo.length; i += chunkSize) {
            const chunk = filasConArchivo.slice(i, i + chunkSize);
            const { error } = await supabase.from('tablas_cotizador').insert(chunk);
            if (error) throw error;
          }

          setUploadTablasStatus({
            msg: `¡Éxito! ${filasConArchivo.length} ofertas cargadas.`,
            type: 'success'
          });
          
          fetchArchivos(); // Refrescar la lista de archivos (implementaremos esto enseguida)
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error(error);
      setUploadTablasStatus({ msg: 'Error al subir tablas.', type: 'error' });
    }
  };

  const procesarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const nombreInput = (document.getElementById('nombreAsesorFoto') as HTMLInputElement).value.toUpperCase();

    if (!file || !nombreInput) {
      alert("Escribe el nombre antes de subir la foto.");
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${nombreInput}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fotos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('fotos')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('asesores_meta')
        .upsert({ nombre: nombreInput, photo_url: publicUrl });

      if (dbError) throw dbError;

      alert(`Foto de ${nombreInput} guardada correctamente.`);
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Hubo un error subiendo la foto.");
    }
  };

  const procesarPadronImss = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadPadronStatus({ msg: 'Procesando padrón de clientes IMSS...', type: 'loading' });

    try {
      const workbook = new ExcelJS.Workbook();
      const reader = new FileReader();

      reader.onload = async (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.getWorksheet(1);
        const filasAInsertarRaw: any[] = [];

        if (worksheet) {
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Saltar encabezados
              const nombre = row.getCell(1).value?.toString()?.trim() || "";
              const apellido_paterno = row.getCell(2).value?.toString()?.trim() || "";
              const apellido_materno = row.getCell(3).value?.toString()?.trim() || "";
              const curp = row.getCell(4).value?.toString()?.trim() || "";
              const rfc = row.getCell(5).value?.toString()?.trim() || "";
              const correo = row.getCell(6).value?.toString()?.trim() || "";
              const tipo_cliente = row.getCell(7).value?.toString()?.trim() || "";

              if (nombre && curp) {
                filasAInsertarRaw.push({
                  nombre,
                  apellido_paterno,
                  apellido_materno,
                  curp: curp.toUpperCase(),
                  rfc: rfc.toUpperCase(),
                  correo,
                  tipo_cliente
                });
              }
            }
          });

          // 1. Borramos el padrón anterior usando la función RPC para evitar timeouts de API
          const { error: errorClean } = await supabase.rpc('limpiar_padron_imss');

          if (errorClean) throw errorClean;

          // 2. Registrar el nuevo archivo en la base de datos
          const { data: archivoNuevo, error: errorArchivo } = await supabase
            .from('archivos_cargados')
            .insert({
              nombre: file.name,
              marca: 'IMSS',
              tramite: 'PADRON'
            })
            .select()
            .single();

          if (errorArchivo || !archivoNuevo) {
            throw new Error('Error al registrar el archivo de padrón');
          }

          // 3. Asignar archivo_id
          const filasConArchivo = filasAInsertarRaw.map(f => ({ ...f, archivo_id: archivoNuevo.id }));

          // 4. Insertamos en chunks de 1000
          const chunkSize = 1000;
          for (let i = 0; i < filasConArchivo.length; i += chunkSize) {
            const chunk = filasConArchivo.slice(i, i + chunkSize);
            const { error: errorInsert } = await supabase.from('padron_imss').insert(chunk);
            if (errorInsert) throw errorInsert;
          }

          setUploadPadronStatus({
            msg: `¡Éxito! ${filasConArchivo.length} registros del padrón cargados correctamente.`,
            type: 'success'
          });

          fetchArchivos();
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      console.error(error);
      setUploadPadronStatus({ msg: `Error al subir el padrón: ${error.message || error}`, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-indigo-500/30">
      {/* Barra Superior de Navegación */}
      <nav className="border-b border-neutral-800 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-all group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Volver al Ranking</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Modo Administrador</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-12 px-6 space-y-8">
        {/* Encabezado */}
        <div className="space-y-2">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white">
            Gestión de <span className="text-indigo-500">Datos SAP</span>
          </h1>
          <p className="text-neutral-500 font-medium">
            Sube el reporte mensual para recalcular el Performance Score 50/50.
          </p>
        </div>

        {/* Card Principal de Carga */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-10 shadow-2xl space-y-8">
          <div className="space-y-4">
            <label className="text-sm font-bold uppercase tracking-widest text-neutral-400">
              Selecciona en el calendario un día del mes y año correspondiente al reporte:
            </label>
            
            <div className="flex flex-col items-center justify-center bg-black/20 rounded-3xl p-6 border border-neutral-800/50">
              {isClient && (
                <style>{`
                  .rdp { --rdp-cell-size: 36px; --rdp-accent-color: #6366f1; --rdp-background-color: rgba(99, 102, 241, 0.2); margin: 0; }
                  .rdp-day_selected { font-weight: 900; }
                  .rdp-caption_dropdowns { display: flex; gap: 0.5rem; justify-content: center; }
                  .rdp-dropdown { background-color: #171717; color: white; border: 1px solid #262626; border-radius: 0.5rem; padding: 0.25rem; font-size: 0.875rem; font-weight: bold; outline: none; cursor: pointer; }
                  .rdp-dropdown:focus { border-color: #6366f1; }
                `}</style>
              )}
              {isClient && (
                <DayPicker
                  mode="single"
                  selected={new Date(uploadMonth + '-02T12:00:00Z')}
                  onSelect={(date) => {
                    if (date) {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      setUploadMonth(`${y}-${m}`);
                    }
                  }}
                  locale={es}
                  defaultMonth={new Date(uploadMonth + '-02T12:00:00Z')}
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2035}
                  className="text-sm font-medium"
                />
              )}
              <p className="text-[10px] text-neutral-500 mt-4 uppercase text-center font-bold">
                Mes Seleccionado Actualmente: <span className="text-indigo-400 text-sm">{uploadMonth}</span>
              </p>
            </div>
            
            <p className="text-xs text-yellow-500/80 font-bold uppercase text-center mt-2">
              ⚠️ Asegúrate de que el mes seleccionado ({uploadMonth}) sea el correcto antes de subir tu archivo. Los datos se sobrescribirán solo para este mes.
            </p>
          </div>

          <div className="relative group">
            <input
              type="file"
              accept=".xlsx"
              onChange={procesarExcel}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`
              border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300
              ${uploadStatus.type === 'loading'
                ? 'border-indigo-500 bg-indigo-500/5 ring-4 ring-indigo-500/10'
                : 'border-neutral-800 group-hover:border-neutral-700 bg-black/40 group-hover:bg-black/60'}
            `}>
              {uploadStatus.type === 'loading' ? (
                <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-6" />
              ) : (
                <div className="bg-neutral-800 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
                  <FileSpreadsheet className="w-10 h-10 text-neutral-400 group-hover:text-indigo-400" />
                </div>
              )}
              <h2 className="text-xl font-black uppercase tracking-tight">Cargar Reporte Mensual</h2>
              <p className="text-sm text-neutral-500 mt-2 max-w-xs mx-auto">
                Asegúrate de que el archivo incluya las columnas de Monto, Producto, Sucursal, Supervisor e ID SAP.
              </p>
            </div>
          </div>

          {/* Feedback de Estado */}
          {uploadStatus.type !== 'idle' && (
            <div className={`flex items-center gap-4 p-6 rounded-2xl border animate-in zoom-in-95 duration-300 ${uploadStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              uploadStatus.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              }`}>
              <div className="flex-shrink-0">
                {uploadStatus.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
                {uploadStatus.type === 'error' && <AlertCircle className="w-6 h-6" />}
                {uploadStatus.type === 'loading' && <Loader2 className="w-6 h-6 animate-spin" />}
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-wider leading-none">{uploadStatus.type === 'success' ? 'Proceso Completado' : uploadStatus.type === 'error' ? 'Error detectado' : 'Procesando...'}</p>
                <p className="text-xs font-bold opacity-80 mt-1">{uploadStatus.msg}</p>
              </div>
              {uploadStatus.type === 'success' && (
                <Link href="/" className="ml-auto bg-emerald-500 text-black text-[10px] font-black px-4 py-2 rounded-lg uppercase tracking-widest hover:bg-emerald-400 transition-colors">
                  Ver Resultados
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Sección Informativa Inferior */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl">
            <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">Seguridad de Datos</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              El sistema filtra automáticamente folios duplicados para asegurar que el <span className="text-white font-bold">Performance Score</span> sea 100% preciso.
            </p>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl">
            <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-3">Requisito de Formato</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Recuerda que la columna <span className="text-white font-bold">I (9)</span> debe contener el ID de Venta único para el conteo de créditos.
            </p>
          </div>
        </div>
      </main>

      {/* CARGA DE TABLAS DEL COTIZADOR */}
      <div className="max-w-4xl mx-auto bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-10 shadow-2xl space-y-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 p-2 rounded-lg">
              <Upload className="w-5 h-5 text-indigo-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">Tablas de Cotización</h2>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-center max-w-xl mx-auto">
          <div className="w-full">
             <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Convenio</label>
             <select value={uploadTablasConvenio} onChange={e => setUploadTablasConvenio(e.target.value)} className="w-full mt-1 bg-black/40 border border-neutral-800 rounded-2xl p-4 text-white font-black outline-none focus:border-indigo-500 text-sm">
                <option value="IMSS PENSIONADOS">IMSS PENSIONADOS</option>
                <option value="IMSS BIENESTAR">IMSS BIENESTAR</option>
                <option value="GOB CDMX">GOB CDMX</option>
                 <option value="GEM">GEM</option>
             </select>
          </div>
          <div className="w-full">
             <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Marca de la Tabla</label>
             <select value={uploadTablasMarca} onChange={e => setUploadTablasMarca(e.target.value)} className="w-full mt-1 bg-black/40 border border-neutral-800 rounded-2xl p-4 text-white font-black outline-none focus:border-indigo-500 text-sm">
                <option value="OPCIPRES">OPCIPRES</option>
                <option value="CONSUBANCO">CONSUBANCO</option>
                <option value="MAS NOMINA">MAS NOMINA</option>
                <option value="CONSUPAGO">CONSUPAGO</option>
             </select>
          </div>
          <div className="w-full">
             <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Tipo de Trámite</label>
             <select value={uploadTablasTramite} onChange={e => setUploadTablasTramite(e.target.value)} className="w-full mt-1 bg-black/40 border border-neutral-800 rounded-2xl p-4 text-white font-black outline-none focus:border-indigo-500 text-sm">
                <option value="NUEVO">NUEVO</option>
                <option value="SEGUNDA DISP">SEGUNDA DISP</option>
                <option value="CNCA INTERNO">CNCA INTERNO</option>
                <option value="CNCA">CNCA</option>
                <option value="INTERCOMPAÑÍA">INTERCOMPAÑÍA</option>
                <option value="LCOM TERCEROS">LCOM TERCEROS</option>
             </select>
          </div>
        </div>

        <div className="relative group max-w-xl mx-auto">
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={procesarTablasCotizador}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className={`
            border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300
            ${uploadTablasStatus.type === 'loading'
              ? 'border-indigo-500 bg-indigo-500/5 ring-4 ring-indigo-500/10'
              : 'border-neutral-800 group-hover:border-neutral-700 bg-black/40 group-hover:bg-black/60'}
          `}>
            {uploadTablasStatus.type === 'loading' ? (
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
            ) : (
              <div className="bg-neutral-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500">
                <FileSpreadsheet className="w-8 h-8 text-neutral-400 group-hover:text-indigo-400" />
              </div>
            )}
            <h3 className="text-lg font-black uppercase tracking-tight">Subir Matriz CLEARVOICE PRO</h3>
            <p className="text-xs text-neutral-500 mt-2">
              El archivo debe tener las columnas: ID, Plazo, Monto, Descuento, Tasa, CAT, Marca
            </p>
          </div>
        </div>

        {uploadTablasStatus.type !== 'idle' && (
          <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
            uploadTablasStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            uploadTablasStatus.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
            'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
          }`}>
            <p className="text-sm font-bold uppercase tracking-wider">{uploadTablasStatus.msg}</p>
          </div>
        )}

        {/* LISTA DE ARCHIVOS CARGADOS */}
        <div className="mt-8 pt-8 border-t border-neutral-800">
          <h3 className="text-sm font-black text-neutral-500 uppercase tracking-widest mb-6">Archivos Activos en Base de Datos</h3>
          {archivosCargados.filter(a => a.marca !== 'IMSS' && a.tramite !== 'PADRON').length === 0 ? (
            <p className="text-xs font-bold text-neutral-600 uppercase text-center py-4 bg-black/20 rounded-xl border border-neutral-800">No hay tablas cargadas actualmente</p>
          ) : (
            <div className="space-y-3">
              {archivosCargados.filter(a => a.marca !== 'IMSS' && a.tramite !== 'PADRON').map(archivo => (
                <div key={archivo.id} className="bg-black/40 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-neutral-700 transition-colors">
                  <div>
                    <p className="text-sm font-black text-white">{archivo.nombre}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase tracking-widest">{archivo.convenio || 'IMSS PENSIONADOS'}</span>
                      <span className="text-[9px] font-bold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded uppercase tracking-widest">{archivo.marca}</span>
                      <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded uppercase tracking-widest">{archivo.tramite}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-neutral-600">
                      {new Date(archivo.fecha_carga).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button 
                      onClick={() => eliminarArchivo(archivo.id)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-2 rounded-xl transition-colors"
                      title="Eliminar este archivo y todas sus ofertas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CARGA DEL PADRÓN IMSS */}
      <div className="max-w-4xl mx-auto bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-10 shadow-2xl space-y-8 mb-8">
        <div className="flex items-center gap-3 border-b border-neutral-800 pb-6">
          <div className="bg-indigo-500/10 p-2 rounded-lg">
            <Upload className="w-5 h-5 text-indigo-500" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight">Cargar Padrón IMSS</h2>
        </div>

        <div className="relative group max-w-xl mx-auto">
          <input
            type="file"
            accept=".xlsx"
            onChange={procesarPadronImss}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className={`
            border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300
            ${uploadPadronStatus.type === 'loading'
              ? 'border-indigo-500 bg-indigo-500/5 ring-4 ring-indigo-500/10'
              : 'border-neutral-800 group-hover:border-neutral-700 bg-black/40 group-hover:bg-black/60'}
          `}>
            {uploadPadronStatus.type === 'loading' ? (
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
            ) : (
              <div className="bg-neutral-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500">
                <FileSpreadsheet className="w-8 h-8 text-neutral-400 group-hover:text-indigo-400" />
              </div>
            )}
            <h3 className="text-lg font-black uppercase tracking-tight">Subir Excel Padrón IMSS</h3>
            <p className="text-xs text-neutral-500 mt-2">
              El archivo debe tener las columnas: Nombre, Apellido Paterno, Apellido Materno, CURP, RFC (10 dígitos), Correo, Tipo de Cliente.
            </p>
          </div>
        </div>

        {uploadPadronStatus.type !== 'idle' && (
          <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
            uploadPadronStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            uploadPadronStatus.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
            'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
          }`}>
            <p className="text-sm font-bold uppercase tracking-wider">{uploadPadronStatus.msg}</p>
          </div>
        )}

        {/* LISTA DE ARCHIVOS DEL PADRÓN */}
        <div className="mt-8 pt-8 border-t border-neutral-800">
          <h3 className="text-sm font-black text-neutral-500 uppercase tracking-widest mb-6">Padrón Activo</h3>
          {archivosCargados.filter(a => a.marca === 'IMSS' && a.tramite === 'PADRON').length === 0 ? (
            <p className="text-xs font-bold text-neutral-600 uppercase text-center py-4 bg-black/20 rounded-xl border border-neutral-800">No hay un padrón cargado actualmente</p>
          ) : (
            <div className="space-y-3">
              {archivosCargados.filter(a => a.marca === 'IMSS' && a.tramite === 'PADRON').map(archivo => (
                <div key={archivo.id} className="bg-black/40 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-neutral-700 transition-colors">
                  <div>
                    <p className="text-sm font-black text-white">{archivo.nombre}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-widest">Padrón IMSS</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-neutral-600">
                      {new Date(archivo.fecha_carga).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button 
                      onClick={() => eliminarPadron(archivo.id)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-2 rounded-xl transition-colors"
                      title="Eliminar padrón de la base de datos"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CONFIGURACIÓN DE MES Y FECHAS OPERATIVAS */}
      <div className="max-w-4xl mx-auto bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-10 shadow-2xl space-y-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 p-2 rounded-lg">
              <Target className="w-5 h-5 text-indigo-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">Configuración de Mes</h2>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Seleccionar Mes:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-black/40 border border-neutral-800 rounded-xl px-4 py-2 outline-none focus:border-indigo-500 text-sm font-bold text-white cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Columna Izquierda: Meta y Días */}
          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Meta Mensual Base ($)</label>
              <input
                type="number"
                value={metaBase}
                onChange={(e) => {
                  setMetaBase(Number(e.target.value));
                  guardarConfiguracion(fechasOperativas, Number(e.target.value), metasIndividuales);
                }}
                className="w-full bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-bold text-white"
                placeholder="Ej. 150000"
              />
            </div>

            <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800">
              <h3 className="text-sm font-black uppercase text-indigo-400 mb-2">Resumen Operativo</h3>
              <div className="flex justify-between items-center text-xs font-bold text-neutral-300">
                <span>Días Seleccionados:</span>
                <span className="text-lg text-white">{fechasOperativas.length}</span>
              </div>
              <p className="text-[9px] text-neutral-600 uppercase mt-4 leading-relaxed">
                * Los días seleccionados en el calendario definen exactamente entre cuánto se dividirá la meta mensual para calcular la "Meta al Día".
              </p>
            </div>
          </div>

          {/* Columna Derecha: Calendario */}
          <div className="flex flex-col items-center justify-center bg-black/20 rounded-3xl p-6 border border-neutral-800/50">
            <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-4 w-full text-left">Fechas Operativas</h3>
            {isClient && (
              <style>{`
                .rdp { --rdp-cell-size: 36px; --rdp-accent-color: #6366f1; --rdp-background-color: rgba(99, 102, 241, 0.2); margin: 0; }
                .rdp-day_selected { font-weight: 900; }
              `}</style>
            )}
            {isClient && (
              <DayPicker
                mode="multiple"
                selected={fechasOperativas}
                onSelect={(dates) => {
                  setFechasOperativas(dates || []);
                  guardarConfiguracion(dates || [], metaBase, metasIndividuales);
                }}
                locale={es}
                defaultMonth={new Date(selectedMonth + '-01T12:00:00Z')}
                className="text-sm font-medium"
              />
            )}
          </div>
        </div>
      </div>

      {/* GESTIÓN DE METAS INDIVIDUALES */}
      <div className="max-w-4xl mx-auto bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-10 shadow-2xl space-y-6 mt-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 p-2 rounded-lg">
              <Target className="w-5 h-5 text-indigo-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">Metas Individuales</h2>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Seleccionar Mes:</label>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-black/40 border border-neutral-800 rounded-xl px-4 py-2 outline-none focus:border-indigo-500 text-sm font-bold text-white cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            id="nombreAsesorMeta"
            placeholder="Nombre exacto (como en Excel)"
            className="bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-sm font-bold text-white"
          />
          <div className="flex gap-2">
            <input
              type="number"
              id="metaAsesorInput"
              placeholder="Meta ($)"
              className="bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-sm font-bold w-full text-white"
            />
            <button
              onClick={() => {
                const nombre = (document.getElementById('nombreAsesorMeta') as HTMLInputElement).value.toUpperCase();
                const metaVal = (document.getElementById('metaAsesorInput') as HTMLInputElement).value;
                if (nombre && metaVal) {
                  const nuevasMetas = { ...metasIndividuales, [nombre]: Number(metaVal) };
                  setMetasIndividuales(nuevasMetas);
                  guardarConfiguracion(fechasOperativas, metaBase, nuevasMetas);
                  alert(`Meta de $${metaVal} asignada a ${nombre} para el mes ${selectedMonth}.`);
                  (document.getElementById('nombreAsesorMeta') as HTMLInputElement).value = '';
                  (document.getElementById('metaAsesorInput') as HTMLInputElement).value = '';
                } else {
                  alert('Llena ambos campos.');
                }
              }}
              className="bg-indigo-600 px-6 rounded-xl font-black text-xs uppercase tracking-widest text-white hover:bg-indigo-500 transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>

        {/* Lista de Metas Individuales del Mes */}
        {Object.keys(metasIndividuales).length > 0 && (
          <div className="mt-6 bg-black/20 rounded-2xl border border-neutral-800 p-4">
            <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3">Asesores con Meta Especial</h3>
            <div className="flex flex-col gap-2">
              {Object.entries(metasIndividuales).map(([nombre, meta]) => (
                <div key={nombre} className="flex justify-between items-center border-b border-neutral-800/50 pb-2">
                  <span className="text-xs font-bold text-white uppercase">{nombre}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black text-emerald-400">
                      ${meta.toLocaleString('en-US')}
                    </span>
                    <button
                      onClick={() => {
                        const nuevasMetas = { ...metasIndividuales };
                        delete nuevasMetas[nombre];
                        setMetasIndividuales(nuevasMetas);
                        guardarConfiguracion(fechasOperativas, metaBase, nuevasMetas);
                      }}
                      className="text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[9px] text-neutral-600 uppercase">
          * Si no asignas una meta, el asesor usará la meta mensual base de {metaBase} por defecto.
        </p>
      </div>

      {/* GESTIÓN DE FOTOGRAFÍAS */}
      <div className="max-w-4xl mx-auto bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-10 shadow-2xl space-y-6 mt-8 mb-12">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 p-2 rounded-lg">
            <User className="w-5 h-5 text-indigo-500" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight">Cargar Fotos de Asesores</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            id="nombreAsesorFoto"
            placeholder="Nombre exacto (como en Excel)"
            className="bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-sm font-bold text-white"
          />
          <input
            type="file"
            accept="image/*"
            onChange={procesarFoto}
            className="text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-indigo-500 file:text-white hover:file:bg-indigo-600 cursor-pointer"
          />
        </div>
        <p className="text-[9px] text-neutral-600 uppercase">
          * Las fotos se asocian por nombre. Asegúrate de escribirlo igual que en el reporte SAP.
        </p>
      </div>

      {/* GESTIÓN DE USUARIOS */}
      <div className="max-w-4xl mx-auto bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-10 shadow-2xl space-y-6 mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-indigo-500/10 p-2 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight">Gestión de Usuarios</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-neutral-500 uppercase tracking-widest">Crear Nuevo Usuario</h3>
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setUserMsg('Creando usuario...');
                const form = e.target as HTMLFormElement;
                const email = (form.elements.namedItem('email') as HTMLInputElement).value;
                const password = (form.elements.namedItem('password') as HTMLInputElement).value;
                const role = (form.elements.namedItem('role') as HTMLSelectElement).value;
                const nombre = (form.elements.namedItem('nombre') as HTMLInputElement).value;
                
                const res = await createUser(email, password, role, nombre);
                if (res.success) {
                  setUserMsg('Usuario creado exitosamente');
                  form.reset();
                  fetchUsers();
                } else {
                  setUserMsg(`Error: ${res.error}`);
                }
              }}
              className="space-y-4"
            >
              {userMsg && <p className="text-xs text-indigo-400 font-bold mb-4">{userMsg}</p>}
              <div>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Nombre Completo</label>
                <input required name="nombre" type="text" placeholder="Ej: Juan Pérez" className="w-full mt-1 bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-sm font-bold text-white" />
              </div>
              <div>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Correo</label>
                <input required name="email" type="email" placeholder="correo@ejemplo.com" className="w-full mt-1 bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-sm font-bold text-white" />
              </div>
              <div>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Contraseña</label>
                <input required name="password" type="password" placeholder="••••••••" className="w-full mt-1 bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-sm font-bold text-white" />
              </div>
              <div>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Rol</label>
                <select name="role" className="w-full mt-1 bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-sm font-bold text-white">
                  <option value="Administrador">Administrador</option>
                  <option value="Gerente">Gerente</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Asesor">Asesor</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest transition-all">Crear Acceso</button>
            </form>
          </div>
          
          <div>
            <h3 className="text-sm font-black text-neutral-500 uppercase tracking-widest mb-4">Usuarios Actuales</h3>
            <div className="bg-black/40 border border-neutral-800 rounded-2xl p-4 h-96 overflow-y-auto space-y-2">
               {usersList.length === 0 ? (
                 <p className="text-xs text-neutral-400 text-center mt-10">Cargando usuarios...</p>
               ) : (
                 usersList.map((u: any) => (
                   <div key={u.id} className={`bg-neutral-900 border p-3 rounded-xl flex justify-between items-center group transition-all ${u.disabled ? 'border-red-950 bg-red-950/5 opacity-70' : 'border-neutral-800'}`}>
                     <div>
                       <div className="flex items-center gap-2">
                         <p className="text-sm font-bold text-white">{u.nombre || 'Sin Nombre'}</p>
                         {u.disabled && (
                           <span className="text-[8px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">
                             Inactivo
                           </span>
                         )}
                       </div>
                       <p className="text-[10px] text-neutral-500 font-bold mt-0.5">{u.email}</p>
                       <p className="text-[9px] text-indigo-400 uppercase tracking-widest mt-1">{u.role}</p>
                     </div>
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button
                         onClick={() => openEditModal(u)}
                         className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                         title="Editar usuario"
                       >
                         <Settings2 className="w-4 h-4" />
                       </button>
                       <button
                         onClick={() => deleteUser(u.id, u.email)}
                         className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                         title="Eliminar usuario"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE EDICIÓN DE USUARIO */}
      {selectedUserToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative space-y-6">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
              <h3 className="text-lg font-black uppercase tracking-tight text-white">Editar Usuario</h3>
              <button 
                onClick={() => setSelectedUserToEdit(null)}
                className="text-neutral-500 hover:text-white text-xs font-black uppercase tracking-wider"
              >
                Cerrar
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              {editMsg && <p className="text-xs text-red-400 font-bold mb-4">{editMsg}</p>}
              
              <div>
                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Correo</p>
                <p className="w-full mt-1 bg-black/20 border border-neutral-800/50 text-neutral-400 rounded-xl px-4 py-3 text-sm font-bold select-all">
                  {selectedUserToEdit.email}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Nombre Completo</label>
                <input 
                  required 
                  type="text" 
                  value={editNombre} 
                  onChange={(e) => setEditNombre(e.target.value)} 
                  placeholder="Ej: Juan Pérez" 
                  className="w-full mt-1 bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-sm font-bold text-white" 
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Rol</label>
                <select 
                  value={editRole} 
                  onChange={(e) => setEditRole(e.target.value)} 
                  className="w-full mt-1 bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-sm font-bold text-white"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Gerente">Gerente</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Asesor">Asesor</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Nueva Contraseña (Opcional)</label>
                <input 
                  type="password" 
                  value={editPassword} 
                  onChange={(e) => setEditPassword(e.target.value)} 
                  placeholder="Dejar en blanco para conservar la actual" 
                  className="w-full mt-1 bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-sm font-bold text-white placeholder:text-neutral-600" 
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="editDisabled"
                  checked={editDisabled} 
                  onChange={(e) => setEditDisabled(e.target.checked)} 
                  className="w-4 h-4 rounded border-neutral-800 bg-black text-indigo-600 focus:ring-indigo-500" 
                />
                <label htmlFor="editDisabled" className="text-xs font-black text-neutral-400 uppercase tracking-wider cursor-pointer">
                  Deshabilitar Acceso a la Cuenta
                </label>
              </div>

              <div className="flex gap-4 pt-4 border-t border-neutral-800">
                <button 
                  type="button" 
                  onClick={() => setSelectedUserToEdit(null)}
                  className="w-1/2 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-xl font-black uppercase tracking-widest transition-all text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={editLoading}
                  className="w-1/2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest transition-all text-xs flex items-center justify-center gap-2"
                >
                  {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIGURACIÓN DE REGLAS DEL COTIZADOR */}
      <div className="max-w-4xl mx-auto bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-10 shadow-2xl space-y-6 mb-12 relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 p-2 rounded-lg">
              <Settings2 className="w-5 h-5 text-indigo-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">Reglas del Cotizador</h2>
          </div>
          <button 
            onClick={guardarReglas}
            disabled={guardandoReglas}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black uppercase tracking-widest text-xs px-6 py-3 rounded-xl transition-all flex items-center gap-2"
          >
            {guardandoReglas ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Guardar Cambios
          </button>
        </div>
        
        {reglasMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-sm font-bold uppercase tracking-widest relative z-10 text-center">
            {reglasMsg}
          </div>
        )}

        <div className="space-y-8 relative z-10">
          {Array.from(new Set(reglasCotizador.map(r => r.marca))).map(marca => (
            <div key={marca} className="space-y-4">
              <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest border-b border-neutral-800 pb-2">{marca}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reglasCotizador.filter(r => r.marca === marca).map((regla, idx) => (
                  <div key={regla.id} className="bg-black/40 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                    <div className="mb-3">
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{regla.regla_key}</span>
                      <p className="text-xs font-bold text-neutral-300 mt-1">{regla.descripcion}</p>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={regla.regla_value}
                      onChange={(e) => {
                        const newReglas = [...reglasCotizador];
                        const index = newReglas.findIndex(r => r.id === regla.id);
                        newReglas[index].regla_value = e.target.value;
                        setReglasCotizador(newReglas);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm font-bold text-white transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}