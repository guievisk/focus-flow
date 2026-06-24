// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { MethodProvider } from '@/components/MethodContext'
import { AuthProvider } from '@/components/AuthContext'

export const metadata: Metadata = {
  title: 'FocusFlow — Aprendizado com foco',
  description: 'Plataforma de micro-aprendizado com IA.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {/* AuthProvider envolve tudo — qualquer página sabe quem logou */}
        <AuthProvider>
          <MethodProvider>
            {children}
          </MethodProvider>
        </AuthProvider>
      </body>
    </html>
  )
}