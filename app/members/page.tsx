'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { getDirectoryMembers, type DirectoryMemberRow } from '@/lib/data-store'

export default function MembersDirectoryPage() {
  const { user, isLoading } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [rows, setRows] = useState<DirectoryMemberRow[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('steps_language')
      setLanguage(savedLang === 'bn' ? 'bn' : 'en')
    } catch {}
  }, [])

  useEffect(() => {
    if (!isLoading && user) {
      getDirectoryMembers().then(setRows)
    }
  }, [isLoading, user])

  const leadership = useMemo(
    () => rows.filter((r) => r.role === 'chairman' || r.role === 'accountant'),
    [rows]
  )

  // changed here: show all approved users including yourself
  const members = useMemo(() => rows, [rows])

  const filteredMembers = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return members
    return members.filter((m) => (m.name || '').toLowerCase().includes(query))
  }, [members, q])

  if (isLoading || !user) return null

  return (
    <div className="min-h-screen">
      <Navbar
        language={language}
        onLanguageChange={(l) => {
          setLanguage(l)
          localStorage.setItem('steps_language', l)
        }}
      />

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">
            {language === 'bn' ? 'মেম্বারস ডিরেক্টরি' : 'Members Directory'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {language === 'bn'
              ? 'লিডারশিপ ও অনুমোদিত সদস্যদের দেখুন'
              : 'View leadership and approved members'}
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            {language === 'bn' ? 'লিডারশিপ' : 'Leadership'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leadership.map((p) => (
              <Link
                key={p.id}
                href={`/members/${p.id}`}
                className="card-glass p-4 rounded-xl border hover:shadow-sm transition"
              >
                <div className="flex gap-3">
                  <img
                    src={p.photo_url || '/placeholder-user.svg'}
                    alt={p.name}
                    className="h-14 w-14 rounded-lg object-cover border"
                  />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.role === 'chairman'
                        ? language === 'bn'
                          ? 'চেয়ারম্যান'
                          : 'Chairman'
                        : language === 'bn'
                        ? 'হিসাবরক্ষক'
                        : 'Accountant'}
                    </div>
                    {p.bio && (
                      <div className="text-sm mt-2 line-clamp-2 text-muted-foreground">
                        {p.bio}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">
              {language === 'bn' ? 'সব সদস্য' : 'All Members'}
            </h2>

            <input
              className="border rounded px-3 py-2 w-full md:w-72 bg-background"
              placeholder={language === 'bn' ? 'নাম দিয়ে সার্চ করুন' : 'Search by name'}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="overflow-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 dark:bg-muted/20">
                <tr>
                  <th className="text-left p-3">{language === 'bn' ? 'নাম' : 'Name'}</th>
                  <th className="text-left p-3">{language === 'bn' ? 'রোল' : 'Role'}</th>
                  <th className="text-right p-3">
                    {language === 'bn' ? 'মোট অবদান' : 'Total Contribution'}
                  </th>
                  <th className="text-right p-3">{language === 'bn' ? 'বিস্তারিত' : 'Details'}</th>
                </tr>
              </thead>

              <tbody>
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={m.photo_url || '/placeholder-user.svg'}
                          alt={m.name}
                          className="h-8 w-8 rounded-md object-cover border"
                        />
                        <span className="font-medium">{m.name}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      {m.role === 'chairman'
                        ? language === 'bn'
                          ? 'চেয়ারম্যান'
                          : 'Chairman'
                        : m.role === 'accountant'
                        ? language === 'bn'
                          ? 'হিসাবরক্ষক'
                          : 'Accountant'
                        : language === 'bn'
                        ? 'সদস্য'
                        : 'Member'}
                    </td>

                    <td className="p-3 text-right">
                      {Number(m.totalContribution || 0).toLocaleString(
                        language === 'bn' ? 'bn-BD' : 'en-US'
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <Link href={`/members/${m.id}`} className="underline">
                        {language === 'bn' ? 'দেখুন' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}

                {filteredMembers.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={4}>
                      {language === 'bn' ? 'কোনো সদস্য পাওয়া যায়নি' : 'No members found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}