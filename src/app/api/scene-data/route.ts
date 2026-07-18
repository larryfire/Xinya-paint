import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "scene:view")

    const [docks, ships] = await Promise.all([
      prisma.dock.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.ship.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          id: true, name: true, shipType: true, status: true,
          dockId: true, berthId: true, positionX: true, positionZ: true,
          rotation: true, length: true, width: true, height: true,
          dock: { select: { name: true } },
          berth: { select: { name: true } },
        },
      }),
    ])

    return success({
      docks,
      ships: ships.map((s) => {
        const { dock, berth, ...rest } = s as Record<string, unknown>
        return {
          ...rest,
          length: Number(s.length),
          width: Number(s.width),
          height: Number(s.height),
          dockName: (dock as { name: string } | null)?.name ?? null,
          berthName: (berth as { name: string } | null)?.name ?? null,
        }
      }),
    })
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "获取场景数据失败", 500)
  }
}
