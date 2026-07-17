import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { updateUserSchema } from "@/lib/validations"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authenticate(request)
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true, username: true, realName: true, role: true,
        gender: true, age: true, craftType: true, level: true,
        phone: true, teamId: true, isActive: true, createdAt: true,
        team: { select: { name: true } },
      },
    })
    if (!user) return error("NOT_FOUND", "用户不存在", 404)
    return success({ ...user, teamName: user.team?.name ?? null, team: undefined })
  } catch (err) {
    if (err instanceof Error && err.name === "UnauthorizedError") return error("UNAUTHORIZED", err.message, 401)
    return error("INTERNAL_ERROR", "获取用户详情失败", 500)
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "user:manage")
    const { id } = await params

    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: parsed.data,
      select: { id: true, username: true, realName: true, role: true, isActive: true },
    })
    return success(updated, "更新成功")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "更新用户失败", 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "user:manage")
    const { id } = await params

    await prisma.user.update({ where: { id: parseInt(id) }, data: { isActive: false } })
    return success(null, "删除成功")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "删除用户失败", 500)
  }
}
