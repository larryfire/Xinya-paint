"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, UserCheck, ArrowLeft } from "lucide-react"

interface Registration {
  id: number
  username: string
  realName: string
  phone: string
  role: string
  approvalStatus: string
  createdAt: string
}

export default function AdminRegistrationsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [processing, setProcessing] = useState<number | null>(null)

  // 非管理员跳转
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/")
    }
  }, [user, router])

  const fetchRegistrations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/registrations")
      const data = await res.json()
      if (data.success) {
        setRegistrations(data.data.items || [])
      } else {
        setError(data.error?.message || "获取列表失败")
      }
    } catch {
      setError("网络错误")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRegistrations()
  }, [fetchRegistrations])

  const handleReview = async (id: number, action: "approve" | "reject") => {
    setProcessing(id)
    setMessage("")
    setError("")

    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message || (action === "approve" ? "已通过" : "已拒绝"))
        setRegistrations((prev) => prev.filter((r) => r.id !== id))
      } else {
        setError(data.error?.message || "操作失败")
      }
    } catch {
      setError("网络错误")
    } finally {
      setProcessing(null)
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!user || user.role !== "admin") return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">注册审核</h1>
          <p className="text-slate-500 mt-1">审核新用户注册申请</p>
        </div>
      </div>

      {message && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : registrations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500">暂无待审核的注册申请</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {registrations.map((reg) => (
            <Card key={reg.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{reg.realName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {reg.phone}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    用户名: {reg.username} · 申请时间: {formatDate(reg.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-300 hover:bg-green-50"
                    disabled={processing === reg.id}
                    onClick={() => handleReview(reg.id, "approve")}
                  >
                    {processing === reg.id ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-1 h-3.5 w-3.5" />
                    )}
                    通过
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    disabled={processing === reg.id}
                    onClick={() => handleReview(reg.id, "reject")}
                  >
                    {processing === reg.id ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                    )}
                    拒绝
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
