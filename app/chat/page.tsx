// app/chat/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { Send, Bot, User } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const suggestions = [
  'Explica o que foi a Revolução Francesa',
  'Como funciona a fotossíntese?',
  'O que é fração equivalente?',
  'Qual a diferença entre célula animal e vegetal?',
]

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const send = async (text?: string) => {
    const content = text || input.trim()
    if (!content || loading) return

    const userMsg: Message = { role: 'user', content }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      })
      const data = await res.json()
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
      <style>{`
        @keyframes chat-bounce {
          0%, 100% { transform: translateY(0); opacity: .5; }
          50%      { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes chat-pulse {
          0%, 100% { box-shadow: 0 0 14px rgba(139,34,240,0.27), 0 0 27px rgba(139,34,240,0.14); }
          50%      { box-shadow: 0 0 20px rgba(139,34,240,0.41), 0 0 41px rgba(139,34,240,0.23); }
        }
      `}</style>

      {/* Chat tela cheia */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 60px)',
        minHeight: 0,
      }}>

        {/* Lista de mensagens */}
        <div
          ref={scrollRef}
          style={{
            flex: '1 1 auto',
            overflowY: 'auto',
            minHeight: 0,
            padding: '32px 24px 24px',
          }}
        >

          {/* Welcome */}
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 60, maxWidth: 640, margin: '0 auto' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, #8B22F0, #6216D8)',
                border: '2px solid rgba(192,140,255,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 0 18px rgba(139,34,240,0.32), 0 0 36px rgba(139,34,240,0.16)',
                animation: 'chat-pulse 3s ease-in-out infinite',
              }}>
                <Bot size={36} color="#FFFFFF" strokeWidth={2.2} />
              </div>

              <h1 style={{
                fontSize: 32, fontWeight: 900, marginBottom: 12,
                fontFamily: 'var(--nav)', letterSpacing: '-.5px',
                background: 'linear-gradient(135deg, #C08CFF, #7A00FF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                FlowBot IA
              </h1>
              <p style={{
                fontSize: 15.5, color: '#CFC8DC', marginBottom: 40,
                maxWidth: 420, margin: '0 auto 40px',
                fontFamily: 'var(--nav)', lineHeight: 1.55,
              }}>
                Seu professor particular com IA. Pergunte qualquer coisa sobre seus estudos.
              </p>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                maxWidth: 560, margin: '0 auto',
              }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    style={{
                      width: '100%', padding: '14px 18px',
                      textAlign: 'left',
                      background: 'linear-gradient(135deg, rgba(139,34,240,0.15), rgba(98,22,216,0.08))',
                      border: '1.5px solid rgba(139,34,240,0.4)',
                      borderRadius: 12,
                      color: '#F2ECFA',
                      fontSize: 13, fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'var(--nav)',
                      transition: 'all .2s',
                      boxShadow: '0 4px 12px rgba(139,34,240,0.03)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(192,140,255,0.8)'
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,34,240,0.25), rgba(98,22,216,0.15))'
                      e.currentTarget.style.boxShadow = '0 8px 11px rgba(139,34,240,0.16)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(139,34,240,0.4)'
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,34,240,0.15), rgba(98,22,216,0.08))'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(139,34,240,0.07)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mensagens */}
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 18, gap: 10,
                alignItems: 'flex-start',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #8B22F0, #6216D8)',
                    border: '1.5px solid rgba(192,140,255,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(139,34,240,0.1)',
                  }}>
                    <Bot size={16} color="#FFFFFF" strokeWidth={2.2} />
                  </div>
                )}

                <div style={{
                  maxWidth: '72%',
                  padding: '13px 18px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #8B22F0, #6216D8)'
                    : 'linear-gradient(135deg, rgba(139,34,240,0.15), rgba(98,22,216,0.08))',
                  border: msg.role === 'user'
                    ? '1.5px solid rgba(192,140,255,0.4)'
                    : '1.5px solid rgba(139,34,240,0.35)',
                  fontSize: 14.5, lineHeight: 1.65,
                  color: msg.role === 'user' ? '#FFFFFF' : '#F2ECFA',
                  fontWeight: 400,
                  fontFamily: 'var(--nav)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  boxShadow: msg.role === 'user'
                    ? '0 8px 13px rgba(139,34,240,0.23), 0 0 0 1px rgba(192,140,255,0.07)'
                    : '0 4px 16px rgba(139,34,240,0.07)',
                }}>
                  {msg.content}
                </div>

                {msg.role === 'user' && (
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #8B22F0, #6216D8)',
                    border: '1.5px solid rgba(192,140,255,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(139,34,240,0.1)',
                  }}>
                    <User size={16} color="#FFFFFF" strokeWidth={2.2} />
                  </div>
                )}
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #8B22F0, #6216D8)',
                  border: '1.5px solid rgba(192,140,255,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(139,34,240,0.1)',
                }}>
                  <Bot size={16} color="#FFFFFF" strokeWidth={2.2} />
                </div>

                <div style={{
                  padding: '14px 20px',
                  borderRadius: '16px 16px 16px 4px',
                  background: 'linear-gradient(135deg, rgba(139,34,240,0.15), rgba(98,22,216,0.08))',
                  border: '1.5px solid rgba(139,34,240,0.35)',
                  display: 'flex', gap: 6, alignItems: 'center',
                  boxShadow: '0 4px 16px rgba(139,34,240,0.03)',
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#C08CFF',
                      boxShadow: '0 0 8px rgba(192,140,255,0.27)',
                      animation: `chat-bounce 1.2s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div style={{
          flex: '0 0 auto',
          padding: '16px 24px 20px',
          borderTop: '1px solid rgba(139,34,240,0.2)',
          background: 'linear-gradient(to top, rgba(139,34,240,0.03), transparent)',
        }}>
          <div style={{
            maxWidth: 820, margin: '0 auto',
            display: 'flex', gap: 10,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Pergunte qualquer coisa sobre seus estudos..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: 14,
                border: '1.5px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.04)',
                color: '#FFFFFF',
                fontFamily: 'Inter, sans-serif',
                fontSize: 15, outline: 'none',
                opacity: loading ? 0.6 : 1,
                boxSizing: 'border-box',
                transition: 'all .2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(192,140,255,0.7)'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(139,34,240,0.3)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />

            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                width: 50, height: 50, borderRadius: 14, border: 'none',
                background: loading || !input.trim()
                  ? 'rgba(255,255,255,0.04)'
                  : 'linear-gradient(135deg, #8B22F0, #6216D8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'all .18s', flexShrink: 0,
                boxShadow: loading || !input.trim()
                  ? 'none'
                  : '0 8px 13px rgba(139,34,240,0.27), 0 0 0 1px rgba(192,140,255,0.09)',
              }}
              onMouseEnter={(e) => {
                if (!loading && input.trim()) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 12px 16px rgba(139,34,240,0.34), 0 0 0 1px rgba(192,140,255,0.14)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = loading || !input.trim()
                  ? 'none'
                  : '0 8px 13px rgba(139,34,240,0.27), 0 0 0 1px rgba(192,140,255,0.09)'
              }}
            >
              <Send size={18} color={loading || !input.trim() ? 'var(--ink-3)' : '#FFFFFF'} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}