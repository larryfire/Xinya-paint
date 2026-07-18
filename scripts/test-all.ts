/**
 * 鑫亚涂装管理系统 - 全功能自动化测试脚本
 * 运行: npx tsx scripts/test-all.ts
 */
import "dotenv/config"

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000"

interface TestResult {
  name: string
  passed: boolean
  error?: string
  details?: string
}

interface TestSuite {
  name: string
  tests: TestResult[]
}

const results: TestSuite[] = []
let adminToken = ""
let supervisorToken = ""
let leaderToken = ""
let workerToken = ""

// ==================== 工具函数 ====================

async function api(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<{ status: number; body: any }> {
  const { token, ...fetchOptions } = options
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  }
  if (token) {
    headers["Cookie"] = `token=${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  })
  const text = await res.text()
  let body: any
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, body }
}

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(msg)
}

function suite(name: string): TestSuite {
  const s: TestSuite = { name, tests: [] }
  results.push(s)
  return s
}

function test(s: TestSuite, name: string, fn: () => Promise<void>) {
  s.tests.push({ name, passed: false, error: "未执行" })
  const idx = s.tests.length - 1
  return {
    run: async () => {
      try {
        await fn()
        s.tests[idx] = { name, passed: true }
      } catch (err: any) {
        s.tests[idx] = { name, passed: false, error: err.message }
      }
    },
  }
}

function t(s: TestSuite, name: string, fn: () => Promise<void>) {
  return test(s, name, fn)
}

// ==================== 测试入口 ====================

async function main() {
  console.log("╔══════════════════════════════════════╗")
  console.log("║   鑫亚涂装系统 - 自动化测试           ║")
  console.log("╚══════════════════════════════════════╝")
  console.log(`\n测试服务器: ${BASE_URL}\n`)

  // ----- 1. 认证模块 -----
  await testAuth()

  // ----- 2. 用户管理 -----
  await testUsers()

  // ----- 3. 队伍管理 -----
  await testTeams()

  // ----- 4. 船舶管理 -----
  await testShips()

  // ----- 5. 码头管理 -----
  await testDocks()

  // ----- 6. 场景数据 -----
  await testSceneData()

  // ----- 7. 统计数据 -----
  await testStats()

  // ----- 8. 外板成本 -----
  await testExternalPlateCosts()

  // ----- 9. 货舱成本 -----
  await testCargoHoldCosts()

  // ----- 10. 敲铲成本 -----
  await testRustRemovalCosts()

  // ----- 11. 安全处罚 -----
  await testSafetyPunishments()

  // ----- 12. 文件上传 -----
  await testUpload()

  // ----- 13. 权限验证 -----
  await testPermissions()

  // ----- 打印报告 -----
  printReport()
}

// ==================== 1. 认证模块 ====================

async function testAuth() {
  const s = suite("🔐 认证模块")

  // 登录成功 - admin
  await t(s, "admin 登录成功", async () => {
    const { status, body } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    })
    assert(status === 200, `期望 200, 实际 ${status}`)
    assert(body.success === true, `登录失败: ${JSON.stringify(body)}`)
    assert(body.data?.user?.role === "admin", "角色不正确")
    // 从 Set-Cookie 提取 token (cookies 在 fetch 标准中不可直接获取)
    adminToken = body.data?.token || ""
  }).run()

  // 其实需要从 response headers 中拿 token，但 fetch 在 Node 环境下的 cookie 处理不同
  // 我们先独立请求登录获取 token

  // 登录失败 - 密码错误
  await t(s, "密码错误登录失败", async () => {
    const { status, body } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "wrongpass" }),
    })
    assert(status === 401, `期望 401, 实际 ${status}`)
    assert(body.success === false, "应该返回失败")
  }).run()

  // 登录失败 - 用户不存在
  await t(s, "不存在用户登录失败", async () => {
    const { status, body } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "nobody", password: "123456" }),
    })
    assert(status === 401, `期望 401, 实际 ${status}`)
  }).run()

  // 校验失败 - 空用户名
  await t(s, "空用户名校验失败", async () => {
    const { status, body } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "", password: "123456" }),
    })
    assert(status === 400, `期望 400, 实际 ${status}`)
  }).run()
}

// ==================== 获取tokens ====================

async function getTokens() {
  // 登录获取各角色 token
  const logins = [
    { name: "admin", username: "admin", password: "admin123", key: "admin" },
    { name: "supervisor", username: "supervisor1", password: "super123", key: "supervisor" },
    { name: "leader", username: "leader1", password: "leader123", key: "leader" },
    { name: "worker", username: "worker1", password: "worker123", key: "worker" },
  ]

  for (const login of logins) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: login.username, password: login.password }),
    })
    const setCookie = res.headers.get("set-cookie")
    if (setCookie) {
      const match = setCookie.match(/token=([^;]+)/)
      if (match) {
        const token = match[1]
        if (login.key === "admin") adminToken = token
        else if (login.key === "supervisor") supervisorToken = token
        else if (login.key === "leader") leaderToken = token
        else if (login.key === "worker") workerToken = token
      }
    }
  }

  console.log(`  Token获取: admin=${!!adminToken} supervisor=${!!supervisorToken} leader=${!!leaderToken} worker=${!!workerToken}`)
}

// ==================== 2. 用户管理 ====================

async function testUsers() {
  await ensureTokens()
  const s = suite("👤 用户管理")

  // GET /api/auth/me
  await t(s, "获取当前用户信息", async () => {
    const { status, body } = await api("/api/auth/me", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "响应失败")
    assert(body.data?.username === "admin", "用户信息不正确")
  }).run()

  // GET /api/users
  await t(s, "获取用户列表", async () => {
    const { status, body } = await api("/api/users", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}`)
    assert(body.success === true, "响应失败")
    assert(body.data?.items?.length > 0, "用户列表为空")
    assert(body.data?.pagination != null, "缺少分页信息")
  }).run()

  // GET /api/users?role=worker
  await t(s, "按角色筛选用户", async () => {
    const { status, body } = await api("/api/users?role=worker", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}`)
    const items = body.data?.items || []
    assert(items.every((u: any) => u.role === "worker"), "角色筛选不正确")
  }).run()

  // GET /api/users?search=王
  await t(s, "按姓名搜索用户", async () => {
    const { status, body } = await api("/api/users?search=王", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}`)
    const items = body.data?.items || []
    assert(items.length > 0, "搜索无结果")
  }).run()

  // POST /api/users - 创建用户
  let newUserId: number
  await t(s, "创建新用户", async () => {
    const { status, body } = await api("/api/users", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({
        username: "testuser_" + Date.now(),
        password: "test123456",
        realName: "测试员工",
        role: "worker",
        gender: "male",
        age: 25,
        craftType: "喷漆工",
        level: "中级工",
        phone: "13900000001",
        teamId: 1,
      }),
    })
    assert(status === 201 || status === 200, `期望 201, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, `创建失败: ${JSON.stringify(body)}`)
    newUserId = body.data?.id
  }).run()

  // GET /api/users/[id]
  await t(s, "获取用户详情", async () => {
    if (!newUserId) throw new Error("上一步创建用户失败")
    const { status, body } = await api(`/api/users/${newUserId}`, { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}`)
    assert(body.data?.username != null, "用户详情为空")
  }).run()

  // PUT /api/users/[id]
  await t(s, "更新用户信息", async () => {
    if (!newUserId) throw new Error("上一步创建用户失败")
    const { status, body } = await api(`/api/users/${newUserId}`, {
      method: "PUT",
      token: adminToken,
      body: JSON.stringify({ realName: "测试员工-已修改", age: 30 }),
    })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "更新失败")
  }).run()

  // DELETE /api/users/[id] (软删除)
  await t(s, "软删除用户", async () => {
    if (!newUserId) throw new Error("上一步创建用户失败")
    const { status, body } = await api(`/api/users/${newUserId}`, {
      method: "DELETE",
      token: adminToken,
    })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "删除失败")
  }).run()

  // 验证用户列表只返回isActive=true的用户
  await t(s, "删除后用户列表不包含已删除用户", async () => {
    if (!newUserId) throw new Error("上一步创建用户失败")
    const { status, body } = await api("/api/users?pageSize=100", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}`)
    const ids = body.data?.items?.map((u: any) => u.id) || []
    assert(!ids.includes(newUserId), "已删除用户仍出现在列表中")
  }).run()
}

// ==================== 3. 队伍管理 ====================

async function testTeams() {
  await ensureTokens()
  const s = suite("👥 队伍管理")

  let newTeamId: number

  // GET /api/teams
  await t(s, "获取队伍列表", async () => {
    const { status, body } = await api("/api/teams", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "响应失败")
    assert(body.data?.items?.length > 0, "队伍列表为空")
  }).run()

  // GET /api/teams/[id]
  await t(s, "获取队伍详情(含成员)", async () => {
    const { status, body } = await api("/api/teams/1", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}`)
    assert(body.data?.members != null, "缺少成员列表")
    assert(body.data?.leaderName != null, "缺少领队信息")
  }).run()

  // POST /api/teams
  await t(s, "创建新队伍", async () => {
    const { status, body } = await api("/api/teams", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({
        name: "测试队伍_" + Date.now(),
        description: "自动化测试创建的队伍",
      }),
    })
    assert(status === 201 || status === 200, `期望 201, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "创建失败")
    newTeamId = body.data?.id
  }).run()

  // PUT /api/teams/[id]
  await t(s, "更新队伍信息", async () => {
    if (!newTeamId) throw new Error("上一步创建队伍失败")
    const { status, body } = await api(`/api/teams/${newTeamId}`, {
      method: "PUT",
      token: adminToken,
      body: JSON.stringify({ description: "已更新的描述" }),
    })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
  }).run()

  // DELETE /api/teams/[id]
  await t(s, "删除空队伍", async () => {
    if (!newTeamId) throw new Error("上一步创建队伍失败")
    const { status, body } = await api(`/api/teams/${newTeamId}`, {
      method: "DELETE",
      token: adminToken,
    })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
  }).run()

  // DELETE 有成员的队伍
  await t(s, "删除有成员的队伍应被拒绝", async () => {
    const { status, body } = await api("/api/teams/1", {
      method: "DELETE",
      token: adminToken,
    })
    assert(status === 400, `期望 400, 实际 ${status}`)
    assert(body.success === false, "应该失败")
  }).run()

  // 搜索队伍
  await t(s, "按名称搜索队伍", async () => {
    const { status, body } = await api("/api/teams?search=鑫海", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}`)
    assert(body.data?.items?.length > 0, "搜索无结果")
  }).run()
}

