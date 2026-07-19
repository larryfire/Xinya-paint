import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"

/**
 * 内协队伍结算报表 - 聚合查询
 * GET /api/costs/team-settlement?type=annual&year=2026
 * GET /api/costs/team-settlement?type=monthly&year=2026&month=7
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "cost:team_settlement:read")

    const { searchParams } = request.nextUrl
    const type = searchParams.get("type") || "annual"
    const now = new Date()
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()))
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1))

    // 构建时间范围
    let startDate: Date, endDate: Date
    if (type === "monthly") {
      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 0, 23, 59, 59)
    } else {
      startDate = new Date(year, 0, 1)
      endDate = new Date(year, 11, 31, 23, 59, 59)
    }

    const teamId = searchParams.get("teamId") ? parseInt(searchParams.get("teamId")!) : undefined

    // 权限过滤
    const where: Record<string, unknown> = {
      dockEntryTime: { gte: startDate, lte: endDate },
    }
    if (auth.role === "supervisor") {
      where.supervisorId = auth.userId
    } else if (auth.role === "leader" && auth.teamId) {
      where.teamId = auth.teamId
    }
    // 显式队伍筛选（覆盖角色限制，admin可用）
    if (teamId) where.teamId = teamId

    // 按队伍聚合查询
    const items = await prisma.externalPlateCost.groupBy({
      by: ["teamId"],
      where,
      _sum: {
        settlementCost: true,
        constructionCost: true,
      },
      orderBy: { teamId: "asc" },
    })

    // 批量获取队伍名称
    const teamIds = items.map((i) => i.teamId)
    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true },
    })
    const teamMap = new Map(teams.map((t) => [t.id, t.name]))

    const data = items.map((i) => ({
      period: type === "monthly" ? `${year}-${String(month).padStart(2, "0")}` : String(year),
      teamId: i.teamId,
      teamName: teamMap.get(i.teamId) ?? "未知队伍",
      settlementCost: Number(i._sum.settlementCost ?? 0),
      constructionCost: Number(i._sum.constructionCost ?? 0),
    }))

    return success(data, "获取结算报表成功")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("Team settlement error:", err)
    return error("INTERNAL_ERROR", "获取结算报表失败", 500)
  }
}
