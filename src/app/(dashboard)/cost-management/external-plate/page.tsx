"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FilterableTableHead, type FilterOption } from "@/components/ui/filterable-table-head"
import { formatCurrency, formatDate } from "@/lib/utils"
import { EXTERNAL_PLATE_AREAS } from "@/lib/constants"
import { Plus, Search, Loader2 } from "lucide-react"
import type { ExternalPlateCostInfo, ShipInfo, TeamInfo, UserInfo } from "@/types"

export default function ExternalPlateCostPage() {
  const [costs, setCosts] = useState<ExternalPlateCostInfo[]>([])
  const [ships, setShips] = useState<ShipInfo[]>([])
  const [supervisors, setSupervisors] = useState<UserInfo[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [year, setYear] = useState(new Date().getFullYear())
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)

  // 列筛选状态
  const [filterShipId, setFilterShipId] = useState("")
  const [filterSupervisorId, setFilterSupervisorId] = useState("")
  const [filterArea, setFilterArea] = useState("")
  const [filterTeamId, setFilterTeamId] = useState("")

  // 表单状态
  const [form, setForm] = useState({
    shipId: "", repairNumber: "", supervisorId: "", dockEntryTime: "",
    area: "", teamId: "", settlementCost: "", constructionCost: "", remarks: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchCosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20", year: String(year) })
      if (search) params.set("search", search)
      if (filterShipId) params.set("shipId", filterShipId)
      if (filterSupervisorId) params.set("supervisorId", filterSupervisorId)
      if (filterArea) params.set("area", filterArea)
      if (filterTeamId) params.set("teamId", filterTeamId)
      const res = await fetch(`/api/costs/external-plate?${params}`)
      const data = await res.json()
      if (data.success) {
        setCosts(data.data.items)
        setTotalPages(data.data.pagination.totalPages)
      }
    } finally { setLoading(false) }
  }, [page, search, year, filterShipId, filterSupervisorId, filterArea, filterTeamId])

  const fetchOptions = useCallback(async () => {
    try {
      const [shipsRes, usersRes, teamsRes] = await Promise.all([
        fetch("/api/ships?pageSize=100"),
        fetch("/api/users?role=supervisor&pageSize=100"),
        fetch("/api/teams?pageSize=100"),
      ])
      const [shipsData, usersData, teamsData] = await Promise.all([
        shipsRes.json(), usersRes.json(), teamsRes.json(),
      ])
      if (shipsData.success) setShips(shipsData.data.items)
      if (usersData.success) setSupervisors(usersData.data.items)
      if (teamsData.success) setTeams(teamsData.data.items)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchCosts(); fetchOptions() }, [fetchCosts, fetchOptions])

  // 筛选选项
  const shipOptions: FilterOption[] = useMemo(() => ships.map((s) => ({ value: String(s.id), label: s.name })), [ships])
  const supervisorOptions: FilterOption[] = useMemo(() => supervisors.map((u) => ({ value: String(u.id), label: u.realName })), [supervisors])
  const areaOptions: FilterOption[] = useMemo(() => EXTERNAL_PLATE_AREAS.map((a) => ({ value: a, label: a })), [])
  const teamOptions: FilterOption[] = useMemo(() => teams.map((t) => ({ value: String(t.id), label: t.name })), [teams])

  const handleSubmit = async () => {
    if (!form.shipId || !form.supervisorId || !form.dockEntryTime || !form.area || !form.teamId || !form.settlementCost || !form.constructionCost) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/costs/external-plate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipId: Number(form.shipId), repairNumber: form.repairNumber || undefined,
          supervisorId: Number(form.supervisorId),
          dockEntryTime: form.dockEntryTime, area: form.area,
          teamId: Number(form.teamId), settlementCost: Number(form.settlementCost),
          constructionCost: Number(form.constructionCost), remarks: form.remarks || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDialogOpen(false)
        setForm({ shipId: "", repairNumber: "", supervisorId: "", dockEntryTime: "", area: "", teamId: "", settlementCost: "", constructionCost: "", remarks: "" })
        fetchCosts()
      }
    } finally { setSubmitting(false) }
  }

  // 盈亏分析文案
  const getProfitAnalysis = (c: ExternalPlateCostInfo) => {
    if (c.profitLoss == null || c.profitLoss === 0) return { text: "持平", className: "text-slate-500" }
    if (c.profitLoss > 0) return { text: "盈利", className: "text-green-600 font-medium" }
    return { text: `亏损${formatCurrency(Math.abs(c.profitLoss))}元`, className: "text-red-600 font-medium" }
  }

  // 年份可选范围：当前年份前后5年
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">单船外板盈亏</h1>
          <p className="text-sm text-slate-500">管理船舶外板涂装成本、结算与盈亏分析</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger >
            <Button><Plus className="mr-2 h-4 w-4" />新增记录</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>新增外板成本记录</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>船舶</Label>
                <Select value={form.shipId} onValueChange={(v) => setForm({ ...form, shipId: v })}>
                  <SelectTrigger><SelectValue placeholder="选择船舶" /></SelectTrigger>
                  <SelectContent>
                    {ships.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>修理编号</Label>
                <Input value={form.repairNumber} onChange={(e) => setForm({ ...form, repairNumber: e.target.value })} placeholder="请输入修理编号" />
              </div>
              <div className="space-y-2">
                <Label>涂装主管</Label>
                <Select value={form.supervisorId} onValueChange={(v) => setForm({ ...form, supervisorId: v })}>
                  <SelectTrigger><SelectValue placeholder="选择主管" /></SelectTrigger>
                  <SelectContent>
                    {supervisors.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.realName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>进坞时间</Label>
                <Input type="date" value={form.dockEntryTime} onChange={(e) => setForm({ ...form, dockEntryTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>外板区域</Label>
                <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}>
                  <SelectTrigger><SelectValue placeholder="选择区域" /></SelectTrigger>
                  <SelectContent>
                    {EXTERNAL_PLATE_AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>内协队伍</Label>
                <Select value={form.teamId} onValueChange={(v) => setForm({ ...form, teamId: v })}>
                  <SelectTrigger><SelectValue placeholder="选择队伍" /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
        <CardHeader className="pb-0">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="搜索修理编号/船舶名称..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); setPage(1) }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="年份" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
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
                    <FilterableTableHead title="主管" options={supervisorOptions} value={filterSupervisorId} onChange={(v) => { setFilterSupervisorId(v); setPage(1) }} />
                    <TableHead>进坞时间</TableHead>
                    <FilterableTableHead title="区域" options={areaOptions} value={filterArea} onChange={(v) => { setFilterArea(v); setPage(1) }} />
                    <FilterableTableHead title="队伍" options={teamOptions} value={filterTeamId} onChange={(v) => { setFilterTeamId(v); setPage(1) }} />
                    <TableHead className="text-right">结算成本</TableHead>
                    <TableHead className="text-right">施工成本</TableHead>
                    <TableHead className="text-right">盈亏分析</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="text-center text-slate-400">暂无数据</TableCell></TableRow>
                  ) : costs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm">{c.repairNumber ?? "-"}</TableCell>
                      <TableCell className="font-medium">{c.shipName}</TableCell>
                      <TableCell>{c.shipLength}×{c.shipWidth}</TableCell>
                      <TableCell>{c.supervisorName}</TableCell>
                      <TableCell>{formatDate(c.dockEntryTime)}</TableCell>
                      <TableCell>{c.area}</TableCell>
                      <TableCell>{c.teamName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.settlementCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.constructionCost)}</TableCell>
                      <TableCell className="text-right">
                        <span className={getProfitAnalysis(c).className}>{getProfitAnalysis(c).text}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                  <span className="flex items-center px-4 text-sm text-slate-500">第 {page}/{totalPages} 页</span>
                  <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
