import { create } from "zustand"
import type {
  ShipSceneInfo,
  DockInfo,
  GantryCraneInfo,
  SceneSettingsInfo,
  WeatherTideData,
} from "@/types"

/** 厂区类型 */
export type FactoryId = 1 | 2

/** 编辑工具类型 */
export type EditTool = "move" | "resize" | "add" | "delete"

/** 右侧面板类型 */
export type RightPanel = "ship" | "dock" | "settings" | null

/** 场景全局状态 */
interface SceneState {
  // 厂区
  currentFactory: FactoryId
  setCurrentFactory: (factory: FactoryId) => void

  // 选中
  selectedShip: ShipSceneInfo | null
  selectedDock: DockInfo | null
  selectShip: (ship: ShipSceneInfo | null) => void
  selectDock: (dock: DockInfo | null) => void

  // 右侧面板
  rightPanel: RightPanel
  setRightPanel: (panel: RightPanel) => void

  // 编辑模式
  editMode: boolean
  editTool: EditTool
  setEditMode: (v: boolean) => void
  setEditTool: (t: EditTool) => void

  // 场景数据
  ships: ShipSceneInfo[]
  docks: DockInfo[]
  gantryCranes: GantryCraneInfo[]
  loading: boolean
  setSceneData: (data: {
    ships: ShipSceneInfo[]
    docks: DockInfo[]
    gantryCranes: GantryCraneInfo[]
  }) => void
  setLoading: (v: boolean) => void

  // 场景设置
  sceneSettings: SceneSettingsInfo | null
  setSceneSettings: (s: SceneSettingsInfo | null) => void

  // 天气潮汐
  weatherData: WeatherTideData | null
  setWeatherData: (d: WeatherTideData | null) => void

  // 上下文菜单
  ctxMenu: { x: number; y: number; wx: number; wz: number } | null
  setCtxMenu: (
    m: { x: number; y: number; wx: number; wz: number } | null
  ) => void

  // 卫星地图纹理
  showSatelliteMap: boolean
  toggleSatelliteMap: () => void

  // 面板
  panelOpen: boolean
  setPanelOpen: (v: boolean) => void
  attendanceOpen: boolean
  setAttendanceOpen: (v: boolean) => void
  settingsOpen: boolean
  setSettingsOpen: (v: boolean) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  // 厂区
  currentFactory: 1,
  setCurrentFactory: (factory) =>
    set({
      currentFactory: factory,
      selectedShip: null,
      selectedDock: null,
      rightPanel: null,
      panelOpen: false,
    }),

  // 选中
  selectedShip: null,
  selectedDock: null,
  selectShip: (ship) =>
    set({
      selectedShip: ship,
      selectedDock: null,
      rightPanel: ship ? "ship" : null,
      panelOpen: !!ship,
    }),
  selectDock: (dock) =>
    set({
      selectedDock: dock,
      selectedShip: null,
      rightPanel: dock ? "dock" : null,
      panelOpen: !!dock,
    }),

  // 右侧面板
  rightPanel: null,
  setRightPanel: (panel) => set({ rightPanel: panel }),

  // 编辑模式
  editMode: false,
  editTool: "move",
  setEditMode: (v) => set({ editMode: v }),
  setEditTool: (t) => set({ editTool: t }),

  // 场景数据
  ships: [],
  docks: [],
  gantryCranes: [],
  loading: true,
  setSceneData: (data) =>
    set({
      ships: data.ships,
      docks: data.docks,
      gantryCranes: data.gantryCranes,
    }),
  setLoading: (v) => set({ loading: v }),

  // 场景设置
  sceneSettings: null,
  setSceneSettings: (s) => set({ sceneSettings: s }),

  // 天气潮汐
  weatherData: null,
  setWeatherData: (d) => set({ weatherData: d }),

  // 上下文菜单
  ctxMenu: null,
  setCtxMenu: (m) => set({ ctxMenu: m }),

  // 卫星地图纹理
  showSatelliteMap: false,
  toggleSatelliteMap: () =>
    set((s) => ({ showSatelliteMap: !s.showSatelliteMap })),

  // 面板控制
  panelOpen: false,
  setPanelOpen: (v) => set({ panelOpen: v }),
  attendanceOpen: false,
  setAttendanceOpen: (v) => set({ attendanceOpen: v }),
  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v }),
}))
