// supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Brak kluczy Supabase. Upewnij się, że zdefiniowałeś zmienne NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY w pliku .env.'
  );
}

// 1. Publiczny klient Supabase (używany po stronie klienta z zabezpieczeniami RLS)
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// 2. Prywatny klient Admin (używany wyłącznie po stronie serwera API do pomijania RLS - np. walidacja kodów)
// Inicjalizujemy go bezpiecznie tylko na serwerze (gdzie SUPABASE_SERVICE_ROLE_KEY jest dostępny)
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null as any;
