"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { hasPermission } from "@/lib/permissions"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Ship, Users, Shield, DollarSign, Clock, ChevronDown, ChevronUp, Plus, Loader2, TrendingDown, TrendingUp } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from "recharts"
import Link from "next/link"

interface StatsData {
  shipCount: number
  dockedShipCount: number
  dockedShips: { id: number; name: string; shipType: string; length: number; width: number; dockName: string | null; supervisors: string[] }[]
  teamCount: number
  teams: { id: number; name: string; description: string | null; leaderName: string | null; memberCount: number }[]
  monthlyPunishmentCount: number
  monthlyPunishmentAmount: number
  totalSettlement: number
  totalConstruction: number
  totalProfitLoss: number
  teamProfitLoss: { teamId: number; teamName: string; settlementCost: number; constructionCost: number; profitLoss: number }[]
  lossAnalysis: { losingCount: number; totalLoss: number; lossRate: number; teams: { teamName: string; profitLoss: number; settlementCost: number; constructionCost: number; reasons: string[]; suggestion: string }[] }
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const canManageTeam = user ? hasPermission(user.role, "team:manage") : false

  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  // 展开状态
  const [showShips, setShowShips] = useState(false)
  const [showTeams, setShowTeams] = useState(false)
  const [showLossReport, setShowLossReport] = useState(false)

