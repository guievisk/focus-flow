import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

type DiagnosticQuestion = {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

async function gerarPerguntas(
  systemPrompt: string,
  userPrompt: string,
  tentativas = 3
) {
  let ultimoErro: unknown

  for (let i = 1; i <= tentativas; i++) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      })

      const raw = completion.choices[0]?.message?.content || '{}'
      let parsed = JSON.parse(raw)

      if (Array.isArray(parsed)) parsed = parsed[0]

      if (
        !parsed?.questions ||
        !Array.isArray(parsed.questions) ||
        parsed.questions.length === 0
      ) {
        throw new Error('Formato inválido (sem questions)')
      }

      return parsed
    } catch (err) {
      ultimoErro = err
      console.warn(
        `level-check: tentativa ${i}/${tentativas} falhou. ${
          i < tentativas ? 'Tentando de novo...' : 'Desistindo.'
        }`
      )
    }
  }

  throw ultimoErro
}

export async function POST(req: Request) {
  try {
    const { topic } = await req.json()

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return NextResponse.json(
        { error: 'Tema é obrigatório' },
        { status: 400 }
      )
    }

    const systemPrompt = `You are a world-class educational diagnostician with deep pedagogical expertise.

YOUR ONLY JOB: create a precise diagnostic quiz that reveals the student's TRUE level on a SPECIFIC topic.

ABSOLUTE CRITICAL RULES:

1. STAY ON TOPIC — STRICTLY
   The topic provided is the EXACT subject. Do not drift to related topics.
   - If topic is "multiplication" → ONLY multiplication questions. NOT percentages, NOT division, NOT general arithmetic.
   - If topic is "Past Perfect" → ONLY Past Perfect tense. NOT general English grammar.
   - If topic is "fotossíntese" → ONLY photosynthesis. NOT general biology.
   Every question MUST contain the topic explicitly or test the EXACT mechanic of the topic.

2. LANGUAGE DETECTION
   Detect the language of the topic and respond ENTIRELY in that language.

3. OUTPUT FORMAT
   Return ONLY valid JSON. No markdown, no preamble, no explanation outside JSON.

4. EXACTLY 4 QUESTIONS, CALIBRATED:
   - Q1 (foundational): tests if the student knows what the topic IS or its most basic mechanic
   - Q2 (applied basic): direct application of the topic's core operation
   - Q3 (nuanced): a less obvious case or common misconception within the topic
   - Q4 (expert): edge case, deeper property, or sophisticated application — STILL within the topic

5. OPTION RULES (CRITICAL)
   - 4 options per question
   - All 4 options must be DIFFERENT (never duplicate values)
   - The 3 wrong answers must be PLAUSIBLE distractors (common student mistakes)
   - NEVER use "all of the above" or "none of the above"
   - For numerical answers, wrong options should be results of typical mistakes (off-by-one, wrong operation, sign error, etc.)

6. SELF-CHECK BEFORE RETURNING
   Before outputting JSON, verify:
   - Does EVERY question test the literal topic (not a tangent)?
   - Are all 4 options in each question UNIQUE?
   - Is the correctIndex actually pointing to a correct answer?
   If any check fails, regenerate the question.

7. AVOID TRIVIA
   Test understanding of the topic mechanic, not memorized facts about it.

Return JSON in this EXACT format:
{
  "questions": [
    {
      "question": "the question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "concise explanation of why this is correct"
    }
  ]
}

The correctIndex is the 0-based index of the correct option in the options array.`

    const userPrompt = `Topic to diagnose: "${topic.trim()}"

Generate exactly 4 diagnostic questions that test ONLY this specific topic, calibrated from foundational to expert level. Every question must directly involve "${topic.trim()}" — do not drift into related but different topics.

Before returning, verify all options in each question are unique. Return only the JSON.`

    const parsed = await gerarPerguntas(systemPrompt, userPrompt)

    return NextResponse.json({
      questions: parsed.questions as DiagnosticQuestion[],
      levelLabels: parsed.levelLabels || {
        beginner: 'Iniciante',
        intermediate: 'Intermediário',
        advanced: 'Avançado',
      },
    })
  } catch (err) {
    console.error('Erro na rota level-check:', err)
    return NextResponse.json(
      { error: 'Erro ao gerar perguntas de diagnóstico' },
      { status: 500 }
    )
  }
}