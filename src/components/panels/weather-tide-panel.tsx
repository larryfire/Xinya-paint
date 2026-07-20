"use client"

import { useSceneStore } from "@/stores/scene-store"
import {
  Thermometer,
  Wind,
  Droplets,
  Gauge,
  Waves,
  Anchor,
  Clock,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

/** 天气潮汐信息面板 — 右侧卡片 */
export function WeatherTidePanel() {
  const weatherData = useSceneStore((s) => s.weatherData)

  if (!weatherData) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/40 rounded-xl p-3">
        <p className="text-xs text-slate-500 text-center">加载天气数据...</p>
      </div>
    )
  }

  const {
    weather,
    weatherIcon,
    temperature,
    windDirection,
    windSpeed,
    humidity,
    pressure,
    tideHeight,
    tideTrend,
    nextHighTide,
    nextLowTide,
    bestDockTimes,
  } = weatherData

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  return (
    <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/40 rounded-xl shadow-lg shadow-black/30 overflow-hidden">
      {/* 天气概览 */}
      <div className="p-3 border-b border-slate-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{weatherIcon}</span>
            <div>
              <p className="text-sm font-semibold text-slate-100">{weather}</p>
              <p className="text-[10px] text-slate-500">舟山·六横</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100">
            {temperature}°<span className="text-sm font-normal text-slate-400">C</span>
          </p>
        </div>
      </div>

      {/* 气象详情 */}
      <div className="p-3 grid grid-cols-2 gap-2 border-b border-slate-700/30">
        <WeatherItem
          icon={Wind}
          label="风向风速"
          value={`${windDirection}风 ${windSpeed}m/s`}
        />
        <WeatherItem
          icon={Droplets}
          label="湿度"
          value={`${humidity}%`}
        />
        <WeatherItem
          icon={Gauge}
          label="气压"
          value={`${pressure} hPa`}
        />
        <WeatherItem
          icon={Thermometer}
          label="体感温度"
          value={`${Math.round(temperature - windSpeed * 0.5)}°C`}
        />
      </div>

      {/* 潮汐信息 */}
      <div className="p-3 border-b border-slate-700/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Waves className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-slate-300">实时潮汐</span>
          </div>
          <span
            className={`flex items-center gap-0.5 text-xs font-bold ${
              tideTrend === "rising" ? "text-green-400" : "text-orange-400"
            }`}
          >
            {tideTrend === "rising" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {tideHeight}m
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <div className="text-slate-400">
            <Clock className="h-2.5 w-2.5 inline mr-0.5" />
            高潮 {formatTime(nextHighTide.time)}{" "}
            <span className="text-cyan-400">{nextHighTide.height}m</span>
          </div>
          <div className="text-slate-400">
            <Clock className="h-2.5 w-2.5 inline mr-0.5" />
            低潮 {formatTime(nextLowTide.time)}{" "}
            <span className="text-orange-400">{nextLowTide.height}m</span>
          </div>
        </div>
      </div>

      {/* 最佳进出坞时刻 */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Anchor className="h-3.5 w-3.5 text-yellow-400" />
          <span className="text-xs font-medium text-slate-300">
            最佳进出坞时刻
          </span>
        </div>
        {bestDockTimes.length === 0 ? (
          <p className="text-[10px] text-slate-500">今日无适宜进出坞时段</p>
        ) : (
          <div className="space-y-1.5">
            {bestDockTimes.map((bt, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-[10px] bg-slate-800/50 rounded-md px-2 py-1.5"
              >
                <span className="text-slate-300">
                  {formatTime(bt.start)} - {formatTime(bt.end)}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                    bt.label === "最佳"
                      ? "bg-green-500/20 text-green-400"
                      : bt.label === "适宜"
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {bt.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** 气象数据项 */
function WeatherItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-slate-500" />
      <div>
        <p className="text-[9px] text-slate-500 leading-none mb-0.5">
          {label}
        </p>
        <p className="text-[11px] font-medium text-slate-300 leading-none">
          {value}
        </p>
      </div>
    </div>
  )
}