  // 队伍添加弹窗
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [teamForm, setTeamForm] = useState({ name: "", description: "" })
  const [teamSubmitting, setTeamSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    const res = await fetch("/api/stats")
    const d = await res.json()
    return d.success ? d.data : null
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadData().then((data) => {
      if (!cancelled && data) setStats(data)
      if (!cancelled) setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [loadData])

  const refreshStats = useCallback(() => {
    loadData().then((data) => { if (data) setStats(data) })
  }, [loadData])

  const handleAddTeam = async () => {
    if (!teamForm.name) return
    setTeamSubmitting(true)
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamForm),
      })
      const d = await res.json()
      if (d.success) {
        setTeamDialogOpen(false)
        setTeamForm({ name: "", description: "" })
        refreshStats()
      }
    } finally { setTeamSubmitting(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const profitLoss = stats?.totalProfitLoss ?? 0
  const isProfit = profitLoss >= 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">欢迎回来，{user?.realName}</h1>
        <p className="text-slate-500 mt-1">船舶涂装管理系统控制台</p>
      </div>

      {/* ===== 快速统计卡片 ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 船舶总数 */}
        <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowShips(!showShips)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">船舶总数</CardTitle>
            <div className="flex items-center gap-1">
              <Ship className="h-4 w-4 text-blue-500" />
              {showShips ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.dockedShipCount ?? 0}<span className="text-sm text-slate-400 font-normal">/{stats?.shipCount ?? 0} 在厂</span></p>
          </CardContent>
        </Card>

        {/* 施工队伍 */}
        <Card className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowTeams(!showTeams)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">施工队伍</CardTitle>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-green-500" />
              {showTeams ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.teamCount ?? 0}<span className="text-sm text-slate-400 font-normal"> 支</span></p>
          </CardContent>
        </Card>

        {/* 本月处罚 */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">本月处罚</CardTitle>
            <Shield className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.monthlyPunishmentCount ?? 0}<span className="text-sm text-slate-400 font-normal"> 次</span></p>
            {stats?.monthlyPunishmentAmount ? (
              <p className="text-xs text-slate-400 mt-1">罚款 {formatCurrency(stats.monthlyPunishmentAmount)}</p>
            ) : null}
          </CardContent>
        </Card>

        {/* 本月盈亏 */}
        <Card className={`border-l-4 ${isProfit ? "border-l-green-500" : "border-l-red-500"} cursor-pointer hover:shadow-md transition-shadow`} onClick={() => setShowLossReport(!showLossReport)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">本月盈亏</CardTitle>
            <div className="flex items-center gap-1">
              <DollarSign className={`h-4 w-4 ${isProfit ? "text-green-500" : "text-red-500"}`} />
              {showLossReport ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
              {isProfit ? "+" : ""}{formatCurrency(profitLoss)}
            </p>
            {stats?.lossAnalysis && stats.lossAnalysis.losingCount > 0 && (
              <p className="text-xs text-red-400 mt-1">
                {stats.lossAnalysis.losingCount} 支队伍亏损
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== 展开面板 ===== */}

      {/* 在厂船舶列表 */}
      {showShips && stats?.dockedShips && (
        <Card>
          <CardHeader><CardTitle className="text-base">在厂船舶 · 涂装主管</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>船名</TableHead><TableHead>类型</TableHead><TableHead>尺寸(m)</TableHead><TableHead>位置</TableHead><TableHead>涂装主管</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.dockedShips.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-slate-400">暂无在厂船舶</TableCell></TableRow>
                ) : stats.dockedShips.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.shipType}</TableCell>
                    <TableCell>{s.length}×{s.width}</TableCell>
                    <TableCell>{s.dockName || "--"}</TableCell>
                    <TableCell>{s.supervisors.length > 0 ? s.supervisors.join("、") : "未分配"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 施工队伍列表 */}
      {showTeams && stats?.teams && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">施工队伍详情</CardTitle>
            {canManageTeam && (
              <Button size="sm" onClick={(e) => { e.stopPropagation(); setTeamDialogOpen(true) }}>
                <Plus className="h-3.5 w-3.5 mr-1" />添加队伍
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.teams.map((t) => (
                <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="p-2 bg-green-100 rounded-lg shrink-0">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.leaderName ?? "无负责人"} · {t.memberCount} 人</div>
                    {t.description && <div className="text-xs text-slate-400 mt-0.5 truncate">{t.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 盈亏柱状图 + 亏损报告 */}
      {showLossReport && stats?.teamProfitLoss && (
        <Card>
          <CardHeader><CardTitle className="text-base">本月各队伍盈亏 · 柱状图</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={stats.teamProfitLoss} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="teamName" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: unknown) => [formatCurrency(Number(value)), ""]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="profitLoss" name="盈亏" radius={[4, 4, 0, 0]}>
                  {stats.teamProfitLoss.map((_, i) => (
                    <Cell key={i} fill={stats.teamProfitLoss[i].profitLoss >= 0 ? "#10B981" : "#EF4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* 亏损分析报告 */}
            {stats.lossAnalysis && stats.lossAnalysis.losingCount > 0 && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  <h3 className="font-semibold text-base">亏损报告</h3>
                  <span className="text-xs text-slate-400 ml-2">
                    亏损率 {stats.lossAnalysis.lossRate}% · 合计亏损 {formatCurrency(Math.abs(stats.lossAnalysis.totalLoss))}
                  </span>
                </div>

                {/* 亏损原因统计 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-4 pb-3">
                      <div className="text-2xl font-bold text-red-600">{stats.lossAnalysis.losingCount}</div>
                      <div className="text-xs text-red-500 mt-1">亏损队伍数</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="pt-4 pb-3">
                      <div className="text-2xl font-bold text-orange-600">{formatCurrency(Math.abs(stats.lossAnalysis.totalLoss))}</div>
                      <div className="text-xs text-orange-500 mt-1">总亏损金额</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="pt-4 pb-3">
                      <div className="text-2xl font-bold text-amber-600">{stats.lossAnalysis.lossRate}%</div>
                      <div className="text-xs text-amber-500 mt-1">队伍亏损率</div>
                    </CardContent>
                  </Card>
                </div>

                {/* 各亏损队伍详情 */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>队伍</TableHead>
                      <TableHead className="text-right">结算成本</TableHead>
                      <TableHead className="text-right">施工成本</TableHead>
                      <TableHead className="text-right">亏损</TableHead>
                      <TableHead>原因分析</TableHead>
                      <TableHead>建议</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.lossAnalysis.teams.map((t, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{t.teamName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(t.settlementCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(t.constructionCost)}</TableCell>
                        <TableCell className="text-right text-red-600 font-medium">{formatCurrency(t.profitLoss)}</TableCell>
                        <TableCell className="text-xs">{t.reasons.join("；")}</TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[200px]">{t.suggestion}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {stats.lossAnalysis?.losingCount === 0 && (
              <div className="flex items-center gap-2 mt-4 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">本月无亏损队伍</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== 功能模块入口 ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/cost-management/team-settlement">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><DollarSign className="h-6 w-6 text-blue-600" /></div>
                <div><h3 className="font-semibold">成本管理</h3><p className="text-sm text-slate-500">外板/货舱/敲铲成本管控</p></div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/safety-management">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg"><Shield className="h-6 w-6 text-red-600" /></div>
                <div><h3 className="font-semibold">安全管理</h3><p className="text-sm text-slate-500">安全处罚记录与查询</p></div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/personnel-management">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><Users className="h-6 w-6 text-green-600" /></div>
                <div><h3 className="font-semibold">人员管理</h3><p className="text-sm text-slate-500">队伍与员工信息管理</p></div>
              </div>
            </CardContent>
          </Card>
        </Link>
        {user && hasPermission(user.role, "work_hour:read") && (
          <Link href="/work-hours">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg"><Clock className="h-6 w-6 text-orange-600" /></div>
                  <div><h3 className="font-semibold">每日工时</h3><p className="text-sm text-slate-500">记录施工队每日工时与导出</p></div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* ===== 添加队伍弹窗 ===== */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>添加施工队伍</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>队伍名称 *</Label>
              <Input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="如：鑫海涂装队" />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Input value={teamForm.description} onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })} placeholder="如：专业船舶外板涂装施工队伍" />
            </div>
          </div>
          <Button onClick={handleAddTeam} disabled={teamSubmitting || !teamForm.name} className="w-full">
            {teamSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}确认添加
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
