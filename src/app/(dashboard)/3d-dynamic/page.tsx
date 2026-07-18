"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Ship, Anchor, Ruler } from "lucide-react"
import { SHIP_STATUS_MAP } from "@/lib/constants"
import type { DockInfo, ShipInfo } from "@/types"
import { SceneModel } from "@/components/3d/scene-model"

/** 状态颜色映射 */
const statusToColor = (status: string) =>
  SHIP_STATUS_MAP[status as keyof typeof SHIP_STATUS_MAP]?.color || "#95A5A6"

export default function Dynamic3DPage() {
  const [loading, setLoading] = useState(true)
  const [docks, setDocks] = useState<DockInfo[]>([])
  const [ships, setShips] = useState<ShipInfo[]>([])
  const [selectedShip, setSelectedShip] = useState<ShipInfo | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchSceneData() {
      try {
        const res = await fetch("/api/scene-data")
        const data = await res.json()
        if (data.success) {
          setDocks(data.data.docks)
          setShips(data.data.ships)
        } else {
          setError(data.error?.message || "加载场景数据失败")
        }
      } catch {
        setError("网络错误，无法加载场景数据")
      } finally {
        setLoading(false)
      }
    }

    fetchSceneData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">正在加载3D场景...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">3D船舶动态图</h1>
          <p className="text-sm text-slate-500">
            厂区码头 · 泊位 · 船坞与船舶状态总览 — 拖拽旋转 · 滚轮缩放 · 右键平移
          </p>
        </div>

        {/* 统计信息 */}
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <Ship className="h-4 w-4" />
            船舶 {ships.length}
          </span>
          <span className="flex items-center gap-1">
            <Anchor className="h-4 w-4" />
            码头/泊位 {docks.length}
          </span>
        </div>
      </div>

      {/* 3D 场景 */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 relative">
          <div className="w-full h-[580px]">
            <SceneModel
              docks={docks}
              ships={ships}
              selectedShip={selectedShip}
              onSelectShip={setSelectedShip}
            />
          </div>

          {/* 选中船舶信息面板 */}
          {selectedShip && (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg w-56 text-sm border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-base text-slate-900">
                  {selectedShip.name}
                </h3>
                <button
                  onClick={() => setSelectedShip(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                >
                  ×
                </button>
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div className="flex items-center gap-2">
                  <Ship className="h-3.5 w-3.5 text-slate-400" />
                  <span>类型: {selectedShip.shipType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ruler className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    尺寸: {String(selectedShip.length)}×{String(selectedShip.width)}×{String(selectedShip.height)}m
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  状态:
                  <Badge
                    className="text-xs"
                    style={{
                      backgroundColor: statusToColor(selectedShip.status),
                      color: "white",
                    }}
                  >
                    {SHIP_STATUS_MAP[selectedShip.status]?.label || selectedShip.status}
                  </Badge>
                </div>
                {selectedShip.dockName && (
                  <p>所在坞: {selectedShip.dockName}</p>
                )}
                {selectedShip.berthName && (
                  <p>靠泊位: {selectedShip.berthName}</p>
                )}
              </div>
            </div>
          )}

          {/* 图例 */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow text-xs border border-slate-200">
            <p className="font-semibold text-slate-700 mb-2">图例</p>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "#E74C3C" }} />
                占用/维修
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "#27AE60" }} />
                空闲/在航
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "#F39C12" }} />
                维护/靠泊
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "#9B59B6" }} />
                维修
              </div>
            </div>
          </div>

          {/* 操作提示 */}
          <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-slate-400 border border-slate-100">
            🖱 左键旋转 · 滚轮缩放 · 右键平移 · 点击船舶查看详情
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
