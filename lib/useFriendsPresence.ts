
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

export function useFriendsPresence(
  myUserId: string | undefined,
  friendIds: string[]
) {
  const [onlineFriends, setOnlineFriends] = useState<FriendPresence[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  const friendsSetKey = friendIds.sort().join(',')

  useEffect(() => {
    if (!myUserId) return

    const friendsSet = new Set(friendIds)

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: { key: myUserId },
      },
    })

    channelRef.current = channel

    const syncPresence = () => {
      const state = channel.presenceState<PresenceState>()

      const list: FriendPresence[] = []

      for (const userId in state) {
        if (userId === myUserId) continue
        if (!friendsSet.has(userId)) continue

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId, friendsSetKey])

  return onlineFriends
}