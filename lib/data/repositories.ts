
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
  updateIdentity(userId: string, patch: ProfileIdentityPatch): Promise<void>
}

export interface XpRepository {
  awardXp(award: XpAward): Promise<{ xpTotal: number; duplicate: boolean }>
  getDailyXp(userId: string, days: number): Promise<DailyXp[]>
  listEvents(userId: string, limit?: number): Promise<XpEvent[]>
}

export interface StreakRepository {
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
  connectPresence(userId: string): {
    updateStatus(status: PresenceStatus, studyingTopic?: string): Promise<void>
    disconnect(): void
  }
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
  listMessages(myUserId: string, friendId: string, since?: string): Promise<Message[]>
}

export type DataLayer = {
  profiles: ProfileRepository
  xp: XpRepository
  streak: StreakRepository
  quizzes: QuizRepository
  friends: FriendsRepository
  chat: ChatRepository
}
