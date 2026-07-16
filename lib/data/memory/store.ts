
import { DataLayerError } from '../errors'
import type { FriendshipStatus, Message, Profile, QuizResult, XpEvent } from '../types'

export type StoredXpEvent = XpEvent & { idempotencyKey: string }
export type StoredQuiz = QuizResult & { userId: string }

export type StoredFriendship = {
  id: string
  userA: string
  userB: string
  status: FriendshipStatus
  requestedBy: string
  createdAt: string
}

export type MemoryStoreOptions = {
  clock?: () => Date
  profiles?: Array<Partial<Profile> & { id: string }>
}

export function defaultProfile(id: string): Profile {
  return {
    id,
    fullName: null,
    displayName: null,
    birthDate: null,
    wantsParental: false,
    parentEmail: null,
    phone: null,
    xp: 0,
    totalMinutes: 0,
    streakDays: 0,
    lastStreakDate: null,
    minutesToday: 0,
    minutesTodayDate: null,
    avatarUrl: null,
    inviteCode: null,
    lastSeen: null,
    studyingTopic: null,
  }
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export class MemoryStore {
  profiles = new Map<string, Profile>()
  xpEvents: StoredXpEvent[] = []
  quizzes: StoredQuiz[] = []
  friendships: StoredFriendship[] = []
  messages: Message[] = []

  clock: () => Date

  failNextOps = new Set<string>()

  private seq = 0

  constructor(options: MemoryStoreOptions = {}) {
    this.clock = options.clock ?? (() => new Date())
    for (const seed of options.profiles ?? []) {
      this.profiles.set(seed.id, { ...defaultProfile(seed.id), ...seed })
    }
  }

  nextId(prefix: string): string {
    this.seq += 1
    return `${prefix}-${this.seq}`
  }

  today(): string {
    return toDateKey(this.clock())
  }

  yesterday(): string {
    const d = new Date(this.clock())
    d.setDate(d.getDate() - 1)
    return toDateKey(d)
  }

  maybeFail(op: string): void {
    if (this.failNextOps.has(op)) {
      this.failNextOps.delete(op)
      throw new DataLayerError('network', `falha de rede simulada em ${op}`)
    }
  }

  ensureProfile(userId: string): Profile {
    let p = this.profiles.get(userId)
    if (!p) {
      p = defaultProfile(userId)
      this.profiles.set(userId, p)
    }
    return p
  }

  findEventByKey(userId: string, idempotencyKey: string): StoredXpEvent | undefined {
    return this.xpEvents.find(
      (e) => e.userId === userId && e.idempotencyKey === idempotencyKey,
    )
  }
}
