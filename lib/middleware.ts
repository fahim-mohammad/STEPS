import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // You will store effective role in cookie or localStorage.
  // Since middleware can't read localStorage, store role in a cookie on switchRole.
  const role = req.cookies.get('steps_effective_role')?.value || 'member'

  const isAdmin = role === 'chairman' || role === 'accountant'

  if (!isAdmin && path.startsWith('/admin')) {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}