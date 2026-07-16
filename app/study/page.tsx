'use client'
import { useAuth } from '@/components/AuthContext'
import { getDataLayer } from '@/lib/data'
import { isRetryable } from '@/lib/data/errors'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AppShell from '@/components/layout/AppShell'
import FlowMascot, { FlowExpression, FlowAnimation } from '@/components/FlowMascot'
import { Leaf, Zap, Flame, Clock, Check, X, Sparkles, ArrowRight, AlertTriangle, Target } from 'lucide-react'

type Question = { q: string; opts: string[]; correct: number; exp: string }
type Quiz = { questions: Question[] }
type Phase = 'setup' | 'loading' | 'playing' | 'results'
type SaveState = 'idle' | 'saving' | 'saved' | 'retry' | 'failed'
type LevelKey = 'facil' | 'medio' | 'dificil'

const LEVELS: Record<LevelKey, {
  key: LevelKey; label: string; time: number; desc: string
  accent: string; glow: string; Icon: typeof Leaf
}> = {
  facil:   { key: 'facil',   label: 'Fácil',   time: 20, desc: 'Sem pressa',       accent: '#00C97B', glow: 'rgba(16,185,129,0.35)', Icon: Leaf },
  medio:   { key: 'medio',   label: 'Médio',   time: 15, desc: 'Equilibrado',      accent: '#7A00FF', glow: 'rgba(122,0,255,0.35)', Icon: Zap },
  dificil: { key: 'dificil', label: 'Difícil', time: 10, desc: 'Contra o relógio', accent: '#FF8A2B', glow: 'rgba(251,146,60,0.35)', Icon: Flame },
}

const SUGGESTIONS = [
  'Alexandre, o Grande',
  'Fotossíntese',
  'Frações decimais',
  'Revolução Francesa',
  'Tabela periódica',
]

