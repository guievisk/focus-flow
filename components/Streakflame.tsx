// components/StreakFlame.tsx
// O foguinho de dias consecutivos. Mostra o número e, ao clicar,
// abre um modal (onde sua animação Lottie vai entrar depois).
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, X } from 'lucide-react'
import { useAuth } from '@/components/AuthContext'
import { isStreakActiveToday, DAILY_GOAL } from '@/lib/streak'
import Lottie from 'lottie-react'
import fireAnimation from './fire.json'

export default function StreakFlame() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)

  if (!profile) return null

  const days = profile.streak_days ?? 0
  const active = isStreakActiveToday(profile)
  const minutesToday = profile.minutes_today_date === new Date().toISOString().split('T')[0]
    ? profile.minutes_today
    : 0

  return (
    <>
      {/* Foguinho clicável */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 13px', borderRadius: 100,
          border: active ? '1px solid rgba(122,0,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
          background: active ? 'rgba(122,0,255,0.15)' : 'rgba(255,255,255,0.03)',
          cursor: 'pointer', fontFamily: "'Product Sans', sans-serif",
        }}
      
      >
<div style={{ width: 22, height: 22, opacity: active ? 1 : 0.35 }}>
          <Lottie animationData={fireAnimation} loop={true} />
        </div>
        </motion.button>

      {/* Modal que abre ao clicar */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(11,6,18,0.8)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                position: 'relative', width: 380, padding: 40,
                background: 'rgba(17,9,30,0.9)', borderRadius: 24,
                border: '1px solid rgba(122,0,255,0.3)',
                boxShadow: '0 11px 16px rgba(124,0,255,0.08)',
                textAlign: 'center',
              }}
            >
              {/* Botão fechar */}
              <button
                onClick={() => setOpen(false)}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)',
                }}
              >
                <X size={20} />
              </button>

              {/* ===== AQUI VAI ENTRAR SUA ANIMAÇÃO LOTTIE ===== */}
              {/* Por enquanto, um foguinho grande com glow animado */}
              {/* Animação Lottie do foguinho */}
              <div
                style={{
                  width: 160,
                  height: 160,
                  margin: '0 auto 20px',
                  filter: 'drop-shadow(0 0 14px rgba(122,0,255,0.27))',
                }}
              >
                <Lottie animationData={fireAnimation} loop={true} />
              </div>

              <div style={{ fontSize: 44, fontWeight: 900, color: 'var(--ink)' }}>{days}</div>
              <div style={{ fontSize: 15, color: '#A64DFF', fontWeight: 600, marginBottom: 16 }}>
                {days === 1 ? 'dia de sequência' : 'dias de sequência'}
              </div>

              {/* Progresso de hoje */}
              <div style={{
                padding: 14, borderRadius: 12,
                background: 'rgba(122,0,255,0.08)', border: '1px solid rgba(122,0,255,0.2)',
              }}>
                {active ? (
                  <p style={{ fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Flame size={14} strokeWidth={2.2} color="#FF8A2B" /> Meta de hoje batida! Volte amanhã pra continuar.
                  </p>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>
                      {minutesToday} / {DAILY_GOAL} min hoje
                    </p>
                    <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min((minutesToday / DAILY_GOAL) * 100, 100)}%`,
                        height: '100%', borderRadius: 100,
                        background: 'linear-gradient(90deg, #5A00C4, #7A00FF)',
                      }} />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
                      Estude mais {Math.max(DAILY_GOAL - minutesToday, 0)} min pra manter o foguinho aceso.
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}