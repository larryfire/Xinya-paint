import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"

/**
 * GET /api/scene-settings?factoryId=1
 * 获取指定厂区的3D场景设置
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const factoryId = Number(searchParams.get("factoryId") || "1")

    let settings = await prisma.sceneSettings.findUnique({
      where: { factoryId },
    })
    if (!settings) {
      settings = await prisma.sceneSettings.create({
        data: {
          factoryId,
          coastlineZ: 0,
          waterOpacity: 0.6,
          ambientIntensity: 0.6,
          bgColor: "#0A1628",
          fogNear: 60,
          fogFar: 200,
        },
      })
    }
    return success(settings)
  } catch (err) {
    console.error("SceneSettings GET error:", err)
    return error("INTERNAL_ERROR", "获取场景设置失败", 500)
  }
}

/**
 * PUT /api/scene-settings?factoryId=1
 * 更新指定厂区的3D场景设置
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "dock:manage")

    const { searchParams } = new URL(request.url)
    const factoryId = Number(searchParams.get("factoryId") || "1")
    const body = await request.json()

    const settings = await prisma.sceneSettings.upsert({
      where: { factoryId },
      create: { factoryId, ...body },
      update: body,
    })
    return success(settings, "场景设置已更新")
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === "UnauthorizedError" || err.name === "ForbiddenError")
    ) {
      return error(
        err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN",
        err.message,
        err.name === "UnauthorizedError" ? 401 : 403
      )
    }
    console.error("SceneSettings PUT error:", err)
    return error("INTERNAL_ERROR", "更新场景设置失败", 500)
  }
}
