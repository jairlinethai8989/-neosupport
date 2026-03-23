import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  
  // 🛡️ Security Headers for Google Safe Browsing trust
  const headers = response.headers
  
  // 1. Content Security Policy (Basic)
  // Allows fonts from Google, images from Wikimedia/Unsplash/Supabase/Mixkit
  headers.set('Content-Security-Policy', `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' blob: data: https://*.wikimedia.org https://images.unsplash.com https://*.supabase.co https://stickershop.line-scdn.net;
    media-src 'self' https://*.supabase.co https://assets.mixkit.co;
    connect-src 'self' https://*.supabase.co https://api.line.me https://api-data.line.me https://generativelanguage.googleapis.com;
    frame-src 'self' data: blob:;
    frame-ancestors 'none';
  `.replace(/\s{2,}/g, ' ').trim())

  // 2. Strict-Transport-Security (HSTS) - 2 years
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  
  // 3. X-Content-Type-Options
  headers.set('X-Content-Type-Options', 'nosniff')
  
  // 4. X-Frame-Options (Clickjacking protection)
  headers.set('X-Frame-Options', 'DENY')
  
  // 5. Referrer-Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // 6. Permissions-Policy
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/line/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
