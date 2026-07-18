import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyJWT } from "@/lib/jwt"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

/**
 * Dashboard 布局 — 服务端鉴权守卫
 * 双重保护：Proxy 层 + Layout 层，确保未登录用户无法访问任何 dashboard 页面
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  // 服务端读取 token cookie 并校验
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value

  if (!token) {
    redirect("/login")
  }

  try {
    await verifyJWT(token)
  } catch {
    redirect("/login")
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
