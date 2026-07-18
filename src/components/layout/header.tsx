"use client"

import { useState, useRef, useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User, Key, RefreshCw, ChevronRight } from "lucide-react"
import { ProfileDialog } from "@/components/profile/profile-dialog"
import { ChangePasswordDialog } from "@/components/profile/change-password-dialog"
import { cn } from "@/lib/utils"

export function Header() {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  /** 关闭菜单并执行回调 */
  const withClose = (fn: () => void) => {
    setMenuOpen(false)
    fn()
  }

  /** 切换账号 */
  const handleSwitchAccount = async () => {
    await logout()
    router.push("/login")
  }

  /** 退出登录 */
  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const initials = user?.realName?.charAt(0) || "U"

  const roleLabel =
    user?.role === "admin"
      ? "管理员"
      : user?.role === "supervisor"
        ? "涂装主管"
        : user?.role === "leader"
          ? "工地主任"
          : "员工"

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            船舶涂装管理系统
          </h2>
        </div>

        {/* 用户菜单 — 纯自定义实现，避免 @base-ui/react 兼容问题 */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-8 px-2.5",
              "hover:bg-slate-100 hover:text-foreground",
              menuOpen && "bg-slate-100"
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-slate-700 text-white text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user?.realName}</span>
          </button>

          {/* 下拉菜单面板 */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border bg-white shadow-lg ring-1 ring-black/5">
              {/* 用户标签 */}
              <div className="px-3 py-2.5">
                <p className="text-sm font-medium">{user?.realName}</p>
                <p className="text-xs text-slate-500">{roleLabel}</p>
              </div>

              <div className="h-px bg-slate-100" />

              {/* 个人信息 */}
              <button
                type="button"
                onClick={() => withClose(() => setProfileOpen(true))}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
              >
                <User className="h-4 w-4 text-slate-500" />
                <span className="flex-1">个人信息</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {/* 修改密码 */}
              <button
                type="button"
                onClick={() => withClose(() => setPasswordOpen(true))}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
              >
                <Key className="h-4 w-4 text-slate-500" />
                <span className="flex-1">修改密码</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {/* 切换账号 */}
              <button
                type="button"
                onClick={() => withClose(handleSwitchAccount)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4 text-slate-500" />
                <span className="flex-1">切换账号</span>
              </button>

              <div className="h-px bg-slate-100" />

              {/* 退出登录 */}
              <button
                type="button"
                onClick={() => withClose(handleLogout)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
              >
                <LogOut className="h-4 w-4 text-slate-500" />
                <span className="flex-1">退出登录</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 个人信息弹窗 */}
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

      {/* 修改密码弹窗 */}
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  )
}
