import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { updateShipPositionSchema } from "@/lib/validations"

/** 更新船舶3D位置（管理员拖拽后保存） */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "ship:manage")

    const { id } = await params
    const body = await request.json()
    const parsed = updateShipPositionSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const ship = await prisma.ship.update({
      where: { id: parseInt(id) },
      data: {
        positionX: parsed.data.positionX,
        positionZ: parsed.data.positionZ,
        rotation: parsed.data.rotation ?? undefined,
        dockId: parsed.data.dockId ?? undefined,
        berthId: parsed.data.berthId ?? undefined,
        ...(parsed.data.dockId !== undefined && { status: "docked" as const }),
        ...(parsed.data.berthId !== undefined && parsed.data.dockId === undefined && { status: "at_berth" as const }),
      },
    })

    return success({
      id: ship.id,
      positionX: ship.positionX,
      positionZ: ship.positionZ,
      rotation: ship.rotation,
      dockId: ship.dockId,
      berthId: ship.berthId,
      status: ship.status,
    }, "位置已更新")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("Position update error:", err)
    return error("INTERNAL_ERROR", "更新位置失败", 500)
  }
}
