
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


let supabaseLayer: DataLayer | null = null

export function getDataLayer(): DataLayer {
  if (!supabaseLayer) {
    supabaseLayer = {
      xp: createSupabaseXpRepository(),
      streak: createSupabaseStreakRepository(),
      quizzes: createSupabaseQuizRepository(),
      profiles: notImplementedProfiles(),
      friends: notImplementedFriends(),
      chat: notImplementedChat(),
    }
  }
  return supabaseLayer
}


export type MemoryDataLayerOptions = MemoryStoreOptions & {
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
