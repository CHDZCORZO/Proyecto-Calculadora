import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useAppStore, SaleRecord } from '../../hooks/useAppStore';
import { UploadCloud, AlertCircle, CheckCircle2 } from 'lucide-react';

export const FileUploader = () => {
  const { state, addBrand, addSales, isLoaded } = useAppStore();
  const [pendingBrands, setPendingBrands] = useState<string[]>([]);
  const [processedSales, setProcessedSales] = useState<SaleRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const processData = (data: any[]) => {
    // Asumimos columnas: "Asesor", "Monto", "Marca", "Fecha" (opcional)
    const newSales: SaleRecord[] = [];
    const unknownBrands = new Set<string>();

    data.forEach((row, index) => {
      // Ignorar filas vacías
      if (!row || Object.keys(row).length === 0) return;

      const rawAsesor = row['Asesor'] || row['Nombre'] || row[0];
      const rawMonto = row['Monto'] || row['Venta'] || row[1];
      const rawMarca = row['Marca'] || row['Brand'] || row[2];

      if (!rawAsesor || !rawMonto) return; // Fila inválida

      const monto = typeof rawMonto === 'number' ? rawMonto : parseFloat(String(rawMonto).replace(/[^0-9.-]+/g,""));
      const marca = rawMarca ? String(rawMarca).trim() : 'Desconocida';

      if (!state.brands.includes(marca) && !unknownBrands.has(marca)) {
        unknownBrands.add(marca);
      }

      newSales.push({
        id: `sale_${Date.now()}_${index}`,
        advisorId: String(rawAsesor).trim(), // Idealmente buscaríamos el ID del asesor por nombre
        amount: monto || 0,
        brand: marca,
        date: new Date().toISOString(),
      });
    });

    if (unknownBrands.size > 0) {
      setPendingBrands(Array.from(unknownBrands));
      setProcessedSales(newSales);
    } else {
      addSales(newSales);
      setSuccessMsg(`Se procesaron ${newSales.length} registros exitosamente.`);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setSuccessMsg(null);
    setPendingBrands([]);
    setProcessedSales([]);

    acceptedFiles.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (ext === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            processData(results.data);
          },
          error: (err) => {
            setError(`Error parseando CSV: ${err.message}`);
          }
        });
      } else if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            processData(jsonData);
          } catch (err) {
            setError('Error parseando Excel. Verifica el formato.');
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        setError('Formato no soportado. Sube CSV o Excel.');
      }
    });
  }, [state.brands, addSales]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {
    'text/csv': ['.csv'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls']
  }});

  const handleConfirmBrands = () => {
    pendingBrands.forEach(b => addBrand(b));
    addSales(processedSales);
    setPendingBrands([]);
    setProcessedSales([]);
    setSuccessMsg(`Se agregaron nuevas marcas y se procesaron ${processedSales.length} registros.`);
  };

  const handleRejectBrands = () => {
    setPendingBrands([]);
    setProcessedSales([]);
    setError('Carga cancelada debido a marcas desconocidas no autorizadas.');
  };

  if (!isLoaded) return <div className="animate-pulse h-48 bg-neutral-900 rounded-xl" />;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-white mb-6">Carga de Reportes (Ventas y Metas)</h3>

      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50'
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className={`w-12 h-12 mb-4 ${isDragActive ? 'text-indigo-400' : 'text-neutral-500'}`} />
        <p className="text-white font-semibold text-center mb-1">
          {isDragActive ? 'Suelta el archivo aquí...' : 'Arrastra un archivo Excel o CSV aquí'}
        </p>
        <p className="text-sm text-neutral-500 text-center">
          O haz clic para seleccionar (Máximo 5MB)
        </p>
      </div>

      {/* Alertas */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-200">{successMsg}</p>
        </div>
      )}

      {/* Modal de Confirmación de Marcas */}
      {pendingBrands.length > 0 && (
        <div className="mt-6 p-5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <h4 className="text-white font-bold">Marcas Desconocidas Detectadas</h4>
          </div>
          <p className="text-sm text-neutral-300 mb-4">
            El archivo contiene marcas que no están en el sistema: 
            <span className="font-bold text-yellow-400 ml-1">
              {pendingBrands.join(', ')}
            </span>. 
            ¿Deseas darlas de alta y procesar los registros?
          </p>
          <div className="flex gap-3">
            <button 
              onClick={handleConfirmBrands}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors"
            >
              Sí, autorizar marcas
            </button>
            <button 
              onClick={handleRejectBrands}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold rounded-lg border border-neutral-700 transition-colors"
            >
              No, cancelar carga
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
