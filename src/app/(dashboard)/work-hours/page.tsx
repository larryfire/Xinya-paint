"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { hasPermission } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FilterableTableHead, type FilterOption } from "@/components/ui/filterable-table-head"
import { WORK_HOUR_CRAFT_TYPES } from "@/lib/constants"
import { formatDate, calcWorkDays } from "@/lib/utils"
import { Plus, Search, Loader2, ChevronLeft, ChevronRight, Download, Pencil, Trash2 } from "lucide-react"
import type { WorkHourRecordInfo, ShipInfo, TeamInfo } from "@/types"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"

interface FormEntry {
  craftType: string
  workerCount: string
  timeSlots: { startTime: string; endTime: string }[]
}

export default function WorkHoursPage() {
  const { user } = useAuthStore()
  const canWrite = user ? hasPermission(user.role, "work_hour:write") : false
  const canExport = user ? hasPermission(user.role, "work_hour:export") : false
  const isLeader = user?.role === "leader"

  const [records, setRecords] = useState<WorkHourRecordInfo[]>([])
  const [ships, setShips] = useState<ShipInfo[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [filterShipId, setFilterShipId] = useState("")
  const [filterTeamId, setFilterTeamId] = useState("")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  const today = useMemo(() => new Date().toISOString().split("T")[0], [])
  const [form, setForm] = useState({
    recordDate: today,
    shipId: "",
    teamId: "",
    note: "",
    entries: [{ craftType: "大工", workerCount: "1", timeSlots: [{ startTime: "08:00", endTime: "17:00" }] }] as FormEntry[],
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(DEFAULT_PAGE_SIZE) })
        if (search) params.set("search", search)
        if (filterShipId) params.set("shipId", filterShipId)
        if (filterTeamId) params.set("teamId", filterTeamId)
        if (filterDateFrom) params.set("recordDateFrom", filterDateFrom)
        if (filterDateTo) params.set("recordDateTo", filterDateTo)

        const res = await fetch(`/api/work-hours?${params}`)
        const data = await res.json()
        if (!cancelled && data.success) {
          setRecords(data.data.items)
          setTotalPages(data.data.pagination.totalPages)
          setTotal(data.data.pagination.total)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    fetch("/api/ships?pageSize=100")
      .then((r) => r.json())
      .then((d) => !cancelled && d.success && setShips(d.data.items))
      .catch(() => {})
    fetch("/api/teams?pageSize=100")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success) return
        const items: TeamInfo[] = d.data.items
        setTeams(items)
        // leader 默认锁定为本队伍
        if (isLeader && user?.teamId) {
          setFilterTeamId(String(user.teamId))
          setForm((prev) => ({ ...prev, teamId: String(user.teamId) }))
        }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [page, search, filterShipId, filterTeamId, filterDateFrom, filterDateTo, isLeader, user?.teamId, refreshKey])

  const shipOptions: FilterOption[] = useMemo(() => ships.map((s) => ({ value: String(s.id), label: s.name })), [ships])
  const teamOptions: FilterOption[] = useMemo(() => teams.map((t) => ({ value: String(t.id), label: t.name })), [teams])

  const resetForm = useCallback(() => {
    setForm({
      recordDate: today,
      shipId: "",
      teamId: isLeader && user?.teamId ? String(user.teamId) : "",
      note: "",
      entries: [{ craftType: "大工", workerCount: "1", timeSlots: [{ startTime: "08:00", endTime: "17:00" }] }],
    })
  }, [today, isLeader, user])

  const handleOpenCreate = () => {
    setEditingId(null)
    resetForm()
    setDialogOpen(true)
  }

  const handleOpenEdit = async (record: WorkHourRecordInfo) => {
    setEditingId(record.id)
    const res = await fetch(`/api/work-hours/${record.id}`)
    const data = await res.json()
    if (!data.success) return

    setForm({
      recordDate: data.data.recordDate,
      shipId: String(data.data.shipId),
      teamId: String(data.data.teamId),
      note: data.data.note || "",
      entries: data.data.entries.map((e: WorkHourRecordInfo["entries"][number]) => ({
        craftType: e.craftType,
        workerCount: String(e.workerCount),
        timeSlots: e.timeSlots.map((slot) => ({
          startTime: new Date(slot.startTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
          endTime: new Date(slot.endTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
        })),
      })),
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.recordDate || !form.shipId || !form.teamId || form.entries.length === 0) return

    // 校验每个工种和时间段
    for (const entry of form.entries) {
      if (!entry.craftType || !entry.workerCount || Number(entry.workerCount) <= 0) return
      if (entry.timeSlots.length === 0) return
      for (const slot of entry.timeSlots) {
        if (!slot.startTime || !slot.endTime || slot.startTime >= slot.endTime) return
      }
    }

    setSubmitting(true)
    try {
      const payload = {
        recordDate: form.recordDate,
        shipId: Number(form.shipId),
        teamId: Number(form.teamId),
        note: form.note,
        entries: form.entries.map((entry) => ({
          craftType: entry.craftType,
          workerCount: Number(entry.workerCount),
          timeSlots: entry.timeSlots.map((slot) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        })),
      }

      const url = editingId ? `/api/work-hours/${editingId}` : "/api/work-hours"
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        setDialogOpen(false)
        resetForm()
        setRefreshKey((k) => k + 1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除这条工时记录吗？")) return
    const res = await fetch(`/api/work-hours/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) setRefreshKey((k) => k + 1)
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    if (filterShipId) params.set("shipId", filterShipId)
    if (filterTeamId) params.set("teamId", filterTeamId)
    if (filterDateFrom) params.set("recordDateFrom", filterDateFrom)
    if (filterDateTo) params.set("recordDateTo", filterDateTo)
    window.open(`/api/work-hours/export?${params}`, "_blank")
  }

  const updateEntry = (index: number, key: keyof FormEntry, value: string) => {
    setForm((prev) => {
      const entries = [...prev.entries]
      entries[index] = { ...entries[index], [key]: value }
      return { ...prev, entries }
    })
  }

  const updateTimeSlot = (entryIndex: number, slotIndex: number, key: "startTime" | "endTime", value: string) => {
    setForm((prev) => {
      const entries = [...prev.entries]
      const slots = [...entries[entryIndex].timeSlots]
      slots[slotIndex] = { ...slots[slotIndex], [key]: value }
      entries[entryIndex] = { ...entries[entryIndex], timeSlots: slots }
      return { ...prev, entries }
    })
  }

  const addTimeSlot = (entryIndex: number) => {
    setForm((prev) => {
      const entries = [...prev.entries]
      const slots = [...entries[entryIndex].timeSlots, { startTime: "08:00", endTime: "17:00" }]
      entries[entryIndex] = { ...entries[entryIndex], timeSlots: slots }
      return { ...prev, entries }
    })
  }

  const removeTimeSlot = (entryIndex: number, slotIndex: number) => {
    setForm((prev) => {
      const entries = [...prev.entries]
      const slots = entries[entryIndex].timeSlots.filter((_, i) => i !== slotIndex)
      entries[entryIndex] = { ...entries[entryIndex], timeSlots: slots }
      return { ...prev, entries }
    })
  }

  const addEntry = () => {
    setForm((prev) => ({
      ...prev,
      entries: [...prev.entries, { craftType: "大工", workerCount: "1", timeSlots: [{ startTime: "08:00", endTime: "17:00" }] }],
    }))
  }

  const removeEntry = (index: number) => {
    setForm((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index),
    }))
  }

  const calcEntrySummary = (entry: FormEntry) => {
    let totalHours = 0
    for (const slot of entry.timeSlots) {
      if (slot.startTime && slot.endTime && slot.endTime > slot.startTime) {
        const [sh, sm] = slot.startTime.split(":").map(Number)
        const [eh, em] = slot.endTime.split(":").map(Number)
        totalHours += (eh * 60 + em - sh * 60 - sm) / 60
      }
    }
    const count = Number(entry.workerCount) || 0
    const workDays = calcWorkDays(totalHours * count)
    return { totalHours: Math.round(totalHours * 100) / 100, workDays }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">每日工时记录表</h1>
          <p className="text-sm text-slate-500">按日期、船名、施工队记录工种工时与计工数</p>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />导出 Excel
            </Button>
          )}
          {canWrite && (
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />新增记录
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="搜索船名/队伍/工种..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Input type="date" placeholder="开始日期" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1) }} className="w-36" />
            <Input type="date" placeholder="结束日期" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1) }} className="w-36" />
            <FilterableTableHead
              title="船名"
              options={shipOptions}
              value={filterShipId}
              onChange={(v) => { setFilterShipId(v); setPage(1) }}
            />
            {!isLeader && (
              <FilterableTableHead
                title="施工队伍"
                options={teamOptions}
                value={filterTeamId}
                onChange={(v) => { setFilterTeamId(v); setPage(1) }}
              />
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>船名</TableHead>
                    <TableHead>施工队伍</TableHead>
                    <TableHead className="text-right">工种数</TableHead>
                    <TableHead className="text-right">总人数</TableHead>
                    <TableHead className="text-right">总工数</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-slate-400">暂无数据</TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.recordDate)}</TableCell>
                        <TableCell className="font-medium">{record.shipName}</TableCell>
                        <TableCell>{record.teamName}</TableCell>
                        <TableCell className="text-right">{record.entries.length}</TableCell>
                        <TableCell className="text-right">{record.totalWorkers}</TableCell>
                        <TableCell className="text-right">{record.totalWorkDays}</TableCell>
                        <TableCell className="text-slate-500 max-w-[200px] truncate">{record.note || "--"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(record)} disabled={!canWrite}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)} disabled={!canWrite}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-slate-500">共 {total} 条</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="flex items-center text-sm px-2">第 {page}/{totalPages} 页</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑工时记录" : "新增工时记录"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>日期 *</Label>
                <Input type="date" value={form.recordDate} onChange={(e) => setForm({ ...form, recordDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>船名 *</Label>
                <Select value={form.shipId} onValueChange={(v) => setForm({ ...form, shipId: v })} disabled={loading}>
                  <SelectTrigger><SelectValue placeholder="选择船舶" /></SelectTrigger>
                  <SelectContent>
                    {ships.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>施工队伍 *</Label>
                <Select value={form.teamId} onValueChange={(v) => setForm({ ...form, teamId: v })} disabled={isLeader}>
                  <SelectTrigger><SelectValue placeholder="选择队伍" /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>备注</Label>
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="可选" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>工种明细</Label>
                <Button type="button" variant="outline" size="sm" onClick={addEntry}>
                  <Plus className="mr-1 h-3 w-3" />添加工种
                </Button>
              </div>

              {form.entries.map((entry, entryIndex) => {
                const { totalHours, workDays } = calcEntrySummary(entry)
                return (
                  <Card key={entryIndex}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-4 space-y-2">
                          <Label className="text-xs">工种</Label>
                          <Select
                            value={entry.craftType}
                            onValueChange={(v) => updateEntry(entryIndex, "craftType", v)}
                          >
                            <SelectTrigger><SelectValue placeholder="选择或输入工种" /></SelectTrigger>
                            <SelectContent>
                              {WORK_HOUR_CRAFT_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={entry.craftType}
                            onChange={(e) => updateEntry(entryIndex, "craftType", e.target.value)}
                            placeholder="可手动输入"
                            className="mt-2"
                          />
                        </div>
                        <div className="col-span-3 space-y-2">
                          <Label className="text-xs">人数</Label>
                          <Input
                            type="number"
                            min={1}
                            value={entry.workerCount}
                            onChange={(e) => updateEntry(entryIndex, "workerCount", e.target.value)}
                          />
                        </div>
                        <div className="col-span-4 text-sm text-slate-500">
                          合计工时：<span className="font-medium text-slate-700">{totalHours}</span> h，
                          计工数：<span className="font-medium text-slate-700">{workDays}</span> 工
                        </div>
                        <div className="col-span-1">
                          {form.entries.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeEntry(entryIndex)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">时间段</Label>
                          <Button type="button" variant="ghost" size="sm" onClick={() => addTimeSlot(entryIndex)}>
                            <Plus className="mr-1 h-3 w-3" />添加时段
                          </Button>
                        </div>
                        {entry.timeSlots.map((slot, slotIndex) => (
                          <div key={slotIndex} className="grid grid-cols-12 gap-3 items-center">
                            <Input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateTimeSlot(entryIndex, slotIndex, "startTime", e.target.value)}
                              className="col-span-4"
                            />
                            <span className="col-span-1 text-center">-</span>
                            <Input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateTimeSlot(entryIndex, slotIndex, "endTime", e.target.value)}
                              className="col-span-4"
                            />
                            <div className="col-span-2 text-sm text-slate-500">
                              {slot.startTime && slot.endTime && slot.endTime > slot.startTime ? (
                                <>
                                  {(() => {
                                    const [sh, sm] = slot.startTime.split(":").map(Number)
                                    const [eh, em] = slot.endTime.split(":").map(Number)
                                    const h = (eh * 60 + em - sh * 60 - sm) / 60
                                    return <span>{h.toFixed(1)} h</span>
                                  })()}
                                </>
                              ) : (
                                <span className="text-red-400">无效</span>
                              )}
                            </div>
                            <div className="col-span-1">
                              {entry.timeSlots.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeTimeSlot(entryIndex, slotIndex)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingId ? "保存修改" : "提交"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
