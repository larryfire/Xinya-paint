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
import { formatCurrency } from "@/lib/utils"
import { Plus, Search, Loader2, Upload, X } from "lucide-react"
import type { CargoHoldCostInfo, ShipInfo, UserInfo } from "@/types"

export default function CargoHoldCostPage() {
  const [costs, setCosts] = useState<CargoHoldCostInfo[]>([])
  const [ships, setShips] = useState<ShipInfo[]>([])
  const [supervisors, setSupervisors] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    shipId: "", supervisorId: "", cargoRatio: "", originalRatio: "",
    settlementCost: "", constructionCost: "", remarks: "", originalPhoto: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchCosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" })
      if (search) params.set("search", search)
      const res = await fetch(`/api/costs/cargo-hold?${params}`)
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
    fetch("/api/users?role=supervisor&pageSize=100").then(r => r.json()).then(d => d.success && setSupervisors(d.data.items)).catch(() => {})
  }, [fetchCosts])

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
          shipId: Number(form.shipId), supervisorId: Number(form.supervisorId),
          cargoRatio: Number(form.cargoRatio), originalRatio: Number(form.originalRatio || 0),
          originalPhoto: form.originalPhoto || undefined,
          settlementCost: Number(form.settlementCost), constructionCost: Number(form.constructionCost),
          remarks: form.remarks || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDialogOpen(false)
        setForm({ shipId: "", supervisorId: "", cargoRatio: "", originalRatio: "", settlementCost: "", constructionCost: "", remarks: "", originalPhoto: "" })
        fetchCosts()
      }
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">货舱成本管理</h1>
          <p className="text-sm text-slate-500">管理货舱涂装成本、比例对比与盈亏分析</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger >
            <Button><Plus className="mr-2 h-4 w-4" />新增记录</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>新增货舱成本记录</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
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
                <Label>货舱比例 (%)</Label>
                <Input type="number" value={form.cargoRatio} onChange={(e) => setForm({ ...form, cargoRatio: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>原始比例 (%)</Label>
                <Input type="number" value={form.originalRatio} onChange={(e) => setForm({ ...form, originalRatio: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>原始比例照片</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" disabled={uploading} >
                    <label className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "上传中..." : "上传照片"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                    </label>
                  </Button>
                  {form.originalPhoto && (
                    <div className="relative inline-flex items-center gap-1 text-sm text-green-600">
                      <span>已上传</span>
                      <X className="h-4 w-4 cursor-pointer text-red-500" onClick={() => setForm({ ...form, originalPhoto: "" })} />
                    </div>
                  )}
                </div>
                {form.originalPhoto && (
                  <img src={form.originalPhoto} alt="原始比例" className="mt-2 max-h-32 rounded border" />
                )}
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="搜索船舶名称..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                    <TableHead>船名</TableHead><TableHead>尺寸(m)</TableHead><TableHead>主管</TableHead>
                    <TableHead className="text-right">货舱比例</TableHead><TableHead className="text-right">原始比例</TableHead>
                    <TableHead>照片</TableHead>
                    <TableHead className="text-right">结算成本</TableHead><TableHead className="text-right">施工成本</TableHead>
                    <TableHead className="text-right">盈亏</TableHead><TableHead className="text-right">盈亏率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center text-slate-400">暂无数据</TableCell></TableRow>
                  ) : costs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.shipName}</TableCell>
                      <TableCell>{c.shipLength}×{c.shipWidth}</TableCell>
                      <TableCell>{c.supervisorName}</TableCell>
                      <TableCell className="text-right">{c.cargoRatio}%</TableCell>
                      <TableCell className="text-right">{c.originalRatio}%</TableCell>
                      <TableCell>
                        {c.originalPhoto ? (
                          <img src={c.originalPhoto} alt="照片" className="h-10 w-14 rounded object-cover" />
                        ) : <span className="text-slate-400">--</span>}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(c.settlementCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.constructionCost)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={c.profitLoss! >= 0 ? "default" : "destructive"}>{formatCurrency(c.profitLoss!)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={c.profitLossRate! >= 0 ? "text-green-600" : "text-red-600"}>{c.profitLossRate!.toFixed(2)}%</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
