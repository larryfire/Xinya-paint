import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { z } from "zod"

/** 注册表单校验：手机号 + 姓名 + 密码 */
const registerSchema = z.object({
  phone: z
    .string()
    .min(1, "手机号不能为空")
    .regex(/^1[3-9]\d{9}$/, "请输入有效的手机号"),
  realName: z.string().min(1, "姓名不能为空").max(50, "姓名最多50个字符"),
  password: z.string().min(6, "密码至少6个字符").max(100, "密码最多100个字符"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return error("VALIDATION_ERROR", parsed.error.issues[0].message)
    }

    const { phone, realName, password } = parsed.data

    // 检查手机号是否已被注册
    const existingPhone = await prisma.user.findFirst({
      where: { phone },
    })
    if (existingPhone) {
      return error("PHONE_EXISTS", "该手机号已被注册")
    }

    // 生成唯一用户名：user_ + 手机号后6位 + 随机2位
    const phoneSuffix = phone.slice(-6)
    let username = `user_${phoneSuffix}`
    const existingUser = await prisma.user.findUnique({
      where: { username },
    })
    if (existingUser) {
      // 重名则加随机后缀
      const randomSuffix = Math.random().toString(36).slice(2, 4)
      username = `user_${phoneSuffix}_${randomSuffix}`
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 12)

    // 创建用户 — approvalStatus = "pending" 表示待审核
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        realName,
        phone,
        role: "worker",
        approvalStatus: "pending",
      },
      select: {
        id: true,
        username: true,
        realName: true,
        phone: true,
        approvalStatus: true,
        createdAt: true,
      },
    })

    return success(
      {
        id: user.id,
        username: user.username,
        realName: user.realName,
        phone: user.phone,
        approvalStatus: user.approvalStatus,
        message: "注册成功，请等待管理员审核",
      },
      "注册成功",
      201
    )
  } catch (err) {
    console.error("Register error:", err)
    return error("INTERNAL_ERROR", "注册失败，请稍后重试", 500)
  }
}
