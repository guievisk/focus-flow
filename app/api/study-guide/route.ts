import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  try {
    const { method, topic } = await req.json()

    if (!method || !topic) {
      return NextResponse.json(
        { error: 'Método e tema são obrigatórios' },
        { status: 400 }
      )
    }

    const systemPrompt = `You are FlowBot, a warm and encouraging study coach for students.

CRITICAL RULES:
1. Detect the language of the topic the student wants to study.
2. Respond ENTIRELY in that same language. If topic is in English, respond in English. If in Portuguese, respond in Portuguese. If in Spanish, respond in Spanish, etc.
3. Be warm, friendly and motivating — like a smart older friend who studies with the student.
4. Keep responses SHORT and actionable. Max 4 short paragraphs.
5. Use the study method provided to structure the guidance.

The study method the student chose is: ${method}

Your job: give the student a CONCRETE, SPECIFIC plan for how to study "${topic}" using the ${method} method during the next focus session. 

Format your response as:
- A short warm intro (1 sentence)
- A clear step-by-step plan (3-4 bullets) adapted to the topic
- An encouraging closing line (1 sentence)

Do NOT use markdown symbols like ** or ##. Just plain text with bullets using "•".`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Quero estudar: ${topic}` },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const guide = completion.choices[0]?.message?.content || ''

    return NextResponse.json({ guide })
  } catch (err) {
    console.error('Erro na rota study-guide:', err)
    return NextResponse.json(
      { error: 'Erro ao gerar guia de estudo' },
      { status: 500 }
    )
  }
}