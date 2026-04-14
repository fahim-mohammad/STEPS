import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

export const runtime = 'nodejs'

function contentTypeFromExt(ext: string) {
  switch (ext) {
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    case '.svg':
      return 'image/svg+xml'
    case '.pdf':
      return 'application/pdf'
    default:
      return 'application/octet-stream'
  }
}

export async function GET(_req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path: routePath } = await context.params
  try {
    const parts = routePath || []
    if (parts.length < 2) return new NextResponse('Not found', { status: 404 })

    const kind = parts[0]
    const file = parts.slice(1).join('/')

    const fullPath = path.join(process.cwd(), 'storage', kind, file)
    const data = await fs.readFile(fullPath)

    const ext = path.extname(fullPath).toLowerCase()
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentTypeFromExt(ext),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
