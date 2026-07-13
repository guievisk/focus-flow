// lib/data/memory/profile.repository.ts
// Fake em memória do ProfileRepository — mesma semântica do contrato.

import { DataLayerError } from '../errors'
import type { ProfileRepository } from '../repositories'
import type { Profile, ProfileIdentityPatch } from '../types'
import type { MemoryStore } from './store'

export function createMemoryProfileRepository(store: MemoryStore): ProfileRepository {
  return {
    async getById(userId: string): Promise<Profile | null> {
      store.maybeFail('profiles.getById')
      const p = store.profiles.get(userId)
      return p ? { ...p } : null
    },

    async updateIdentity(userId: string, patch: ProfileIdentityPatch): Promise<void> {
      store.maybeFail('profiles.updateIdentity')
      const p = store.profiles.get(userId)
      if (!p) {
        throw new DataLayerError('not_found', `perfil ${userId} não existe`)
      }
      Object.assign(p, patch)
    },
  }
}
