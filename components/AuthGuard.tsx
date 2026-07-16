'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthContext'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return


    if (!user) {
      router.replace('/')
      return
    }

    if (user && !profile && pathname !== '/onboarding') {
      router.replace('/onboarding')
      return
    }

    if (user && profile && pathname === '/onboarding') {
      router.replace('/dashboard')
      return
    }
  }, [user, profile, loading, pathname, router])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid rgba(122,0,255,0.2)',
          borderTopColor: '#7A00FF',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return <>{children}</>
}