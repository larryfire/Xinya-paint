import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { updateTeamSchema } from "@/lib/validations"
import { getSupervisorTeamIds } from "@/lib/permissions-server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "team:read")
    const { id } = await params
    const teamId = parseInt(id)

    // 数据级过滤
    if (auth.role === "leader" && auth.teamId) {
      if (teamId !== auth.teamId) return error("FORBIDDEN", "只能查看自己管理的队伍", 403)
    }
    if (auth.role === "supervisor") {
      const teamIds = await getSupervisorTeamIds(auth.userId)
      if (!teamIds.includes(teamId)) return error("FORBIDDEN", "只能查看自己管理船舶的队伍", 403)
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        leader: { select: { id: true, realName: true } },
        members: {
          where: { isActive: true },
          select: {
            id: true, realName: true, gender: true, age: true,
            craftType: true, level: true, role: true, phone: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })
    if (!team) return error("NOT_FOUND", "队伍不存在", 404)

    return success({
      id: team.id,
      name: team.name,
      leaderId: team.leaderId,
      leaderName: team.leader?.realName ?? null,
      description: team.description,
      members: team.members,
      createdAt: team.createdAt,
    })
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "获取队伍详情失败", 500)
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    const { id } = await params
    const teamId = parseInt(id)

    // 主任可以修改自己的队伍
    if (auth.role === "leader") {
      if (teamId !== auth.teamId) {
        return error("FORBIDDEN", "只能修改自己管理的队伍", 403)
      }
    } else {
      // 非主任需要 team:manage 权限
      authorize(auth, "team:manage")
    }

    const body = await request.json()
    const parsed = updateTeamSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: parsed.data,
    })
    return success(updated, "更新成功")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "更新队伍失败", 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "team:manage")
    const { id } = await params

    // 检查队伍是否有成员
    const memberCount = await prisma.user.count({ where: { teamId: parseInt(id), isActive: true } })
    if (memberCount > 0) return error("HAS_MEMBERS", `该队伍还有 ${memberCount} 名成员，请先移除成员`)

    await prisma.team.delete({ where: { id: parseInt(id) } })
    return success(null, "删除成功")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "删除队伍失败", 500)
  }
}
