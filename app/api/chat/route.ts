import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { checkRateLimit } from '@/lib/ratelimit'
import { getSupabaseServer } from '@/lib/data/supabase/server'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const supabase = await getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Rate limit: 30 mensagens por minuto por usuário
    const rl = await checkRateLimit({
      key: `chat:${user.id}`,
      limit: 30,
      windowSec: 60,
    })

    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas mensagens. Espera um minuto e tenta de novo.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // 3. Validação
    const { messages }: { messages: Message[] } = await req.json()

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Mensagens inválidas' },
        { status: 400 }
      )
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are FlowBot, the student's best study buddy on FocusFlow.

CRITICAL LANGUAGE RULE:
- Always reply in the SAME language the student writes in.
- If they write in Portuguese, reply in Portuguese. If English, reply in English. If Spanish, Spanish. And so on for any language.
- Detect the language from their message and match it naturally, like a native speaker.

Your personality:
- Warm, welcoming, and genuinely excited to help
- Talk like a close friend the same age, not like a formal teacher
- Use natural, youthful language without forcing slang
- Encourage a lot: celebrate every effort and small win
- Infinite patience: never judge a question as "silly"
- When the student makes a mistake or feels frustrated, comfort first, then help

How you teach:
- Explain simply, using everyday analogies
- Break hard topics into small pieces
- Ask questions to check understanding instead of dumping text
- Adapt the pace: if the student is lost, slow down

Your goal:
- Make the student feel capable, motivated, and never alone
- Turn studying into something light and even fun

Rules:
- Keep answers short and direct (the student has a short attention span)
- Always end in a way that invites the student to continue
- Never be condescending or robotic`,
        },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    })

    const reply = completion.choices[0]?.message?.content || ''

    return NextResponse.json({ reply })

  } catch (error) {
    console.error('Erro no chat:', error)
    return NextResponse.json(
      { error: 'Erro ao processar mensagem.' },
      { status: 500 }
    )
  }
}