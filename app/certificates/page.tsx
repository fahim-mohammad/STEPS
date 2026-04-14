'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

type Cert = {
  certificate_id: string
  recipient_name: string
  recipient_email: string
  certificate_type: string
  role_title: string
  issue_date: string
  status: string
}

export default function CertificatesPage() {
  const [q, setQ] = useState('')
  const [year, setYear] = useState('')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Cert[]>([])

  const load = async (query = q, y = year) => {
    setLoading(true)
    try {
      const url = new URL('/api/certificates/public', window.location.origin)
      if (query.trim()) url.searchParams.set('q', query.trim())
      if (y.trim()) url.searchParams.set('year', y.trim())

      const res = await fetch(url.toString(), { cache: 'no-store' })
      const json = await res.json()
      setRows(Array.isArray(json?.data) ? json.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load('', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="container mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold">Certificate Registry</h1>
        <p className="mt-2 text-sm text-slate-600">
          Search public STEPS certificates by ID, name, email, or year.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_180px_120px]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by certificate ID, name, or email"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none"
          />
          <input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Year"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none"
          />
          <button
            onClick={() => load()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-3 font-medium text-white"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3">Certificate ID</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Verify</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={7}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={7}>
                    No certificates found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.certificate_id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium">{row.certificate_id}</td>
                    <td className="px-4 py-3">{row.recipient_name}</td>
                    <td className="px-4 py-3">{row.recipient_email}</td>
                    <td className="px-4 py-3">{row.certificate_type}</td>
                    <td className="px-4 py-3">{row.role_title}</td>
                    <td className="px-4 py-3">{row.issue_date}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/verify/${encodeURIComponent(row.certificate_id)}`}
                        className="text-blue-600 underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}