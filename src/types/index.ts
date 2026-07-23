export interface UserInfo {
  id: number
  username: string
  realName: string
  role: "admin" | "supervisor" | "leader" | "worker"
  gender?: string | null
  age?: number | null
  craftType?: string | null
  level?: string | null
  phone?: string | null
  teamId?: number | null
  teamName?: string
  isActive: boolean
  createdAt: string
}

export interface TeamInfo {
  id: number
  name: string
  leaderId?: number | null
  leaderName?: string
  description?: string | null
  memberCount?: number
  members?: UserInfo[]
  createdAt: string
}

export interface ShipInfo {
  id: number
  name: string
  shipType: string
  length: number
  width: number
  height: number
  status: "docked" | "at_berth" | "at_sea" | "maintenance"
  factoryId?: number
  dockId?: number | null
  dockName?: string
  berthId?: number | null
  berthName?: string
  positionX?: number | null
  positionZ?: number | null
  rotation?: number | null
  /** 修理状态: not_started | started | in_factory | left_factory */
  repairStatus?: string | null
  /** 位置详情: 如 "3档"、"左侧"、"锚地"、"试航" */
  positionDetail?: string | null
  /** 格式化后的位置描述 */
  positionLabel?: string
  /** 计划走船日期 */
  departureDate?: string | null
  createdAt: string
}

export interface DockInfo {
  id: number
  name: string
  type: "dock" | "berth" | "wharf" | "warehouse" | "workshop"
  factoryId?: number
  positionX: number
  positionZ: number
  width: number
  depth: number
  status: "occupied" | "available" | "maintenance"
}

export interface ExternalPlateCostInfo {
  id: number
  repairNumber?: string | null
  shipId: number
  shipName?: string
  shipLength?: number
  shipWidth?: number
  supervisorId: number
  supervisorName?: string
  dockEntryTime: string
  area: string
  teamId: number
  teamName?: string
  settlementCost: number
  constructionCost: number
  profitLoss?: number
  profitLossRate?: number
  projectStatus?: string | null
  remarks?: string | null
  createdAt: string
  updatedAt: string
}

export interface CargoHoldCostInfo {
  id: number
  repairNumber?: string | null
  shipId: number
  shipName?: string
  shipLength?: number
  shipWidth?: number
  supervisorId: number
  supervisorName?: string
  cargoRatio: number
  originalRatio: number
  originalPhoto?: string | null
  teamId?: number | null
  teamName?: string | null
  settlementCost: number
  constructionCost: number
  profitLoss?: number
  profitLossRate?: number
  projectStatus?: string | null
  remarks?: string | null
  createdAt: string
  updatedAt: string
}

export interface RustRemovalCostInfo {
  id: number
  repairNumber?: string | null
  shipId: number
  shipName?: string
  shipLength?: number
  shipWidth?: number
  area: string
  projectName: string
  teamId?: number | null
  teamName?: string
  manHours: number
  hourlyRate: number
  totalCost?: number
  projectStatus?: string | null
  remarks?: string | null
  createdAt: string
}

export interface WaterJetCostInfo {
  id: number
  repairNumber?: string | null
  shipId: number
  shipName?: string
  shipLength?: number
  shipWidth?: number
  dockEntryTime: string
  project: string
  teamId: number
  teamName?: string
  settlementCost: number
  constructionCost: number
  profitLoss?: number
  profitLossRate?: number
  projectStatus?: string | null
  remarks?: string | null
  createdAt: string
  updatedAt: string
}

/** 船舶涂装工程汇总（用于单船管理面板） */
export interface ShipProjectInfo {
  /** 工程类型: 外板涂装 | 货舱涂装 | 水刀除锈 | 敲铲除锈 */
  projectType: string
  /** 工程名称（区域/项目名） */
  projectName: string
  /** 工程状态 */
  status: string
  /** 负责队伍 */
  teamName?: string
  /** 修理编号 */
  repairNumber?: string | null
}

export interface TeamSettlementInfo {
  period: string
  teamId: number
  teamName: string
  settlementCost: number
  constructionCost: number
  /** 盈亏 = 结算成本 - 施工成本，正数为盈利、负数为亏损 */
  profitLoss: number
}

export interface SafetyPunishmentInfo {
  id: number
  teamId: number
  teamName?: string
  punishedPersonId?: number | null
  punishedPersonName?: string
  issuerId: number
  issuerName?: string
  punishmentTime: string
  category: "normal" | "high_voltage"
  amount: number
  reason: string
  createdAt: string
}

export interface ShipTeamInfo {
  id: number
  shipId: number
  teamId: number
  teamName?: string
  leaderName?: string
  memberCount?: number
  assignedAt: string
}

export interface SceneData {
  docks: DockInfo[]
  ships: ShipSceneInfo[]
}

/** 增强版船舶信息（用于3D场景，含出勤和队伍数据） */
export interface ShipSceneInfo extends ShipInfo {
  teams?: ShipTeamInfo[]
  activeAttendance?: ActiveAttendanceInfo[]
  totalSettlementCost?: number
  totalConstructionCost?: number
}

export interface AttendanceInfo {
  id: number
  teamId: number
  teamName?: string
  shipId?: number | null
  shipName?: string
  dockId?: number | null
  dockName?: string
  workerCount: number
  startTime: string
  endTime?: string | null
  /** 当前工时（小时）= workerCount × 已过小时数 */
  currentHours?: number
  createdAt: string
}

export interface WorkHourTimeSlotInfo {
  id: number
  workHourEntryId: number
  startTime: string
  endTime: string
  hours: number
  createdAt: string
}

export interface WorkHourEntryInfo {
  id: number
  workHourRecordId: number
  craftType: string
  workerCount: number
  workDays: number
  totalHours?: number
  createdAt: string
  timeSlots: WorkHourTimeSlotInfo[]
}

export interface WorkHourRecordInfo {
  id: number
  recordDate: string
  shipId: number
  shipName?: string
  teamId: number
  teamName?: string
  note?: string | null
  createdBy: number
  createdByName?: string
  totalWorkers?: number
  totalWorkDays?: number
  createdAt: string
  updatedAt: string
  entries: WorkHourEntryInfo[]
}

export interface ActiveAttendanceInfo {
  id: number
  teamId: number
  teamName: string
  workerCount: number
  startTime: string
  /** 实时工时（小时） */
  currentHours: number
}

export interface SceneSettingsInfo {
  id: number
  factoryId: number
  coastlineZ: number
  waterOpacity: number
  ambientIntensity: number
  bgColor: string
  fogNear: number
  fogFar: number
  factoryLayout?: string | null
  gantryCraneCount: number
  mapCenterX: number
  mapCenterZ: number
}

/** 门座式起重机信息 */
export interface GantryCraneInfo {
  id: number
  name: string
  factoryId: number
  positionX: number
  positionZ: number
  rotation: number
  dockId?: number | null
  status: "active" | "maintenance" | "idle"
}

/** 天气潮汐数据 */
export interface WeatherTideData {
  temperature: number
  weather: string
  weatherIcon: string
  windDirection: string
  windSpeed: number
  humidity: number
  pressure: number
  visibility: number
  tideHeight: number
  tideTrend: "rising" | "falling"
  nextHighTide: { time: string; height: number }
  nextLowTide: { time: string; height: number }
  bestDockTimes: { start: string; end: string; score: number; label: string }[]
  hourlyForecast: { time: string; tideHeight: number }[]
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: { code: string; message: string }
}
