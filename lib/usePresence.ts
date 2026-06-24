// lib/usePresence.ts
// Hook que conecta o usuário ao canal global de presence.
// Registra ele como "online" e permite atualizar o status (idle/studying).

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type PresenceStatus = 'idle' | 'studying'

export type PresenceState = {
  userId: string
  status: PresenceStatus
  studyingTopic?: string // tema que tá estudando, se status='studying'
  onlineAt: string
}

// Nome do canal global. Todos os usuários online entram nele.
const PRESENCE_CHANNEL = 'global-presence'

/**
 * Conecta o usuário no canal de presence.
 * Retorna função `updateStatus` pra atualizar status sem reconectar.
 *
 * Uso típico:
 *   const { updateStatus, isConnected } = usePresence(user?.id)
 *   // quando entra em study-session:
 *   updateStatus('studying', 'Matemática')
 *   // quando sai:
 *   updateStatus('idle')
 */
export function usePresence(userId: string | undefined) {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const currentStatusRef = useRef<PresenceState | null>(null)

  // Função pra atualizar status sem desconectar
  const updateStatus = useCallback(
    async (status: PresenceStatus, studyingTopic?: string) => {
      if (!channelRef.current || !userId) return

      const newState: PresenceState = {
        userId,
        status,
        studyingTopic,
        onlineAt: new Date().toISOString(),
      }

      currentStatusRef.current = newState
      await channelRef.current.track(newState)
    },
    [userId]
  )

  useEffect(() => {
    if (!userId) return

    // Cria/conecta no canal global
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: { key: userId }, // identifica essa conexão pelo userId
      },
    })

    channelRef.current = channel

    // Estado inicial: idle (online mas não estudando)
    const initialState: PresenceState = {
      userId,
      status: 'idle',
      onlineAt: new Date().toISOString(),
    }

    channel
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(initialState)
          currentStatusRef.current = initialState
        }
      })

    // Cleanup: quando o componente desmonta, sai do canal
    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
      channelRef.current = null
      setIsConnected(false)
    }
  }, [userId])

  return { isConnected, updateStatus }
}