import { type NextRequest, NextResponse } from "next/server"

const TOKEN_COOKIE = "kaz_auth_token"
const PUBLIC_PATHS = ["/login"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const demoOrigin = process.env.CHENNAI_DEMO_ORIGIN
  if (process.env.SIMULATION_SCENARIO === "chennai-ashok-leyland" && demoOrigin) {
    if (pathname === "/login" || pathname.startsWith("/login/")) {
      return NextResponse.redirect(new URL("/", demoOrigin))
    }
    return NextResponse.next()
  }
  const token = request.cookies.get(TOKEN_COOKIE)?.value
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!token && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  if (token && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.searchParams.delete("from")
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
