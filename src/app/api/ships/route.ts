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
    const teamId = searchParams.get("teamId") ? parseInt(searchParams.get("teamId")!) : undefined

    const where: Record<string, unknown> = {}

    // 主管只看自己管理的船舶
    if (auth.role === "supervisor") {
      where.supervisorId = auth.userId
    }

    if (status) where.status = status
    if (search) where.name = { contains: search }
    // 主任只看自己队伍被分配到的船舶
    if (teamId) {
      where.shipTeams = { some: { teamId } }
    }

    const [items, total] = await Promise.all([
      prisma.ship.findMany({
        where,
        include: {
          dock: { select: { name: true } },
          berth: { select: { name: true } },
          supervisor: { select: { id: true, realName: true } },
          _count: { select: { shipTeams: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.ship.count({ where }),
    ])

    const data = items.map((s) => {
      let positionLabel = ""
      if (s.dock?.name) {
        positionLabel = s.dock.name
        if (s.positionDetail) positionLabel += ` ${s.positionDetail}`
      } else if (s.berth?.name) {
        positionLabel = s.berth.name
        if (s.positionDetail) positionLabel += ` ${s.positionDetail}档`
      } else if (s.status === "at_sea") {
        positionLabel = s.positionDetail || "锚地"
      } else {
        positionLabel = s.positionDetail || "--"
      }

      return {
        id: s.id,
        name: s.name,
        shipType: s.shipType,
        length: Number(s.length),
        width: Number(s.width),
        height: Number(s.height),
        status: s.status,
        supervisorId: s.supervisorId,
        supervisorName: s.supervisor?.realName ?? null,
        dockId: s.dockId,
        dockName: s.dock?.name ?? null,
        berthId: s.berthId,
        berthName: s.berth?.name ?? null,
        positionX: s.positionX,
        positionZ: s.positionZ,
        rotation: s.rotation,
        repairStatus: s.repairStatus,
        positionDetail: s.positionDetail,
        positionLabel,
        departureDate: s.departureDate,
        teamCount: s._count.shipTeams,
        createdAt: s.createdAt,
      }
    })

    return paginated(data, total, page, pageSize)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
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
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "创建船舶失败", 500)
  }
}
