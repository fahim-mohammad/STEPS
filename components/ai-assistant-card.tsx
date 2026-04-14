"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "@/lib/translations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase/client"

export function AIAssistantCard({
  language,
  title,
  contextHint,
}: {
  language: "en" | "bn"
  title?: string
  contextHint?: string
}) {
  const { t } = useTranslations(language)

  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const suggestions = useMemo(() => {
    if (language === "bn") {
      return [
        "এই মাসের তহবিল অবস্থা সংক্ষেপে বলো",
        "যারা অবদান দেয়নি তাদের জন্য ভদ্র রিমাইন্ডার মেসেজ বানাও",
        "DPS/FDR ম্যাচিউরিটি সহজ ভাষায় বুঝিয়ে বলো",
      ]
    }

    return [
      "Summarize this month's fund status",
      "Draft a polite reminder message for missing contributors",
      "Explain DPS/FDR maturity in simple terms",
    ]
  }, [language])

  const ask = async (q: string) => {
    setError(null)
    setAnswer(null)
    setLoading(true)

    try {
      const fullPrompt = [contextHint, q].filter(Boolean).join("\n\n")
      const sessionRes = await supabase.auth.getSession()
      const token = sessionRes?.data?.session?.access_token

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          provider: "gemini",
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || data?.ok === false) {
        const detail =
          typeof data?.detail === "string"
            ? data.detail
            : data?.detail
              ? JSON.stringify(data.detail, null, 2)
              : ""

        const message =
          typeof data?.error === "string"
            ? data.error
            : "AI request failed"

        throw new Error(detail ? `${message}\n\n${detail}` : message)
      }

      const text =
        typeof data?.text === "string"
          ? data.text.trim()
          : typeof data?.answer === "string"
            ? data.answer.trim()
            : typeof data?.content === "string"
              ? data.content.trim()
              : ""

      if (!text) {
        throw new Error("AI response was empty")
      }

      setAnswer(text)
    } catch (e: any) {
      setError(String(e?.message || e || "Unknown AI error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="card-glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {title || t("askStepsAi")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <Button
              key={s}
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => ask(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("typeAQuestion")}
          className="min-h-[90px]"
        />

        <Button
          className="w-full"
          disabled={loading || !prompt.trim()}
          onClick={() => ask(prompt.trim())}
        >
          {loading ? t("thinking") : t("ask")}
        </Button>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 whitespace-pre-wrap">
            {error}
          </div>
        ) : null}

        {answer ? (
          <div className="rounded-xl border p-3 text-sm whitespace-pre-wrap bg-background/40">
            {answer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export { AIAssistantCard as AiAssistantCard }