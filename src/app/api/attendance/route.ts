import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error, paginated, getPaginationParams } from "@/lib/api-response"
import { createAttendanceSchema } from "@/lib/validations"
import { getSupervisorShipIds } from "@/lib/permissions-server"

/** 开始出勤 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "team:read")

    const body = await request.json()
    const parsed = createAttendanceSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const { teamId, shipId, dockId, workerCount } = parsed.data

    // 检查同一队伍+同一目标是否已有活跃出勤
    const existing = await prisma.attendance.findFirst({
      where: { teamId, shipId: shipId ?? null, dockId: dockId ?? null, endTime: null },
    })
    if (existing) return error("CONFLICT", "该队伍在此目标已有活跃出勤，请先结束")

    const attendance = await prisma.attendance.create({
      data: { teamId, shipId: shipId ?? null, dockId: dockId ?? null, workerCount, startTime: new Date() },
    })

    return success(attendance, "出勤开始", 201)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("Attendance POST error:", err)
    return error("INTERNAL_ERROR", "开始出勤失败", 500)
  }
}

/** 查询出勤列表 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "team:read")

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = getPaginationParams(searchParams)
    const shipId = searchParams.get("shipId") ? parseInt(searchParams.get("shipId")!) : undefined
    const teamId = searchParams.get("teamId") ? parseInt(searchParams.get("teamId")!) : undefined
    const active = searchParams.get("active") === "true" ? true : undefined

    const where: Record<string, unknown> = {}
    if (shipId) where.shipId = shipId
    if (teamId) where.teamId = teamId
    if (active) where.endTime = null
    // leader 只能看自己队伍
    if (auth.role === "leader" && auth.teamId) where.teamId = auth.teamId
    // supervisor 只看自己管理船舶的出勤
    if (auth.role === "supervisor") {
      const shipIds = await getSupervisorShipIds(auth.userId)
      where.shipId = shipIds.length > 0 ? { in: shipIds } : -1
    }

    const [items, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          team: { select: { name: true } },
          ship: { select: { name: true } },
          dock: { select: { name: true } },
        },
        skip, take: pageSize, orderBy: { startTime: "desc" },
      }),
      prisma.attendance.count({ where }),
    ])

    const data = items.map((a) => {
      const startMs = new Date(a.startTime).getTime()
      const endMs = a.endTime ? new Date(a.endTime).getTime() : Date.now()
      const currentHours = (endMs - startMs) / (1000 * 60 * 60)
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
        endTime: a.endTime?.toISOString() ?? null,
        currentHours: Math.round(currentHours * 100) / 100,
        createdAt: a.createdAt.toISOString(),
      }
    })

    return paginated(data, total, page, pageSize)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("Attendance GET error:", err)
    return error("INTERNAL_ERROR", "获取出勤列表失败", 500)
  }
}
