"use client"

import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, Html } from "@react-three/drei"
import { useState, useMemo, useCallback, useRef } from "react"
import type { DockInfo, ShipSceneInfo } from "@/types"
import { SHIP_STATUS_MAP, DOCK_STATUS_MAP } from "@/lib/constants"
import * as THREE from "three"

// ==================== 颜色工具 ====================

const statusToColor = (status: string, type: "dock" | "ship"): string => {
  if (type === "dock") {
    return DOCK_STATUS_MAP[status as keyof typeof DOCK_STATUS_MAP]?.color || "#95A5A6"
  }
  return SHIP_STATUS_MAP[status as keyof typeof SHIP_STATUS_MAP]?.color || "#95A5A6"
}

// ==================== 场景灯光 ====================

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 80, 30]} intensity={0.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <hemisphereLight args={["#87CEEB", "#8B7355", 0.3]} />
    </>
  )
}

// ==================== 水面 ====================

function WaterSurface() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 15]} receiveShadow>
      <planeGeometry args={[120, 80]} />
      <meshStandardMaterial color="#2980B9" transparent opacity={0.6} metalness={0.2} roughness={0.3} />
    </mesh>
  )
}

// ==================== 陆地 ====================

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -15]} receiveShadow>
      <planeGeometry args={[120, 50]} />
      <meshStandardMaterial color="#D4A574" roughness={0.9} />
    </mesh>
  )
}

// ==================== 海岸线 ====================

function Coastline() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
      <planeGeometry args={[120, 3]} />
      <meshStandardMaterial color="#C4956A" roughness={0.8} />
    </mesh>
  )
}

// ==================== 码头/坞/车间模型 ====================

