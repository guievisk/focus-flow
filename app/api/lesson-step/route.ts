// app/api/lesson-step/route.ts
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

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

// Extrai e normaliza o conteúdo do passo, tolerando formatos diferentes.
// Retorna null se faltar o essencial (explicação ou exercício) — aí o retry tenta de novo.
function extractStepContent(raw: string): StepContent | null {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?/i, '').replace(/```$/i, '').trim()
  }

  let parsed: any
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return null
  }

  // Às vezes o modelo embrulha em { content: {...} }
  if (parsed.content && typeof parsed.content === 'object' && parsed.content.explanation) {
    parsed = parsed.content
  }

  const explanation =
    typeof parsed.explanation === 'string' ? parsed.explanation.trim() : ''
  if (!explanation) return null

  const ex = parsed.exercise
  if (!ex || typeof ex !== 'object' || !ex.question) return null

  // examples → array de strings limpas
  const examples: string[] = Array.isArray(parsed.examples)
    ? parsed.examples
        .filter((e: any) => typeof e === 'string' && e.trim())
        .map((e: string) => e.trim())
    : []

  // Normaliza o exercício. Se tem options válidas → múltipla escolha; senão → texto livre.
  const hasOptions = Array.isArray(ex.options) && ex.options.length >= 2
  const type: 'multiple-choice' | 'free-text' = hasOptions ? 'multiple-choice' : 'free-text'

  const exercise: Exercise = {
    type,
    question: String(ex.question).trim(),
    hint: typeof ex.hint === 'string' ? ex.hint.trim() : '',
  }

  if (type === 'multiple-choice') {
    exercise.options = ex.options.map((o: any) => String(o))
    const idx = typeof ex.correctIndex === 'number' ? ex.correctIndex : 0
    exercise.correctIndex = idx >= 0 && idx < exercise.options.length ? idx : 0
    // guarda o texto da opção certa também (ajuda o check-answer)
    exercise.expectedAnswer =
      typeof ex.expectedAnswer === 'string' && ex.expectedAnswer.trim()
        ? ex.expectedAnswer.trim()
        : exercise.options[exercise.correctIndex]
  } else {
    exercise.expectedAnswer =
      typeof ex.expectedAnswer === 'string' ? ex.expectedAnswer.trim() : ''
  }

  return { explanation, examples, exercise }
}

export async function POST(req: Request) {
  try {
    const { topic, level, stepTitle, stepDescription, attemptNumber } = await req.json()

    if (!topic || !level || !stepTitle) {
      return NextResponse.json(
        { error: 'Tema, nível e título do passo são obrigatórios' },
        { status: 400 }
      )
    }

    const isRetry = (attemptNumber || 0) > 0

    const systemPrompt = `You are a world-class adaptive tutor specialized in teaching students with ADHD.

YOUR JOB: teach ONE specific learning step about a topic, in a clear and ADHD-friendly way.

ABSOLUTE CRITICAL RULES:

1. STAY STRICTLY ON TOPIC
   You are teaching about "${topic}" — specifically the step "${stepTitle}".
   Do NOT drift into other topics.

2. LANGUAGE
   Detect the language of the topic and respond ENTIRELY in that language.

3. ADAPT TO LEVEL
   The student level is "${level}". 
   - iniciante: assume ZERO knowledge. Build from absolute basics.
   - intermediario: skip basics, focus on the actual mechanic.
   - avancado: be sophisticated, show edge cases.

4. ${isRetry ? `RE-EXPLAIN DIFFERENTLY
   This is attempt ${attemptNumber + 1}. The student didn't understand the previous explanation.
   Use a COMPLETELY DIFFERENT approach: different analogy, different examples, different angle.
   DO NOT repeat the same explanation pattern.` : 'FIRST EXPLANATION'}

5. OUTPUT FORMAT — return ONLY this JSON:
{
  "explanation": "the teaching content — 2-4 short paragraphs, ADHD-friendly. Use simple language. Use analogies. Break complex ideas into chunks. NO markdown symbols.",
  "examples": ["example 1 as a string", "example 2 as a string"],
  "exercise": {
    "type": "multiple-choice" OR "free-text",
    "question": "the exercise question",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "expectedAnswer": "the correct answer or key concept",
    "hint": "a short hint to help if student is stuck"
  }
}

6. EXERCISE RULES
   - Mostly use multiple-choice (easier to grade).
   - Use free-text ONLY when the answer is unambiguous and short.
   - Exercise must test EXACTLY what was taught in this step.
   - Wrong options in multiple-choice must be plausible distractors.

7. ADHD-FRIENDLY WRITING
   - Short sentences.
   - Concrete examples, not abstract.
   - Use second person ("você").
   - Friendly, never condescending.`

    const userPrompt = `Topic: "${topic}"
Level: ${level}
Step to teach: "${stepTitle}"
Step description: ${stepDescription || 'N/A'}
${isRetry ? `\nThis is re-explanation attempt #${attemptNumber + 1}. Use a different approach.` : ''}

Generate the teaching content for this step. Return only the JSON.`

    // Temperatura base: alta no re-ensino (variedade), normal na 1ª explicação.
    const baseTemp = isRetry ? 0.85 : 0.6

    // Retry de ROBUSTEZ (JSON quebrado). Baixa a temp só um pouco por tentativa,
    // com piso 0.3 — sem matar a variedade do ensino.
    const MAX_TENTATIVAS = 3
    let lastError = ''

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
      try {
        const temp = Math.max(baseTemp - (tentativa - 1) * 0.2, 0.3)

        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: temp,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
        })

        const raw = completion.choices[0]?.message?.content || '{}'
        const content = extractStepContent(raw)

        if (content) {
          return NextResponse.json({ content })
        }

        lastError = 'formato inválido'
        console.warn(`lesson-step tentativa ${tentativa}/${MAX_TENTATIVAS} falhou: ${lastError}`)
      } catch (innerErr) {
        lastError = innerErr instanceof Error ? innerErr.message : 'erro desconhecido'
        console.warn(`lesson-step tentativa ${tentativa}/${MAX_TENTATIVAS} falhou:`, lastError)
      }
    }

    console.error('lesson-step: todas as tentativas falharam. Último erro:', lastError)
    return NextResponse.json(
      { error: 'Não consegui gerar o conteúdo agora. Tenta de novo.' },
      { status: 500 }
    )
  } catch (err) {
    console.error('Erro na rota lesson-step:', err)
    return NextResponse.json(
      { error: 'Erro ao gerar conteúdo do passo' },
      { status: 500 }
    )
  }
}