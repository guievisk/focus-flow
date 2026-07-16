
import { DataLayerError } from '../errors'
import type { QuizRepository } from '../repositories'
import type { QuizResult, QuizResultInput } from '../types'
import type { MemoryStore } from './store'

export function createMemoryQuizRepository(
  store: MemoryStore,
  currentUserId: string,
): QuizRepository {
  return {
    async saveResult(result: QuizResultInput): Promise<{ quizId: string }> {
      store.maybeFail('quizzes.saveResult')

      if (!result.topic) {
        throw new DataLayerError('validation', 'topic é obrigatório')
      }

      const quizId = store.nextId('quiz')
      store.quizzes.push({
        ...result,
        id: quizId,
        userId: currentUserId,
        createdAt: store.clock().toISOString(),
      })
      return { quizId }
    },

    async listRecent(userId: string, sinceDays: number): Promise<QuizResult[]> {
      store.maybeFail('quizzes.listRecent')

      const since = new Date(store.clock())
      since.setDate(since.getDate() - sinceDays)
      const sinceIso = since.toISOString()

      return store.quizzes
        .filter((q) => q.userId === userId && q.createdAt >= sinceIso)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((q) => ({
          id: q.id,
          topic: q.topic,
          difficulty: q.difficulty,
          totalQuestions: q.totalQuestions,
          correctAnswers: q.correctAnswers,
          xpEarned: q.xpEarned,
          createdAt: q.createdAt,
        }))
    },
  }
}
