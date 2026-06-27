# @padmaj/retryable

Retry an async function with configurable attempts, delay, and backoff strategy. Zero dependencies. TypeScript-first.

## Install

```bash
npm install @padmaj/retryable
```

## Usage

### Basic

```ts
import { retry } from '@padmaj/retryable'

const data = await retry(() => fetch('/api/data').then(r => r.json()))
```

Retries up to 3 times with a 300ms fixed delay by default.

### Custom attempts and delay

```ts
const data = await retry(() => fetchData(), {
  attempts: 5,
  delay: 500,
})
```

### Backoff strategies

```ts
// Fixed — always wait 300ms (default)
await retry(fn, { delay: 300, backoff: 'fixed' })

// Linear — 300ms, 600ms, 900ms...
await retry(fn, { delay: 300, backoff: 'linear' })

// Exponential — 300ms, 600ms, 1200ms...
await retry(fn, { delay: 300, backoff: 'exponential' })
```

### Only retry on specific errors

```ts
await retry(() => fetchData(), {
  retryIf: (error) => error instanceof NetworkError,
})
```

### Log each retry attempt

```ts
await retry(() => fetchData(), {
  attempts: 3,
  delay: 500,
  onRetry: (error, attempt) => {
    console.warn(`Attempt ${attempt} failed, retrying...`, error)
  },
})
```

## API

### `retry(fn, options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `attempts` | `number` | `3` | Max number of attempts |
| `delay` | `number` | `300` | Base delay in ms between retries |
| `backoff` | `'fixed' \| 'linear' \| 'exponential'` | `'fixed'` | Delay growth strategy |
| `retryIf` | `(error: unknown) => boolean` | always retry | Return `false` to stop retrying |
| `onRetry` | `(error: unknown, attempt: number) => void` | — | Called before each retry |

Returns a `Promise<T>` that resolves with the function's return value, or throws `RetryError` if all attempts fail.

### `RetryError`

Extends `Error`. Has two extra properties:
- `attempts: number` — how many times the function was called
- `lastError: unknown` — the error from the final attempt

```ts
import { retry, RetryError } from '@padmaj/retryable'

try {
  await retry(fn, { attempts: 3 })
} catch (e) {
  if (e instanceof RetryError) {
    console.error(`Failed after ${e.attempts} attempts`)
    console.error('Last error:', e.lastError)
  }
}
```

## License

MIT
