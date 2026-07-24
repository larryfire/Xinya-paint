import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error, paginated, getPaginationParams } from "@/lib/api-response"
import { getCostFilter, getSupervisorShipIds } from "@/lib/permissions-server"
import { createRustRemovalCostSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "cost:rust_removal:read")

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = getPaginationParams(searchParams)
    const shipId = searchParams.get("shipId") ? parseInt(searchParams.get("shipId")!) : undefined
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined
    const teamId = searchParams.get("teamId") ? parseInt(searchParams.get("teamId")!) : undefined
    const search = searchParams.get("search") || undefined
    const repairNumber = searchParams.get("repairNumber") || undefined
    const area = searchParams.get("area") || undefined
    const projectName = searchParams.get("projectName") || undefined

    const where: Record<string, unknown> = {}
    if (shipId) where.shipId = shipId
    if (teamId) where.teamId = teamId
    if (repairNumber) where.repairNumber = repairNumber
    if (area) where.area = area
    if (projectName) where.projectName = projectName
    if (year) {
      where.createdAt = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      }
    }
    // 数据过滤：leader只看自己队伍的
    if (auth.role === "leader" && auth.teamId && !teamId) {
      where.teamId = auth.teamId
    }
    // 搜索：同时匹配修理编号和船舶名称
    if (search) {
      where.OR = [
        { repairNumber: { contains: search } },
        { ship: { name: { contains: search } } },
      ]
    }

    // supervisor ship-based filtering
    if (auth.role === "supervisor") {
      const shipIds = await getSupervisorShipIds(auth.userId)
      if (shipIds.length > 0) {
        where.shipId = { in: shipIds }
      } else {
        where.shipId = -1
      }
    }

    const [items, total] = await Promise.all([
      prisma.rustRemovalCost.findMany({
        where,
        include: {
          ship: { select: { id: true, name: true, length: true, width: true } },
          team: { select: { name: true } },
        },
        skip, take: pageSize, orderBy: { createdAt: "desc" },
      }),
      prisma.rustRemovalCost.count({ where }),
    ])

    const data = items.map((c) => ({
      id: c.id,
      repairNumber: c.repairNumber,
      shipId: c.shipId,
      shipName: c.ship.name,
      shipLength: Number(c.ship.length),
      shipWidth: Number(c.ship.width),
      area: c.area,
      projectName: c.projectName,
      teamId: c.teamId,
      teamName: c.team?.name ?? null,
      manHours: Number(c.manHours),
      hourlyRate: Number(c.hourlyRate),
      totalCost: Number(c.manHours) * Number(c.hourlyRate),
      remarks: c.remarks,
      projectStatus: c.projectStatus,
      createdAt: c.createdAt,
    }))

    return paginated(data, total, page, pageSize)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "获取敲铲成本列表失败", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "cost:rust_removal:write")
    const body = await request.json()
    const parsed = createRustRemovalCostSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    // supervisor ownership check
    if (auth.role === "supervisor") {
      const ship = await prisma.ship.findUnique({
        where: { id: parsed.data.shipId },
        select: { supervisorId: true },
      })
      if (!ship || ship.supervisorId !== auth.userId) {
        return error("FORBIDDEN", "只能为您主管的船舶创建成本记录", 403)
      }
    }

    const cost = await prisma.rustRemovalCost.create({ data: parsed.data as any })
    return success(cost, "创建成功", 201)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "创建敲铲成本记录失败", 500)
  }
}
