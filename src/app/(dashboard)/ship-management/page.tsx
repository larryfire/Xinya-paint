"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"
import { SHIP_STATUS_MAP } from "@/lib/constants"
import { Plus, Loader2, Users, Ship as ShipIcon } from "lucide-react"
import type { ShipInfo, TeamInfo } from "@/types"

export default function ShipManagementPage() {
  const [ships, setShips] = useState<ShipInfo[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [selectedShip, setSelectedShip] = useState<ShipInfo | null>(null)
  const [shipTeams, setShipTeams] = useState<{ id: number; teamId: number; teamName: string; leaderName: string; memberCount: number; assignedAt: string }[]>([])

  const [form, setForm] = useState({ name: "", shipType: "", length: "", width: "", height: "", status: "at_sea" })
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
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDialogOpen(false)
        setForm({ name: "", shipType: "", length: "", width: "", height: "", status: "at_sea" })
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
        viewShipTeams(selectedShip)
      } else {
        alert(data.error?.message || "分配失败")
      }
    } finally { setSubmitting(false) }
  }

  const viewShipTeams = async (ship: ShipInfo) => {
    setSelectedShip(ship)
    try {
      const res = await fetch(`/api/ships/${ship.id}`)
      const data = await res.json()
      if (data.success) {
        setShipTeams(data.data.teams)
        setTeamDialogOpen(true)
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">单船管理</h1>
          <p className="text-sm text-slate-500">管理船舶信息与施工队伍分配</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger >
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
                <Label>状态</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="docked">坞内</SelectItem>
                    <SelectItem value="at_berth">靠泊</SelectItem>
                    <SelectItem value="at_sea">在航</SelectItem>
                    <SelectItem value="maintenance">维修</SelectItem>
                  </SelectContent>
                </Select>
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
                  <Badge style={{ backgroundColor: statusInfo.color, color: "white" }}>
                    {statusInfo.label}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">
                  尺寸: {String(ship.length)}×{String(ship.width)}×{String(ship.height)}m
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => viewShipTeams(ship)}>
                    <Users className="mr-1 h-3 w-3" />施工队伍
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Team assignment dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedShip?.name} - 施工队伍</DialogTitle>
          </DialogHeader>
          <div className="flex items-end gap-3 py-2">
            <div className="flex-1 space-y-2">
              <Label>分配施工队伍</Label>
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
          <div className="mt-2">
            <h4 className="font-medium mb-2">已分配队伍</h4>
            {shipTeams.length === 0 ? (
              <p className="text-sm text-slate-400">暂无施工队伍</p>
            ) : (
              <Table>
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
