import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"

/** 结束出勤 / 更新出勤 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "team:read")

    const { id } = await params
    const existing = await prisma.attendance.findUnique({ where: { id: parseInt(id) } })
    if (!existing) return error("NOT_FOUND", "出勤记录不存在", 404)
    if (existing.endTime) return error("CONFLICT", "该出勤已结束")

    const attendance = await prisma.attendance.update({
      where: { id: parseInt(id) },
      data: { endTime: new Date() },
    })

    return success(attendance, "出勤已结束")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("Attendance PUT error:", err)
    return error("INTERNAL_ERROR", "操作失败", 500)
  }
}