function DockModel({ dock, onClick, isSelected }: { dock: DockInfo & { activeAttendance?: { workerCount: number; currentHours: number }[] }; onClick?: () => void; isSelected: boolean }) {
  const isDock = dock.type === "dock"
  const isWorkshop = dock.type === "workshop"
  const color = statusToColor(dock.status, "dock")

  const x = (dock.positionX / 50) * 50
  const z = isWorkshop ? -20 : isDock ? -8 - dock.depth * 0.15 : 5 + dock.depth * 0.1
  const w = Math.max(2, dock.width * 0.5)
  const d = Math.max(3, dock.depth * 0.4)
  const h = isWorkshop ? 2.5 : isDock ? 1.5 : 0.6

  const typeLabel = isWorkshop ? "车间" : isDock ? "坞" : dock.type === "warehouse" ? "仓库" : "泊位"
  const totalWorkers = (dock.activeAttendance ?? []).reduce((s, a) => s + a.workerCount, 0)

  return (
    <group position={[x, 0, z]}>
      {/* 主体 */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick?.() }}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={isWorkshop ? "#8B7355" : color} roughness={0.5} metalness={isWorkshop ? 0.1 : 0.3} />
      </mesh>

      {/* 车间屋顶 */}
      {isWorkshop && (
        <mesh position={[0, h + 1, 0]} castShadow>
          <coneGeometry args={[Math.max(w, d) * 0.7, 1.2, 4]} />
          <meshStandardMaterial color="#C0392B" roughness={0.6} />
        </mesh>
      )}

      {/* 发光框 */}
      {isSelected && (
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[w + 0.5, h + 0.3, d + 0.5]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.2} />
        </mesh>
      )}

      {/* 标签 */}
      <Html position={[0, (isWorkshop ? h + 1.5 : h) + 0.6, 0]} center distanceFactor={30}>
        <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none">
          <div className="text-[10px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded" style={{ backgroundColor: isWorkshop ? "#8B7355DD" : color + "CC", color: "white" }}>
            {dock.name}{typeLabel}
          </div>
          {totalWorkers > 0 && (
            <div className="text-[9px] font-bold text-green-400 bg-black/60 px-1 rounded">
              👥 {totalWorkers}人作业中
            </div>
          )}
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
    const shape = new THREE.Shape()
    const halfW = w / 2
    const halfL = l / 2
    shape.moveTo(halfL, 0)
    shape.lineTo(halfL * 0.3, -halfW)
    shape.lineTo(-halfL * 0.9, -halfW * 0.7)
    shape.lineTo(-halfL, 0)
    shape.lineTo(-halfL * 0.9, halfW * 0.7)
    shape.lineTo(halfL * 0.3, halfW)
    shape.closePath()
    return shape
  }, [l, w])

  const extrudeSettings = useMemo(() => ({ steps: 1, depth: hullHeight, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 }), [hullHeight])

  const totalWorkers = (ship.activeAttendance ?? []).reduce((s, a) => s + a.workerCount, 0)
  const totalManHours = (ship.activeAttendance ?? []).reduce((s, a) => s + a.currentHours * a.workerCount, 0)

  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}
      onClick={(e) => { e.stopPropagation(); onClick() }}>
      {/* 船体 */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[hullShape, extrudeSettings]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.4} transparent opacity={0.9} />
      </mesh>

      {/* 上层建筑 */}
      <mesh position={[-l * 0.05, hullHeight, 0]} castShadow>
        <boxGeometry args={[l * 0.35, hullHeight * 0.8, w * 0.5]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>

      {/* 选中高亮 */}
      {isSelected && (
        <mesh position={[0, hullHeight / 2, 0]}>
          <ringGeometry args={[Math.max(w, l) * 0.7, Math.max(w, l) * 0.8, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 编辑模式拖拽指示器 */}
      {editMode && isSelected && (
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(w, l) * 0.85, Math.max(w, l) * 0.9, 32]} />
          <meshBasicMaterial color="#00FF00" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 3D标签 */}
      <Html position={[0, hullHeight + 1.2, 0]} center distanceFactor={30}>
        <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none">
          <div className={`text-[9px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded transition-all ${isSelected ? "scale-110 text-[10px]" : ""}`}
            style={{ backgroundColor: color + "DD", color: "white" }}>
            {ship.name}
          </div>
          {totalWorkers > 0 && (
            <div className="text-[8px] font-medium text-green-300 bg-black/60 px-1 rounded whitespace-nowrap">
              👥{totalWorkers}人 ⏱{totalManHours.toFixed(1)}h
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}

// ==================== 拖拽辅助 ====================

function DragPlane({ enabled, onDrag }: { enabled: boolean; onDrag: (x: number, z: number) => void }) {
  const { camera, gl } = useThree()
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const isDragging = useRef(false)

  const handlePointerDown = useCallback((e: THREE.Event) => {
    if (!enabled) return
    isDragging.current = true
    ;(e.target as HTMLElement)?.setPointerCapture?.((e as unknown as React.PointerEvent).pointerId)
  }, [enabled])

  const handlePointerMove = useCallback((e: THREE.Event) => {
    if (!isDragging.current || !enabled) return
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(
      ((e as unknown as MouseEvent).clientX / window.innerWidth) * 2 - 1,
      -((e as unknown as MouseEvent).clientY / window.innerHeight) * 2 + 1
    )
    raycaster.setFromCamera(mouse, camera)
    const intersection = new THREE.Vector3()
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      onDrag(intersection.x, intersection.z)
    }
  }, [enabled, camera, plane, onDrag])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  if (!enabled) return null

  return (
    <mesh position={[0, 0.01, 5]} rotation={[-Math.PI / 2, 0, 0]} visible={false}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}>
      <planeGeometry args={[120, 80]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

// ==================== 相机控制 ====================

function SceneCamera() {
  return <OrbitControls target={[0, 0, 5]} minPolarAngle={0.3} maxPolarAngle={Math.PI / 2.2} minDistance={15} maxDistance={100} enableDamping dampingFactor={0.1} />
}

// ==================== 网格 ====================

function GridHelper3D() {
  return (
    <>
      <gridHelper args={[120, 40, "#E0D5C5", "#E0D5C5"]} position={[0, -0.49, -8]} />
      <gridHelper args={[120, 40, "#87CEEB33", "#87CEEB33"]} position={[0, -0.29, 15]} />
    </>
  )
}

// ==================== 主场景 ====================

interface SceneModelProps {
  docks: (DockInfo & { activeAttendance?: { workerCount: number; currentHours: number }[] })[]
  ships: ShipSceneInfo[]
  selectedShip: ShipSceneInfo | null
  selectedDock: (DockInfo & { activeAttendance?: { workerCount: number; currentHours: number }[] }) | null
  onSelectShip: (ship: ShipSceneInfo | null) => void
  onSelectDock: (dock: DockInfo | null) => void
  editMode: boolean
  onShipDragEnd?: (shipId: number, x: number, z: number) => void
}

export function SceneModel({ docks, ships, selectedShip, selectedDock, onSelectShip, onSelectDock, editMode, onShipDragEnd }: SceneModelProps) {
  const [draggingShipId, setDraggingShipId] = useState<number | null>(null)

  const handleDrag = useCallback((x: number, z: number) => {
    if (draggingShipId == null || !onShipDragEnd) return
    // 将世界坐标转换回数据库坐标
    const dbX = Math.round((x / 50) * 50 * 100) / 100
    const dbZ = Math.round(((z - 5) / 30) * 30 * 100) / 100
    onShipDragEnd(draggingShipId, dbX, dbZ)
    setDraggingShipId(null)
  }, [draggingShipId, onShipDragEnd])

  return (
    <Canvas shadows camera={{ position: [0, 45, 40], fov: 45, near: 0.5, far: 200 }} style={{ background: "linear-gradient(180deg, #87CEEB 0%, #B0E0E6 40%, #E8D5B7 100%)" }}>
      <color attach="background" args={["#D4EAF0"]} />
      <fog attach="fog" args={["#D4EAF0", 40, 120]} />

      <SceneLights />
      <Ground />
      <Coastline />
      <WaterSurface />
      <GridHelper3D />

      {/* 码头/坞/车间 */}
      {docks.map((dock) => (
        <DockModel key={`dock-${dock.id}`} dock={dock}
          isSelected={selectedDock?.id === dock.id}
          onClick={() => onSelectDock(selectedDock?.id === dock.id ? null : dock)} />
      ))}

      {/* 船舶 */}
      {ships.map((ship) => (
        <ShipModel key={`ship-${ship.id}`} ship={ship}
          isSelected={selectedShip?.id === ship.id}
          editMode={editMode}
          onClick={() => {
            if (editMode && selectedShip?.id === ship.id) {
              setDraggingShipId(ship.id)
            } else {
              onSelectShip(selectedShip?.id === ship.id ? null : ship)
            }
          }} />
      ))}

      {/* 编辑模式拖拽平面 */}
      <DragPlane enabled={editMode && draggingShipId != null} onDrag={handleDrag} />

      <SceneCamera />
    </Canvas>
  )
}
