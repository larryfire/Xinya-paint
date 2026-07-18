"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Pencil, X } from "lucide-react"
import { CRAFT_TYPES, WORKER_LEVELS } from "@/lib/constants"

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 角色中文映射 */
const ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  supervisor: "涂装主管",
  leader: "工地主任",
  worker: "员工",
}

/** 格式化日期 */
function formatDate(dateStr: string) {
  if (!dateStr) return "--"
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user, setUser } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // 表单字段
  const [realName, setRealName] = useState("")
  const [gender, setGender] = useState("")
  const [age, setAge] = useState("")
  const [phone, setPhone] = useState("")
  const [craftType, setCraftType] = useState("")
  const [level, setLevel] = useState("")

  // 弹窗打开时从 user 初始化表单
  useEffect(() => {
    if (open && user) {
      setRealName(user.realName || "")
      setGender(user.gender || "")
      setAge(user.age ? String(user.age) : "")
      setPhone(user.phone || "")
      setCraftType(user.craftType || "")
      setLevel(user.level || "")
      setEditing(false)
      setError("")
    }
  }, [open, user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          realName: realName.trim() || undefined,
          gender: gender || undefined,
          age: age ? parseInt(age) : undefined,
          phone: phone || undefined,
          craftType: craftType || undefined,
          level: level || undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        // 更新本地 store
        setUser({
          ...user,
          realName: realName.trim() || user.realName,
          gender: gender || null,
          age: age ? parseInt(age) : null,
          phone: phone || null,
          craftType: craftType || null,
          level: level || null,
        })
        setEditing(false)
      } else {
        setError(data.error?.message || "保存失败")
      }
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  const roleLabel = ROLE_LABELS[user.role] || user.role

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>个人信息</span>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                编辑
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>查看和编辑您的个人资料</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* 只读信息区 */}
          <div className="rounded-lg bg-slate-50 p-4 space-y-3">
            <h4 className="text-sm font-medium text-slate-500">账号信息（不可修改）</h4>

            <InfoRow label="用户名" value={user.username} />
            <InfoRow label="角色身份">
              <Badge variant="secondary">{roleLabel}</Badge>
            </InfoRow>
            <InfoRow label="所属队伍" value={user.teamName || "未分配"} />
            <InfoRow label="进厂时间" value={formatDate(user.createdAt)} />
          </div>

          {/* 可编辑信息区 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-500">
              个人资料{editing ? "（可修改）" : ""}
            </h4>

            {/* 姓名 */}
            <div className="space-y-1.5">
              <Label>姓名</Label>
              {editing ? (
                <Input value={realName} onChange={(e) => setRealName(e.target.value)} />
              ) : (
                <p className="text-sm">{realName || "--"}</p>
              )}
            </div>

            {/* 性别 */}
            <div className="space-y-1.5">
              <Label>性别</Label>
              {editing ? (
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue placeholder="请选择" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">男</SelectItem>
                    <SelectItem value="female">女</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{gender === "male" ? "男" : gender === "female" ? "女" : gender || "--"}</p>
              )}
            </div>

            {/* 年龄 */}
            <div className="space-y-1.5">
              <Label>年龄</Label>
              {editing ? (
                <Input type="number" min={16} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
              ) : (
                <p className="text-sm">{age || "--"}</p>
              )}
            </div>

            {/* 手机号 */}
            <div className="space-y-1.5">
              <Label>手机号码</Label>
              {editing ? (
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号" />
              ) : (
                <p className="text-sm">{phone || "--"}</p>
              )}
            </div>

            {/* 工种 */}
            <div className="space-y-1.5">
              <Label>工种</Label>
              {editing ? (
                <Select value={craftType} onValueChange={setCraftType}>
                  <SelectTrigger><SelectValue placeholder="请选择工种" /></SelectTrigger>
                  <SelectContent>
                    {CRAFT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{craftType || "--"}</p>
              )}
            </div>

            {/* 级别 */}
            <div className="space-y-1.5">
              <Label>级别</Label>
              {editing ? (
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger><SelectValue placeholder="请选择级别" /></SelectTrigger>
                  <SelectContent>
                    {WORKER_LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{level || "--"}</p>
              )}
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        {editing && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              保存修改
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** 信息行组件 */
function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      {children || <span className="text-sm font-medium">{value || "--"}</span>}
    </div>
  )
}
