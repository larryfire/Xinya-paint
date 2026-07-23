import { z } from "zod"

// ==================== 认证 ====================
export const loginSchema = z.object({
  username: z.string().min(2, "用户名至少2个字符"),
  password: z.string().min(6, "密码至少6个字符"),
})

// ==================== 用户 ====================
export const createUserSchema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(6).max(100),
  realName: z.string().min(1, "姓名不能为空").max(50),
  role: z.enum(["admin", "supervisor", "leader", "worker"]),
  gender: z.enum(["male", "female", "other"]).optional(),
  age: z.number().min(16).max(100).optional(),
  craftType: z.string().max(50).optional(),
  level: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  teamId: z.number().positive().optional(),
})

export const updateUserSchema = createUserSchema.partial().omit({ password: true })

// ==================== 队伍 ====================
export const createTeamSchema = z.object({
  name: z.string().min(1, "队伍名称不能为空").max(100),
  leaderId: z.number().positive().optional(),
  description: z.string().optional(),
})

export const updateTeamSchema = createTeamSchema.partial()

// ==================== 船舶 ====================
export const createShipSchema = z.object({
  name: z.string().min(1, "船名不能为空").max(100),
  shipType: z.string().min(1).max(50),
  length: z.number().positive("船长必须为正数"),
  width: z.number().positive("船宽必须为正数"),
  height: z.number().positive("船高必须为正数"),
  status: z.enum(["docked", "at_berth", "at_sea", "maintenance"]).optional(),
  dockId: z.number().positive().optional().nullable(),
  berthId: z.number().positive().optional().nullable(),
  positionX: z.number().optional().nullable(),
  positionZ: z.number().optional().nullable(),
  rotation: z.number().optional().nullable(),
  repairStatus: z.enum(["not_started", "started", "in_factory", "left_factory"]).optional(),
  positionDetail: z.string().max(100).optional().nullable(),
  departureDate: z.string().optional().nullable(),
})

export const updateShipSchema = createShipSchema.partial()

// ==================== 外板成本 ====================
export const createExternalPlateCostSchema = z.object({
  repairNumber: z.string().max(50).optional(),
  shipId: z.number().positive("请选择船舶"),
  supervisorId: z.number().positive("请选择涂装主管"),
  dockEntryTime: z.string().min(1, "请选择进坞时间"),
  area: z.string().min(1, "外板区域不能为空").max(200),
  teamId: z.number().positive("请选择内协队伍"),
  settlementCost: z.number().min(0, "结算成本不能为负"),
  constructionCost: z.number().min(0, "施工成本不能为负"),
  remarks: z.string().optional(),
  projectStatus: z.enum(["pending", "in_progress", "completed"]).optional(),
})

export const updateExternalPlateCostSchema = createExternalPlateCostSchema.partial()

// ==================== 货舱成本 ====================
export const createCargoHoldCostSchema = z.object({
  repairNumber: z.string().max(50).optional(),
  shipId: z.number().positive("请选择船舶"),
  supervisorId: z.number().positive("请选择涂装主管"),
  cargoRatio: z.number().min(0).max(100, "比例最大为100"),
  originalRatio: z.number().min(0).max(100, "原始比例最大为100"),
  teamId: z.number().positive("请选择施工队伍").optional().nullable(),
  settlementCost: z.number().min(0, "结算成本不能为负"),
  constructionCost: z.number().min(0, "施工成本不能为负"),
  remarks: z.string().optional(),
  projectStatus: z.enum(["pending", "in_progress", "completed"]).optional(),
})

export const updateCargoHoldCostSchema = createCargoHoldCostSchema.partial()

// ==================== 敲铲成本 ====================
export const createRustRemovalCostSchema = z.object({
  repairNumber: z.string().max(50).optional(),
  shipId: z.number().positive("请选择船舶"),
  area: z.string().min(1, "敲铲区域不能为空").max(200),
  projectName: z.string().min(1, "工程项目不能为空").max(200),
  teamId: z.number().positive().optional().nullable(),
  manHours: z.number().min(0, "工时不能为负"),
  hourlyRate: z.number().min(0, "工时单价不能为负"),
  remarks: z.string().optional(),
  projectStatus: z.enum(["pending", "in_progress", "completed"]).optional(),
})

