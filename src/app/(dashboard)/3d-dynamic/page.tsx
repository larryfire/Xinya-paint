"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { SHIP_STATUS_MAP, DOCK_STATUS_MAP } from "@/lib/constants"
import type { DockInfo, ShipInfo } from "@/types"

/** 将状态颜色映射到 3D 颜色 */
const statusToColor = (status: string, type: "dock" | "ship") => {
  if (type === "dock") {
    return DOCK_STATUS_MAP[status as keyof typeof DOCK_STATUS_MAP]?.color || "#95A5A6"
  }
  return SHIP_STATUS_MAP[status as keyof typeof SHIP_STATUS_MAP]?.color || "#95A5A6"
}

export default function Dynamic3DPage() {
  const [loading, setLoading] = useState(true)
  const [docks, setDocks] = useState<DockInfo[]>([])
  const [ships, setShips] = useState<ShipInfo[]>([])
  const [selectedShip, setSelectedShip] = useState<ShipInfo | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch("/api/scene-data")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setDocks(data.data.docks)
          setShips(data.data.ships)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">3D船舶动态图</h1>
        <p className="text-sm text-slate-500">厂区码头、泊位、船坞与船舶状态总览</p>
      </div>

      {/* 3D 场景占位 */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative w-full h-[500px] bg-gradient-to-b from-sky-100 to-blue-200 overflow-hidden">
            {/* 简易2D俯视图 */}
            <div className="absolute inset-0" style={{ transform: "scale(1)" }}>
              {/* 水域 */}
              <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-b from-blue-300/40 to-blue-500/60" />

              {/* 陆地/码头区 */}
              <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-amber-100 to-amber-200/80" />

              {/* 分隔线 - 海岸线 */}
              <div className="absolute top-[40%] left-0 right-0 h-1 bg-amber-400" />

              {/* 码头设施 */}
              {docks.map((dock) => {
                const isDock = dock.type === "dock"
                const top = isDock ? "12%" : "55%"
                const color = statusToColor(dock.status, "dock")
                const px = ((dock.positionX + 50) / 100) * 90 + 5
                const pz = ((dock.positionZ + 30) / 60) * 40 + 10

                return (
                  <div
                    key={dock.id}
                    className="absolute flex flex-col items-center"
                    style={{
                      left: `${px}%`,
                      top: `${pz}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div
                      className="rounded border-2 flex items-center justify-center"
                      style={{
                        width: `${Math.max(60, dock.width * 6)}px`,
                        height: `${Math.max(20, dock.depth * 2)}px`,
                        borderColor: color,
                        backgroundColor: color + "20",
                      }}
                    >
                      <span className="text-[10px] font-semibold whitespace-nowrap px-1" style={{ color }}>
                        {dock.name}
                        {isDock ? "坞" : "泊位"}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* 船舶 */}
              {ships.map((ship) => {
                const color = statusToColor(ship.status, "ship")
                const px = ship.positionX
                  ? ((ship.positionX + 50) / 100) * 90 + 5
                  : 10 + ships.indexOf(ship) * 25
                const pz = ship.positionZ
                  ? ((ship.positionZ + 30) / 60) * 40 + 10
                  : 50 + (ships.indexOf(ship) % 3) * 15

                return (
                  <div
                    key={ship.id}
                    className="absolute flex flex-col items-center cursor-pointer hover:scale-110 transition-transform"
                    style={{
                      left: `${px}%`,
                      top: `${pz}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    onClick={() => setSelectedShip(selectedShip?.id === ship.id ? null : ship)}
                  >
                    <div
                      className="rounded-md border-2 flex items-center justify-center shadow-md"
                      style={{
                        width: `${Math.max(30, Number(ship.length) * 2)}px`,
                        height: `${Math.max(10, Number(ship.width) * 1.5)}px`,
                        borderColor: color,
                        backgroundColor: color + "30",
                      }}
                    >
                      <span className="text-[9px] font-bold truncate px-1" style={{ color }}>
                        {ship.name}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 图例 */}
            <div className="absolute bottom-3 left-3 bg-white/90 rounded-lg p-2 shadow text-xs space-y-1">
              <p className="font-semibold mb-1">图例</p>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500" /> 占用/坞内</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500" /> 空闲/在航</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-500" /> 维护/靠泊</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-500" /> 维修</div>
            </div>

            {/* 船舶信息面板 */}
            {selectedShip && (
              <div className="absolute top-3 right-3 bg-white rounded-lg p-3 shadow-lg w-52 text-sm">
                <h3 className="font-bold text-base">{selectedShip.name}</h3>
                <div className="mt-1 space-y-0.5">
                  <p>类型: {selectedShip.shipType}</p>
                  <p>尺寸: {String(selectedShip.length)}×{String(selectedShip.width)}×{String(selectedShip.height)}m</p>
                  <p className="flex items-center gap-1">
                    状态:{" "}
                    <Badge
                      style={{
                        backgroundColor: statusToColor(selectedShip.status, "ship"),
                        color: "white",
                      }}
                    >
                      {SHIP_STATUS_MAP[selectedShip.status]?.label || selectedShip.status}
                    </Badge>
                  </p>
                  {selectedShip.dockName && <p>所在坞: {selectedShip.dockName}</p>}
                  {selectedShip.berthName && <p>靠泊位: {selectedShip.berthName}</p>}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
