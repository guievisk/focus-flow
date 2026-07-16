
import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type PresenceStatus = 'idle' | 'studying'

export type PresenceState = {
  userId: string
  status: PresenceStatus
  studyingTopic?: string
  onlineAt: string
}

const PRESENCE_CHANNEL = 'global-presence'

export function usePresence(userId: string | undefined) {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const currentStatusRef = useRef<PresenceState | null>(null)

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

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: { key: userId },
      },
    })

    channelRef.current = channel

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

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
      channelRef.current = null
      setIsConnected(false)
    }
  }, [userId])

  return { isConnected, updateStatus }
}