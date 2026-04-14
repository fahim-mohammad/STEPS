import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_FILE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.txt',
  '.xml',
  '.pdf',
  '.doc',
  '.docx',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp4',
  '.webm',
]

function isPublicAsset(pathname: string) {
  if (
    pathname.startsWith('/founders/') ||
    pathname.startsWith('/contracts/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/logos/') ||
    pathname === '/logo-light.jpeg' ||
    pathname === '/logo-dark.png' ||
    pathname === '/placeholder-user.svg' ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/public/')
  ) {
    return true
  }

  return PUBLIC_FILE_EXTENSIONS.some((ext) => pathname.toLowerCase().endsWith(ext))
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public assets
  if (isPublicAsset(pathname)) {
    return NextResponse.next()
  }

  // Always allow public pages
  const publicRoutes = ['/', '/signin', '/signup', '/transparency']
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Read session markers from cookies
  const hasSupabaseAccessToken =
    request.cookies.has('sb-access-token') ||
    request.cookies.has('sb:token') ||
    request.cookies.has('supabase-auth-token')

  const hasAnySbCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-'))

  const isLoggedIn = hasSupabaseAccessToken || hasAnySbCookie

  // Protect app pages only
  if (!isLoggedIn) {
    const signinUrl = new URL('/signin', request.url)
    signinUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(signinUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
      Match all request paths except:
      - api routes that should stay public only if they are under /api/public
      - next internals
      - static files by extension
    */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}