// lib/data/supabase/client.ts
// Cliente Supabase do browser — ÚNICO ponto do app que conhece o provedor.
// Fora de lib/data/, importar este módulo (ou @supabase/*) é erro de lint.
//
// Criação LAZY (primeiro uso, não no import): permite que a suite de testes
// importe lib/data sem precisar de NEXT_PUBLIC_SUPABASE_* no ambiente.

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Mesmo tipo do client original (schema `any` — sem types gerados do banco).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BrowserClient = SupabaseClient<any, 'public', any>

let client: BrowserClient | null = null

export function getSupabaseClient(): BrowserClient {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return client
}

// Compatibilidade com o código existente (`import { supabase } ...`):
// o Proxy adia a criação real até o primeiro acesso a uma propriedade.
export const supabase: BrowserClient = new Proxy({} as BrowserClient, {
  get(_target, prop, receiver) {
    const real = getSupabaseClient()
    const value = Reflect.get(real, prop, receiver)
    return typeof value === 'function' ? value.bind(real) : value
  },
})
