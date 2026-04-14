import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

export const runtime = 'nodejs'

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const kind = url.searchParams.get('kind') || 'misc'

    const form = await req.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const ext = path.extname(file.name || '').toLowerCase() || '.png'
    const base = safeName(path.basename(file.name || 'upload', ext))
    const fileName = `${Date.now()}_${base}${ext}`

    const storageRoot = path.join(process.cwd(), 'storage')
    const dir = path.join(storageRoot, kind)
    await fs.mkdir(dir, { recursive: true })

    const full = path.join(dir, fileName)
    await fs.writeFile(full, bytes)

    const publicUrl = `/api/files/${encodeURIComponent(kind)}/${encodeURIComponent(fileName)}`
    return NextResponse.json({ url: publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}