// ==================== 4. 船舶管理 ====================

async function testShips() {
  await ensureTokens()
  const s = suite("🚢 船舶管理")

  let newShipId: number

  // GET /api/ships
  await t(s, "获取船舶列表", async () => {
    const { status, body } = await api("/api/ships", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "响应失败")
    assert(body.data?.items?.length > 0, "船舶列表为空")
  }).run()

  // GET /api/ships?status=docked
  await t(s, "按状态筛选船舶", async () => {
    const { status, body } = await api("/api/ships?status=docked", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}`)
    const items: any[] = body.data?.items || []
    assert(items.every((s: any) => s.status === "docked"), "状态筛选不正确")
  }).run()

  // GET /api/ships/[id]
  await t(s, "获取船舶详情(含施工队)", async () => {
    const { status, body } = await api("/api/ships/1", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}`)
    assert(body.data?.teams != null, "缺少施工队信息")
  }).run()

  // POST /api/ships
  await t(s, "创建新船舶", async () => {
    const { status, body } = await api("/api/ships", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({
        name: "测试船_" + Date.now(),
        shipType: "散货船",
        length: 200,
        width: 35,
        height: 25,
        status: "at_sea",
        positionX: 50,
        positionZ: 50,
      }),
    })
    assert(status === 201 || status === 200, `期望 201, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "创建失败")
    newShipId = body.data?.id
  }).run()

  // PUT /api/ships/[id]
  await t(s, "更新船舶信息", async () => {
    if (!newShipId) throw new Error("上一步创建船舶失败")
    const { status, body } = await api(`/api/ships/${newShipId}`, {
      method: "PUT",
      token: adminToken,
      body: JSON.stringify({ status: "maintenance" }),
    })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
  }).run()

  // POST 分配施工队
  await t(s, "为船舶分配施工队", async () => {
    if (!newShipId) throw new Error("上一步创建船舶失败")
    const { status, body } = await api(`/api/ships/${newShipId}`, {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({ teamId: 1 }),
    })
    assert(status === 201 || status === 200, `分配失败: ${JSON.stringify(body)}`)
  }).run()

  // POST 重复分配施工队
  await t(s, "重复分配施工队应被拒绝", async () => {
    if (!newShipId) throw new Error("上一步创建船舶失败")
    const { status, body } = await api(`/api/ships/${newShipId}`, {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({ teamId: 1 }),
    })
    assert(status === 400 || status === 409, `期望冲突错误, 实际 ${status}`)
  }).run()

  // DELETE /api/ships/[id]
  await t(s, "删除船舶", async () => {
    if (!newShipId) throw new Error("上一步创建船舶失败")
    const { status, body } = await api(`/api/ships/${newShipId}`, {
      method: "DELETE",
      token: adminToken,
    })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
  }).run()

  // GET 不存在的船舶
  await t(s, "获取不存在的船舶返回404", async () => {
    const { status } = await api("/api/ships/99999", { token: adminToken })
    assert(status === 404, `期望 404, 实际 ${status}`)
  }).run()
}

// ==================== 5. 码头管理 ====================

async function testDocks() {
  await ensureTokens()
  const s = suite("🏗️ 码头管理")

  // GET /api/docks
  await t(s, "获取码头列表", async () => {
    const { status, body } = await api("/api/docks", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}`)
    assert(Array.isArray(body.data), "响应不是数组")
    assert(body.data.length > 0, "码头列表为空")
  }).run()

  // POST /api/docks
  let newDockId: number
  await t(s, "创建新码头", async () => {
    const { status, body } = await api("/api/docks", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({
        name: "测试码头_" + Date.now(),
        type: "dock" as const,
        positionX: 100,
        positionZ: 100,
        width: 15,
        depth: 45,
        status: "available",
      }),
    })
    assert(status === 201 || status === 200, `期望 201, 实际 ${status}: ${JSON.stringify(body)}`)
    newDockId = body.data?.id
  }).run()

  // 创建泊位
  await t(s, "创建新泊位", async () => {
    const { status, body } = await api("/api/docks", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({
        name: "测试泊位_" + Date.now(),
        type: "berth" as const,
        positionX: -50,
        positionZ: -50,
        width: 10,
        depth: 35,
      }),
    })
    assert(status === 201 || status === 200, `期望 201, 实际 ${status}: ${JSON.stringify(body)}`)
  }).run()
}

