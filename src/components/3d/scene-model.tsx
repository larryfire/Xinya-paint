"use client"

import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, Html } from "@react-three/drei"
import { useState, useMemo, useCallback, useRef } from "react"
import { ResizeHandles } from "@/components/3d/editor-tools"
import type { DockInfo, ShipSceneInfo, SceneSettingsInfo } from "@/types"
import { SHIP_STATUS_MAP, DOCK_STATUS_MAP } from "@/lib/constants"
import * as THREE from "three"

// ==================== 默认场景设置 ====================
const DEFAULT_SETTINGS: SceneSettingsInfo = { id: 1, coastlineZ: 0, waterOpacity: 0.6, ambientIntensity: 0.6, bgColor: "#D4EAF0", fogNear: 40, fogFar: 120 }

// ==================== 颜色工具 ====================
const statusToColor = (status: string, type: "dock" | "ship"): string => {
  if (type === "dock") return DOCK_STATUS_MAP[status as keyof typeof DOCK_STATUS_MAP]?.color || "#95A5A6"
  return SHIP_STATUS_MAP[status as keyof typeof SHIP_STATUS_MAP]?.color || "#95A5A6"
}

// ==================== 场景灯光 ====================
function SceneLights({ settings }: { settings: SceneSettingsInfo }) {
  return (
    <>
      <ambientLight intensity={settings.ambientIntensity} />
      <directionalLight position={[50, 80, 30]} intensity={0.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <hemisphereLight args={["#87CEEB", "#8B7355", 0.3]} />
    </>
  )
}

// ==================== 水面 ====================
function WaterSurface({ settings }: { settings: SceneSettingsInfo }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 15]} receiveShadow>
      <planeGeometry args={[120, 80]} />
      <meshStandardMaterial color="#2980B9" transparent opacity={settings.waterOpacity} metalness={0.2} roughness={0.3} />
    </mesh>
  )
}

// ==================== 海岸线 ====================
function Coastline({ z }: { z: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, z]}>
      <planeGeometry args={[120, 3]} />
      <meshStandardMaterial color="#C4956A" roughness={0.8} />
    </mesh>
  )
}

// ==================== 陆地 ====================
function Ground({ z }: { z: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, z - 15]} receiveShadow>
      <planeGeometry args={[120, 50]} />
      <meshStandardMaterial color="#D4A574" roughness={0.9} />
    </mesh>
  )
}

// ==================== 码头/坞/车间模型 ====================
type DockWithAttendance = DockInfo & { activeAttendance?: { workerCount: number; currentHours: number }[] }

function dockWorldPos(dock: DockWithAttendance): [number, number, number] {
  const isWorkshop = dock.type === "workshop"
  const isDock = dock.type === "dock"
  const x = (dock.positionX / 50) * 50
  const z = isWorkshop ? -20 : isDock ? -8 - dock.depth * 0.15 : 5 + dock.depth * 0.1
  return [x, 0, z]
}

function dockSize(dock: DockWithAttendance): [number, number, number] {
  const isWorkshop = dock.type === "workshop"
  const isDock = dock.type === "dock"
  return [Math.max(2, dock.width * 0.5), isWorkshop ? 2.5 : isDock ? 1.5 : 0.6, Math.max(3, dock.depth * 0.4)]
}

function DockModel({ dock, isSelected, onClick, onContextMenu, editTool }: {
  dock: DockWithAttendance; isSelected: boolean; onClick: () => void
  onContextMenu?: (e: { worldX: number; worldZ: number }) => void; editTool: string
}) {
  const isWorkshop = dock.type === "workshop"
  const isDock = dock.type === "dock"
  const color = statusToColor(dock.status, "dock")
  const [wx, , wz] = dockWorldPos(dock)
  const [w, h, d] = dockSize(dock)
  const typeLabel = isWorkshop ? "车间" : isDock ? "坞" : dock.type === "warehouse" ? "仓库" : "泊位"
  const totalWorkers = (dock.activeAttendance ?? []).reduce((s, a) => s + a.workerCount, 0)

  return (
    <group position={[wx, 0, wz]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onContextMenu={(e) => { e.stopPropagation(); onContextMenu?.({ worldX: wx, worldZ: wz }) }}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={isWorkshop ? "#8B7355" : color} roughness={0.5} metalness={isWorkshop ? 0.1 : 0.3} />
      </mesh>
      {isWorkshop && (
        <mesh position={[0, h + 1, 0]} castShadow>
          <coneGeometry args={[Math.max(w, d) * 0.7, 1.2, 4]} />
          <meshStandardMaterial color="#C0392B" roughness={0.6} />
        </mesh>
      )}
      {isSelected && (
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[w + 0.5, h + 0.3, d + 0.5]} />
          <meshBasicMaterial color={editTool === "resize" ? "#00FF00" : "#FFD700"} transparent opacity={0.2} />
        </mesh>
      )}
      {/* 缩放模式手柄 */}
      {isSelected && editTool === "resize" && <ResizeHandles position={[0, h / 2, 0]} size={[w, h, d]} onResize={() => {}} />}
      <Html position={[0, (isWorkshop ? h + 1.5 : h) + 0.6, 0]} center distanceFactor={30}>
        <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none">
          <div className="text-[10px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded" style={{ backgroundColor: isWorkshop ? "#8B7355DD" : color + "CC", color: "white" }}>{dock.name}{typeLabel}</div>
          {totalWorkers > 0 && <div className="text-[9px] font-bold text-green-400 bg-black/60 px-1 rounded">👥 {totalWorkers}人作业中</div>}
        </div>
      </Html>
    </group>
  )
}

