// lib/data/errors.ts
// Erro único da camada de dados. As telas decidem a UX (ex.: botão de retry)
// olhando `retryable`, sem conhecer o provedor de banco.

export type DataLayerErrorCode =
  | 'network'
  | 'conflict'
  | 'not_found'
  | 'unauthorized'
  | 'validation'
  | 'unknown'

export class DataLayerError extends Error {
  readonly code: DataLayerErrorCode
  readonly retryable: boolean

  constructor(code: DataLayerErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'DataLayerError'
    this.code = code
    // Falhas transitórias (rede/timeout) valem retry — com a MESMA
    // idempotencyKey, para nunca duplicar crédito de XP.
    this.retryable = code === 'network'
  }
}

export function isRetryable(err: unknown): boolean {
  return err instanceof DataLayerError && err.retryable
}
