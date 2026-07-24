import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error, paginated, getPaginationParams } from "@/lib/api-response"
import { getCostFilter, getSupervisorShipIds } from "@/lib/permissions"
import { createExternalPlateCostSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "cost:external_plate:read")

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = getPaginationParams(searchParams)
    const shipId = searchParams.get("shipId") ? parseInt(searchParams.get("shipId")!) : undefined
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined
    const supervisorId = searchParams.get("supervisorId") ? parseInt(searchParams.get("supervisorId")!) : undefined
    const area = searchParams.get("area") || undefined
    const teamId = searchParams.get("teamId") ? parseInt(searchParams.get("teamId")!) : undefined
    const search = searchParams.get("search") || undefined

    const where: Record<string, unknown> = { ...getCostFilter(auth.role, auth.userId, auth.teamId) }
    if (shipId) where.shipId = shipId
    if (supervisorId) where.supervisorId = supervisorId
    if (area) where.area = area
    if (teamId) where.teamId = teamId
    if (year) {
      where.dockEntryTime = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      }
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
      prisma.externalPlateCost.findMany({
        where,
        include: {
          ship: { select: { id: true, name: true, length: true, width: true } },
          supervisor: { select: { realName: true } },
          team: { select: { name: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.externalPlateCost.count({ where }),
    ])

    const data = items.map((c) => ({
      id: c.id,
      repairNumber: c.repairNumber,
      shipId: c.shipId,
      shipName: c.ship.name,
      shipLength: Number(c.ship.length),
      shipWidth: Number(c.ship.width),
      supervisorId: c.supervisorId,
      supervisorName: c.supervisor.realName,
      dockEntryTime: c.dockEntryTime,
      area: c.area,
      teamId: c.teamId,
      teamName: c.team.name,
      settlementCost: Number(c.settlementCost),
      constructionCost: Number(c.constructionCost),
      profitLoss: Number(c.settlementCost) - Number(c.constructionCost),
      profitLossRate: Number(c.settlementCost) > 0
        ? ((Number(c.settlementCost) - Number(c.constructionCost)) / Number(c.settlementCost)) * 100
        : 0,
      remarks: c.remarks,
      projectStatus: c.projectStatus,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))

    return paginated(data, total, page, pageSize)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "获取外板成本列表失败", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "cost:external_plate:write")
    const body = await request.json()
    const parsed = createExternalPlateCostSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    // supervisor ownership check
    if (auth.role === "supervisor") {
      if (parsed.data.supervisorId && parsed.data.supervisorId !== auth.userId) {
        return error("FORBIDDEN", "只能为自己创建成本记录", 403)
      }
      // Verify ship ownership
      const ship = await prisma.ship.findUnique({
        where: { id: parsed.data.shipId },
        select: { supervisorId: true },
      })
      if (!ship || ship.supervisorId !== auth.userId) {
        return error("FORBIDDEN", "只能为您主管的船舶创建成本记录", 403)
      }
    }

    const cost = await prisma.externalPlateCost.create({
      data: {
        ...parsed.data,
        dockEntryTime: new Date(parsed.data.dockEntryTime),
      } as any,
    })
    return success(cost, "创建成功", 201)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "创建外板成本记录失败", 500)
  }
}
