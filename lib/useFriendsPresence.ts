// lib/useFriendsPresence.ts
// Hook que escuta a presence dos seus amigos no canal global.
// Retorna lista de quem está online + status (idle/studying).

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { PresenceStatus, PresenceState } from '@/lib/usePresence'

export type FriendPresence = {
  friendId: string
  status: PresenceStatus
  studyingTopic?: string
  onlineAt: string
}

const PRESENCE_CHANNEL = 'global-presence'

/**
 * Escuta a presence de uma lista de amigos.
 *
 * @param myUserId - meu próprio ID (uso pra não me incluir na lista)
 * @param friendIds - lista de IDs dos amigos
 * @returns lista dos amigos online, com status
 *
 * Atualiza em tempo real quando amigo entra/sai/muda status.
 */
export function useFriendsPresence(
  myUserId: string | undefined,
  friendIds: string[]
) {
  const [onlineFriends, setOnlineFriends] = useState<FriendPresence[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Converte pra Set pra busca O(1) ao filtrar
  const friendsSetKey = friendIds.sort().join(',')

  useEffect(() => {
    if (!myUserId) return

    const friendsSet = new Set(friendIds)

    // Conecta no MESMO canal global do usePresence
    // (importante: presence é compartilhada por canal)
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: { key: myUserId },
      },
    })

    channelRef.current = channel

    // Função que lê o estado atual de presence e filtra pelos amigos
    const syncPresence = () => {
      const state = channel.presenceState<PresenceState>()

      const list: FriendPresence[] = []

      // state é um objeto: { userId1: [{...}], userId2: [{...}] }
      for (const userId in state) {
        // Pula eu mesmo
        if (userId === myUserId) continue
        // Pula quem não é meu amigo
        if (!friendsSet.has(userId)) continue

        // state[userId] é um array (em teoria, mesma pessoa em múltiplas abas)
        // pega o primeiro/único
        const presence = state[userId][0]
        if (!presence) continue

        list.push({
          friendId: userId,
          status: presence.status,
          studyingTopic: presence.studyingTopic,
          onlineAt: presence.onlineAt,
        })
      }

      setOnlineFriends(list)
    }

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      setOnlineFriends([])
    }
    // friendsSetKey muda quando a lista de amigos muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId, friendsSetKey])

  return onlineFriends
}