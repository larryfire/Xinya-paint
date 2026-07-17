import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error, paginated, getPaginationParams } from "@/lib/api-response"
import { createSafetyPunishmentSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "safety:view")

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = getPaginationParams(searchParams)
    const teamId = searchParams.get("teamId") ? parseInt(searchParams.get("teamId")!) : undefined
    const category = searchParams.get("category") || undefined
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined

    const where: Record<string, unknown> = {}

    // 数据过滤
    if (auth.role === "leader" && auth.teamId) where.teamId = auth.teamId
    else if (auth.role === "worker") where.punishedPersonId = auth.userId
    else if (teamId) where.teamId = teamId

    if (category) where.category = category
    if (startDate || endDate) {
      where.punishmentTime = {}
      if (startDate) (where.punishmentTime as any).gte = new Date(startDate)
      if (endDate) (where.punishmentTime as any).lte = new Date(endDate)
    }

    const [items, total] = await Promise.all([
      prisma.safetyPunishment.findMany({
        where,
        include: {
          team: { select: { name: true } },
          punishedPerson: { select: { realName: true } },
          issuer: { select: { realName: true } },
        },
        skip, take: pageSize, orderBy: { punishmentTime: "desc" },
      }),
      prisma.safetyPunishment.count({ where }),
    ])

    const data = items.map((p) => ({
      id: p.id,
      teamId: p.teamId,
      teamName: p.team.name,
      punishedPersonId: p.punishedPersonId,
      punishedPersonName: p.punishedPerson?.realName ?? null,
      issuerId: p.issuerId,
      issuerName: p.issuer.realName,
      punishmentTime: p.punishmentTime,
      category: p.category,
      amount: Number(p.amount),
      reason: p.reason,
      createdAt: p.createdAt,
    }))

    return paginated(data, total, page, pageSize)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, 401)
    }
    return error("INTERNAL_ERROR", "获取处罚记录失败", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "safety:manage")
    const body = await request.json()
    const parsed = createSafetyPunishmentSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const punishment = await prisma.safetyPunishment.create({
      data: {
        ...parsed.data,
        punishmentTime: new Date(parsed.data.punishmentTime),
      } as any,
    })
    return success(punishment, "创建成功", 201)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, 401)
    }
    return error("INTERNAL_ERROR", "创建处罚记录失败", 500)
  }
}