export default function Study() {
  const { user, refreshProfile } = useAuth()
  const [questionCount, setQuestionCount] = useState(5)
  const [phase, setPhase] = useState<Phase>('setup')
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState<LevelKey | null>(null)
  const [error, setError] = useState('')

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number | null>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [locked, setLocked] = useState(false)

  const currentQRef = useRef(0)
  const totalRef = useRef(0)
  const timeRef = useRef(0)

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const idempotencyKeyRef = useRef<string | null>(null)
  const quizIdRef = useRef<string | null>(null)

  const saveQuizResult = async () => {
    if (!quiz || !user) return
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID()

    setSaveState('saving')
    try {
      const correct = Object.values(answers).filter((a, i) => a === quiz.questions[i]?.correct).length
      const xpPerQ = level === 'facil' ? 8 : level === 'medio' ? 12 : 18
      const xpEarned = correct * xpPerQ + (correct === quiz.questions.length ? 20 : 0)

      const dl = getDataLayer()

      if (!quizIdRef.current) {
        const { quizId } = await dl.quizzes.saveResult({
          topic,
          difficulty: level ?? 'facil',
          totalQuestions: quiz.questions.length,
          correctAnswers: correct,
          xpEarned,
        })
        quizIdRef.current = quizId
      }

      if (xpEarned > 0) {
        await dl.xp.awardXp({
          amount: xpEarned,
          source: 'quiz',
          sourceId: quizIdRef.current,
          idempotencyKey: idempotencyKeyRef.current,
        })
      }

      await refreshProfile()
      setSaveState('saved')
    } catch (e) {
      console.error('Erro ao salvar resultado:', e)
      setSaveState(isRetryable(e) ? 'retry' : 'failed')
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dispara o save assíncrono uma vez ao entrar em resultados
    if (phase === 'results') saveQuizResult()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const advance = useCallback(() => {
    const next = currentQRef.current + 1
    if (next < totalRef.current) {
      currentQRef.current = next
      setCurrentQ(next)
      setTimeLeft(timeRef.current)
      setLocked(false)
    } else {
      setPhase('results')
    }
  }, [])

  useEffect(() => {
    if (phase !== 'playing' || locked) return
    if (timeLeft <= 0) {
      setAnswers((prev) => ({ ...prev, [currentQRef.current]: null }))
      setLocked(true)
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, locked, timeLeft])

  useEffect(() => {
    if (phase !== 'playing' || !locked) return
    const t = setTimeout(advance, 1600)
    return () => clearTimeout(t)
  }, [phase, locked, advance])

  const generate = useCallback(async () => {
    if (!topic.trim() || !level) return
    setPhase('loading')
    setError('')

    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, level, count: questionCount }),
      })
      if (!res.ok) throw new Error('Erro na API')
      const data = await res.json()
      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('Quiz vazio')
      }

      const t = LEVELS[level].time
      totalRef.current = data.questions.length
      timeRef.current = t
      currentQRef.current = 0

      setQuiz(data)
      setCurrentQ(0)
      setAnswers({})
      setTimeLeft(t)
      setLocked(false)
      setPhase('playing')
    } catch (err) {
      console.error('Erro ao gerar quiz:', err)
      setError('Não consegui gerar o quiz agora. Tenta de novo.')
      setPhase('setup')
    }
  }, [topic, level, questionCount])

  function handleAnswer(optIndex: number) {
    if (locked) return
    setAnswers((prev) => ({ ...prev, [currentQRef.current]: optIndex }))
    setLocked(true)
  }

  return (
    <AppShell>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes sweep {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(360deg); }
        }

        .study-wrap { max-width: 760px; margin: 0 auto; }
        .study-title { font-size: 30px; }
        .study-subtitle { font-size: 14px; }
        .study-input { font-size: 15px; padding: 12px 4px; }
        .study-section-label { font-size: 13px; letter-spacing: 0.05em; }
        .study-level-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 26px; }
        .study-level-card { flex: 1 1 180px; min-width: 160px; }
        .study-level-inner { padding: 26px 22px; min-height: 185px; }
        .study-level-title { font-size: 20px; }
        .study-count-row { display: flex; gap: 10px; }
        .study-count-btn { font-size: 16px; padding: 12px 0; }
        .study-generate-btn { font-size: 15px; padding: 15px; }
        .study-question { font-size: 22px; }
        .study-options-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .study-option-inner { padding: 20px 18px; min-height: 80px; }
        .study-option-text { font-size: 15px; }
        .study-result-msg { font-size: 18px; }
        .study-result-score { font-size: 36px; }

        @media (max-width: 768px) {
          .study-title { font-size: 24px; }
          .study-subtitle { font-size: 13px; }
          .study-level-row { gap: 10px; }
          .study-level-card { flex: 1 1 100%; min-width: 0; }
          .study-level-inner { padding: 18px 18px; min-height: auto; }
          .study-level-title { font-size: 18px; }
          .study-count-btn { font-size: 15px; padding: 11px 0; }
          .study-question { font-size: 19px; }
          .study-options-grid { gap: 10px; }
          .study-option-inner { padding: 14px 14px; min-height: 64px; }
          .study-option-text { font-size: 14px; }
          .study-result-msg { font-size: 16px; }
          .study-result-score { font-size: 30px; }
        }

        @media (max-width: 420px) {
          .study-options-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="study-wrap">
        <AnimatePresence mode="wait">

          {}
          {phase === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                style={{ marginBottom: 24 }}
              >
                <h1 className="study-title" style={{ fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.6px', fontFamily: "'Product Sans', sans-serif" }}>
                  Estudar agora
                </h1>
                <p className="study-subtitle" style={{ color: 'var(--ink-3)', marginTop: 6 }}>
                  Escolha um nível, digite um tema e teste seus conhecimentos contra o relógio.
                </p>
              </motion.div>

              {}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                style={{ position: 'relative', marginBottom: 22 }}
              >
                <div style={{
                  position: 'absolute', inset: -1, borderRadius: 16,
                  background: 'radial-gradient(120% 120% at 50% 0%, rgba(122,0,255,0.25), transparent 70%)',
                  filter: 'blur(12px)', pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'relative',
                  display: 'flex', gap: 10, alignItems: 'center',
                  background: 'var(--surface)', borderRadius: 14,
                  border: '1.5px solid rgba(122,0,255,0.35)', padding: 8,
                }}>
                  <Sparkles size={18} color="#7A00FF" style={{ marginLeft: 8, flexShrink: 0 }} />
                  <input
                    value={topic}
                    onChange={(e) => { setTopic(e.target.value); setError('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && level) generate() }}
                    placeholder="Sobre o que você quer ser testado?"
                    className="study-input"
                    style={{
                      flex: 1, border: 'none',
                      background: 'transparent', color: 'var(--ink)',
                      fontFamily: "'Product Sans', sans-serif",
                      outline: 'none', minWidth: 0,
                    }}
                  />
                </div>

                {}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setTopic(s); setError('') }}
                      style={{
                        padding: '6px 12px', borderRadius: 100,
                        border: '1px solid var(--border)',
                        background: topic === s ? 'var(--p-light)' : 'transparent',
                        color: topic === s ? '#8F5CF7' : 'var(--ink-3)',
                        fontSize: 12.5, cursor: 'pointer',
                        fontFamily: "'Product Sans', sans-serif",
                        transition: 'all .15s',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>

              {}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="study-section-label" style={{ fontWeight: 700, color: 'var(--ink-2)', marginBottom: 12, textTransform: 'uppercase' }}>
                  Escolha a dificuldade
                </div>
                <div className="study-level-row">
                  {(Object.keys(LEVELS) as LevelKey[]).map((k) => (
                    <LevelCard
                      key={k}
                      level={LEVELS[k]}
                      selected={level === k}
                      onSelect={() => setLevel(k)}
                    />
                  ))}
                </div>
              </motion.div>

              {error && (
                <div style={{ color: '#FF4D8D', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <AlertTriangle size={14} strokeWidth={2.2} /> {error}
                </div>
              )}

              {}
              <div style={{ marginTop: 22, marginBottom: 22 }}>
                <div className="study-section-label" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 12 }}>
                  Quantidade de perguntas
                </div>
                <div className="study-count-row">
                  {[5, 10, 15, 20].map(n => (
                    <button
                      key={n}
                      onClick={() => setQuestionCount(n)}
                      className="study-count-btn"
                      style={{
                        flex: 1, borderRadius: 12,
                        border: questionCount === n ? '1.5px solid var(--p)' : '1.5px solid rgba(255,255,255,0.08)',
                        background: questionCount === n ? 'rgba(122,0,255,0.15)' : 'transparent',
                        color: questionCount === n ? 'var(--p)' : 'var(--ink-2)',
                        fontWeight: 700, cursor: 'pointer',
                        transition: 'all .2s',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                whileTap={{ scale: 0.98 }}
                onClick={generate}
                disabled={!topic.trim() || !level}
                className="study-generate-btn"
                style={{
                  width: '100%', borderRadius: 14, border: 'none',
                  background: !topic.trim() || !level
                    ? 'var(--surface-2)'
                    : 'linear-gradient(135deg, #7A00FF, #5A00C4)',
                  color: !topic.trim() || !level ? 'var(--ink-3)' : '#fff',
                  fontFamily: "'Product Sans', sans-serif",
                  fontWeight: 700,
                  cursor: !topic.trim() || !level ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: !topic.trim() || !level ? 'none' : '0 10px 13px rgba(122,0,255,0.18)',
                  transition: 'background .2s, box-shadow .2s',
                }}
              >
                Gerar quiz <ArrowRight size={17} />
              </motion.button>
            </motion.div>
          )}

          {}
          {phase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', padding: '60px 20px' }}
            >
              <div style={{ marginBottom: 22 }}>
                <FlowMascot expression="thinking" size={120} animation="breathe" />
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
                Preparando seu quiz
              </h3>
              <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>
                Gerando perguntas sobre <strong style={{ color: '#8F5CF7' }}>{topic}</strong>
              </p>
            </motion.div>
          )}

          {}
          {phase === 'playing' && quiz && level && (
            <PlayingView
              quiz={quiz}
              level={LEVELS[level]}
              currentQ={currentQ}
              answers={answers}
              timeLeft={timeLeft}
              locked={locked}
              onAnswer={handleAnswer}
            />
          )}

          {}
          {phase === 'results' && quiz && (() => {
            const correct = Object.values(answers).filter((a, i) => a === quiz.questions[i]?.correct).length
            const total = quiz.questions.length
            const xpPerQ = level === 'facil' ? 8 : level === 'medio' ? 12 : 18
            const xpEarned = correct * xpPerQ + (correct === total ? 20 : 0)
            const pctCorrect = Math.round((correct / total) * 100)

            let flowExpression: FlowExpression = 'thinking'
            let flowAnimation: FlowAnimation = 'breathe'
            let message = ''
            if (pctCorrect === 100) {
              flowExpression = 'kissing'; flowAnimation = 'bob'
              message = 'Perfeito! Você dominou esse tema.'
            } else if (pctCorrect >= 80) {
              flowExpression = 'happy'; flowAnimation = 'bob'
              message = 'Mandou muito bem! Tá afiado.'
            } else if (pctCorrect >= 60) {
              flowExpression = 'happy'
              message = 'Bom resultado! Continue assim.'
            } else if (pctCorrect >= 40) {
              flowExpression = 'content'
              message = 'Tá no caminho. Mais um pouco de prática.'
            } else if (pctCorrect >= 20) {
              flowExpression = 'thinking'
              message = 'Tema difícil! Bora estudar mais um pouco.'
            } else {
              flowExpression = 'thinking'
              message = 'Foi difícil dessa vez. Boa sorte na próxima!'
            }

            return (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', padding: '20px 0' }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 140, damping: 14 }}
                  style={{ marginBottom: 16 }}
                >
                  <FlowMascot expression={flowExpression} size={140} animation={flowAnimation} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="study-result-msg"
                  style={{
                    fontWeight: 700, color: 'var(--ink)',
                    marginBottom: 18, maxWidth: 420, margin: '0 auto 18px',
                    lineHeight: 1.4, padding: '0 12px',
                  }}
                >
                  {message}
                </motion.div>

                <div className="study-result-score" style={{ fontWeight: 900, color: 'var(--ink)', marginBottom: 4 }}>
                  {correct}/{total}
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 22 }}>
                  {pctCorrect}% de acerto — {level ? LEVELS[level].label : ''}
                </div>

                <div style={{
                  display: 'inline-block', padding: '14px 28px', borderRadius: 16,
                  background: 'rgba(122,0,255,0.12)', border: '1px solid rgba(122,0,255,0.25)',
                  marginBottom: 12,
                }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: '#8F5CF7' }}>+{xpEarned} XP</span>
                  {correct === total && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#22E39C', marginTop: 4 }}>
                      <Target size={14} strokeWidth={2.2} /> Nota máxima! +20 XP bônus
                    </span>
                  )}
                </div>

                {}
                <div style={{ marginBottom: 26, minHeight: 22 }}>
                  {saveState === 'saving' && (
                    <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Salvando seu XP…</span>
                  )}
                  {saveState === 'saved' && (
                    <span style={{ fontSize: 13, color: '#22E39C', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Check size={14} strokeWidth={2.6} /> XP salvo na sua conta
                    </span>
                  )}
                  {saveState === 'retry' && (
                    <div style={{
                      display: 'inline-flex', flexDirection: 'column', gap: 10, alignItems: 'center',
                      padding: '14px 20px', borderRadius: 14,
                      background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)',
                    }}>
                      <span style={{ fontSize: 13.5, color: '#FF8A2B', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={14} strokeWidth={2.2} /> Falha de conexão — seu XP ainda não foi salvo.
                      </span>
                      <button
                        onClick={saveQuizResult}
                        style={{
                          padding: '9px 22px', borderRadius: 10, border: 'none',
                          background: '#FF8A2B', color: '#0F0819',
                          fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        Tentar de novo
                      </button>
                    </div>
                  )}
                  {saveState === 'failed' && (
                    <span style={{ fontSize: 13, color: '#FF5C5C' }}>
                      ✕ Não foi possível salvar o resultado. Tente novamente mais tarde.
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      setPhase('setup'); setQuiz(null); setAnswers({})
                      setSaveState('idle')
                      idempotencyKeyRef.current = null
                      quizIdRef.current = null
                    }}
                    style={{
                      padding: '13px 28px', borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'transparent', color: 'var(--ink)',
                      fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Novo quiz
                  </button>
                </div>
              </motion.div>
            )
          })()}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}

function LevelCard({
  level, selected, onSelect,
}: {
  level: typeof LEVELS[LevelKey]
  selected: boolean
  onSelect: () => void
}) {
  const { label, time, desc, accent, glow, Icon } = level
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="study-level-card"
      style={{
        position: 'relative', borderRadius: 18, padding: 2, cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: selected ? `0 14px 40px ${glow}` : 'none',
        transition: 'box-shadow .3s',
      }}
    >
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: '280%', height: '280%',
        background: `conic-gradient(from 0deg, transparent 0deg 220deg, ${accent} 270deg, #ffffff 308deg, ${accent} 340deg, transparent 360deg)`,
        animation: 'sweep 3s linear infinite',
        opacity: selected ? 1 : 0.4,
        transition: 'opacity .3s',
        pointerEvents: 'none',
      }} />
      <div className="study-level-inner" style={{
        position: 'relative', borderRadius: 16,
        background: '#0B0616',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: `${accent}22`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={22} strokeWidth={2.2} />
        </div>
        <div className="study-level-title" style={{
          fontWeight: 800, color: 'var(--ink)',
          fontFamily: "'Product Sans', sans-serif",
        }}>
          {label}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{desc}</div>
        <div style={{
          marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12.5, fontWeight: 700, color: accent,
          background: `${accent}1a`, padding: '6px 12px', borderRadius: 100,
        }}>
          <Clock size={13} /> {time}s
        </div>
      </div>
    </motion.div>
  )
}

function PlayingView({
  quiz, level, currentQ, answers, timeLeft, locked, onAnswer,
}: {
  quiz: Quiz
  level: typeof LEVELS[LevelKey]
  currentQ: number
  answers: Record<number, number | null>
  timeLeft: number
  locked: boolean
  onAnswer: (i: number) => void
}) {
  const q = quiz.questions[currentQ]
  const total = quiz.questions.length
  const picked = answers[currentQ]
  const pct = Math.max(0, (timeLeft / level.time) * 100)
  const urgent = timeLeft <= 3 && !locked

  return (
    <motion.div
      key="playing"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
          Pergunta {currentQ + 1} de {total}
        </span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 15, fontWeight: 800,
          color: urgent ? '#FF3B3B' : level.accent,
        }}>
          <Clock size={16} /> {timeLeft}s
        </div>
      </div>

      <div style={{ height: 8, borderRadius: 100, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: urgent ? '#FF3B3B' : level.accent,
          borderRadius: 100,
          transition: 'width 1s linear, background .3s',
        }} />
      </div>

      <motion.h2
        key={currentQ}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="study-question"
        style={{
          fontWeight: 800, color: '#fff',
          lineHeight: 1.4, marginBottom: 22,
          fontFamily: "'Product Sans', sans-serif",
        }}
      >
        {q.q}
      </motion.h2>

      <div className="study-options-grid" style={{ display: 'grid' }}>
        {q.opts.map((opt, oi) => {
          const isCorrect = locked && oi === q.correct
          const isWrong = locked && picked === oi && oi !== q.correct
          const isSelected = !locked && picked === oi
          const timedOut = locked && picked === null && oi === q.correct

          let sweepColor = '#7A00FF'
          let sweepOpacity = 0.35

          if (isSelected) { sweepColor = '#8F5CF7'; sweepOpacity = 0.45 }
          if (isCorrect || timedOut) { sweepColor = '#00C97B'; sweepOpacity = 0.35 }
          if (isWrong) { sweepColor = '#FF3B3B'; sweepOpacity = 0.35 }

          let textColor = '#EDE7F7'
          if (isCorrect || timedOut) textColor = '#22E39C'
          if (isWrong) textColor = '#FF5C5C'
          if (isSelected) textColor = '#fff'

          return (
            <motion.div
              key={oi}
              whileHover={locked ? {} : { scale: 1.02 }}
              whileTap={locked ? {} : { scale: 0.97 }}
              onClick={() => !locked && onAnswer(oi)}
              style={{
                position: 'relative', borderRadius: 16, padding: 2,
                overflow: 'hidden',
                cursor: locked ? 'default' : 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: '280%', height: '280%',
                background: `conic-gradient(from 0deg, transparent 0deg 220deg, ${sweepColor} 270deg, #ffffff 308deg, ${sweepColor} 340deg, transparent 360deg)`,
                animation: 'sweep 3s linear infinite',
                opacity: sweepOpacity,
                transition: 'opacity .3s',
                pointerEvents: 'none',
              }} />
              <div className="study-option-inner" style={{
                position: 'relative', borderRadius: 14,
                background: '#0B0616',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                {isCorrect && <Check size={18} strokeWidth={3} color="#22E39C" style={{ flexShrink: 0 }} />}
                {isWrong && <X size={18} strokeWidth={3} color="#FF5C5C" style={{ flexShrink: 0 }} />}
                {timedOut && <Check size={18} strokeWidth={3} color="#22E39C" style={{ flexShrink: 0 }} />}
                <span className="study-option-text" style={{
                  fontWeight: 600, color: textColor,
                  fontFamily: "'Product Sans', sans-serif",
                  transition: 'color .2s',
                }}>
                  {opt}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {locked && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 16, fontWeight: 700,
              color: picked === q.correct ? '#22E39C' : picked == null ? '#FF8A2B' : '#FF5C5C',
            }}
          >
            {picked === q.correct ? (
              <><Check size={18} strokeWidth={2.6} /> Acertou!</>
            ) : picked == null ? (
              <><Clock size={18} strokeWidth={2.4} /> Tempo esgotou!</>
            ) : (
              <><X size={18} strokeWidth={2.6} /> Não foi dessa vez</>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}