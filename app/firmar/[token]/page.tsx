"use client";
import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '../../../utils/supabase/client';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument } from 'pdf-lib';
import { Loader2, PenTool, CheckCircle, ShieldCheck } from 'lucide-react';

export default function FirmarPage({ params }: { params: { token: string } }) {
  const [loading, setLoading] = useState(true);
  const [docInfo, setDocInfo] = useState<any>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  
  const sigCanvas = useRef<SignatureCanvas>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const { data, error } = await supabase
          .from('imss_firmas')
          .select('*')
          .eq('token', params.token)
          .single();

        if (error) throw error;
        setDocInfo(data);
      } catch (err: any) {
        console.error(err);
        setError("Documento no encontrado o el enlace es inválido.");
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [params.token, supabase]);

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  // Forzar redimensionamiento exacto del canvas cada vez que el contenedor cambie de tamaño
  useEffect(() => {
    if (!showSignatureModal || !sigCanvas.current) return;

    const canvas = sigCanvas.current.getCanvas();
    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver(() => {
      try {
        const data = sigCanvas.current?.toData(); // Respaldar trazos
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        
        // Forzar las dimensiones de renderizado del canvas
        canvas.width = parent.offsetWidth * ratio;
        canvas.height = parent.offsetHeight * ratio;
        canvas.getContext("2d")?.scale(ratio, ratio);
        
        // Restaurar trazos después del redimensionamiento
        if (data && data.length > 0) {
          sigCanvas.current?.fromData(data);
        }
      } catch (error) {
        console.error("Error al redimensionar canvas:", error);
      }
    });

    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [showSignatureModal]);

  const handleSaveSignature = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      alert("Por favor, dibuja tu firma antes de continuar.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Obtener la firma recortando el espacio en blanco manualmente (evita firma minúscula en PDF)
      const canvas = sigCanvas.current.getCanvas();
      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      let hasPixels = false;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = imgData.data[(y * canvas.width + x) * 4 + 3];
          if (alpha > 0) { // Hay trazo aquí
            hasPixels = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (!hasPixels) {
        alert("Por favor, dibuja tu firma antes de continuar.");
        setIsSaving(false);
        return;
      }

      // Margen de seguridad alrededor del trazo
      const padding = 20;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(canvas.width, maxX + padding);
      maxY = Math.min(canvas.height, maxY + padding);

      const trimWidth = maxX - minX;
      const trimHeight = maxY - minY;

      const trimmedCanvas = document.createElement('canvas');
      trimmedCanvas.width = trimWidth;
      trimmedCanvas.height = trimHeight;
      const trimmedCtx = trimmedCanvas.getContext('2d');
      if (trimmedCtx) {
        trimmedCtx.putImageData(ctx.getImageData(minX, minY, trimWidth, trimHeight), 0, 0);
      }
      
      const signatureDataUrl = trimmedCanvas.toDataURL('image/png');

      // 2. Descargar el PDF original de Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('imss_documents')
        .download(docInfo.file_path);

      if (downloadError) throw downloadError;

      const pdfBytes = await fileData.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // 3. Incrustar la imagen PNG de la firma
      const pngImage = await pdfDoc.embedPng(signatureDataUrl);
      const pngDims = pngImage.scale(1);
      
      // 4. Calcular el tamaño proporcional máximo permitido en el PDF
      const maxWidth = 180;
      const maxHeight = 80;
      const scaleFactor = Math.min(maxWidth / pngDims.width, maxHeight / pngDims.height, 1);
      
      const finalWidth = pngDims.width * scaleFactor;
      const finalHeight = pngDims.height * scaleFactor;
      
      // Coordenadas solicitadas: (230, 237)
      firstPage.drawImage(pngImage, {
        x: 230,
        y: 237,
        width: finalWidth,
        height: finalHeight,
      });

      const updatedPdfBytes = await pdfDoc.save();

      // 4. Sobrescribir el archivo en Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('imss_documents')
        .upload(docInfo.file_path, updatedPdfBytes, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 5. Actualizar el estatus en la tabla
      const { error: updateError } = await supabase
        .from('imss_firmas')
        .update({ status: 'firmado' })
        .eq('token', params.token);

      if (updateError) throw updateError;

      setSuccess(true);
      setDocInfo({ ...docInfo, status: 'firmado' });
    } catch (err: any) {
      console.error(err);
      setError(`Error: ${err.message || JSON.stringify(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin w-12 h-12 text-indigo-500" />
        <span className="text-neutral-500 uppercase font-black tracking-widest text-xs">Cargando Documento...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-3xl max-w-md w-full">
          <p className="text-red-400 font-bold uppercase tracking-widest">{error}</p>
        </div>
      </div>
    );
  }

  if (docInfo?.status === 'firmado' || success) {
    const publicUrl = `/api/documentos/${encodeURIComponent(docInfo.file_path)}?t=${Date.now()}`;

    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-12 rounded-[3rem] max-w-md w-full shadow-2xl animate-in zoom-in fade-in duration-700">
          <ShieldCheck className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Documento Firmado</h2>
          <p className="text-emerald-400 mt-4 font-medium mb-8">El documento ha sido firmado exitosamente y guardado de manera segura en el sistema.</p>
          
          <a 
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-emerald-900/20"
          >
            Ver Documento Firmado
          </a>
          
          <p className="text-neutral-500 mt-8 text-xs font-bold uppercase tracking-widest">Ya puedes cerrar esta ventana</p>
        </div>
      </div>
    );
  }

  const documentUrl = docInfo ? `/api/documentos/${encodeURIComponent(docInfo.file_path)}` : "";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="text-center">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Firma Electrónica</h1>
          <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs mt-2">Trámite IMSS • NSS: {docInfo?.nss}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Columna Izquierda: Vista Previa */}
          <div className="bg-neutral-900/50 p-6 rounded-[3rem] border border-neutral-800 shadow-2xl flex flex-col animate-in fade-in slide-in-from-left-4 duration-700">
            <h3 className="font-black uppercase tracking-widest text-sm text-neutral-300 mb-4 text-center">Vista Previa del Documento</h3>
            <div className="flex-1 bg-white rounded-2xl overflow-hidden border border-neutral-700 h-[50vh] lg:h-[600px] relative">
              {documentUrl && (
                <iframe 
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`} 
                  className="w-full h-full absolute inset-0" 
                  title="Vista previa del documento"
                  frameBorder="0"
                />
              )}
            </div>
            <a 
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors text-center block"
            >
              Abrir PDF en pantalla completa
            </a>
          </div>

          {/* Columna Derecha: Panel de Instrucciones para Firmar */}
          <div className="bg-neutral-900/50 p-8 rounded-[3rem] border border-neutral-800 shadow-2xl flex flex-col justify-center items-center text-center animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mb-6">
              <PenTool className="w-10 h-10 text-indigo-400" />
            </div>
            
            <h3 className="font-black uppercase tracking-widest text-xl text-white mb-4">¿Todo listo?</h3>
            <p className="text-neutral-400 text-sm mb-8">Revisa el documento en la vista previa. Si todos tus datos están correctos, procede a plasmar tu firma.</p>

            <button
              onClick={() => setShowSignatureModal(true)}
              className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest py-5 rounded-2xl transition-all shadow-xl shadow-indigo-900/20"
            >
              <PenTool className="w-6 h-6" />
              Firmar Documento
            </button>
            
            <div className="mt-8 text-center text-[10px] text-neutral-600 font-bold uppercase tracking-widest">
              Al firmar, aceptas que tu trazo sea incrustado de manera digital en el documento oficial.
            </div>
          </div>

        </div>
      </div>

      {/* Modal de Firma a Pantalla Completa */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-2 sm:p-4 pb-8 animate-in fade-in duration-200">
          <div className="bg-neutral-900 w-full max-w-5xl h-full rounded-3xl border border-neutral-800 shadow-2xl flex flex-col overflow-hidden relative">
            
            <div className="px-4 py-2 sm:px-6 sm:py-3 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
              <h3 className="font-black uppercase tracking-widest text-sm sm:text-base text-white">Traza tu firma</h3>
              <button 
                onClick={() => setShowSignatureModal(false)}
                className="text-neutral-500 hover:text-white transition-colors p-2 font-bold uppercase tracking-widest text-xs"
                disabled={isSaving}
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 bg-white relative cursor-crosshair touch-none">
              <SignatureCanvas 
                ref={sigCanvas}
                clearOnResize={false}
                canvasProps={{
                  className: 'w-full h-full absolute inset-0',
                  style: { touchAction: 'none' }
                }}
                backgroundColor="transparent"
                penColor="black"
              />
            </div>

            <div className="px-4 py-2 sm:px-6 sm:py-3 border-t border-neutral-800 bg-neutral-950/50 flex flex-row gap-3 items-center justify-between">
              <button 
                onClick={clearSignature}
                disabled={isSaving}
                className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors py-2 px-4 sm:px-6 border border-neutral-700 rounded-xl whitespace-nowrap"
              >
                Borrar Trazo
              </button>
              
              <button
                onClick={handleSaveSignature}
                disabled={isSaving}
                className="flex-1 max-w-sm flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest py-2 px-4 rounded-xl transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] sm:text-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Finalizar Firma
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
