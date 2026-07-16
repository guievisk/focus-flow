import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

type AnswerResult = {
  correct: boolean
  feedback: string
}

function tryParseJson(raw: string): unknown {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?/i, '').replace(/```$/i, '').trim()
  }
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

function coerceBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.toLowerCase().trim()
    if (['true', 'yes', 'correct', 'sim', 'certo'].includes(s)) return true
    if (['false', 'no', 'wrong', 'nao', 'não', 'errado'].includes(s)) return false
  }
  return null
}

async function askGroqJson(
  systemPrompt: string,
  userPrompt: string,
  baseTemp: number,
  maxTokens: number,
  attempts = 3
): Promise<Record<string, unknown> | null> {
  let lastErr = ''
  for (let i = 1; i <= attempts; i++) {
    try {
      const temp = Math.max(baseTemp - (i - 1) * 0.15, 0.2)
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: temp,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      })
      const raw = completion.choices[0]?.message?.content || '{}'
      const parsed = tryParseJson(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
      lastErr = 'JSON inválido'
    } catch (e) {
      lastErr = e instanceof Error ? e.message : 'erro'
    }
    console.warn(`check-answer Groq tentativa ${i}/${attempts}: ${lastErr}`)
  }
  return null
}

export async function POST(req: Request) {
  try {
    const { topic, stepTitle, exercise, studentAnswer } = await req.json()

    if (!topic || !stepTitle || !exercise || studentAnswer === undefined) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    if (exercise.type === 'multiple-choice') {
      const isCorrect = Number(studentAnswer) === exercise.correctIndex
      const correctText = exercise.options?.[exercise.correctIndex] ?? ''
      const pickedText = exercise.options?.[Number(studentAnswer)] ?? ''

      const systemPrompt = `You are a warm, encouraging tutor for students with ADHD.

RULES:
1. Detect the language of the topic "${topic}" and respond in that language.
2. Keep feedback SHORT (1-2 sentences).
3. Be warm, never condescending.
4. ${isCorrect ? 'The student got it RIGHT. Congratulate briefly and confirm why the answer is correct.' : `The student got it WRONG. Explain kindly why the correct answer is "${correctText}". Do NOT shame the student. Frame the mistake as a learning moment.`}
5. Return ONLY JSON: { "feedback": "your message here" }`

      const userPrompt = `Topic: "${topic}"
Step: "${stepTitle}"
Question: "${exercise.question}"
Correct answer: "${correctText}"
Student picked: "${pickedText}"
Result: ${isCorrect ? 'CORRECT' : 'WRONG'}

Generate the feedback. Return only JSON.`

      const parsed = await askGroqJson(systemPrompt, userPrompt, 0.7, 250, 2)

      const feedback =
        parsed && typeof parsed.feedback === 'string' && parsed.feedback.trim()
          ? parsed.feedback.trim()
          : isCorrect
            ? 'Mandou bem! Resposta certa.'
            : `Não foi dessa vez. A resposta certa é "${correctText}".`

      return NextResponse.json({
        result: { correct: isCorrect, feedback } as AnswerResult,
      })
    }

    if (exercise.type === 'free-text') {
      const systemPrompt = `You are a fair and warm tutor for students with ADHD.

YOUR JOB: judge if the student's free-text answer is essentially correct, then give feedback.

RULES:
1. Detect the language of the topic "${topic}" and respond in that language.
2. Be FLEXIBLE: accept answers that are conceptually correct even if wording differs.
3. Accept synonyms, slight typos, and equivalent phrasings.
4. REJECT answers that show clear misunderstanding.
5. Feedback must be SHORT (1-2 sentences), warm, never condescending.
6. Return ONLY JSON in this format:
   { "correct": true/false, "feedback": "your message here" }`

      const userPrompt = `Topic: "${topic}"
Step: "${stepTitle}"
Question: "${exercise.question}"
Expected answer: "${exercise.expectedAnswer}"
Student's answer: "${studentAnswer}"

Judge if the student's answer is essentially correct, then give feedback. Return only JSON.`

      const parsed = await askGroqJson(systemPrompt, userPrompt, 0.4, 300, 3)
      const correct = coerceBool(parsed?.correct)

      if (correct !== null) {
        return NextResponse.json({
          result: {
            correct,
            feedback:
              parsed && typeof parsed.feedback === 'string' && parsed.feedback.trim()
                ? parsed.feedback.trim()
                : correct
                  ? 'Boa, resposta correta!'
                  : 'Ainda não. Revisa e tenta de novo.',
          } as AnswerResult,
        })
      }

      const expected = exercise.expectedAnswer || ''
      return NextResponse.json({
        result: {
          correct: false,
          feedback: expected
            ? `Tive um problema pra avaliar agora. A resposta esperada é: "${expected}". Confere se a tua bate e tenta de novo.`
            : 'Tive um problema pra avaliar agora. Tenta enviar de novo.',
        } as AnswerResult,
      })
    }

    return NextResponse.json({ error: 'Tipo de exercício inválido' }, { status: 400 })
  } catch (err) {
    console.error('Erro na rota check-answer:', err)
    return NextResponse.json({ error: 'Erro ao avaliar resposta' }, { status: 500 })
  }
}