"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useAuthStore } from "@/stores/auth-store"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

/**
 * Dashboard 主布局 — 包含鉴权加载状态管理
 * 页面刷新时先显示 loading，等 /api/auth/me 返回后再渲染内容
 */
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const { user, isLoading, setUser, setLoading } = useAuthStore()
  const router = useRouter()

  // 页面加载时从服务端获取当前用户信息
  useEffect(() => {
    if (user) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me")
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
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className={cn(
          "transition-all duration-300",
          collapsed ? "ml-16" : "ml-60"
        )}
      >
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
