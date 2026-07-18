import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error, paginated, getPaginationParams } from "@/lib/api-response"

/**
 * GET — 管理员获取待审核注册列表
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "user:manage")

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = getPaginationParams(searchParams)
    const status = searchParams.get("status") || "pending"

    const where: Record<string, unknown> = {
      approvalStatus: status,
      isActive: true,
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          realName: true,
          phone: true,
          role: true,
          approvalStatus: true,
          createdAt: true,
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ])

    return paginated(items, total, page, pageSize)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "获取待审核列表失败", 500)
  }
}
