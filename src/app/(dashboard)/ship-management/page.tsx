"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"
import { SHIP_STATUS_MAP, REPAIR_STATUS_MAP, PROJECT_STATUS_MAP } from "@/lib/constants"
import { Plus, Loader2, Users, Ship as ShipIcon, Calendar, Wrench } from "lucide-react"
import type { ShipInfo, TeamInfo, ShipProjectInfo } from "@/types"

export default function ShipManagementPage() {
  const [ships, setShips] = useState<ShipInfo[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [selectedShip, setSelectedShip] = useState<ShipInfo | null>(null)
  const [shipTeams, setShipTeams] = useState<{ id: number; teamId: number; teamName: string; leaderName: string; memberCount: number; assignedAt: string }[]>([])
  const [shipProjects, setShipProjects] = useState<ShipProjectInfo[]>([])

  const [form, setForm] = useState({ name: "", shipType: "", length: "", width: "", height: "", status: "at_sea", repairStatus: "not_started", positionDetail: "", departureDate: "" })
  const [assignTeamId, setAssignTeamId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchShips = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/ships?pageSize=200")
      const data = await res.json()
      if (data.success) setShips(data.data.items)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchShips()
    fetch("/api/teams?pageSize=200").then(r => r.json()).then(d => d.success && setTeams(d.data.items)).catch(() => {})
  }, [fetchShips])

  const handleCreateShip = async () => {
    if (!form.name || !form.shipType || !form.length || !form.width || !form.height) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/ships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, shipType: form.shipType,
          length: Number(form.length), width: Number(form.width), height: Number(form.height),
          status: form.status,
          repairStatus: form.repairStatus,
          positionDetail: form.positionDetail || undefined,
          departureDate: form.departureDate ? new Date(form.departureDate).toISOString() : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDialogOpen(false)
        setForm({ name: "", shipType: "", length: "", width: "", height: "", status: "at_sea", repairStatus: "not_started", positionDetail: "", departureDate: "" })
        fetchShips()
      }
    } finally { setSubmitting(false) }
  }

  const handleAssignTeam = async () => {
    if (!selectedShip || !assignTeamId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/ships/${selectedShip.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: Number(assignTeamId) }),
      })
      const data = await res.json()
      if (data.success) {
        setAssignTeamId("")
        fetchShips()
        viewShipDetail(selectedShip)
      } else {
        alert(data.error?.message || "分配失败")
      }
    } finally { setSubmitting(false) }
  }

  const viewShipDetail = async (ship: ShipInfo) => {
    setSelectedShip(ship)
    try {
      const res = await fetch(`/api/ships/${ship.id}`)
      const data = await res.json()
      if (data.success) {
        setShipTeams(data.data.teams || [])
        setShipProjects(data.data.projects || [])
        setTeamDialogOpen(true)
      }
    } catch { /* ignore */ }
  }

  // 计算距走船还有多少天
  const getDaysUntil = (dateStr?: string | null) => {
    if (!dateStr) return null
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const target = new Date(dateStr)
    target.setHours(0, 0, 0, 0)
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">单船管理</h1>
          <p className="text-sm text-slate-500">管理船舶信息、涂装工程与施工队伍调配</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button><Plus className="mr-2 h-4 w-4" />新增船舶</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>新增船舶</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>船名</Label>
                <input className="flex h-9 w-full rounded-md border px-3 py-1 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：远洋1号" />
              </div>
              <div className="space-y-2">
                <Label>船舶类型</Label>
                <Select value={form.shipType} onValueChange={(v) => setForm({ ...form, shipType: v })}>
                  <SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="散货船">散货船</SelectItem>
                    <SelectItem value="油轮">油轮</SelectItem>
                    <SelectItem value="集装箱船">集装箱船</SelectItem>
                    <SelectItem value="化学品船">化学品船</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>船长 (m)</Label>
                <input className="flex h-9 w-full rounded-md border px-3 py-1 text-sm" type="number" value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>船宽 (m)</Label>
                <input className="flex h-9 w-full rounded-md border px-3 py-1 text-sm" type="number" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>船高 (m)</Label>
                <input className="flex h-9 w-full rounded-md border px-3 py-1 text-sm" type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>计划走船日期</Label>
                <input className="flex h-9 w-full rounded-md border px-3 py-1 text-sm" type="date" value={form.departureDate} onChange={(e) => setForm({ ...form, departureDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>位置状态</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="docked">坞内</SelectItem>
                    <SelectItem value="at_berth">靠泊</SelectItem>
                    <SelectItem value="at_sea">锚地/试航</SelectItem>
                    <SelectItem value="maintenance">维修</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>修理状态</Label>
                <Select value={form.repairStatus} onValueChange={(v) => setForm({ ...form, repairStatus: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">未开工</SelectItem>
                    <SelectItem value="started">已开工</SelectItem>
                    <SelectItem value="in_factory">在厂修理</SelectItem>
                    <SelectItem value="left_factory">离厂</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>位置详情</Label>
                <input className="flex h-9 w-full rounded-md border px-3 py-1 text-sm" value={form.positionDetail} onChange={(e) => setForm({ ...form, positionDetail: e.target.value })} placeholder="如：3档 / 锚地 / 试航" />
              </div>
            </div>
            <Button onClick={handleCreateShip} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}创建
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ships grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ships.map((ship) => {
          const statusInfo = SHIP_STATUS_MAP[ship.status]
          const repairInfo = REPAIR_STATUS_MAP[ship.repairStatus || "not_started"]
          const daysUntil = getDaysUntil(ship.departureDate)
          return (
            <Card key={ship.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <ShipIcon className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{ship.name}</h3>
                      <p className="text-xs text-slate-500">{ship.shipType}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge style={{ backgroundColor: statusInfo.color, color: "white" }}>
                      {statusInfo.label}
                    </Badge>
                    <Badge style={{ backgroundColor: repairInfo.color, color: "white" }}>
                      {repairInfo.label}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-slate-600">
                    📍 位置：<span className="font-medium">{ship.positionLabel || "--"}</span>
                  </p>
                  <p className="text-slate-500">
                    尺寸: {String(ship.length)}×{String(ship.width)}×{String(ship.height)}m
                  </p>
                  {ship.departureDate && (
                    <p className="text-slate-600">
                      <Calendar className="inline h-3.5 w-3.5 mr-1" />
                      走船：<span className="font-medium">{formatDate(ship.departureDate)}</span>
                      {daysUntil != null && (
                        <Badge className="ml-2" variant={daysUntil <= 3 ? "destructive" : daysUntil <= 7 ? "default" : "secondary"}>
                          {daysUntil < 0 ? `已超${Math.abs(daysUntil)}天` : `剩${daysUntil}天`}
                        </Badge>
                      )}
                    </p>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => viewShipDetail(ship)}>
                    <Wrench className="mr-1 h-3 w-3" />工程与队伍
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Ship detail dialog: teams + projects */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedShip?.name} - 工程与队伍</DialogTitle>
          </DialogHeader>

          {/* 涂装工程列表 */}
          <div className="mt-2">
            <h4 className="font-medium mb-2 flex items-center gap-1">
              <Wrench className="h-4 w-4" />涂装工程
            </h4>
            {shipProjects.length === 0 ? (
              <p className="text-sm text-slate-400">暂无涂装工程记录</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>工程类型</TableHead>
                    <TableHead>工程名称</TableHead>
                    <TableHead>修理编号</TableHead>
                    <TableHead>施工队伍</TableHead>
                    <TableHead>工程状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipProjects.map((p, i) => {
                    const s = PROJECT_STATUS_MAP[p.status] || PROJECT_STATUS_MAP.in_progress
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{p.projectType}</TableCell>
                        <TableCell>{p.projectName}</TableCell>
                        <TableCell className="text-xs text-slate-500">{p.repairNumber || "--"}</TableCell>
                        <TableCell>{p.teamName || "--"}</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: s.color, color: "white" }}>{s.label}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* 分隔线 */}
          <div className="my-4 border-t" />

          {/* 施工队伍 */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-1">
              <Users className="h-4 w-4" />分配施工队伍
            </h4>
            <div className="flex items-end gap-3 py-2">
              <div className="flex-1 space-y-2">
                <Label>选择队伍</Label>
                <Select value={assignTeamId} onValueChange={setAssignTeamId}>
                  <SelectTrigger><SelectValue placeholder="选择队伍" /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignTeam} disabled={submitting || !assignTeamId}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}分配
              </Button>
            </div>
            {shipTeams.length === 0 ? (
              <p className="text-sm text-slate-400 mt-2">暂无施工队伍</p>
            ) : (
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>队伍</TableHead><TableHead>工地主任</TableHead>
                    <TableHead>人数</TableHead><TableHead>分配时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipTeams.map((st) => (
                    <TableRow key={st.id}>
                      <TableCell className="font-medium">{st.teamName}</TableCell>
                      <TableCell>{st.leaderName || "--"}</TableCell>
                      <TableCell>{st.memberCount}人</TableCell>
                      <TableCell>{formatDate(st.assignedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
