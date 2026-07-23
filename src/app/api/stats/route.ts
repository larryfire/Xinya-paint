import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "stats:view")

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      shipCount,
      dockedShips,
      teamCount,
      teams,
      monthlyPunishments,
      teamCosts,
    ] = await Promise.all([
      // 船舶总数
      prisma.ship.count(),
      // 在厂船舶（含涂装主管信息）
      prisma.ship.findMany({
        where: { status: "docked" },
        select: {
          id: true,
          name: true,
          shipType: true,
          length: true,
          width: true,
          dock: { select: { name: true } },
          externalPlateCosts: {
            select: {
              supervisor: { select: { id: true, realName: true } },
            },
            distinct: ["supervisorId"],
            take: 3,
          },
        },
      }),
      // 队伍总数
      prisma.team.count(),
      // 队伍列表（含人数）
      prisma.team.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          leader: { select: { realName: true } },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      // 本月安全处罚
      prisma.safetyPunishment.aggregate({
        where: { punishmentTime: { gte: monthStart } },
        _count: true,
        _sum: { amount: true },
      }),
      // 本月各队伍外板成本（用于盈亏分析）
      prisma.externalPlateCost.groupBy({
        by: ["teamId"],
        _sum: { settlementCost: true, constructionCost: true },
      }),
    ])

    // 获取队伍名称映射
    const teamMap = new Map(teams.map((t) => [t.id, t.name]))

    // 各队伍盈亏明细
    const teamProfitLoss = teamCosts
      .map((c) => {
        const settlement = Number(c._sum.settlementCost || 0)
        const construction = Number(c._sum.constructionCost || 0)
        return {
          teamId: c.teamId,
          teamName: teamMap.get(c.teamId) || `队伍${c.teamId}`,
          settlementCost: Math.round(settlement * 100) / 100,
          constructionCost: Math.round(construction * 100) / 100,
          profitLoss: Math.round((settlement - construction) * 100) / 100,
        }
      })
      .sort((a, b) => a.profitLoss - b.profitLoss) // 亏损的排前面

    const totalSettlement = teamProfitLoss.reduce((s, t) => s + t.settlementCost, 0)
    const totalConstruction = teamProfitLoss.reduce((s, t) => s + t.constructionCost, 0)
    const totalProfitLoss = totalSettlement - totalConstruction

    // 亏损分析
    const losingTeams = teamProfitLoss.filter((t) => t.profitLoss < 0)
    const lossRate = teamProfitLoss.length > 0
      ? Math.round((losingTeams.length / teamProfitLoss.length) * 100)
      : 0
    const totalLoss = Math.round(losingTeams.reduce((s, t) => s + t.profitLoss, 0) * 100) / 100

    // 亏损原因分析
    const lossAnalysis = losingTeams.map((t) => {
      const reasons: string[] = []
      if (t.constructionCost > t.settlementCost * 1.2) {
        reasons.push("施工成本超支20%以上")
      } else if (t.constructionCost > t.settlementCost) {
        reasons.push("施工成本略超结算")
      }
      if (t.settlementCost < t.constructionCost * 0.8) {
        reasons.push("结算价偏低")
      }
      return {
        teamName: t.teamName,
        profitLoss: t.profitLoss,
        settlementCost: t.settlementCost,
        constructionCost: t.constructionCost,
        reasons: reasons.length > 0 ? reasons : ["综合因素导致亏损"],
        suggestion: t.constructionCost > t.settlementCost * 1.3
          ? "建议审核施工流程，控制材料与人工成本"
          : "建议与甲方协商提高结算单价",
      }
    })

    // 在厂船舶整理（提取主管名）
    const dockedShipList = dockedShips.map((s) => ({
      id: s.id,
      name: s.name,
      shipType: s.shipType,
      length: Number(s.length),
      width: Number(s.width),
      dockName: s.dock?.name ?? null,
      supervisors: s.externalPlateCosts.map((c) => c.supervisor.realName),
    }))
    const dockedShipCount = dockedShipList.length

    return success({
      shipCount,
      dockedShipCount,
      dockedShips: dockedShipList,
      teamCount,
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        leaderName: t.leader?.realName ?? null,
        memberCount: t._count.members,
      })),
      monthlyPunishmentCount: monthlyPunishments._count,
      monthlyPunishmentAmount: Number(monthlyPunishments._sum.amount || 0),
      totalSettlement: Math.round(totalSettlement * 100) / 100,
      totalConstruction: Math.round(totalConstruction * 100) / 100,
      totalProfitLoss: Math.round(totalProfitLoss * 100) / 100,
      teamProfitLoss,
      lossAnalysis: {
        losingCount: losingTeams.length,
        totalLoss,
        lossRate,
        teams: lossAnalysis,
      },
    })
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "获取统计数据失败", 500)
  }
}
