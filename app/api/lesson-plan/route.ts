import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

type LessonStep = {
  title: string
  description: string
  estimatedMinutes: number
}

function extractSteps(raw: string): LessonStep[] | null {
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
    if (Array.isArray(obj.steps)) {
      arr = obj.steps
    } else if (obj.steps && typeof obj.steps === 'object') {
      arr = [obj.steps]
    } else {
      const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]))
      if (arrayKey) arr = obj[arrayKey] as unknown[]
    }
  }

  if (!Array.isArray(arr) || arr.length === 0) return null

  const steps: LessonStep[] = (arr as Record<string, unknown>[])
    .filter((s) => s && (s.title || s.description))
    .map((s) => ({
      title: String(s.title || 'Etapa').slice(0, 80),
      description: String(s.description || s.title || '').slice(0, 300),
      estimatedMinutes:
        typeof s.estimatedMinutes === 'number' && s.estimatedMinutes > 0
          ? Math.min(Math.round(s.estimatedMinutes), 15)
          : 5,
    }))

  return steps.length > 0 ? steps.slice(0, 10) : null
}

export async function POST(req: Request) {
  try {
    const { topic, level } = await req.json()

    if (!topic || !level) {
      return NextResponse.json(
        { error: 'Tema e nível são obrigatórios' },
        { status: 400 }
      )
    }

    if (!['iniciante', 'intermediario', 'avancado'].includes(level)) {
      return NextResponse.json(
        { error: 'Nível inválido' },
        { status: 400 }
      )
    }

    const systemPrompt = `You are a world-class curriculum designer specialized in adaptive learning for students with attention difficulties (ADHD-friendly pedagogy).

YOUR JOB: design a structured lesson plan for a SPECIFIC topic, calibrated to a SPECIFIC student level.

ABSOLUTE CRITICAL RULES:

1. STAY STRICTLY ON TOPIC
   The topic is the EXACT subject. Do not drift to adjacent topics.

2. LANGUAGE
   Detect the language of the topic and respond ENTIRELY in that language.

3. OUTPUT FORMAT
   Return ONLY valid JSON. No markdown outside JSON.

4. LEVEL-ADAPTED CONTENT
   - "iniciante" (beginner): start from absolute basics, assume student knows NOTHING. Build foundation gradually with concrete examples.
   - "intermediario" (intermediate): skip basics, focus on refinement, common mistakes, and applied practice.
   - "avancado" (advanced): focus on edge cases, deeper properties, sophisticated applications.

5. STEP STRUCTURE
   - Generate EXACTLY 5 steps
   - Each step is a logical, atomic learning unit
   - Steps must follow a PROGRESSION (each builds on the previous)
   - First step is ALWAYS the easiest entry point for that level
   - Last step consolidates everything

6. EACH STEP MUST HAVE:
   - title: short, action-oriented (max 7 words)
   - description: 1-2 sentences explaining what the student will learn in this step
   - estimatedMinutes: realistic time (3-8 minutes per step)

7. ADHD-FRIENDLY DESIGN
   - Keep steps SHORT and concrete
   - Make titles ACTION-FOCUSED ("Domine a tabuada do 5" instead of "Tabuada do 5")
   - Avoid abstract words in titles

Return JSON in this EXACT format:
{
  "steps": [
    {
      "title": "step title",
      "description": "what will be learned in this step",
      "estimatedMinutes": 5
    }
  ]
}`

    const userPrompt = `Topic: "${topic.trim()}"
Student level: ${level}

Design a 5-step lesson plan strictly about "${topic.trim()}", calibrated to ${level} level. Return only the JSON.`

    const MAX_TENTATIVAS = 3
    let lastError = ''

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: tentativa === 1 ? 0.5 : 0.3,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
        })

        const raw = completion.choices[0]?.message?.content || '{}'
        const steps = extractSteps(raw)

        if (steps && steps.length > 0) {
          return NextResponse.json({ steps })
        }

        lastError = 'formato inválido'
        console.warn(`lesson-plan tentativa ${tentativa}/${MAX_TENTATIVAS} falhou: ${lastError}`)
      } catch (innerErr) {
        lastError = innerErr instanceof Error ? innerErr.message : 'erro desconhecido'
        console.warn(`lesson-plan tentativa ${tentativa}/${MAX_TENTATIVAS} falhou:`, lastError)
      }
    }

    console.error('lesson-plan: todas as tentativas falharam. Último erro:', lastError)
    return NextResponse.json(
      { error: 'Não consegui gerar o plano agora. Tenta de novo.' },
      { status: 500 }
    )
  } catch (err) {
    console.error('Erro na rota lesson-plan:', err)
    return NextResponse.json(
      { error: 'Erro ao gerar plano de aula' },
      { status: 500 }
    )
  }
}