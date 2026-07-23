// ==================== 角色-权限映射 ====================

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

export type Role = "admin" | "supervisor" | "leader" | "worker"

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
    "team:read",
  ],
  worker: ["ship:read", "safety:view", "team:read"],
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

// ==================== 数据级权限过滤 ====================

/**
 * 获取成本数据的查询过滤条件
 * admin: 查看全部
 * supervisor: 只看自己主管的
 * leader: 只看自己队伍的
 * worker: 无权限返回空
 */
export function getCostFilter(
  role: string,
  userId: number,
  teamId: number | null
) {
  switch (role) {
    case "admin":
      return {}
    case "supervisor":
      return { supervisorId: userId }
    case "leader":
      return { teamId: teamId ?? -1 }
    default:
      return { id: -1 }
  }
}

/**
 * 获取每日工时数据的查询过滤条件
 * admin/supervisor: 查看全部
 * leader: 只看自己队伍的
 * worker: 无权限返回空
 */
export function getWorkHourFilter(role: string, teamId: number | null) {
  switch (role) {
    case "admin":
    case "supervisor":
      return {}
    case "leader":
      return { teamId: teamId ?? -1 }
    default:
      return { id: -1 }
  }
}
