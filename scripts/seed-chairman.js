/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js')

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const email = process.env.CHAIRMAN_EMAIL || 'chairman@steps.local'
  const password = process.env.CHAIRMAN_PASSWORD || 'ChangeMe123!'
  const full_name = process.env.CHAIRMAN_NAME || 'STEPS Chairman'
  const phone = process.env.CHAIRMAN_PHONE || '01XXXXXXXXX'

  const supabase = createClient(url, serviceKey)

  // Create auth user (idempotent)
  let userId = null
  const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
  const found = (existing?.users || []).find((u) => u.email === email)
  if (found) {
    userId = found.id
    console.log('Auth user already exists:', email)
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw error
    userId = data.user.id
    console.log('Created auth user:', email)
  }

  // Upsert profile
  const { error: upErr } = await supabase.from('profiles').upsert({
    id: userId,
    full_name,
    phone,
    role: 'chairman',
    approved: true,
  })
  if (upErr) throw upErr

  console.log('Chairman profile ready ✅')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
