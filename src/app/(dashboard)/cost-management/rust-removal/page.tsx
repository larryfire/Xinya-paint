"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FilterableTableHead, type FilterOption } from "@/components/ui/filterable-table-head"
import { formatCurrency } from "@/lib/utils"
import { Plus, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import type { RustRemovalCostInfo, ShipInfo, TeamInfo } from "@/types"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"

export default function RustRemovalCostPage() {
  const [costs, setCosts] = useState<RustRemovalCostInfo[]>([])
  const [ships, setShips] = useState<ShipInfo[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [year, setYear] = useState(() => new Date().getFullYear())

  // 列筛选状态
  const [filterShipId, setFilterShipId] = useState("")
  const [filterTeamId, setFilterTeamId] = useState("")
  const [filterRepairNumber, setFilterRepairNumber] = useState("")
  const [filterArea, setFilterArea] = useState("")
  const [filterProjectName, setFilterProjectName] = useState("")

  const [form, setForm] = useState({
    repairNumber: "", shipId: "", area: "", projectName: "",
    teamId: "", manHours: "", hourlyRate: "", remarks: "",
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
      if (filterRepairNumber) params.set("repairNumber", filterRepairNumber)
      if (filterArea) params.set("area", filterArea)
      if (filterProjectName) params.set("projectName", filterProjectName)
      const res = await fetch(`/api/costs/rust-removal?${params}`)
      const data = await res.json()
      if (data.success) {
        setCosts(data.data.items)
        setTotalPages(data.data.pagination.totalPages)
        setTotal(data.data.pagination.total)
      }
    } finally { setLoading(false) }
  }, [page, search, year, filterShipId, filterTeamId, filterRepairNumber, filterArea, filterProjectName])

  useEffect(() => {
    fetchCosts()
    fetch("/api/ships?pageSize=100").then(r => r.json()).then(d => d.success && setShips(d.data.items)).catch(() => {})
    fetch("/api/teams?pageSize=100").then(r => r.json()).then(d => d.success && setTeams(d.data.items)).catch(() => {})
  }, [fetchCosts])

  // 筛选选项
  const shipOptions: FilterOption[] = useMemo(() => ships.map((s) => ({ value: String(s.id), label: s.name })), [ships])
  const teamOptions: FilterOption[] = useMemo(() => teams.map((t) => ({ value: String(t.id), label: t.name })), [teams])
  const repairNumberOptions: FilterOption[] = useMemo(() => {
    const seen = new Set<string>()
    return costs
      .map((c) => c.repairNumber)
      .filter((r): r is string => !!r && !seen.has(r) && (seen.add(r), true))
      .map((r) => ({ value: r, label: r }))
  }, [costs])
  const areaOptions: FilterOption[] = useMemo(() => {
    const seen = new Set<string>()
    return costs
      .map((c) => c.area)
      .filter((a): a is string => !!a && !seen.has(a) && (seen.add(a), true))
      .map((a) => ({ value: a, label: a }))
  }, [costs])
  const projectNameOptions: FilterOption[] = useMemo(() => {
    const seen = new Set<string>()
    return costs
      .map((c) => c.projectName)
      .filter((p): p is string => !!p && !seen.has(p) && (seen.add(p), true))
      .map((p) => ({ value: p, label: p }))
  }, [costs])

  const handleSubmit = async () => {
    if (!form.shipId || !form.area || !form.projectName || !form.manHours || !form.hourlyRate) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/costs/rust-removal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairNumber: form.repairNumber || undefined,
          shipId: Number(form.shipId),
          area: form.area, projectName: form.projectName,
          teamId: form.teamId ? Number(form.teamId) : undefined,
          manHours: Number(form.manHours), hourlyRate: Number(form.hourlyRate),
          remarks: form.remarks || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDialogOpen(false)
        setForm({ repairNumber: "", shipId: "", area: "", projectName: "", teamId: "", manHours: "", hourlyRate: "", remarks: "" })
        fetchCosts()
      }
    } finally { setSubmitting(false) }
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">敲铲项目工时</h1>
          <p className="text-sm text-slate-500">管理敲铲除锈工时成本与工程项目</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />新增记录</Button>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>新增敲铲成本记录</DialogTitle></DialogHeader>
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
                <Label>敲铲区域</Label>
                <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="如：船首外板" />
              </div>
              <div className="space-y-2">
                <Label>工程项目</Label>
                <Input value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} placeholder="如：高压水除锈" />
              </div>
              <div className="space-y-2">
                <Label>施工队伍 (可选)</Label>
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
        <CardContent className="pt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="搜索修理编号/船舶名称..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
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
                    <FilterableTableHead title="修理编号" options={repairNumberOptions} value={filterRepairNumber} onChange={(v) => { setFilterRepairNumber(v); setPage(1) }} />
                    <FilterableTableHead title="船名" options={shipOptions} value={filterShipId} onChange={(v) => { setFilterShipId(v); setPage(1) }} />
                    <TableHead>尺寸(m)</TableHead>
                    <FilterableTableHead title="敲铲区域" options={areaOptions} value={filterArea} onChange={(v) => { setFilterArea(v); setPage(1) }} />
                    <FilterableTableHead title="工程项目" options={projectNameOptions} value={filterProjectName} onChange={(v) => { setFilterProjectName(v); setPage(1) }} />
                    <FilterableTableHead title="施工队伍" options={teamOptions} value={filterTeamId} onChange={(v) => { setFilterTeamId(v); setPage(1) }} />
                    <TableHead className="text-right">工时(h)</TableHead><TableHead className="text-right">单价</TableHead>
                    <TableHead className="text-right">工时花费</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-slate-400">暂无数据</TableCell></TableRow>
                  ) : costs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs text-slate-500">{c.repairNumber || "--"}</TableCell>
                      <TableCell className="font-medium">{c.shipName}</TableCell>
                      <TableCell>{c.shipLength}×{c.shipWidth}</TableCell>
                      <TableCell>{c.area}</TableCell>
                      <TableCell>{c.projectName}</TableCell>
                      <TableCell>{c.teamName || "--"}</TableCell>
                      <TableCell className="text-right">{c.manHours}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.hourlyRate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.totalCost ?? 0)}</TableCell>
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
