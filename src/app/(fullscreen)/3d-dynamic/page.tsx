"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useSceneStore, type EditTool } from "@/stores/scene-store"
import { SceneModel } from "@/components/3d/scene-model"
import { EditorToolbar, EditorContextMenu } from "@/components/3d/editor-tools"
import { FactorySwitcher } from "@/components/panels/factory-switcher"
import { StatsOverlay } from "@/components/panels/stats-overlay"
import { WeatherTidePanel } from "@/components/panels/weather-tide-panel"
import { DetailPanel } from "@/components/panels/detail-panel"
import { LegendBar } from "@/components/panels/legend-bar"
import { Loader2, BarChart3, Cloud, MapPin, ChevronUp } from "lucide-react"

/** 移动端断点：< 768px 启用紧凑布局 */
const MOBILE_BREAKPOINT = 768

/**
 * WebGIS 3D船舶动态大屏主页面
 * 全屏暗色主题，集成Three.js 3D场景 + 数据可视化面板
 * 支持桌面端（多面板同屏）和移动端（面板折叠+底部抽屉）双模式
 */
export default function WebGIS3DPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === "admin"

  const currentFactory = useSceneStore((s) => s.currentFactory)
  const setSceneData = useSceneStore((s) => s.setSceneData)
  const setLoading = useSceneStore((s) => s.setLoading)
  const setSceneSettings = useSceneStore((s) => s.setSceneSettings)
  const setWeatherData = useSceneStore((s) => s.setWeatherData)
  const loading = useSceneStore((s) => s.loading)
  const editMode = useSceneStore((s) => s.editMode)
  const setEditMode = useSceneStore((s) => s.setEditMode)
  const setEditTool = useSceneStore((s) => s.setEditTool)
  const editTool = useSceneStore((s) => s.editTool)
  const setCtxMenu = useSceneStore((s) => s.setCtxMenu)
  const ctxMenu = useSceneStore((s) => s.ctxMenu)
  const showSatelliteMap = useSceneStore((s) => s.showSatelliteMap)
  const toggleSatelliteMap = useSceneStore((s) => s.toggleSatelliteMap)

  // ===== 移动端状态 =====
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileStats, setShowMobileStats] = useState(false)
  const [showMobileWeather, setShowMobileWeather] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // ===== 数据获取 =====
  const fetchSceneData = useCallback(async () => {
    try {
      const res = await fetch(`/api/scene-data?factoryId=${currentFactory}`)
      const d = await res.json()
      if (d.success) {
        setSceneData({
          ships: d.data.ships,
          docks: d.data.docks,
          gantryCranes: d.data.gantryCranes,
        })
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [currentFactory, setSceneData, setLoading])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/scene-settings?factoryId=${currentFactory}`
      )
      const d = await res.json()
      if (d.success) setSceneSettings(d.data)
    } catch {
      /* ignore */
    }
  }, [currentFactory, setSceneSettings])

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch("/api/weather-tide")
      const d = await res.json()
      if (d.success) setWeatherData(d.data)
    } catch {
      /* ignore */
    }
  }, [setWeatherData])

  // 初始加载 + 10秒轮询场景数据
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    setLoading(true)
    fetchSceneData()
    fetchSettings()
    fetchWeather()
    pollingRef.current = setInterval(() => {
      fetchSceneData()
      fetchWeather()
    }, 10000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [
    currentFactory,
    fetchSceneData,
    fetchSettings,
    fetchWeather,
    setLoading,
  ])

  // ===== 编辑操作 =====
  const handleShipDragEnd = useCallback(
    async (shipId: number, x: number, z: number) => {
      await fetch(`/api/ships/${shipId}/position`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionX: x, positionZ: z }),
      })
      fetchSceneData()
    },
    [fetchSceneData]
  )

  const handleDockDragEnd = useCallback(
    async (dockId: number, x: number, z: number) => {
      await fetch(`/api/docks/${dockId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionX: x, positionZ: z }),
      })
      fetchSceneData()
    },
    [fetchSceneData]
  )

  const handleAddDock = useCallback(
    async (type: string, x: number, z: number) => {
      const names: Record<string, string> = {
        dock: "新船坞",
        berth: "新泊位",
        workshop: "新车间",
        warehouse: "新仓库",
        wharf: "新码头",
      }
      await fetch("/api/docks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${names[type] || "新设施"}${Date.now() % 1000}`,
          type,
          factoryId: currentFactory,
          positionX: x,
          positionZ: z,
          width: 10,
          depth: 8,
        }),
      })
      fetchSceneData()
    },
    [currentFactory, fetchSceneData]
  )

  const handleDeleteDock = useCallback(async () => {
    const dock = useSceneStore.getState().selectedDock
    if (!dock) return
    await fetch(`/api/docks/${dock.id}`, { method: "DELETE" })
    useSceneStore.getState().selectDock(null)
    fetchSceneData()
  }, [fetchSceneData])

  // ===== 场景设置保存 =====
  const saveSettings = useCallback(
    async (updates: Record<string, unknown>) => {
      await fetch(`/api/scene-settings?factoryId=${currentFactory}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      fetchSettings()
    },
    [currentFactory, fetchSettings]
  )

  return (
    <div className="relative h-full w-full" style={{ touchAction: "manipulation" }}>
      {/* ===== 3D场景主区域 ===== */}
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
            <p className="text-slate-400 text-sm">加载场景数据...</p>
          </div>
        </div>
      ) : (
        <SceneModel
          editMode={editMode}
          editTool={editTool}
          onShipDragEnd={handleShipDragEnd}
          onDockDragEnd={handleDockDragEnd}
          onContextMenu={(e) =>
            setCtxMenu({ x: e.clientX, y: e.clientY, wx: e.worldX, wz: e.worldZ })
          }
        />
      )}

      {/* ===== 顶部：厂区切换 ===== */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-50"
        style={{ top: isMobile ? 8 : 12 }}
      >
        <FactorySwitcher />
      </div>

      {/* ===== 桌面端：左上角统计指标卡 ===== */}
      {!isMobile && (
        <div className="absolute top-3 left-3 z-40">
          <StatsOverlay />
        </div>
      )}

      {/* ===== 移动端：统计浮窗 ===== */}
      {isMobile && showMobileStats && (
        <>
          <div
            className="absolute inset-0 z-40 bg-black/40"
            onClick={() => setShowMobileStats(false)}
          />
          <div className="absolute top-10 left-2 right-2 z-50 max-h-[60vh] overflow-y-auto">
            <StatsOverlay />
          </div>
        </>
      )}

      {/* ===== 右上角：操作按钮组 ===== */}
      <div
        className="absolute right-2 z-40 flex gap-1.5 flex-wrap justify-end"
        style={{ top: isMobile ? 8 : 12 }}
      >
        {/* 移动端统计切换 */}
        {isMobile && (
          <button
            className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg backdrop-blur-sm transition-colors ${
              showMobileStats
                ? "bg-cyan-600/80 text-white border-cyan-400/50"
                : "bg-slate-800/90 text-slate-200 border-slate-600/50"
            }`}
            onClick={() => {
              setShowMobileStats(!showMobileStats)
              setShowMobileWeather(false)
            }}
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </button>
        )}
        {/* 移动端天气切换 */}
        {isMobile && (
          <button
            className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg backdrop-blur-sm transition-colors ${
              showMobileWeather
                ? "bg-cyan-600/80 text-white border-cyan-400/50"
                : "bg-slate-800/90 text-slate-200 border-slate-600/50"
            }`}
            onClick={() => {
              setShowMobileWeather(!showMobileWeather)
              setShowMobileStats(false)
            }}
          >
            <Cloud className="h-3.5 w-3.5" />
          </button>
        )}
        {/* 卫星地图切换 */}
        <button
          className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg backdrop-blur-sm transition-colors ${
            showSatelliteMap
              ? "bg-cyan-600/80 text-white border-cyan-400/50 hover:bg-cyan-600/90"
              : "bg-slate-800/90 text-slate-200 border-slate-600/50 hover:bg-slate-700/90"
          }`}
          onClick={toggleSatelliteMap}
        >
          {isMobile ? "🛰️" : "🛰️ 卫星地图"}
        </button>
        {isAdmin && !editMode && (
          <button
            className="px-2.5 py-1.5 text-xs font-medium bg-slate-800/90 text-slate-200 border border-slate-600/50 rounded-lg hover:bg-slate-700/90 backdrop-blur-sm transition-colors"
            onClick={() => {
              setEditMode(true)
              setEditTool("move")
            }}
          >
            {isMobile ? "✏️" : "✏️ 编辑地图"}
          </button>
        )}
        {editMode && (
          <EditorToolbar
            activeTool={editTool}
            onToolChange={(t: string) => setEditTool(t as EditTool)}
            onOpenSettings={() =>
              useSceneStore.getState().setSettingsOpen(true)
            }
            onExitEdit={() => setEditMode(false)}
          />
        )}
      </div>

      {/* ===== 右键菜单 ===== */}
      {ctxMenu && (
        <EditorContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          worldPos={{ x: ctxMenu.wx, z: ctxMenu.wz }}
          onClose={() => setCtxMenu(null)}
          onAddDock={handleAddDock}
          onDeleteDock={handleDeleteDock}
          hasSelection={!!useSceneStore.getState().selectedDock}
        />
      )}

      {/* ===== 桌面端：右侧天气潮汐面板 ===== */}
      {!isMobile && (
        <div className="absolute top-20 right-3 z-40 w-72">
          <WeatherTidePanel />
        </div>
      )}

      {/* ===== 移动端：天气浮窗 ===== */}
      {isMobile && showMobileWeather && (
        <>
          <div
            className="absolute inset-0 z-40 bg-black/40"
            onClick={() => setShowMobileWeather(false)}
          />
          <div className="absolute top-10 right-2 z-50 w-72 max-h-[60vh] overflow-y-auto">
            <WeatherTidePanel />
          </div>
        </>
      )}

      {/* ===== 施工详情面板（桌面侧边 / 移动端底部抽屉） ===== */}
      <DetailPanel
        isMobile={isMobile}
        onStartAttendance={fetchSceneData}
        onEndAttendance={fetchSceneData}
      />

      {/* ===== 桌面端：底部图例栏 ===== */}
      {!isMobile && (
        <div className="absolute bottom-3 left-3 z-40">
          <LegendBar />
        </div>
      )}

      {/* ===== 场景设置面板 ===== */}
      {useSceneStore((s) => s.settingsOpen) && (
        <div
          className={`absolute z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 space-y-4 text-slate-200 ${
            isMobile
              ? "inset-x-2 top-12 max-h-[70vh] overflow-y-auto"
              : "top-12 right-3 w-72"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">场景设置</h3>
            <button
              className="text-slate-400 hover:text-white text-xs"
              onClick={() => useSceneStore.getState().setSettingsOpen(false)}
            >
              ✕
            </button>
          </div>
          {useSceneStore((s) => s.sceneSettings) && (
            <>
              <SettingsSlider
                label="海岸线位置"
                value={
                  useSceneStore.getState().sceneSettings?.coastlineZ ?? 0
                }
                min={-15}
                max={15}
                step={0.5}
                onChange={(v) => saveSettings({ coastlineZ: v })}
              />
              <SettingsSlider
                label="水面透明度"
                value={
                  useSceneStore.getState().sceneSettings?.waterOpacity ?? 0.6
                }
                min={0.1}
                max={1}
                step={0.05}
                onChange={(v) => saveSettings({ waterOpacity: v })}
              />
              <SettingsSlider
                label="环境光强度"
                value={
                  useSceneStore.getState().sceneSettings?.ambientIntensity ??
                  0.6
                }
                min={0.1}
                max={2}
                step={0.05}
                onChange={(v) => saveSettings({ ambientIntensity: v })}
              />
              <SettingsSlider
                label="雾起始距离"
                value={
                  useSceneStore.getState().sceneSettings?.fogNear ?? 60
                }
                min={10}
                max={100}
                step={5}
                onChange={(v) => saveSettings({ fogNear: v })}
              />
              <SettingsSlider
                label="雾最远距离"
                value={
                  useSceneStore.getState().sceneSettings?.fogFar ?? 200
                }
                min={50}
                max={300}
                step={5}
                onChange={(v) => saveSettings({ fogFar: v })}
              />
              <div className="space-y-1">
                <label className="text-xs text-slate-400">背景色</label>
                <input
                  type="color"
                  value={
                    useSceneStore.getState().sceneSettings?.bgColor ?? "#0A1628"
                  }
                  onChange={(e) => saveSettings({ bgColor: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== 移动端底部快捷栏 ===== */}
      {isMobile && !editMode && (
        <div className="absolute bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-slate-900/90 backdrop-blur-md border-t border-slate-700/50 px-2 py-1.5">
          <MobileTabBtn
            icon={<MapPin className="h-4 w-4" />}
            label="图例"
            onClick={() => setShowMobileStats(!showMobileStats)}
          />
          <MobileTabBtn
            icon={<BarChart3 className="h-4 w-4" />}
            label="统计"
            active={showMobileStats}
            onClick={() => {
              setShowMobileStats(!showMobileStats)
              setShowMobileWeather(false)
            }}
          />
          <MobileTabBtn
            icon={<Cloud className="h-4 w-4" />}
            label="天气"
            active={showMobileWeather}
            onClick={() => {
              setShowMobileWeather(!showMobileWeather)
              setShowMobileStats(false)
            }}
          />
          <MobileTabBtn
            icon={<ChevronUp className="h-4 w-4" />}
            label="详情"
            onClick={() => {
              const ship = useSceneStore.getState().selectedShip
              const dock = useSceneStore.getState().selectedDock
              if (ship || dock) {
                useSceneStore.getState().setPanelOpen(true)
              }
            }}
          />
        </div>
      )}
    </div>
  )
}

/** 移动端底部标签按钮 */
function MobileTabBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] transition-colors ${
        active
          ? "text-cyan-400 bg-cyan-500/10"
          : "text-slate-400 hover:text-slate-200"
      }`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

/** 设置滑块组件 */
function SettingsSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-400">
        {label}: {value.toFixed(1)}
      </label>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full"
      />
    </div>
  )
}
