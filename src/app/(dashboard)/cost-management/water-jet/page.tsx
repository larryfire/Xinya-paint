"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FilterableTableHead, type FilterOption } from "@/components/ui/filterable-table-head"
import { formatCurrency, formatDate } from "@/lib/utils"
import { WATER_JET_PROJECTS, DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { Plus, Search, Loader2 } from "lucide-react"
import type { WaterJetCostInfo, ShipInfo, TeamInfo } from "@/types"

export default function WaterJetCostPage() {
  const currentYear = new Date().getFullYear()

  const [costs, setCosts] = useState<WaterJetCostInfo[]>([])
  const [ships, setShips] = useState<ShipInfo[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [year, setYear] = useState(currentYear)
  const [shipId, setShipId] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)

  // 列筛选状态
  const [filterProject, setFilterProject] = useState("")
  const [filterTeamId, setFilterTeamId] = useState("")
  const [filterRepairNumber, setFilterRepairNumber] = useState("")

  // 表单状态
  const [form, setForm] = useState({
    repairNumber: "", shipId: "", dockEntryTime: "",
    project: "", teamId: "", settlementCost: "", constructionCost: "", remarks: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchCosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(DEFAULT_PAGE_SIZE) })
      if (year) params.set("year", String(year))
      if (search) params.set("search", search)
      if (shipId) params.set("shipId", shipId)
      if (filterProject) params.set("project", filterProject)
      if (filterTeamId) params.set("teamId", filterTeamId)
      if (filterRepairNumber) params.set("repairNumber", filterRepairNumber)
      const res = await fetch(`/api/costs/water-jet?${params}`)
      const data = await res.json()
      if (data.success) {
        setCosts(data.data.items)
        setTotalPages(data.data.pagination.totalPages)
      }
    } finally { setLoading(false) }
  }, [page, search, year, shipId, filterProject, filterTeamId, filterRepairNumber])

  const fetchOptions = useCallback(async () => {
    try {
      const [shipsRes, teamsRes] = await Promise.all([
        fetch("/api/ships?pageSize=100"),
        fetch("/api/teams?pageSize=100"),
      ])
      const [shipsData, teamsData] = await Promise.all([
        shipsRes.json(), teamsRes.json(),
      ])
      if (shipsData.success) setShips(shipsData.data.items)
      if (teamsData.success) setTeams(teamsData.data.items)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchCosts(); fetchOptions() }, [fetchCosts, fetchOptions])

  // 筛选选项
  const shipOptions: FilterOption[] = useMemo(() => ships.map((s) => ({ value: String(s.id), label: s.name })), [ships])
  const projectOptions: FilterOption[] = useMemo(() => WATER_JET_PROJECTS.map((p) => ({ value: p, label: p })), [])
  const teamOptions: FilterOption[] = useMemo(() => teams.map((t) => ({ value: String(t.id), label: t.name })), [teams])
  const repairNumberOptions: FilterOption[] = useMemo(() => {
    const seen = new Set<string>()
    return costs
      .map((c) => c.repairNumber)
      .filter((r): r is string => !!r && !seen.has(r) && (seen.add(r), true))
      .map((r) => ({ value: r, label: r }))
  }, [costs])

  const handleSubmit = async () => {
    if (!form.shipId || !form.dockEntryTime || !form.project || !form.teamId || !form.settlementCost || !form.constructionCost) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/costs/water-jet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairNumber: form.repairNumber || undefined,
          shipId: Number(form.shipId),
          dockEntryTime: form.dockEntryTime,
          project: form.project,
          teamId: Number(form.teamId),
          settlementCost: Number(form.settlementCost),
          constructionCost: Number(form.constructionCost),
          remarks: form.remarks || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDialogOpen(false)
        setForm({ repairNumber: "", shipId: "", dockEntryTime: "", project: "", teamId: "", settlementCost: "", constructionCost: "", remarks: "" })
        fetchCosts()
      }
    } finally { setSubmitting(false) }
  }

  /** 盈亏分析文案 */
  const getProfitLossAnalysis = (profitLoss: number) => {
    if (profitLoss > 0) return "盈利"
    if (profitLoss < 0) return `亏损${formatCurrency(Math.abs(profitLoss))}元`
    return "持平"
  }

  /** 盈亏Badge颜色 */
  const getProfitLossVariant = (profitLoss: number) => {
    if (profitLoss > 0) return "default"
    if (profitLoss < 0) return "destructive"
    return "secondary" as const
  }

  /** 年份选项（近10年） */
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">单船水刀盈亏</h1>
          <p className="text-sm text-slate-500">管理船舶水刀除锈成本与盈亏分析</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button><Plus className="mr-2 h-4 w-4" />新增</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>新增水刀成本记录</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>修理编号</Label>
                <Input value={form.repairNumber} onChange={(e) => setForm({ ...form, repairNumber: e.target.value })} placeholder="请输入修理编号" />
              </div>
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
                <Label>进坞时间</Label>
                <Input type="date" value={form.dockEntryTime} onChange={(e) => setForm({ ...form, dockEntryTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>水刀工程</Label>
                <Select value={form.project} onValueChange={(v) => setForm({ ...form, project: v })}>
                  <SelectTrigger><SelectValue placeholder="选择水刀工程" /></SelectTrigger>
                  <SelectContent>
                    {WATER_JET_PROJECTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>施工队伍</Label>
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
            <div className="w-32">
              <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); setPage(1) }}>
                <SelectTrigger><SelectValue placeholder="年份" /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="搜索修理编号/船舶名称..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
            </div>
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
                    <FilterableTableHead title="修理编号" options={repairNumberOptions} value={filterRepairNumber} onChange={(v) => { setFilterRepairNumber(v); setPage(1) }} />
                    <TableHead>时间</TableHead>
                    <FilterableTableHead title="船名" options={shipOptions} value={shipId} onChange={(v) => { setShipId(v); setPage(1) }} />
                    <TableHead>船舶尺寸</TableHead>
                    <FilterableTableHead title="水刀工程" options={projectOptions} value={filterProject} onChange={(v) => { setFilterProject(v); setPage(1) }} />
                    <FilterableTableHead title="施工队伍" options={teamOptions} value={filterTeamId} onChange={(v) => { setFilterTeamId(v); setPage(1) }} />
                    <TableHead className="text-right">结算成本</TableHead>
                    <TableHead className="text-right">施工成本</TableHead>
                    <TableHead className="text-right">单船盈亏</TableHead>
                    <TableHead className="text-right">盈亏分析</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center text-slate-400">暂无数据</TableCell></TableRow>
                  ) : costs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.repairNumber || "-"}</TableCell>
                      <TableCell>{formatDate(c.dockEntryTime)}</TableCell>
                      <TableCell>{c.shipName}</TableCell>
                      <TableCell>{c.shipLength}×{c.shipWidth}</TableCell>
                      <TableCell>{c.project}</TableCell>
                      <TableCell>{c.teamName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.settlementCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.constructionCost)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getProfitLossVariant(c.profitLoss!)}>
                          {formatCurrency(c.profitLoss!)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={c.profitLoss! > 0 ? "text-green-600" : c.profitLoss! < 0 ? "text-red-600" : "text-slate-500"}>
                          {getProfitLossAnalysis(c.profitLoss!)}
                        </span>
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
