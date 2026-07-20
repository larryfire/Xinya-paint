"use client"

import { useSceneStore } from "@/stores/scene-store"
import { Ship, Anchor, Wrench, Users, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

/** 统计数值显示 */
function StatBadge({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 backdrop-blur-sm border border-slate-700/40 rounded-lg">
      <div
        className="flex items-center justify-center w-7 h-7 rounded-md"
        style={{ backgroundColor: `${color}20` }}
      >
        <span style={{ color, display: "flex" }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 uppercase leading-none mb-0.5">
          {label}
        </p>
        <p className="text-sm font-bold text-slate-100 leading-none">
          {value}
        </p>
      </div>
    </div>
  )
}

/** 左上角统计指标覆盖层 */
export function StatsOverlay() {
  const ships = useSceneStore((s) => s.ships)
  const docks = useSceneStore((s) => s.docks)
  const weatherData = useSceneStore((s) => s.weatherData)

  const dockCount = docks.filter((d) => d.type === "dock").length
  const wsCount = docks.filter((d) => d.type === "workshop").length
  const activeCount = [
    ...ships.flatMap((s) => s.activeAttendance ?? []),
    ...docks.flatMap((d) => (d as unknown as Record<string, unknown>).activeAttendance as unknown[] ?? []),
  ].length
  const totalCost = ships.reduce(
    (s, ship) => s + (ship.totalSettlementCost ?? 0),
    0
  )

  return (
    <div className="flex flex-col gap-1.5">
      <StatBadge icon={Ship} label="在厂船舶" value={`${ships.length}艘`} color="#00D4FF" />
      <StatBadge icon={Anchor} label="船坞" value={`${dockCount}座`} color="#F59E0B" />
      {wsCount > 0 && (
        <StatBadge icon={Wrench} label="车间" value={`${wsCount}间`} color="#8B5CF6" />
      )}
      {activeCount > 0 && (
        <StatBadge icon={Users} label="活跃出勤" value={`${activeCount}组`} color="#10B981" />
      )}
      {totalCost > 0 && (
        <StatBadge
          icon={DollarSign}
          label="总成本"
          value={formatCurrency(totalCost)}
          color="#EF4444"
        />
      )}
      {weatherData && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 backdrop-blur-sm border border-slate-700/40 rounded-lg">
          <span className="text-lg">{weatherData.weatherIcon}</span>
          <div>
            <p className="text-[10px] text-slate-500 uppercase leading-none mb-0.5">
              {weatherData.weather}
            </p>
            <p className="text-sm font-bold text-slate-100 leading-none">
              {weatherData.temperature}°C
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
