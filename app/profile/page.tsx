// app/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AppShell from '@/components/layout/AppShell'
import SweepCard from '@/components/SweepCard'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import { calcAge } from '@/lib/age'
import { Clock, Zap, Save, Check } from 'lucide-react'
import AvatarUpload from '@/components/AvatarUpload'

const ACCENT = '#7A00FF'

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone]             = useState('')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null)

  useEffect(() => {
    // Inicializa os campos editáveis a partir do perfil carregado (fonte externa).
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayName(profile.display_name || '')
      setPhone(profile.phone || '')
      const googleAvatar =
        user?.user_metadata?.avatar_url ||
        user?.user_metadata?.picture ||
        null
      setAvatarUrl(profile.avatar_url || googleAvatar)
    }
  }, [profile, user])

  const email = user?.email || ''
  const age   = profile?.birth_date ? calcAge(profile.birth_date) : null

  const xp = profile?.xp ?? 0
  const minutes = profile?.total_minutes ?? 0

  const level = Math.floor(xp / 100) + 1
  const xpInLevel = xp % 100
  const xpPercent = xpInLevel

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setSaved(false)

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        phone: phone || null,
      })
      .eq('id', user.id)

    if (error) {
      console.error(error)
      alert('Erro ao salvar.')
      setSaving(false)
      return
    }

    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const initials = (displayName || 'A').slice(0, 2).toUpperCase()

  return (
    <AppShell>
      <style>{`
        .prof-title { font-size: 28px; }
        .prof-main-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 16px;
          align-items: start;
        }
        .prof-card-padding { padding: 28px; }
        .prof-side-padding { padding: 24px; }
        .prof-time-value { font-size: 32px; }
        .prof-side-col { display: flex; flex-direction: column; gap: 16px; }

        @media (max-width: 768px) {
          .prof-title { font-size: 22px; }
          .prof-main-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .prof-card-padding { padding: 20px 18px; }
          .prof-side-padding { padding: 18px; }
          .prof-time-value { font-size: 26px; }
          .prof-side-col { gap: 14px; }
        }
      `}</style>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .4 }} style={{ marginBottom: 24 }}
      >
        <h1 className="prof-title" style={{ fontWeight: 800, color: 'var(--ink)' }}>Meu perfil</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
          Gerencie suas informações e acompanhe seu progresso.
        </p>
      </motion.div>

      <div className="prof-main-grid">

        {/* Coluna esquerda: editar informações */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .4, delay: .1 }}
        >
          <SweepCard radius={14} padding={0} duration={6} delay={0} opacity={0.32} accent={ACCENT}>
            <div className="prof-card-padding">
              {/* Avatar + nome */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <AvatarUpload
                  userId={user?.id || ''}
                  currentAvatarUrl={avatarUrl}
                  fallbackText={initials}
                  size={64}
                  onUploaded={(newUrl) => {
                    setAvatarUrl(newUrl)
                    refreshProfile()
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName || 'Sem nome'}
                  </div>
                  {age !== null && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{age} anos</div>}
                </div>
              </div>

              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 8 }}>
                Nome de exibição
              </label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                style={inputStyle}
              />

              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 8, marginTop: 16 }}>
                Telefone <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                style={inputStyle}
              />

              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 8, marginTop: 16 }}>
                Email
              </label>
              <input
                value={email}
                disabled
                style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
              />
              <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
                O email vem da sua conta Google e não pode ser alterado aqui.
              </p>

              <motion.button
                whileTap={{ scale: .97 }}
                onClick={handleSave}
                disabled={saving}
                style={{
                  marginTop: 22, width: '100%', padding: 13, borderRadius: 12, border: 'none',
                  background: saved ? '#00FFA3' : 'linear-gradient(135deg, #7A00FF, #5A00C4)',
                  color: saved ? '#050308' : '#fff', fontSize: 14, fontWeight: 600,
                  cursor: saving ? 'wait' : 'pointer',
                  fontFamily: "'Product Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 18px rgba(122,0,255,0.08)', transition: 'background .3s',
                }}
              >
                {saved ? <><Check size={16} /> Salvo!</> : saving ? 'Salvando...' : <><Save size={16} /> Salvar alterações</>}
              </motion.button>
            </div>
          </SweepCard>
        </motion.div>

        {/* Coluna direita: gamificação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .4, delay: .2 }}
          className="prof-side-col"
        >
          {/* Nível + XP */}
          <SweepCard radius={14} padding={0} duration={5} delay={-1.5} opacity={0.35} accent="#2E6BFF">
            <div className="prof-side-padding">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Zap size={20} color="#2E6BFF" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Nível atual</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>Nível {level}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{xpInLevel} / 100 XP</span>
                <span style={{ fontSize: 12, color: '#2E6BFF', fontWeight: 600 }}>{xp} XP total</span>
              </div>
              <div style={{ width: '100%', height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  style={{
                    height: '100%', borderRadius: 100,
                    background: 'linear-gradient(90deg, #5A00C4, #7A00FF, #A64DFF)',
                    boxShadow: '0 0 12px rgba(122,0,255,0.32)',
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 10 }}>
                Faltam {100 - xpInLevel} XP para o nível {level + 1}.
              </p>
            </div>
          </SweepCard>

          {/* Minutos */}
          <SweepCard radius={14} padding={0} duration={5} delay={-2.8} opacity={0.35} accent="#FFA800">
            <div className="prof-side-padding">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Clock size={20} color="#FFA800" />
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Tempo total estudado</div>
              </div>
              <div className="prof-time-value" style={{ fontWeight: 800, color: 'var(--ink)' }}>
                {Math.floor(minutes / 60)}h {minutes % 60}min
              </div>
              <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
                {minutes} minutos no total desde que você começou.
              </p>
            </div>
          </SweepCard>
        </motion.div>
      </div>
    </AppShell>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 10,
  border: '1.5px solid rgba(122,0,255,0.2)',
  background: 'rgba(255,255,255,0.04)', color: 'var(--ink)',
  fontFamily: "'Product Sans', sans-serif", fontSize: 14, outline: 'none',
  boxSizing: 'border-box',
}