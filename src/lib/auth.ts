import { NextRequest } from "next/server"
import { verifyJWT, JwtPayload } from "@/lib/jwt"
import { hasPermission, type Permission } from "@/lib/permissions"

export class UnauthorizedError extends Error {
  constructor(message = "请先登录") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends Error {
  constructor(message = "没有操作权限") {
    super(message)
    this.name = "ForbiddenError"
  }
}

/** 从请求中提取并验证 JWT，返回用户信息 */
export async function authenticate(
  request: NextRequest
): Promise<JwtPayload> {
  const token = request.cookies.get("token")?.value
  if (!token) {
    throw new UnauthorizedError("请先登录")
  }
  try {
    return await verifyJWT(token)
  } catch {
    throw new UnauthorizedError("登录已过期，请重新登录")
  }
}

/** 检查用户是否拥有指定权限，无权限则抛出 ForbiddenError */
export function authorize(user: JwtPayload, permission: Permission): void {
  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError("没有操作权限")
  }
}

/** 可选认证：有 token 则解析，没有则返回 null */
export async function optionalAuth(
  request: NextRequest
): Promise<JwtPayload | null> {
  try {
    return await authenticate(request)
  } catch {
    return null
  }
}
