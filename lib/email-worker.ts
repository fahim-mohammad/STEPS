// Lightweight in-memory email queue with throttling and retry
import sendReceiptEmailByContributionId from './email'
import { supabaseServer } from './supabase/serverClient'
import { supabase } from './supabaseClient';

type QueueItem = { contributionId: string; type: 'approved' | 'submitted'; attempts?: number }

const QUEUE: QueueItem[] = []
let processing = false

const RATE_LIMIT_PER_MIN = Number(process.env.EMAIL_RATE_PER_MIN || '60') // emails per minute
const INTERVAL_MS = Math.max(200, Math.floor(60000 / Math.max(1, RATE_LIMIT_PER_MIN)))

export function enqueueEmail(item: QueueItem) {
  QUEUE.push({ ...item, attempts: 0 })
  if (!processing) processQueue()
}

async function processQueue() {
  processing = true
  while (QUEUE.length > 0) {
    const item = QUEUE.shift()!
    try {
      await attemptSend(item)
    } catch (e) {
      console.error('Email worker fatal error:', e)
    }
    // wait per rate limit
    await new Promise((r) => setTimeout(r, INTERVAL_MS))
  }
  processing = false
}

async function attemptSend(item: QueueItem) {
  const maxAttempts = 3
  let attempts = item.attempts ?? 0
  let lastError: any = null
  while (attempts < maxAttempts) {
    try {
      const res = await sendReceiptEmailByContributionId(item.contributionId)
      if (res?.ok) return true
      attempts++
      lastError = res?.error || null
      const backoff = 500 * Math.pow(2, attempts)
      await new Promise((r) => setTimeout(r, backoff))
    } catch (e) {
      attempts++
      lastError = e
      const backoff = 500 * Math.pow(2, attempts)
      await new Promise((r) => setTimeout(r, backoff))
    }
  }
  console.error('Failed to send email after retries for', item.contributionId)
  // Persist failure to DB for later inspection
  try {
    await supabase.from('email_failures').insert([{
      to_email: null, // unknown here; payload may include recipient
      subject: 'receipt',
      payload: { contributionId: item.contributionId },
      error_message: typeof lastError === 'string' ? lastError : (lastError?.message || JSON.stringify(lastError)),
      retry_count: attempts,
      last_attempt: new Date().toISOString(),
    }])
  } catch (dbErr) {
    console.error('Failed to log email failure to DB:', dbErr)
  }
  return false
}

export default { enqueueEmail }
