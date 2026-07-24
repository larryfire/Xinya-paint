import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { getSupervisorShipIds } from "@/lib/permissions-server"

/** 获取当前所有活跃出勤（endTime=null） */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "team:read")

    const where: Record<string, unknown> = { endTime: null }
    if (auth.role === "leader" && auth.teamId) where.teamId = auth.teamId
    if (auth.role === "supervisor") {
      const shipIds = await getSupervisorShipIds(auth.userId)
      where.shipId = shipIds.length > 0 ? { in: shipIds } : -1
    }

    const items = await prisma.attendance.findMany({
      where,
      include: {
        team: { select: { name: true } },
        ship: { select: { id: true, name: true } },
        dock: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "desc" },
    })

    const now = Date.now()
    const data = items.map((a) => {
      const startMs = new Date(a.startTime).getTime()
      const hours = (now - startMs) / (1000 * 60 * 60)
      return {
        id: a.id,
        teamId: a.teamId,
        teamName: a.team.name,
        shipId: a.shipId,
        shipName: a.ship?.name ?? null,
        dockId: a.dockId,
        dockName: a.dock?.name ?? null,
        workerCount: a.workerCount,
        startTime: a.startTime.toISOString(),
        currentHours: Math.round(hours * 100) / 100,
        totalManHours: Math.round(hours * a.workerCount * 100) / 100,
      }
    })

    return success(data, "获取活跃出勤成功")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("Active attendance error:", err)
    return error("INTERNAL_ERROR", "获取活跃出勤失败", 500)
  }
}
