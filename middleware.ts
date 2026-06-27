import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    const isAdminRoute = pathname.startsWith("/admin")
    const isLoginPage = pathname === "/admin/login"
    const isApiRoute = pathname.startsWith("/api/admin")

    if (isLoginPage && token) {
      return NextResponse.redirect(new URL("/admin", req.url))
    }

    if (isAdminRoute && !isLoginPage && !token) {
      const loginUrl = new URL("/admin/login", req.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (isApiRoute && !token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const response = NextResponse.next()

    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        const isAdminRoute = pathname.startsWith("/admin")
        const isLoginPage = pathname === "/admin/login"

        if (isLoginPage) return true
        if (isAdminRoute) return !!token
        return true
      },
    },
  }
)

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
