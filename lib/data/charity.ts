import { supabaseAdmin } from '@/lib/supabase/admin'

export interface CharityRecord {
  id: string
  amount: number
  description?: string | null
  createdAt: string
  createdBy?: string | null
}

export async function addCharityRecord(input: {
  amount: number
  description?: string
  createdAt?: Date
  createdBy?: string
}): Promise<CharityRecord> {
  if (!input || typeof input.amount !== 'number') throw new Error('Invalid input')
  if (input.amount <= 0) throw new Error('Amount must be greater than zero')

  const payload: any = {
    amount: Math.round(input.amount),
    description: input.description ?? null,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  }

  // If caller provided createdAt, include it (DB column exists: created_at)
  if (input.createdAt) payload.created_at = input.createdAt.toISOString()

  const { data, error } = await supabaseAdmin
    .from('charity_records')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw new Error(error.message || 'Error inserting charity record')

  return {
    id: data.id,
    amount: data.amount,
    description: data.description ?? null,
    createdAt: data.created_at ?? new Date().toISOString(),
    createdBy: input.createdBy ?? null,
  }
}

export async function getCharityRecords(): Promise<CharityRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('charity_records')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message || 'Error fetching charity records')

  return (data || []).map((r: any) => ({
    id: r.id,
    amount: r.amount,
    description: r.description ?? null,
    createdAt: r.created_at ?? new Date().toISOString(),
    createdBy: null,
  }))
}
