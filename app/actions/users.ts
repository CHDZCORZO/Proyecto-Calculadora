"use server";

import { createClient } from '@supabase/supabase-js';

// Utilidad para limpiar los errores de copy-paste en Vercel
function getCleanUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return undefined;
  const match = url.match(/(https:\/\/[a-zA-Z0-9\-_.]+\.supabase\.co)/);
  return match ? match[1] : url.trim().replace(/^["']|["']$/g, '');
}

function getCleanServiceKey(): string | undefined {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return undefined;
  // Extrae solo el JWT que empieza con eyJhbG ({"alg)
  const match = key.match(/(eyJhbG[a-zA-Z0-9\-_.]+)/);
  return match ? match[1] : key.trim().replace(/^["']|["']$/g, '');
}

export async function createUser(email: string, password: string, role: string) {
  const supabaseUrl = getCleanUrl();
  const supabaseServiceKey = getCleanServiceKey();

  if (!supabaseUrl || !supabaseServiceKey) {
    return { success: false, error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.' };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (authData?.user) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ id: authData.user.id, role: role });

      if (roleError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return { success: false, error: 'Error al asignar el rol: ' + roleError.message };
      }

      return { success: true, message: 'Usuario creado exitosamente.' };
    }

    return { success: false, error: 'Ocurrió un error inesperado.' };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getUsersList() {
  const supabaseUrl = getCleanUrl();
  const supabaseServiceKey = getCleanServiceKey();
  
  if (!supabaseUrl || !supabaseServiceKey) return [];

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  if (usersError || !usersData) return [];

  const { data: rolesData } = await supabaseAdmin.from('user_roles').select('*');
  const rolesMap = new Map();
  if (rolesData) {
    rolesData.forEach((r: any) => rolesMap.set(r.id, r.role));
  }

  return usersData.users.map((u: any) => ({
    id: u.id,
    email: u.email,
    role: rolesMap.get(u.id) || 'Asesor',
    created_at: u.created_at
  }));
}

export async function deleteUserAccount(userId: string) {
  const supabaseUrl = getCleanUrl();
  const supabaseServiceKey = getCleanServiceKey();
  
  if (!supabaseUrl || !supabaseServiceKey) return { success: false, error: 'Falta SUPABASE_SERVICE_ROLE_KEY' };
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
