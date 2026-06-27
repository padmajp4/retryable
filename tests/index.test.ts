import { describe, it, expect, vi } from 'vitest'
import { retry, RetryError } from '../src/index'

describe('retry', () => {
  it('returns the value on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await retry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries and succeeds on second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    const result = await retry(fn, { attempts: 3, delay: 0 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws RetryError after all attempts fail', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))

    await expect(retry(fn, { attempts: 3, delay: 0 })).rejects.toBeInstanceOf(RetryError)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('RetryError contains attempt count and last error', async () => {
    const cause = new Error('boom')
    const fn = vi.fn().mockRejectedValue(cause)

    try {
      await retry(fn, { attempts: 2, delay: 0 })
    } catch (e) {
      expect(e).toBeInstanceOf(RetryError)
      const err = e as RetryError
      expect(err.attempts).toBe(2)
      expect(err.lastError).toBe(cause)
      expect(err.message).toContain('2 attempts')
    }
  })

  it('does not retry when retryIf returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('not retryable'))

    await expect(
      retry(fn, { attempts: 3, delay: 0, retryIf: () => false })
    ).rejects.toBeInstanceOf(RetryError)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('calls onRetry with error and attempt number', async () => {
    const onRetry = vi.fn()
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    await retry(fn, { attempts: 3, delay: 0, onRetry })
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1)
  })

  it('respects exponential backoff timing', async () => {
    const delays: number[] = []
    const realSetTimeout = setTimeout

    vi.useFakeTimers()

    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    const promise = retry(fn, { attempts: 3, delay: 100, backoff: 'exponential' })

    await vi.runAllTimersAsync()
    await promise

    vi.useRealTimers()
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
