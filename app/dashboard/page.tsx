// app/dashboard/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import AppShell from '@/components/layout/AppShell'
import SweepCard from '@/components/SweepCard'
import { supabase } from '@/lib/supabase'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Activity, Clock, CheckCircle, Star, BookOpen } from 'lucide-react'
import { useAuth } from '@/components/AuthContext'

const ACCENT = '#7A00FF'
const DAILY_GOAL = 20

const DIFF_COLOR: Record<string, string> = {
  facil:   '#00C97B',
  medio:   '#7A00FF',
  dificil: '#FF8A2B',
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type QuizResult = {
  id: string
  topic: string
  difficulty: string
  total_questions: number
  correct_answers: number
  xp_earned: number
  created_at: string
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function relativeDate(iso: string): string {
  const that = new Date(iso)
  const now = new Date()
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startThat = new Date(that.getFullYear(), that.getMonth(), that.getDate()).getTime()
  const diff = Math.round((startNow - startThat) / 86_400_000)
  if (diff <= 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  if (diff < 7) return `${diff} dias atrás`
  return that.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

function buildWeekData(quizzes: QuizResult[]) {
  const counts: Record<string, number> = {}
  for (const q of quizzes) {
    const key = localDateKey(new Date(q.created_at))
    counts[key] = (counts[key] || 0) + 1
  }
  const out: { d: string; q: number }[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    out.push({ d: WEEKDAYS[date.getDay()], q: counts[localDateKey(date)] || 0 })
  }
  return out
}

export default function Dashboard() {
  const { profile, user } = useAuth()
  const [quizzes, setQuizzes] = useState<QuizResult[]>([])
  const [loadingQuizzes, setLoadingQuizzes] = useState(true)

  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    'Aluno'

  const userId = user?.id

  useEffect(() => {
    // Sem usuário não há o que buscar — apenas encerra o loading. Não é render em cascata.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!userId) { setLoadingQuizzes(false); return }
    let active = true
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_results')
          .select('id, topic, difficulty, total_questions, correct_answers, xp_earned, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(60)
        if (!active) return
        if (error) throw error
        setQuizzes(data || [])
      } catch (e) {
        console.error('Erro ao carregar quizzes:', e)
        if (active) setQuizzes([])
      } finally {
        if (active) setLoadingQuizzes(false)
      }
    })()
    return () => { active = false }
  }, [userId])

  const xp = profile?.xp ?? 0
  const streak = profile?.streak_days ?? 0
  const level = Math.floor(xp / 100) + 1
  const todayKey = localDateKey(new Date())
  const minutesToday = profile?.minutes_today_date === todayKey ? (profile?.minutes_today ?? 0) : 0

  const quizzesToday = useMemo(
    () => quizzes.filter((q) => relativeDate(q.created_at) === 'Hoje').length,
    [quizzes]
  )

  const weekData = useMemo(() => buildWeekData(quizzes), [quizzes])
  const hasActivity = weekData.some((d) => d.q > 0)
  const recentQuizzes = quizzes.slice(0, 4)

  const stats = [
    { label: 'Sequência de estudo', value: `${streak} ${streak === 1 ? 'dia' : 'dias'}`,
      sub: streak > 0 ? 'Continue assim' : 'Comece hoje', Icon: Activity, c: '#FF8A2B' },
    { label: 'Foco hoje', value: `${minutesToday} min`,
      sub: minutesToday >= DAILY_GOAL ? 'Meta batida!' : `Meta: ${DAILY_GOAL} min`, Icon: Clock, c: '#FFA800' },
    { label: 'Quizzes realizados', value: loadingQuizzes ? '—' : `${quizzes.length}`,
      sub: quizzesToday > 0 ? `+${quizzesToday} hoje` : 'Nenhum hoje', Icon: CheckCircle, c: '#00C97B' },
    { label: 'XP acumulado', value: xp.toLocaleString('pt-BR'),
      sub: `Nível ${level}`, Icon: Star, c: '#2E6BFF' },
  ]

  return (
    <AppShell>
      <style>{`
        .dash-title { font-size: 28px; }
        .dash-subtitle { font-size: 13px; }
        .dash-stats-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
        .dash-stat-label { font-size: 12px; }
        .dash-stat-value { font-size: 27px; }
        .dash-stat-sub { font-size: 11.5px; }
        .dash-card-title { font-size: 15px; }
        .dash-chart-h { height: 200px; }
        .dash-recent-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }

        @media (max-width: 768px) {
          .dash-title { font-size: 22px; }
          .dash-subtitle { font-size: 12px; }
          .dash-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .dash-stat-value { font-size: 22px; }
          .dash-chart-h { height: 170px; }
          .dash-recent-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
        }

        @media (max-width: 420px) {
          .dash-stats-grid { grid-template-columns: 1fr; }
          .dash-recent-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 24 }}
      >
        <h1 className="dash-title" style={{ fontWeight: 800, color: 'var(--ink)' }}>
          Bom dia, {displayName}
        </h1>
        <p className="dash-subtitle" style={{ color: 'var(--ink-3)', marginTop: 4 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </motion.div>

      {/* Stat cards */}
      <div className="dash-stats-grid" style={{ display: 'grid', marginBottom: 16 }}>
        {stats.map(({ label, value, sub, Icon, c }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <SweepCard radius={14} padding="16px 18px" accent={c} opacity={0.32} duration={5} delay={-i * 0.6}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span className="dash-stat-label" style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{label}</span>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: `${c}1A`, border: `1px solid ${c}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={15} color={c} strokeWidth={2} />
                </div>
              </div>
              <div className="dash-stat-value" style={{ fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>{value}</div>
              <div className="dash-stat-sub" style={{ color: c, fontWeight: 600 }}>{sub}</div>
            </SweepCard>
          </motion.div>
        ))}
      </div>

      {/* Gráfico de atividade */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        style={{ marginBottom: 14 }}
      >
        <SweepCard radius={14} padding={20} duration={7} delay={-2.5} opacity={0.4}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 10 }}>
            <h3 className="dash-card-title" style={{ fontWeight: 700, color: 'var(--ink)' }}>Atividade — últimos 7 dias</h3>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Quizzes por dia</span>
          </div>

          {hasActivity ? (
            <div className="dash-chart-h">
              <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                <AreaChart data={weekData}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6E28E0" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#6E28E0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6A6A88' }} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#0B0616', border: '1px solid rgba(110,40,224,0.3)', borderRadius: 10, fontSize: 12, color: 'var(--ink)' }}
                    formatter={(value) => [`${value} quiz${value === 1 ? '' : 'zes'}`, 'Feitos']}
                  />
                  <Area type="monotone" dataKey="q" stroke="#6E28E0" strokeWidth={2.5}
                    fill="url(#grad)" dot={{ fill: '#6E28E0', r: 3.5, strokeWidth: 0 }} activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="dash-chart-h" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--ink-3)' }}>
              <BookOpen size={26} color="var(--ink-3)" strokeWidth={1.6} />
              <span style={{ fontSize: 13, textAlign: 'center', padding: '0 12px' }}>
                {loadingQuizzes ? 'Carregando...' : 'Faça um quiz pra começar a preencher seu gráfico'}
              </span>
            </div>
          )}
        </SweepCard>
      </motion.div>

      {/* Quizzes recentes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <SweepCard radius={14} padding={20} duration={7} delay={-3.8} opacity={0.32}>
          <h3 className="dash-card-title" style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>
            Quizzes recentes
          </h3>

          {recentQuizzes.length > 0 ? (
            <div className="dash-recent-grid" style={{ display: 'grid' }}>
              {recentQuizzes.map((q, i) => {
                const color = DIFF_COLOR[q.difficulty] || ACCENT
                const pct = q.total_questions > 0 ? (q.correct_answers / q.total_questions) * 100 : 0
                return (
                  <SweepCard
                    key={q.id}
                    radius={14}
                    padding={14}
                    accent={color}
                    opacity={0.35}
                    duration={4.5}
                    delay={-i * 0.5}
                  >
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 500 }}>
                      {relativeDate(q.created_at)}
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 12, lineHeight: 1.4,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {q.topic}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color }}>
                        {q.correct_answers}/{q.total_questions}
                      </span>
                      <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 100, overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 100, boxShadow: `0 0 8px ${color}` }} />
                      </div>
                    </div>
                  </SweepCard>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              {loadingQuizzes ? 'Carregando...' : 'Você ainda não fez nenhum quiz. Bora começar?'}
            </div>
          )}
        </SweepCard>
      </motion.div>
    </AppShell>
  )
}