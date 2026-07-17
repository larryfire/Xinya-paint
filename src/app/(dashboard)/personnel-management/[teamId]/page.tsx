"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2, User } from "lucide-react"
import type { TeamInfo, UserInfo } from "@/types"

export default function TeamDetailPage() {
  const { teamId } = useParams()
  const [team, setTeam] = useState<TeamInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/teams/${teamId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTeam(d.data) })
      .finally(() => setLoading(false))
  }, [teamId])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!team) {
    return <p className="text-center py-12 text-slate-400">队伍不存在</p>
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />返回
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{team.name}</CardTitle>
              <p className="text-sm text-slate-500">
                工地主任: {team.leaderName || "未指派"}
                {team.description && ` · ${team.description}`}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="font-semibold mb-3">
            队伍成员 ({team.members?.length || 0}人)
          </h3>
          {team.members && team.members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead><TableHead>性别</TableHead><TableHead>年龄</TableHead>
                  <TableHead>工种</TableHead><TableHead>级别</TableHead><TableHead>手机号</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.realName}</TableCell>
                    <TableCell>
                      {member.gender === "male" ? "男" : member.gender === "female" ? "女" : "--"}
                    </TableCell>
                    <TableCell>{member.age ?? "--"}</TableCell>
                    <TableCell>{member.craftType || "--"}</TableCell>
                    <TableCell>
                      {member.level ? <Badge variant="outline">{member.level}</Badge> : "--"}
                    </TableCell>
                    <TableCell>{member.phone || "--"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-slate-400 py-8">暂无成员</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
