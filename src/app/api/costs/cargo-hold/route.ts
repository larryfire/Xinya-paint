import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error, paginated, getPaginationParams } from "@/lib/api-response"
import { getCostFilter } from "@/lib/permissions"
import { createCargoHoldCostSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "cost:cargo_hold:read")

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = getPaginationParams(searchParams)
    const shipId = searchParams.get("shipId") ? parseInt(searchParams.get("shipId")!) : undefined
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined
    const teamId = searchParams.get("teamId") ? parseInt(searchParams.get("teamId")!) : undefined
    const search = searchParams.get("search") || undefined
    const repairNumber = searchParams.get("repairNumber") || undefined

    const where: Record<string, unknown> = { ...getCostFilter(auth.role, auth.userId, auth.teamId) }
    if (shipId) where.shipId = shipId
    if (teamId) where.teamId = teamId
    if (repairNumber) where.repairNumber = repairNumber
    if (year) {
      where.createdAt = {
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

    const [items, total] = await Promise.all([
      prisma.cargoHoldCost.findMany({
        where,
        include: {
          ship: { select: { id: true, name: true, length: true, width: true } },
          supervisor: { select: { realName: true } },
          team: { select: { name: true } },
        },
        skip, take: pageSize, orderBy: { createdAt: "desc" },
      }),
      prisma.cargoHoldCost.count({ where }),
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
      cargoRatio: Number(c.cargoRatio),
      originalRatio: Number(c.originalRatio),
      originalPhoto: c.originalPhoto,
      teamId: c.teamId,
      teamName: c.team?.name ?? null,
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
    return error("INTERNAL_ERROR", "获取货舱成本列表失败", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "cost:cargo_hold:write")
    const body = await request.json()
    const parsed = createCargoHoldCostSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const cost = await prisma.cargoHoldCost.create({ data: parsed.data as any })
    return success(cost, "创建成功", 201)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "创建货舱成本记录失败", 500)
  }
}