export const updateRustRemovalCostSchema = createRustRemovalCostSchema.partial()

// ==================== 水刀成本 ====================
export const createWaterJetCostSchema = z.object({
  repairNumber: z.string().max(50).optional(),
  shipId: z.number().positive("请选择船舶"),
  dockEntryTime: z.string().min(1, "请选择进坞时间"),
  project: z.string().min(1, "水刀工程不能为空").max(200),
  teamId: z.number().positive("请选择施工队伍"),
  settlementCost: z.number().min(0, "结算成本不能为负"),
  constructionCost: z.number().min(0, "施工成本不能为负"),
  remarks: z.string().optional(),
  projectStatus: z.enum(["pending", "in_progress", "completed"]).optional(),
})

// ==================== 安全处罚 ====================
export const createSafetyPunishmentSchema = z.object({
  teamId: z.number().positive("请选择队伍"),
  punishedPersonId: z.number().positive().optional().nullable(),
  issuerId: z.number().positive("处罚人不能为空"),
  punishmentTime: z.string().min(1, "请选择处罚时间"),
  category: z.enum(["normal", "high_voltage"]),
  amount: z.number().min(0, "处罚金额不能为负"),
  reason: z.string().min(1, "处罚原因不能为空"),
})

export const updateSafetyPunishmentSchema = createSafetyPunishmentSchema.partial()

// ==================== 码头/泊位 ====================
export const createDockSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(100),
  type: z.enum(["dock", "berth", "wharf", "warehouse", "workshop"]),
  factoryId: z.number().positive().optional(),
  positionX: z.number(),
  positionZ: z.number(),
  width: z.number().positive(),
  depth: z.number().positive(),
  status: z.enum(["occupied", "available", "maintenance"]).optional(),
})

// ==================== 船舶-施工队关联 ====================
export const assignTeamSchema = z.object({
  teamId: z.number().positive("请选择施工队伍"),
})

// ==================== 出勤 ====================
export const createAttendanceSchema = z.object({
  teamId: z.number().positive("请选择施工队伍"),
  shipId: z.number().positive().optional(),
  dockId: z.number().positive().optional(),
  workerCount: z.number().positive("出勤人数必须大于0"),
})

export const updateAttendanceSchema = z.object({
  workerCount: z.number().positive().optional(),
  endTime: z.string().optional(), // 结束出勤
})

// ==================== 每日工时记录 ====================
const workHourTimeSlotSchema = z.object({
  startTime: z.string().min(1, "开始时间不能为空"),
  endTime: z.string().min(1, "结束时间不能为空"),
})

const workHourEntrySchema = z.object({
  craftType: z.string().min(1, "工种不能为空").max(50),
  workerCount: z.number().positive("人数必须大于0"),
  timeSlots: z.array(workHourTimeSlotSchema).min(1, "至少需要一个时间段"),
})

export const createWorkHourRecordSchema = z.object({
  recordDate: z.string().min(1, "请选择日期"),
  shipId: z.number().positive("请选择船舶"),
  teamId: z.number().positive("请选择施工队伍"),
  note: z.string().optional(),
  entries: z.array(workHourEntrySchema).min(1, "至少需要一条工种记录"),
})

export const updateWorkHourRecordSchema = createWorkHourRecordSchema.partial()

// ==================== 船舶位置更新 ====================
export const updateShipPositionSchema = z.object({
  positionX: z.number(),
  positionZ: z.number(),
  rotation: z.number().optional(),
  dockId: z.number().positive().optional().nullable(),
  berthId: z.number().positive().optional().nullable(),
})

// 类型推导
export type LoginInput = z.infer<typeof loginSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type CreateShipInput = z.infer<typeof createShipSchema>
export type CreateExternalPlateCostInput = z.infer<typeof createExternalPlateCostSchema>
export type CreateCargoHoldCostInput = z.infer<typeof createCargoHoldCostSchema>
export type CreateRustRemovalCostInput = z.infer<typeof createRustRemovalCostSchema>
export type CreateWaterJetCostInput = z.infer<typeof createWaterJetCostSchema>
export type CreateSafetyPunishmentInput = z.infer<typeof createSafetyPunishmentSchema>
export type CreateDockInput = z.infer<typeof createDockSchema>
