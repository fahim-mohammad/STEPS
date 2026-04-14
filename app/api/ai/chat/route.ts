export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

const API_KEY = (process.env.GEMINI_API_KEY || '').trim()
const DEFAULT_MODEL = (process.env.GEMINI_MODEL || 'gemini-1.5-flash').trim()

const FALLBACK_MODELS = Array.from(
  new Set(
    [
      DEFAULT_MODEL,
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash',
    ].filter(Boolean)
  )
)

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

function looksSensitive(prompt: string) {
  const p = prompt.toLowerCase()

  const deny = [
    'loan',
    'outstandingloan',
    'borrower',
    'nid',
    'national id',
    'passport',
    'user_id',
    'userid',
    'uuid',
    'auth.users',
    'profiles.id',
    'phone:',
    'email:',
    'address',
    'bank account',
    'account number',
    'bkash',
    'transaction id',
  ]

  return deny.some((k) => p.includes(k))
}

async function callGemini(model: string, prompt: string) {
  const url = `${BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(API_KEY)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 700,
      },
    }),
  })

  const json = await res.json().catch(() => null)

  return {
    ok: res.ok,
    status: res.status,
    json,
    model,
  }
}

function extractGeminiText(payload: any): string {
  const parts = payload?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''

  return parts
    .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim()
}

function explainGeminiFailure(payload: any): string {
  const apiErr = payload?.error?.message
  if (typeof apiErr === 'string' && apiErr.trim()) return apiErr.trim()

  const blockReason = payload?.promptFeedback?.blockReason
  if (blockReason) return `Gemini blocked the prompt: ${blockReason}`

  const finishReason = payload?.candidates?.[0]?.finishReason
  if (finishReason && finishReason !== 'STOP') {
    return `Gemini finished without usable text: ${finishReason}`
  }

  return 'Gemini returned no usable text.'
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const prompt = String(body?.prompt || '').trim()

    if (!prompt) {
      return NextResponse.json({ ok: false, error: 'prompt required' }, { status: 400 })
    }

    if (prompt.length > 8000) {
      return NextResponse.json({ ok: false, error: 'prompt too long' }, { status: 400 })
    }

    if (looksSensitive(prompt)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'This request contains sensitive/private info. Please ask without loans, IDs, phone/email, or account details.',
        },
        { status: 400 }
      )
    }

    if (!API_KEY) {
      return NextResponse.json(
        { ok: false, error: 'Missing GEMINI_API_KEY in .env.local' },
        { status: 500 }
      )
    }

    let lastFailure: any = null

    for (const model of FALLBACK_MODELS) {
      const result = await callGemini(model, prompt)

      if (!result.ok) {
        lastFailure = {
          model,
          status: result.status,
          error: explainGeminiFailure(result.json),
          raw: result.json,
        }
        continue
      }

      const text = extractGeminiText(result.json)

      if (text) {
        return NextResponse.json(
          {
            ok: true,
            text,
            modelUsed: model,
          },
          { status: 200 }
        )
      }

      lastFailure = {
        model,
        status: result.status,
        error: explainGeminiFailure(result.json),
        raw: result.json,
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: lastFailure?.error || 'Gemini failed.',
        detail: lastFailure || null,
      },
      { status: 502 }
    )
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || 'Failed',
      },
      { status: 500 }
    )
  }
}