"use server";

import { createClient } from '@supabase/supabase-js';

export async function createUser(email: string, password: string, role: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    // 1. Create the user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm the email
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (authData?.user) {
      // 2. Assign the role in user_roles
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ id: authData.user.id, role: role });

      if (roleError) {
        // Rollback: delete the user if role assignment failed
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
