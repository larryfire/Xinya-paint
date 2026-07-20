import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { createDockSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "dock:read")

    const { searchParams } = new URL(request.url)
    const factoryId = searchParams.get("factoryId")
    const where: Record<string, unknown> = {}
    if (factoryId) where.factoryId = Number(factoryId)

    const docks = await prisma.dock.findMany({
      where,
      orderBy: { createdAt: "asc" },
    })
    return success(docks)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "获取码头列表失败", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "dock:manage")
    const body = await request.json()
    const parsed = createDockSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const dock = await prisma.dock.create({ data: parsed.data })
    return success(dock, "创建成功", 201)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    return error("INTERNAL_ERROR", "创建码头失败", 500)
  }
}
