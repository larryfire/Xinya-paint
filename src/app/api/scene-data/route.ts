import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "scene:view")

    const now = Date.now()

    const [docks, ships, activeAttendances, shipTeams, costs] = await Promise.all([
      prisma.dock.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.ship.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          id: true, name: true, shipType: true, status: true,
          dockId: true, berthId: true, positionX: true, positionZ: true,
          rotation: true, length: true, width: true, height: true,
          dock: { select: { name: true } },
          berth: { select: { name: true } },
        },
      }),
      // 当前活跃出勤
      prisma.attendance.findMany({
        where: { endTime: null },
        include: {
          team: { select: { name: true } },
          ship: { select: { name: true } },
          dock: { select: { name: true } },
        },
      }),
      // 船舶-队伍分配
      prisma.shipTeam.findMany({
        include: {
          team: { select: { name: true, _count: { select: { members: true } } } },
        },
      }),
      // 各船成本汇总
      prisma.externalPlateCost.groupBy({
        by: ["shipId"],
        _sum: { settlementCost: true, constructionCost: true },
      }),
    ])

    // 构建 shipId -> teams 映射
    const shipTeamMap = new Map<number, { teamId: number; teamName: string; memberCount: number }[]>()
    for (const st of shipTeams) {
      if (!shipTeamMap.has(st.shipId)) shipTeamMap.set(st.shipId, [])
      shipTeamMap.get(st.shipId)!.push({
        teamId: st.teamId,
        teamName: st.team.name,
        memberCount: st.team._count.members,
      })
    }

    // 构建 shipId -> active attendance 映射
    const shipAttendanceMap = new Map<number, { id: number; teamId: number; teamName: string; workerCount: number; startTime: string; currentHours: number }[]>()
    const dockAttendanceMap = new Map<number, { id: number; teamId: number; teamName: string; workerCount: number; startTime: string; currentHours: number }[]>()
    for (const a of activeAttendances) {
      const item = {
        id: a.id,
        teamId: a.teamId,
        teamName: a.team.name,
        workerCount: a.workerCount,
        startTime: a.startTime.toISOString(),
        currentHours: Math.round(((now - new Date(a.startTime).getTime()) / (1000 * 60 * 60)) * 100) / 100,
      }
      if (a.shipId) {
        if (!shipAttendanceMap.has(a.shipId)) shipAttendanceMap.set(a.shipId, [])
        shipAttendanceMap.get(a.shipId)!.push(item)
      }
      if (a.dockId) {
        if (!dockAttendanceMap.has(a.dockId)) dockAttendanceMap.set(a.dockId, [])
        dockAttendanceMap.get(a.dockId)!.push(item)
      }
    }

    // 构建 shipId -> cost 映射
    const shipCostMap = new Map<number, { settlement: number; construction: number }>()
    for (const c of costs) {
      shipCostMap.set(c.shipId, {
        settlement: Number(c._sum.settlementCost ?? 0),
        construction: Number(c._sum.constructionCost ?? 0),
      })
    }

    return success({
      docks: docks.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        positionX: Number(d.positionX),
        positionZ: Number(d.positionZ),
        width: Number(d.width),
        depth: Number(d.depth),
        status: d.status,
        activeAttendance: dockAttendanceMap.get(d.id) ?? [],
      })),
      ships: ships.map((s) => {
        const { dock, berth, ...rest } = s as Record<string, unknown>
        const shipId = s.id
        const costs = shipCostMap.get(shipId)
        return {
          ...rest,
          length: Number(s.length),
          width: Number(s.width),
          height: Number(s.height),
          dockName: (dock as { name: string } | null)?.name ?? null,
          berthName: (berth as { name: string } | null)?.name ?? null,
          teams: shipTeamMap.get(shipId) ?? [],
          activeAttendance: shipAttendanceMap.get(shipId) ?? [],
          totalSettlementCost: costs?.settlement ?? 0,
          totalConstructionCost: costs?.construction ?? 0,
        }
      }),
    })
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("Scene-data error:", err)
    return error("INTERNAL_ERROR", "获取场景数据失败", 500)
  }
}
