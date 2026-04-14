export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

async function requireAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role, approved')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  const role = (data as any)?.role
  const approved = (data as any)?.approved
  if (!approved || (role !== 'chairman' && role !== 'accountant')) throw new Error('Admin required')
}

export async function GET(req: NextRequest, context: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await context.params
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)


    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select('pdf_storage_key')
      .eq('certificate_id', certificateId)
      .single()

    if (error || !data?.pdf_storage_key) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    }

    const url = new URL(req.url)
    const origin = `${url.protocol}//${url.host}`
    const fileUrl = `${origin}/api/files/certificates/${encodeURIComponent(data.pdf_storage_key)}`
    return NextResponse.redirect(fileUrl)
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
