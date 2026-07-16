import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { checkRateLimit } from '@/lib/ratelimit'
import { getSupabaseServer } from '@/lib/data/supabase/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

type Question = {
  q: string
  opts: string[]
  correct: number
  exp: string
}

type LevelKey = 'facil' | 'medio' | 'dificil'

function extractQuestions(raw: string): Question[] | null {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?/i, '').replace(/```$/i, '').trim()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return null
  }

  let arr: unknown[] | null = null
  if (Array.isArray(parsed)) {
    arr = parsed
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    if (Array.isArray(obj.questions)) {
      arr = obj.questions
    } else {
      const key = Object.keys(obj).find((k) => Array.isArray(obj[k]))
      if (key) arr = obj[key] as unknown[]
    }
  }

  if (!Array.isArray(arr) || arr.length === 0) return null

  const questions: Question[] = (arr as Record<string, unknown>[])
    .filter((q) => q && (q.q || q.question) && (q.opts || q.options))
    .map((q) => {
      const opts = ((q.opts || q.options || []) as unknown[]).map((o) => String(o))
      const rawIdx = typeof q.correct === 'number'
        ? q.correct
        : typeof q.correctIndex === 'number'
          ? q.correctIndex
          : 0
      const correct = rawIdx >= 0 && rawIdx < opts.length ? rawIdx : 0

      return {
        q: String(q.q || q.question || '').trim(),
        opts,
        correct,
        exp: String(q.exp || q.explanation || q.feedback || '').trim(),
      }
    })
    .filter((q: Question) => q.q && q.opts.length >= 2)

  return questions.length > 0 ? questions : null
}

const DIFFICULTY_INSTRUCTIONS: Record<LevelKey, string> = {
  facil: `DIFFICULTY: BASIC (accessible, but NOT trivial)
- Questions should test COMPREHENSION — the student understood the content, not just memorized keywords.
- Simple and direct language, no tricks or traps.
- Questions can involve recall WITH context: "Which of these best describes X?", "What happens when Y?"
- Wrong options should be clearly wrong to someone who studied, but seem plausible to someone guessing.
- Think: standard school test, study guide review, someone who just learned the topic.
- DO NOT make it too easy (no "What color is the sky?" level) — the student should need to have actually studied.`,

  medio: `DIFFICULTY: INTERMEDIATE (requires reasoning, not just recall)
- Questions must require CONNECTING concepts, APPLYING knowledge, or ANALYZING situations.
- Include "why" and "how" questions, not just "what".
- Some questions should present a scenario and ask the student to reason through it.
- Wrong options should be based on common misunderstandings or partial knowledge.
- Think: a good teacher's test that separates students who memorized from those who understood.
- NOT specialist level — a well-prepared student should be able to answer most.`,

  dificil: `DIFFICULTY: EXPERT (graduate / specialist level — REALLY HARD)
- Questions must challenge SPECIALISTS in the field, not students.
- Demand mastery: subtle distinctions, advanced edge cases, theoretical depth, counterintuitive scenarios.
- For ANY topic — even "simple" ones — find the hardest possible angles.
- Distractors must be SO plausible that even experts hesitate.
- Think: PhD qualifying exam, professional certification at expert level.`,
}

const LEVEL_LABELS: Record<LevelKey, string> = {
  facil: 'BASIC',
  medio: 'INTERMEDIATE',
  dificil: 'EXPERT',
}

export async function POST(req: Request) {
  try {
    // 1. Auth — quem tá chamando?
    const supabase = await getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Rate limit: 10 requests por minuto por usuário
    const rl = await checkRateLimit({
      key: `generate-quiz:${user.id}`,
      limit: 10,
      windowSec: 60,
    })

    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in a minute.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // 3. Validação do body
    const body = await req.json()
    const topic: string = body.topic
    const levelRaw: string = body.level || 'medio'
    const level: LevelKey = (['facil', 'medio', 'dificil'].includes(levelRaw) ? levelRaw : 'medio') as LevelKey
    const count = Math.min(20, Math.max(5, Number(body.count) || 5))

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return NextResponse.json({ error: 'Tema é obrigatório' }, { status: 400 })
    }

    const systemPrompt = `You are an EXPERT quiz master who creates ${LEVEL_LABELS[level]}-level academic quizzes.

${DIFFICULTY_INSTRUCTIONS[level]}

GENERAL RULES:
1. Detect the language of the topic and respond ENTIRELY in that language.
2. Generate EXACTLY ${count} questions about the given topic.
3. Each question must have EXACTLY 4 options.
4. Only ONE correct answer per question.
5. Wrong options must be plausible distractors.
6. Include a SHORT explanation (1-2 sentences) for the correct answer.

MATH / CALCULATION RULE:
- If the topic involves ANY area of mathematics, physics, chemistry, or any quantitative field:
  • Questions MUST include actual numbers, equations, or calculations to solve.
  • DO NOT only ask conceptual/theoretical questions — mix in real computation problems.
  • Examples: "Quanto é 3/4 + 2/5?", "Se f(x) = 2x² - 3, qual é f(4)?", "Um objeto de 5kg acelera a 3m/s². Qual a força resultante?"
  • At least 60% of the questions should require the student to DO math, not just talk about it.
  • Show the numbers/equation clearly in the question text.

8. Return ONLY valid JSON in this exact format:

{
  "questions": [
    {
      "q": "question text (in topic's language)",
      "opts": ["option A", "option B", "option C", "option D"],
      "correct": 0,
      "exp": "brief explanation"
    }
  ]
}`

    const userPrompt = `Topic: "${topic.trim()}"
Difficulty: ${LEVEL_LABELS[level]}

Generate ${count} ${LEVEL_LABELS[level]}-level questions. If the topic is mathematical/quantitative, include actual calculation problems.

Return ONLY the JSON.`

    const MAX = 3
    let lastErr = ''

    for (let i = 1; i <= MAX; i++) {
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: i === 1 ? 0.8 : 0.5,
          max_tokens: count * 500,
          response_format: { type: 'json_object' },
        })

        const raw = completion.choices[0]?.message?.content || '{}'
        const questions = extractQuestions(raw)

        if (questions && questions.length > 0) {
          return NextResponse.json({ questions: questions.slice(0, count) })
        }

        lastErr = 'formato inválido'
        console.warn(`generate-quiz tentativa ${i}/${MAX}: ${lastErr}`)
      } catch (e) {
        lastErr = e instanceof Error ? e.message : 'erro'
        console.warn(`generate-quiz tentativa ${i}/${MAX}:`, lastErr)
      }
    }

    console.error('generate-quiz: todas falharam:', lastErr)
    return NextResponse.json(
      { error: 'Não consegui gerar o quiz. Tenta de novo.' },
      { status: 500 }
    )
  } catch (err) {
    console.error('Erro na rota generate-quiz:', err)
    return NextResponse.json({ error: 'Erro ao gerar quiz' }, { status: 500 })
  }
}