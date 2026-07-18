import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "stats:view")

    const [
      shipCount,
      teamCount,
      monthlyPunishments,
      costSummary,
    ] = await Promise.all([
      prisma.ship.count(),
      prisma.team.count(),
      prisma.safetyPunishment.aggregate({
        where: {
          punishmentTime: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.externalPlateCost.aggregate({
        _sum: {
          settlementCost: true,
          constructionCost: true,
        },
      }),
    ])

    const totalSettlement = Number(costSummary._sum.settlementCost || 0)
    const totalConstruction = Number(costSummary._sum.constructionCost || 0)

    return success({
      shipCount,
      teamCount,
      monthlyPunishmentCount: monthlyPunishments._count,
      monthlyPunishmentAmount: Number(monthlyPunishments._sum.amount || 0),
      totalSettlement,
      totalConstruction,
      totalProfitLoss: totalSettlement - totalConstruction,
    })
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "获取统计数据失败", 500)
  }
}
