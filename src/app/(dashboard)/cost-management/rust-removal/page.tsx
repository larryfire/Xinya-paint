"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, calcTotalCost } from "@/lib/utils"
import { Plus, Search, Loader2 } from "lucide-react"
import type { RustRemovalCostInfo, ShipInfo, TeamInfo } from "@/types"

export default function RustRemovalCostPage() {
  const [costs, setCosts] = useState<RustRemovalCostInfo[]>([])
  const [ships, setShips] = useState<ShipInfo[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [form, setForm] = useState({
    shipId: "", area: "", projectName: "", teamId: "",
    manHours: "", hourlyRate: "", remarks: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchCosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" })
      if (search) params.set("search", search)
      const res = await fetch(`/api/costs/rust-removal?${params}`)
      const data = await res.json()
      if (data.success) {
        setCosts(data.data.items)
        setTotalPages(data.data.pagination.totalPages)
      }
    } finally { setLoading(false) }
  }, [page, search])

  useEffect(() => {
    fetchCosts()
    fetch("/api/ships?pageSize=100").then(r => r.json()).then(d => d.success && setShips(d.data.items)).catch(() => {})
    fetch("/api/teams?pageSize=100").then(r => r.json()).then(d => d.success && setTeams(d.data.items)).catch(() => {})
  }, [fetchCosts])

  const handleSubmit = async () => {
    if (!form.shipId || !form.area || !form.projectName || !form.manHours) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/costs/rust-removal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipId: Number(form.shipId), area: form.area, projectName: form.projectName,
          teamId: form.teamId ? Number(form.teamId) : null,
          manHours: Number(form.manHours), hourlyRate: Number(form.hourlyRate || 0),
          remarks: form.remarks || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDialogOpen(false)
        setForm({ shipId: "", area: "", projectName: "", teamId: "", manHours: "", hourlyRate: "", remarks: "" })
        fetchCosts()
      }
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">敲铲成本管理</h1>
          <p className="text-sm text-slate-500">管理敲铲除锈工时成本与工程项目</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger >
            <Button><Plus className="mr-2 h-4 w-4" />新增记录</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>新增敲铲成本记录</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>船舶</Label>
                <Select value={form.shipId} onValueChange={(v) => setForm({ ...form, shipId: v })}>
                  <SelectTrigger><SelectValue placeholder="选择船舶" /></SelectTrigger>
                  <SelectContent>{ships.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>敲铲区域</Label>
                <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="如：船首外板" />
              </div>
              <div className="space-y-2">
                <Label>工程项目</Label>
                <Input value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} placeholder="如：高压水除锈" />
              </div>
              <div className="space-y-2">
                <Label>施工队伍 (选填)</Label>
                <Select value={form.teamId} onValueChange={(v) => setForm({ ...form, teamId: v })}>
                  <SelectTrigger><SelectValue placeholder="选择队伍" /></SelectTrigger>
                  <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>工时 (小时)</Label>
                <Input type="number" value={form.manHours} onChange={(e) => setForm({ ...form, manHours: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>工时单价 (元/小时)</Label>
                <Input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>备注</Label>
                <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}提交
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="搜索..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>船名</TableHead><TableHead>尺寸(m)</TableHead>
                  <TableHead>区域</TableHead><TableHead>工程项目</TableHead>
                  <TableHead>队伍</TableHead>
                  <TableHead className="text-right">工时(h)</TableHead><TableHead className="text-right">单价</TableHead>
                  <TableHead className="text-right">总花费</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-slate-400">暂无数据</TableCell></TableRow>
                ) : costs.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.shipName}</TableCell>
                    <TableCell>{c.shipLength}×{c.shipWidth}</TableCell>
                    <TableCell>{c.area}</TableCell>
                    <TableCell>{c.projectName}</TableCell>
                    <TableCell>{c.teamName || "--"}</TableCell>
                    <TableCell className="text-right">{c.manHours}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.hourlyRate)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(c.totalCost!)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
