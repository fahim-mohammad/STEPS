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
      'gemini-1.0-pro',
    ].filter(Boolean)
  )
)

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

async function callModel(apiKey: string, model: string, prompt: string) {
  const url = `${BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

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
  return { ok: res.ok, status: res.status, json, model }
}

function extractText(payload: any): string {
  const candidateText =
    payload?.candidates?.[0]?.content?.parts
      ?.map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      ?.join('') || ''

  if (candidateText.trim()) return candidateText.trim()

  const alt1 = payload?.text
  if (typeof alt1 === 'string' && alt1.trim()) return alt1.trim()

  const alt2 = payload?.output_text
  if (typeof alt2 === 'string' && alt2.trim()) return alt2.trim()

  return ''
}

function summarizeBlocked(payload: any): string | null {
  const reason = payload?.promptFeedback?.blockReason
  if (reason) return `Gemini blocked the prompt: ${reason}`

  const finishReason = payload?.candidates?.[0]?.finishReason
  if (finishReason && finishReason !== 'STOP') {
    return `Gemini finished without text: ${finishReason}`
  }

  return null
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const prompt = String(body?.prompt || '').trim()

    if (!prompt) {
      return NextResponse.json({ ok: false, error: 'Missing prompt' }, { status: 400 })
    }

    if (!API_KEY) {
      return NextResponse.json(
        { ok: false, error: 'Missing GEMINI_API_KEY in .env.local' },
        { status: 500 }
      )
    }

    let lastFailure: any = null

    for (const model of FALLBACK_MODELS) {
      const result = await callModel(API_KEY, model, prompt)

      if (!result.ok) {
        lastFailure = {
          model,
          status: result.status,
          error:
            result.json?.error?.message ||
            result.json?.message ||
            'Model request failed',
          raw: result.json,
        }
        continue
      }

      const text = extractText(result.json)
      if (text) {
        return NextResponse.json({
          ok: true,
          text,
          modelUsed: model,
        })
      }

      const blocked = summarizeBlocked(result.json)

      lastFailure = {
        model,
        status: result.status,
        error: blocked || 'Gemini returned success but no text',
        raw: result.json,
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Gemini returned no usable text.',
        detail: lastFailure,
      },
      { status: 502 }
    )
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'AI error' },
      { status: 500 }
    )
  }
}