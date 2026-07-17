import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate } from "@/lib/auth"
import { success, error } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticate(request)

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        realName: true,
        role: true,
        gender: true,
        age: true,
        craftType: true,
        level: true,
        phone: true,
        teamId: true,
        isActive: true,
        team: { select: { name: true } },
      },
    })

    if (!user || !user.isActive) {
      return error("USER_NOT_FOUND", "用户不存在或已禁用", 404)
    }

    return success({
      ...user,
      teamName: user.team?.name ?? null,
    })
  } catch (err) {
    if (err instanceof Error && err.name === "UnauthorizedError") {
      return error("UNAUTHORIZED", err.message, 401)
    }
    console.error("Get me error:", err)
    return error("INTERNAL_ERROR", "获取用户信息失败", 500)
  }
}
