// app/auth/callback/route.ts
// Recebe o usuário de volta do Google e finaliza o login

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()

    // Cria um cliente Supabase que funciona no servidor
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(toSet) {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Troca o código do Google por uma sessão válida
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Depois de logar, manda o usuário para o dashboard
  return NextResponse.redirect(`${origin}/dashboard`)
}