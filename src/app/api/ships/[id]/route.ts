import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { updateShipSchema, assignTeamSchema } from "@/lib/validations"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authenticate(request)
    const { id } = await params

    const ship = await prisma.ship.findUnique({
      where: { id: parseInt(id) },
      include: {
        dock: { select: { name: true } },
        berth: { select: { name: true } },
        shipTeams: {
          include: {
            team: {
              select: {
                id: true, name: true,
                leader: { select: { realName: true } },
                _count: { select: { members: true } },
              },
            },
          },
        },
      },
    })
    if (!ship) return error("NOT_FOUND", "船舶不存在", 404)

    return success({
      ...ship,
      length: Number(ship.length),
      width: Number(ship.width),
      height: Number(ship.height),
      dockName: ship.dock?.name ?? null,
      berthName: ship.berth?.name ?? null,
      teams: ship.shipTeams.map((st) => ({
        id: st.id,
        teamId: st.team.id,
        teamName: st.team.name,
        leaderName: st.team.leader?.realName ?? null,
        memberCount: st.team._count.members,
        assignedAt: st.assignedAt,
      })),
      dock: undefined, berth: undefined, shipTeams: undefined,
    })
  } catch (err) {
    if (err instanceof Error && err.name === "UnauthorizedError") return error("UNAUTHORIZED", err.message, 401)
    return error("INTERNAL_ERROR", "获取船舶详情失败", 500)
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "ship:manage")
    const { id } = await params
    const body = await request.json()
    const parsed = updateShipSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const updated = await prisma.ship.update({
      where: { id: parseInt(id) },
      data: parsed.data as any,
    })
    return success(updated, "更新成功")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, 401)
    }
    return error("INTERNAL_ERROR", "更新船舶失败", 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "ship:manage")
    const { id } = await params
    await prisma.ship.delete({ where: { id: parseInt(id) } })
    return success(null, "删除成功")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, 401)
    }
    return error("INTERNAL_ERROR", "删除船舶失败", 500)
  }
}

// 分配施工队伍
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "ship:manage")
    const { id } = await params
    const body = await request.json()
    const parsed = assignTeamSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const shipTeam = await prisma.shipTeam.create({
      data: { shipId: parseInt(id), teamId: parsed.data.teamId },
    })
    return success(shipTeam, "分配成功", 201)
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, 401)
    }
    // 违反唯一约束
    if (typeof err === "object" && err && "code" in err && (err as any).code === "P2002") {
      return error("DUPLICATE", "该队伍已分配到此船舶")
    }
    return error("INTERNAL_ERROR", "分配失败", 500)
  }
}
