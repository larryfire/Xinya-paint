"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuthStore } from "@/stores/auth-store"
import { getMenuItems, type MenuItem } from "@/lib/permissions"
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
  BarChart3,
  Archive,
  Droplets,
  Wrench,
  Clock,
  ChevronLeft,
  ChevronDown,
} from "lucide-react"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  DollarSign,
  Shield,
  Users,
  Ship,
  Map,
  UserCheck,
  BarChart3,
  Archive,
  Droplets,
  Wrench,
  Clock,
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  /** 是否为移动端 */
  isMobile?: boolean
  /** 移动端菜单是否打开 */
  mobileOpen?: boolean
  /** 移动端关闭回调 */
  onMobileClose?: () => void
}

function SidebarLink({ item, collapsed, pathname }: { item: MenuItem; collapsed: boolean; pathname: string }) {
  const Icon = iconMap[item.icon]
  const isActive = item.href
    ? item.href === "/"
      ? pathname === "/"
      : pathname.startsWith(item.href)
    : false

  return (
    <Link key={item.href} href={item.href!}>
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
}

function SidebarGroup({ item, collapsed, pathname }: { item: MenuItem; collapsed: boolean; pathname: string }) {
  const Icon = iconMap[item.icon]
  const hasActiveChild = item.children?.some((c) => c.href && pathname.startsWith(c.href))
  const [open, setOpen] = useState(hasActiveChild || false)

  if (collapsed) {
    // 折叠状态下显示为普通按钮，点击跳转到第一个子菜单
    const firstChild = item.children?.[0]
    if (firstChild?.href) {
      return <SidebarLink item={{ ...firstChild, icon: item.icon }} collapsed={collapsed} pathname={pathname} />
    }
    return null
  }

  return (
    <div className="mb-0.5">
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-800",
          hasActiveChild && "bg-slate-800 text-white"
        )}
        onClick={() => setOpen(!open)}
      >
        {Icon && <Icon className="h-5 w-5 shrink-0" />}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </Button>
      {open && item.children && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700 pl-2">
          {item.children.map((child) => (
            <SidebarLink key={child.href} item={child} collapsed={false} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar({
  collapsed,
  onToggle,
  isMobile = false,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuthStore()

  const menuItems = user ? getMenuItems(user.role) : []

  /** 点击导航链接后关闭移动菜单 */
  const handleMobileNav = () => {
    if (isMobile && onMobileClose) onMobileClose()
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-slate-900 text-white transition-all duration-300 flex flex-col",
        // 桌面端宽度
        !isMobile && (collapsed ? "w-16" : "w-60"),
        // 移动端宽度 + 滑入动画
        isMobile && "w-60",
        isMobile && (mobileOpen ? "translate-x-0" : "-translate-x-full")
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-slate-700">
        <span className="text-lg font-bold whitespace-nowrap">鑫亚涂装</span>
        {/* 桌面端：折叠按钮；移动端：关闭按钮 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={isMobile ? onMobileClose : onToggle}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 transition-transform",
              !isMobile && collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1" onClick={handleMobileNav}>
          {menuItems.map((item) => {
            if (item.children && item.children.length > 0) {
              return (
                <SidebarGroup
                  key={item.label}
                  item={item}
                  collapsed={isMobile ? false : collapsed}
                  pathname={pathname}
                />
              )
            }
            return (
              <SidebarLink
                key={item.href}
                item={item}
                collapsed={isMobile ? false : collapsed}
                pathname={pathname}
              />
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      {user && (
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
