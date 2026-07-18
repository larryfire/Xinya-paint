"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuthStore } from "@/stores/auth-store"
import { getMenuItems } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard,
  DollarSign,
  Shield,
  Users,
  Ship,
  Map,
  UserCheck,
  ChevronLeft,
} from "lucide-react"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  DollarSign,
  Shield,
  Users,
  Ship,
  Map,
  UserCheck,
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuthStore()

  const menuItems = user ? getMenuItems(user.role) : []

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-slate-900 text-white transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-slate-700">
        {!collapsed && (
          <span className="text-lg font-bold whitespace-nowrap">心雅涂装</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = iconMap[item.icon]
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 mb-0.5",
                    isActive
                      ? "bg-slate-700 text-white hover:bg-slate-700"
                      : "text-slate-400 hover:text-white hover:bg-slate-800",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {Icon && <Icon className="h-5 w-5 shrink-0" />}
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      {!collapsed && user && (
        <div className="border-t border-slate-700 p-4">
          <p className="text-xs text-slate-400 truncate">{user.realName}</p>
          <p className="text-xs text-slate-500">
            {user.role === "admin"
              ? "管理员"
              : user.role === "supervisor"
              ? "涂装主管"
              : user.role === "leader"
              ? "工地主任"
              : "员工"}
          </p>
        </div>
      )}
    </aside>
  )
}
