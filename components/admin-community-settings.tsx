'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, LinkIcon } from 'lucide-react'
import {
  getCommunityWhatsappUrl,
  setCommunityWhatsappUrl,
} from '@/lib/data-store'

interface AdminCommunitySettingsProps {
  language: 'en' | 'bn'
}

const translations = {
  en: {
    title: 'Community Settings',
    description: 'Manage WhatsApp community link',
    whatsappUrl: 'WhatsApp Community URL',
    placeholder: 'https://chat.whatsapp.com/...',
    save: 'Save Settings',
    saving: 'Saving...',
    success: 'Settings saved successfully',
    error: 'Failed to save settings',
    optional: '(Optional - can use env variable NEXT_PUBLIC_COMMUNITY_WHATSAPP_URL)',
    urlFormat: 'Must be a valid WhatsApp community URL',
    current: 'Current URL:',
    none: 'No URL set (using environment variable if available)',
  },
  bn: {
    title: 'কমিউনিটি সেটিংস',
    description: 'হোয়াটসঅ্যাপ কমিউনিটি লিংক পরিচালনা করুন',
    whatsappUrl: 'হোয়াটসঅ্যাপ কমিউনিটি URL',
    placeholder: 'https://chat.whatsapp.com/...',
    save: 'সেটিংস সংরক্ষণ করুন',
    saving: 'সংরক্ষণ করা হচ্ছে...',
    success: 'সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে',
    error: 'সেটিংস সংরক্ষণ করতে ব্যর্থ',
    optional: '(ঐচ্ছিক - পরিবেশ ভেরিয়েবল NEXT_PUBLIC_COMMUNITY_WHATSAPP_URL ব্যবহার করতে পারেন)',
    urlFormat: 'অবশ্যই একটি বৈধ হোয়াটসঅ্যাপ কমিউনিটি URL হতে হবে',
    current: 'বর্তমান URL:',
    none: 'কোনো URL সেট নেই (উপলব্ধ থাকলে পরিবেশ ভেরিয়েবল ব্যবহার করছে)',
  },
}

export function AdminCommunitySettings({
  language,
}: AdminCommunitySettingsProps) {
  const t = translations[language]
  const { toast } = useToast()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load current URL
  useEffect(() => {
    const loadUrl = async () => {
      try {
        setLoading(true)
        const currentUrl = await getCommunityWhatsappUrl()
        setUrl(currentUrl || '')
      } catch (error) {
        console.error('Error loading WhatsApp URL:', error)
        toast({
          title: 'Error',
          description: t.error,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadUrl()
  }, [language, t, toast])

  const handleSave = async () => {
    try {
      // Validate URL if not empty
      if (url && !url.startsWith('https://chat.whatsapp.com/')) {
        toast({
          title: 'Invalid URL',
          description: t.urlFormat,
          variant: 'destructive',
        })
        return
      }

      setSaving(true)
      await setCommunityWhatsappUrl(url || '')
      toast({
        title: 'Success',
        description: t.success,
      })
    } catch (error) {
      console.error('Error saving WhatsApp URL:', error)
      toast({
        title: 'Error',
        description: t.error,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t.title}</h2>
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            {t.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t.description}
          </p>
        </div>

        {/* Current URL Info */}
        <div className="card-glass p-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.current}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 break-all">
            {url ? url : t.none}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="whatsapp-url" className="text-sm font-medium">
              {t.whatsappUrl}
            </Label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t.optional}
            </p>
          </div>
          <Input
            id="whatsapp-url"
            type="url"
            placeholder={t.placeholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={saving}
            className="font-mono text-sm"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
           E.g., https://chat.whatsapp.com/...
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t.saving}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t.save}
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
