import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { createDockSchema } from "@/lib/validations"

/** 更新码头/车间位置和尺寸 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "dock:manage")
    const { id } = await params
    const body = await request.json()

    // 使用 createDockSchema 做校验（更新时全部字段可选）
    const dock = await prisma.dock.update({
      where: { id: parseInt(id) },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.positionX !== undefined && { positionX: body.positionX }),
        ...(body.positionZ !== undefined && { positionZ: body.positionZ }),
        ...(body.width !== undefined && { width: body.width }),
        ...(body.depth !== undefined && { depth: body.depth }),
        ...(body.status !== undefined && { status: body.status }),
      },
    })
    return success(dock, "更新成功")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("Dock PUT error:", err)
    return error("INTERNAL_ERROR", "更新码头失败", 500)
  }
}

/** 删除码头/车间 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "dock:manage")
    const { id } = await params

    // 清除关联船舶的 dockId/berthId
    const dockId = parseInt(id)
    await prisma.ship.updateMany({ where: { dockId }, data: { dockId: null, status: "at_sea" } })
    await prisma.ship.updateMany({ where: { berthId: dockId }, data: { berthId: null, status: "at_sea" } })
    await prisma.dock.delete({ where: { id: dockId } })

    return success(null, "删除成功")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("Dock DELETE error:", err)
    return error("INTERNAL_ERROR", "删除码头失败", 500)
  }
}
