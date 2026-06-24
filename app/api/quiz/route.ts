import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
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
          content: `PENSANDO À FRENTE (internacionalização completa)
   O FlowBot já fica global com isso. Mas a INTERFACE do site
   (textos como "Métodos de estudo", "Meu progresso") ainda
   está em português fixo.
   
   Pra deixar 100% internacional no futuro, existe uma técnica
   chamada i18n (internationalization) que troca todos os textos
   do site conforme o idioma do navegador. É um passo maior que
   podemos fazer mais pra frente, quando o produto estiver mais
   maduro. Por agora, o FlowBot falando o idioma do aluno já é
   um ótimo começo.`,
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