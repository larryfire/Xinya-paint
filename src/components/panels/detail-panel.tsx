"use client"

import { useState } from "react"
import { useSceneStore } from "@/stores/scene-store"
import { useAuthStore } from "@/stores/auth-store"
import { SHIP_STATUS_MAP } from "@/lib/constants"
import { formatCurrency } from "@/lib/utils"
import {
  X,
  Anchor,
  Users,
  Clock,
  Wrench,
  DollarSign,
  Plus,
  Minus,
  Loader2,
  MapPin,
} from "lucide-react"

interface DetailPanelProps {
  onStartAttendance?: () => void
  onEndAttendance?: () => void
}

/** 施工详情侧边面板 */
export function DetailPanel({
  onStartAttendance,
  onEndAttendance,
}: DetailPanelProps) {
  const panelOpen = useSceneStore((s) => s.panelOpen)
  const selectedShip = useSceneStore((s) => s.selectedShip)
  const selectedDock = useSceneStore((s) => s.selectedDock)
  const selectShip = useSceneStore((s) => s.selectShip)
  const selectDock = useSceneStore((s) => s.selectDock)

  const [attTeamId, setAttTeamId] = useState("")
  const [attWorkers, setAttWorkers] = useState(5)
  const [submitting, setSubmitting] = useState(false)

  const user = useAuthStore((s) => s.user)
  const isLeader = user?.role === "leader" || user?.role === "admin"

  if (!panelOpen || (!selectedShip && !selectedDock)) return null

  const handleStartAttendance = async () => {
    if (!attTeamId) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        teamId: Number(attTeamId),
        workerCount: attWorkers,
      }
      if (selectedShip) body.shipId = selectedShip.id
      if (selectedDock) body.dockId = selectedDock.id
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setAttTeamId("")
        setAttWorkers(5)
        onStartAttendance?.()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleEndAttendance = async (attendanceId: number) => {
    await fetch(`/api/attendance/${attendanceId}`, { method: "PUT" })
    onEndAttendance?.()
  }

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-700/50 shadow-2xl shadow-black/50 z-40 overflow-y-auto">
      {/* 关闭按钮 */}
      <button
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors z-10"
        onClick={() => {
          selectShip(null)
          selectDock(null)
        }}
      >
        <X className="h-4 w-4" />
      </button>

      {/* ===== 船舶详情 ===== */}
      {selectedShip && (
        <div className="p-4 pt-10 space-y-4">
          {/* 基本信息 */}
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {selectedShip.name}
            </h3>
            <div className="flex gap-2 mt-1.5">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                style={{
                  backgroundColor:
                    SHIP_STATUS_MAP[selectedShip.status]?.color ?? "#95A5A6",
                }}
              >
                {SHIP_STATUS_MAP[selectedShip.status]?.label ??
                  selectedShip.status}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                {selectedShip.shipType}
              </span>
            </div>
          </div>

          {/* 规格参数 */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <InfoItem label="船长" value={`${selectedShip.length}m`} />
            <InfoItem label="船宽" value={`${selectedShip.width}m`} />
            <InfoItem label="型深" value={`${selectedShip.height}m`} />
            <InfoItem
              label="位置"
              value={selectedShip.dockName || selectedShip.berthName || "在航"}
              icon={MapPin}
            />
          </div>

          {/* 成本汇总 */}
          {((selectedShip.totalSettlementCost ?? 0) > 0 ||
            (selectedShip.totalConstructionCost ?? 0) > 0) && (
            <div className="bg-slate-800/50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3 w-3 text-yellow-400" />
                <span className="text-[10px] font-medium text-slate-400">
                  成本汇总
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">结算成本</span>
                <span className="text-slate-200 font-medium">
                  {formatCurrency(selectedShip.totalSettlementCost ?? 0)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">施工成本</span>
                <span className="text-slate-200 font-medium">
                  {formatCurrency(selectedShip.totalConstructionCost ?? 0)}
                </span>
              </div>
            </div>
          )}

          {/* 已分配队伍 */}
          {(selectedShip.teams ?? []).length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="h-3 w-3 text-cyan-400" />
                <h5 className="text-xs font-semibold text-slate-400">
                  施工队伍
                </h5>
              </div>
              <div className="space-y-1.5">
                {selectedShip.teams!.map((t) => (
                  <div
                    key={t.teamId}
                    className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-200">
                        {t.teamName}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {t.memberCount}人
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 当前出勤 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-green-400" />
                <h5 className="text-xs font-semibold text-slate-400">
                  实时出勤
                </h5>
              </div>
              {isLeader && (
                <button
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md hover:bg-cyan-500/30 transition-colors"
                  onClick={() =>
                    useSceneStore.getState().setAttendanceOpen(true)
                  }
                >
                  <Plus className="h-3 w-3" />
                  出勤
                </button>
              )}
            </div>
            {(selectedShip.activeAttendance ?? []).length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-2">
                暂无活跃出勤
              </p>
            ) : (
              <div className="space-y-1.5">
                {selectedShip.activeAttendance!.map((a) => (
                  <AttendanceRow
                    key={a.id}
                    attendance={a}
                    onEnd={() => handleEndAttendance(a.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 设施详情 ===== */}
      {selectedDock && !selectedShip && (
        <div className="p-4 pt-10 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {selectedDock.name}
            </h3>
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
              {selectedDock.type === "workshop"
                ? "车间"
                : selectedDock.type === "dock"
                  ? "船坞"
                  : selectedDock.type === "warehouse"
                    ? "仓库"
                    : selectedDock.type === "wharf"
                      ? "码头"
                      : "泊位"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <InfoItem label="状态" value={selectedDock.status === "occupied" ? "占用" : selectedDock.status === "available" ? "空闲" : "维护"} />
            <InfoItem label="宽度" value={`${selectedDock.width}m`} />
            <InfoItem label="深度" value={`${selectedDock.depth}m`} />
            <InfoItem
              label="坐标"
              value={`(${selectedDock.positionX}, ${selectedDock.positionZ})`}
            />
          </div>

          {/* 出勤 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-green-400" />
                <h5 className="text-xs font-semibold text-slate-400">
                  实时出勤
                </h5>
              </div>
              {isLeader && (
                <button
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md hover:bg-cyan-500/30 transition-colors"
                  onClick={() =>
                    useSceneStore.getState().setAttendanceOpen(true)
                  }
                >
                  <Plus className="h-3 w-3" />
                  出勤
                </button>
              )}
            </div>
            {((selectedDock as unknown as Record<string, unknown>).activeAttendance as unknown[] ?? []).length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-2">
                暂无活跃出勤
              </p>
            ) : (
              <div className="space-y-1.5">
                {((selectedDock as unknown as Record<string, unknown>).activeAttendance as Array<{
                  id: number
                  teamName: string
                  workerCount: number
                  currentHours: number
                }> ?? []).map((a) => (
                  <AttendanceRow
                    key={a.id}
                    attendance={a}
                    onEnd={() => handleEndAttendance(a.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 出勤表单对话框 ===== */}
      {useSceneStore((s) => s.attendanceOpen) && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-slate-900 border-t border-slate-700/50 rounded-t-xl p-4 w-full space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-100">
                开始出勤
              </h4>
              <button
                className="text-slate-400 hover:text-white"
                onClick={() =>
                  useSceneStore.getState().setAttendanceOpen(false)
                }
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">队伍ID</label>
              <input
                type="number"
                value={attTeamId}
                onChange={(e) => setAttTeamId(e.target.value)}
                placeholder="输入队伍ID"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">出勤人数</label>
              <div className="flex items-center gap-2">
                <button
                  className="w-8 h-8 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg text-slate-200 hover:bg-slate-700"
                  onClick={() => setAttWorkers(Math.max(1, attWorkers - 1))}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-10 text-center font-bold text-slate-100">
                  {attWorkers}
                </span>
                <button
                  className="w-8 h-8 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg text-slate-200 hover:bg-slate-700"
                  onClick={() => setAttWorkers(attWorkers + 1)}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
            <button
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
              disabled={submitting || !attTeamId}
              onClick={handleStartAttendance}
            >
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
              )}
              开始出勤
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** 信息项 */
function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="bg-slate-800/40 rounded-lg px-2.5 py-2">
      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
      <p className="text-xs font-medium text-slate-200 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3 text-slate-400" />}
        {value}
      </p>
    </div>
  )
}

/** 出勤行 */
function AttendanceRow({
  attendance,
  onEnd,
}: {
  attendance: {
    id: number
    teamName: string
    workerCount: number
    currentHours: number
  }
  onEnd: () => void
}) {
  const totalManHours = attendance.workerCount * attendance.currentHours

  return (
    <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-200 truncate">
          {attendance.teamName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-green-400">
            👥 {attendance.workerCount}人
          </span>
          <span className="text-[10px] text-cyan-400">
            ⏱ {attendance.currentHours.toFixed(1)}h
          </span>
          <span className="text-[10px] text-yellow-400">
            📊 {totalManHours.toFixed(1)}工时
          </span>
        </div>
      </div>
      <button
        className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors ml-2"
        onClick={onEnd}
      >
        <Minus className="h-3 w-3" />
      </button>
    </div>
  )
}
