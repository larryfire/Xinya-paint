"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SceneModel } from "@/components/3d/scene-model"
import { useAuthStore } from "@/stores/auth-store"
import { formatCurrency } from "@/lib/utils"
import { SHIP_STATUS_MAP } from "@/lib/constants"
import type { ShipSceneInfo, DockInfo } from "@/types"
import { Ship, Anchor, Wrench, Users, Plus, Minus, Loader2, ChevronRight, Settings, MapPin, RefreshCw } from "lucide-react"

export default function Dynamic3DPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === "admin"

  // 带出勤数据的扩展类型
  type DockWithAttendance = DockInfo & { activeAttendance?: { id: number; teamId: number; teamName: string; workerCount: number; startTime: string; currentHours: number }[] }

  const [docks, setDocks] = useState<DockWithAttendance[]>([])
  const [ships, setShips] = useState<ShipSceneInfo[]>([])
  const [loading, setLoading] = useState(true)

  // 选中状态
  const [selectedShip, setSelectedShip] = useState<ShipSceneInfo | null>(null)
  const [selectedDock, setSelectedDock] = useState<DockWithAttendance | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // 出勤对话框
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [attTeamId, setAttTeamId] = useState("")
  const [attWorkers, setAttWorkers] = useState(5)
  const [attTarget, setAttTarget] = useState<"ship" | "dock">("ship")
  const [submitting, setSubmitting] = useState(false)

  const fetchSceneData = useCallback(async () => {
    try {
      const res = await fetch("/api/scene-data")
      const data = await res.json()
      if (data.success) { setDocks(data.data.docks); setShips(data.data.ships) }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    fetchSceneData()
    pollingRef.current = setInterval(fetchSceneData, 10000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [fetchSceneData])

  // 从最新数据同步选中项
  useEffect(() => {
    if (selectedShip) { const u = ships.find((s) => s.id === selectedShip.id); if (u) setSelectedShip(u) }
    if (selectedDock) { const u = docks.find((d) => d.id === selectedDock.id); if (u) setSelectedDock(u) }
  }, [ships, docks])

  const handleShipDragEnd = useCallback(async (shipId: number, x: number, z: number) => {
    try {
      await fetch(`/api/ships/${shipId}/position`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionX: x, positionZ: z }),
      })
      fetchSceneData()
    } catch { /* ignore */ }
  }, [fetchSceneData])

  const handleStartAttendance = async () => {
    if (!attTeamId) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { teamId: Number(attTeamId), workerCount: attWorkers }
      if (attTarget === "ship" && selectedShip) body.shipId = selectedShip.id
      if (attTarget === "dock" && selectedDock) body.dockId = selectedDock.id
      const res = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (res.ok) { setAttendanceOpen(false); fetchSceneData() }
    } finally { setSubmitting(false) }
  }

  const handleEndAttendance = async (attendanceId: number) => {
    try { await fetch(`/api/attendance/${attendanceId}`, { method: "PUT" }); fetchSceneData() } catch { /* ignore */ }
  }

  const dockCount = docks.filter((d) => d.type === "dock").length
  const wsCount = docks.filter((d) => d.type === "workshop").length
  const activeCount = [...ships.flatMap((s) => s.activeAttendance ?? []), ...docks.flatMap((d) => d.activeAttendance ?? [])].length

  // 可出勤的队伍
  const availableTeams = selectedShip?.teams ?? []

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -mx-4 -mb-4">
      {/* ===== 左侧 3D ===== */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <SceneModel
            docks={docks} ships={ships}
            selectedShip={selectedShip} selectedDock={selectedDock}
            onSelectShip={(s) => { setSelectedShip(s); setSelectedDock(null); setPanelOpen(!!s) }}
            onSelectDock={(d) => { setSelectedDock(d); setSelectedShip(null); setPanelOpen(!!d) }}
            editMode={editMode} onShipDragEnd={handleShipDragEnd}
          />
        )}

        {/* 顶部统计 */}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          <Badge variant="secondary" className="bg-black/60 text-white border-none"><Ship className="h-3 w-3 mr-1" />{ships.length}艘</Badge>
          <Badge variant="secondary" className="bg-black/60 text-white border-none"><Anchor className="h-3 w-3 mr-1" />{dockCount}坞</Badge>
          {wsCount > 0 && <Badge variant="secondary" className="bg-black/60 text-white border-none"><Wrench className="h-3 w-3 mr-1" />{wsCount}车间</Badge>}
          {activeCount > 0 && <Badge className="bg-green-600 text-white border-none"><Users className="h-3 w-3 mr-1" />{activeCount}活跃</Badge>}
        </div>

        {/* 右上操作 */}
        <div className="absolute top-3 right-3 flex gap-2">
          {isAdmin && (
            <Button size="sm" variant={editMode ? "default" : "outline"}
              className={editMode ? "" : "bg-black/60 text-white border-white/20 hover:bg-black/80"}
              onClick={() => setEditMode(!editMode)}>
              <Settings className="h-3.5 w-3.5 mr-1" />{editMode ? "退出" : "编辑"}
            </Button>
          )}
          <Button size="sm" variant="outline" className="bg-black/60 text-white border-white/20 hover:bg-black/80" onClick={fetchSceneData}><RefreshCw className="h-3.5 w-3.5 mr-1" />刷新</Button>
        </div>

        {/* 图例 */}
        <div className="absolute bottom-3 left-3 bg-black/60 rounded-lg px-3 py-2 text-[10px] text-white/70 flex gap-3 flex-wrap">
          {Object.entries(SHIP_STATUS_MAP).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.color }} />{v.label}</span>
          ))}
          <span className="border-l border-white/20 pl-3">点击船舶/车间查看详情</span>
          {editMode && <span className="text-green-400">| 编辑中：选中后点击地图放置</span>}
        </div>
      </div>

      {/* ===== 右侧面板 ===== */}
      {panelOpen && (selectedShip || selectedDock) && (
        <div className="w-80 border-l bg-card overflow-y-auto flex-shrink-0">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-sm">{selectedShip ? "船舶详情" : "车间/码头详情"}</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setPanelOpen(false); setSelectedShip(null); setSelectedDock(null) }}><ChevronRight className="h-4 w-4" /></Button>
          </div>

          {/* 船舶信息 */}
          {selectedShip && (
            <div className="p-3 space-y-4">
              <div>
                <h4 className="text-base font-bold">{selectedShip.name}</h4>
                <div className="flex gap-2 mt-1">
                  <Badge style={{ backgroundColor: SHIP_STATUS_MAP[selectedShip.status]?.color, color: "white" }}>{SHIP_STATUS_MAP[selectedShip.status]?.label ?? selectedShip.status}</Badge>
                  <span className="text-xs text-slate-500">{selectedShip.shipType}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-slate-500">尺寸</span><span>{selectedShip.length}×{selectedShip.width}×{selectedShip.height}m</span>
                <span className="text-slate-500">位置</span><span>{selectedShip.dockName || selectedShip.berthName || "在航"}</span>
              </div>
              {(selectedShip.totalSettlementCost ?? 0) > 0 && (
                <Card className="!p-2 text-xs">
                  <div className="font-medium mb-1">成本汇总</div>
                  <div className="grid grid-cols-2 gap-1"><span className="text-slate-500">结算</span><span className="text-right">{formatCurrency(selectedShip.totalSettlementCost ?? 0)}</span><span className="text-slate-500">施工</span><span className="text-right">{formatCurrency(selectedShip.totalConstructionCost ?? 0)}</span></div>
                </Card>
              )}
              {/* 活跃出勤 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-semibold text-slate-500 uppercase">当前出勤</h5>
                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => { setAttTarget("ship"); setAttendanceOpen(true); setAttTeamId("") }}><Plus className="h-3 w-3 mr-1" />出勤</Button>
                </div>
                {(selectedShip.activeAttendance ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400">暂无活跃出勤</p>
                ) : selectedShip.activeAttendance!.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded bg-muted/50 mb-1">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{a.teamName}</p>
                      <p className="text-[10px] text-slate-500">👥{a.workerCount}人 ⏱{a.currentHours.toFixed(1)}h 📊{(a.workerCount * a.currentHours).toFixed(1)}工时</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleEndAttendance(a.id)}><Minus className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
              {/* 已分配队伍 */}
              {(selectedShip.teams ?? []).length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">已分配队伍</h5>
                  {selectedShip.teams!.map((t) => (
                    <div key={t.teamId} className="flex items-center gap-2 text-xs py-1"><Users className="h-3 w-3 text-slate-400" /><span>{t.teamName}</span><span className="text-slate-400">({t.memberCount}人)</span></div>
                  ))}
                </div>
              )}
              {isAdmin && (
                <Card className="!p-2">
                  <div className="text-xs font-medium mb-1">管理</div>
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs justify-start" onClick={() => setEditMode(!editMode)}><MapPin className="h-3 w-3 mr-1" />{editMode ? "关闭拖拽" : "编辑位置"}</Button>
                </Card>
              )}
            </div>
          )}

          {/* 码头/车间信息 */}
          {selectedDock && !selectedShip && (
            <div className="p-3 space-y-4">
              <div>
                <h4 className="text-base font-bold">{selectedDock.name}</h4>
                <Badge className="mt-1">{selectedDock.type === "workshop" ? "车间" : selectedDock.type === "dock" ? "船坞" : selectedDock.type === "warehouse" ? "仓库" : "泊位"}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-slate-500">状态</span><span>{selectedDock.status}</span>
                <span className="text-slate-500">尺寸</span><span>{selectedDock.width}×{selectedDock.depth}m</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-semibold text-slate-500 uppercase">当前出勤</h5>
                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => { setAttTarget("dock"); setAttendanceOpen(true); setAttTeamId("") }}><Plus className="h-3 w-3 mr-1" />出勤</Button>
                </div>
                {(selectedDock.activeAttendance ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400">暂无活跃出勤</p>
                ) : selectedDock.activeAttendance!.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded bg-muted/50 mb-1">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{a.teamName}</p>
                      <p className="text-[10px] text-slate-500">👥{a.workerCount}人 ⏱{a.currentHours.toFixed(1)}h</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleEndAttendance(a.id)}><Minus className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 出勤对话框 ===== */}
      <Dialog open={attendanceOpen} onOpenChange={setAttendanceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>开始出勤 - {attTarget === "ship" ? selectedShip?.name : selectedDock?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {attTarget === "ship" && availableTeams.length > 0 ? (
              <div className="space-y-2">
                <Label>施工队伍</Label>
                <Select value={attTeamId} onValueChange={setAttTeamId}>
                  <SelectTrigger><SelectValue placeholder="选择队伍" /></SelectTrigger>
                  <SelectContent>{availableTeams.map((t) => (<SelectItem key={t.teamId} value={String(t.teamId)}>{t.teamName} ({t.memberCount}人)</SelectItem>))}</SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>队伍ID</Label>
                <Input type="number" value={attTeamId} onChange={(e) => setAttTeamId(e.target.value)} placeholder="输入队伍ID" />
              </div>
            )}
            <div className="space-y-2">
              <Label>出勤人数</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAttWorkers(Math.max(1, attWorkers - 1))}><Minus className="h-3 w-3" /></Button>
                <span className="w-10 text-center font-bold">{attWorkers}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAttWorkers(attWorkers + 1)}><Plus className="h-3 w-3" /></Button>
              </div>
            </div>
            <Button onClick={handleStartAttendance} disabled={submitting || !attTeamId} className="w-full">{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}开始出勤</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
