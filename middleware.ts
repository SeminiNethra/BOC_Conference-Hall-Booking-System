import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  
  // Define public paths that don't require authentication
  const publicPaths = ['/']
  const isPublicPath = publicPaths.includes(path)
  
  // Check if the path is for the dashboard or specific meeting routes
  const isProtectedPath = path === '/dashboard' || path.startsWith('/dashboard/')
  
  // Get auth status from cookies instead of next-auth token
  const isAuthenticated = req.cookies.get('isAuthenticated')?.value === 'true'
  
  // If the path is protected and user is not authenticated, redirect to signin
  if (isProtectedPath && !isAuthenticated) {
    return NextResponse.redirect(new URL('/', req.url))
  }
  
  
  return NextResponse.next()
}

// Configure middleware to run on specific paths
export const config = {
  matcher: ['/',  '/dashboard', '/dashboard/:path*'],
}
