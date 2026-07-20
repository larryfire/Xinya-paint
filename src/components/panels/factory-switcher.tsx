"use client"

import { useSceneStore, type FactoryId } from "@/stores/scene-store"

const FACTORIES: { id: FactoryId; name: string; icon: string }[] = [
  { id: 1, name: "鑫亚厂区", icon: "🏭" },
  { id: 2, name: "亚泰厂区", icon: "🏗️" },
]

/** 厂区切换Tab组件 */
export function FactorySwitcher() {
  const currentFactory = useSceneStore((s) => s.currentFactory)
  const setCurrentFactory = useSceneStore((s) => s.setCurrentFactory)

  return (
    <div className="flex gap-1 bg-slate-900/85 backdrop-blur-md border border-slate-700/50 rounded-xl p-1 shadow-lg shadow-black/30">
      {FACTORIES.map((f) => (
        <button
          key={f.id}
          onClick={() => setCurrentFactory(f.id)}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            currentFactory === f.id
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <span className="mr-1.5">{f.icon}</span>
          {f.name}
        </button>
      ))}
    </div>
  )
}
