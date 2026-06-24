// lib/friends.ts
import { supabase } from '@/lib/supabase'

export type FriendshipStatus = 'pending' | 'accepted'

export type Friendship = {
  id: string
  user_a: string
  user_b: string
  status: FriendshipStatus
  requested_by: string
  created_at: string
}

export type FriendWithProfile = {
  friendshipId: string
  status: FriendshipStatus
  friendId: string
  friendName: string
  friendAvatar: string | null
  inviteCode: string
  requestedBy: string
  createdAt: string
  lastSeen: string | null
}

export const MAX_AMIGOS = 30

// Ordena 2 UUIDs alfabeticamente pra garantir constraint user_a < user_b
function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

/**
 * Pega meu invite_code do banco
 */
export async function getMyInviteCode(userId: string): Promise<string | null> {
  console.log('🟢 getMyInviteCode INICIO', userId)
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('invite_code')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('🔴 getMyInviteCode ERROR:', error)
      return null
    }

    console.log('🟢 getMyInviteCode RESULTADO:', data?.invite_code)
    return data?.invite_code || null
  } catch (err) {
    console.error('🔴 getMyInviteCode EXCEPTION:', err)
    return null
  }
}

/**
 * Envia solicitação de amizade pelo invite_code
 */
export async function sendFriendRequest(
  myUserId: string,
  inviteCode: string
): Promise<{ ok: boolean; error?: string }> {
  const codeClean = inviteCode.trim().toUpperCase()

  // 1. Acha o usuário dono daquele código
  const { data: target, error: targetErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('invite_code', codeClean)
    .single()

  if (targetErr || !target) {
    return { ok: false, error: 'Código não encontrado' }
  }

  if (target.id === myUserId) {
    return { ok: false, error: 'Esse código é seu' }
  }

  const [a, b] = orderPair(myUserId, target.id)

  // 2. Já existe amizade?
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .eq('user_a', a)
    .eq('user_b', b)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'accepted') {
      return { ok: false, error: 'Vocês já são amigos' }
    } else {
      return { ok: false, error: 'Já tem uma solicitação pendente' }
    }
  }

  // 3. Limite de amigos
  const { count } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .or(`user_a.eq.${myUserId},user_b.eq.${myUserId}`)
    .eq('status', 'accepted')

  if (count && count >= MAX_AMIGOS) {
    return { ok: false, error: `Limite de ${MAX_AMIGOS} amigos atingido` }
  }

  // 4. Insere
  const { error: insertErr } = await supabase.from('friendships').insert({
    user_a: a,
    user_b: b,
    status: 'pending',
    requested_by: myUserId,
  })

  if (insertErr) {
    console.error('Erro ao inserir amizade:', insertErr)
    return { ok: false, error: 'Erro ao enviar solicitação' }
  }

  return { ok: true }
}

/**
 * Aceita solicitação de amizade
 */
export async function acceptFriendRequest(friendshipId: string) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', friendshipId)

  if (error) console.error('Erro ao aceitar:', error)
}

/**
 * Remove amizade ou cancela solicitação
 */
export async function removeFriendship(friendshipId: string) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)

  if (error) console.error('Erro ao remover:', error)
}

/**
 * Lista amizades do usuário (sem JOIN, 2 queries separadas pra evitar bugs)
 */
export async function listFriendships(
  myUserId: string
): Promise<FriendWithProfile[]> {
  console.log('🟡 listFriendships INICIO', myUserId)

  try {
    // 1. Busca todas as amizades onde eu sou parte
    const { data: friendships, error: fErr } = await supabase
      .from('friendships')
      .select('id, user_a, user_b, status, requested_by, created_at')
      .or(`user_a.eq.${myUserId},user_b.eq.${myUserId}`)
      .order('created_at', { ascending: false })

    if (fErr) {
      console.error('🔴 listFriendships fErr:', fErr)
      return []
    }

    if (!friendships || friendships.length === 0) {
      console.log('🟡 listFriendships: 0 amizades')
      return []
    }

    console.log('🟡 listFriendships:', friendships.length, 'amizades encontradas')

    // 2. Pega os IDs únicos dos amigos (não os meus)
    const friendIds = friendships.map((f) =>
      f.user_a === myUserId ? f.user_b : f.user_a
    )
    const uniqueFriendIds = Array.from(new Set(friendIds))

    // 3. Busca os perfis desses amigos numa query separada
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, avatar_url, invite_code, last_seen')
      .in('id', uniqueFriendIds)

    if (pErr) {
      console.error('🔴 listFriendships pErr:', pErr)
      return []
    }

    console.log('🟡 listFriendships: perfis carregados', profiles?.length)

    // 4. Cria um Map pra lookup rápido
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    // 5. Combina os dados
    const result = friendships.map((f) => {
      const friendId = f.user_a === myUserId ? f.user_b : f.user_a
      const profile = profileMap.get(friendId)

      return {
        friendshipId: f.id,
        status: f.status as FriendshipStatus,
        friendId,
        friendName:
          profile?.display_name ||
          profile?.full_name ||
          'Sem nome',
        friendAvatar: profile?.avatar_url || null,
        inviteCode: profile?.invite_code || '',
        requestedBy: f.requested_by,
        createdAt: f.created_at,
        lastSeen: profile?.last_seen || null,
      }
    })

    console.log('🟡 listFriendships FINAL:', result.length)
    return result
  } catch (err) {
    console.error('🔴 listFriendships EXCEPTION:', err)
    return []
  }
}