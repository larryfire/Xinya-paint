"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import { PUNISHMENT_CATEGORIES } from "@/lib/constants"
import { Plus, Search, Loader2, ChevronsUpDown, Check } from "lucide-react"
import type { SafetyPunishmentInfo, TeamInfo, UserInfo } from "@/types"

export default function SafetyManagementPage() {
  const [punishments, setPunishments] = useState<SafetyPunishmentInfo[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTeamId, setSearchTeamId] = useState("")
  const [searchCategory, setSearchCategory] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [teamSelectOpen, setTeamSelectOpen] = useState(false)

  const [form, setForm] = useState({
    teamId: "", teamName: "", punishedPersonId: "", issuerId: "",
    punishmentTime: "", category: "normal", amount: "", reason: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchPunishments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" })
      if (searchTeamId) params.set("teamId", searchTeamId)
      if (searchCategory) params.set("category", searchCategory)
      const res = await fetch(`/api/safety/punishments?${params}`)
      const data = await res.json()
      if (data.success) {
        setPunishments(data.data.items)
        setTotalPages(data.data.pagination.totalPages)
      }
    } finally { setLoading(false) }
  }, [page, searchTeamId, searchCategory])

  useEffect(() => {
    fetchPunishments()
    fetch("/api/teams?pageSize=200").then(r => r.json()).then(d => d.success && setTeams(d.data.items)).catch(() => {})
    fetch("/api/users?pageSize=500").then(r => r.json()).then(d => d.success && setUsers(d.data.items)).catch(() => {})
  }, [fetchPunishments])

  const handleSubmit = async () => {
    if (!form.teamId || !form.issuerId || !form.punishmentTime || !form.amount || !form.reason) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/safety/punishments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: Number(form.teamId), punishedPersonId: form.punishedPersonId ? Number(form.punishedPersonId) : null,
          issuerId: Number(form.issuerId), punishmentTime: form.punishmentTime,
          category: form.category as "normal" | "high_voltage",
          amount: Number(form.amount), reason: form.reason,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDialogOpen(false)
        setForm({ teamId: "", teamName: "", punishedPersonId: "", issuerId: "", punishmentTime: "", category: "normal", amount: "", reason: "" })
        fetchPunishments()
      }
    } finally { setSubmitting(false) }
  }

  const selectedTeam = teams.find((t) => String(t.id) === searchTeamId)
  const selectedTeamMembers = users.filter((u) => u.teamId === Number(form.teamId) && u.isActive)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">安全管理</h1>
          <p className="text-sm text-slate-500">安全处罚记录管理与查询</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger >
            <Button variant="destructive"><Plus className="mr-2 h-4 w-4" />新增处罚</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>新增安全处罚记录</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-2">
                <Label>被处罚队伍</Label>
                <Popover>
                  <PopoverTrigger >
                    <Button variant="outline" className="w-full justify-between">
                      {form.teamName || "搜索选择队伍"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="搜索队伍..." />
                      <CommandList>
                        <CommandEmpty>未找到队伍</CommandEmpty>
                        <CommandGroup>
                          {teams.map((t) => (
                            <CommandItem key={t.id} onSelect={() => {
                              setForm({ ...form, teamId: String(t.id), teamName: t.name })
                            }}>
                              <Check className={cn("mr-2 h-4 w-4", form.teamId === String(t.id) ? "opacity-100" : "opacity-0")} />
                              {t.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>被处罚人 (选填)</Label>
                <Select value={form.punishedPersonId} onValueChange={(v) => setForm({ ...form, punishedPersonId: v })}>
                  <SelectTrigger><SelectValue placeholder="选择人员" /></SelectTrigger>
                  <SelectContent>
                    {selectedTeamMembers.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.realName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>处罚人</Label>
                <Select value={form.issuerId} onValueChange={(v) => setForm({ ...form, issuerId: v })}>
                  <SelectTrigger><SelectValue placeholder="选择处罚人" /></SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.role === "admin" || u.role === "supervisor").map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.realName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>处罚时间</Label>
                <Input type="datetime-local" value={form.punishmentTime} onChange={(e) => setForm({ ...form, punishmentTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>处罚分类</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">普通处罚</SelectItem>
                    <SelectItem value="high_voltage">高压线处罚</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>处罚金额 (元)</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>处罚原因</Label>
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="请输入处罚原因" />
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={submitting} variant="destructive" className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}提交
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Popover open={teamSelectOpen} onOpenChange={setTeamSelectOpen}>
                <PopoverTrigger >
                  <Button variant="outline" className="w-full justify-between">
                    {selectedTeam ? selectedTeam.name : "选择队伍筛选"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="搜索队伍..." />
                    <CommandList>
                      <CommandEmpty>未找到</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => { setSearchTeamId(""); setTeamSelectOpen(false) }}>全部队伍</CommandItem>
                        {teams.map((t) => (
                          <CommandItem key={t.id} onSelect={() => { setSearchTeamId(String(t.id)); setTeamSelectOpen(false) }}>
                            <Check className={cn("mr-2 h-4 w-4", searchTeamId === String(t.id) ? "opacity-100" : "opacity-0")} />
                            {t.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Select value={searchCategory} onValueChange={setSearchCategory}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="处罚分类" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                <SelectItem value="normal">普通处罚</SelectItem>
                <SelectItem value="high_voltage">高压线处罚</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>队伍</TableHead><TableHead>被处罚人</TableHead><TableHead>处罚人</TableHead>
                  <TableHead>处罚时间</TableHead><TableHead>分类</TableHead>
                  <TableHead className="text-right">金额</TableHead><TableHead>原因</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {punishments.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-slate-400">暂无数据</TableCell></TableRow>
                ) : punishments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.teamName}</TableCell>
                    <TableCell>{p.punishedPersonName || "--"}</TableCell>
                    <TableCell>{p.issuerName}</TableCell>
                    <TableCell>{formatDate(p.punishmentTime)}</TableCell>
                    <TableCell>
                      <Badge variant={p.category === "high_voltage" ? "destructive" : "secondary"}>
                        {PUNISHMENT_CATEGORIES[p.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">{formatCurrency(p.amount)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{p.reason}</TableCell>
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
