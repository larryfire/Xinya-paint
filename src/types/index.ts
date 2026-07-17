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
  dockId?: number | null
  dockName?: string
  berthId?: number | null
  berthName?: string
  positionX?: number | null
  positionZ?: number | null
  rotation?: number | null
  createdAt: string
}

export interface DockInfo {
  id: number
  name: string
  type: "dock" | "berth" | "wharf" | "warehouse"
  positionX: number
  positionZ: number
  width: number
  depth: number
  status: "occupied" | "available" | "maintenance"
}

export interface ExternalPlateCostInfo {
  id: number
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
  remarks?: string | null
  createdAt: string
  updatedAt: string
}

export interface CargoHoldCostInfo {
  id: number
  shipId: number
  shipName?: string
  shipLength?: number
  shipWidth?: number
  supervisorId: number
  supervisorName?: string
  cargoRatio: number
  originalRatio: number
  originalPhoto?: string | null
  settlementCost: number
  constructionCost: number
  profitLoss?: number
  profitLossRate?: number
  remarks?: string | null
  createdAt: string
  updatedAt: string
}

export interface RustRemovalCostInfo {
  id: number
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
  remarks?: string | null
  createdAt: string
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
  ships: ShipInfo[]
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
