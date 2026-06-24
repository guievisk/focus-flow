// app/study-session/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Brain, Target, Zap } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import { useAuth } from '@/components/AuthContext'
import { addStudyMinutes } from '@/lib/streak'
import FlowMascot from '@/components/FlowMascot'

type Step =
  | 'topic' | 'loading-diagnosis' | 'diagnosing' | 'level-revealed'
  | 'loading-plan' | 'plan-revealed' | 'loading-lesson'
  | 'lesson-content' | 'lesson-feedback' | 'lesson-done'

type Level = 'iniciante' | 'intermediario' | 'avancado'

type DiagnosticQuestion = {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

type LessonStep = {
  title: string
  description: string
  estimatedMinutes: number
}

type Exercise = {
  type: 'multiple-choice' | 'free-text'
  question: string
  options?: string[]
  correctIndex?: number
  expectedAnswer?: string
  hint: string
}

type StepContent = {
  explanation: string
  examples: string[]
  exercise: Exercise
}

const LEVEL_DATA: Record<Level, { desc: string; emoji: string; color: string }> = {
  iniciante:     { desc: 'Vamos começar do básico, no seu ritmo. Sem pressa.',     emoji: '🌱', color: '#9333FF' },
  intermediario: { desc: 'Você já tem uma boa base. Vamos refinar os detalhes.',    emoji: '⚡', color: '#9333FF' },
  avancado:      { desc: 'Você manda bem! Vamos focar nos pontos mais sofisticados.', emoji: '🚀', color: '#9333FF' },
}

export default function StudySessionPage() {
  const [step, setStep] = useState<Step>('topic')
  const [topic, setTopic] = useState('')
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [level, setLevel] = useState<Level | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [lessonSteps, setLessonSteps] = useState<LessonStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [stepContent, setStepContent] = useState<StepContent | null>(null)
  const [attemptNumber, setAttemptNumber] = useState(0)
  const [studentAnswer, setStudentAnswer] = useState<string | number | null>(null)
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null)
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [earnedXp, setEarnedXp] = useState(0)
  const [earnedMinutes, setEarnedMinutes] = useState(0)
  const [levelLabels, setLevelLabels] = useState({
    beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado',
  })

  const { user, refreshProfile, updateStatus } = useAuth()

  useEffect(() => {
    if (!user) return
    const ativo = step === 'lesson-content' || step === 'lesson-feedback'
    updateStatus(ativo ? 'studying' : 'idle', ativo ? topic : undefined)
  }, [step, topic, user, updateStatus])

  async function handleStart() {
    if (!topic.trim()) return
    setErrorMsg('')
    setStep('loading-diagnosis')
    try {
      const res = await fetch('/api/level-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      if (!res.ok) throw new Error('Falha ao gerar diagnóstico')
      const data = await res.json()
      if (!data.questions || data.questions.length === 0) throw new Error('IA não retornou perguntas')
      setQuestions(data.questions)
      setCurrentQ(0)
      setAnswers([])
      if (data.levelLabels) setLevelLabels(data.levelLabels)
      setStep('diagnosing')
    } catch (err) {
      console.error(err)
      setErrorMsg('Não consegui montar o diagnóstico. Tente outro tema.')
      setStep('topic')
    }
  }

  function handleAnswer(optionIndex: number) {
    setSelectedOption(optionIndex)
    setTimeout(() => {
      const newAnswers = [...answers, optionIndex]
      setAnswers(newAnswers)
      setSelectedOption(null)
      if (currentQ + 1 < questions.length) {
        setCurrentQ(currentQ + 1)
      } else {
        const correct = newAnswers.filter((ans, i) => ans === questions[i].correctIndex).length
        let detected: Level = 'iniciante'
        if (correct >= 4) detected = 'avancado'
        else if (correct >= 2) detected = 'intermediario'
        setLevel(detected)
        setStep('level-revealed')
      }
    }, 300)
  }

  async function handleGeneratePlan() {
    if (!level) return
    setStep('loading-plan')
    try {
      const res = await fetch('/api/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), level }),
      })
      if (!res.ok) throw new Error('Falha ao gerar plano')
      const data = await res.json()
      if (!data.steps || data.steps.length === 0) throw new Error('IA não retornou passos')
      setLessonSteps(data.steps)
      setStep('plan-revealed')
    } catch (err) {
      console.error(err)
      setErrorMsg('Não consegui montar o plano. Tente recomeçar.')
      setStep('level-revealed')
    }
  }

  async function startLesson() {
    setCurrentStepIndex(0)
    setAttemptNumber(0)
    setStudentAnswer(null)
    setFeedback(null)
    await loadStepContent(0, 0)
  }

  async function loadStepContent(stepIndex: number, attempt: number) {
    if (!level || !lessonSteps[stepIndex]) return
    setStep('loading-lesson')
    setStepContent(null)
    try {
      const res = await fetch('/api/lesson-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(), level,
          stepTitle: lessonSteps[stepIndex].title,
          stepDescription: lessonSteps[stepIndex].description,
          attemptNumber: attempt,
        }),
      })
      if (!res.ok) throw new Error('Falha ao carregar passo')
      const data = await res.json()
      if (!data.content) throw new Error('Conteúdo inválido')
      setStepContent(data.content)
      setStudentAnswer(null)
      setFeedback(null)
      setStep('lesson-content')
    } catch (err) {
      console.error(err)
      setErrorMsg('Erro ao carregar a aula. Tente recomeçar.')
      setStep('plan-revealed')
    }
  }

  async function submitAnswer() {
    if (!stepContent || studentAnswer === null) return
    setLoadingFeedback(true)
    try {
      const res = await fetch('/api/check-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          stepTitle: lessonSteps[currentStepIndex].title,
          exercise: stepContent.exercise,
          studentAnswer,
        }),
      })
      if (!res.ok) throw new Error('Falha ao avaliar')
      const data = await res.json()
      setFeedback({ correct: data.result.correct, message: data.result.feedback })
      setStep('lesson-feedback')
    } catch (err) {
      console.error(err)
      setFeedback({ correct: false, message: 'Erro ao avaliar a resposta. Tente novamente.' })
      setStep('lesson-feedback')
    }
    setLoadingFeedback(false)
  }

  async function handleNextAction() {
    if (!feedback) return
    if (feedback.correct) {
      const nextIndex = currentStepIndex + 1
      if (nextIndex >= lessonSteps.length) {
        const totalMinutes = lessonSteps.reduce((acc, s) => acc + (s.estimatedMinutes || 0), 0)
        const xpGained = lessonSteps.length * 10
        setEarnedXp(xpGained)
        setEarnedMinutes(totalMinutes)
        if (user) {
          addStudyMinutes(user.id, totalMinutes, xpGained)
            .then(() => refreshProfile())
            .catch((e) => console.error('Erro ao salvar progresso:', e))
        }
        setStep('lesson-done')
      } else {
        setCurrentStepIndex(nextIndex)
        setAttemptNumber(0)
        await loadStepContent(nextIndex, 0)
      }
    } else {
      const nextAttempt = attemptNumber + 1
      setAttemptNumber(nextAttempt)
      await loadStepContent(currentStepIndex, nextAttempt)
    }
  }

  async function handleDidntUnderstand() {
    const nextAttempt = attemptNumber + 1
    setAttemptNumber(nextAttempt)
    await loadStepContent(currentStepIndex, nextAttempt)
  }

  function handleReset() {
    setStep('topic')
    setTopic('')
    setQuestions([])
    setCurrentQ(0)
    setAnswers([])
    setLevel(null)
    setErrorMsg('')
    setSelectedOption(null)
    setLessonSteps([])
    setLevelLabels({ beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado' })
  }

  return (
    <AppShell>
      <style>{`
        .ses-wrap { max-width: 760px; margin: 0 auto; padding: 36px 20px; min-height: 100vh; }
        .ses-h1-hero { font-size: 44px; line-height: 1.1; }
        .ses-hero-desc { font-size: 17px; }
        .ses-input { font-size: 16px; padding: 18px 20px; }
        .ses-generate-btn { font-size: 17px; padding: 20px; }
        .ses-h2-question { font-size: 26px; }
        .ses-option-pad { padding: 18px 22px; font-size: 15px; }
        .ses-h1-level { font-size: 52px; }
        .ses-level-desc { font-size: 17px; }
        .ses-loading-pad { padding: 90px 20px; }
        .ses-h2-loading { font-size: 24px; }
        .ses-h1-plan { font-size: 36px; }
        .ses-plan-step-pad { padding: 20px; gap: 16px; }
        .ses-card-pad { padding: 22px; }
        .ses-explain-text { font-size: 15.5px; line-height: 1.7; }
        .ses-exercise-h3 { font-size: 19px; }
        .ses-feedback-pad { padding: 50px 20px; }
        .ses-h1-feedback { font-size: 30px; }
        .ses-feedback-msg { font-size: 15px; }
        .ses-done-pad { padding: 50px 20px; }
        .ses-h1-done { font-size: 42px; }
        .ses-done-desc { font-size: 16px; }
        .ses-done-xp-pad { padding: 16px 28px; gap: 14px; }
        .ses-done-xp-num { font-size: 20px; }

        @media (max-width: 768px) {
          .ses-wrap { padding: 16px 0; }
          .ses-h1-hero { font-size: 30px; }
          .ses-hero-desc { font-size: 15px; }
          .ses-input { font-size: 15px; padding: 14px 16px; }
          .ses-generate-btn { font-size: 15px; padding: 16px; }
          .ses-h2-question { font-size: 20px; }
          .ses-option-pad { padding: 14px 16px; font-size: 14px; }
          .ses-h1-level { font-size: 36px; }
          .ses-level-desc { font-size: 15px; }
          .ses-loading-pad { padding: 50px 16px; }
          .ses-h2-loading { font-size: 20px; }
          .ses-h1-plan { font-size: 24px; }
          .ses-plan-step-pad { padding: 16px; gap: 12px; }
          .ses-card-pad { padding: 16px; }
          .ses-explain-text { font-size: 14.5px; }
          .ses-exercise-h3 { font-size: 17px; }
          .ses-feedback-pad { padding: 30px 16px; }
          .ses-h1-feedback { font-size: 24px; }
          .ses-feedback-msg { font-size: 14px; }
          .ses-done-pad { padding: 30px 16px; }
          .ses-h1-done { font-size: 30px; }
          .ses-done-desc { font-size: 15px; }
          .ses-done-xp-pad { padding: 12px 18px; gap: 10px; flex-wrap: wrap; justify-content: center; }
          .ses-done-xp-num { font-size: 17px; }
        }
      `}</style>

      <div className="ses-wrap">
        <AnimatePresence mode="wait">

        {/* ============ MODO 1: DIGITAR TEMA ============ */}
        {step === 'topic' && (
          <motion.div key="topic" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 100,
                background: 'var(--p-soft)', border: '1px solid var(--p-line)',
                marginBottom: 20,
              }}
            >
              <Sparkles size={14} color="var(--p3)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--p3)' }}>Sessão guiada por IA</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="ses-h1-hero"
              style={{ fontWeight: 800, color: 'var(--ink)', marginBottom: 12, letterSpacing: '-0.03em' }}
            >
              O que vamos<br />
              <span style={{
                background: 'linear-gradient(135deg, #B57BFF, #9333FF)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                estudar hoje?
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="ses-hero-desc"
              style={{ color: 'var(--ink-2)', marginBottom: 28, lineHeight: 1.5 }}
            >
              Digite qualquer tema. A IA descobre seu nível com 4 perguntas e monta uma aula sob medida.
            </motion.p>

            {errorMsg && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#ff6b9d', fontSize: 13, marginBottom: 16 }}>
                ⚠ {errorMsg}
              </motion.p>
            )}

            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleStart() }}
              placeholder="Ex: tabela de multiplicação, fotossíntese, verbos em inglês..."
              className="ses-input"
              style={{
                width: '100%', borderRadius: 14,
                border: '1px solid var(--p-line)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--ink)',
                fontFamily: "'Product Sans', sans-serif",
                outline: 'none', marginBottom: 14,
                boxSizing: 'border-box',
              }}
            />

            <motion.button
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              whileHover={{ scale: topic.trim() ? 1.02 : 1 }} whileTap={{ scale: 0.98 }}
              onClick={handleStart}
              disabled={!topic.trim()}
              className="ses-generate-btn"
              style={{
                width: '100%', borderRadius: 14, border: 'none',
                background: !topic.trim() ? 'rgba(147,51,255,0.2)' : 'linear-gradient(135deg, #9333FF, #7C00FF)',
                color: '#fff', fontWeight: 700,
                cursor: !topic.trim() ? 'not-allowed' : 'pointer',
                fontFamily: "'Product Sans', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: !topic.trim() ? 'none' : '0 12px 32px rgba(147,51,255,0.35)',
                transition: 'all 0.2s',
              }}
            >
              Começar diagnóstico
              <ArrowRight size={18} />
            </motion.button>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              style={{
                marginTop: 30, padding: 18, borderRadius: 14,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--p-soft)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Brain size={16} color="var(--p3)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                  Como funciona
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                  4 perguntas rápidas pra descobrir onde você está. Depois, a IA monta um plano de aula adaptado ao seu nível.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ============ MODO 2: CARREGANDO DIAGNÓSTICO ============ */}
        {step === 'loading-diagnosis' && (
          <motion.div key="loading-diag" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ses-loading-pad" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 22 }}>
              <FlowMascot expression="thinking" size={130} animation="breathe" />
            </div>
            <h2 className="ses-h2-loading" style={{ fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
              Preparando seu diagnóstico
            </h2>
            <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>
              A IA está montando as perguntas perfeitas pra você.
            </p>
          </motion.div>
        )}

        {/* ============ MODO 3: RESPONDENDO DIAGNÓSTICO ============ */}
        {step === 'diagnosing' && questions.length > 0 && (
          <motion.div key={`q-${currentQ}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={15} color="var(--p3)" />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--p3)' }}>Diagnóstico</span>
                </div>
                <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>
                  {currentQ + 1} / {questions.length}
                </span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 100, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: `${(currentQ / questions.length) * 100}%` }}
                  animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #7C00FF, #B57BFF)',
                    borderRadius: 100, boxShadow: '0 0 12px rgba(147,51,255,0.6)',
                  }}
                />
              </div>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="ses-h2-question"
              style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 24, lineHeight: 1.4 }}
            >
              {questions[currentQ].question}
            </motion.h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {questions[currentQ].options.map((opt, i) => {
                const isSelected = selectedOption === i
                const letter = String.fromCharCode(65 + i)
                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
                    whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer(i)}
                    disabled={selectedOption !== null}
                    className="ses-option-pad"
                    style={{
                      borderRadius: 14,
                      border: isSelected ? '1px solid var(--p)' : '1px solid rgba(255,255,255,0.08)',
                      background: isSelected ? 'var(--p-soft)' : 'rgba(28,15,48,0.4)',
                      color: 'var(--ink)',
                      cursor: selectedOption !== null ? 'default' : 'pointer',
                      textAlign: 'left',
                      fontFamily: "'Product Sans', sans-serif",
                      display: 'flex', alignItems: 'center', gap: 12,
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 8px 24px rgba(147,51,255,0.25)' : 'none',
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: isSelected ? 'var(--p)' : 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                      color: isSelected ? '#fff' : 'var(--ink-2)',
                      flexShrink: 0, transition: 'all 0.2s',
                    }}>
                      {letter}
                    </div>
                    <span style={{ flex: 1 }}>{opt}</span>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ============ MODO 4: NÍVEL REVELADO ============ */}
        {step === 'level-revealed' && level && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
            style={{ textAlign: 'center', padding: '40px 16px' }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
              style={{
                width: 100, height: 100, margin: '0 auto 22px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #9333FF, #7C00FF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 50, boxShadow: '0 20px 60px rgba(147,51,255,0.45)',
              }}
            >
              {LEVEL_DATA[level].emoji}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 6 }}
            >
              Seu nível em <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{topic}</span>
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="ses-h1-level"
              style={{
                fontWeight: 900, marginBottom: 16,
                background: 'linear-gradient(135deg, #B57BFF, #9333FF)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}
            >
              {level === 'iniciante' ? levelLabels.beginner : level === 'intermediario' ? levelLabels.intermediate : levelLabels.advanced}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="ses-level-desc"
              style={{ color: 'var(--ink)', marginBottom: 32, maxWidth: 440, margin: '0 auto 32px', lineHeight: 1.5 }}
            >
              {LEVEL_DATA[level].desc}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
              style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}
            >
              <button
                onClick={handleReset}
                style={{
                  padding: '12px 22px', borderRadius: 100,
                  border: '1px solid var(--p-line)',
                  background: 'transparent', color: 'var(--ink)',
                  cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                  fontFamily: "'Product Sans', sans-serif",
                }}
              >
                Recomeçar
              </button>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleGeneratePlan}
                style={{
                  padding: '12px 24px', borderRadius: 100, border: 'none',
                  background: 'linear-gradient(135deg, #9333FF, #7C00FF)',
                  color: '#fff', cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 700, fontFamily: "'Product Sans', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 12px 32px rgba(147,51,255,0.35)',
                }}
              >
                Gerar plano de aula
                <ArrowRight size={14} />
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {/* ============ MODO 5: CARREGANDO PLANO ============ */}
        {step === 'loading-plan' && (
          <motion.div key="loading-plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ses-loading-pad" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 22 }}>
              <FlowMascot expression="thinking" size={130} animation="breathe" />
            </div>
            <h2 className="ses-h2-loading" style={{ fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
              Montando seu plano de aula
            </h2>
            <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>
              A IA está organizando os melhores passos pra você.
            </p>
          </motion.div>
        )}

        {/* ============ MODO 6: PLANO REVELADO ============ */}
        {step === 'plan-revealed' && lessonSteps.length > 0 && level && (
          <motion.div key="plan" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div style={{ marginBottom: 26 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 100,
                background: 'var(--p-soft)', border: '1px solid var(--p-line)',
                marginBottom: 14,
              }}>
                <Sparkles size={13} color="var(--p3)" />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--p3)' }}>
                  Plano de aula personalizado
                </span>
              </div>

              <h1 className="ses-h1-plan" style={{
                fontWeight: 800, color: 'var(--ink)',
                marginBottom: 8, letterSpacing: '-0.02em', lineHeight: 1.15,
              }}>
                Vamos estudar <span style={{
                  background: 'linear-gradient(135deg, #B57BFF, #9333FF)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>{topic}</span>
              </h1>

              <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>
                {lessonSteps.length} passos •{' '}
                {lessonSteps.reduce((acc, s) => acc + s.estimatedMinutes, 0)} minutos no total
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {lessonSteps.map((stepItem, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
                  className="ses-plan-step-pad"
                  style={{
                    borderRadius: 14,
                    background: 'rgba(28,15,48,0.4)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'flex-start',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, #9333FF, #7C00FF)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, color: '#fff',
                    flexShrink: 0, boxShadow: '0 6px 16px rgba(147,51,255,0.3)',
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                      {stepItem.title}
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 6 }}>
                      {stepItem.description}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      ⏱ {stepItem.estimatedMinutes} min
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleReset}
                style={{
                  padding: '12px 22px', borderRadius: 100,
                  border: '1px solid var(--p-line)',
                  background: 'transparent', color: 'var(--ink)',
                  cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                  fontFamily: "'Product Sans', sans-serif",
                }}
              >
                Recomeçar
              </button>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={startLesson}
                style={{
                  padding: '12px 24px', borderRadius: 100, border: 'none',
                  background: 'linear-gradient(135deg, #9333FF, #7C00FF)',
                  color: '#fff', cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 700, fontFamily: "'Product Sans', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 12px 32px rgba(147,51,255,0.35)',
                }}
              >
                Começar a aula
                <ArrowRight size={14} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ============ MODO 7: CARREGANDO AULA ============ */}
        {step === 'loading-lesson' && (
          <motion.div key="loading-lesson" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ses-loading-pad" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 22 }}>
              <FlowMascot expression="thinking" size={130} animation="breathe" />
            </div>
            <h2 className="ses-h2-loading" style={{ fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
              {attemptNumber === 0 ? 'Preparando o passo...' : 'Vou explicar de outro jeito...'}
            </h2>
            <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>
              {attemptNumber === 0 ? 'A IA está montando a explicação.' : 'Vamos tentar uma abordagem diferente.'}
            </p>
          </motion.div>
        )}

        {/* ============ MODO 8: AULA + EXERCÍCIO ============ */}
        {step === 'lesson-content' && stepContent && (
          <motion.div
            key={`lesson-${currentStepIndex}-${attemptNumber}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
          >
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Sparkles size={13} color="var(--p3)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--p3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lessonSteps[currentStepIndex]?.title}
                  </span>
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)', flexShrink: 0 }}>
                  Passo {currentStepIndex + 1} de {lessonSteps.length}
                </span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 100, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: `${(currentStepIndex / lessonSteps.length) * 100}%` }}
                  animate={{ width: `${((currentStepIndex + 1) / lessonSteps.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #7C00FF, #B57BFF)', borderRadius: 100, boxShadow: '0 0 12px rgba(147,51,255,0.6)' }}
                />
              </div>
            </div>

            <div className="ses-card-pad" style={{
              borderRadius: 14,
              background: 'rgba(28,15,48,0.4)',
              border: '1px solid rgba(255,255,255,0.06)',
              marginBottom: 16,
            }}>
              <p className="ses-explain-text" style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                {stepContent.explanation}
              </p>
            </div>

            {stepContent.examples && stepContent.examples.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--p3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={13} />
                  Exemplos
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stepContent.examples.map((ex, i) => (
                    <div key={i} style={{
                      padding: '12px 16px', borderRadius: 12,
                      background: 'var(--p-soft)',
                      border: '1px solid var(--p-line)',
                      color: 'var(--ink)', fontSize: 13.5, lineHeight: 1.5,
                    }}>
                      {ex}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleDidntUnderstand}
              style={{
                width: '100%', padding: '11px', borderRadius: 12,
                border: '1px dashed var(--p-line)',
                background: 'transparent', color: 'var(--p3)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                fontFamily: "'Product Sans', sans-serif", marginBottom: 22,
              }}
            >
              Não entendi, explica de outro jeito
            </button>

            <div className="ses-card-pad" style={{
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(147,51,255,0.08), rgba(124,0,255,0.04))',
              border: '1px solid var(--p-line)',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--p3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={13} />
                Sua vez de praticar
              </div>
              <h3 className="ses-exercise-h3" style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 16, lineHeight: 1.4 }}>
                {stepContent.exercise.question}
              </h3>

              {stepContent.exercise.type === 'multiple-choice' && stepContent.exercise.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stepContent.exercise.options.map((opt, i) => {
                    const isSelected = studentAnswer === i
                    const letter = String.fromCharCode(65 + i)
                    return (
                      <motion.button
                        key={i}
                        whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}
                        onClick={() => setStudentAnswer(i)}
                        style={{
                          padding: '13px 16px', borderRadius: 12,
                          border: isSelected ? '1px solid var(--p)' : '1px solid rgba(255,255,255,0.08)',
                          background: isSelected ? 'var(--p-soft)' : 'rgba(28,15,48,0.4)',
                          color: 'var(--ink)', fontSize: 14, cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: "'Product Sans', sans-serif",
                          display: 'flex', alignItems: 'center', gap: 12,
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: 7,
                          background: isSelected ? 'var(--p)' : 'rgba(255,255,255,0.04)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12.5, fontWeight: 700,
                          color: isSelected ? '#fff' : 'var(--ink-2)',
                          flexShrink: 0,
                        }}>
                          {letter}
                        </div>
                        <span style={{ flex: 1 }}>{opt}</span>
                      </motion.button>
                    )
                  })}
                </div>
              )}

              {stepContent.exercise.type === 'free-text' && (
                <input
                  value={typeof studentAnswer === 'string' ? studentAnswer : ''}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder="Digite sua resposta..."
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 12,
                    border: '1px solid var(--p-line)',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'var(--ink)', fontSize: 14,
                    fontFamily: "'Product Sans', sans-serif",
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              )}

              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                💡 Dica: {stepContent.exercise.hint}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: studentAnswer !== null && studentAnswer !== '' ? 1.02 : 1 }} whileTap={{ scale: 0.98 }}
              onClick={submitAnswer}
              disabled={studentAnswer === null || studentAnswer === '' || loadingFeedback}
              style={{
                width: '100%', padding: 15, borderRadius: 14, border: 'none',
                background: studentAnswer === null || studentAnswer === '' ? 'rgba(147,51,255,0.2)' : 'linear-gradient(135deg, #9333FF, #7C00FF)',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: studentAnswer === null || studentAnswer === '' ? 'not-allowed' : 'pointer',
                fontFamily: "'Product Sans', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loadingFeedback ? 'Avaliando...' : 'Enviar resposta'}
              <ArrowRight size={16} />
            </motion.button>
          </motion.div>
        )}

        {/* ============ MODO 9: FEEDBACK ============ */}
        {step === 'lesson-feedback' && feedback && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
            className="ses-feedback-pad"
            style={{ textAlign: 'center' }}
          >
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
              style={{ marginBottom: 20 }}
            >
              <FlowMascot
                expression={feedback.correct ? 'happy' : 'thinking'}
                size={130}
                animation={feedback.correct ? 'bob' : 'breathe'}
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="ses-h1-feedback"
              style={{ fontWeight: 800, color: 'var(--ink)', marginBottom: 14, letterSpacing: '-0.02em' }}
            >
              {feedback.correct ? 'Mandou bem!' : 'Quase lá!'}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="ses-feedback-msg"
              style={{ color: 'var(--ink)', marginBottom: 28, maxWidth: 500, margin: '0 auto 28px', lineHeight: 1.6 }}
            >
              {feedback.message}
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleNextAction}
              style={{
                padding: '14px 28px', borderRadius: 100, border: 'none',
                background: 'linear-gradient(135deg, #9333FF, #7C00FF)',
                color: '#fff', fontSize: 14.5, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Product Sans', sans-serif",
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: '0 12px 32px rgba(147,51,255,0.35)',
              }}
            >
              {feedback.correct
                ? currentStepIndex + 1 >= lessonSteps.length ? 'Finalizar aula' : 'Próximo passo'
                : 'Tentar de novo'}
              <ArrowRight size={15} />
            </motion.button>
          </motion.div>
        )}

        {/* ============ MODO 10: AULA CONCLUÍDA ============ */}
        {step === 'lesson-done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="ses-done-pad"
            style={{ textAlign: 'center' }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
              style={{ marginBottom: 22 }}
            >
              <FlowMascot expression="kissing" size={150} animation="bob" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="ses-h1-done"
              style={{
                fontWeight: 900, marginBottom: 10,
                background: 'linear-gradient(135deg, #B57BFF, #9333FF)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}
            >
              Aula concluída!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="ses-done-desc"
              style={{ color: 'var(--ink-2)', marginBottom: 26, maxWidth: 480, margin: '0 auto 26px', lineHeight: 1.5 }}
            >
              Você completou todos os {lessonSteps.length} passos sobre <strong style={{ color: 'var(--ink)' }}>{topic}</strong>. Mandou muito bem!
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 140 }}
              className="ses-done-xp-pad"
              style={{
                display: 'inline-flex',
                borderRadius: 100,
                background: 'linear-gradient(135deg, rgba(147,51,255,0.15), rgba(124,0,255,0.08))',
                border: '1px solid var(--p-line)',
                marginBottom: 26,
                boxShadow: '0 8px 32px rgba(147,51,255,0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <span className="ses-done-xp-num" style={{ fontWeight: 800, color: 'var(--ink)' }}>+{earnedXp} XP</span>
              </div>
              <div style={{ width: 1, background: 'var(--p-line)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>⏱️</span>
                <span className="ses-done-xp-num" style={{ fontWeight: 800, color: 'var(--ink)' }}>+{earnedMinutes} min</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
              style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
            >
              <button
                onClick={handleReset}
                style={{
                  padding: '13px 22px', borderRadius: 100,
                  border: '1px solid var(--p-line)',
                  background: 'transparent', color: 'var(--ink)',
                  cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                  fontFamily: "'Product Sans', sans-serif",
                }}
              >
                Estudar outro tema
              </button>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}