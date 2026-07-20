"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Ship, Loader2, CheckCircle } from "lucide-react"

export default function RegisterPage() {
  const [phone, setPhone] = useState("")
  const [realName, setRealName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // 前端校验
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入有效的11位手机号")
      return
    }
    if (!realName.trim()) {
      setError("请输入姓名")
      return
    }
    if (password.length < 6) {
      setError("密码至少6个字符")
      return
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }

    setLoading(true)

    try {
      // 设置超时防止请求挂起
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          realName: realName.trim(),
          password,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error?.message || "注册失败")
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("请求超时，请检查网络后重试")
      } else {
        setError("网络错误，请稍后重试")
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Card className="w-full max-w-[400px] shadow-lg">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl mb-2">注册申请已提交</CardTitle>
            <CardDescription className="text-sm space-y-2">
              <p>您的账号已创建，正在等待管理员审核。</p>
              <p className="text-slate-400">审核通过后即可登录使用系统。</p>
            </CardDescription>
            <Link href="/login">
              <Button variant="outline" className="mt-6">
                返回登录页
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
            <Ship className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-xl">注册账号</CardTitle>
          <CardDescription>使用手机号和姓名注册</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="请输入11位手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={11}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="realName">姓名</Label>
              <Input
                id="realName"
                placeholder="请输入真实姓名"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                required
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少6个字符"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              注册
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-500">
            已有账号？
            <Link href="/login" className="text-blue-600 hover:underline ml-1">
              去登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
