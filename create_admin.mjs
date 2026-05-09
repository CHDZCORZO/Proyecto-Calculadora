import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Extract keys from .env.local
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.auth.signUp({
    email: 'chernandez@clearvoicemx.com',
    password: 'admin123',
  });

  if (error) {
    console.error('Error creating user:', error);
  } else {
    console.log('User created:', data.user.id);
  }
}

main();
