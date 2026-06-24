// app/progress/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Activity, Brain, Zap, Star, TrendingUp, Target, Award } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'
import SweepCard from '@/components/SweepCard'

const ACCENT = '#9333FF'
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

function formatHours(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

function buildWeekData(quizzes: QuizResult[]) {
  const counts: Record<string, { q: number; xp: number }> = {}
  for (const q of quizzes) {
    const key = localDateKey(new Date(q.created_at))
    if (!counts[key]) counts[key] = { q: 0, xp: 0 }
    counts[key].q += 1
    counts[key].xp += q.xp_earned || 0
  }
  const out: { d: string; q: number; xp: number }[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const entry = counts[localDateKey(date)] || { q: 0, xp: 0 }
    out.push({ d: WEEKDAYS[date.getDay()], q: entry.q, xp: entry.xp })
  }
  return out
}

function buildTopicStats(quizzes: QuizResult[], topN = 5) {
  const grouped: Record<string, { totalCorrect: number; totalQuestions: number; count: number }> = {}
  for (const q of quizzes) {
    if (!grouped[q.topic]) grouped[q.topic] = { totalCorrect: 0, totalQuestions: 0, count: 0 }
    grouped[q.topic].totalCorrect += q.correct_answers
    grouped[q.topic].totalQuestions += q.total_questions
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let active = true
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_results')
          .select('id, topic, difficulty, total_questions, correct_answers, xp_earned, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(500)
        if (!active) return
        if (error) throw error
        setQuizzes(data || [])
      } catch (e) {
        console.error('Erro ao carregar quizzes:', e)
        if (active) setQuizzes([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [user?.id])

  const xp = profile?.xp ?? 0
  const totalMinutes = profile?.total_minutes ?? 0
  const streakDays = profile?.streak_days ?? 0
  const totalQuizzes = quizzes.length

  const averageScore = useMemo(() => {
    if (quizzes.length === 0) return 0
    const totalCorrect = quizzes.reduce((s, q) => s + q.correct_answers, 0)
    const totalQuestions = quizzes.reduce((s, q) => s + q.total_questions, 0)
    return totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
  }, [quizzes])

  const perfectQuizzes = useMemo(
    () => quizzes.filter((q) => q.total_questions > 0 && q.correct_answers === q.total_questions).length,
    [quizzes]
  )

  const weekData = useMemo(() => buildWeekData(quizzes), [quizzes])
  const hasActivity = weekData.some((d) => d.q > 0)
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
    { label: 'Média de acertos', value: loading ? '—' : `${averageScore}%`, Icon: Target,     c: '#10B981'  },
    { label: 'Horas de foco',    value: formatHours(totalMinutes),          Icon: Activity,   c: '#F59E0B'  },
    { label: 'XP total',         value: xp.toLocaleString('pt-BR'),         Icon: TrendingUp, c: '#3B82F6'  },
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

      {/* header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="prog-title" style={{ fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.5px' }}>
          Meu progresso
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
          Acompanhe sua evolução ao longo do tempo.
        </p>
      </div>

      {/* stat cards */}
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

      {/* gráficos */}
      <div className="prog-charts-grid" style={{ display: 'grid', marginBottom: 16 }}>
        <SweepCard radius={14} padding={20} duration={6} delay={-1.5} opacity={0.4}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18, gap: 10 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>XP por dia</h3>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Últimos 7 dias</span>
          </div>
          {hasActivity ? (
            <div className="prog-chart-h">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekData}>
                  <defs>
                    <linearGradient id="gxp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4A4A65' }} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#150e24', border: '1px solid rgba(147,51,255,0.3)', borderRadius: 10, fontSize: 12, color: 'var(--ink)' }}
                    formatter={(v: number) => [`${v} XP`, 'Ganho']}
                  />
                  <Area type="monotone" dataKey="xp" stroke="#7C3AED" strokeWidth={2}
                    fill="url(#gxp)" dot={{ fill: '#7C3AED', r: 3, strokeWidth: 0 }} />
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData}>
                  <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4A4A65' }} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#150e24', border: '1px solid rgba(147,51,255,0.3)', borderRadius: 10, fontSize: 12, color: 'var(--ink)' }}
                    formatter={(v: number) => [`${v} quiz${v === 1 ? '' : 'zes'}`, 'Feitos']}
                  />
                  <Bar dataKey="q" fill="#7C3AED" radius={[6, 6, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart loading={loading} />
          )}
        </SweepCard>
      </div>

      {/* desempenho por tema */}
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

      {/* conquistas */}
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
                  accent="#FFD166"
                  opacity={0.5}
                  duration={4}
                  delay={-i * 0.4}
                  background="rgba(124,58,237,.1)"
                >
                  <div className="prog-conquista-padding" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(255, 209, 102, .15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={20} color="#FFD166" strokeWidth={1.8} />
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