import { auth } from "./auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth?.user

  // Define protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/onboarding']
  const isProtectedRoute = protectedRoutes.some(route => nextUrl.pathname.startsWith(route))

  // Define auth routes that logged-in users shouldn't access
  const authRoutes = ['/signin']
  const isAuthRoute = authRoutes.includes(nextUrl.pathname)

  // If user is not logged in and trying to access protected route
  if (!isLoggedIn && isProtectedRoute) {
    return NextResponse.redirect(new URL('/signin', nextUrl))
  }

  // If user is logged in and trying to access auth routes, redirect to dashboard
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  // If user is logged in and accessing root path, redirect to dashboard
  if (isLoggedIn && nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}