import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error, paginated, getPaginationParams } from "@/lib/api-response"
import { getCostFilter } from "@/lib/permissions"
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

    const where: Record<string, unknown> = {}
    if (shipId) where.shipId = shipId
    if (teamId) where.teamId = teamId
    if (year) {
      where.createdAt = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      }
    }
    // 数据过滤：leader只看自己队伍的（非leader角色的筛选覆盖此限制）
    if (auth.role === "leader" && auth.teamId && !teamId) {
      where.teamId = auth.teamId
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

    const cost = await prisma.rustRemovalCost.create({ data: parsed.data as any })
    return success(cost, "创建成功", 201)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "创建敲铲成本记录失败", 500)
  }
}