// ==================== 船舶模型 ====================
function ShipModel({ ship, isSelected, onClick, editMode }: { ship: ShipSceneInfo; isSelected: boolean; onClick: () => void; editMode: boolean }) {
  const color = statusToColor(ship.status, "ship")
  const l = Math.max(1.5, Number(ship.length) * 0.4)
  const w = Math.max(0.8, Number(ship.width) * 0.2)
  const hullHeight = 0.6
  const x = ship.positionX != null ? (ship.positionX / 50) * 50 : 0
  const z = ship.positionZ != null ? (ship.positionZ / 30) * 30 + 5 : 10
  const rotation = ship.rotation != null ? THREE.MathUtils.degToRad(ship.rotation) : 0

  const hullShape = useMemo(() => {
    const shape = new THREE.Shape(); const hw = w / 2; const hl = l / 2
    shape.moveTo(hl, 0); shape.lineTo(hl * 0.3, -hw); shape.lineTo(-hl * 0.9, -hw * 0.7)
    shape.lineTo(-hl, 0); shape.lineTo(-hl * 0.9, hw * 0.7); shape.lineTo(hl * 0.3, hw); shape.closePath()
    return shape
  }, [l, w])
  const extrudeSettings = useMemo(() => ({ steps: 1, depth: hullHeight, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 }), [hullHeight])
  const totalWorkers = (ship.activeAttendance ?? []).reduce((s, a) => s + a.workerCount, 0)
  const totalManHours = (ship.activeAttendance ?? []).reduce((s, a) => s + a.currentHours * a.workerCount, 0)

  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow><extrudeGeometry args={[hullShape, extrudeSettings]} /><meshStandardMaterial color={color} roughness={0.4} metalness={0.4} transparent opacity={0.9} /></mesh>
      <mesh position={[-l * 0.05, hullHeight, 0]} castShadow><boxGeometry args={[l * 0.35, hullHeight * 0.8, w * 0.5]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
      {isSelected && <mesh position={[0, hullHeight / 2, 0]}><ringGeometry args={[Math.max(w, l) * 0.7, Math.max(w, l) * 0.8, 32]} /><meshBasicMaterial color="#FFD700" transparent opacity={0.5} side={THREE.DoubleSide} /></mesh>}
      {editMode && isSelected && <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[Math.max(w, l) * 0.85, Math.max(w, l) * 0.9, 32]} /><meshBasicMaterial color="#00FF00" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>}
      <Html position={[0, hullHeight + 1.2, 0]} center distanceFactor={30}>
        <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none">
          <div className={`text-[9px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded ${isSelected ? "scale-110 text-[10px]" : ""}`} style={{ backgroundColor: color + "DD", color: "white" }}>{ship.name}</div>
          {totalWorkers > 0 && <div className="text-[8px] font-medium text-green-300 bg-black/60 px-1 rounded whitespace-nowrap">👥{totalWorkers}人 ⏱{totalManHours.toFixed(1)}h</div>}
        </div>
      </Html>
    </group>
  )
}

// ==================== 拖拽辅助 ====================
type DragTarget = { type: "ship"; id: number } | { type: "dock"; id: number } | null

function DragPlane({ enabled, onDrag }: { enabled: boolean; onDrag: (x: number, z: number) => void }) {
  const { camera } = useThree()
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const dragging = useRef(false)

  return enabled ? (
    <mesh position={[0, 0.01, 5]} rotation={[-Math.PI / 2, 0, 0]} visible={false}
      onPointerDown={() => { dragging.current = true }}
      onPointerMove={(e) => {
        if (!dragging.current) return
        const rc = new THREE.Raycaster()
        rc.setFromCamera(new THREE.Vector2(((e as unknown as MouseEvent).clientX / window.innerWidth) * 2 - 1, -((e as unknown as MouseEvent).clientY / window.innerHeight) * 2 + 1), camera)
        const pt = new THREE.Vector3()
        if (rc.ray.intersectPlane(plane, pt)) onDrag(pt.x, pt.z)
      }}
      onPointerUp={() => { dragging.current = false }}>
      <planeGeometry args={[120, 80]} /><meshBasicMaterial transparent opacity={0} />
    </mesh>
  ) : null
}

