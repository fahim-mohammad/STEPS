'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase/client'

function getFileExt(name: string) {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'bin'
}

function getDisplayNameFromPath(pathOrUrl: string) {
  if (!pathOrUrl) return ''
  const clean = pathOrUrl.split('?')[0]
  const parts = clean.split('/')
  return parts[parts.length - 1] || ''
}

export default function AdminCompleteProfilePage() {
  const router = useRouter()
  const { user, isLoading, refresh } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [photoUrl, setPhotoUrl] = useState('')
  const [bio, setBio] = useState('')
  const [signatureUrl, setSignatureUrl] = useState('')
  const [role, setRole] = useState<'chairman' | 'accountant' | 'member'>('member')

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLanguage) setLanguage(savedLanguage)
  }, [])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  useEffect(() => {
    if (isLoading || !user?.id) return

    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('approved, role, photo_url, bio, signature_data_url')
        .eq('id', user.id)
        .single()

      if (error || !data) return

      if (!data.approved) {
        router.push('/pending-approval')
        return
      }

      if (data.role !== 'chairman' && data.role !== 'accountant') {
        router.push('/dashboard')
        return
      }

      setRole(data.role)
      setPhotoUrl(data.photo_url || '')
      setBio(data.bio || '')
      setSignatureUrl(data.signature_data_url || '')
    })()
  }, [user?.id, isLoading, router])

  const uploadPhoto = async () => {
    if (!user?.id || !photoFile) return

    setUploadingPhoto(true)
    setError('')

    try {
      const ext = getFileExt(photoFile.name)
      const filePath = `${user.id}/profile-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, photoFile, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('profile-photos').getPublicUrl(filePath)
      setPhotoUrl(data.publicUrl)
      setPhotoFile(null)
    } catch (err: any) {
      console.error('ADMIN_PROFILE_PHOTO_UPLOAD_ERROR', err)
      setError(err?.message || 'Failed to upload photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const uploadSignature = async () => {
    if (!user?.id || !signatureFile) return

    setUploadingSignature(true)
    setError('')

    try {
      const ext = getFileExt(signatureFile.name)
      const filePath = `${user.id}/signature-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, signatureFile, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      setSignatureUrl(filePath)
      setSignatureFile(null)
    } catch (err: any) {
      console.error('ADMIN_SIGNATURE_UPLOAD_ERROR', err)
      setError(err?.message || 'Failed to upload signature.')
    } finally {
      setUploadingSignature(false)
    }
  }

  const canSave = Boolean(photoUrl.trim() && bio.trim() && signatureUrl.trim())

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!user?.id) {
      setError('User not found.')
      return
    }

    if (!canSave) {
      setError('Please fill all required fields.')
      return
    }

    setSaving(true)

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          photo_url: photoUrl.trim(),
          bio: bio.trim(),
          signature_data_url: signatureUrl.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      const { error: leadershipError } = await supabase
        .from('leadership_profiles')
        .upsert(
          {
            user_id: user.id,
            full_name: user.name || '',
            role,
            photo_url: photoUrl.trim(),
            bio: bio.trim(),
          },
          { onConflict: 'user_id' }
        )

      if (leadershipError) throw leadershipError

      await refresh()
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Failed to save admin profile.')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">{t('loading')}</div>
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-12 flex-1 flex items-center justify-center">
        <Card className="w-full max-w-2xl card-glass">
          <CardHeader>
            <CardTitle>{language === 'bn' ? 'অ্যাডমিন প্রোফাইল সম্পূর্ণ করুন' : 'Complete Admin Profile'}</CardTitle>
            <CardDescription>
              {language === 'bn'
                ? 'চেয়ারম্যান বা একাউন্ট্যান্ট হিসেবে আপনার প্রোফাইল সম্পূর্ণ করুন'
                : 'Complete your profile as Chairman or Accountant'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              {error ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'bn' ? 'ছবি আপলোড করুন' : 'Upload Photo'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-white/20 bg-background/30 px-3 py-2"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="btn-glass"
                    disabled={!photoFile || uploadingPhoto}
                    onClick={uploadPhoto}
                  >
                    {uploadingPhoto
                      ? language === 'bn'
                        ? 'আপলোড হচ্ছে...'
                        : 'Uploading...'
                      : language === 'bn'
                        ? 'ছবি আপলোড'
                        : 'Upload Photo'}
                  </Button>
                </div>
                {photoUrl ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {language === 'bn' ? 'আপলোড সম্পন্ন হয়েছে' : 'Upload completed'}
                    </p>
                    <img
                      src={photoUrl}
                      alt="Admin profile"
                      className="h-24 w-24 rounded-xl object-cover border border-white/20"
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'bn' ? 'সংক্ষিপ্ত বায়ো' : 'Short Bio'}
                </label>
                <Input value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'bn' ? 'স্বাক্ষর আপলোড করুন' : 'Upload Signature'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-white/20 bg-background/30 px-3 py-2"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="btn-glass"
                    disabled={!signatureFile || uploadingSignature}
                    onClick={uploadSignature}
                  >
                    {uploadingSignature
                      ? language === 'bn'
                        ? 'আপলোড হচ্ছে...'
                        : 'Uploading...'
                      : language === 'bn'
                        ? 'স্বাক্ষর আপলোড'
                        : 'Upload Signature'}
                  </Button>
                </div>
                {signatureUrl ? (
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? 'আপলোড সম্পন্ন হয়েছে:' : 'Uploaded:'}{' '}
                    {getDisplayNameFromPath(signatureUrl)}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                className="btn-glass w-full"
                disabled={!canSave || saving || uploadingPhoto || uploadingSignature}
              >
                {saving
                  ? language === 'bn'
                    ? 'সেভ হচ্ছে...'
                    : 'Saving...'
                  : language === 'bn'
                    ? 'অ্যাডমিন প্রোফাইল সেভ করুন'
                    : 'Save Admin Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}