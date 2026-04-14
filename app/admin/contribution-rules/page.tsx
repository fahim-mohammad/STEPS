"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BackToDashboardButton } from "@/components/back-to-dashboard-button"
import { getContributionRule, setContributionRule } from "@/lib/data-store"
import { useTranslations } from "@/lib/translations"
import { DollarSign, Save } from "lucide-react"

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

export default function ContributionRulesPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()
  const [language, setLanguage] = useState<"en" | "bn">("en")
  const { t } = useTranslations(language)

  const [year, setYear] = useState(new Date().getFullYear())
  const [defaultAmount, setDefaultAmount] = useState<number>(0)
  const [overrides, setOverrides] = useState<{ month: number; amount: number }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)

  const isAdmin = effectiveRole === "chairman" || effectiveRole === "accountant"

  useEffect(() => {
    const savedLanguage = (localStorage.getItem("steps_language") as "en" | "bn" | null) ?? "en"
    setLanguage(savedLanguage)

    if (!isLoading && !user) router.push("/signin")
    else if (!isLoading && !isAdmin) router.push("/dashboard")
  }, [user, isLoading, isAdmin, router])

  useEffect(() => {
    const loadRule = async () => {
      try {
        setLoading(true)
        setError(null)
        const rule = await getContributionRule(year)
        if (rule) {
          setDefaultAmount(Number(rule.defaultMonthlyAmount || 0))
          setOverrides(Array.isArray(rule.overrides) ? rule.overrides : [])
        } else {
          setDefaultAmount(0)
          setOverrides([])
        }
      } catch (e) {
        console.error("loadRule error:", e)
        setError(t("failedLoadRule"))
      } finally {
        setLoading(false)
      }
    }
    loadRule()
  }, [year, language])

  const handleLanguageChange = (newLang: "en" | "bn") => {
    setLanguage(newLang)
    localStorage.setItem("steps_language", newLang)
  }

  const overrideValue = (monthNum: number) => overrides.find((o) => o.month === monthNum)?.amount ?? 0

  const setOverride = (monthNum: number, amount: number) => {
    setOverrides((prev) => {
      const next = [...prev]
      const idx = next.findIndex((x) => x.month === monthNum)

      // If empty/0 -> remove override (use default)
      if (!amount || amount <= 0) {
        if (idx >= 0) next.splice(idx, 1)
        return next
      }

      if (idx >= 0) next[idx] = { month: monthNum, amount }
      else next.push({ month: monthNum, amount })

      next.sort((a, b) => a.month - b.month)
      return next
    })
  }

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 7 }, (_, i) => now - 2 + i)
  }, [])

  const handleSave = async () => {
    if (!user) return
    if (!defaultAmount || defaultAmount <= 0) {
      setError(t("defaultAmountMustBePositive"))
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    const ok = await setContributionRule({
      year,
      defaultMonthlyAmount: Number(defaultAmount || 0),
      overrides,
    })

    if (!ok) {
      setError(t('auto_failed_to_save_rule'))
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)
    setTimeout(() => setSuccess(false), 2500)
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-4">
          <BackToDashboardButton label={t('auto_back_253518')} />
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{t('auto_contribution_rules')}</h1>
          <p className="text-muted-foreground">
            {t('auto_set_default_and_monthly_contribution_amo')}
          </p>
        </div>

        {error && (
          <Card className="mb-4 border-red-300 card-glass">
            <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
          </Card>
        )}

        {success && (
          <Card className="mb-4 border-green-300 card-glass bg-green-50 dark:bg-green-950">
            <CardContent className="py-4 text-sm text-green-700 dark:text-green-200">
              {t('auto_rule_saved_successfully')}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 card-glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              {t('auto_year_selection')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-center">
              <label className="text-sm font-medium">{t('auto_year_4c9efa')}</label>

              {/* ✅ solid non-transparent native select */}
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-10 rounded-md px-3 border border-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y} className="bg-background text-foreground">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>
              {t('auto_contribution_amounts_for_year')}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('auto_default_monthly_amount')}
              </label>
              <Input
                type="number"
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(Number(e.target.value))}
                min={0}
                step={100}
                className="bg-background"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">
                {t('auto_monthly_overrides_optional')}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MONTHS.map((m, idx) => {
                  const monthNum = idx + 1
                  return (
                    <div key={monthNum}>
                      <label className="text-xs text-muted-foreground block mb-1">{m}</label>
                      <Input
                        type="number"
                        placeholder="0 (use default)"
                        value={overrideValue(monthNum) ? String(overrideValue(monthNum)) : ""}
                        onChange={(e) => setOverride(monthNum, Number(e.target.value) || 0)}
                        min={0}
                        step={100}
                        className="bg-background text-sm"
                        disabled={saving}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" className="btn-glass" onClick={() => window.location.reload()} disabled={saving}>
                {t('auto_reset')}
              </Button>
              <Button className="btn-glass" onClick={handleSave} disabled={saving || defaultAmount <= 0}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? (t('auto_saving')) : (t('auto_save_rules'))}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
