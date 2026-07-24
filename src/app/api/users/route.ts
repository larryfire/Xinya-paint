import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error, paginated, getPaginationParams } from "@/lib/api-response"
import { createUserSchema } from "@/lib/validations"
import { getSupervisorTeamIds } from "@/lib/permissions-server"

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request)
    authorize(user, "team:read")

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = getPaginationParams(searchParams)
    const role = searchParams.get("role") || undefined
    const search = searchParams.get("search") || undefined
    const approvalStatus = searchParams.get("approvalStatus") || undefined

    const where: Record<string, unknown> = { isActive: true }
    if (role) where.role = role
    if (approvalStatus) where.approvalStatus = approvalStatus
    if (search) {
      where.OR = [
        { realName: { contains: search } },
        { username: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    // 主管只看自己管理船舶队伍中的成员
    if (user.role === "supervisor") {
      const teamIds = await getSupervisorTeamIds(user.userId)
      where.teamId = teamIds.length > 0 ? { in: teamIds } : -1
      where.role = { not: "admin" }
    }
    // 主任只看自己队伍的成员
    if (user.role === "leader" && user.teamId) {
      where.teamId = user.teamId
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, username: true, realName: true, role: true,
          gender: true, age: true, craftType: true, level: true,
          phone: true, teamId: true, isActive: true, approvalStatus: true, createdAt: true,
          team: { select: { name: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ])

    const data = items.map(({ team, ...rest }) => ({
      ...rest,
      teamName: team?.name ?? null,
    }))

    return paginated(data, total, page, pageSize)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("List users error:", err)
    return error("INTERNAL_ERROR", "获取用户列表失败", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const auth = await authenticate(request)
    authorize(auth, "user:manage")

    const data = parsed.data
    const hashedPassword = await bcrypt.hash(data.password, 12)

    const newUser = await prisma.user.create({
      data: { ...data, password: hashedPassword },
      select: { id: true, username: true, realName: true, role: true, createdAt: true },
    })

    return success(newUser, "创建成功", 201)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("Create user error:", err)
    return error("INTERNAL_ERROR", "创建用户失败", 500)
  }
}
