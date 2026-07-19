import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"

export async function GET() {
  try {
    let settings = await prisma.sceneSettings.findUnique({ where: { id: 1 } })
    if (!settings) {
      settings = await prisma.sceneSettings.create({ data: { id: 1 } })
    }
    return success(settings)
  } catch (err) {
    console.error("SceneSettings GET error:", err)
    return error("INTERNAL_ERROR", "获取场景设置失败", 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "dock:manage") // 复用 dock 管理权限

    const body = await request.json()
    const settings = await prisma.sceneSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...body },
      update: body,
    })
    return success(settings, "场景设置已更新")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("SceneSettings PUT error:", err)
    return error("INTERNAL_ERROR", "更新场景设置失败", 500)
  }
}
