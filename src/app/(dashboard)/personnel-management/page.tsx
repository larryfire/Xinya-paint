"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Users, ChevronRight, Loader2 } from "lucide-react"
import type { TeamInfo } from "@/types"

export default function PersonnelManagementPage() {
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams({ pageSize: "200" })
    if (search) params.set("search", search)
    setLoading(true)
    fetch(`/api/teams?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTeams(d.data.items) })
      .finally(() => setLoading(false))
  }, [search])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">人员管理</h1>
        <p className="text-sm text-slate-500">管理施工队伍与员工信息</p>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="搜索队伍名称..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.length === 0 ? (
                <p className="col-span-full text-center text-slate-400 py-8">暂无队伍数据</p>
              ) : teams.map((team) => (
                <Card
                  key={team.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/personnel-management/${team.id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{team.name}</h3>
                          <p className="text-sm text-slate-500">
                            工地主任: {team.leaderName || "未指派"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary">
                        {team.memberCount ?? 0} 名成员
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
