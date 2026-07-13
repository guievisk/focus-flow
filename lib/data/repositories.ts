// lib/data/repositories.ts
// Contratos da camada de dados — a ÚNICA fronteira entre a aplicação e o
// provedor de banco. Trocar de provedor = reimplementar estas interfaces.
// Contrato detalhado: specs/001-xp-persistence-3d-ui/contracts/data-layer.md

import type {
  DailyXp,
  FriendPresence,
  FriendWithProfile,
  Message,
  PresenceStatus,
  Profile,
  ProfileIdentityPatch,
  QuizResult,
  QuizResultInput,
  StudyActivity,
  StudyActivityResult,
  Unsubscribe,
  XpAward,
  XpEvent,
} from './types'

export interface ProfileRepository {
  getById(userId: string): Promise<Profile | null>
  /** Somente identidade/preferências — nunca XP/streak/minutos. */
  updateIdentity(userId: string, patch: ProfileIdentityPatch): Promise<void>
}

export interface XpRepository {
  /**
   * Concede XP de forma atômica e idempotente (RPC award_xp).
   * Mesma idempotencyKey ⇒ mesmo resultado, sem crédito duplicado.
   */
  awardXp(award: XpAward): Promise<{ xpTotal: number; duplicate: boolean }>
  /** Histórico agregado por dia local (fonte: ledger xp_events). */
  getDailyXp(userId: string, days: number): Promise<DailyXp[]>
  listEvents(userId: string, limit?: number): Promise<XpEvent[]>
}

export interface StreakRepository {
  /**
   * Sessão de estudo concluída: minutos + meta diária + streak + XP numa
   * única transação (RPC record_study_activity). Idempotente pela chave.
   */
  recordStudyActivity(activity: StudyActivity): Promise<StudyActivityResult>
}

export interface QuizRepository {
  saveResult(result: QuizResultInput): Promise<{ quizId: string }>
  listRecent(userId: string, sinceDays: number): Promise<QuizResult[]>
}

export interface FriendsRepository {
  getMyInviteCode(userId: string): Promise<string | null>
  sendFriendRequest(myUserId: string, inviteCode: string): Promise<{ ok: boolean; error?: string }>
  acceptFriendRequest(friendshipId: string): Promise<void>
  removeFriendship(friendshipId: string): Promise<void>
  listFriendships(myUserId: string): Promise<FriendWithProfile[]>
  /** Entra no canal de presença como `userId`; permite atualizar o status. */
  connectPresence(userId: string): {
    updateStatus(status: PresenceStatus, studyingTopic?: string): Promise<void>
    disconnect(): void
  }
  /** Observa a presença dos amigos (tempo real encapsulado na camada). */
  subscribeFriendsPresence(
    myUserId: string,
    friendIds: string[],
    cb: (online: FriendPresence[]) => void,
  ): Unsubscribe
}

export interface ChatRepository {
  sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
  ): Promise<{ ok: boolean; error?: string; message?: Message }>
  /** Mensagens entre dois usuários; `since` (ISO) para polling incremental. */
  listMessages(myUserId: string, friendId: string, since?: string): Promise<Message[]>
}

/** Conjunto completo de repositórios que a aplicação consome. */
export type DataLayer = {
  profiles: ProfileRepository
  xp: XpRepository
  streak: StreakRepository
  quizzes: QuizRepository
  friends: FriendsRepository
  chat: ChatRepository
}
