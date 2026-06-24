// app/chat/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { Send, Bot, User } from 'lucide-react'

// Tipagem de uma mensagem do chat
type Message = {
  role: 'user' | 'assistant'
  content: string
}

// Sugestões rápidas para o aluno começar
const suggestions = [
  'Explica o que foi a Revolução Francesa',
  'Como funciona a fotossíntese?',
  'O que é fração equivalente?',
  'Qual a diferença entre célula animal e vegetal?',
]

export default function Chat() {
  // Histórico de mensagens da conversa
  const [messages, setMessages] = useState<Message[]>([])

  // Texto que o aluno está digitando
  const [input, setInput] = useState('')

  // Controla se a IA está gerando resposta
  const [loading, setLoading] = useState(false)

  // Referência para rolar automaticamente para o final
  const bottomRef = useRef<HTMLDivElement>(null)

  // Rola para o final sempre que uma nova mensagem chega
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Função que envia a mensagem para a API
  const send = async (text?: string) => {
    const content = text || input.trim()
    if (!content || loading) return

    // Adiciona a mensagem do usuário no histórico
    const userMsg: Message = { role: 'user', content }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      /*
       🧠 LINGUAGEM → fetch com POST
          Enviamos o histórico COMPLETO a cada mensagem.
          Isso permite que a IA tenha contexto das mensagens
          anteriores e mantenha uma conversa coerente.
      */
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      })

      const data = await res.json()

      // Adiciona a resposta da IA no histórico
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])

    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.5px' }}>
          FlowBot IA
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
          Seu professor particular. Tire dúvidas sobre qualquer matéria.
        </p>
      </div>

      {/* Área principal do chat */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 200px)',
        overflow: 'hidden',
      }}>

        {/* Lista de mensagens */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 16px' }}>

          {/* Estado inicial — tela de boas vindas */}
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 60 }}>
              {/* Ícone do bot */}
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--p-light)', border: '1px solid rgba(124,58,237,.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <Bot size={28} color="#A78BFA" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                Olá! Sou o FlowBot.
              </h2>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 36, maxWidth: 400, margin: '0 auto 36px' }}>
                Seu professor particular com IA. Pode me perguntar qualquer coisa sobre seus estudos.
              </p>

              {/* Sugestões de perguntas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, margin: '0 auto' }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    style={{
                      padding: '12px 16px', borderRadius: 10, textAlign: 'left',
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      color: 'var(--ink-2)', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', transition: 'all .15s',
                      fontFamily: "'Product Sans', sans-serif', sans-serif",
                    }}
                    onMouseEnter={e => {
                      const t = e.currentTarget
                      t.style.borderColor = 'rgba(124,58,237,.4)'
                      t.style.color = 'var(--ink)'
                    }}
                    onMouseLeave={e => {
                      const t = e.currentTarget
                      t.style.borderColor = 'var(--border)'
                      t.style.color = 'var(--ink-2)'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mensagens da conversa */}
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 16,
              gap: 10,
              alignItems: 'flex-start',
            }}>
              {/* Avatar do bot */}
              {msg.role === 'assistant' && (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--p-light)', border: '1px solid rgba(124,58,237,.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot size={15} color="#A78BFA" />
                </div>
              )}

              {/* Balão da mensagem */}
              <div style={{
                maxWidth: '72%',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: msg.role === 'user' ? 'var(--p)' : 'var(--surface-2)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                fontSize: 14,
                lineHeight: 1.65,
                color: msg.role === 'user' ? '#fff' : 'var(--ink)',
                fontWeight: 400,
              }}>
                {msg.content}
              </div>

              {/* Avatar do usuário */}
              {msg.role === 'user' && (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--p)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <User size={15} color="#fff" />
                </div>
              )}
            </div>
          ))}

          {/* Indicador de carregamento — IA digitando */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--p-light)', border: '1px solid rgba(124,58,237,.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bot size={15} color="#A78BFA" />
              </div>
              <div style={{
                padding: '14px 18px', borderRadius: '14px 14px 14px 4px',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                display: 'flex', gap: 5, alignItems: 'center',
              }}>
                {/* Três pontinhos animados */}
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#A78BFA',
                    animation: `bounce 1.2s ${i * 0.2}s infinite`,
                  }} />
                ))}
                <style>{`
                  @keyframes bounce {
                    0%, 100% { transform: translateY(0); opacity: .4; }
                    50%       { transform: translateY(-5px); opacity: 1; }
                  }
                `}</style>
              </div>
            </div>
          )}

          {/* Âncora invisível para scroll automático */}
          <div ref={bottomRef} />
        </div>

        {/* Input de envio de mensagem */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10,
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Pergunte qualquer coisa sobre seus estudos..."
            disabled={loading}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10,
              border: '1.5px solid var(--border)',
              background: 'var(--surface-2)', color: 'var(--ink)',
              fontFamily: "'Product Sans', sans-serif",
              fontSize: 14, outline: 'none',
              opacity: loading ? 0.6 : 1,
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              width: 46, height: 46, borderRadius: 10, border: 'none',
              background: loading || !input.trim() ? 'var(--surface-2)' : 'var(--p)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'all .18s', flexShrink: 0,
            }}
          >
            <Send size={16} color={loading || !input.trim() ? 'var(--ink-3)' : '#fff'} />
          </button>
        </div>
      </div>
    </AppShell>
  )
}