
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
    this.retryable = code === 'network'
  }
}

export function isRetryable(err: unknown): boolean {
  return err instanceof DataLayerError && err.retryable
}
