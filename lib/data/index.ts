// lib/data/index.ts
// Ponto único de acesso à camada de dados.
// - getDataLayer(): implementação Supabase (produção)
// - createMemoryDataLayer(): fake em memória (testes de contrato / dev sem banco)

import { DataLayerError } from './errors'
import type {
  ChatRepository,
  DataLayer,
  FriendsRepository,
  ProfileRepository,
} from './repositories'
import { createMemoryProfileRepository } from './memory/profile.repository'
import { createMemoryQuizRepository } from './memory/quiz.repository'
import { createMemoryStreakRepository } from './memory/streak.repository'
import { createMemoryXpRepository } from './memory/xp.repository'
import { MemoryStore, type MemoryStoreOptions } from './memory/store'
import { createSupabaseQuizRepository } from './supabase/quiz.repository'
import { createSupabaseStreakRepository } from './supabase/streak.repository'
import { createSupabaseXpRepository } from './supabase/xp.repository'

export type { DataLayer } from './repositories'
export { DataLayerError } from './errors'

// ---------------------------------------------------------------------------
// Produção (Supabase)
// ---------------------------------------------------------------------------

let supabaseLayer: DataLayer | null = null

/** Camada de dados de produção (singleton). */
export function getDataLayer(): DataLayer {
  if (!supabaseLayer) {
    supabaseLayer = {
      xp: createSupabaseXpRepository(),
      streak: createSupabaseStreakRepository(),
      quizzes: createSupabaseQuizRepository(),
      // Chegam com a US2 (T026–T028): telas seguem em lib/friends.ts etc.
      profiles: notImplementedProfiles(),
      friends: notImplementedFriends(),
      chat: notImplementedChat(),
    }
  }
  return supabaseLayer
}

// ---------------------------------------------------------------------------
// Fake em memória (testes de contrato)
// ---------------------------------------------------------------------------

export type MemoryDataLayerOptions = MemoryStoreOptions & {
  /** Usuário "autenticado" do fake — equivalente ao auth.uid() do Supabase. */
  currentUserId?: string
}

export type MemoryDataLayer = DataLayer & { store: MemoryStore }

export function createMemoryDataLayer(options: MemoryDataLayerOptions = {}): MemoryDataLayer {
  const { currentUserId = 'user-test', ...storeOptions } = options
  const store = new MemoryStore(storeOptions)

  return {
    store,
    profiles: createMemoryProfileRepository(store),
    xp: createMemoryXpRepository(store, currentUserId),
    streak: createMemoryStreakRepository(store, currentUserId),
    quizzes: createMemoryQuizRepository(store, currentUserId),
    friends: notImplementedFriends(),
    chat: notImplementedChat(),
  }
}

// Repositórios que chegam com a US2 (T026/T027/T028).
function notImplementedProfiles(): ProfileRepository {
  const fail = () => {
    throw new DataLayerError('unknown', 'ProfileRepository Supabase ainda não implementado (T026)')
  }
  return {
    getById: async () => fail(),
    updateIdentity: async () => fail(),
  }
}

function notImplementedFriends(): FriendsRepository {
  const fail = () => {
    throw new DataLayerError('unknown', 'FriendsRepository fake ainda não implementado (T027)')
  }
  return {
    getMyInviteCode: async () => fail(),
    sendFriendRequest: async () => fail(),
    acceptFriendRequest: async () => fail(),
    removeFriendship: async () => fail(),
    listFriendships: async () => fail(),
    connectPresence: () => fail(),
    subscribeFriendsPresence: () => fail(),
  }
}

function notImplementedChat(): ChatRepository {
  const fail = () => {
    throw new DataLayerError('unknown', 'ChatRepository fake ainda não implementado (T028)')
  }
  return {
    sendMessage: async () => fail(),
    listMessages: async () => fail(),
  }
}
