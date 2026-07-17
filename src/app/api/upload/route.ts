import { NextRequest } from "next/server"
import { writeFile } from "fs/promises"
import { join } from "path"
import crypto from "crypto"
import { success, error } from "@/lib/api-response"
import { authenticate } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    await authenticate(request)

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return error("NO_FILE", "请选择文件")

    // 校验文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return error("INVALID_TYPE", "仅支持 JPG/PNG/GIF/WebP 格式")
    }

    // 校验文件大小 (最大 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return error("TOO_LARGE", "文件大小不能超过 10MB")
    }

    // 生成唯一文件名
    const ext = file.name.split(".").pop() || "jpg"
    const fileName = `${crypto.randomUUID()}.${ext}`
    const uploadDir = join(process.cwd(), "public", "images", "uploads")

    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, fileName), Buffer.from(bytes))

    return success({ url: `/images/uploads/${fileName}` }, "上传成功")
  } catch (err) {
    if (err instanceof Error && err.name === "UnauthorizedError") {
      return error("UNAUTHORIZED", err.message, 401)
    }
    console.error("Upload error:", err)
    return error("INTERNAL_ERROR", "上传失败", 500)
  }
}
