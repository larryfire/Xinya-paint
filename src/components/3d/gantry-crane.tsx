"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import * as THREE from "three"

interface GantryCraneProps {
  position: [number, number, number]
  rotation?: number
  name?: string
  status?: "active" | "maintenance" | "idle"
  onClick?: () => void
  isSelected?: boolean
  seaDirection?: "north" | "east" // 海侧方向，决定吊臂朝向
}

/**
 * 门座式起重机（门机）3D模型
 * 参照舟山鑫亚船舶修造有限公司的门机设计
 * 结构：四柱门架 + 旋转平台 + 吊臂（海侧长/陆侧短） + 司机室 + 配重
 */
export function GantryCrane({
  position,
  rotation = 0,
  name = "门机",
  status = "active",
  onClick,
  isSelected = false,
  seaDirection = "north",
}: GantryCraneProps) {
  const groupRef = useRef<THREE.Group>(null)
  const hookRef = useRef<THREE.Group>(null)

  // 海侧方向：默认北(Z+)，L型厂区时东(X+)
  const boomDir = seaDirection === "north" ? [0, 0, 1] : [1, 0, 0]
  const boomAngle = seaDirection === "north" ? 0 : Math.PI / 2

  // 颜色根据状态
  const mainColor =
    status === "active"
      ? "#F39C12"
      : status === "maintenance"
        ? "#E74C3C"
        : "#95A5A6"
  const metalColor = "#5D6D7E"
  const darkMetal = "#3D3D3D"

  // 吊钩动画
  useFrame((_state, delta) => {
    if (hookRef.current && status === "active") {
      // 模拟吊钩轻微上下摆动
      hookRef.current.position.y =
        -2.5 + Math.sin(Date.now() * 0.002) * 0.3
    }
  })

  const boomLength = 4.5 // 海侧吊臂长
  const counterLength = 1.5 // 陆侧配重臂长
  const legHeight = 3.5 // 门架腿高度
  const legSpanX = 2.8 // 门架X向跨度
  const legSpanZ = 2.0 // 门架Z向跨度

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotation + boomAngle, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      {/* ===== 门架底座横梁 ===== */}
      {/* 底部横梁 X方向 */}
      <mesh position={[legSpanX / 2, 0.15, 0]} castShadow>
        <boxGeometry args={[0.3, 0.3, legSpanZ]} />
        <meshStandardMaterial color={darkMetal} roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[-legSpanX / 2, 0.15, 0]} castShadow>
        <boxGeometry args={[0.3, 0.3, legSpanZ]} />
        <meshStandardMaterial color={darkMetal} roughness={0.5} metalness={0.7} />
      </mesh>
      {/* 底部横梁 Z方向 */}
      <mesh position={[0, 0.15, legSpanZ / 2]} castShadow>
        <boxGeometry args={[legSpanX, 0.3, 0.3]} />
        <meshStandardMaterial color={darkMetal} roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.15, -legSpanZ / 2]} castShadow>
        <boxGeometry args={[legSpanX, 0.3, 0.3]} />
        <meshStandardMaterial color={darkMetal} roughness={0.5} metalness={0.7} />
      </mesh>

      {/* ===== 四根立柱 ===== */}
      {[
        [legSpanX / 2, legHeight / 2, legSpanZ / 2],
        [legSpanX / 2, legHeight / 2, -legSpanZ / 2],
        [-legSpanX / 2, legHeight / 2, legSpanZ / 2],
        [-legSpanX / 2, legHeight / 2, -legSpanZ / 2],
      ].map((pos, i) => (
        <mesh key={`leg-${i}`} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.25, legHeight, 0.25]} />
          <meshStandardMaterial
            color={mainColor}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>
      ))}

      {/* ===== 顶部横梁框架 ===== */}
      <mesh position={[legSpanX / 2, legHeight + 0.15, 0]} castShadow>
        <boxGeometry args={[0.3, 0.3, legSpanZ]} />
        <meshStandardMaterial color={darkMetal} roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[-legSpanX / 2, legHeight + 0.15, 0]} castShadow>
        <boxGeometry args={[0.3, 0.3, legSpanZ]} />
        <meshStandardMaterial color={darkMetal} roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0, legHeight + 0.15, legSpanZ / 2]} castShadow>
        <boxGeometry args={[legSpanX, 0.3, 0.3]} />
        <meshStandardMaterial color={darkMetal} roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0, legHeight + 0.15, -legSpanZ / 2]} castShadow>
        <boxGeometry args={[legSpanX, 0.3, 0.3]} />
        <meshStandardMaterial color={darkMetal} roughness={0.5} metalness={0.7} />
      </mesh>

      {/* ===== 旋转平台底座 ===== */}
      <mesh position={[0, legHeight + 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.9, 1.0, 0.4, 24]} />
        <meshStandardMaterial color={metalColor} roughness={0.3} metalness={0.8} />
      </mesh>

      {/* ===== 塔身 ===== */}
      <mesh position={[0, legHeight + 1.8, 0]} castShadow>
        <boxGeometry args={[0.7, 2.0, 0.7]} />
        <meshStandardMaterial color={mainColor} roughness={0.4} metalness={0.6} />
      </mesh>

      {/* ===== 机房 ===== */}
      <mesh position={[0, legHeight + 3.0, 0]} castShadow>
        <boxGeometry args={[1.4, 0.6, 1.2]} />
        <meshStandardMaterial color={metalColor} roughness={0.3} metalness={0.7} />
      </mesh>

      {/* ===== 吊臂（海侧，长） ===== */}
      <mesh
        position={[0, legHeight + 3.0, boomLength / 2 + 0.6]}
        castShadow
      >
        <boxGeometry args={[0.4, 0.3, boomLength]} />
        <meshStandardMaterial color={mainColor} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* 吊臂尖端 */}
      <mesh
        position={[0, legHeight + 3.0, boomLength + 0.4]}
        castShadow
      >
        <boxGeometry args={[0.3, 0.2, 0.4]} />
        <meshStandardMaterial color={darkMetal} roughness={0.5} metalness={0.7} />
      </mesh>

      {/* ===== 配重臂（陆侧，短） ===== */}
      <mesh
        position={[0, legHeight + 3.0, -counterLength / 2 - 0.6]}
        castShadow
      >
        <boxGeometry args={[0.4, 0.3, counterLength]} />
        <meshStandardMaterial color={metalColor} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* 配重箱 */}
      <mesh
        position={[0, legHeight + 2.7, -counterLength - 0.5]}
        castShadow
      >
        <boxGeometry args={[0.8, 0.5, 0.6]} />
        <meshStandardMaterial color={darkMetal} roughness={0.5} metalness={0.8} />
      </mesh>

      {/* ===== 司机室 ===== */}
      <mesh
        position={[0.4, legHeight + 2.5, 1.0]}
        castShadow
      >
        <boxGeometry args={[0.6, 0.55, 0.55]} />
        <meshStandardMaterial
          color="#87CEEB"
          roughness={0.2}
          metalness={0.2}
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* 司机室框架 */}
      <mesh position={[0.4, legHeight + 2.5, 1.0]}>
        <boxGeometry args={[0.62, 0.57, 0.57]} />
        <meshBasicMaterial color={metalColor} wireframe transparent opacity={0.3} />
      </mesh>

      {/* ===== 钢丝绳 ===== */}
      <mesh
        position={[0, legHeight + 2.3, boomLength - 0.3]}
        castShadow
      >
        <cylinderGeometry args={[0.04, 0.04, 2.5, 8]} />
        <meshStandardMaterial color="#2C3E50" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* ===== 吊钩 ===== */}
      <group ref={hookRef} position={[0, -2.5, boomLength - 0.3]}>
        <mesh castShadow>
          <torusGeometry args={[0.25, 0.06, 8, 16]} />
          <meshStandardMaterial color="#E74C3C" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, -0.15, 0]} castShadow>
          <coneGeometry args={[0.12, 0.3, 8]} />
          <meshStandardMaterial color="#E74C3C" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* ===== 选中高亮 ===== */}
      {isSelected && (
        <mesh position={[0, legHeight + 3, 0]}>
          <boxGeometry args={[legSpanX + 1, legHeight + 4, legSpanZ + 1]} />
          <meshBasicMaterial
            color="#00D4FF"
            transparent
            opacity={0.15}
            wireframe
          />
        </mesh>
      )}

      {/* ===== 标签 ===== */}
      <Html position={[0, legHeight + 4.5, 0]} center distanceFactor={30}>
        <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none">
          <div
            className="text-[9px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded"
            style={{ backgroundColor: mainColor + "DD", color: "white" }}
          >
            {name}
          </div>
          {status === "active" && (
            <div className="text-[8px] text-green-400 bg-black/60 px-1 rounded">
              ● 运行中
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}
