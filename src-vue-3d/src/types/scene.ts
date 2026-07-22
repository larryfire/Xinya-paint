/**
 * 场景数据类型定义
 */

/** 厂区 ID */
export type FactoryId = 1 | 2

/** 船坞/设施状态 */
export type DockStatus = "available" | "occupied" | "maintenance" | "offline"

/** 设施类型 */
export type DockType = "dock" | "berth" | "workshop" | "warehouse" | "wharf" | "office"

/** 船舶场景信息 */
export interface ShipSceneInfo {
  id: number
  name: string
  imo?: string | null
  type: string
  length: number
  width: number
  status: string
  positionX: number
  positionZ: number
  rotation: number
  dockId?: number | null
  factoryId: FactoryId
}

/** 船坞/设施信息 */
export interface DockInfo {
  id: number
  name: string
  type: DockType
  status: DockStatus
  factoryId: FactoryId
  positionX: number
  positionZ: number
  width: number
  depth: number
  height?: number
  rotation?: number
  activeAttendance?: { workerCount: number; currentHours: number }[]
}

/** 门座起重机信息 */
export interface GantryCraneInfo {
  id: number
  name: string
  status: "active" | "maintenance" | "idle"
  factoryId: FactoryId
  positionX: number
  positionZ: number
  rotation: number
  dockId?: number | null
}

/** 场景设置 */
export interface SceneSettingsInfo {
  factoryId: FactoryId
  coastlineZ: number
  waterOpacity: number
  ambientIntensity: number
  bgColor: string
  fogNear: number
  fogFar: number
}

/** 天气潮汐数据 */
export interface WeatherTideData {
  current: {
    weather: string
    temperature: number
    windLevel: string
    windDirection: string
    visibility: string
  }
  tide: {
    currentHeight: number
    trend: "up" | "down"
    nextHigh: string
    nextLow: string
  }
}

/** 场景完整数据 */
export interface SceneData {
  ships: ShipSceneInfo[]
  docks: DockInfo[]
  gantryCranes: GantryCraneInfo[]
}

/** 3D 对象用户数据 */
export interface ObjectUserData {
  type: "ship" | "dock" | "crane" | "building" | "road" | "hill"
  id: number
  name: string
  raw: ShipSceneInfo | DockInfo | GantryCraneInfo | Record<string, unknown>
}

/** 手绘地图矢量化布局 */
export interface FactoryLayout {
  factoryId: FactoryId
  name: string
  bounds: {
    minX: number
    maxX: number
    minZ: number
    maxZ: number
  }
  coastlineZ: number
  waterColor: string
  groundColor: string
  coastColor: string
  bgColor: string
  camera: {
    position: [number, number, number]
    target: [number, number, number]
  }
  hills: HillLayout[]
  roads: RoadLayout[]
  waterBoundary: [number, number][]
}

/** 山体布局 */
export interface HillLayout {
  name: string
  contours: [number, number][]
  height: number
  color: string
}

/** 道路布局 */
export interface RoadLayout {
  name: string
  width: number
  points: [number, number][]
  tunnel?: boolean
  tunnelHeight?: number
}

/** 图层状态 */
export interface LayerState {
  terrain: boolean
  buildings: boolean
  cranes: boolean
  docks: boolean
  roads: boolean
  water: boolean
  ships: boolean
  labels: boolean
}
