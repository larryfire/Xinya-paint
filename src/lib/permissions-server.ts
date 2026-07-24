// ==================== 服务端数据级权限过滤 ====================
// 此文件依赖 Prisma，仅用于 API 路由，禁止在前端组件中导入

import { prisma } from "@/lib/prisma"

/** 获取主管管理的船舶 ID 列表 */
export async function getSupervisorShipIds(userId: number): Promise<number[]> {
  const ships = await prisma.ship.findMany({
    where: { supervisorId: userId },
    select: { id: true },
  })
  return ships.map(s => s.id)
}

/** 获取主任队伍被分配到的船舶 ID 列表 */
export async function getLeaderShipIds(teamId: number): Promise<number[]> {
  const shipTeams = await prisma.shipTeam.findMany({
    where: { teamId },
    select: { shipId: true },
  })
  return shipTeams.map(st => st.shipId)
}

/** 获取主管管理的船舶上的队伍 ID 列表 */
export async function getSupervisorTeamIds(userId: number): Promise<number[]> {
  const shipIds = await getSupervisorShipIds(userId)
  if (shipIds.length === 0) return []
  const shipTeams = await prisma.shipTeam.findMany({
    where: { shipId: { in: shipIds } },
    select: { teamId: true },
  })
  return [...new Set(shipTeams.map(st => st.teamId))]
}

/**
 * 获取成本数据的查询过滤条件
 * admin: 查看全部
 * supervisor: 只看自己管理的船舶
 * leader: 只看自己队伍的
 */
export async function getCostFilter(
  role: string,
  userId: number,
  teamId: number | null
) {
  switch (role) {
    case "admin":
      return {}
    case "supervisor": {
      const shipIds = await getSupervisorShipIds(userId)
      return { shipId: shipIds.length > 0 ? { in: shipIds } : -1 }
    }
    case "leader":
      return { teamId: teamId ?? -1 }
    default:
      return { id: -1 }
  }
}

/**
 * 获取每日工时数据的查询过滤条件
 * admin: 查看全部
 * supervisor: 只看自己管理船舶的
 * leader: 只看自己队伍的 + 只看到被分配到的船舶
 */
export async function getWorkHourFilter(role: string, userId: number, teamId: number | null) {
  switch (role) {
    case "admin":
      return {}
    case "supervisor": {
      const shipIds = await getSupervisorShipIds(userId)
      return { shipId: shipIds.length > 0 ? { in: shipIds } : -1 }
    }
    case "leader": {
      if (!teamId) return { id: -1 }
      const shipIds = await getLeaderShipIds(teamId)
      return { teamId, shipId: shipIds.length > 0 ? { in: shipIds } : -1 }
    }
    default:
      return { id: -1 }
  }
}
