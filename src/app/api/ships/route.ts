import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error, paginated, getPaginationParams } from "@/lib/api-response"
import { createShipSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "ship:read")

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = getPaginationParams(searchParams)
    const status = searchParams.get("status") || undefined
    const search = searchParams.get("search") || undefined

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (search) where.name = { contains: search }

    const [items, total] = await Promise.all([
      prisma.ship.findMany({
        where,
        include: {
          dock: { select: { name: true } },
          berth: { select: { name: true } },
          _count: { select: { shipTeams: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.ship.count({ where }),
    ])

    const data = items.map((s) => ({
      id: s.id,
      name: s.name,
      shipType: s.shipType,
      length: Number(s.length),
      width: Number(s.width),
      height: Number(s.height),
      status: s.status,
      dockId: s.dockId,
      dockName: s.dock?.name ?? null,
      berthId: s.berthId,
      berthName: s.berth?.name ?? null,
      positionX: s.positionX,
      positionZ: s.positionZ,
      rotation: s.rotation,
      teamCount: s._count.shipTeams,
      createdAt: s.createdAt,
    }))

    return paginated(data, total, page, pageSize)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, 401)
    }
    return error("INTERNAL_ERROR", "获取船舶列表失败", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "ship:manage")
    const body = await request.json()
    const parsed = createShipSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const ship = await prisma.ship.create({ data: parsed.data as any })
    return success(ship, "创建成功", 201)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, 401)
    }
    return error("INTERNAL_ERROR", "创建船舶失败", 500)
  }
}
