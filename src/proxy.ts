import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/jwt"

/** 不需要认证的公开路由 */
const publicPaths = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
  "/login",
  "/register",
]

/** 静态资源路径前缀 */
const staticPrefixes = ["/_next", "/favicon.ico", "/images", "/models"]

/**
 * 从请求中提取 JWT Token
 * 优先 Cookie（httpOnly），其次 Authorization: Bearer <token>（移动端兼容）
 */
function extractToken(request: NextRequest): string | null {
  const cookieToken = request.cookies.get("token")?.value
  if (cookieToken) return cookieToken

  const authHeader = request.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }

  return null
}

/**
 * Next.js 16 Proxy — 替代旧版 middleware
 * 在请求到达页面/API之前执行鉴权拦截
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 静态资源直接放行
  if (staticPrefixes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 公开路由直接放行（登录页和认证API）
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // API 路由统一校验 JWT
  if (pathname.startsWith("/api/")) {
    const token = extractToken(request)
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
  const token = extractToken(request)
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

/**
 * 匹配所有路径，排除静态资源和图片
 * Next.js 16 的 matcher 使用 path-to-regexp 语法，
 * 空字符串 '' 也可用于匹配根路径
 */
export const config = {
  matcher: [
    // 排除静态文件、图片、favicon
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
}
