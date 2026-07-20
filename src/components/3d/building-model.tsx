"use client"

import { Html } from "@react-three/drei"
import * as THREE from "three"

interface BuildingModelProps {
  position: [number, number, number]
  size: [number, number, number] // [width, height, depth]
  type: "workshop" | "warehouse" | "office"
  name: string
  color?: string
  status?: string
  onClick?: () => void
  onContextMenu?: (e: { worldX: number; worldZ: number }) => void
  isSelected?: boolean
}

/**
 * 车间/仓库/办公楼3D模型
 * 车间：蓝灰色主体 + 三角屋顶 + 烟囱
 * 仓库：灰色主体 + 平顶 + 大卷帘门
 */
export function BuildingModel({
  position,
  size,
  type,
  name,
  color,
  status = "available",
  onClick,
  onContextMenu,
  isSelected = false,
}: BuildingModelProps) {
  const [w, h, d] = size
  const [px, , pz] = position

  // 颜色方案
  const wallColor =
    color ??
    (type === "workshop"
      ? "#6B7B8D"
      : type === "warehouse"
        ? "#7B8D9B"
        : "#8FA4B5")
  const roofColor =
    type === "workshop" ? "#C0392B" : type === "warehouse" ? "#5D6D7E" : "#7F8C8D"
  const isWorkshop = type === "workshop"
  const isWarehouse = type === "warehouse"
  const statusColor =
    status === "occupied"
      ? "#E74C3C"
      : status === "available"
        ? "#2ECC71"
        : "#F39C12"

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      onContextMenu={(e) => {
        e.stopPropagation()
        onContextMenu?.({ worldX: px, worldZ: pz })
      }}
    >
      {/* ===== 主体建筑 ===== */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.6}
          metalness={0.15}
        />
      </mesh>

      {/* ===== 车间三角屋顶 ===== */}
      {isWorkshop && (
        <group position={[0, h, 0]}>
          {/* 使用两个倾斜的Box模拟三角屋顶 */}
          <mesh
            position={[0, 0.5, d * 0.2]}
            rotation={[0.25 * Math.PI, 0, 0]}
            castShadow
          >
            <boxGeometry args={[w + 0.3, 0.1, d * 0.7]} />
            <meshStandardMaterial
              color={roofColor}
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>
          <mesh
            position={[0, 0.5, -d * 0.2]}
            rotation={[-0.25 * Math.PI, 0, 0]}
            castShadow
          >
            <boxGeometry args={[w + 0.3, 0.1, d * 0.7]} />
            <meshStandardMaterial
              color={roofColor}
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>
        </group>
      )}

      {/* ===== 仓库平顶（略有突出） ===== */}
      {isWarehouse && (
        <mesh position={[0, h + 0.1, 0]} castShadow>
          <boxGeometry args={[w + 0.4, 0.15, d + 0.4]} />
          <meshStandardMaterial
            color={roofColor}
            roughness={0.5}
            metalness={0.3}
          />
        </mesh>
      )}

      {/* ===== 车间烟囱 ===== */}
      {isWorkshop && (
        <>
          <mesh position={[w * 0.25, h + 1.2, d * 0.2]} castShadow>
            <boxGeometry args={[0.3, 2.0, 0.3]} />
            <meshStandardMaterial
              color="#8B7355"
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          <mesh position={[-w * 0.25, h + 0.8, -d * 0.2]} castShadow>
            <boxGeometry args={[0.25, 1.2, 0.25]} />
            <meshStandardMaterial
              color="#8B7355"
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
        </>
      )}

      {/* ===== 仓库大门（卷帘门提示） ===== */}
      {isWarehouse && (
        <mesh position={[0, h * 0.35, d / 2 + 0.01]} castShadow>
          <boxGeometry args={[w * 0.4, h * 0.6, 0.05]} />
          <meshStandardMaterial
            color="#4A4A4A"
            roughness={0.4}
            metalness={0.5}
          />
        </mesh>
      )}

      {/* ===== 窗户提示（彩色小方块） ===== */}
      {!isWarehouse &&
        [-1, 0, 1].map((i) => (
          <mesh
            key={`win-${i}`}
            position={[w * 0.3 * i, h * 0.6, d / 2 + 0.02]}
          >
            <boxGeometry args={[0.4, 0.5, 0.02]} />
            <meshStandardMaterial
              color="#87CEEB"
              roughness={0.1}
              emissive="#87CEEB"
              emissiveIntensity={0.3}
            />
          </mesh>
        ))}

      {/* ===== 状态指示灯 ===== */}
      <mesh position={[0, h + 0.6, d / 2 + 0.05]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* ===== 选中高亮 ===== */}
      {isSelected && (
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[w + 0.5, h + 0.5, d + 0.5]} />
          <meshBasicMaterial
            color="#00D4FF"
            transparent
            opacity={0.2}
            wireframe
          />
        </mesh>
      )}

      {/* ===== HTML标签 ===== */}
      <Html position={[0, h + 1.0, 0]} center distanceFactor={30}>
        <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none">
          <div
            className="text-[9px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded"
            style={{ backgroundColor: wallColor + "DD", color: "white" }}
          >
            {name}
          </div>
        </div>
      </Html>
    </group>
  )
}
