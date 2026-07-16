'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy,
  Check,
  UserPlus,
  Users,
  Clock,
  X,
  Share2,
  Sparkles,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import ChatWindow from '@/components/ChatWindow'
import { useAuth } from '@/components/AuthContext'
import {
  getMyInviteCode,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  listFriendships,
  type FriendWithProfile,
} from '@/lib/friends'

let cache: { code: string | null; friends: FriendWithProfile[] } | null = null

export default function FriendsPage() {
  const { user } = useAuth()
  const userId = user?.id

  const [myCode, setMyCode] = useState<string | null>(cache?.code ?? null)
  const [copied, setCopied] = useState(false)
  const [inputCode, setInputCode] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendSuccess, setSendSuccess] = useState(false)

  const [friendships, setFriendships] = useState<FriendWithProfile[]>(cache?.friends ?? [])
  const [loadingList, setLoadingList] = useState(cache === null)

  const [chatFriend, setChatFriend] = useState<FriendWithProfile | null>(null)

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const isLoadingRef = useRef(false)

  const loadAll = useCallback(async () => {
    if (!userId) return
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    try {
      const [code, list] = await Promise.all([
        getMyInviteCode(userId),
        listFriendships(userId),
      ])
      cache = { code, friends: list }
      setMyCode(code)
      setFriendships(list)
    } catch (err) {
      console.error('Erro ao carregar amigos:', err)
    } finally {
      setLoadingList(false)
      isLoadingRef.current = false
    }
  }, [userId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userId) loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  function handleCopy() {
    if (!myCode) return
    navigator.clipboard.writeText(myCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    if (!myCode) return
    const text = `Bora estudar junto no FocusFlow? Meu código: ${myCode}`
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
      }
    } else {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleSend() {
    if (!userId || !inputCode.trim()) return
    setSending(true)
    setSendError('')
    setSendSuccess(false)

    try {
      const result = await sendFriendRequest(userId, inputCode)
      if (result.ok) {
        setSendSuccess(true)
        setInputCode('')
        await loadAll()
        setTimeout(() => setSendSuccess(false), 2500)
      } else {
        setSendError(result.error || 'Erro')
      }
    } catch (err) {
      console.error('Erro ao enviar solicitação:', err)
      setSendError('Erro ao enviar. Tenta de novo.')
    } finally {
      setSending(false)
    }
  }

  async function handleAccept(friendshipId: string) {
    await acceptFriendRequest(friendshipId)
    await loadAll()
  }

  async function handleRemove(friendshipId: string) {
    await removeFriendship(friendshipId)
    await loadAll()
  }

  const aceitos = friendships.filter((f) => f.status === 'accepted')
  const recebidos = friendships.filter(
    (f) => f.status === 'pending' && f.requestedBy !== userId
  )
  const enviados = friendships.filter(
    (f) => f.status === 'pending' && f.requestedBy === userId
  )

  return (
    <AppShell>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>
        {}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 28 }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.5px' }}>
            Meus amigos
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
            Estude com quem te motiva. Adicione amigos pelo código.
          </p>
        </motion.div>

        {}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            padding: 24,
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(122,0,255,0.12) 0%, rgba(124,0,255,0.06) 100%)',
            border: '1px solid var(--p-line)',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Sparkles size={14} color="var(--p3)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--p3)' }}>
              Seu código de convite
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{
              fontSize: 28, fontWeight: 800, color: 'var(--ink)',
              letterSpacing: '0.04em', fontFamily: 'monospace',
              flex: 1, minWidth: 200,
            }}>
              {myCode || '...'}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCopy}
                disabled={!myCode}
                style={{
                  padding: '10px 16px', borderRadius: 100,
                  border: '1px solid var(--p-line)',
                  background: copied ? 'var(--p-soft)' : 'transparent',
                  color: 'var(--ink)', cursor: myCode ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 600, fontFamily: "'Product Sans', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar'}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                disabled={!myCode}
                style={{
                  padding: '10px 16px', borderRadius: 100, border: 'none',
                  background: 'linear-gradient(135deg, #7A00FF, #5A00C4)',
                  color: '#fff', cursor: myCode ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 700, fontFamily: 'Inter',
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 6px 18px rgba(122,0,255,0.07)',
                }}
              >
                <Share2 size={14} />
                Compartilhar
              </motion.button>
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 12 }}>
            Manda esse código pros amigos. Quando eles colocarem, vocês ficam amigos aqui.
          </p>
        </motion.div>

        {}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            padding: 24, borderRadius: 16,
            background: 'rgba(17,9,30,0.4)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <UserPlus size={14} color="var(--p3)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--p3)' }}>
              Adicionar amigo
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              value={inputCode}
              onChange={(e) => { setInputCode(e.target.value); setSendError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
              placeholder="Ex: FLOW-XK4P"
              style={{
                flex: 1, minWidth: 220, padding: '14px 16px', borderRadius: 12,
                border: '1px solid var(--p-line)',
                background: 'rgba(255,255,255,0.03)', color: 'var(--ink)',
                fontSize: 15, fontFamily: 'monospace', outline: 'none',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSend}
              disabled={!inputCode.trim() || sending}
              style={{
                padding: '14px 20px', borderRadius: 12, border: 'none',
                background: !inputCode.trim() ? 'rgba(122,0,255,0.2)' : 'linear-gradient(135deg, #7A00FF, #5A00C4)',
                color: '#fff', cursor: !inputCode.trim() || sending ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700, fontFamily: "'Product Sans', sans-serif",
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: !inputCode.trim() ? 'none' : '0 6px 18px rgba(122,0,255,0.16)',
              }}
            >
              {sending ? 'Enviando...' : 'Enviar'}
            </motion.button>
          </div>

          <AnimatePresence>
            {sendError && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ color: '#FF4D8D', fontSize: 12, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={13} strokeWidth={2.2} /> {sendError}
              </motion.div>
            )}
            {sendSuccess && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ color: '#00C97B', fontSize: 12, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} strokeWidth={2.6} /> Solicitação enviada!
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {}
        {recebidos.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color="var(--p3)" />
              Solicitações recebidas ({recebidos.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recebidos.map((f) => (
                <FriendCard key={f.friendshipId} friend={f} type="received" now={now}
                  onAccept={() => handleAccept(f.friendshipId)}
                  onRemove={() => handleRemove(f.friendshipId)} />
              ))}
            </div>
          </motion.div>
        )}

        {}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} color="var(--p3)" />
            Meus amigos ({aceitos.length})
          </h2>

          {loadingList ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: 20, textAlign: 'center' }}>
              Carregando...
            </div>
          ) : aceitos.length === 0 ? (
            <div style={{
              padding: 32, borderRadius: 14,
              background: 'rgba(17,9,30,0.3)',
              border: '1px dashed var(--p-line)',
              textAlign: 'center', color: 'var(--ink-3)', fontSize: 13,
            }}>
              Você ainda não tem amigos por aqui. Compartilha seu código!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {aceitos.map((f) => (
                <FriendCard key={f.friendshipId} friend={f} type="accepted" now={now}
                  onChat={() => setChatFriend(f)}
                  onRemove={() => handleRemove(f.friendshipId)} />
              ))}
            </div>
          )}
        </div>

        {}
        {enviados.length > 0 && (
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color="var(--ink-3)" />
              Aguardando resposta ({enviados.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {enviados.map((f) => (
                <FriendCard key={f.friendshipId} friend={f} type="sent" now={now}
                  onRemove={() => handleRemove(f.friendshipId)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {}
      {chatFriend && (
        <ChatWindow friend={chatFriend} onClose={() => setChatFriend(null)} />
      )}
    </AppShell>
  )
}

function FriendCard({
  friend, type, now, onAccept, onChat, onRemove,
}: {
  friend: FriendWithProfile
  type: 'accepted' | 'received' | 'sent'
  now: number
  onAccept?: () => void
  onChat?: () => void
  onRemove: () => void
}) {
  const initials = friend.friendName.slice(0, 2).toUpperCase()

  const isOnline = type === 'accepted' && !!friend.lastSeen &&
    (now - new Date(friend.lastSeen).getTime()) < 60000

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      style={{
        padding: 14, borderRadius: 12,
        background: 'rgba(17,9,30,0.4)',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      {}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          backgroundImage: friend.friendAvatar
            ? `url(${friend.friendAvatar})`
            : 'linear-gradient(135deg, #7A00FF, #5A00C4)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#fff',
          border: '2px solid var(--p-line)',
        }}>
          {!friend.friendAvatar && initials}
        </div>
        {isOnline && (
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 14, height: 14, borderRadius: '50%',
            background: '#00C97B',
            border: '2px solid rgba(17,9,30,1)',
            boxShadow: '0 0 6px rgba(16,185,129,0.27)',
          }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
          {friend.friendName}
        </div>
        <div style={{ fontSize: 11, color: isOnline ? '#00C97B' : 'var(--ink-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
          {type === 'accepted' && (isOnline ? (
            <>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C97B', flexShrink: 0 }} />
              Online
            </>
          ) : 'Amigo')}
          {type === 'received' && 'Quer te adicionar'}
          {type === 'sent' && 'Aguardando aceitar'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {type === 'received' && onAccept && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={onAccept}
            style={{
              padding: '8px 14px', borderRadius: 100, border: 'none',
              background: 'linear-gradient(135deg, #7A00FF, #5A00C4)',
              color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Inter',
            }}>
            Aceitar
          </motion.button>
        )}
        {type === 'accepted' && onChat && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={onChat}
            title="Conversar"
            style={{
              padding: 8, borderRadius: '50%', border: 'none',
              background: 'linear-gradient(135deg, #7A00FF, #5A00C4)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(122,0,255,0.06)',
            }}>
            <MessageCircle size={16} />
          </motion.button>
        )}
        <motion.button whileTap={{ scale: 0.95 }} onClick={onRemove}
          style={{
            padding: 8, borderRadius: '50%',
            border: '1px solid var(--p-line)',
            background: 'transparent', color: 'var(--ink-3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title={type === 'accepted' ? 'Remover amigo' : type === 'received' ? 'Recusar' : 'Cancelar'}>
          <X size={14} />
        </motion.button>
      </div>
    </motion.div>
  )
}