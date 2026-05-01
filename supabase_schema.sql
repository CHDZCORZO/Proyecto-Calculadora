-- 1. Tabla: profiles
-- Almacena la información de los usuarios. El ID está vinculado a la tabla auth.users de Supabase.
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre TEXT,
  email TEXT,
  rol TEXT CHECK (rol IN ('ejecutivo', 'admin', 'superuser')) DEFAULT 'ejecutivo',
  sucursal TEXT,
  supervisor TEXT,
  foto_url TEXT,
  insignias_manuales JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla: cotizadores_data
-- Almacena la información cargada desde los Excel.
CREATE TABLE public.cotizadores_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca TEXT,
  id_cotizador TEXT,
  nombre_cotizador TEXT,
  plazo INTEGER,
  monto_bruto NUMERIC,
  descuento NUMERIC,
  tasa_mensual NUMERIC,
  cat_iva NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla: ventas_history
-- Almacena el historial de ventas para el cálculo de comisiones y ranking.
CREATE TABLE public.ventas_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ejecutivo_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  monto_comisionable NUMERIC NOT NULL,
  marca TEXT,
  plazo INTEGER,
  tipo_producto TEXT,
  fecha DATE DEFAULT CURRENT_DATE,
  sucursal TEXT,
  supervisor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla: config_metas
-- Almacena las metas globales e individuales definidas por los administradores.
CREATE TABLE public.config_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes INTEGER CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER,
  dias_operacion INTEGER,
  meta_global NUMERIC,
  metas_individuales JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- CONFIGURACIÓN DE SEGURIDAD (Row Level Security - RLS)
-- ==============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizadores_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_metas ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Políticas para: profiles
-- ------------------------------------------------------------------------------
-- Todos los usuarios autenticados pueden ver los perfiles (necesario para ver nombres en el ranking)
CREATE POLICY "Perfiles visibles para usuarios autenticados" 
ON public.profiles FOR SELECT TO authenticated USING (true);

-- Los usuarios solo pueden actualizar su propio perfil (foto, etc.)
CREATE POLICY "Usuarios pueden actualizar su propio perfil" 
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- Políticas para: ventas_history
-- ------------------------------------------------------------------------------
-- SELECT: Todos los autenticados pueden ver el historial (necesario para el ranking general)
CREATE POLICY "Historial de ventas visible para todos los autenticados" 
ON public.ventas_history FOR SELECT TO authenticated USING (true);

-- INSERT: Los ejecutivos solo pueden registrar ventas a su propio nombre
CREATE POLICY "Ejecutivos insertan sus propias ventas" 
ON public.ventas_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = ejecutivo_id);

-- UPDATE/DELETE: Los ejecutivos solo pueden modificar o eliminar sus propias ventas
CREATE POLICY "Ejecutivos actualizan sus propias ventas" 
ON public.ventas_history FOR UPDATE TO authenticated USING (auth.uid() = ejecutivo_id);

CREATE POLICY "Ejecutivos eliminan sus propias ventas" 
ON public.ventas_history FOR DELETE TO authenticated USING (auth.uid() = ejecutivo_id);

-- ------------------------------------------------------------------------------
-- Políticas para: cotizadores_data
-- ------------------------------------------------------------------------------
-- SELECT: Todos pueden leer la información de los cotizadores
CREATE POLICY "Cotizadores visibles para todos" 
ON public.cotizadores_data FOR SELECT TO authenticated USING (true);

-- ALL (Insert/Update/Delete): Solo los administradores o superusers pueden modificar los cotizadores
CREATE POLICY "Admins modifican cotizadores" 
ON public.cotizadores_data FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'superuser')
  )
);

-- ------------------------------------------------------------------------------
-- Políticas para: config_metas
-- ------------------------------------------------------------------------------
-- SELECT: Todos los ejecutivos pueden ver las metas establecidas
CREATE POLICY "Metas visibles para todos" 
ON public.config_metas FOR SELECT TO authenticated USING (true);

-- ALL (Insert/Update/Delete): Solo los administradores pueden gestionar las metas
CREATE POLICY "Admins modifican metas" 
ON public.config_metas FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'superuser')
  )
);

-- ==============================================================================
-- TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- ==============================================================================

-- Función para crear automáticamente un registro en public.profiles 
-- cuando un usuario se registra a través de Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'nombre' -- Toma el nombre si se pasa en la metadata de registro
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que ejecuta la función al insertar en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
