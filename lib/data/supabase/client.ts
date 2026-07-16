
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

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

export const supabase: BrowserClient = new Proxy({} as BrowserClient, {
  get(_target, prop, receiver) {
    const real = getSupabaseClient()
    const value = Reflect.get(real, prop, receiver)
    return typeof value === 'function' ? value.bind(real) : value
  },
})