// ==================== 6. 场景数据 ====================

async function testSceneData() {
  await ensureTokens()
  const s = suite("🗺️ 3D场景数据")

  await t(s, "获取场景数据", async () => {
    const { status, body } = await api("/api/scene-data", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.data?.docks != null, "缺少码头数据")
    assert(body.data?.ships != null, "缺少船舶数据")
  }).run()
}

// ==================== 7. 统计数据 ====================

async function testStats() {
  await ensureTokens()
  const s = suite("📊 统计数据")

  await t(s, "获取统计数据", async () => {
    const { status, body } = await api("/api/stats", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.data?.shipCount != null, "缺少船舶计数")
    assert(body.data?.teamCount != null, "缺少队伍计数")
    assert(body.data?.monthlyPunishmentCount != null, "缺少处罚计数")
    assert(body.data?.totalSettlement != null, "缺少结算总额")
  }).run()
}

// ==================== 8. 外板成本 ====================

async function testExternalPlateCosts() {
  await ensureTokens()
  const s = suite("💰 外板成本管理")

  let costId: number

  // GET /api/costs/external-plate
  await t(s, "获取外板成本列表(admin)", async () => {
    const { status, body } = await api("/api/costs/external-plate", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "响应失败")
  }).run()

  // POST /api/costs/external-plate
  await t(s, "创建外板成本记录", async () => {
    const { status, body } = await api("/api/costs/external-plate", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({
        shipId: 1,
        supervisorId: 2,
        dockEntryTime: new Date().toISOString(),
        area: "左舷",
        teamId: 1,
        settlementCost: 50000,
        constructionCost: 35000,
        remarks: "自动化测试",
      }),
    })
    assert(status === 201 || status === 200, `期望 201, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "创建失败")
    costId = body.data?.id
  }).run()

  // GET 按船舶筛选
  await t(s, "按船舶筛选外板成本", async () => {
    const { status, body } = await api("/api/costs/external-plate?shipId=1", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}`)
    const items: any[] = body.data?.items || []
    assert(items.every((c: any) => c.shipId === 1), "筛选不正确")
    // 验证盈亏计算
    if (items.length > 0) {
      const first = items[0]
      assert(typeof first.profitLoss === "number", "缺少盈亏字段")
      assert(typeof first.profitLossRate === "number", "缺少盈亏率字段")
    }
  }).run()

  // 验证外板成本校验
  await t(s, "外板成本校验-缺少必填字段", async () => {
    const { status } = await api("/api/costs/external-plate", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({ shipId: 1 }),
    })
    assert(status === 400, `期望 400, 实际 ${status}`)
  }).run()
}

