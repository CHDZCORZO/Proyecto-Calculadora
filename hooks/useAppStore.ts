import { useState, useEffect } from 'react';

export type Advisor = {
  id: string;
  name: string;
  sucursal: string;
  supervisor: string;
  photoUrl: string;
  metas: {
    semanal: number;
    mensual: number;
    anual: number;
  };
};

export type SaleRecord = {
  id: string;
  advisorId: string;
  amount: number;
  brand: string;
  date: string; // ISO format
};

export type AppState = {
  settings: {
    diasOperacionMensual: number;
    diasTranscurridosMensual: number;
  };
  staff: Advisor[];
  sales: SaleRecord[];
  brands: string[];
};

const DEFAULT_BRANDS = ['Consubanco', 'Opcipres', 'CNCA', 'LCOM'];

const initialState: AppState = {
  settings: {
    diasOperacionMensual: 24,
    diasTranscurridosMensual: 14,
  },
  staff: [],
  sales: [],
  brands: DEFAULT_BRANDS,
};

export const useAppStore = () => {
  const [state, setState] = useState<AppState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('clearvoice_app_state');
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing localStorage state:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  const saveState = (newState: AppState) => {
    setState(newState);
    localStorage.setItem('clearvoice_app_state', JSON.stringify(newState));
  };

  const updateSettings = (settings: AppState['settings']) => {
    saveState({ ...state, settings });
  };

  const addBrand = (brand: string) => {
    if (!state.brands.includes(brand)) {
      saveState({ ...state, brands: [...state.brands, brand] });
    }
  };

  const saveStaff = (staff: Advisor[]) => {
    saveState({ ...state, staff });
  };

  const addSales = (newSales: SaleRecord[]) => {
    saveState({ ...state, sales: [...state.sales, ...newSales] });
  };

  const clearSales = () => {
    saveState({ ...state, sales: [] });
  };

  return {
    state,
    isLoaded,
    updateSettings,
    addBrand,
    saveStaff,
    addSales,
    clearSales,
  };
};
