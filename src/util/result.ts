import type { Result } from '../types.js'

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function err<E extends Error>(error: E): Result<never, E> {
  return { ok: false, error }
}

export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.value
  throw result.error
}
