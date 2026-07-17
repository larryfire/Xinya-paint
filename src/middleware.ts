import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/jwt"

/** 不需要认证的公开路由 */
const publicPaths = [
  "/api/auth/login",
  "/api/auth/logout",
]

/** 静态资源路径前缀 */
const staticPrefixes = ["/_next", "/favicon.ico", "/images", "/models"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 静态资源直接放行
  if (staticPrefixes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 公开 API 放行
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // API 路由统一校验
  if (pathname.startsWith("/api/")) {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }
    try {
      await verifyJWT(token)
      return NextResponse.next()
    } catch {
      return NextResponse.json(
        { success: false, error: { code: "TOKEN_EXPIRED", message: "登录已过期" } },
        { status: 401 }
      )
    }
  }

  // 页面路由：未登录重定向到登录页
  const token = request.cookies.get("token")?.value
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  try {
    await verifyJWT(token)
    return NextResponse.next()
  } catch {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
