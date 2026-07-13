// app/parents/page.tsx
'use client'

// Importações de gráficos
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts'

// Importações de ícones
import { Clock, CheckCircle, Target, Activity, AlertCircle, Info, Bell, Shield } from 'lucide-react'

import AppShell from '@/components/layout/AppShell'
import { useAuth } from '@/components/AuthContext'

// Estilo base reutilizável dos cards
const card: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 14,
  border: '1px solid var(--border)',
  padding: '22px 24px',
}

// Dados de foco semanal do aluno
const weekData = [
  { d: 'Seg', min: 20 }, { d: 'Ter', min: 42 },
  { d: 'Qua', min: 15 }, { d: 'Qui', min: 58 },
  { d: 'Sex', min: 35 }, { d: 'Sáb', min: 47 },
  { d: 'Dom', min: 22 },
]

// Dados de foco por hora do dia — mostra quando o aluno mais estuda
const hourData = [
  { h: '8h', min: 5  }, { h: '9h',  min: 12 }, { h: '10h', min: 8  },
  { h: '11h', min: 20 }, { h: '12h', min: 3  }, { h: '13h', min: 0  },
  { h: '14h', min: 35 }, { h: '15h', min: 42 }, { h: '16h', min: 28 },
  { h: '17h', min: 15 }, { h: '18h', min: 7  }, { h: '19h', min: 2  },
]

// Alertas gerados automaticamente pelo sistema de monitoramento
const alerts = [
  { type: 'warning', msg: 'Saiu da plataforma por 8 min às 14h30',      time: 'Hoje, 14h30'   },
  { type: 'success', msg: 'Completou 5 quizzes de Matemática',           time: 'Hoje, 13h15'   },
  { type: 'success', msg: 'Nova conquista: Semana de Fogo desbloqueada', time: 'Hoje, 11h00'   },
  { type: 'warning', msg: 'Ficou inativo por 12 min durante sessão',     time: 'Ontem, 15h45'  },
  { type: 'info',    msg: 'Meta semanal de foco atingida: 3h30',         time: 'Ontem, 18h00'  },
  { type: 'warning', msg: 'Mudou de aba 4 vezes em 10 minutos',          time: 'Seg, 14h20'    },
]

// Histórico de quizzes recentes do aluno
const quizHistory = [
  { subject: 'Alexandre o Grande', score: 8,  total: 10, date: 'Hoje'         },
  { subject: 'Sistema Solar',      score: 7,  total: 10, date: 'Ontem'        },
  { subject: 'Rev. Francesa',      score: 9,  total: 10, date: '2 dias atrás' },
  { subject: 'Frações',            score: 6,  total: 10, date: '3 dias atrás' },
  { subject: 'Fotossíntese',       score: 10, total: 10, date: '4 dias atrás' },
]

// Cores e ícones dos tipos de alerta
const alertStyle = {
  warning: { color: '#FFA800', bg: 'rgba(245,158,11,.1)',  border: 'rgba(245,158,11,.25)',  Icon: AlertCircle },
  success: { color: '#00C97B', bg: 'rgba(16,185,129,.1)',  border: 'rgba(16,185,129,.25)',  Icon: CheckCircle },
  info:    { color: '#2E6BFF', bg: 'rgba(59,130,246,.1)',  border: 'rgba(59,130,246,.25)',  Icon: Info        },
}

export default function Parents() {
const { profile, user } = useAuth()
const displayName =
  profile?.display_name ||
  profile?.full_name ||
  user?.user_metadata?.full_name ||
  'Aluno'
const initials = displayName.slice(0, 2).toUpperCase()
const avatarUrl =
  profile?.avatar_url ||
  user?.user_metadata?.avatar_url ||
  user?.user_metadata?.picture ||
  null
  return (
    <AppShell>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.5px' }}>
          Painel dos pais
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
          Acompanhe o progresso e o foco do seu filho em tempo real.
        </p>
      </div>

      {/* Banner de status do aluno */}
<div style={{
  ...card,
  marginBottom: 18,
  background: 'linear-gradient(135deg, rgba(98,22,216,.15) 0%, rgba(98,22,216,.05) 100%)',
  border: '1px solid rgba(98,22,216,.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    {/* Avatar do aluno */}
    <div style={{
      width: 52,
      height: 52,
      borderRadius: '50%',
      backgroundImage: avatarUrl
        ? `url(${avatarUrl})`
        : 'linear-gradient(135deg, #7A00FF, #5A00C4)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid var(--p-line)',
      flexShrink: 0,
    }}>
      {!avatarUrl && (
        <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
          {initials}
        </span>
      )}
    </div>
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{displayName}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>Plano Família · 7 dias de sequência</div>
    </div>
  </div>
  {/* Indicador de status online */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)' }}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C97B' }} />
    <span style={{ fontSize: 13, fontWeight: 600, color: '#00C97B' }}>Estudando agora</span>
  </div>
</div>

      {/* Cards de estatísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        {[
          { label: 'Foco hoje',      value: '32 min', sub: 'Meta: 45 min', Icon: Clock,        c: '#6216D8' },
          { label: 'Quizzes feitos', value: '12',      sub: '+3 hoje',      Icon: CheckCircle,  c: '#00C97B' },
          { label: 'Média acertos',  value: '78%',     sub: 'Esta semana',  Icon: Target,       c: '#FFA800' },
          { label: 'Sequência',      value: '7 dias',  sub: 'Recorde: 12',  Icon: Activity,     c: '#FF3B3B' },
        ].map(({ label, value, sub, Icon, c }, i) => (
          <div key={i} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--p-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} color={c} strokeWidth={2} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 11.5, color: c, fontWeight: 600 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Foco semanal */}
        <div style={{ ...card, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Foco semanal</h3>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Últimos 7 dias</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weekData}>
              <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6A6A88' }} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--ink)' }} />
              <Bar dataKey="min" fill="#6216D8" radius={[6, 6, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Foco por hora do dia */}
        <div style={{ ...card, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Horário de estudo</h3>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Hoje</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={hourData}>
              <defs>
                <linearGradient id="gh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00C97B" stopOpacity={.3} />
                  <stop offset="95%" stopColor="#00C97B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="h" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6A6A88' }} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--ink)' }} />
              <Area type="monotone" dataKey="min" stroke="#00C97B" strokeWidth={2} fill="url(#gh)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alertas e histórico lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

        {/* Alertas de monitoramento */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Alertas de monitoramento</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(245,158,11,.1)' }}>
              <Bell size={12} color="#FFA800" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#FFA800' }}>2 novos</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map((a, i) => {
              const { color, bg, border, Icon } = alertStyle[a.type as keyof typeof alertStyle]
              return (
                <div key={i} style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: bg, border: `1px solid ${border}`,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <Icon size={14} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, marginBottom: 3 }}>{a.msg}</p>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{a.time}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Histórico de quizzes */}
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 18 }}>
            Quizzes recentes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quizHistory.map((q, i) => {
              // Calcula a cor da nota baseado no percentual de acerto
              const pct = q.score / q.total
              const color = pct >= 0.8 ? '#00C97B' : pct >= 0.6 ? '#FFA800' : '#FF3B3B'
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{q.subject}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{q.date}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color }}>{q.score}/{q.total}</div>
                </div>
              )
            })}
          </div>

          {/* Resumo de segurança */}
          <div style={{
            marginTop: 16, padding: '12px 14px', borderRadius: 10,
            background: 'rgba(98,22,216,.08)', border: '1px solid rgba(98,22,216,.15)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Shield size={16} color="#8F5CF7" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8F5CF7' }}>Monitoramento ativo</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Última atualização: agora</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}