// ==================== 相机 ====================
function SceneCamera() {
  return <OrbitControls target={[0, 0, 5]} minPolarAngle={0.3} maxPolarAngle={Math.PI / 2.2} minDistance={15} maxDistance={100} enableDamping dampingFactor={0.1} />
}

function GridHelper3D() {
  return (<><gridHelper args={[120, 40, "#E0D5C5", "#E0D5C5"]} position={[0, -0.49, -8]} /><gridHelper args={[120, 40, "#87CEEB33", "#87CEEB33"]} position={[0, -0.29, 15]} /></>)
}

// ==================== 主场景 ====================
interface SceneModelProps {
  docks: DockWithAttendance[]
  ships: ShipSceneInfo[]
  selectedShip: ShipSceneInfo | null
  selectedDock: DockWithAttendance | null
  onSelectShip: (ship: ShipSceneInfo | null) => void
  onSelectDock: (dock: DockInfo | null) => void
  editMode: boolean
  editTool: string
  onShipDragEnd?: (shipId: number, x: number, z: number) => void
  onDockDragEnd?: (dockId: number, x: number, z: number) => void
  onContextMenu?: (e: { clientX: number; clientY: number; worldX: number; worldZ: number }) => void
  onDockResize?: (dockId: number, w: number, d: number) => void
  settings?: SceneSettingsInfo | null
}

export function SceneModel({ docks, ships, selectedShip, selectedDock, onSelectShip, onSelectDock, editMode, editTool, onShipDragEnd, onDockDragEnd, onContextMenu, settings }: SceneModelProps) {
  const s = settings || DEFAULT_SETTINGS
  const [dragTarget, setDragTarget] = useState<DragTarget>(null)

  const handleDrag = useCallback((x: number, z: number) => {
    if (!dragTarget) return
    if (dragTarget.type === "ship" && onShipDragEnd) {
      onShipDragEnd(dragTarget.id, Math.round(x * 100) / 100, Math.round(((z - 5) / 30) * 30 * 100) / 100)
    } else if (dragTarget.type === "dock" && onDockDragEnd) {
      onDockDragEnd(dragTarget.id, Math.round(x * 100) / 100, Math.round(z * 100) / 100)
    }
    setDragTarget(null)
  }, [dragTarget, onShipDragEnd, onDockDragEnd])

  // 右键处理：记录世界坐标
  const handlePointerMissed = useCallback((e: MouseEvent) => {
    if (!editMode || !onContextMenu) return
    const canvas = document.querySelector("canvas"); if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    // 只处理右键
    onContextMenu({ clientX: e.clientX, clientY: e.clientY, worldX: 0, worldZ: 0 })
  }, [editMode, onContextMenu])

  return (
    <div style={{ width: "100%", height: "100%" }} onContextMenu={(e) => { if (editMode && onContextMenu) { e.preventDefault(); onContextMenu({ clientX: e.clientX, clientY: e.clientY, worldX: 0, worldZ: 0 }) } }}>
      <Canvas shadows camera={{ position: [0, 45, 40], fov: 45, near: 0.5, far: 200 }}>
        <color attach="background" args={[s.bgColor]} />
        <fog attach="fog" args={[s.bgColor, s.fogNear, s.fogFar]} />
        <SceneLights settings={s} />
        <Ground z={s.coastlineZ} />
        <Coastline z={s.coastlineZ} />
        <WaterSurface settings={s} />
        <GridHelper3D />

        {docks.map((dock) => (
          <DockModel key={`dock-${dock.id}`} dock={dock} isSelected={selectedDock?.id === dock.id} editTool={editTool}
            onClick={() => {
              if (editMode && editTool === "move" && selectedDock?.id === dock.id) { setDragTarget({ type: "dock", id: dock.id }) }
              else if (editMode && editTool === "delete") { /* handled by parent */ onSelectDock(dock) }
              else { onSelectDock(selectedDock?.id === dock.id ? null : dock) }
            }}
            onContextMenu={({ worldX, worldZ }) => { onSelectDock(dock); onContextMenu?.({ clientX: 0, clientY: 0, worldX, worldZ }) }}
          />
        ))}

        {ships.map((ship) => (
          <ShipModel key={`ship-${ship.id}`} ship={ship} isSelected={selectedShip?.id === ship.id} editMode={editMode}
            onClick={() => {
              if (editMode && selectedShip?.id === ship.id) { setDragTarget({ type: "ship", id: ship.id }) }
              else { onSelectShip(selectedShip?.id === ship.id ? null : ship) }
            }} />
        ))}

        <DragPlane enabled={editMode && dragTarget != null} onDrag={handleDrag} />
        <SceneCamera />
      </Canvas>
    </div>
  )
}
