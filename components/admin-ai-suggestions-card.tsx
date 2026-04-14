"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"
import { useTranslations } from "@/lib/translations"

type Props = {
  language: "en" | "bn"
  fundBalance: number
  pendingMembers: number
  missingContributors: number
  fundHealthLabel?: string | null
}

function injectVars(template: string, vars: Record<string, string | number>) {
  let out = template
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`\${${k}}`, String(v))
  }
  return out
}

export function AdminAISuggestionsCard({
  language,
  fundBalance,
  pendingMembers,
  missingContributors,
  fundHealthLabel,
}: Props) {
  const { t } = useTranslations(language)

  const suggestions = useMemo(() => {
    const out: string[] = []

    if (pendingMembers > 0) {
      out.push(`${pendingMembers} member${pendingMembers > 1 ? 's' : ''} are waiting for approval. Review and approve them from Admin Members.`)
    }

    if (missingContributors > 0) {
      out.push(`${missingContributors} member${missingContributors > 1 ? 's' : ''} have not contributed this month. Consider sending a reminder.`)
    }

    if (fundBalance <= 0) {
      out.push('Fund balance is low. Review expenses and ensure contributions are up to date.')
    }

    if (!out.length) {
      out.push('Everything looks stable. Keep approvals and contributions up to date.')
    }

    return out
  }, [pendingMembers, missingContributors, fundBalance])

  return (
    <Card className="card-glass">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Suggestions
        </CardTitle>

        {fundHealthLabel ? (
          <Badge variant="outline" className="truncate max-w-[160px]">
            {fundHealthLabel}
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent>
        <ul className="space-y-2 text-sm">
          {suggestions.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
              <span className="text-muted-foreground leading-relaxed">
                {s}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}