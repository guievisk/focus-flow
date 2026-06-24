// components/AuthGuard.tsx
// "Guarda" que protege páginas e redireciona conforme o estado do usuário
'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthContext'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Enquanto ainda está carregando, não faz nada
    if (loading) return

    /*
     🧠 LÓGICA DO GUARDA
        1. Não logado → manda pro login (/)
        2. Logado mas SEM perfil → manda pro /onboarding
        3. Logado COM perfil tentando ver /onboarding → manda pro dashboard
    */

    // 1. Não está logado → vai pro login
    if (!user) {
      router.replace('/')
      return
    }

    // 2. Logado mas sem perfil → completa o cadastro
    if (user && !profile && pathname !== '/onboarding') {
      router.replace('/onboarding')
      return
    }

    // 3. Já tem perfil mas está no onboarding → vai pro dashboard
    if (user && profile && pathname === '/onboarding') {
      router.replace('/dashboard')
      return
    }
  }, [user, profile, loading, pathname, router])

  // Enquanto carrega, mostra uma tela de loading
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid rgba(147,51,255,0.2)',
          borderTopColor: '#9333FF',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return <>{children}</>
}