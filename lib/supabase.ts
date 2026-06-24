// lib/supabase.ts
// Cria o cliente que conecta o site ao Supabase (login + banco)

import { createBrowserClient } from '@supabase/ssr'

// Lê as variáveis do .env.local
// O ! no final diz ao TypeScript: "confie, essa variável existe"
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)