import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyJWT } from "@/lib/jwt"

/**
 * 全屏布局 — WebGIS 3D大屏专用，无sidebar/header
 * 鉴权守卫：无有效token则跳转登录
 */
export default async function FullscreenLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0A1628] text-slate-200">
      {children}
    </div>
  )
}
