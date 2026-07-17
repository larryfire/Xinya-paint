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
  | "safety:view"
  | "safety:manage"
  | "dock:read"
  | "dock:manage"
  | "scene:view"
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
    "safety:view",
    "safety:manage",
    "dock:read",
    "dock:manage",
    "scene:view",
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
    "safety:view",
    "safety:manage",
    "dock:read",
    "scene:view",
    "stats:view",
    "team:read",
  ],
  leader: [
    "ship:read",
    "cost:external_plate:read",
    "cost:cargo_hold:read",
    "cost:rust_removal:read",
    "safety:view",
    "dock:read",
    "scene:view",
    "stats:view",
    "team:read",
  ],
  worker: ["ship:read", "safety:view", "scene:view", "team:read"],
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
  href: string
  icon: string
  permission?: Permission
}

export const allMenuItems: MenuItem[] = [
  { label: "首页仪表盘", href: "/", icon: "LayoutDashboard" },
  {
    label: "成本管理",
    href: "/cost-management/external-plate",
    icon: "DollarSign",
    permission: "cost:external_plate:read",
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
    label: "3D船舶动态",
    href: "/3d-dynamic",
    icon: "Map",
    permission: "scene:view",
  },
]

/** 根据角色过滤菜单 */
export function getMenuItems(role: string): MenuItem[] {
  if (role === "admin") return allMenuItems
  return allMenuItems.filter(
    (item) => !item.permission || hasPermission(role, item.permission)
  )
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
