"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { SceneModel } from "@/components/3d/scene-model"
import { EditorToolbar, EditorContextMenu } from "@/components/3d/editor-tools"
import { useAuthStore } from "@/stores/auth-store"
import { formatCurrency } from "@/lib/utils"
import { SHIP_STATUS_MAP } from "@/lib/constants"
import type { ShipSceneInfo, DockInfo, SceneSettingsInfo } from "@/types"
import { Ship, Anchor, Wrench, Users, Plus, Minus, Loader2, ChevronRight, RefreshCw } from "lucide-react"

export default function Dynamic3DPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === "admin"
  type DockWithAtt = DockInfo & { activeAttendance?: { id: number; teamId: number; teamName: string; workerCount: number; startTime: string; currentHours: number }[] }

  const [docks, setDocks] = useState<DockWithAtt[]>([])
  const [ships, setShips] = useState<ShipSceneInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShip, setSelectedShip] = useState<ShipSceneInfo | null>(null)
  const [selectedDock, setSelectedDock] = useState<DockWithAtt | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  // 编辑状态
  const [editMode, setEditMode] = useState(false)
  const [editTool, setEditTool] = useState("move")
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; wx: number; wz: number } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 场景设置
  const [sceneSettings, setSceneSettings] = useState<SceneSettingsInfo | null>(null)

  // 出勤
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [attTeamId, setAttTeamId] = useState("")
  const [attWorkers, setAttWorkers] = useState(5)
  const [attTarget, setAttTarget] = useState<"ship" | "dock">("ship")
  const [submitting, setSubmitting] = useState(false)

  // ===== 数据获取 =====
  const fetchSceneData = useCallback(async () => {
    try {
      const res = await fetch("/api/scene-data")
      const d = await res.json()
      if (d.success) { setDocks(d.data.docks); setShips(d.data.ships) }
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/scene-settings")
      const d = await res.json()
      if (d.success) setSceneSettings(d.data)
    } catch { /* ignore */ }
  }, [])

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => { fetchSceneData(); fetchSettings(); pollingRef.current = setInterval(fetchSceneData, 10000); return () => { if (pollingRef.current) clearInterval(pollingRef.current) } }, [fetchSceneData, fetchSettings])

  useEffect(() => {
    if (selectedShip) { const u = ships.find((s) => s.id === selectedShip.id); if (u) setSelectedShip(u) }
    if (selectedDock) { const u = docks.find((d) => d.id === selectedDock.id); if (u) setSelectedDock(u) }
  }, [ships, docks])

  // ===== 编辑操作 =====
  const handleShipDragEnd = useCallback(async (shipId: number, x: number, z: number) => {
    await fetch(`/api/ships/${shipId}/position`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ positionX: x, positionZ: z }) })
    fetchSceneData()
  }, [fetchSceneData])

  const handleDockDragEnd = useCallback(async (dockId: number, x: number, z: number) => {
    await fetch(`/api/docks/${dockId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ positionX: x, positionZ: z }) })
    fetchSceneData()
  }, [fetchSceneData])

  const handleAddDock = useCallback(async (type: string, x: number, z: number) => {
    const names: Record<string, string> = { dock: "新船坞", berth: "新泊位", workshop: "新车间", warehouse: "新仓库", wharf: "新码头" }
    await fetch("/api/docks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `${names[type] || "新设施"}${Date.now() % 1000}`, type, positionX: x, positionZ: z, width: 10, depth: 8 }) })
    fetchSceneData()
  }, [fetchSceneData])

  const handleDeleteDock = useCallback(async () => {
    if (!selectedDock) return
    await fetch(`/api/docks/${selectedDock.id}`, { method: "DELETE" })
    setSelectedDock(null); fetchSceneData()
  }, [selectedDock, fetchSceneData])

  // ===== 场景设置保存 =====
  const saveSettings = useCallback(async (updates: Partial<SceneSettingsInfo>) => {
    await fetch("/api/scene-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) })
    setSceneSettings((prev) => prev ? { ...prev, ...updates } : null)
  }, [])

  // ===== 出勤 =====
  const handleStartAttendance = async () => {
    if (!attTeamId) return; setSubmitting(true)
    try {
      const body: Record<string, unknown> = { teamId: Number(attTeamId), workerCount: attWorkers }
      if (attTarget === "ship" && selectedShip) body.shipId = selectedShip.id
      if (attTarget === "dock" && selectedDock) body.dockId = selectedDock.id
      const res = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (res.ok) { setAttendanceOpen(false); fetchSceneData() }
    } finally { setSubmitting(false) }
  }

  const handleEndAttendance = async (attendanceId: number) => {
    await fetch(`/api/attendance/${attendanceId}`, { method: "PUT" }); fetchSceneData()
  }

  const dockCount = docks.filter((d) => d.type === "dock").length
  const wsCount = docks.filter((d) => d.type === "workshop").length
  const activeCount = [...ships.flatMap((s) => s.activeAttendance ?? []), ...docks.flatMap((d) => d.activeAttendance ?? [])].length
  const availableTeams = selectedShip?.teams ?? []

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -mx-4 -mb-4">
      {/* ===== 左侧 3D ===== */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <SceneModel docks={docks} ships={ships}
            selectedShip={selectedShip} selectedDock={selectedDock}
            onSelectShip={(s) => { setSelectedShip(s); setSelectedDock(null); setPanelOpen(!!s) }}
            onSelectDock={(d) => { setSelectedDock(d); setSelectedShip(null); setPanelOpen(!!d) }}
            editMode={editMode} editTool={editTool}
            onShipDragEnd={handleShipDragEnd} onDockDragEnd={handleDockDragEnd}
            onContextMenu={(e) => setCtxMenu({ x: e.clientX, y: e.clientY, wx: e.worldX, wz: e.worldZ })}
            settings={sceneSettings}
          />
        )}

        {/* 统计 + 按钮 */}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap z-40">
          <Badge variant="secondary" className="bg-black/60 text-white border-none"><Ship className="h-3 w-3 mr-1" />{ships.length}艘</Badge>
          <Badge variant="secondary" className="bg-black/60 text-white border-none"><Anchor className="h-3 w-3 mr-1" />{dockCount}坞</Badge>
          {wsCount > 0 && <Badge variant="secondary" className="bg-black/60 text-white border-none"><Wrench className="h-3 w-3 mr-1" />{wsCount}车间</Badge>}
          {activeCount > 0 && <Badge className="bg-green-600 text-white border-none"><Users className="h-3 w-3 mr-1" />{activeCount}活跃</Badge>}
        </div>

        {/* 按钮 */}
        {!editMode && (
          <div className="absolute top-3 right-3 flex gap-2 z-40">
            {isAdmin && <Button size="sm" variant="outline" className="bg-black/60 text-white border-white/20 hover:bg-black/80" onClick={() => setEditMode(true)}>✏️ 编辑地图</Button>}
            <Button size="sm" variant="outline" className="bg-black/60 text-white border-white/20 hover:bg-black/80" onClick={fetchSceneData}><RefreshCw className="h-3.5 w-3.5 mr-1" />刷新</Button>
          </div>
        )}

        {/* 编辑工具栏 */}
        {editMode && <EditorToolbar activeTool={editTool} onToolChange={setEditTool} onOpenSettings={() => setSettingsOpen(true)} onExitEdit={() => setEditMode(false)} />}

        {/* 右键菜单 */}
        {ctxMenu && (
          <EditorContextMenu x={ctxMenu.x} y={ctxMenu.y} worldPos={{ x: ctxMenu.wx, z: ctxMenu.wz }}
            onClose={() => setCtxMenu(null)} onAddDock={handleAddDock} onDeleteDock={handleDeleteDock}
            hasSelection={!!selectedDock} />
        )}

        {/* 图例 */}
        <div className="absolute bottom-3 left-3 bg-black/60 rounded-lg px-3 py-2 text-[10px] text-white/70 flex gap-3 flex-wrap z-40">
          {Object.entries(SHIP_STATUS_MAP).map(([k, v]) => (<span key={k} className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.color }} />{v.label}</span>))}
          {editMode && <span className="text-green-400 border-l border-white/20 pl-3">工具栏: 移动/缩放/新增/删除 | 右键空白新建 | 右键设施删除</span>}
        </div>
      </div>

      {/* ===== 右侧面板 ===== */}
      {panelOpen && (selectedShip || selectedDock) && (
        <div className="w-80 border-l bg-card overflow-y-auto flex-shrink-0 z-30">
          <div className="flex items-center justify-between p-3 border-b"><h3 className="font-semibold text-sm">{selectedShip ? "船舶详情" : "设施详情"}</h3><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setPanelOpen(false); setSelectedShip(null); setSelectedDock(null) }}><ChevronRight className="h-4 w-4" /></Button></div>
          {selectedShip && (<div className="p-3 space-y-4">
            <div><h4 className="text-base font-bold">{selectedShip.name}</h4><div className="flex gap-2 mt-1"><Badge style={{ backgroundColor: SHIP_STATUS_MAP[selectedShip.status]?.color, color: "white" }}>{SHIP_STATUS_MAP[selectedShip.status]?.label ?? selectedShip.status}</Badge><span className="text-xs text-slate-500">{selectedShip.shipType}</span></div></div>
            <div className="grid grid-cols-2 gap-1 text-xs"><span className="text-slate-500">尺寸</span><span>{selectedShip.length}×{selectedShip.width}×{selectedShip.height}m</span><span className="text-slate-500">位置</span><span>{selectedShip.dockName || selectedShip.berthName || "在航"}</span></div>
            {(selectedShip.totalSettlementCost ?? 0) > 0 && (<Card className="!p-2 text-xs"><div className="font-medium mb-1">成本汇总</div><div className="grid grid-cols-2 gap-1"><span className="text-slate-500">结算</span><span className="text-right">{formatCurrency(selectedShip.totalSettlementCost ?? 0)}</span><span className="text-slate-500">施工</span><span className="text-right">{formatCurrency(selectedShip.totalConstructionCost ?? 0)}</span></div></Card>)}
            <div><div className="flex items-center justify-between mb-2"><h5 className="text-xs font-semibold text-slate-500 uppercase">当前出勤</h5><Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => { setAttTarget("ship"); setAttendanceOpen(true); setAttTeamId("") }}><Plus className="h-3 w-3 mr-1" />出勤</Button></div>{(selectedShip.activeAttendance ?? []).length === 0 ? <p className="text-xs text-slate-400">暂无活跃出勤</p> : selectedShip.activeAttendance!.map((a) => (<div key={a.id} className="flex items-center justify-between p-2 rounded bg-muted/50 mb-1"><div className="min-w-0"><p className="text-xs font-medium truncate">{a.teamName}</p><p className="text-[10px] text-slate-500">👥{a.workerCount}人 ⏱{a.currentHours.toFixed(1)}h 📊{(a.workerCount * a.currentHours).toFixed(1)}工时</p></div><Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleEndAttendance(a.id)}><Minus className="h-3 w-3" /></Button></div>))}</div>
            {(selectedShip.teams ?? []).length > 0 && (<div><h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">已分配队伍</h5>{selectedShip.teams!.map((t) => (<div key={t.teamId} className="flex items-center gap-2 text-xs py-1"><Users className="h-3 w-3 text-slate-400" /><span>{t.teamName}</span><span className="text-slate-400">({t.memberCount}人)</span></div>))}</div>)}
          </div>)}
          {selectedDock && !selectedShip && (<div className="p-3 space-y-4">
            <div><h4 className="text-base font-bold">{selectedDock.name}</h4><Badge className="mt-1">{selectedDock.type === "workshop" ? "车间" : selectedDock.type === "dock" ? "船坞" : selectedDock.type === "warehouse" ? "仓库" : "泊位"}</Badge></div>
            <div className="grid grid-cols-2 gap-1 text-xs"><span className="text-slate-500">状态</span><span>{selectedDock.status}</span><span className="text-slate-500">尺寸</span><span>{selectedDock.width}×{selectedDock.depth}m</span><span className="text-slate-500">坐标</span><span>({selectedDock.positionX}, {selectedDock.positionZ})</span></div>
            <div><div className="flex items-center justify-between mb-2"><h5 className="text-xs font-semibold text-slate-500 uppercase">当前出勤</h5><Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => { setAttTarget("dock"); setAttendanceOpen(true); setAttTeamId("") }}><Plus className="h-3 w-3 mr-1" />出勤</Button></div>{(selectedDock.activeAttendance ?? []).length === 0 ? <p className="text-xs text-slate-400">暂无活跃出勤</p> : selectedDock.activeAttendance!.map((a) => (<div key={a.id} className="flex items-center justify-between p-2 rounded bg-muted/50 mb-1"><div className="min-w-0"><p className="text-xs font-medium truncate">{a.teamName}</p><p className="text-[10px] text-slate-500">👥{a.workerCount}人 ⏱{a.currentHours.toFixed(1)}h</p></div><Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleEndAttendance(a.id)}><Minus className="h-3 w-3" /></Button></div>))}</div>
          </div>)}
        </div>
      )}

      {/* ===== 场景设置面板 ===== */}
      {settingsOpen && (
        <div className="w-72 border-l bg-card overflow-y-auto flex-shrink-0 z-30 p-4 space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-sm">场景设置</h3><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSettingsOpen(false)}><ChevronRight className="h-4 w-4" /></Button></div>
          {sceneSettings && (<>
            <div className="space-y-2"><Label className="text-xs">海岸线位置: {sceneSettings.coastlineZ.toFixed(0)}</Label><Slider value={[sceneSettings.coastlineZ]} min={-15} max={15} step={0.5} onValueChange={([v]) => saveSettings({ coastlineZ: v })} /></div>
            <div className="space-y-2"><Label className="text-xs">水面透明度: {sceneSettings.waterOpacity.toFixed(1)}</Label><Slider value={[sceneSettings.waterOpacity]} min={0.1} max={1} step={0.05} onValueChange={([v]) => saveSettings({ waterOpacity: v })} /></div>
            <div className="space-y-2"><Label className="text-xs">环境光强度: {sceneSettings.ambientIntensity.toFixed(1)}</Label><Slider value={[sceneSettings.ambientIntensity]} min={0.1} max={2} step={0.05} onValueChange={([v]) => saveSettings({ ambientIntensity: v })} /></div>
            <div className="space-y-2"><Label className="text-xs">雾起始距离: {sceneSettings.fogNear.toFixed(0)}</Label><Slider value={[sceneSettings.fogNear]} min={10} max={100} step={5} onValueChange={([v]) => saveSettings({ fogNear: v })} /></div>
            <div className="space-y-2"><Label className="text-xs">雾最远距离: {sceneSettings.fogFar.toFixed(0)}</Label><Slider value={[sceneSettings.fogFar]} min={50} max={200} step={5} onValueChange={([v]) => saveSettings({ fogFar: v })} /></div>
            <div className="space-y-2"><Label className="text-xs">背景色</Label><input type="color" value={sceneSettings.bgColor} onChange={(e) => saveSettings({ bgColor: e.target.value })} className="w-full h-8 rounded cursor-pointer" /></div>
          </>)}
        </div>
      )}

      {/* ===== 出勤对话框 ===== */}
      <Dialog open={attendanceOpen} onOpenChange={setAttendanceOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>开始出勤 - {attTarget === "ship" ? selectedShip?.name : selectedDock?.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {attTarget === "ship" && availableTeams.length > 0 ? (<div className="space-y-2"><Label>施工队伍</Label><Select value={attTeamId} onValueChange={setAttTeamId}><SelectTrigger><SelectValue placeholder="选择队伍" /></SelectTrigger><SelectContent>{availableTeams.map((t) => (<SelectItem key={t.teamId} value={String(t.teamId)}>{t.teamName} ({t.memberCount}人)</SelectItem>))}</SelectContent></Select></div>) : (<div className="space-y-2"><Label>队伍ID</Label><Input type="number" value={attTeamId} onChange={(e) => setAttTeamId(e.target.value)} placeholder="输入队伍ID" /></div>)}
          <div className="space-y-2"><Label>出勤人数</Label><div className="flex items-center gap-2"><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAttWorkers(Math.max(1, attWorkers - 1))}><Minus className="h-3 w-3" /></Button><span className="w-10 text-center font-bold">{attWorkers}</span><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAttWorkers(attWorkers + 1)}><Plus className="h-3 w-3" /></Button></div></div>
          <Button onClick={handleStartAttendance} disabled={submitting || !attTeamId} className="w-full">{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}开始出勤</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  )
}
