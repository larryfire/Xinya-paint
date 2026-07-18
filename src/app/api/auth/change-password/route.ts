import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { authenticate } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { z } from "zod"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z.string().min(6, "新密码至少6个字符").max(100),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)

    const body = await request.json()
    const parsed = changePasswordSchema.safeParse(body)
    if (!parsed.success) {
      return error("VALIDATION_ERROR", parsed.error.issues[0].message)
    }

    const { currentPassword, newPassword } = parsed.data

    // 获取用户当前密码
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { password: true },
    })
    if (!user) {
      return error("NOT_FOUND", "用户不存在", 404)
    }

    // 验证当前密码
    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return error("WRONG_PASSWORD", "当前密码不正确", 400)
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: auth.userId },
      data: { password: hashedPassword },
    })

    return success(null, "密码修改成功")
  } catch (err) {
    if (err instanceof Error && err.name === "UnauthorizedError") {
      return error("UNAUTHORIZED", err.message, 401)
    }
    console.error("Change password error:", err)
    return error("INTERNAL_ERROR", "修改密码失败", 500)
  }
}
