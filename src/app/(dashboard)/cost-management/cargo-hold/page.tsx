"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FilterableTableHead, type FilterOption } from "@/components/ui/filterable-table-head"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, Search, Loader2, Upload, X, ChevronLeft, ChevronRight } from "lucide-react"
import type { CargoHoldCostInfo, ShipInfo, UserInfo, TeamInfo } from "@/types"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"

export default function CargoHoldCostPage() {
  const [costs, setCosts] = useState<CargoHoldCostInfo[]>([])
  const [ships, setShips] = useState<ShipInfo[]>([])
  const [supervisors, setSupervisors] = useState<UserInfo[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [year, setYear] = useState(() => new Date().getFullYear())

  // 列筛选状态
  const [filterShipId, setFilterShipId] = useState("")
  const [filterTeamId, setFilterTeamId] = useState("")

  const [form, setForm] = useState({
    repairNumber: "", shipId: "", supervisorId: "", cargoRatio: "", originalRatio: "",
    teamId: "", settlementCost: "", constructionCost: "", remarks: "", originalPhoto: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchCosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page), pageSize: String(DEFAULT_PAGE_SIZE), year: String(year),
      })
      if (search) params.set("search", search)
      if (filterShipId) params.set("shipId", filterShipId)
      if (filterTeamId) params.set("teamId", filterTeamId)
      const res = await fetch(`/api/costs/cargo-hold?${params}`)
      const data = await res.json()
      if (data.success) {
        setCosts(data.data.items)
        setTotalPages(data.data.pagination.totalPages)
        setTotal(data.data.pagination.total)
      }
    } finally { setLoading(false) }
  }, [page, search, year, filterShipId, filterTeamId])

  useEffect(() => {
    fetchCosts()
    fetch("/api/ships?pageSize=100").then(r => r.json()).then(d => d.success && setShips(d.data.items)).catch(() => {})
    fetch("/api/users?role=supervisor&pageSize=100").then(r => r.json()).then(d => d.success && setSupervisors(d.data.items)).catch(() => {})
    fetch("/api/teams?pageSize=100").then(r => r.json()).then(d => d.success && setTeams(d.data.items)).catch(() => {})
  }, [fetchCosts])

  // 筛选选项
  const shipOptions: FilterOption[] = useMemo(() => ships.map((s) => ({ value: String(s.id), label: s.name })), [ships])
  const teamOptions: FilterOption[] = useMemo(() => teams.map((t) => ({ value: String(t.id), label: t.name })), [teams])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.success) setForm({ ...form, originalPhoto: data.data.url })
    } finally { setUploading(false) }
  }

  const handleSubmit = async () => {
    if (!form.shipId || !form.supervisorId || !form.cargoRatio || !form.settlementCost || !form.constructionCost) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/costs/cargo-hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairNumber: form.repairNumber || undefined,
          shipId: Number(form.shipId), supervisorId: Number(form.supervisorId),
          cargoRatio: Number(form.cargoRatio), originalRatio: Number(form.originalRatio || 0),
          teamId: form.teamId ? Number(form.teamId) : undefined,
          originalPhoto: form.originalPhoto || undefined,
          settlementCost: Number(form.settlementCost), constructionCost: Number(form.constructionCost),
          remarks: form.remarks || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDialogOpen(false)
        setForm({ repairNumber: "", shipId: "", supervisorId: "", cargoRatio: "", originalRatio: "", teamId: "", settlementCost: "", constructionCost: "", remarks: "", originalPhoto: "" })
        fetchCosts()
      }
    } finally { setSubmitting(false) }
  }

  const getAnalysis = (pl: number) => pl > 0 ? "盈利" : pl < 0 ? `亏损${formatCurrency(Math.abs(pl))}` : "持平"

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">单船货舱盈亏</h1>
          <p className="text-sm text-slate-500">管理货舱涂装成本、比例对比与盈亏分析</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />新增记录</Button>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>新增货舱成本记录</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>修理编号</Label>
                <Input value={form.repairNumber} onChange={(e) => setForm({ ...form, repairNumber: e.target.value })} placeholder="如 REP-2026-001" />
              </div>
              <div className="space-y-2">
                <Label>船舶</Label>
                <Select value={form.shipId} onValueChange={(v) => setForm({ ...form, shipId: v })}>
                  <SelectTrigger><SelectValue placeholder="选择船舶" /></SelectTrigger>
                  <SelectContent>{ships.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>涂装主管</Label>
                <Select value={form.supervisorId} onValueChange={(v) => setForm({ ...form, supervisorId: v })}>
                  <SelectTrigger><SelectValue placeholder="选择主管" /></SelectTrigger>
                  <SelectContent>{supervisors.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.realName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>施工队伍</Label>
                <Select value={form.teamId} onValueChange={(v) => setForm({ ...form, teamId: v })}>
                  <SelectTrigger><SelectValue placeholder="选择队伍(可选)" /></SelectTrigger>
                  <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>货舱比例 (%)</Label>
                <Input type="number" value={form.cargoRatio} onChange={(e) => setForm({ ...form, cargoRatio: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>原始比例 (%)</Label>
                <Input type="number" value={form.originalRatio} onChange={(e) => setForm({ ...form, originalRatio: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>原始比例照片</Label>
                <Button type="button" variant="outline" disabled={uploading}>
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "上传中..." : "上传照片"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  </label>
                </Button>
                {form.originalPhoto && (
                  <div className="inline-flex items-center gap-1 ml-2 text-sm text-green-600">
                    <span>已上传</span>
                    <X className="h-4 w-4 cursor-pointer text-red-500" onClick={() => setForm({ ...form, originalPhoto: "" })} />
                  </div>
                )}
                {form.originalPhoto && <img src={form.originalPhoto} alt="原始比例" className="mt-2 max-h-32 rounded border" />}
              </div>
              <div className="space-y-2">
                <Label>结算成本 (元)</Label>
                <Input type="number" value={form.settlementCost} onChange={(e) => setForm({ ...form, settlementCost: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>施工成本 (元)</Label>
                <Input type="number" value={form.constructionCost} onChange={(e) => setForm({ ...form, constructionCost: e.target.value })} />
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
        <CardContent className="pt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="搜索船舶名称..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
            </div>
            <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); setPage(1) }}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>修理编号</TableHead>
                    <FilterableTableHead title="船名" options={shipOptions} value={filterShipId} onChange={(v) => { setFilterShipId(v); setPage(1) }} />
                    <TableHead>尺寸(m)</TableHead>
                    <TableHead className="text-right">货舱比例</TableHead><TableHead className="text-right">原始比例</TableHead>
                    <FilterableTableHead title="施工队伍" options={teamOptions} value={filterTeamId} onChange={(v) => { setFilterTeamId(v); setPage(1) }} />
                    <TableHead className="text-right">结算成本</TableHead><TableHead className="text-right">施工成本</TableHead>
                    <TableHead className="text-right">单船盈亏</TableHead><TableHead>盈亏分析</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center text-slate-400">暂无数据</TableCell></TableRow>
                  ) : costs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs text-slate-500">{c.repairNumber || "--"}</TableCell>
                      <TableCell className="font-medium">{c.shipName}</TableCell>
                      <TableCell>{c.shipLength}×{c.shipWidth}</TableCell>
                      <TableCell className="text-right">{c.cargoRatio}%</TableCell>
                      <TableCell className="text-right">{c.originalRatio}%</TableCell>
                      <TableCell>{c.teamName || "--"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.settlementCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.constructionCost)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={c.profitLoss! >= 0 ? "default" : "destructive"}>{formatCurrency(c.profitLoss!)}</Badge>
                      </TableCell>
                      <TableCell className={c.profitLoss! >= 0 ? "text-green-600" : "text-red-600"}>
                        {getAnalysis(c.profitLoss!)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-slate-500">共 {total} 条</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="flex items-center text-sm px-2">第 {page}/{totalPages} 页</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
