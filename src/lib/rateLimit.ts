/**
 * Client-side rate limits (sessionStorage + memory).
 * Complements Supabase Auth / DB limits — reduces spam & accidental double-submit.
 */

export class RateLimitError extends Error {
  readonly retryAfterSec: number
  constructor(message: string, retryAfterSec: number) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfterSec = retryAfterSec
  }
}

type BucketState = { hits: number[]; lastAt: number }

const mem = new Map<string, BucketState>()
const PREFIX = 'bpm-rl:'

function load(key: string): BucketState {
  const cached = mem.get(key)
  if (cached) return cached
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (raw) {
      const parsed = JSON.parse(raw) as BucketState
      if (parsed && Array.isArray(parsed.hits)) {
        mem.set(key, parsed)
        return parsed
      }
    }
  } catch {
    /* private mode / quota */
  }
  const fresh: BucketState = { hits: [], lastAt: 0 }
  mem.set(key, fresh)
  return fresh
}

function save(key: string, state: BucketState) {
  mem.set(key, state)
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export type RatePolicy = {
  /** Max successful attempts inside the window */
  max: number
  /** Sliding window length */
  windowMs: number
  /** Minimum gap between attempts (optional) */
  cooldownMs?: number
}

/** Named policies used across the app */
export const RATE = {
  otpSend: { max: 5, windowMs: 15 * 60_000, cooldownMs: 45_000 } satisfies RatePolicy,
  otpVerify: { max: 12, windowMs: 15 * 60_000, cooldownMs: 1_500 } satisfies RatePolicy,
  localLogin: { max: 8, windowMs: 15 * 60_000, cooldownMs: 2_000 } satisfies RatePolicy,
  sale: { max: 40, windowMs: 60_000, cooldownMs: 1_200 } satisfies RatePolicy,
  purchase: { max: 25, windowMs: 60_000, cooldownMs: 1_500 } satisfies RatePolicy,
  returnAction: { max: 20, windowMs: 60_000, cooldownMs: 1_500 } satisfies RatePolicy,
  shopUpdate: { max: 15, windowMs: 5 * 60_000, cooldownMs: 2_500 } satisfies RatePolicy,
  partyWrite: { max: 25, windowMs: 5 * 60_000, cooldownMs: 800 } satisfies RatePolicy,
} as const

function banglaWait(sec: number) {
  if (sec <= 60) return `${sec} সেকেন্ড পর আবার চেষ্টা করুন`
  const m = Math.ceil(sec / 60)
  return `${m} মিনিট পর আবার চেষ্টা করুন`
}

/**
 * Throws RateLimitError if the bucket is exhausted or still in cooldown.
 * Call immediately before the protected action; only call `commitRateLimit` after success
 * if you use try/peek — or use `takeRateLimit` which records immediately.
 */
export function takeRateLimit(bucketKey: string, policy: RatePolicy): void {
  const now = Date.now()
  const state = load(bucketKey)
  state.hits = state.hits.filter((t) => now - t < policy.windowMs)

  if (policy.cooldownMs && state.lastAt && now - state.lastAt < policy.cooldownMs) {
    const wait = Math.ceil((policy.cooldownMs - (now - state.lastAt)) / 1000)
    throw new RateLimitError(
      `অনেকবার চেষ্টা হয়েছে। ${banglaWait(Math.max(1, wait))}।`,
      Math.max(1, wait),
    )
  }

  if (state.hits.length >= policy.max) {
    const oldest = state.hits[0] ?? now
    const wait = Math.ceil((policy.windowMs - (now - oldest)) / 1000)
    throw new RateLimitError(
      `সীমা শেষ। ${banglaWait(Math.max(1, wait))}।`,
      Math.max(1, wait),
    )
  }

  state.hits.push(now)
  state.lastAt = now
  save(bucketKey, state)
}

/** Seconds until the bucket allows another attempt (0 = ready). */
export function rateLimitRetryAfter(bucketKey: string, policy: RatePolicy): number {
  const now = Date.now()
  const state = load(bucketKey)
  state.hits = state.hits.filter((t) => now - t < policy.windowMs)
  let wait = 0
  if (policy.cooldownMs && state.lastAt) {
    wait = Math.max(wait, policy.cooldownMs - (now - state.lastAt))
  }
  if (state.hits.length >= policy.max && state.hits[0] != null) {
    wait = Math.max(wait, policy.windowMs - (now - state.hits[0]))
  }
  return wait > 0 ? Math.ceil(wait / 1000) : 0
}

export function otpSendKey(email: string) {
  return `otp-send:${email.trim().toLowerCase()}`
}

export function otpVerifyKey(email: string) {
  return `otp-verify:${email.trim().toLowerCase()}`
}