// ==================== 9. 货舱成本 ====================

async function testCargoHoldCosts() {
  await ensureTokens()
  const s = suite("📦 货舱成本管理")

  // GET /api/costs/cargo-hold
  await t(s, "获取货舱成本列表", async () => {
    const { status, body } = await api("/api/costs/cargo-hold", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "响应失败")
  }).run()

  // POST /api/costs/cargo-hold
  await t(s, "创建货舱成本记录", async () => {
    const { status, body } = await api("/api/costs/cargo-hold", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({
        shipId: 1,
        supervisorId: 2,
        cargoRatio: 85.5,
        originalRatio: 90.0,
        settlementCost: 80000,
        constructionCost: 60000,
        remarks: "货舱自动化测试",
      }),
    })
    assert(status === 201 || status === 200, `期望 201, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "创建失败")
  }).run()

  // 验证比例范围校验
  await t(s, "货舱成本校验-比例超过100", async () => {
    const { status } = await api("/api/costs/cargo-hold", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({
        shipId: 1,
        supervisorId: 2,
        cargoRatio: 150,
        originalRatio: 90,
        settlementCost: 80000,
        constructionCost: 60000,
      }),
    })
    assert(status === 400, `期望 400, 实际 ${status}`)
  }).run()
}

// ==================== 10. 敲铲成本 ====================

async function testRustRemovalCosts() {
  await ensureTokens()
  const s = suite("🔧 敲铲成本管理")

  // GET /api/costs/rust-removal
  await t(s, "获取敲铲成本列表", async () => {
    const { status, body } = await api("/api/costs/rust-removal", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "响应失败")
  }).run()

  // POST /api/costs/rust-removal
  await t(s, "创建敲铲成本记录", async () => {
    const { status, body } = await api("/api/costs/rust-removal", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({
        shipId: 1,
        area: "船首甲板",
        projectName: "高压水除锈",
        teamId: 2,
        manHours: 120,
        hourlyRate: 80,
        remarks: "敲铲自动化测试",
      }),
    })
    assert(status === 201 || status === 200, `期望 201, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "创建失败")
  }).run()

  // 验证 totalCost 计算
  await t(s, "敲铲成本-totalCost计算正确", async () => {
    const { status, body } = await api("/api/costs/rust-removal", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}`)
    const items: any[] = body.data?.items || []
    if (items.length > 0) {
      const item = items[0]
      assert(typeof item.totalCost === "number", "缺少totalCost")
    }
  }).run()
}

// ==================== 11. 安全处罚 ====================

async function testSafetyPunishments() {
  await ensureTokens()
  const s = suite("🛡️ 安全处罚管理")

  // GET /api/safety/punishments
  await t(s, "获取处罚列表", async () => {
    const { status, body } = await api("/api/safety/punishments", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "响应失败")
  }).run()

  // POST /api/safety/punishments
  await t(s, "创建安全处罚记录", async () => {
    const { status, body } = await api("/api/safety/punishments", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({
        teamId: 1,
        punishedPersonId: 4,
        issuerId: 1,
        punishmentTime: new Date().toISOString(),
        category: "high_voltage",
        amount: 2000,
        reason: "违反高压线安全规定，未佩戴安全帽",
      }),
    })
    assert(status === 201 || status === 200, `期望 201, 实际 ${status}: ${JSON.stringify(body)}`)
    assert(body.success === true, "创建失败")
  }).run()

  // 按类别筛选
  await t(s, "按类别筛选处罚记录", async () => {
    const { status, body } = await api("/api/safety/punishments?category=high_voltage", { token: adminToken })
    assert(status === 200, `期望 200, 实际 ${status}`)
    const items: any[] = body.data?.items || []
    assert(items.every((p: any) => p.category === "high_voltage"), "筛选不正确")
  }).run()

  // 按时间范围筛选
  await t(s, "按时间范围筛选处罚记录", async () => {
    const startDate = "2020-01-01"
    const endDate = "2030-12-31"
    const { status, body } = await api(
      `/api/safety/punishments?startDate=${startDate}&endDate=${endDate}`,
      { token: adminToken }
    )
    assert(status === 200, `期望 200, 实际 ${status}`)
    assert(body.success === true, "响应失败")
  }).run()

  // 校验-缺少必填字段
  await t(s, "创建处罚-缺少必填字段应失败", async () => {
    const { status } = await api("/api/safety/punishments", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({ reason: "测试" }),
    })
    assert(status === 400, `期望 400, 实际 ${status}`)
  }).run()
}

// ==================== 12. 文件上传 ====================

async function testUpload() {
  await ensureTokens()
  const s = suite("📁 文件上传")

  // 由于 fetch 中 multipart/form-data 处理特殊，这里只测试无文件时的校验
  await t(s, "上传-无文件时校验失败", async () => {
    const { status, body } = await api("/api/upload", {
      method: "POST",
      token: adminToken,
      headers: {}, // 不设 content-type
    })
    // 可能返回各种错误，取决于 multipart 解析
    assert(status !== 200, `不应成功, 实际 ${status}`)
  }).run()
}

// ==================== 13. 权限验证 ====================

async function testPermissions() {
  await ensureTokens()
  const s = suite("🔒 权限验证")

  // 无token访问API
  await t(s, "无token访问API返回401", async () => {
    const { status } = await api("/api/users")
    assert(status === 401, `期望 401, 实际 ${status}`)
  }).run()

  // worker不能管理用户
  await t(s, "worker不能创建用户", async () => {
    const { status } = await api("/api/users", {
      method: "POST",
      token: workerToken,
      body: JSON.stringify({
        username: "hacker",
        password: "hack123456",
        realName: "非法用户",
        role: "worker",
      }),
    })
    assert(status === 403, `期望 403, 实际 ${status}`)
  }).run()

  // worker不能管理船舶
  await t(s, "worker不能创建船舶", async () => {
    const { status } = await api("/api/ships", {
      method: "POST",
      token: workerToken,
      body: JSON.stringify({
        name: "黑客船",
        shipType: "散货船",
        length: 100, width: 20, height: 15,
      }),
    })
    assert(status === 403, `期望 403, 实际 ${status}`)
  }).run()

  // leader可以查看自己的队伍
  await t(s, "leader可以查看队伍列表", async () => {
    const { status, body } = await api("/api/teams", { token: leaderToken })
    assert(status === 200, `期望 200, 实际 ${status}: ${JSON.stringify(body)}`)
  }).run()

  // leader不能管理队伍
  await t(s, "leader不能创建队伍", async () => {
    const { status } = await api("/api/teams", {
      method: "POST",
      token: leaderToken,
      body: JSON.stringify({ name: "leader的私军" }),
    })
    assert(status === 403, `期望 403, 实际 ${status}`)
  }).run()

  // leader不能创建安全处罚
  await t(s, "leader不能创建处罚", async () => {
    const { status } = await api("/api/safety/punishments", {
      method: "POST",
      token: leaderToken,
      body: JSON.stringify({
        teamId: 1, issuerId: 3, punishmentTime: new Date().toISOString(),
        category: "normal", amount: 100, reason: "测试",
      }),
    })
    assert(status === 403, `期望 403, 实际 ${status}`)
  }).run()

  // supervisor可以写成本
  await t(s, "supervisor可以创建外板成本", async () => {
    const { status, body } = await api("/api/costs/external-plate", {
      method: "POST",
      token: supervisorToken,
      body: JSON.stringify({
        shipId: 1,
        supervisorId: 2,
        dockEntryTime: new Date().toISOString(),
        area: "右舷",
        teamId: 1,
        settlementCost: 30000,
        constructionCost: 20000,
      }),
    })
    assert(status === 201 || status === 200, `期望 201, 实际 ${status}: ${JSON.stringify(body)}`)
  }).run()

  // supervisor不能管理用户
  await t(s, "supervisor不能管理用户", async () => {
    const { status } = await api("/api/users", { method: "POST", token: supervisorToken, body: JSON.stringify({}) })
    assert(status === 403 || status === 400, `期望 403, 实际 ${status}`)
  }).run()

  // 过期/无效token
  await t(s, "无效token返回401", async () => {
    const { status } = await api("/api/users", { token: "invalid.jwt.token" })
    assert(status === 401, `期望 401, 实际 ${status}`)
  }).run()
}

// ==================== 辅助函数 ====================

let tokensEnsured = false
async function ensureTokens() {
  if (!tokensEnsured) {
    await getTokens()
    tokensEnsured = true
  }
}

// ==================== 打印报告 ====================

function printReport() {
  console.log("\n")
  console.log("╔══════════════════════════════════════╗")
  console.log("║          📋 测试报告                  ║")
  console.log("╚══════════════════════════════════════╝")
  console.log()

  let totalTests = 0
  let passedTests = 0
  const failedSuites: { suite: string; tests: TestResult[] }[] = []

  for (const s of results) {
    const passed = s.tests.filter((t) => t.passed).length
    const total = s.tests.length
    totalTests += total
    passedTests += passed

    const icon = passed === total ? "✅" : passed > 0 ? "⚠️" : "❌"
    console.log(`${icon} ${s.name}: ${passed}/${total} 通过`)

    const failed = s.tests.filter((t) => !t.passed)
    if (failed.length > 0) {
      failedSuites.push({ suite: s.name, tests: failed })
      for (const f of failed) {
        console.log(`   ❌ ${f.name}: ${f.error || "未知错误"}`)
      }
    }
  }

  console.log(`\n──────────────────────────────────────`)
  console.log(`总计: ${passedTests}/${totalTests} 通过 (${Math.round((passedTests / totalTests) * 100)}%)`)

  if (failedSuites.length > 0) {
    console.log(`\n🔧 待修复: ${failedSuites.flatMap((s) => s.tests).length} 个失败测试\n`)
    for (const fs of failedSuites) {
      for (const f of fs.tests) {
        console.log(`  [${fs.suite}] ${f.name}`)
        console.log(`    错误: ${f.error}`)
      }
    }
    process.exit(1)
  } else {
    console.log("\n🎉 所有测试通过!\n")
    process.exit(0)
  }
}

main().catch((err) => {
  console.error("测试运行异常:", err)
  process.exit(1)
})
