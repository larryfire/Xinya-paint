// ==================== 角色-权限映射 ====================

import { prisma } from "@/lib/prisma"

export type Permission =
  | "user:manage"
  | "team:read"
  | "team:manage"
  | "ship:read"
  | "ship:manage"
  | "cost:external_plate:read"
  | "cost:external_plate:write"
  | "cost:cargo_hold:read"
  | "cost:cargo_hold:write"
  | "cost:rust_removal:read"
  | "cost:rust_removal:write"
  | "cost:water_jet:read"
  | "cost:water_jet:write"
  | "cost:team_settlement:read"
  | "work_hour:read"
  | "work_hour:write"
  | "work_hour:export"
  | "safety:view"
  | "safety:manage"
  | "dock:read"
  | "dock:manage"
  | "stats:view"

export type Role = "admin" | "supervisor" | "leader"

const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    "user:manage",
    "team:read",
    "team:manage",
    "ship:read",
    "ship:manage",
    "cost:external_plate:read",
    "cost:external_plate:write",
    "cost:cargo_hold:read",
    "cost:cargo_hold:write",
    "cost:rust_removal:read",
    "cost:rust_removal:write",
    "cost:water_jet:read",
    "cost:water_jet:write",
    "cost:team_settlement:read",
    "work_hour:read",
    "work_hour:write",
    "work_hour:export",
    "safety:view",
    "safety:manage",
    "dock:read",
    "dock:manage",
    "stats:view",
  ],
  supervisor: [
    "ship:read",
    "cost:external_plate:read",
    "cost:external_plate:write",
    "cost:cargo_hold:read",
    "cost:cargo_hold:write",
    "cost:rust_removal:read",
    "cost:rust_removal:write",
    "cost:water_jet:read",
    "cost:water_jet:write",
    "cost:team_settlement:read",
    "work_hour:read",
    "work_hour:write",
    "work_hour:export",
    "safety:view",
    "safety:manage",
    "dock:read",
    "stats:view",
    "team:read",
  ],
  leader: [
    "ship:read",
    "team:read",
    "cost:external_plate:read",
    "cost:cargo_hold:read",
    "cost:rust_removal:read",
    "cost:water_jet:read",
    "cost:team_settlement:read",
    "work_hour:read",
    "work_hour:write",
    "safety:view",
    "dock:read",
    "stats:view",
  ],
}

/** 判断角色是否拥有指定权限 */
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = rolePermissions[role as Role]
  if (!permissions) return false
  return permissions.includes(permission)
}

/** 获取角色对应的菜单项 */
export interface MenuItem {
  label: string
  href?: string
  icon: string
  permission?: Permission
  children?: MenuItem[]
}

export const allMenuItems: MenuItem[] = [
  { label: "首页仪表盘", href: "/", icon: "LayoutDashboard" },
  {
    label: "成本管理",
    icon: "DollarSign",
    permission: "cost:team_settlement:read",
    children: [
      { label: "内协队伍结算", href: "/cost-management/team-settlement", icon: "BarChart3", permission: "cost:team_settlement:read" },
      { label: "单船外板盈亏", href: "/cost-management/external-plate", icon: "Ship", permission: "cost:external_plate:read" },
      { label: "单船货舱盈亏", href: "/cost-management/cargo-hold", icon: "Archive", permission: "cost:cargo_hold:read" },
      { label: "单船水刀盈亏", href: "/cost-management/water-jet", icon: "Droplets", permission: "cost:water_jet:read" },
      { label: "敲铲项目工时", href: "/cost-management/rust-removal", icon: "Wrench", permission: "cost:rust_removal:read" },
    ],
  },
  {
    label: "安全管理",
    href: "/safety-management",
    icon: "Shield",
    permission: "safety:view",
  },
  {
    label: "人员管理",
    href: "/personnel-management",
    icon: "Users",
    permission: "team:read",
  },
  {
    label: "单船管理",
    href: "/ship-management",
    icon: "Ship",
    permission: "ship:read",
  },
  {
    label: "每日工时",
    href: "/work-hours",
    icon: "Clock",
    permission: "work_hour:read",
  },
  {
    label: "注册审核",
    href: "/admin/registrations",
    icon: "UserCheck",
    permission: "user:manage",
  },
]

/** 根据角色过滤菜单（递归处理子菜单） */
export function getMenuItems(role: string): MenuItem[] {
  if (role === "admin") return allMenuItems
  return allMenuItems
    .map((item) => {
      if (item.children) {
        const filteredChildren = item.children.filter(
          (child) => !child.permission || hasPermission(role, child.permission)
        )
        if (filteredChildren.length === 0) return null
        return { ...item, children: filteredChildren }
      }
      return item
    })
    .filter((item): item is MenuItem => {
      if (!item) return false
      if (item.children) return item.children.length > 0
      return !item.permission || hasPermission(role, item.permission)
    })
}

// ==================== 数据级权限辅助函数 ====================

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

// ==================== 数据级权限过滤 ====================

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
