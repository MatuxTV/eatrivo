import { hasAccess,permissions } from "@/app/config/permission"
import { auth } from "./auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth?.user

  // Get user role (membership)
  const userRole = req.auth?.user?.membership ?? "";

  // Protect all routes defined in permissions config
  const protectedRoute = Object.keys(permissions)
    .some(route => new RegExp(`^/${route}(/|$)`).test(nextUrl.pathname));

  // Auth routes that logged-in users shouldn't access
  const authRoutes = ['/signin'];
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  // If route is protected and user is not logged in
  if (!isLoggedIn && protectedRoute) {
    return NextResponse.redirect(new URL('/signin', nextUrl));
  }

  // If route is protected and user does not have access
  if (protectedRoute && !hasAccess(nextUrl.pathname, userRole)) {
    return NextResponse.redirect(new URL('/not-authorized', nextUrl));
  }

  // If user is logged in and trying to access auth routes, redirect to dashboard
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // If user is logged in and accessing root path, redirect to dashboard
  if (isLoggedIn && nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  return NextResponse.next();
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}