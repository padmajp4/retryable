export type BackoffStrategy = 'fixed' | 'linear' | 'exponential'

export interface RetryOptions {
  attempts?: number
  delay?: number
  backoff?: BackoffStrategy
  retryIf?: (error: unknown) => boolean
  onRetry?: (error: unknown, attempt: number) => void
}

export class RetryError extends Error {
  attempts: number
  lastError: unknown

  constructor(attempts: number, lastError: unknown) {
    const cause = lastError instanceof Error ? lastError.message : String(lastError)
    super(`Failed after ${attempts} attempt${attempts > 1 ? 's' : ''}: ${cause}`)
    this.name = 'RetryError'
    this.attempts = attempts
    this.lastError = lastError
  }
}

function getDelay(delay: number, attempt: number, backoff: BackoffStrategy): number {
  switch (backoff) {
    case 'linear':      return delay * attempt
    case 'exponential': return Math.min(delay * Math.pow(2, attempt - 1), 30_000)
    default:            return delay
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    attempts = 3,
    delay = 300,
    backoff = 'fixed',
    retryIf = () => true,
    onRetry,
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === attempts || !retryIf(error)) {
        break
      }

      onRetry?.(error, attempt)
      await sleep(getDelay(delay, attempt, backoff))
    }
  }

  throw new RetryError(attempts, lastError)
}
