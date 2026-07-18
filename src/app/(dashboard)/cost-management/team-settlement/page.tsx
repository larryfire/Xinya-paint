"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface SettlementRecord {
  period: string
  teamId: number
  teamName: string
  settlementCost: number
  constructionCost: number
}

export default function TeamSettlementPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [activeTab, setActiveTab] = useState("annual")
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [data, setData] = useState<SettlementRecord[]>([])
  const [loading, setLoading] = useState(true)

  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i)
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: activeTab,
        year: String(year),
      })
      if (activeTab === "monthly") {
        params.set("month", String(month))
      }
      const res = await fetch(`/api/costs/team-settlement?${params}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      } else {
        setData([])
      }
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, year, month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">内协队伍结算报表</h1>
        <p className="text-sm text-slate-500">查看施工队伍的年度和月度结算成本报表</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
        <TabsList>
          <TabsTrigger value="annual">年度结算报表</TabsTrigger>
          <TabsTrigger value="monthly">月度结算报表</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle>
                {activeTab === "annual" ? "年度结算报表" : "月度结算报表"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="选择年份" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}年</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeTab === "monthly" && (
                  <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="月份" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((m) => (
                        <SelectItem key={m} value={String(m)}>{m}月</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>施工队伍</TableHead>
                    <TableHead className="text-right">结算成本</TableHead>
                    <TableHead className="text-right">施工成本</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-400">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((item, index) => (
                      <TableRow key={`${item.teamId}-${item.period}-${index}`}>
                        <TableCell className="font-medium">{item.period}</TableCell>
                        <TableCell>{item.teamName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.settlementCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.constructionCost)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  )
}
