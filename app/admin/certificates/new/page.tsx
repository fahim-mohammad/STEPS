'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { supabase } from '@/lib/supabase/client'

type TemplateKey =
  | 'FOUNDER_LEADERSHIP'
  | 'ADMIN_LEADERSHIP'
  | 'TECHNICAL_CONTRIBUTION'
  | 'FINANCIAL_CONTRIBUTION'
  | 'COMMUNITY_SERVICE'
  | 'SPECIAL_RECOGNITION'

type RolePreset =
  | 'founder'
  | 'chairman'
  | 'accountant'
  | 'developer'
  | 'member'
  | 'volunteer'
  | 'custom'

export default function IssueCertificatePage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [roleTitlePreset, setRoleTitlePreset] = useState<RolePreset>('custom')
  const [templateKey, setTemplateKey] = useState<TemplateKey>('SPECIAL_RECOGNITION')

  const [customMessage, setCustomMessage] = useState('')
  const [useMsg, setUseMsg] = useState(false)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('steps_language')
      setLanguage(saved === 'bn' ? 'bn' : 'en')
    } catch {}
  }, [])

  const handleLanguageChange = (lang: 'en' | 'bn') => {
    setLanguage(lang)
    localStorage.setItem('steps_language', lang)
  }

  useEffect(() => {
    if (isLoading) return
    if (!user) router.push('/signin')
    else if (!isAdmin) router.push('/dashboard')
  }, [isLoading, user, isAdmin, router])

  function roleTitleFromPreset(preset: RolePreset) {
    const map: Record<RolePreset, string> = {
      founder: 'Founder',
      chairman: 'Chairman',
      accountant: 'Accountant',
      developer: 'Technical Development Lead',
      member: 'Sustained Contributor',
      volunteer: 'Volunteer',
      custom: '',
    }
    return map[preset]
  }

  function templateFromPreset(preset: RolePreset): TemplateKey {
    const map: Record<RolePreset, TemplateKey> = {
      founder: 'FOUNDER_LEADERSHIP',
      chairman: 'ADMIN_LEADERSHIP',
      accountant: 'ADMIN_LEADERSHIP',
      developer: 'TECHNICAL_CONTRIBUTION',
      member: 'FINANCIAL_CONTRIBUTION',
      volunteer: 'COMMUNITY_SERVICE',
      custom: 'SPECIAL_RECOGNITION',
    }
    return map[preset]
  }

  function defaultShortMessage() {
    const name = recipientName || 'Recipient'
    const role = roleTitle || 'Special Recognition'

    switch (templateKey) {
      case 'FOUNDER_LEADERSHIP':
        return `${name} is recognized as a Founder of STEPS for vision, discipline, and long-term contribution.`

      case 'ADMIN_LEADERSHIP':
        return `${name} is recognized for responsible administrative leadership, governance, and dedicated service to STEPS as ${role}.`

      case 'TECHNICAL_CONTRIBUTION':
        return `${name} is recognized for outstanding technical contribution, development work, and digital innovation for STEPS as ${role}.`

      case 'FINANCIAL_CONTRIBUTION':
        return `${name} is recognized for sustained financial contribution and meaningful support toward the growth and sustainability of STEPS.`

      case 'COMMUNITY_SERVICE':
        return `${name} is recognized for volunteer service, compassion, and meaningful contribution to community welfare through STEPS.`

      case 'SPECIAL_RECOGNITION':
      default:
        return `${name} is recognized for valuable contribution and meaningful support to STEPS as ${role}.`
    }
  }

  const submit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const token = (await supabase.auth.getSession())?.data?.session?.access_token

      const res = await fetch('/api/admin/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipientName,
          recipientEmail,
          roleTitle,
          templateKey,
          language,
          useAIMessage: useMsg,
          customMessage: useMsg ? customMessage || null : null,
        }),
      })

      const j = await res.json()
      if (!j.ok) throw new Error(j.error || t('errorGeneric'))
      setResult(j)
    } catch (e: any) {
      setError(e?.message || t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return null
  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('issueCertificate')}
        subtitle={t('issueCertificateSubtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
        rightSlot={
          <Link className="underline text-sm" href="/admin/certificates">
            {t('backToCertificates')}
          </Link>
        }
      >
        <Card className="card-glass max-w-3xl">
          <CardHeader>
            <CardTitle>{t('issueCertificate')}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm mb-1">{t('recipientName')}</div>
                <Input
                  className="bg-background"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>

              <div>
                <div className="text-sm mb-1">{t('recipientEmail')}</div>
                <Input
                  className="bg-background"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>

              <div>
                <div className="text-sm mb-1">{t('roleTitle')}</div>
                <div className="space-y-2">
                  <select
                    className="border rounded-md px-3 py-2 w-full bg-background text-sm"
                    value={roleTitlePreset}
                    onChange={(e) => {
                      const v = e.target.value as RolePreset
                      setRoleTitlePreset(v)
                      setTemplateKey(templateFromPreset(v))

                      if (v !== 'custom') {
                        setRoleTitle(roleTitleFromPreset(v))
                      } else {
                        setRoleTitle('')
                      }
                    }}
                  >
                    <option value="founder">Founder</option>
                    <option value="chairman">Administrative Leadership (Chairman)</option>
                    <option value="accountant">Administrative Leadership (Accountant)</option>
                    <option value="developer">Technical Development Lead</option>
                    <option value="member">Sustained Contributor</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="custom">Special Recognition / Custom</option>
                  </select>

                  {roleTitlePreset === 'custom' ? (
                    <Input
                      className="bg-background"
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      placeholder={t('roleTitlePlaceholder')}
                    />
                  ) : null}
                </div>
              </div>

              <div>
                <div className="text-sm mb-1">{t('language')}</div>
                <select
                  className="border rounded-md px-3 py-2 w-full bg-background text-sm"
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'bn')}
                >
                  <option value="en">{t('english')}</option>
                  <option value="bn">{t('bangla')}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="text-sm mb-1">{t('certificateType')}</div>
                <select
                  className="border rounded-md px-3 py-2 w-full bg-background text-sm"
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value as TemplateKey)}
                >
                  <option value="FOUNDER_LEADERSHIP">Founder Certificate Design</option>
                  <option value="ADMIN_LEADERSHIP">Administrative Leadership Design</option>
                  <option value="TECHNICAL_CONTRIBUTION">Technical Contribution Design</option>
                  <option value="FINANCIAL_CONTRIBUTION">Sustained Contribution Design</option>
                  <option value="COMMUNITY_SERVICE">Volunteer / Community Service Design</option>
                  <option value="SPECIAL_RECOGNITION">Special Recognition Design</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useMsg}
                onChange={(e) => {
                  const checked = e.target.checked
                  setUseMsg(checked)
                  if (checked && !customMessage.trim()) {
                    setCustomMessage(defaultShortMessage())
                  }
                }}
              />
              {t('includeShortMessage')}
            </label>

            {useMsg ? (
              <Input
                className="bg-background"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={t('shortMessagePlaceholder')}
              />
            ) : null}

            <Button className="btn-glass" onClick={submit} disabled={loading}>
              {loading ? t('issuing') : t('issueAndEmail')}
            </Button>

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            {result?.data ? (
              <div className="border rounded-md p-3 text-sm space-y-2 bg-background/40">
                <div>
                  <b>{t('issued')}</b>{' '}
                  <span className="font-mono">{result.data.certificate_id}</span>
                </div>

                <div>
                  <b>{t('verify')}</b>{' '}
                  <a
                    className="underline"
                    href={result.verifyUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('openLink')}
                  </a>
                </div>

                <div>
                  <a
                    className="underline"
                    href={`/api/admin/certificates/${encodeURIComponent(
                      result.data.certificate_id
                    )}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('downloadPDF')}
                  </a>
                </div>

                {result.email?.ok === false ? (
                  <div className="text-orange-600">
                    {t('issuedButEmailFailed')}: {String(result.email?.error || '')}
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}