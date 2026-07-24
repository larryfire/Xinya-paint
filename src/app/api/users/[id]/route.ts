import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { updateUserSchema } from "@/lib/validations"
import { getSupervisorTeamIds } from "@/lib/permissions-server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "team:read")
    const { id } = await params
    const targetId = parseInt(id)

    // 自己可以看自己的信息
    if (targetId === auth.userId) {
      const self = await prisma.user.findUnique({
        where: { id: targetId },
        select: {
          id: true, username: true, realName: true, role: true,
          gender: true, age: true, craftType: true, level: true,
          phone: true, teamId: true, isActive: true, createdAt: true,
          team: { select: { name: true } },
        },
      })
      if (!self) return error("NOT_FOUND", "用户不存在", 404)
      return success({ ...self, teamName: self.team?.name ?? null, team: undefined })
    }

    // 数据级过滤：主任只能看同队成员，主管只能看自己船队成员
    if (auth.role === "leader" && auth.teamId) {
      const target = await prisma.user.findUnique({
        where: { id: targetId, teamId: auth.teamId },
        select: {
          id: true, username: true, realName: true, role: true,
          gender: true, age: true, craftType: true, level: true,
          phone: true, teamId: true, isActive: true, createdAt: true,
          team: { select: { name: true } },
        },
      })
      if (!target) return error("FORBIDDEN", "只能查看本队伍成员", 403)
      return success({ ...target, teamName: target.team?.name ?? null, team: undefined })
    }

    if (auth.role === "supervisor") {
      const teamIds = await getSupervisorTeamIds(auth.userId)
      const target = await prisma.user.findUnique({
        where: { id: targetId, teamId: teamIds.length > 0 ? { in: teamIds } : -1 },
        select: {
          id: true, username: true, realName: true, role: true,
          gender: true, age: true, craftType: true, level: true,
          phone: true, teamId: true, isActive: true, createdAt: true,
          team: { select: { name: true } },
        },
      })
      if (!target) return error("FORBIDDEN", "只能查看自己管理船舶队伍的成员", 403)
      return success({ ...target, teamName: target.team?.name ?? null, team: undefined })
    }

    const user = await prisma.user.findUnique({
      where: { id: targetId },
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
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
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
