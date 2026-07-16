'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type Profile = {
  id: string
  full_name: string | null
  display_name: string | null
  birth_date: string | null
  wants_parental: boolean
  parent_email: string | null
  phone: string | null
  xp: number
  total_minutes: number
  streak_days: number
  last_streak_date: string | null
  minutes_today: number
  minutes_today_date: string | null
  avatar_url: string | null
  invite_code: string | null
  last_seen: string | null
  studying_topic: string | null
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateStatus: (status?: string, studyingTopic?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  updateStatus: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
  try {
    const res = await fetch('/api/profile', { credentials: 'include' })
    if (!res.ok) {
      console.error('Erro ao carregar perfil:', res.status)
      return
    }
    const { profile } = await res.json()
    setProfile(profile)
  } catch (err) {
    console.error('Erro ao carregar perfil:', err)
  }
}, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    await loadProfile(user.id)
  }, [user, loadProfile])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) await loadProfile(u.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (_e === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        setTimeout(() => {
          loadProfile(u.id).finally(() => setLoading(false))
        }, 0)
      } else {
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  const userId = user?.id
  useEffect(() => {
    if (!userId) return

    const updateLastSeen = () => {
      supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId)
        .then()
    }

    updateLastSeen()
    const interval = setInterval(updateLastSeen, 30000)
    return () => clearInterval(interval)
  }, [userId])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const updateStatus = useCallback(async (_status?: string, _studyingTopic?: string) => {}, [])

  const value = useMemo(
    () => ({ user, profile, loading, signOut, refreshProfile, updateStatus }),
    [user, profile, loading, signOut, refreshProfile, updateStatus]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}