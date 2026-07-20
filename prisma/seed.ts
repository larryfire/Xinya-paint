// 鑫亚涂装 - 种子数据（双厂区：鑫亚 + 亚泰）
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import bcrypt from "bcryptjs"

const dbUrl = process.env.DATABASE_URL || "file:./dev.db"

// 根据数据库类型选择适配器
const adapter = (dbUrl.startsWith("mysql://") || dbUrl.startsWith("mariadb://"))
  ? new PrismaMariaDb(dbUrl)
  : new PrismaLibSql({ url: dbUrl })

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("开始播种数据...")
  console.log("数据库路径:", dbUrl)

  // 1. 创建用户
  const adminPw = await bcrypt.hash("admin123", 12)
  const supervisorPw = await bcrypt.hash("super123", 12)
  const leaderPw = await bcrypt.hash("leader123", 12)
  const workerPw = await bcrypt.hash("worker123", 12)

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin", password: adminPw, realName: "系统管理员",
      role: "admin", gender: "male", phone: "13800000001",
    },
  })

  await prisma.user.upsert({
    where: { username: "supervisor1" },
    update: {},
    create: {
      username: "supervisor1", password: supervisorPw, realName: "张主管",
      role: "supervisor", gender: "male", age: 42, phone: "13800000002",
    },
  })

  const leader = await prisma.user.upsert({
    where: { username: "leader1" },
    update: {},
    create: {
      username: "leader1", password: leaderPw, realName: "李主任",
      role: "leader", gender: "male", age: 38, phone: "13800000003",
    },
  })

  // 2. 创建队伍
  const team1 = await prisma.team.upsert({
    where: { name: "鑫海涂装队" },
    update: {},
    create: { name: "鑫海涂装队", leaderId: leader.id, description: "专业船舶外板涂装施工队伍" },
  })
  const team2 = await prisma.team.upsert({
    where: { name: "通达除锈队" },
    update: {},
    create: { name: "通达除锈队", description: "高压水除锈与敲铲专业队" },
  })
  const team3 = await prisma.team.upsert({
    where: { name: "安达喷漆队" },
    update: {},
    create: { name: "安达喷漆队", description: "货舱喷漆与涂装施工" },
  })

  await prisma.user.update({ where: { id: leader.id }, data: { teamId: team1.id } })

  // 3. 创建工人
  const workers = [
    { username: "worker1", realName: "王大锤", gender: "male", age: 35, craftType: "喷漆工", level: "高级工", teamId: team1.id },
    { username: "worker2", realName: "刘铁柱", gender: "male", age: 28, craftType: "打磨工", level: "中级工", teamId: team1.id },
    { username: "worker3", realName: "赵小刚", gender: "male", age: 32, craftType: "除锈工", level: "中级工", teamId: team2.id },
    { username: "worker4", realName: "陈阿强", gender: "male", age: 45, craftType: "涂装工", level: "高级技师", teamId: team2.id },
    { username: "worker5", realName: "林师傅", gender: "male", age: 50, craftType: "焊工", level: "技师", teamId: team3.id },
    { username: "worker6", realName: "周美芳", gender: "female", age: 26, craftType: "质检员", level: "初级工", teamId: team3.id },
  ]
  for (const w of workers) {
    await prisma.user.upsert({
      where: { username: w.username },
      update: {},
      create: { ...w, password: workerPw, role: "worker" },
    })
  }

  // ==================== 鑫亚厂区 (factoryId=1) ====================
  console.log("创建鑫亚厂区数据...")

  // 4. 码头/船坞/泊位 - 鑫亚
  const xinyaDocks: Array<{
    name: string; type: string; factoryId: number; positionX: number; positionZ: number
    width: number; depth: number; status: string
  }> = [
    { name: "1号船坞", type: "dock", factoryId: 1, positionX: -30, positionZ: -15, width: 12, depth: 40, status: "available" },
    { name: "2号船坞", type: "dock", factoryId: 1, positionX: 0, positionZ: -15, width: 12, depth: 40, status: "occupied" },
    { name: "3号船坞", type: "dock", factoryId: 1, positionX: 30, positionZ: -15, width: 12, depth: 40, status: "maintenance" },
    { name: "4号船坞", type: "dock", factoryId: 1, positionX: -15, positionZ: -12, width: 10, depth: 35, status: "available" },
    { name: "A泊位", type: "berth", factoryId: 1, positionX: -25, positionZ: 15, width: 8, depth: 30, status: "available" },
    { name: "B泊位", type: "berth", factoryId: 1, positionX: 5, positionZ: 15, width: 8, depth: 30, status: "occupied" },
    { name: "C泊位", type: "berth", factoryId: 1, positionX: 30, positionZ: 15, width: 8, depth: 30, status: "available" },
    { name: "D泊位", type: "berth", factoryId: 1, positionX: -40, positionZ: 18, width: 8, depth: 28, status: "available" },
    // 车间和仓库
    { name: "涂装一车间", type: "workshop", factoryId: 1, positionX: -35, positionZ: -30, width: 8, depth: 15, status: "occupied" },
    { name: "涂装二车间", type: "workshop", factoryId: 1, positionX: -20, positionZ: -30, width: 8, depth: 15, status: "available" },
    { name: "除锈车间", type: "workshop", factoryId: 1, positionX: -5, positionZ: -32, width: 8, depth: 15, status: "occupied" },
    { name: "喷漆车间", type: "workshop", factoryId: 1, positionX: 10, positionZ: -30, width: 8, depth: 15, status: "available" },
    { name: "机加工车间", type: "workshop", factoryId: 1, positionX: 25, positionZ: -30, width: 8, depth: 15, status: "available" },
    { name: "综合车间", type: "workshop", factoryId: 1, positionX: 40, positionZ: -32, width: 8, depth: 15, status: "maintenance" },
    { name: "材料仓库", type: "warehouse", factoryId: 1, positionX: 45, positionZ: -20, width: 6, depth: 12, status: "available" },
    { name: "油漆仓库", type: "warehouse", factoryId: 1, positionX: -42, positionZ: -22, width: 5, depth: 10, status: "available" },
  ]

  for (const dock of xinyaDocks) {
    const existing = await prisma.dock.findFirst({ where: { name: dock.name, factoryId: 1 } })
    if (!existing) {
      await prisma.dock.create({ data: dock })
    }
  }

  // 船舶 - 鑫亚
  const xinyaShips: Array<{
    name: string; shipType: string; length: number; width: number; height: number
    status: string; factoryId: number; dockId?: number | null; berthId?: number | null
    positionX: number; positionZ: number
  }> = [
    { name: "远洋1号", shipType: "散货船", length: 180, width: 30, height: 22, status: "docked", factoryId: 1, dockId: null, positionX: 0, positionZ: -5 },
    { name: "海油2号", shipType: "油轮", length: 220, width: 36, height: 28, status: "at_berth", factoryId: 1, berthId: null, positionX: 5, positionZ: 20 },
    { name: "散货3号", shipType: "散货船", length: 150, width: 26, height: 18, status: "at_sea", factoryId: 1, positionX: 25, positionZ: 35 },
    { name: "长风6号", shipType: "集装箱船", length: 200, width: 32, height: 25, status: "maintenance", factoryId: 1, dockId: null, positionX: 30, positionZ: -8 },
    { name: "海丰8号", shipType: "化学品船", length: 160, width: 28, height: 20, status: "at_sea", factoryId: 1, positionX: -20, positionZ: 40 },
  ]

  // 关联dockId和berthId
  const dock2Id = (await prisma.dock.findFirst({ where: { name: "2号船坞", factoryId: 1 } }))?.id
  const dock3Id = (await prisma.dock.findFirst({ where: { name: "3号船坞", factoryId: 1 } }))?.id
  const berthBId = (await prisma.dock.findFirst({ where: { name: "B泊位", factoryId: 1 } }))?.id

  const xinyaShipsWithDocks = xinyaShips.map((s, i) => {
    if (i === 0) return { ...s, dockId: dock2Id }
    if (i === 1) return { ...s, berthId: berthBId }
    if (i === 3) return { ...s, dockId: dock3Id }
    return s
  })

  for (const ship of xinyaShipsWithDocks) {
    await prisma.ship.upsert({
      where: { name: ship.name },
      update: { factoryId: 1 },
      create: ship,
    })
  }

  // 门机 - 鑫亚
  const xinyaCranes: Array<{
    name: string; factoryId: number; dockId: number | null
    positionX: number; positionZ: number; rotation: number; status: string
  }> = [
    { name: "鑫亚1号门机", factoryId: 1, dockId: null, positionX: -33, positionZ: -14, rotation: 0, status: "active" },
    { name: "鑫亚2号门机", factoryId: 1, dockId: null, positionX: -27, positionZ: -14, rotation: 0, status: "active" },
    { name: "鑫亚3号门机", factoryId: 1, dockId: null, positionX: -3, positionZ: -14, rotation: 0, status: "active" },
    { name: "鑫亚4号门机", factoryId: 1, dockId: null, positionX: 3, positionZ: -14, rotation: 0, status: "active" },
    { name: "鑫亚5号门机", factoryId: 1, dockId: null, positionX: 27, positionZ: -14, rotation: 0, status: "maintenance" },
    { name: "鑫亚6号门机", factoryId: 1, dockId: null, positionX: 33, positionZ: -14, rotation: 0, status: "active" },
    { name: "鑫亚7号门机", factoryId: 1, dockId: null, positionX: -17, positionZ: -11, rotation: 0, status: "active" },
    { name: "鑫亚8号门机", factoryId: 1, dockId: null, positionX: -13, positionZ: -11, rotation: 0, status: "idle" },
  ]
  for (const crane of xinyaCranes) {
    const existing = await prisma.gantryCrane.findFirst({ where: { name: crane.name, factoryId: 1 } })
    if (!existing) await prisma.gantryCrane.create({ data: crane })
  }

  // ==================== 亚泰厂区 (factoryId=2) ====================
  console.log("创建亚泰厂区数据...")

  const yataiDocks: Array<{
    name: string; type: string; factoryId: number; positionX: number; positionZ: number
    width: number; depth: number; status: string
  }> = [
    { name: "亚泰1号坞", type: "dock", factoryId: 2, positionX: -20, positionZ: -12, width: 11, depth: 38, status: "occupied" },
    { name: "亚泰2号坞", type: "dock", factoryId: 2, positionX: 5, positionZ: -12, width: 11, depth: 38, status: "available" },
    { name: "亚泰3号坞", type: "dock", factoryId: 2, positionX: 30, positionZ: -12, width: 11, depth: 35, status: "available" },
    { name: "亚泰A泊位", type: "berth", factoryId: 2, positionX: -15, positionZ: 18, width: 7, depth: 28, status: "available" },
    { name: "亚泰B泊位", type: "berth", factoryId: 2, positionX: 10, positionZ: 20, width: 7, depth: 28, status: "occupied" },
    { name: "亚泰C泊位", type: "berth", factoryId: 2, positionX: 40, positionZ: 22, width: 7, depth: 25, status: "available" },
    // 车间
    { name: "亚泰涂装车间", type: "workshop", factoryId: 2, positionX: -25, positionZ: -28, width: 7, depth: 14, status: "occupied" },
    { name: "亚泰除锈车间", type: "workshop", factoryId: 2, positionX: -10, positionZ: -28, width: 7, depth: 14, status: "available" },
    { name: "亚泰喷漆车间", type: "workshop", factoryId: 2, positionX: 10, positionZ: -28, width: 7, depth: 14, status: "available" },
    { name: "亚泰综合车间", type: "workshop", factoryId: 2, positionX: 30, positionZ: -28, width: 7, depth: 14, status: "available" },
    { name: "亚泰材料库", type: "warehouse", factoryId: 2, positionX: 40, positionZ: -20, width: 5, depth: 10, status: "available" },
  ]

  for (const dock of yataiDocks) {
    const existing = await prisma.dock.findFirst({ where: { name: dock.name, factoryId: 2 } })
    if (!existing) {
      await prisma.dock.create({ data: dock })
    }
  }

  // 船舶 - 亚泰
  const yataiDock1Id = (await prisma.dock.findFirst({ where: { name: "亚泰1号坞", factoryId: 2 } }))?.id
  const yataiBerthBId = (await prisma.dock.findFirst({ where: { name: "亚泰B泊位", factoryId: 2 } }))?.id

  const yataiShips: Array<{
    name: string; shipType: string; length: number; width: number; height: number
    status: string; factoryId: number; dockId?: number | null; berthId?: number | null
    positionX: number; positionZ: number
  }> = [
    { name: "东方之星", shipType: "集装箱船", length: 210, width: 34, height: 26, status: "docked", factoryId: 2, dockId: yataiDock1Id, positionX: -20, positionZ: -4 },
    { name: "宁远7号", shipType: "散货船", length: 170, width: 28, height: 20, status: "at_berth", factoryId: 2, berthId: yataiBerthBId, positionX: 10, positionZ: 22 },
    { name: "浙海9号", shipType: "油轮", length: 240, width: 38, height: 30, status: "at_sea", factoryId: 2, positionX: 50, positionZ: 40 },
    { name: "鑫海3号", shipType: "化学品船", length: 155, width: 26, height: 18, status: "maintenance", factoryId: 2, dockId: null, positionX: 30, positionZ: -6 },
  ]

  for (const ship of yataiShips) {
    await prisma.ship.upsert({
      where: { name: ship.name },
      update: { factoryId: 2 },
      create: ship,
    })
  }

  // 门机 - 亚泰
  const yataiCranes: Array<{
    name: string; factoryId: number; dockId: number | null
    positionX: number; positionZ: number; rotation: number; status: string
  }> = [
    { name: "亚泰1号门机", factoryId: 2, dockId: null, positionX: -23, positionZ: -11, rotation: 0, status: "active" },
    { name: "亚泰2号门机", factoryId: 2, dockId: null, positionX: -17, positionZ: -11, rotation: 0, status: "active" },
    { name: "亚泰3号门机", factoryId: 2, dockId: null, positionX: 2, positionZ: -11, rotation: 0, status: "active" },
    { name: "亚泰4号门机", factoryId: 2, dockId: null, positionX: 8, positionZ: -11, rotation: 0, status: "idle" },
    { name: "亚泰5号门机", factoryId: 2, dockId: null, positionX: 27, positionZ: -11, rotation: 0, status: "active" },
    { name: "亚泰6号门机", factoryId: 2, dockId: null, positionX: 33, positionZ: -11, rotation: 0, status: "active" },
  ]
  for (const crane of yataiCranes) {
    const existing = await prisma.gantryCrane.findFirst({ where: { name: crane.name, factoryId: 2 } })
    if (!existing) await prisma.gantryCrane.create({ data: crane })
  }

  // 场景设置 - 两个厂区
  await prisma.sceneSettings.upsert({
    where: { factoryId: 1 },
    create: { factoryId: 1, coastlineZ: 0, waterOpacity: 0.75, ambientIntensity: 0.5, bgColor: "#0A1628", fogNear: 60, fogFar: 200 },
    update: { bgColor: "#0A1628", fogNear: 60, fogFar: 200 },
  })
  await prisma.sceneSettings.upsert({
    where: { factoryId: 2 },
    create: { factoryId: 2, coastlineZ: 2, waterOpacity: 0.7, ambientIntensity: 0.45, bgColor: "#0A1628", fogNear: 55, fogFar: 180 },
    update: { coastlineZ: 2, bgColor: "#0A1628" },
  })

  // 施工队关联（跨厂区）
  await prisma.shipTeam.upsert({ where: { id: 1 }, update: {}, create: { shipId: 1, teamId: 1 } })
  await prisma.shipTeam.upsert({ where: { id: 2 }, update: {}, create: { shipId: 1, teamId: 3 } })
  await prisma.shipTeam.upsert({ where: { id: 3 }, update: {}, create: { shipId: 2, teamId: 2 } })

  console.log("种子数据播种完成!")
  console.log(`  - 用户: ${await prisma.user.count()} 个`)
  console.log(`  - 队伍: ${await prisma.team.count()} 个`)
  console.log(`  - 船舶: ${await prisma.ship.count()} 条`)
  console.log(`  - 码头设施: ${await prisma.dock.count()} 个`)
  console.log(`  - 门机: ${await prisma.gantryCrane.count()} 台`)
  console.log(`  - 鑫亚厂区设施: ${await prisma.dock.count({ where: { factoryId: 1 } })} 个`)
  console.log(`  - 亚泰厂区设施: ${await prisma.dock.count({ where: { factoryId: 2 } })} 个`)
  console.log("\n默认账号:")
  console.log("  admin / admin123 (管理员)")
  console.log("  supervisor1 / super123 (涂装主管)")
  console.log("  leader1 / leader123 (工地主任)")
}

main()
  .catch((e) => { console.error("种子数据播种失败:", e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
