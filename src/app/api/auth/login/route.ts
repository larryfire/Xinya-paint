import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signJWT } from "@/lib/jwt"
import { success, error } from "@/lib/api-response"
import { loginSchema } from "@/lib/validations"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return error("VALIDATION_ERROR", parsed.error.issues[0].message)
    }

    const { username, password } = parsed.data

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username },
      include: { team: { select: { name: true } } },
    })

    if (!user || !user.isActive) {
      return error("AUTH_FAILED", "用户名或密码错误", 401)
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return error("AUTH_FAILED", "用户名或密码错误", 401)
    }

    // 签发 JWT
    const token = await signJWT({
      userId: user.id,
      username: user.username,
      role: user.role,
      teamId: user.teamId,
    })

    const res = success(
      {
        user: {
          id: user.id,
          username: user.username,
          realName: user.realName,
          role: user.role,
          teamId: user.teamId,
          teamName: user.team?.name ?? null,
        },
      },
      "登录成功"
    )

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24小时
      path: "/",
    })

    return res
  } catch (err) {
    console.error("Login error:", err)
    return error("INTERNAL_ERROR", "登录失败，请稍后重试", 500)
  }
}
