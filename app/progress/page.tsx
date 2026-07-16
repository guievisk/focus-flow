'use client'

import { useState, useEffect, useMemo } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Activity, Brain, Zap, Star, TrendingUp, Target, Award } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import { useAuth } from '@/components/AuthContext'
import { getDataLayer } from '@/lib/data'
import type { DailyXp, QuizResult } from '@/lib/data/types'
import SweepCard from '@/components/SweepCard'

const ACCENT = '#7A00FF'
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatHours(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

function buildWeekData(dailyXp: DailyXp[], quizzes: QuizResult[]) {
  const quizCounts: Record<string, number> = {}
  for (const q of quizzes) {
    const key = localDateKey(new Date(q.createdAt))
    quizCounts[key] = (quizCounts[key] ?? 0) + 1
  }
  return dailyXp.map((day) => {
    const date = new Date(`${day.date}T00:00:00`)
    return { d: WEEKDAYS[date.getDay()], q: quizCounts[day.date] ?? 0, xp: day.xp }
  })
}

function buildTopicStats(quizzes: QuizResult[], topN = 5) {
  const grouped: Record<string, { totalCorrect: number; totalQuestions: number; count: number }> = {}
  for (const q of quizzes) {
    if (!grouped[q.topic]) grouped[q.topic] = { totalCorrect: 0, totalQuestions: 0, count: 0 }
    grouped[q.topic].totalCorrect += q.correctAnswers
    grouped[q.topic].totalQuestions += q.totalQuestions
    grouped[q.topic].count += 1
  }
  return Object.entries(grouped)
    .map(([topic, s]) => ({
      topic,
      quizzes: s.count,
      score: s.totalQuestions > 0 ? Math.round((s.totalCorrect / s.totalQuestions) * 100) : 0,
    }))
    .sort((a, b) => b.quizzes - a.quizzes)
    .slice(0, topN)
}

export default function Progress() {
  const { profile, user } = useAuth()
  const [quizzes, setQuizzes] = useState<QuizResult[]>([])
  const [dailyXp, setDailyXp] = useState<DailyXp[]>([])
  const [loading, setLoading] = useState(true)

  const userId = user?.id

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!userId) { setLoading(false); return }
    let active = true
    ;(async () => {
      const dl = getDataLayer()
      const [quizzesResult, dailyResult] = await Promise.allSettled([
        dl.quizzes.listRecent(userId, 365),
        dl.xp.getDailyXp(userId, 7),
      ])
      if (!active) return

      if (quizzesResult.status === 'fulfilled') setQuizzes(quizzesResult.value)
      else console.error('Erro ao carregar quizzes:', quizzesResult.reason)

      if (dailyResult.status === 'fulfilled') setDailyXp(dailyResult.value)
      else console.error('Erro ao carregar XP diário:', dailyResult.reason)

      setLoading(false)
    })()
    return () => { active = false }
  }, [userId])

  const xp = profile?.xp ?? 0
  const totalMinutes = profile?.total_minutes ?? 0
  const streakDays = profile?.streak_days ?? 0
  const totalQuizzes = quizzes.length

  const averageScore = useMemo(() => {
    if (quizzes.length === 0) return 0
    const totalCorrect = quizzes.reduce((s, q) => s + q.correctAnswers, 0)
    const totalQuestions = quizzes.reduce((s, q) => s + q.totalQuestions, 0)
    return totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
  }, [quizzes])

  const perfectQuizzes = useMemo(
    () => quizzes.filter((q) => q.totalQuestions > 0 && q.correctAnswers === q.totalQuestions).length,
    [quizzes]
  )

  const weekData = useMemo(() => buildWeekData(dailyXp, quizzes), [dailyXp, quizzes])
  const hasActivity = weekData.some((d) => d.q > 0 || d.xp > 0)
  const topicStats = useMemo(() => buildTopicStats(quizzes), [quizzes])

  const achievements = useMemo(() => [
    { Icon: Activity, title: 'Semana de Fogo',     desc: '7 dias consecutivos',  unlocked: streakDays >= 7 },
    { Icon: Brain,    title: 'Mestre dos Quizzes', desc: '50 quizzes feitos',    unlocked: totalQuizzes >= 50 },
    { Icon: Zap,      title: 'Turbo',              desc: '100% em um quiz',      unlocked: perfectQuizzes >= 1 },
    { Icon: Star,     title: 'Lenda',              desc: '1.000 XP acumulados',  unlocked: xp >= 1000 },
    { Icon: Target,   title: 'Franco Atirador',    desc: '10 quizzes perfeitos', unlocked: perfectQuizzes >= 10 },
    { Icon: Award,    title: 'Dedicado',           desc: '30 dias de estudo',    unlocked: streakDays >= 30 },
  ], [streakDays, totalQuizzes, perfectQuizzes, xp])

  const stats = [
    { label: 'Total de quizzes', value: loading ? '—' : `${totalQuizzes}`,  Icon: Brain,      c: ACCENT     },
    { label: 'Média de acertos', value: loading ? '—' : `${averageScore}%`, Icon: Target,     c: '#00C97B'  },
    { label: 'Horas de foco',    value: formatHours(totalMinutes),          Icon: Activity,   c: '#FFA800'  },
    { label: 'XP total',         value: xp.toLocaleString('pt-BR'),         Icon: TrendingUp, c: '#2E6BFF'  },
  ]

  return (
    <AppShell>
      <style>{`
        .prog-title { font-size: 26px; }
        .prog-stats-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
        .prog-stat-padding { padding: 22px 24px; }
        .prog-stat-value { font-size: 26px; }
        .prog-charts-grid { grid-template-columns: 1fr 1fr; gap: 16px; }
        .prog-chart-h { height: 180px; }
        .prog-card-padding { padding: 22px 24px; }
        .prog-conquistas-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .prog-conquista-padding { padding: 16px; }

        @media (max-width: 768px) {
          .prog-title { font-size: 22px; }
          .prog-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .prog-stat-padding { padding: 16px 18px; }
          .prog-stat-value { font-size: 22px; }
          .prog-charts-grid { grid-template-columns: 1fr; gap: 12px; }
          .prog-chart-h { height: 160px; }
          .prog-card-padding { padding: 18px 18px; }
          .prog-conquistas-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .prog-conquista-padding { padding: 14px; }
        }

        @media (max-width: 420px) {
          .prog-stats-grid { grid-template-columns: 1fr; }
          .prog-conquistas-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 className="prog-title" style={{ fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.5px' }}>
          Meu progresso
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
          Acompanhe sua evolução ao longo do tempo.
        </p>
      </div>

      <div className="prog-stats-grid" style={{ display: 'grid', marginBottom: 16 }}>
        {stats.map(({ label, value, Icon, c }, i) => (
          <SweepCard
            key={label}
            radius={14}
            padding={0}
            accent={c}
            opacity={0.32}
            duration={5}
            delay={-i * 0.6}
          >
            <div className="prog-stat-padding">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{label}</span>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${c}1A`, border: `1px solid ${c}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={15} color={c} strokeWidth={2} />
                </div>
              </div>
              <div className="prog-stat-value" style={{ fontWeight: 800, color: 'var(--ink)' }}>{value}</div>
            </div>
          </SweepCard>
        ))}
      </div>

      <div className="prog-charts-grid" style={{ display: 'grid', marginBottom: 16 }}>
        <SweepCard radius={14} padding={20} duration={6} delay={-1.5} opacity={0.4}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18, gap: 10 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>XP por dia</h3>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Últimos 7 dias</span>
          </div>
          {hasActivity ? (
            <div className="prog-chart-h">
              <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                <AreaChart data={weekData}>
                  <defs>
                    <linearGradient id="gxp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6216D8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6216D8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6A6A88' }} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#0B0616', border: '1px solid rgba(122,0,255,0.3)', borderRadius: 10, fontSize: 12, color: 'var(--ink)' }}
                    formatter={(v) => [`${v} XP`, 'Ganho']}
                  />
                  <Area type="monotone" dataKey="xp" stroke="#6216D8" strokeWidth={2}
                    fill="url(#gxp)" dot={{ fill: '#6216D8', r: 3, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart loading={loading} />
          )}
        </SweepCard>

        <SweepCard radius={14} padding={20} duration={6} delay={-2.8} opacity={0.4}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18, gap: 10 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Quizzes por dia</h3>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Últimos 7 dias</span>
          </div>
          {hasActivity ? (
            <div className="prog-chart-h">
              <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                <BarChart data={weekData}>
                  <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6A6A88' }} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#0B0616', border: '1px solid rgba(122,0,255,0.3)', borderRadius: 10, fontSize: 12, color: 'var(--ink)' }}
                    formatter={(v) => [`${v} quiz${v === 1 ? '' : 'zes'}`, 'Feitos']}
                  />
                  <Bar dataKey="q" fill="#6216D8" radius={[6, 6, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart loading={loading} />
          )}
        </SweepCard>
      </div>

      <SweepCard radius={14} padding={0} duration={7} delay={-3.5} opacity={0.35} style={{ marginBottom: 16 }}>
        <div className="prog-card-padding">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 18 }}>
            Desempenho por tema
          </h3>
          {topicStats.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topicStats.map((s) => (
                <div key={s.topic}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                      {s.topic}
                    </span>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        {s.quizzes} {s.quizzes === 1 ? 'quiz' : 'quizzes'}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>{s.score}%</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{
                      width: `${s.score}%`, height: '100%',
                      background: ACCENT, borderRadius: 100,
                      transition: 'width 1s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '14px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              {loading ? 'Carregando...' : 'Faça alguns quizzes pra ver suas estatísticas por tema.'}
            </div>
          )}
        </div>
      </SweepCard>

      <SweepCard radius={14} padding={0} duration={7} delay={-4.2} opacity={0.35}>
        <div className="prog-card-padding">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>
            Conquistas
          </h3>
          <div className="prog-conquistas-grid" style={{ display: 'grid' }}>
            {achievements.map(({ Icon, title, desc, unlocked }, i) => (
              unlocked ? (
                <SweepCard
                  key={title}
                  radius={12}
                  padding={0}
                  accent="#FFC93C"
                  opacity={0.5}
                  duration={4}
                  delay={-i * 0.4}
                  background="rgba(98,22,216,.1)"
                >
                  <div className="prog-conquista-padding" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(255, 209, 102, .15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={20} color="#FFC93C" strokeWidth={1.8} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>{desc}</div>
                    </div>
                  </div>
                </SweepCard>
              ) : (
                <div key={title} className="prog-conquista-padding" style={{
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  opacity: 0.4,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={20} color="var(--ink-3)" strokeWidth={1.8} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>{desc}</div>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </SweepCard>
    </AppShell>
  )
}

function EmptyChart({ loading }: { loading: boolean }) {
  return (
    <div className="prog-chart-h" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '0 12px', textAlign: 'center' }}>
      {loading ? 'Carregando...' : 'Sem dados ainda. Faça um quiz pra começar.'}
    </div>
  )
}