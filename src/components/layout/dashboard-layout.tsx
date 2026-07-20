"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useAuthStore } from "@/stores/auth-store"
import { useUiStore } from "@/stores/ui-store"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

/** 移动端断点：屏幕宽度 < 1024px 时启用移动端布局 */
const MOBILE_BREAKPOINT = 1024

/**
 * Dashboard 主布局 — 包含鉴权加载状态管理
 * 页面刷新时先显示 loading，等 /api/auth/me 返回后再渲染内容
 * 支持桌面端（侧边栏 + 主内容区）和移动端（overlay 侧边栏）双模式
 */
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, token, setUser, setLoading } = useAuthStore()
  const {
    sidebarCollapsed,
    mobileMenuOpen,
    toggleSidebar,
    setMobileMenuOpen,
  } = useUiStore()
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  // 监听屏幕宽度，判断是否为移动端
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // 移动端菜单打开时禁止 body 滚动
  useEffect(() => {
    if (isMobile && mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMobile, mobileMenuOpen])

  // 切换到桌面端时自动关闭移动菜单
  useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false)
  }, [isMobile, setMobileMenuOpen])

  // 页面加载时从服务端获取当前用户信息
  useEffect(() => {
    if (user) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchUser() {
      try {
        const headers: Record<string, string> = {}
        // 移动端兼容：通过 Authorization header 传递 token
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }
        const res = await fetch("/api/auth/me", { headers })
        if (!cancelled && res.ok) {
          const data = await res.json()
          if (data.success) {
            setUser(data.data)
            return
          }
        }
        if (!cancelled) {
          setUser(null)
          router.replace("/login")
        }
      } catch {
        if (!cancelled) {
          setUser(null)
          router.replace("/login")
        }
      }
    }

    fetchUser()

    return () => {
      cancelled = true
    }
  }, []) // 仅在挂载时执行一次

  // 初始加载中：显示 loading 动画
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">正在加载...</p>
        </div>
      </div>
    )
  }

  // 加载完成但无用户信息（token失效等）→ 跳转登录
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        isMobile={isMobile}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* 移动端遮罩层 */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          "transition-all duration-300",
          isMobile
            ? "ml-0"
            : sidebarCollapsed
              ? "ml-16"
              : "ml-60"
        )}
      >
        <Header
          isMobile={isMobile}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className={cn(isMobile ? "p-4" : "p-6")}>{children}</main>
      </div>
    </div>
  )
}
