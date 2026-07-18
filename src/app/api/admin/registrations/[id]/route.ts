import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { z } from "zod"

/** 审核操作校验 */
const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
})

/**
 * PUT — 管理员审核（通过/拒绝）注册申请
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "user:manage")

    const { id } = await params
    const body = await request.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
      return error("VALIDATION_ERROR", "action 必须是 approve 或 reject")
    }

    const { action } = parsed.data
    const targetId = parseInt(id)

    // 检查用户是否存在且为待审核状态
    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, approvalStatus: true, realName: true },
    })

    if (!user) {
      return error("NOT_FOUND", "用户不存在", 404)
    }
    if (user.approvalStatus !== "pending") {
      return error("ALREADY_REVIEWED", "该申请已被处理")
    }

    if (action === "approve") {
      await prisma.user.update({
        where: { id: targetId },
        data: { approvalStatus: "approved" },
      })
      return success(null, `已通过 ${user.realName} 的注册申请`)
    } else {
      // 拒绝：标记为 rejected
      await prisma.user.update({
        where: { id: targetId },
        data: { approvalStatus: "rejected", isActive: false },
      })
      return success(null, `已拒绝 ${user.realName} 的注册申请`)
    }
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "审核操作失败", 500)
  }
}
