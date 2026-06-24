// components/ChatWindow.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send } from 'lucide-react'
import { useAuth } from '@/components/AuthContext'
import { sendMessage, listMessages, type Message } from '@/lib/chat'
import { type FriendWithProfile } from '@/lib/friends'

export default function ChatWindow({
  friend,
  onClose,
}: {
  friend: FriendWithProfile
  onClose: () => void
}) {
  const { user } = useAuth()
  const userId = user?.id

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastTimestampRef = useRef<string | null>(null)
  const isPollingRef = useRef(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Carga inicial das mensagens
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      const msgs = await listMessages(userId!, friend.friendId)
      if (cancelled) return
      setMessages(msgs)
      if (msgs.length > 0) {
        lastTimestampRef.current = msgs[msgs.length - 1].createdAt
      }
      setLoading(false)
      setTimeout(scrollToBottom, 100)
    }

    load()
    return () => { cancelled = true }
  }, [userId, friend.friendId])

  // Polling a cada 3s — busca só mensagens novas (since = última que já temos)
  useEffect(() => {
    if (!userId) return

    const poll = async () => {
      if (isPollingRef.current) return
      isPollingRef.current = true
      try {
        const since = lastTimestampRef.current
        const novas = await listMessages(userId, friend.friendId, since || undefined)
        if (novas.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const toAdd = novas.filter((m) => !existingIds.has(m.id))
            if (toAdd.length === 0) return prev
            return [...prev, ...toAdd]
          })
          lastTimestampRef.current = novas[novas.length - 1].createdAt
          setTimeout(scrollToBottom, 100)
        }
      } catch (err) {
        console.error('Erro no polling do chat:', err)
      } finally {
        isPollingRef.current = false
      }
    }

    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [userId, friend.friendId])

  async function handleSend() {
    if (!userId || !input.trim() || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)

    try {
      const result = await sendMessage(userId, friend.friendId, content)
      if (result.ok && result.message) {
        setMessages((prev) => {
          // evita duplicata caso o polling já tenha pego
          if (prev.some((m) => m.id === result.message!.id)) return prev
          return [...prev, result.message!]
        })
        lastTimestampRef.current = result.message.createdAt
        setTimeout(scrollToBottom, 100)
      } else {
        setInput(content) // devolve o texto se falhou
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
      setInput(content)
    } finally {
      setSending(false) // SEMPRE reseta — botão nunca trava
    }
  }

  const initials = friend.friendName.slice(0, 2).toUpperCase()

  function formatTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 440, height: '70vh', maxHeight: 640,
            background: 'var(--card, #160c28)',
            border: '1px solid var(--p-line)',
            borderRadius: 18,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--p-line)',
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'linear-gradient(135deg, rgba(147,51,255,0.12), rgba(124,0,255,0.04))',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              backgroundImage: friend.friendAvatar
                ? `url(${friend.friendAvatar})`
                : 'linear-gradient(135deg, #9333FF, #7C00FF)',
              backgroundSize: 'cover', backgroundPosition: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
              border: '2px solid var(--p-line)',
            }}>
              {!friend.friendAvatar && initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                {friend.friendName}
              </div>
            </div>
            <button onClick={onClose}
              style={{
                padding: 8, borderRadius: '50%', border: 'none',
                background: 'transparent', color: 'var(--ink-3)',
                cursor: 'pointer', display: 'flex',
              }}>
              <X size={18} />
            </button>
          </div>

          {/* Lista de mensagens */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: 16,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {loading ? (
              <div style={{ margin: 'auto', color: 'var(--ink-3)', fontSize: 13 }}>
                Carregando...
              </div>
            ) : messages.length === 0 ? (
              <div style={{ margin: 'auto', color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>
                Nenhuma mensagem ainda.<br />Manda a primeira!
              </div>
            ) : (
              messages.map((m) => {
                const isMine = m.senderId === userId
                return (
                  <div key={m.id} style={{
                    display: 'flex',
                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      maxWidth: '75%',
                      padding: '9px 13px',
                      borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: isMine
                        ? 'linear-gradient(135deg, #9333FF, #7C00FF)'
                        : 'rgba(255,255,255,0.06)',
                      color: isMine ? '#fff' : 'var(--ink)',
                      fontSize: 14, lineHeight: 1.4,
                      wordBreak: 'break-word',
                    }}>
                      {m.content}
                      <div style={{
                        fontSize: 10,
                        color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--ink-3)',
                        marginTop: 3, textAlign: 'right',
                      }}>
                        {formatTime(m.createdAt)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Campo de digitar */}
          <div style={{
            padding: 12,
            borderTop: '1px solid var(--p-line)',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
              placeholder="Mensagem..."
              maxLength={2000}
              style={{
                flex: 1, padding: '11px 14px', borderRadius: 100,
                border: '1px solid var(--p-line)',
                background: 'rgba(255,255,255,0.04)', color: 'var(--ink)',
                fontSize: 14, fontFamily: "'Product Sans', sans-serif", outline: 'none',
              }}
            />
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleSend}
              disabled={!input.trim() || sending}
              style={{
                width: 44, height: 44, borderRadius: '50%', border: 'none',
                background: !input.trim() || sending ? 'rgba(147,51,255,0.25)' : 'linear-gradient(135deg, #9333FF, #7C00FF)',
                color: '#fff', cursor: !input.trim() || sending ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Send size={18} />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}