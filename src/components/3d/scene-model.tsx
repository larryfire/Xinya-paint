"use client"

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, Html } from "@react-three/drei"
import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { useSceneStore } from "@/stores/scene-store"
import { GantryCrane } from "@/components/3d/gantry-crane"
import { BuildingModel } from "@/components/3d/building-model"
import { SceneLights } from "@/components/3d/scene-lights"
import { WaterEffect } from "@/components/3d/water-effect"
import { TerrainGround, getTerrainConfig } from "@/components/3d/terrain-ground"
import { ResizeHandles } from "@/components/3d/editor-tools"
import { SHIP_STATUS_MAP, DOCK_STATUS_MAP } from "@/lib/constants"
import type { DockInfo, ShipSceneInfo } from "@/types"
import * as THREE from "three"

// ==================== 默认设置 ====================
const DEFAULT_SETTINGS = {
  coastlineZ: 0,
  waterOpacity: 0.75,
  ambientIntensity: 0.5,
  bgColor: "#0A1628",
  fogNear: 60,
  fogFar: 200,
}

// ==================== 船舶3D模型 ====================
function ShipModel({
  ship,
  isSelected,
  editMode,
  onClick,
}: {
  ship: ShipSceneInfo
  isSelected: boolean
  editMode: boolean
  onClick: () => void
}) {
  const color =
    SHIP_STATUS_MAP[ship.status as keyof typeof SHIP_STATUS_MAP]?.color ??
    "#95A5A6"
  const l = Math.max(1.5, Number(ship.length) * 0.35)
  const w = Math.max(0.8, Number(ship.width) * 0.18)
  const hullHeight = 0.55
  const x =
    ship.positionX != null ? (ship.positionX / 50) * 50 : 0
  const z =
    ship.positionZ != null ? (ship.positionZ / 30) * 30 + 3 : 8
  const rotation =
    ship.rotation != null
      ? THREE.MathUtils.degToRad(ship.rotation)
      : 0

  // 船体形状
  const hullShape = useMemo(() => {
    const shape = new THREE.Shape()
    const hw = w / 2
    const hl = l / 2
    shape.moveTo(hl, 0)
    shape.lineTo(hl * 0.3, -hw)
    shape.lineTo(-hl * 0.9, -hw * 0.7)
    shape.lineTo(-hl, 0)
    shape.lineTo(-hl * 0.9, hw * 0.7)
    shape.lineTo(hl * 0.3, hw)
    shape.closePath()
    return shape
  }, [l, w])
  const extrudeSettings = useMemo(
    () => ({
      steps: 1,
      depth: hullHeight,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
    }),
    [hullHeight]
  )

  const totalWorkers = (ship.activeAttendance ?? []).reduce(
    (s, a) => s + a.workerCount,
    0
  )
  const totalManHours = (ship.activeAttendance ?? []).reduce(
    (s, a) => s + a.currentHours * a.workerCount,
    0
  )

  return (
    <group
      position={[x, 0, z]}
      rotation={[0, rotation, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {/* 船体 */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[hullShape, extrudeSettings]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.35}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* 上层建筑/甲板室 */}
      <mesh position={[-l * 0.1, hullHeight, 0]} castShadow>
        <boxGeometry args={[l * 0.4, hullHeight * 0.7, w * 0.45]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>

      {/* 烟囱 */}
      <mesh position={[-l * 0.15, hullHeight + 1.0, w * 0.1]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 1.2, 8]} />
        <meshStandardMaterial
          color="#4A4A4A"
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>

      {/* 桅杆 */}
      <mesh position={[-l * 0.25, hullHeight + 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
        <meshStandardMaterial color="#CCCCCC" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* 选中高亮环 */}
      {isSelected && (
        <mesh
          position={[0, hullHeight / 2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry
            args={[Math.max(w, l) * 0.65, Math.max(w, l) * 0.75, 32]}
          />
          <meshBasicMaterial
            color="#00D4FF"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 编辑模式高亮 */}
      {editMode && isSelected && (
        <mesh
          position={[0, -0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry
            args={[Math.max(w, l) * 0.8, Math.max(w, l) * 0.85, 32]}
          />
          <meshBasicMaterial
            color="#00FF88"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* HTML标签 */}
      <Html position={[0, hullHeight + 1.8, 0]} center distanceFactor={30}>
        <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none">
          <div
            className={`text-[9px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded ${
              isSelected ? "scale-110 text-[10px]" : ""
            }`}
            style={{ backgroundColor: color + "DD", color: "white" }}
          >
            {ship.name}
          </div>
          {totalWorkers > 0 && (
            <div className="text-[8px] font-medium text-green-300 bg-black/60 px-1 rounded whitespace-nowrap">
              👥{totalWorkers}人 ⏱{totalManHours.toFixed(1)}工时
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}

// ==================== 船坞/码头模型 ====================
function DockModel({
  dock,
  isSelected,
  editTool,
  onClick,
  onContextMenu,
}: {
  dock: DockInfo & {
    activeAttendance?: { workerCount: number; currentHours: number }[]
  }
  isSelected: boolean
  editTool: string
  onClick: () => void
  onContextMenu?: (e: { worldX: number; worldZ: number }) => void
}) {
  const isDock = dock.type === "dock"
  const color =
    DOCK_STATUS_MAP[dock.status as keyof typeof DOCK_STATUS_MAP]?.color ??
    "#95A5A6"
  const wx = (dock.positionX / 50) * 50
  const wz = (dock.positionZ / 30) * 30
  const w = Math.max(2, dock.width * 0.5)
  const d = Math.max(3, dock.depth * 0.4)
  const h = isDock ? 1.2 : 0.5
  const totalWorkers = (dock.activeAttendance ?? []).reduce(
    (s, a) => s + a.workerCount,
    0
  )

  return (
    <group position={[wx, 0, wz]}>
      {/* 主体 */}
      <mesh
        position={[0, h / 2, 0]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onContextMenu={(e) => {
          e.stopPropagation()
          onContextMenu?.({ worldX: wx, worldZ: wz })
        }}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={isDock ? color : "#6B6B6B"}
          roughness={isDock ? 0.5 : 0.7}
          metalness={isDock ? 0.3 : 0.1}
        />
      </mesh>

      {/* 船坞墙（U型结构） */}
      {isDock && (
        <>
          <mesh position={[w / 2, 0.8, 0]} castShadow>
            <boxGeometry args={[0.3, 1.2, d]} />
            <meshStandardMaterial
              color="#888888"
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>
          <mesh position={[-w / 2, 0.8, 0]} castShadow>
            <boxGeometry args={[0.3, 1.2, d]} />
            <meshStandardMaterial
              color="#888888"
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>
          <mesh position={[0, 0.8, d / 2]} castShadow>
            <boxGeometry args={[w, 1.2, 0.3]} />
            <meshStandardMaterial
              color="#888888"
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>
        </>
      )}

      {/* 选中高亮 */}
      {isSelected && (
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[w + 0.5, h + 0.3, d + 0.5]} />
          <meshBasicMaterial
            color={editTool === "resize" ? "#00FF88" : "#00D4FF"}
            transparent
            opacity={0.2}
          />
        </mesh>
      )}

      {/* 缩放模式手柄 */}
      {isSelected && editTool === "resize" && (
        <ResizeHandles
          position={[0, h / 2, 0]}
          size={[w, h, d]}
          onResize={() => {}}
        />
      )}

      {/* HTML标签 */}
      <Html position={[0, h + 0.5, 0]} center distanceFactor={30}>
        <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none">
          <div
            className="text-[10px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded"
            style={{ backgroundColor: color + "CC", color: "white" }}
          >
            {dock.name}
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

// ==================== 相机控制器 ====================
function SceneCamera({ factoryId }: { factoryId: number }) {
  const controlsRef = useRef<any>(null)

  // 厂区切换时平滑过渡相机
  const targetPos = useMemo(() => {
    return factoryId === 1
      ? ([0, 35, 28] as [number, number, number])
      : ([5, 30, 25] as [number, number, number])
  }, [factoryId])

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(...targetPos)
    }
  }, [targetPos])

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 0, 5]}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2.3}
      minDistance={12}
      maxDistance={80}
      enableDamping
      dampingFactor={0.08}
    />
  )
}

// ==================== 网格参考线 ====================
function GridHelper3D({ factoryId }: { factoryId: number }) {
  const config = getTerrainConfig(factoryId as 1 | 2)
  return (
    <>
      <gridHelper
        args={[config.groundSize[0], 40, "#1A2A1A", "#1A2A1A"]}
        position={[0, -0.49, config.groundZ]}
      />
      <gridHelper
        args={[config.groundSize[0], 40, "#0A3D5C33", "#0A3D5C33"]}
        position={[0, -0.29, config.waterZ]}
      />
    </>
  )
}

// ==================== 拖拽平面 ====================
type DragTarget =
  | { type: "ship"; id: number }
  | { type: "dock"; id: number }
  | null

function DragPlane({
  enabled,
  onDrag,
}: {
  enabled: boolean
  onDrag: (x: number, z: number) => void
}) {
  const { camera } = useThree()
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    []
  )
  const dragging = useRef(false)

  if (!enabled) return null

  return (
    <mesh
      position={[0, 0.01, 5]}
      rotation={[-Math.PI / 2, 0, 0]}
      visible={false}
      onPointerDown={() => {
        dragging.current = true
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return
        const rc = new THREE.Raycaster()
        rc.setFromCamera(
          new THREE.Vector2(
            ((e as unknown as MouseEvent).clientX / window.innerWidth) * 2 - 1,
            -((e as unknown as MouseEvent).clientY / window.innerHeight) * 2 +
              1
          ),
          camera
        )
        const pt = new THREE.Vector3()
        if (rc.ray.intersectPlane(plane, pt)) onDrag(pt.x, pt.z)
      }}
      onPointerUp={() => {
        dragging.current = false
      }}
    >
      <planeGeometry args={[120, 80]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

// ==================== 主场景组件 ====================
interface SceneModelProps {
  editMode: boolean
  editTool: string
  onShipDragEnd?: (shipId: number, x: number, z: number) => void
  onDockDragEnd?: (dockId: number, x: number, z: number) => void
  onContextMenu?: (e: {
    clientX: number
    clientY: number
    worldX: number
    worldZ: number
  }) => void
}

export function SceneModel({
  editMode,
  editTool,
  onShipDragEnd,
  onDockDragEnd,
  onContextMenu,
}: SceneModelProps) {
  const ships = useSceneStore((s) => s.ships)
  const docks = useSceneStore((s) => s.docks)
  const gantryCranes = useSceneStore((s) => s.gantryCranes)
  const selectedShip = useSceneStore((s) => s.selectedShip)
  const selectedDock = useSceneStore((s) => s.selectedDock)
  const selectShip = useSceneStore((s) => s.selectShip)
  const selectDock = useSceneStore((s) => s.selectDock)
  const currentFactory = useSceneStore((s) => s.currentFactory)
  const sceneSettings = useSceneStore((s) => s.sceneSettings)
  const ctxMenu = useSceneStore((s) => s.ctxMenu)
  const setCtxMenu = useSceneStore((s) => s.setCtxMenu)

  const s = sceneSettings || DEFAULT_SETTINGS
  const [dragTarget, setDragTarget] = useState<DragTarget>(null)

  const handleDrag = useCallback(
    (x: number, z: number) => {
      if (!dragTarget) return
      if (dragTarget.type === "ship" && onShipDragEnd) {
        onShipDragEnd(
          dragTarget.id,
          Math.round(x * 100) / 100,
          Math.round((z - 3) / 30) * 30
        )
      } else if (dragTarget.type === "dock" && onDockDragEnd) {
        onDockDragEnd(
          dragTarget.id,
          Math.round(x * 100) / 100,
          Math.round(z * 100) / 100
        )
      }
      setDragTarget(null)
    },
    [dragTarget, onShipDragEnd, onDockDragEnd]
  )

  // 为每个厂区生成门机位置（基于船坞位置）
  const cranePositions = useMemo(() => {
    if (gantryCranes.length > 0) {
      return gantryCranes.map((gc) => ({
        id: gc.id,
        name: gc.name,
        position: [gc.positionX, 0, gc.positionZ] as [number, number, number],
        rotation: gc.rotation,
        status: gc.status,
        dockId: gc.dockId,
        seaDirection: (currentFactory === 2 ? "east" : "north") as
          | "north"
          | "east",
      }))
    }

    // 自动生成门机（基于船坞位置）
    const dockDocks = docks.filter((d) => d.type === "dock")
    const positions: {
      id: number
      name: string
      position: [number, number, number]
      rotation: number
      status: string
      dockId: number | null
      seaDirection: "north" | "east"
    }[] = []

    dockDocks.forEach((dock, idx) => {
      const dx = (dock.positionX / 50) * 50
      const dz = (dock.positionZ / 30) * 30
      const seaDir = currentFactory === 2 ? "east" : "north"

      // 每个船坞配2台门机（左右各一）
      positions.push({
        id: -(idx * 2 + 1),
        name: `门机${idx * 2 + 1}`,
        position: [dx - 4, 0, dz - 1] as [number, number, number],
        rotation: 0,
        status: dock.status === "available" ? "active" : "idle",
        dockId: dock.id,
        seaDirection: seaDir,
      })
      positions.push({
        id: -(idx * 2 + 2),
        name: `门机${idx * 2 + 2}`,
        position: [dx + 4, 0, dz - 1] as [number, number, number],
        rotation: 0,
        status: dock.status === "available" ? "active" : "idle",
        dockId: dock.id,
        seaDirection: seaDir,
      })
    })

    return positions
  }, [gantryCranes, docks, currentFactory])

  return (
    <div
      style={{ width: "100%", height: "100%" }}
      onContextMenu={(e) => {
        if (editMode && onContextMenu) {
          e.preventDefault()
          onContextMenu({
            clientX: e.clientX,
            clientY: e.clientY,
            worldX: 0,
            worldZ: 0,
          })
        }
      }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 35, 28], fov: 50, near: 0.5, far: 250 }}
      >
        {/* 背景和雾 */}
        <color attach="background" args={[s.bgColor]} />
        <fog attach="fog" args={[s.bgColor, s.fogNear, s.fogFar]} />

        {/* 灯光 */}
        <SceneLights ambientIntensity={s.ambientIntensity} />

        {/* 地形 */}
        <TerrainGround
          factoryId={currentFactory}
          coastlineZ={s.coastlineZ}
        />

        {/* 水面 */}
        <WaterEffect
          opacity={s.waterOpacity}
          color={currentFactory === 2 ? "#0A3550" : "#0A3D5C"}
          position={[
            0,
            -0.3,
            currentFactory === 2
              ? getTerrainConfig(2).waterZ
              : getTerrainConfig(1).waterZ,
          ]}
        />

        {/* 网格参考线 */}
        <GridHelper3D factoryId={currentFactory} />

        {/* 门座式起重机 */}
        {cranePositions.map((cp) => (
          <GantryCrane
            key={`crane-${cp.id}`}
            position={cp.position}
            rotation={cp.rotation}
            name={cp.name}
            status={cp.status as "active" | "maintenance" | "idle"}
            seaDirection={cp.seaDirection}
            onClick={() => {
              // 门机点击暂不处理，后续可扩展
            }}
          />
        ))}

        {/* 车间/仓库 */}
        {docks
          .filter((d) => d.type === "workshop" || d.type === "warehouse")
          .map((dock) => (
            <BuildingModel
              key={`building-${dock.id}`}
              position={[
                (dock.positionX / 50) * 50,
                0,
                (dock.positionZ / 30) * 30,
              ]}
              size={[
                Math.max(2, dock.width * 0.5),
                dock.type === "workshop" ? 2.5 : 2.0,
                Math.max(3, dock.depth * 0.4),
              ]}
              type={dock.type as "workshop" | "warehouse" | "office"}
              name={dock.name}
              status={dock.status}
              isSelected={selectedDock?.id === dock.id}
              onClick={() => {
                if (
                  editMode &&
                  editTool === "move" &&
                  selectedDock?.id === dock.id
                ) {
                  setDragTarget({ type: "dock", id: dock.id })
                } else {
                  selectDock(selectedDock?.id === dock.id ? null : dock)
                }
              }}
              onContextMenu={({ worldX, worldZ }) => {
                selectDock(dock)
                setCtxMenu({
                  x: 0,
                  y: 0,
                  wx: worldX,
                  wz: worldZ,
                })
              }}
            />
          ))}

        {/* 船坞/码头设施 */}
        {docks
          .filter((d) => d.type === "dock" || d.type === "berth")
          .map((dock) => (
            <DockModel
              key={`dock-${dock.id}`}
              dock={dock as DockInfo & { activeAttendance?: { workerCount: number; currentHours: number }[] }}
              isSelected={selectedDock?.id === dock.id}
              editTool={editTool}
              onClick={() => {
                if (
                  editMode &&
                  editTool === "move" &&
                  selectedDock?.id === dock.id
                ) {
                  setDragTarget({ type: "dock", id: dock.id })
                } else {
                  selectDock(selectedDock?.id === dock.id ? null : dock)
                }
              }}
              onContextMenu={({ worldX, worldZ }) => {
                selectDock(dock)
                setCtxMenu({
                  x: 0,
                  y: 0,
                  wx: worldX,
                  wz: worldZ,
                })
              }}
            />
          ))}

        {/* 船舶 */}
        {ships.map((ship) => (
          <ShipModel
            key={`ship-${ship.id}`}
            ship={ship}
            isSelected={selectedShip?.id === ship.id}
            editMode={editMode}
            onClick={() => {
              if (
                editMode &&
                selectedShip?.id === ship.id
              ) {
                setDragTarget({ type: "ship", id: ship.id })
              } else {
                selectShip(selectedShip?.id === ship.id ? null : ship)
              }
            }}
          />
        ))}

        {/* 拖拽平面 */}
        <DragPlane
          enabled={editMode && dragTarget != null}
          onDrag={handleDrag}
        />

        {/* 相机控制 */}
        <SceneCamera factoryId={currentFactory} />
      </Canvas>
    </div>
  )
}
