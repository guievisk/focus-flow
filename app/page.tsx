'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Brain, Flame, Users, Sparkles } from 'lucide-react'
import AnimatedBg from '@/components/AnimatedBg'

const FEATURES = [
  {
    icon: Brain,
    title: 'Lições feitas pela IA',
    desc: 'Um tutor que se adapta ao seu nível e explica de novo de outro jeito quando trava.',
  },
  {
    icon: Flame,
    title: 'XP e ofensiva diária',
    desc: 'Cada minuto e cada acerto viram progresso — salvo de verdade, sem sumir.',
  },
  {
    icon: Users,
    title: 'Estude com amigos',
    desc: 'Adicione amigos pelo código e mantenham a rotina de estudo juntos.',
  },
]

export default function Login() {
  const [loading, setLoading] = useState(false)

  const loginGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
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
    <div className="login-root">
      <AnimatedBg />

      <style>{`
        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          position: relative;
          padding: 40px 20px;
        }
        .login-grid {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 940px;
          display: grid;
          grid-template-columns: 1.1fr 400px;
          gap: 56px;
          align-items: center;
        }
        .login-hero { max-width: 460px; }
        .login-feature-row { display: flex; gap: 14px; align-items: flex-start; }
        @media (max-width: 860px) {
          .login-grid {
            grid-template-columns: 1fr;
            max-width: 420px;
            gap: 32px;
          }
          .login-hero { max-width: none; text-align: center; }
          .login-feature-row { text-align: left; }
        }
      `}</style>

      <div className="login-grid">
        {}
        <motion.div
          className="login-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 100,
            background: 'var(--p-soft)', border: '1px solid var(--p-line)',
            marginBottom: 20,
          }}>
            <Sparkles size={13} color="var(--p3)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--p3)' }}>
              Estudo com foco, do seu jeito
            </span>
          </div>

          <h1 style={{
            fontSize: 40, fontWeight: 800, color: 'var(--ink)',
            lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 14,
          }}>
            Aprenda no seu ritmo,<br />
            <span style={{
              background: 'linear-gradient(120deg, #A64DFF, #5A00C4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              sem perder o foco.
            </span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 28 }}>
            O FocusFlow transforma qualquer tema em lições curtas, quizzes sob medida
            e uma rotina que recompensa cada passo. Pensado pra quem se distrai fácil.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                className="login-feature-row"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
              >
                <div style={{
                  flexShrink: 0, width: 38, height: 38, borderRadius: 10,
                  background: 'var(--p-soft)', border: '1px solid var(--p-line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <f.icon size={18} color="var(--p3)" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
                    {f.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                    {f.desc}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            width: '100%', maxWidth: 400, padding: 40, margin: '0 auto',
            background: 'rgba(17,9,30,0.55)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 20,
            border: '1px solid rgba(122,0,255,0.2)',
            boxShadow: '0 11px 13px rgba(124,0,255,0.04)',
            textAlign: 'center',
          }}
        >
          {}
          <Image
            src="/logo.png"
            alt="FocusFlow"
            width={56}
            height={56}
            priority
            style={{
              width: 56, height: 56, margin: '0 auto 24px',
              borderRadius: 16, objectFit: 'cover',
              boxShadow: '0 0 14px rgba(122,0,255,0.27)',
              display: 'block',
            }}
          />

          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
            Bem-vindo de volta
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 32, lineHeight: 1.6 }}>
            Entre para começar a estudar do jeito que funciona pra você.
          </p>

          {}
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
            {}
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#6E00E0" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/>
              <path fill="#6E00E0" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z"/>
              <path fill="#6E00E0" d="M3.97 10.72a5.4 5.4 0 010-3.44V4.95H.96a9 9 0 000 8.1l3.01-2.33z"/>
              <path fill="#6E00E0" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 00.96 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z"/>
            </svg>
            {loading ? 'Entrando...' : 'Entrar com Google'}
          </button>

          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 24, lineHeight: 1.6 }}>
            Ao entrar, você concorda com nossos Termos de Uso e Política de Privacidade.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
