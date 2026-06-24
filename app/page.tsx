// app/page.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Target } from 'lucide-react'
import AnimatedBg from '@/components/AnimatedBg'

export default function Login() {
  const [loading, setLoading] = useState(false)

  /*
   🧠 LINGUAGEM → Supabase Auth + OAuth
      Quando o usuário clica em "Entrar com Google", chamamos
      signInWithOAuth. O Supabase redireciona para o Google,
      o usuário faz login, e volta para o nosso site já logado.
  */
  const loginGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Para onde o Google manda o usuário depois do login
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error(error)
      alert('Erro ao fazer login. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', position: 'relative',
    }}>
      <AnimatedBg />

      {/* Card de login */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'relative', zIndex: 1,
          width: 400, padding: 40,
          background: 'rgba(28,15,48,0.55)',
          backdropFilter: 'blur(24px)',
          borderRadius: 20,
          border: '1px solid rgba(147,51,255,0.2)',
          boxShadow: '0 24px 64px rgba(124,0,255,0.2)',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <img
          src="/logo.png"
          alt="FocusFlow"
          style={{
            width: 56, height: 56, margin: '0 auto 24px',
            borderRadius: 16, objectFit: 'cover',
            boxShadow: '0 0 32px rgba(147,51,255,0.6)',
            display: 'block',
          }}
        />

        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
          FocusFlow
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 32, lineHeight: 1.6 }}>
          Entre para começar a estudar do jeito que funciona pra você.
        </p>

        {/* Botão Google */}
        <button
          onClick={loginGoogle}
          disabled={loading}
          style={{
            width: '100%', padding: '13px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.15)',
            background: '#fff', color: '#1a1a1a',
            fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: "'Product Sans', sans-serif", transition: 'opacity .2s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {/* Logo do Google em SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#8400ff" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/>
            <path fill="#8400ff" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z"/>
            <path fill="#8400ff" d="M3.97 10.72a5.4 5.4 0 010-3.44V4.95H.96a9 9 0 000 8.1l3.01-2.33z"/>
            <path fill="#8400ff" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 00.96 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z"/>
          </svg>
          {loading ? 'Entrando...' : 'Entrar com Google'}
        </button>

        <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 24, lineHeight: 1.6 }}>
          Ao entrar, você concorda com nossos Termos de Uso e Política de Privacidade.
        </p>
      </motion.div>
    </div>
  )
}