#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

async function run() {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.SUPABASE_URL
  if (!dbUrl) {
    console.error('Please set DATABASE_URL or SUPABASE_DB_URL to run migrations')
    process.exit(1)
  }

  const client = new Client({ connectionString: dbUrl })
  await client.connect()

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  if (!fs.existsSync(migrationsDir)) {
    console.error('No migrations directory found at', migrationsDir)
    process.exit(1)
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  for (const file of files) {
    const full = path.join(migrationsDir, file)
    const sql = fs.readFileSync(full, 'utf8')
    console.log('Running migration', file)
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('COMMIT')
      console.log('Applied', file)
    } catch (err) {
      await client.query('ROLLBACK')
      console.error('Failed migration', file, err)
      await client.end()
      process.exit(1)
    }
  }

  await client.end()
  console.log('All migrations applied')
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
