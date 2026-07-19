"use client"

import { useRef, useCallback, useState } from "react"
import { Html } from "@react-three/drei"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, Maximize2, Move } from "lucide-react"

// ==================== 缩放手柄 ====================

export function ResizeHandles({ position, size, onResize }: {
  position: [number, number, number]; size: [number, number, number]; onResize: (w: number, d: number) => void
}) {
  const corners = [
    { pos: [size[0] / 2, size[1] / 2, size[2] / 2] as [number, number, number], axis: "++" },
    { pos: [-size[0] / 2, size[1] / 2, size[2] / 2] as [number, number, number], axis: "-+" },
    { pos: [size[0] / 2, size[1] / 2, -size[2] / 2] as [number, number, number], axis: "+-" },
    { pos: [-size[0] / 2, size[1] / 2, -size[2] / 2] as [number, number, number], axis: "--" },
  ]

  return (
    <group position={position}>
      {corners.map((c, i) => (
        <mesh key={i} position={c.pos}>
          <boxGeometry args={[0.5, 0.3, 0.5]} />
          <meshStandardMaterial color="#00FF00" emissive="#00FF00" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

// ==================== 右键菜单（HTML覆盖层） ====================

interface ContextMenuProps {
  x: number; y: number
  worldPos: { x: number; z: number }
  onClose: () => void
  onAddDock: (type: string, x: number, z: number) => void
  onDeleteDock: () => void
  hasSelection: boolean
}

// 这个组件在页面层面渲染(HTML)，不在 Three.js Canvas 内
export function EditorContextMenu({ x, y, worldPos, onClose, onAddDock, onDeleteDock, hasSelection }: ContextMenuProps) {
  const dockTypes = [
    { type: "dock", label: "船坞" },
    { type: "berth", label: "泊位" },
    { type: "workshop", label: "车间" },
    { type: "warehouse", label: "仓库" },
    { type: "wharf", label: "码头" },
  ]

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute bg-card border rounded-lg shadow-xl p-1.5 min-w-[140px]"
        style={{ left: x, top: y }}>
        <p className="text-[10px] text-slate-400 px-2 py-0.5">坐标: ({worldPos.x.toFixed(1)}, {worldPos.z.toFixed(1)})</p>
        <div className="border-t my-1" />
        {hasSelection && (
          <Button variant="ghost" size="sm" className="w-full justify-start text-red-500 h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); onDeleteDock(); onClose() }}>
            <Trash2 className="h-3 w-3 mr-1" />删除选中设施
          </Button>
        )}
        <div className="border-t my-1" />
        <p className="text-[10px] text-slate-400 px-2 py-0.5">在此新建:</p>
        {dockTypes.map((dt) => (
          <Button key={dt.type} variant="ghost" size="sm" className="w-full justify-start h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); onAddDock(dt.type, worldPos.x, worldPos.z); onClose() }}>
            <Plus className="h-3 w-3 mr-1" />{dt.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

// ==================== 编辑工具栏（页面层HTML） ====================

interface EditorToolbarProps {
  activeTool: string
  onToolChange: (tool: string) => void
  onOpenSettings: () => void
  onExitEdit: () => void
}

export function EditorToolbar({ activeTool, onToolChange, onOpenSettings, onExitEdit }: EditorToolbarProps) {
  const tools = [
    { id: "move", label: "移动", icon: Move },
    { id: "resize", label: "缩放", icon: Maximize2 },
    { id: "add", label: "新增", icon: Plus },
    { id: "delete", label: "删除", icon: Trash2 },
  ]

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border p-1 z-50">
      {tools.map((t) => {
        const Icon = t.icon
        return (
          <button key={t.id}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${activeTool === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
            onClick={() => onToolChange(t.id)}>
            <Icon className="h-3.5 w-3.5" />{t.label}
          </button>
        )
      })}
      <div className="w-px bg-border mx-1" />
      <button className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium hover:bg-muted transition-colors"
        onClick={onOpenSettings}>⚙ 场景</button>
      <button className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium hover:bg-muted text-red-500 transition-colors"
        onClick={onExitEdit}>✕ 退出</button>
    </div>
  )
}
