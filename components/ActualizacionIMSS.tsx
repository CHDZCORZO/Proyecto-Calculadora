"use client";
import React, { useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { FileUp, Loader2, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { createClient } from '../utils/supabase/client';

export function ActualizacionIMSS() {
  const [marca, setMarca] = useState("CSB");
  const [fecha, setFecha] = useState("");
  const [nombre, setNombre] = useState("");
  const [nss, setNss] = useState("");
  const [correoNuevo, setCorreoNuevo] = useState("");
  const [correoAnterior, setCorreoAnterior] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [signatureLink, setSignatureLink] = useState("");
  const supabase = createClient();

  const handleNssChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    setNss(val);
  };

  const generarPDF = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (nss.length !== 11) {
      setError("El NSS debe tener exactamente 11 dígitos.");
      return;
    }
    if (!fecha) {
      setError("Selecciona una fecha.");
      return;
    }

    setIsGenerating(true);

    try {
      // Determinar la plantilla a usar
      const templateName = `Formato_${marca}.pdf`;
      const url = `/templates/${templateName}`;

      // Cargar el PDF
      const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // Extraer día, mes y año
      const dateObj = new Date(fecha + 'T00:00:00'); // Evita problemas de zona horaria
      const dia = String(dateObj.getDate()).padStart(2, '0');
      const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
      const ano = String(dateObj.getFullYear());

      // Escribir texto en las coordenadas especificadas
      const textColor = rgb(0, 0, 0);
      const textSize = 10; // Tamaño de fuente base

      const drawText = (text: string, x: number, y: number, customSize?: number) => {
        firstPage.drawText(text, {
          x,
          y,
          size: customSize || textSize,
          color: textColor,
        });
      };

      // FECHA
      drawText(dia, 86, 711);
      drawText(mes, 139, 711);
      drawText(ano, 200, 711);

      // NOMBRE (en 2 lugares)
      drawText(nombre, 114, 661);
      drawText(nombre, 216, 218);

      // NSS
      drawText(nss, 93, 636);

      // CORREOS
      drawText(correoAnterior, 142, 536, 12);
      drawText(correoNuevo, 167, 485, 12);

      // Guardar el PDF y subirlo a Supabase Storage
      const pdfBytes = await pdfDoc.save();
      const filePath = `${nss}_${Date.now()}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('imss_documents')
        .upload(filePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Crear el registro de firma en la base de datos
      const { data: firmaData, error: dbError } = await supabase
        .from('imss_firmas')
        .insert([{
          file_path: filePath,
          nss: nss,
          status: 'pendiente'
        }])
        .select('token')
        .single();

      if (dbError) throw dbError;

      const link = `${window.location.origin}/firmar/${firmaData.token}`;
      setSignatureLink(link);

    } catch (err) {
      console.error(err);
      setError("Hubo un error al generar el PDF. Verifica que el archivo de la plantilla exista en la carpeta public/templates.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 md:p-12 text-neutral-100 font-sans max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-neutral-900/50 p-8 rounded-[3rem] border border-neutral-800 shadow-2xl">
        <div className="flex items-center gap-4 mb-8 border-b border-neutral-800 pb-6">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
            <FileUp className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Actualización IMSS</h2>
            <p className="text-neutral-500 text-sm font-bold uppercase tracking-widest mt-1">Generador de Formatos en PDF</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm font-bold uppercase">
            {error}
          </div>
        )}

        <form onSubmit={generarPDF} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* MARCA */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-neutral-400 tracking-widest ml-2">Marca</label>
              <select 
                value={marca} 
                onChange={(e) => setMarca(e.target.value)}
                className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors uppercase font-bold text-sm"
              >
                <option value="CSB">CSB</option>
                <option value="CSP">CSP</option>
                <option value="OPC">OPC</option>
                <option value="MN">MN</option>
              </select>
            </div>

            {/* FECHA */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-neutral-400 tracking-widest ml-2">Fecha</label>
              <input 
                type="date" 
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors uppercase font-bold text-sm"
              />
            </div>

            {/* NOMBRE COMPLETO */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black uppercase text-neutral-400 tracking-widest ml-2">Nombre Completo</label>
              <input 
                type="text" 
                value={nombre}
                onChange={(e) => setNombre(e.target.value.toUpperCase())}
                required
                placeholder="EJ. JUAN PÉREZ GARCÍA"
                className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors uppercase font-bold text-sm placeholder:text-neutral-700"
              />
            </div>

            {/* NSS */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-neutral-400 tracking-widest ml-2">NSS (11 Dígitos)</label>
              <input 
                type="text" 
                value={nss}
                onChange={handleNssChange}
                required
                placeholder="12345678901"
                className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors font-bold text-sm placeholder:text-neutral-700 tracking-widest"
              />
              <p className="text-[10px] text-neutral-500 font-medium ml-2 uppercase">{nss.length}/11 Caracteres</p>
            </div>

            {/* ESPACIO VACÍO */}
            <div className="hidden md:block"></div>

            {/* CORREO ANTERIOR */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-neutral-400 tracking-widest ml-2">Correo Anterior</label>
              <input 
                type="email" 
                value={correoAnterior}
                onChange={(e) => setCorreoAnterior(e.target.value.toLowerCase())}
                required
                placeholder="viejo@correo.com"
                className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors font-bold text-sm placeholder:text-neutral-700"
              />
            </div>

            {/* CORREO NUEVO */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-neutral-400 tracking-widest ml-2">Correo Nuevo</label>
              <input 
                type="email" 
                value={correoNuevo}
                onChange={(e) => setCorreoNuevo(e.target.value.toLowerCase())}
                required
                placeholder="nuevo@correo.com"
                className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors font-bold text-sm placeholder:text-neutral-700"
              />
            </div>

          </div>

          {signatureLink ? (
            <div className="pt-8 border-t border-neutral-800 animate-in fade-in zoom-in duration-500">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-black italic text-emerald-400 uppercase tracking-tighter mb-2">¡Documento Generado!</h3>
                <p className="text-emerald-100/70 text-sm mb-6">El documento está listo para ser firmado por el empleado.</p>
                
                <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-emerald-500/20">
                  <input 
                    type="text" 
                    readOnly 
                    value={signatureLink} 
                    className="bg-transparent w-full outline-none text-emerald-200 text-xs px-2"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(signatureLink);
                      alert('Enlace copiado al portapapeles');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase"
                  >
                    <LinkIcon className="w-4 h-4" /> Copiar
                  </button>
                </div>

                <button 
                  type="button"
                  onClick={() => setSignatureLink("")}
                  className="mt-6 text-xs text-neutral-500 hover:text-white uppercase font-bold tracking-widest transition-colors"
                >
                  Generar Nuevo Documento
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-8 border-t border-neutral-800">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando y Subiendo a Nube...
                  </>
                ) : (
                  <>
                    <FileUp className="w-5 h-5" />
                    Generar Enlace de Firma
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
