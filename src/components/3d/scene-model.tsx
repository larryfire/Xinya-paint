"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Html } from "@react-three/drei"
import { useState, useMemo } from "react"
import type { DockInfo, ShipInfo } from "@/types"
import { SHIP_STATUS_MAP, DOCK_STATUS_MAP } from "@/lib/constants"
import * as THREE from "three"

// ==================== 状态颜色映射 ====================

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
      <directionalLight
        position={[50, 80, 30]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight args={["#87CEEB", "#8B7355", 0.3]} />
    </>
  )
}

// ==================== 水面 ====================

function WaterSurface() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.3, 15]}
      receiveShadow
    >
      <planeGeometry args={[120, 80]} />
      <meshStandardMaterial
        color="#2980B9"
        transparent
        opacity={0.6}
        metalness={0.2}
        roughness={0.3}
      />
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

// ==================== 船坞模型 ====================

function DockModel({
  dock,
  onClick,
}: {
  dock: DockInfo
  onClick?: () => void
}) {
  const isDock = dock.type === "dock"
  const color = statusToColor(dock.status, "dock")

  // 将原始坐标映射到 3D 空间
  const x = (dock.positionX / 50) * 50
  const z = isDock ? -8 - dock.depth * 0.15 : 5 + dock.depth * 0.1
  const w = Math.max(2, dock.width * 0.5)
  const d = Math.max(3, dock.depth * 0.4)
  const h = isDock ? 1.5 : 0.6

  return (
    <group position={[x, 0, z]}>
      {/* 主体 */}
      <mesh
        position={[0, h / 2, 0]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
        }}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* 标签 */}
      <Html position={[0, h + 0.5, 0]} center distanceFactor={30}>
        <div
          className="text-[10px] font-semibold whitespace-nowrap pointer-events-none select-none px-1 rounded"
          style={{ backgroundColor: color + "CC", color: "white" }}
        >
          {dock.name}
          {isDock ? "坞" : "泊位"}
        </div>
      </Html>

      {/* 选中发光环 */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w + 0.3, h + 0.1, d + 0.3]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
    </group>
  )
}

// ==================== 船舶模型 ====================

function ShipModel({
  ship,
  isSelected,
  onClick,
}: {
  ship: ShipInfo
  isSelected: boolean
  onClick: () => void
}) {
  const color = statusToColor(ship.status, "ship")
  const l = Math.max(1.5, Number(ship.length) * 0.4)
  const w = Math.max(0.8, Number(ship.width) * 0.2)
  const hullHeight = 0.6

  // 映射位置
  const x = ship.positionX != null ? (ship.positionX / 50) * 50 : 0
  const z = ship.positionZ != null ? (ship.positionZ / 30) * 30 + 5 : 10
  const rotation = ship.rotation != null ? THREE.MathUtils.degToRad(ship.rotation) : 0

  // 船体形状（使用 Shape 创建船型轮廓）
  const hullShape = useMemo(() => {
    const shape = new THREE.Shape()
    const halfW = w / 2
    const halfL = l / 2

    // 前端尖头
    shape.moveTo(halfL, 0)
    shape.lineTo(halfL * 0.3, -halfW)
    // 后端
    shape.lineTo(-halfL * 0.9, -halfW * 0.7)
    shape.lineTo(-halfL, 0)
    shape.lineTo(-halfL * 0.9, halfW * 0.7)
    shape.lineTo(halfL * 0.3, halfW)
    shape.closePath()

    return shape
  }, [l, w])

  const extrudeSettings = useMemo(
    () => ({
      steps: 1,
      depth: hullHeight,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
    }),
    [hullHeight]
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
          metalness={0.4}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* 上层建筑 */}
      <mesh position={[-l * 0.05, hullHeight, 0]} castShadow>
        <boxGeometry args={[l * 0.35, hullHeight * 0.8, w * 0.5]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>

      {/* 选中高亮 */}
      {isSelected && (
        <mesh position={[0, hullHeight / 2, 0]} rotation={[0, 0, 0]}>
          <ringGeometry args={[Math.max(w, l) * 0.7, Math.max(w, l) * 0.8, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 标签 */}
      <Html position={[0, hullHeight + 0.8, 0]} center distanceFactor={30}>
        <div
          className={`text-[9px] font-bold whitespace-nowrap pointer-events-none select-none px-1 rounded transition-all ${
            isSelected ? "scale-110" : ""
          }`}
          style={{ backgroundColor: color + "DD", color: "white" }}
        >
          {ship.name}
        </div>
      </Html>
    </group>
  )
}

// ==================== 场景相机控制器 ====================

function SceneCamera() {
  return (
    <OrbitControls
      target={[0, 0, 5]}
      minPolarAngle={0.3}
      maxPolarAngle={Math.PI / 2.2}
      minDistance={15}
      maxDistance={100}
      enableDamping
      dampingFactor={0.1}
    />
  )
}

// ==================== 网格参考线 ====================

function GridHelper() {
  return (
    <>
      <gridHelper args={[120, 40, "#E0D5C5", "#E0D5C5"]} position={[0, -0.49, -8]} />
      <gridHelper args={[120, 40, "#87CEEB33", "#87CEEB33"]} position={[0, -0.29, 15]} />
    </>
  )
}

// ==================== 主场景导出 ====================

interface SceneModelProps {
  docks: DockInfo[]
  ships: ShipInfo[]
  selectedShip: ShipInfo | null
  onSelectShip: (ship: ShipInfo | null) => void
}

export function SceneModel({ docks, ships, selectedShip, onSelectShip }: SceneModelProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 45, 40], fov: 45, near: 0.5, far: 200 }}
      style={{ background: "linear-gradient(180deg, #87CEEB 0%, #B0E0E6 40%, #E8D5B7 100%)" }}
    >
      {/* 背景渐变（用颜色近似） */}
      <color attach="background" args={["#D4EAF0"]} />
      <fog attach="fog" args={["#D4EAF0", 40, 120]} />

      <SceneLights />
      <Ground />
      <Coastline />
      <WaterSurface />
      <GridHelper />

      {/* 船坞 */}
      {docks.map((dock) => (
        <DockModel key={`dock-${dock.id}`} dock={dock} />
      ))}

      {/* 船舶 */}
      {ships.map((ship) => (
        <ShipModel
          key={`ship-${ship.id}`}
          ship={ship}
          isSelected={selectedShip?.id === ship.id}
          onClick={() =>
            onSelectShip(selectedShip?.id === ship.id ? null : ship)
          }
        />
      ))}

      <SceneCamera />
    </Canvas>
  )
}
