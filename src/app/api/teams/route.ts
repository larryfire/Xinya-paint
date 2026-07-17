import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error, paginated, getPaginationParams } from "@/lib/api-response"
import { createTeamSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "team:read")

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = getPaginationParams(searchParams)
    const search = searchParams.get("search") || undefined

    const where: Record<string, unknown> = {}
    if (search) where.name = { contains: search }

    // 工地主任只能看自己的队伍
    if (auth.role === "leader" && auth.teamId) {
      where.id = auth.teamId
    }

    const [items, total] = await Promise.all([
      prisma.team.findMany({
        where,
        include: {
          leader: { select: { id: true, realName: true } },
          _count: { select: { members: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.team.count({ where }),
    ])

    const data = items.map((t) => ({
      id: t.id,
      name: t.name,
      leaderId: t.leaderId,
      leaderName: t.leader?.realName ?? null,
      description: t.description,
      memberCount: t._count.members,
      createdAt: t.createdAt,
    }))

    return paginated(data, total, page, pageSize)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "获取队伍列表失败", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "team:manage")

    const body = await request.json()
    const parsed = createTeamSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const team = await prisma.team.create({ data: parsed.data })
    return success(team, "创建成功", 201)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "创建队伍失败", 500)
  }
}
