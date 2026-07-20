"use client"

import { SHIP_STATUS_MAP, DOCK_STATUS_MAP } from "@/lib/constants"

/** 底部图例栏 */
export function LegendBar() {
  return (
    <div className="flex items-center gap-4 px-3 py-2 bg-slate-900/80 backdrop-blur-sm border border-slate-700/40 rounded-lg text-[10px] text-slate-400">
      <span className="text-slate-500 text-[10px] font-medium mr-1">船舶状态:</span>
      {Object.entries(SHIP_STATUS_MAP).map(([k, v]) => (
        <span key={k} className="flex items-center gap-1">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: v.color }}
          />
          {v.label}
        </span>
      ))}
      <span className="text-slate-600 mx-1">|</span>
      <span className="text-slate-500 text-[10px] font-medium mr-1">设施:</span>
      {Object.entries(DOCK_STATUS_MAP).map(([k, v]) => (
        <span key={k} className="flex items-center gap-1">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: v.color }}
          />
          {v.label}
        </span>
      ))}
    </div>
  )
}
