import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { updateShipSchema, assignTeamSchema } from "@/lib/validations"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "ship:read")
    const { id } = await params

    const shipId = parseInt(id)
    const ship = await prisma.ship.findUnique({
      where: { id: shipId },
      include: {
        dock: { select: { name: true } },
        berth: { select: { name: true } },
        supervisor: { select: { id: true, realName: true } },
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

    // 聚合4类涂装工程
    const [externalPlates, cargoHolds, waterJets, rustRemovals] = await Promise.all([
      prisma.externalPlateCost.findMany({
        where: { shipId },
        select: { repairNumber: true, area: true, projectStatus: true, team: { select: { name: true } } },
      }),
      prisma.cargoHoldCost.findMany({
        where: { shipId },
        select: { repairNumber: true, projectStatus: true, team: { select: { name: true } } },
      }),
      prisma.waterJetCost.findMany({
        where: { shipId },
        select: { repairNumber: true, project: true, projectStatus: true, team: { select: { name: true } } },
      }),
      prisma.rustRemovalCost.findMany({
        where: { shipId },
        select: { repairNumber: true, projectName: true, projectStatus: true, team: { select: { name: true } } },
      }),
    ])

    const projects: { projectType: string; projectName: string; status: string; teamName?: string; repairNumber?: string | null }[] = [
      ...externalPlates.map((p) => ({ projectType: "外板涂装", projectName: p.area, status: p.projectStatus ?? "in_progress", teamName: p.team?.name, repairNumber: p.repairNumber })),
      ...cargoHolds.map((p) => ({ projectType: "货舱涂装", projectName: "货舱涂装", status: p.projectStatus ?? "in_progress", teamName: p.team?.name, repairNumber: p.repairNumber })),
      ...waterJets.map((p) => ({ projectType: "水刀除锈", projectName: p.project, status: p.projectStatus ?? "in_progress", teamName: p.team?.name, repairNumber: p.repairNumber })),
      ...rustRemovals.map((p) => ({ projectType: "敲铲除锈", projectName: p.projectName, status: p.projectStatus ?? "in_progress", teamName: p.team?.name, repairNumber: p.repairNumber })),
    ]

    const { dock, berth, shipTeams: sts, ...rest } = ship as Record<string, unknown>
    return success({
      ...rest,
      length: Number(ship.length),
      width: Number(ship.width),
      height: Number(ship.height),
      supervisorId: ship.supervisorId,
      supervisorName: ship.supervisor?.realName ?? null,
      dockName: (dock as { name: string } | null)?.name ?? null,
      berthName: (berth as { name: string } | null)?.name ?? null,
      teams: ship.shipTeams.map((st) => ({
        id: st.id,
        teamId: st.team.id,
        teamName: st.team.name,
        leaderName: st.team.leader?.realName ?? null,
        memberCount: st.team._count.members,
        assignedAt: st.assignedAt,
      })),
      projects,
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
    const shipId = parseInt(id)

    // 主管只能修改自己管理的船舶
    if (auth.role === "supervisor") {
      const ship = await prisma.ship.findUnique({ where: { id: shipId }, select: { supervisorId: true } })
      if (!ship || ship.supervisorId !== auth.userId) {
        return error("FORBIDDEN", "只能修改自己管理的船舶", 403)
      }
    }

    const body = await request.json()
    const parsed = updateShipSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const updated = await prisma.ship.update({
      where: { id: shipId },
      data: parsed.data as any,
    })
    return success(updated, "更新成功")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "更新船舶失败", 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "ship:manage")
    const { id } = await params
    const shipId = parseInt(id)

    // 主管只能删除自己管理的船舶
    if (auth.role === "supervisor") {
      const ship = await prisma.ship.findUnique({ where: { id: shipId }, select: { supervisorId: true } })
      if (!ship || ship.supervisorId !== auth.userId) {
        return error("FORBIDDEN", "只能删除自己管理的船舶", 403)
      }
    }

    await prisma.ship.delete({ where: { id: shipId } })
    return success(null, "删除成功")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
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

    // 分配队伍同时将修理状态设为已开工
    const [shipTeam] = await prisma.$transaction([
      prisma.shipTeam.create({
        data: { shipId: parseInt(id), teamId: parsed.data.teamId },
      }),
      prisma.ship.update({
        where: { id: parseInt(id) },
        data: { repairStatus: "started" },
      }),
    ])
    return success(shipTeam, "分配成功", 201)
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    // 违反唯一约束
    if (typeof err === "object" && err && "code" in err && (err as any).code === "P2002") {
      return error("DUPLICATE", "该队伍已分配到此船舶")
    }
    return error("INTERNAL_ERROR", "分配失败", 500)
  }
}
