"use client"

import { useEffect, useCallback, useRef } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useSceneStore, type EditTool } from "@/stores/scene-store"
import { SceneModel } from "@/components/3d/scene-model"
import { EditorToolbar, EditorContextMenu } from "@/components/3d/editor-tools"
import { FactorySwitcher } from "@/components/panels/factory-switcher"
import { StatsOverlay } from "@/components/panels/stats-overlay"
import { WeatherTidePanel } from "@/components/panels/weather-tide-panel"
import { DetailPanel } from "@/components/panels/detail-panel"
import { LegendBar } from "@/components/panels/legend-bar"
import { Loader2 } from "lucide-react"

/**
 * WebGIS 3D船舶动态大屏主页面
 * 全屏暗色主题，集成Two.js 3D场景 + 数据可视化面板
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
    <div className="relative h-full w-full">
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
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50">
        <FactorySwitcher />
      </div>

      {/* ===== 左上角：统计指标卡 ===== */}
      <div className="absolute top-3 left-3 z-40">
        <StatsOverlay />
      </div>

      {/* ===== 右上角：操作按钮 ===== */}
      <div className="absolute top-3 right-3 flex gap-2 z-40">
        {isAdmin && !editMode && (
          <button
            className="px-3 py-1.5 text-xs font-medium bg-slate-800/90 text-slate-200 border border-slate-600/50 rounded-lg hover:bg-slate-700/90 backdrop-blur-sm transition-colors"
            onClick={() => {
              setEditMode(true)
              setEditTool("move")
            }}
          >
            ✏️ 编辑地图
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

      {/* ===== 右侧：天气潮汐面板 ===== */}
      <div className="absolute top-20 right-3 z-40 w-72">
        <WeatherTidePanel />
      </div>

      {/* ===== 右侧：施工详情面板 ===== */}
      <DetailPanel
        onStartAttendance={fetchSceneData}
        onEndAttendance={fetchSceneData}
      />

      {/* ===== 底部：图例栏 ===== */}
      <div className="absolute bottom-3 left-3 z-40">
        <LegendBar />
      </div>

      {/* ===== 场景设置面板（编辑模式下） ===== */}
      {useSceneStore((s) => s.settingsOpen) && (
        <div className="absolute top-12 right-3 z-50 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 space-y-4 text-slate-200">
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
    </div>
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
