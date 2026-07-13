// app/onboarding/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthContext'
import AnimatedBg from '@/components/AnimatedBg'
import { Target, ArrowRight } from 'lucide-react'

export default function Onboarding() {
  const { user, refreshProfile } = useAuth()
  const router = useRouter()

  const [displayName, setDisplayName]   = useState('')
  const [birthDate, setBirthDate]       = useState('')
  const [wantsParental, setWantsParental] = useState(false)
  const [parentEmail, setParentEmail]   = useState('')
  const [loading, setLoading]           = useState(false)

  // Calcula a idade a partir da data de nascimento
  const calcAge = (date: string) => {
    const birth = new Date(date)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const age = birthDate ? calcAge(birthDate) : null
  const isMinor = age !== null && age < 18

  const handleSave = async () => {
    if (!user || !birthDate || !displayName) return
    setLoading(true)
    const birth = new Date(birthDate)
    const age = new Date().getFullYear() - birth.getFullYear()
    if (isNaN(birth.getTime()) || age < 5 || age > 120) {
      alert('Data de nascimento inválida')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      display_name: displayName,
      birth_date: birthDate,
      wants_parental: isMinor ? wantsParental : false,
      parent_email: isMinor && wantsParental ? parentEmail : null,
    })

    if (error) {
      console.error(error)
      alert('Erro ao salvar. Tente novamente.')
      setLoading(false)
      return
    }

    await refreshProfile()
    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', position: 'relative',
    }}>
      <AnimatedBg />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'relative', zIndex: 1,
          width: 440, padding: 40,
          background: 'rgba(17,9,30,0.6)',
          backdropFilter: 'blur(24px)',
          borderRadius: 20,
          border: '1px solid rgba(122,0,255,0.2)',
          boxShadow: '0 11px 13px rgba(124,0,255,0.04)',
        }}
      >
        {/* Logo */}
        <div style={{
          width: 52, height: 52, margin: '0 auto 20px',
          background: 'linear-gradient(135deg, #7A00FF, #5A00C4)',
          borderRadius: 14, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 13px rgba(122,0,255,0.27)',
        }}>
          <Target size={26} color="#fff" strokeWidth={2.2} />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', textAlign: 'center', marginBottom: 6 }}>
          Complete seu perfil
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
          Precisamos de algumas informações para personalizar sua experiência.
        </p>

        {/* Campo nome de exibição */}
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 8 }}>
          Como quer ser chamado?
        </label>
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Pode ser um apelido ou nome fictício"
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 10,
            border: '1.5px solid rgba(122,0,255,0.2)',
            background: 'rgba(255,255,255,0.04)', color: 'var(--ink)',
            fontFamily: "'Product Sans', sans-serif", fontSize: 14, outline: 'none',
            marginBottom: 16,
          }}
        />

        {/* Campo data de nascimento */}
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 8 }}>
          Data de nascimento
        </label>
        <input
          type="date"
          value={birthDate}
          max={new Date().toISOString().split('T')[0]}
          min="1900-01-01"
          onChange={e => setBirthDate(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 10,
            border: '1.5px solid rgba(122,0,255,0.2)',
            background: 'rgba(255,255,255,0.04)', color: 'var(--ink)',
            fontFamily: "'Product Sans', sans-serif", fontSize: 14, outline: 'none',
            marginBottom: 16, colorScheme: 'dark',
          }}
        />

        {/* Controle parental para menores */}
        {isMinor && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ overflow: 'hidden', marginBottom: 16 }}
          >
            <div style={{
              padding: 16, borderRadius: 12,
              background: 'rgba(122,0,255,0.08)',
              border: '1px solid rgba(122,0,255,0.2)',
            }}>
              <p style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 12, lineHeight: 1.5 }}>
                Você tem {age} anos. Quer ativar o <strong>controle parental</strong>?
                Um responsável poderá acompanhar seu progresso.
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: wantsParental ? 12 : 0 }}>
                <button
                  onClick={() => setWantsParental(true)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                    border: wantsParental ? '1px solid #7A00FF' : '1px solid rgba(255,255,255,0.1)',
                    background: wantsParental ? 'rgba(122,0,255,0.2)' : 'transparent',
                    color: wantsParental ? '#A64DFF' : 'var(--ink-2)',
                    fontSize: 13, fontWeight: 600, fontFamily: 'Inter',
                  }}
                >Sim</button>
                <button
                  onClick={() => setWantsParental(false)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                    border: !wantsParental ? '1px solid #7A00FF' : '1px solid rgba(255,255,255,0.1)',
                    background: !wantsParental ? 'rgba(122,0,255,0.2)' : 'transparent',
                    color: !wantsParental ? '#A64DFF' : 'var(--ink-2)',
                    fontSize: 13, fontWeight: 600, fontFamily: 'Inter',
                  }}
                >Não</button>
              </div>

              {wantsParental && (
                <input
                  type="email"
                  value={parentEmail}
                  onChange={e => setParentEmail(e.target.value)}
                  placeholder="Email do responsável"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1.5px solid rgba(122,0,255,0.2)',
                    background: 'rgba(255,255,255,0.04)', color: 'var(--ink)',
                    fontFamily: "'Product Sans', sans-serif", fontSize: 13, outline: 'none',
                  }}
                />
              )}
            </div>
          </motion.div>
        )}

        {/* Botão salvar */}
        <button
          onClick={handleSave}
          disabled={loading || !birthDate || !displayName || (isMinor && wantsParental && !parentEmail)}
          style={{
            width: '100%', padding: 13, borderRadius: 12, border: 'none',
            background: (!birthDate || !displayName || loading) ? 'rgba(122,0,255,0.3)' : 'linear-gradient(135deg, #7A00FF, #5A00C4)',
            color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: (!birthDate || !displayName || loading) ? 'not-allowed' : 'pointer',
            fontFamily: "'Product Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 18px rgba(122,0,255,0.08)',
          }}
        >
          {loading ? 'Salvando...' : <>Continuar <ArrowRight size={16} /></>}
        </button>
      </motion.div>
    </div>
  )
}