import { PrismaClient } from "@/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createAdapter() {
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db"

  // 根据数据库类型选择对应的适配器
  if (dbUrl.startsWith("mysql://") || dbUrl.startsWith("mariadb://")) {
    return new PrismaMariaDb(dbUrl)
  }

  return new PrismaLibSql({ url: dbUrl })
}

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma

  globalForPrisma.prisma = new PrismaClient({ adapter: createAdapter() })
  return globalForPrisma.prisma
}

// 使用 Proxy 懒加载，避免构建时过早初始化数据库连接
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop, receiver) {
    const client = getPrismaClient()
    const value = Reflect.get(client, prop, receiver)
    // 对方法调用绑定正确的 this 上下文
    if (typeof value === "function") {
      return value.bind(client)
    }
    return value
  },
})

// 开发环境下通过 globalThis 避免热重载时重复创建
if (process.env.NODE_ENV !== "production") {
  ;(globalForPrisma as any).prisma = undefined
}
