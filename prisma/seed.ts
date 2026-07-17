// 心雅涂装 - 种子数据
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import bcrypt from "bcryptjs"

const dbUrl = process.env.DATABASE_URL || "file:./dev.db"
const adapter = new PrismaLibSql({ url: dbUrl })
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

  // 4. 创建码头/船坞/泊位
  const docks = [
    { name: "1号船坞", type: "dock", positionX: -30, positionZ: -15, width: 12, depth: 40, status: "available" },
    { name: "2号船坞", type: "dock", positionX: 0, positionZ: -15, width: 12, depth: 40, status: "occupied" },
    { name: "3号船坞", type: "dock", positionX: 30, positionZ: -15, width: 12, depth: 40, status: "maintenance" },
    { name: "A泊位", type: "berth", positionX: -25, positionZ: 15, width: 8, depth: 30, status: "available" },
    { name: "B泊位", type: "berth", positionX: 5, positionZ: 15, width: 8, depth: 30, status: "occupied" },
    { name: "C泊位", type: "berth", positionX: 30, positionZ: 15, width: 8, depth: 30, status: "available" },
  ]
  for (let i = 0; i < docks.length; i++) {
    await prisma.dock.upsert({ where: { id: i + 1 }, update: {}, create: docks[i] })
  }

  // 5. 创建船舶
  const ships = [
    { name: "远洋1号", shipType: "散货船", length: 180, width: 30, height: 22, status: "docked", dockId: 2, positionX: 0, positionZ: -5 },
    { name: "海油2号", shipType: "油轮", length: 220, width: 36, height: 28, status: "at_berth", berthId: 5, positionX: 5, positionZ: 20 },
    { name: "散货3号", shipType: "散货船", length: 150, width: 26, height: 18, status: "at_sea", positionX: 25, positionZ: 35 },
    { name: "长风6号", shipType: "集装箱船", length: 200, width: 32, height: 25, status: "maintenance", dockId: 3, positionX: 30, positionZ: -8 },
    { name: "海丰8号", shipType: "化学品船", length: 160, width: 28, height: 20, status: "at_sea", positionX: -20, positionZ: 40 },
  ]
  for (const ship of ships) {
    await prisma.ship.upsert({ where: { name: ship.name }, update: {}, create: ship })
  }

  // 6. 创建施工队关联
  await prisma.shipTeam.upsert({ where: { id: 1 }, update: {}, create: { shipId: 1, teamId: 1 } })
  await prisma.shipTeam.upsert({ where: { id: 2 }, update: {}, create: { shipId: 1, teamId: 3 } })
  await prisma.shipTeam.upsert({ where: { id: 3 }, update: {}, create: { shipId: 2, teamId: 2 } })

  console.log("种子数据播种完成!")
  console.log(`  - 用户: ${await prisma.user.count()} 个`)
  console.log(`  - 队伍: ${await prisma.team.count()} 个`)
  console.log(`  - 船舶: ${await prisma.ship.count()} 条`)
  console.log(`  - 码头设施: ${await prisma.dock.count()} 个`)
  console.log("\n默认账号:")
  console.log("  admin / admin123 (管理员)")
  console.log("  supervisor1 / super123 (涂装主管)")
  console.log("  leader1 / leader123 (工地主任)")
}

main()
  .catch((e) => { console.error("种子数据播种失败:", e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
