'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase/client'
import SignaturePad from '@/components/signature-pad'

function getFileExt(name: string) {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'bin'
}

export default function CompleteProfilePage() {
  const router = useRouter()
  const { user, isLoading, refresh } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [photoUrl, setPhotoUrl] = useState('')
  const [nidNumber, setNidNumber] = useState('')
  const [institution, setInstitution] = useState('')
  const [subject, setSubject] = useState('')
  const [bio, setBio] = useState('')
  const [signatureUrl, setSignatureUrl] = useState('')

  const [role, setRole] = useState<'member' | 'chairman' | 'accountant'>('member')
  const [approved, setApproved] = useState(false)

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
        .select(
          'approved, role, photo_url, nid_number, current_institution, current_subject, bio, signature_data_url, profile_completed'
        )
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('COMPLETE_PROFILE_LOAD_ERROR', error)
        return
      }

      if (!data) return

      setApproved(Boolean(data.approved))
      setRole((data.role || 'member') as 'member' | 'chairman' | 'accountant')
      setPhotoUrl(data.photo_url || '')
      setNidNumber(data.nid_number || '')
      setInstitution(data.current_institution || '')
      setSubject(data.current_subject || '')
      setBio(data.bio || '')
      setSignatureUrl(data.signature_data_url || '')

      const needsAdminCompletion =
        (data.role === 'chairman' || data.role === 'accountant') &&
        (!data.bio || !data.signature_data_url)

      if (data.approved === true && data.profile_completed === true && !needsAdminCompletion) {
        router.replace('/dashboard')
      }
    })()
  }, [user?.id, isLoading, router])

  const isAdmin = useMemo(() => role === 'chairman' || role === 'accountant', [role])

  const memberFieldsOk =
    Boolean(photoUrl.trim()) &&
    Boolean(nidNumber.trim()) &&
    Boolean(institution.trim()) &&
    Boolean(subject.trim())

  const adminFieldsOk = !isAdmin || (Boolean(bio.trim()) && Boolean(signatureUrl.trim()))
  const canSubmit = Boolean(memberFieldsOk && adminFieldsOk)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!user?.id) {
      setError('User not found.')
      return
    }

    if (!approved) {
      setError('Your account is not approved yet.')
      return
    }

    if (!memberFieldsOk) {
      setError('Please complete all required member fields.')
      return
    }

    if (!adminFieldsOk) {
      setError('Please complete required admin fields.')
      return
    }

    setSaving(true)

    try {
      const profileUpdates: Record<string, any> = {
        photo_url: photoUrl.trim(),
        nid_number: nidNumber.trim(),
        current_institution: institution.trim(),
        current_subject: subject.trim(),
        profile_completed: true,
        updated_at: new Date().toISOString(),
      }

      if (isAdmin) {
        profileUpdates.bio = bio.trim()
        profileUpdates.signature_data_url = signatureUrl.trim()
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id)

      if (profileError) throw profileError

      if (isAdmin) {
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
      }

      setSuccess('Profile completed successfully.')
      setRedirecting(true)

      await refresh()

      window.location.href = '/dashboard'
      return
    } catch (err: any) {
      console.error('COMPLETE_PROFILE_SAVE_ERROR', err)
      setError(err?.message || 'Failed to save profile.')
      setRedirecting(false)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-10 flex-1">
        <div className="max-w-3xl mx-auto">
          <Card className="card-glass">
            <CardHeader>
              <CardTitle>
                {language === 'bn' ? 'প্রোফাইল সম্পূর্ণ করুন' : 'Complete Your Profile'}
              </CardTitle>
              <CardDescription>
                {language === 'bn'
                  ? 'ড্যাশবোর্ডে যাওয়ার আগে প্রয়োজনীয় তথ্য পূরণ করুন।'
                  : 'Fill in the required details before going to the dashboard.'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSave} className="space-y-5">
                {error ? (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700">
                    {success}
                  </div>
                ) : null}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {language === 'bn' ? 'ছবি আপলোড করুন' : 'Upload Photo'}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0] || null
                        setPhotoFile(file)
                        if (!file) return

                        setUploadingPhoto(true)
                        setError('')

                        try {
                          if (!user?.id) throw new Error('User not found')

                          const ext = getFileExt(file.name)
                          const filePath = `${user.id}/profile-${Date.now()}.${ext}`

                          const { error: uploadError } = await supabase.storage
                            .from('profile-photos')
                            .upload(filePath, file, {
                              cacheControl: '3600',
                              upsert: true,
                            })

                          if (uploadError) throw uploadError

                          const { data } = supabase.storage.from('profile-photos').getPublicUrl(filePath)
                          setPhotoUrl(data.publicUrl)
                          setPhotoFile(null)
                        } catch (err: any) {
                          console.error('PROFILE_PHOTO_UPLOAD_ERROR', err)
                          setError(err?.message || 'Failed to upload photo.')
                        } finally {
                          setUploadingPhoto(false)
                        }
                      }}
                      className="w-full rounded-lg border border-white/20 bg-background/30 px-3 py-2"
                    />
                    {photoUrl ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {language === 'bn' ? 'আপলোড সম্পন্ন হয়েছে' : 'Upload completed'}
                        </p>
                        <img
                          src={photoUrl}
                          alt="Profile"
                          className="h-24 w-24 rounded-xl object-cover border border-white/20"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {language === 'bn' ? 'NID নম্বর' : 'NID Number'}
                    </label>
                    <Input value={nidNumber} onChange={(e) => setNidNumber(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {language === 'bn' ? 'শিক্ষাপ্রতিষ্ঠান' : 'Institution'}
                    </label>
                    <Input value={institution} onChange={(e) => setInstitution(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {language === 'bn' ? 'বিষয়' : 'Subject'}
                    </label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                </div>

                {isAdmin ? (
                  <div className="grid md:grid-cols-1 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {language === 'bn' ? 'সংক্ষিপ্ত বায়ো' : 'Short Bio'}
                      </label>
                      <Input value={bio} onChange={(e) => setBio(e.target.value)} />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">
                        {language === 'bn' ? 'ডিজিটাল স্বাক্ষর দিন' : 'Draw Digital Signature'}
                      </label>

                      <SignaturePad
                        initialValue={signatureUrl || null}
                        onSaveAction={async (dataUrl: string) => {
                          const res = await fetch('/api/profile/signature', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ signatureDataUrl: dataUrl }),
                          })

                          const json = await res.json()
                          if (!res.ok || !json?.ok) {
                            throw new Error(json?.error || 'Failed to save signature')
                          }

                          setSignatureUrl(dataUrl)
                          setSuccess(
                            language === 'bn'
                              ? 'স্বাক্ষর সফলভাবে সেভ হয়েছে।'
                              : 'Signature saved successfully.'
                          )
                        }}
                      />

                      {signatureUrl ? (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {language === 'bn' ? 'বর্তমান স্বাক্ষর' : 'Current signature'}
                          </p>
                          <img
                            src={signatureUrl}
                            alt="Signature preview"
                            className="h-20 rounded-md border bg-white object-contain px-2 py-1"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="btn-glass w-full"
                  disabled={saving || uploadingPhoto || redirecting || !canSubmit}
                >
                  {saving || redirecting
                    ? language === 'bn'
                      ? 'সেভ হচ্ছে...'
                      : 'Saving...'
                    : language === 'bn'
                      ? 'প্রোফাইল সম্পূর্ণ করুন'
                      : 'Complete Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}