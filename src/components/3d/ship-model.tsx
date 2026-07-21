"use client"

import { useMemo } from "react"
import { Html } from "@react-three/drei"
import { SHIP_STATUS_MAP } from "@/lib/constants"
import type { ShipSceneInfo } from "@/types"
import * as THREE from "three"

// ==================== 船型配置 ====================

interface ShipTypeConfig {
  /** 船体主色 */
  hullColor: string
  /** 甲板色 */
  deckColor: string
  /** 上层建筑色 */
  superColor: string
  /** 烟囱色 */
  funnelColor: string
  /** 上层建筑位置: forward(船首) | mid(中部) | aft(船尾) */
  bridgePosition: "forward" | "mid" | "aft"
  /** 是否有集装箱堆 */
  hasContainers: boolean
  /** 是否有甲板管道（油轮/化学品船） */
  hasPipes: boolean
  /** 是否有大舱口盖（散货船） */
  hasHatches: boolean
  /** 是否有球鼻艏 */
  hasBulbousBow: boolean
  /** 是否有起重机（工程船） */
  hasCrane: boolean
  /** 烟囱高度倍率 */
  funnelScale: number
  /** 上层建筑层数 */
  bridgeLevels: number
}

const SHIP_TYPE_CONFIGS: Record<string, ShipTypeConfig> = {
  "散货船": {
    hullColor: "#3D5C7A",
    deckColor: "#5A6E7E",
    superColor: "#E8E0D5",
    funnelColor: "#2C3E50",
    bridgePosition: "aft",
    hasContainers: false,
    hasPipes: false,
    hasHatches: true,
    hasBulbousBow: true,
    hasCrane: false,
    funnelScale: 1.0,
    bridgeLevels: 5,
  },
  "油轮": {
    hullColor: "#4A4A5A",
    deckColor: "#5C5C6E",
    superColor: "#F0EDE5",
    funnelColor: "#3A3A4A",
    bridgePosition: "aft",
    hasContainers: false,
    hasPipes: true,
    hasHatches: false,
    hasBulbousBow: true,
    hasCrane: false,
    funnelScale: 0.8,
    bridgeLevels: 4,
  },
  "集装箱船": {
    hullColor: "#2C5F8A",
    deckColor: "#4A7A9E",
    superColor: "#F5F0E8",
    funnelColor: "#1A3A5C",
    bridgePosition: "aft",
    hasContainers: true,
    hasPipes: false,
    hasHatches: false,
    hasBulbousBow: true,
    hasCrane: false,
    funnelScale: 1.3,
    bridgeLevels: 6,
  },
  "化学品船": {
    hullColor: "#4E5D6C",
    deckColor: "#5E6D7C",
    superColor: "#F2EDE4",
    funnelColor: "#3E4D5C",
    bridgePosition: "aft",
    hasContainers: false,
    hasPipes: true,
    hasHatches: false,
    hasBulbousBow: true,
    hasCrane: false,
    funnelScale: 0.75,
    bridgeLevels: 4,
  },
  "液化气船": {
    hullColor: "#3A5A7A",
    deckColor: "#5A7A9A",
    superColor: "#F8F3EA",
    funnelColor: "#2A4A6A",
    bridgePosition: "aft",
    hasContainers: false,
    hasPipes: true,
    hasHatches: false,
    hasBulbousBow: true,
    hasCrane: false,
    funnelScale: 0.7,
    bridgeLevels: 4,
  },
  "客滚船": {
    hullColor: "#F5F5F0",
    deckColor: "#E8E8E0",
    superColor: "#FFFFFF",
    funnelColor: "#2C3E50",
    bridgePosition: "forward",
    hasContainers: false,
    hasPipes: false,
    hasHatches: false,
    hasBulbousBow: true,
    hasCrane: false,
    funnelScale: 1.2,
    bridgeLevels: 3,
  },
  "工程船": {
    hullColor: "#F39C12",
    deckColor: "#E67E22",
    superColor: "#FDEBD0",
    funnelColor: "#D35400",
    bridgePosition: "forward",
    hasContainers: false,
    hasPipes: false,
    hasHatches: false,
    hasBulbousBow: false,
    hasCrane: true,
    funnelScale: 0.6,
    bridgeLevels: 3,
  },
  "军舰": {
    hullColor: "#5D6D7E",
    deckColor: "#6D7D8E",
    superColor: "#7D8D9E",
    funnelColor: "#4D5D6E",
    bridgePosition: "mid",
    hasContainers: false,
    hasPipes: false,
    hasHatches: false,
    hasBulbousBow: true,
    hasCrane: false,
    funnelScale: 0.9,
    bridgeLevels: 4,
  },
}

const DEFAULT_CONFIG: ShipTypeConfig = {
  hullColor: "#4A6A8A",
  deckColor: "#5A7A9A",
  superColor: "#F0EDE5",
  funnelColor: "#3A4A5A",
  bridgePosition: "aft",
  hasContainers: false,
  hasPipes: false,
  hasHatches: false,
  hasBulbousBow: true,
  hasCrane: false,
  funnelScale: 1.0,
  bridgeLevels: 4,
}

// ==================== 辅助函数 ====================

/** 创建船体轮廓 Shape */
function createHullShape(l: number, w: number): THREE.Shape {
  const shape = new THREE.Shape()
  const hl = l / 2 // 半长
  const hw = w / 2 // 半宽

  // 从船尾左舷开始 → 船首 → 船尾右舷 → 闭合
  shape.moveTo(-hl, 0) // 船尾中点

  // 左舷：船尾 → 船首（贝塞尔曲线让船型更自然）
  shape.bezierCurveTo(
    -hl * 0.7, -hw * 0.3,  // 控制点1
    hl * 0.3, -hw * 1.05,   // 控制点2
    hl * 0.85, -hw * 0.15   // 船首左侧
  )

  // 船首尖端
  shape.lineTo(hl, 0) // 船首最前端

  // 右舷：船首 → 船尾（镜像）
  shape.lineTo(hl * 0.85, hw * 0.15)
  shape.bezierCurveTo(
    hl * 0.3, hw * 1.05,
    -hl * 0.7, hw * 0.3,
    -hl, 0
  )

  shape.closePath()
  return shape
}

// ==================== 子组件 ====================

/** 球鼻艏 */
function BulbousBow({ l, hullHeight }: { l: number; hullHeight: number }) {
  return (
    <mesh position={[l / 2 + 0.1, -hullHeight * 0.15, 0]} castShadow>
      <sphereGeometry args={[0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#C0392B" roughness={0.3} metalness={0.4} />
    </mesh>
  )
}

/** 集装箱堆（集装箱船专用） */
function ContainerStacks({ l, w, deckY, count = 6 }: {
  l: number; w: number; deckY: number; count?: number
}) {
  const stacks = useMemo(() => {
    const result: { x: number; z: number; rows: number; cols: number }[] = []
    const spacing = l * 0.55 / count
    const startX = -l * 0.15
    for (let i = 0; i < count; i++) {
      const cols = i % 2 === 0 ? 3 : 2 // 交错排列
      result.push({
        x: startX + i * spacing,
        z: 0,
        rows: 4,
        cols,
      })
    }
    return result
  }, [l, count])

  return (
    <group>
      {stacks.map((stack, si) => (
        <group key={si} position={[stack.x, deckY, 0]}>
          {Array.from({ length: stack.cols }).map((_, ci) => {
            const zOff = (ci - (stack.cols - 1) / 2) * (w * 0.21)
            return (
              <group key={ci} position={[0, 0, zOff]}>
                {Array.from({ length: stack.rows }).map((_, ri) => (
                  <mesh
                    key={ri}
                    position={[0, ri * 0.45 + 0.22, 0]}
                    castShadow
                  >
                    <boxGeometry args={[0.7, 0.42, w * 0.18]} />
                    <meshStandardMaterial
                      color={["#E74C3C", "#2ECC71", "#3498DB", "#F39C12", "#9B59B6", "#1ABC9C"][si % 6]}
                      roughness={0.6}
                      metalness={0.2}
                    />
                  </mesh>
                ))}
              </group>
            )
          })}
        </group>
      ))}
    </group>
  )
}

/** 舱口盖（散货船专用） */
function HatchCovers({ l, w, deckY, count = 5 }: {
  l: number; w: number; deckY: number; count?: number
}) {
  const hatches = useMemo(() => {
    const result: { x: number }[] = []
    const spacing = l * 0.5 / count
    const startX = -l * 0.05
    for (let i = 0; i < count; i++) {
      result.push({ x: startX + i * spacing })
    }
    return result
  }, [l, count])

  return (
    <group>
      {hatches.map((h, i) => (
        <mesh
          key={i}
          position={[h.x, deckY + 0.06, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[l * 0.42 / count, 0.1, w * 0.55]} />
          <meshStandardMaterial color="#5D6D7E" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      {/* 舱口边框 */}
      {hatches.map((h, i) => (
        <mesh key={`rim-${i}`} position={[h.x, deckY + 0.12, 0]}>
          <boxGeometry args={[l * 0.44 / count, 0.03, w * 0.58]} />
          <meshBasicMaterial color="#7D8D9E" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  )
}

/** 甲板管道系统（油轮/化学品船专用） */
function DeckPipes({ l, deckY }: { l: number; deckY: number }) {
  const pipes = useMemo(() => {
    const result: { x: number; z: number }[] = []
    for (let i = 0; i < 12; i++) {
      result.push({
        x: -l * 0.35 + i * (l * 0.7 / 11),
        z: (i % 3 === 0 ? 0.3 : i % 3 === 1 ? -0.3 : 0),
      })
    }
    return result
  }, [l])

  return (
    <group>
      {/* 主管道（纵向） */}
      <mesh position={[0, deckY + 0.15, 0.35]} castShadow>
        <boxGeometry args={[l * 0.7, 0.1, 0.1]} />
        <meshStandardMaterial color="#7F8C8D" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, deckY + 0.15, -0.35]} castShadow>
        <boxGeometry args={[l * 0.7, 0.1, 0.1]} />
        <meshStandardMaterial color="#7F8C8D" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* 支管 */}
      {pipes.map((p, i) => (
        <mesh key={i} position={[p.x, deckY + 0.2, p.z]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
          <meshStandardMaterial color="#95A5A6" roughness={0.2} metalness={0.7} />
        </mesh>
      ))}
      {/* 管汇区（中部） */}
      <mesh position={[0, deckY + 0.25, 0]} castShadow>
        <boxGeometry args={[l * 0.15, 0.15, 1.2]} />
        <meshStandardMaterial color="#E67E22" roughness={0.3} metalness={0.5} />
      </mesh>
    </group>
  )
}

/** 上层建筑/桥楼 */
function Superstructure({
  config,
  l,
  w,
  deckY,
  hullHeight,
}: {
  config: ShipTypeConfig
  l: number
  w: number
  deckY: number
  hullHeight: number
}) {
  const bx = config.bridgePosition === "forward"
    ? l * 0.2
    : config.bridgePosition === "mid"
      ? 0
      : -l * 0.2
  const levels = config.bridgeLevels
  const levelHeight = 0.5
  const totalHeight = levels * levelHeight

  return (
    <group position={[bx, deckY, 0]}>
      {/* 各层甲板室 */}
      {Array.from({ length: levels }).map((_, level) => {
        const lw = level === 0 ? w * 0.55 : w * (0.55 - level * 0.06)
        const ll = level === 0 ? l * 0.22 : l * (0.22 - level * 0.02)
        const y = level * levelHeight + levelHeight / 2

        return (
          <mesh
            key={level}
            position={[0, y, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[Math.max(ll, 0.3), levelHeight, Math.max(lw, 0.5)]} />
            <meshStandardMaterial
              color={config.superColor}
              roughness={0.35}
              metalness={0.08}
            />
          </mesh>
        )
      })}

      {/* 驾驶室窗户（最顶层前方） */}
      <mesh
        position={[l * 0.08, totalHeight - levelHeight * 0.3, 0]}
        castShadow
      >
        <boxGeometry args={[0.05, levelHeight * 0.5, w * 0.3]} />
        <meshStandardMaterial
          color="#87CEEB"
          roughness={0.1}
          metalness={0.1}
          emissive="#87CEEB"
          emissiveIntensity={0.4}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* 侧面窗户 */}
      {[-1, 1].map((side) => (
        <group key={side}>
          {Array.from({ length: levels - 1 }).map((_, li) => (
            <mesh
              key={li}
              position={[0, (li + 1) * levelHeight - levelHeight * 0.25, side * w * 0.28]}
            >
              <boxGeometry args={[l * 0.1, levelHeight * 0.35, 0.03]} />
              <meshStandardMaterial
                color="#87CEEB"
                roughness={0.1}
                emissive="#87CEEB"
                emissiveIntensity={0.3}
                transparent
                opacity={0.5}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* 驾驶室翼桥 */}
      {[-1, 1].map((side) => (
        <mesh
          key={`wing-${side}`}
          position={[l * 0.05, totalHeight - levelHeight * 0.3, side * (w * 0.3 + 0.35)]}
          castShadow
        >
          <boxGeometry args={[0.6, 0.12, 0.6]} />
          <meshStandardMaterial color={config.deckColor} roughness={0.4} />
        </mesh>
      ))}

      {/* 雷达桅杆（最高层顶部） */}
      <group position={[0, totalHeight + 0.3, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.06, 1.2, 8]} />
          <meshStandardMaterial color="#CCCCCC" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* 雷达天线 */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.2, 0.1, 16]} />
          <meshStandardMaterial color="#34495E" roughness={0.2} metalness={0.6} />
        </mesh>
        {/* 横桁 */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.7, 0.03, 0.03]} />
          <meshStandardMaterial color="#95A5A6" roughness={0.3} metalness={0.5} />
        </mesh>
      </group>
    </group>
  )
}

/** 烟囱 */
function Funnel({
  config,
  l,
  w,
  deckY,
  hullHeight,
}: {
  config: ShipTypeConfig
  l: number
  w: number
  deckY: number
  hullHeight: number
}) {
  const fx = config.bridgePosition === "forward"
    ? -l * 0.12
    : config.bridgePosition === "mid"
      ? l * 0.15
      : -l * 0.35
  const fh = 1.8 * config.funnelScale

  return (
    <group position={[fx, deckY, w * 0.15]}>
      {/* 烟囱主体 */}
      <mesh position={[0, fh / 2, 0]} castShadow>
        <boxGeometry args={[0.6, fh, 0.5]} />
        <meshStandardMaterial
          color={config.funnelColor}
          roughness={0.4}
          metalness={0.4}
        />
      </mesh>

      {/* 烟囱顶部斜口 */}
      <mesh
        position={[0, fh + 0.1, 0]}
        rotation={[0.15, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.65, 0.2, 0.55]} />
        <meshStandardMaterial color="#2C3E50" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* 排烟口 */}
      <mesh position={[0, fh + 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 0.15, 8]} />
        <meshStandardMaterial color="#1A1A2E" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* 烟囱标志条纹 */}
      <mesh position={[0, fh * 0.6, 0.26]}>
        <boxGeometry args={[0.62, 0.15, 0.02]} />
        <meshStandardMaterial color="#E74C3C" roughness={0.4} emissive="#E74C3C" emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}

/** 救生艇 */
function Lifeboats({ l, w, deckY }: { l: number; w: number; deckY: number }) {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[-l * 0.15, deckY + 0.3, side * (w / 2 + 0.2)]}
        >
          {/* 吊艇架 */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
            <meshStandardMaterial color="#7F8C8D" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh
            position={[0, 0.6, side * 0.15]}
            rotation={[0, 0, side * 0.3]}
          >
            <boxGeometry args={[0.04, 0.02, 0.3]} />
            <meshStandardMaterial color="#95A5A6" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* 救生艇体 */}
          <mesh position={[0, -0.05, side * 0.25]} castShadow>
            <capsuleGeometry args={[0.15, 0.7, 4, 8]} />
            <meshStandardMaterial color="#F39C12" roughness={0.4} metalness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** 锚 */
function Anchors({ l, w, deckY }: { l: number; w: number; deckY: number }) {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[l * 0.42, deckY - 0.05, side * w * 0.3]}>
          {/* 锚链孔 */}
          <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
            <meshStandardMaterial color="#2C3E50" roughness={0.5} metalness={0.8} />
          </mesh>
          {/* 锚（简化） */}
          <mesh position={[0.25, -0.3, 0]} castShadow>
            <boxGeometry args={[0.3, 0.08, 0.15]} />
            <meshStandardMaterial color="#2C3E50" roughness={0.4} metalness={0.8} />
          </mesh>
          <mesh position={[0.25, -0.3, 0.12]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.06, 0.15, 0.04]} />
            <meshStandardMaterial color="#34495E" roughness={0.4} metalness={0.8} />
          </mesh>
        </group>
      ))}
      {/* 锚机（绞盘） */}
      <mesh position={[l * 0.35, deckY + 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 0.3, 16]} />
        <meshStandardMaterial color="#5D6D7E" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  )
}

/** 螺旋桨和舵 */
function PropellerAndRudder({ l, hullHeight }: { l: number; hullHeight: number }) {
  return (
    <group position={[-l / 2 - 0.1, -hullHeight * 0.4, 0]}>
      {/* 螺旋桨轴 */}
      <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.4, 8]} />
        <meshStandardMaterial color="#7F8C8D" roughness={0.2} metalness={0.9} />
      </mesh>
      {/* 螺旋桨叶片（简化） */}
      {[0, Math.PI / 3, Math.PI * 2 / 3, Math.PI, Math.PI * 4 / 3].map((angle, i) => (
        <mesh
          key={i}
          position={[0.3, 0, 0]}
          rotation={[0, 0, angle]}
          castShadow
        >
          <boxGeometry args={[0.05, 0.25, 0.02]} />
          <meshStandardMaterial color="#F1C40F" roughness={0.2} metalness={0.9} />
        </mesh>
      ))}
      {/* 舵 */}
      <mesh position={[-0.05, hullHeight * 0.3, 0]} castShadow>
        <boxGeometry args={[0.06, hullHeight * 0.7, 0.25]} />
        <meshStandardMaterial color="#5D6D7E" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  )
}

/** 甲板护栏 */
function DeckRailing({ l, w, deckY }: { l: number; w: number; deckY: number }) {
  const posts = useMemo(() => {
    const pts: { x: number; z: number }[] = []
    const count = 20
    for (let i = 0; i <= count; i++) {
      const t = i / count
      // 沿船体轮廓分布
      const x = -l / 2 + t * l
      const zMult = Math.sin(t * Math.PI) * w / 2
      pts.push({ x, z: zMult * 1.05 })
      if (i > 0 && i < count) pts.push({ x, z: -zMult * 1.05 })
    }
    return pts
  }, [l, w])

  return (
    <group>
      {posts.map((p, i) => (
        <mesh key={i} position={[p.x, deckY + 0.3, p.z]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.35, 6]} />
          <meshStandardMaterial color="#BDC3C7" roughness={0.3} metalness={0.5} />
        </mesh>
      ))}
      {/* 横栏 */}
      {[-1, 1].map((side) => (
        <mesh
          key={`rail-${side}`}
          position={[0, deckY + 0.4, side * (w / 2 + 0.05)]}
          castShadow
        >
          <boxGeometry args={[l * 0.85, 0.02, 0.02]} />
          <meshStandardMaterial color="#BDC3C7" roughness={0.3} metalness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/** 工程船起重机 */
function DeckCrane({ l, w, deckY }: { l: number; w: number; deckY: number }) {
  return (
    <group position={[l * 0.1, deckY, 0]}>
      {/* 基座 */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.5, 1.2, 16]} />
        <meshStandardMaterial color="#F39C12" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* 旋转平台 */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.2, 16]} />
        <meshStandardMaterial color="#E67E22" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* 驾驶室 */}
      <mesh position={[0.2, 1.6, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.4]} />
        <meshStandardMaterial color="#87CEEB" roughness={0.2} metalness={0.1} transparent opacity={0.7} />
      </mesh>
      {/* 吊臂 */}
      <mesh position={[0.5, 1.8, 0]} rotation={[0, 0, -0.6]} castShadow>
        <boxGeometry args={[2.5, 0.12, 0.12]} />
        <meshStandardMaterial color="#F39C12" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* 吊钩 */}
      <mesh position={[2.2, 0.8, 0]} castShadow>
        <coneGeometry args={[0.1, 0.3, 8]} />
        <meshStandardMaterial color="#E74C3C" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* 钢丝绳 */}
      <mesh position={[2.2, 1.1, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
        <meshStandardMaterial color="#2C3E50" roughness={0.3} metalness={0.9} />
      </mesh>
    </group>
  )
}

// ==================== 主组件 ====================

interface ShipModelProps {
  ship: ShipSceneInfo
  isSelected: boolean
  editMode: boolean
  onClick: () => void
}

/**
 * 高细节程序化船舶3D模型
 *
 * 根据船型自动选择不同的结构配置：
 * - 散货船：大舱口盖 + 后置桥楼
 * - 油轮/化学品船：甲板管道 + 后置桥楼
 * - 集装箱船：彩色集装箱堆 + 高大后置桥楼
 * - 客滚船：前置桥楼 + 白色涂装
 * - 工程船：亮色 + 甲板起重机
 * - 军舰：灰色 + 中部桥楼
 *
 * 所有模型均为程序化生成（无需外部3D模型文件）
 */
export function ShipModel({
  ship,
  isSelected,
  editMode,
  onClick,
}: ShipModelProps) {
  const color =
    SHIP_STATUS_MAP[ship.status as keyof typeof SHIP_STATUS_MAP]?.color ??
    "#95A5A6"

  const config = SHIP_TYPE_CONFIGS[ship.shipType] || DEFAULT_CONFIG

  // 尺寸映射（兼容旧数据）
  const l = Math.max(2.5, Number(ship.length) * 0.35)
  const w = Math.max(1.2, Number(ship.width) * 0.18)
  const hullHeight = 0.7
  const deckY = hullHeight

  // 位置映射
  const x = ship.positionX != null ? (ship.positionX / 50) * 50 : 0
  const z = ship.positionZ != null ? (ship.positionZ / 30) * 30 + 3 : 8
  const rotation =
    ship.rotation != null
      ? THREE.MathUtils.degToRad(ship.rotation)
      : 0

  // 船体Shape
  const hullShape = useMemo(() => createHullShape(l, w), [l, w])
  const extrudeSettings = useMemo(
    () => ({
      steps: 2,
      depth: hullHeight,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
    }),
    [hullHeight]
  )

  // 工时统计
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
      {/* ===== 船体 ===== */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[hullShape, extrudeSettings]} />
        <meshStandardMaterial
          color={config.hullColor}
          roughness={0.3}
          metalness={0.35}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* 船体水线标记 */}
      <mesh
        position={[0, hullHeight * 0.25, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <shapeGeometry args={[useMemo(() => {
          const s = createHullShape(l * 0.98, w * 0.96)
          return s
        }, [l, w])]} />
        <meshBasicMaterial
          color="#E74C3C"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ===== 上层建筑/桥楼 ===== */}
      <Superstructure
        config={config}
        l={l}
        w={w}
        deckY={deckY}
        hullHeight={hullHeight}
      />

      {/* ===== 烟囱 ===== */}
      <Funnel config={config} l={l} w={w} deckY={deckY} hullHeight={hullHeight} />

      {/* ===== 船型特有设备 ===== */}
      {config.hasContainers && (
        <ContainerStacks l={l} w={w} deckY={deckY} />
      )}
      {config.hasHatches && (
        <HatchCovers l={l} w={w} deckY={deckY} />
      )}
      {config.hasPipes && (
        <DeckPipes l={l} deckY={deckY} />
      )}
      {config.hasCrane && (
        <DeckCrane l={l} w={w} deckY={deckY} />
      )}

      {/* ===== 救生艇 ===== */}
      <Lifeboats l={l} w={w} deckY={deckY} />

      {/* ===== 锚 ===== */}
      <Anchors l={l} w={w} deckY={deckY} />

      {/* ===== 螺旋桨与舵 ===== */}
      <PropellerAndRudder l={l} hullHeight={hullHeight} />

      {/* ===== 甲板护栏 ===== */}
      <DeckRailing l={l} w={w} deckY={deckY} />

      {/* ===== 甲板标记线 ===== */}
      <mesh
        position={[0, deckY + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[l * 0.85, w * 0.08]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ===== 选中高亮环 ===== */}
      {isSelected && (
        <>
          <mesh
            position={[0, hullHeight / 2, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry
              args={[Math.max(w, l) * 0.6, Math.max(w, l) * 0.68, 32]}
            />
            <meshBasicMaterial
              color="#00D4FF"
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* 选中轮廓光 */}
          <mesh position={[0, hullHeight / 2, 0]}>
            <boxGeometry args={[l * 1.05, hullHeight * 1.1, w * 1.05]} />
            <meshBasicMaterial
              color="#00D4FF"
              transparent
              opacity={0.1}
              wireframe
            />
          </mesh>
        </>
      )}

      {/* 编辑模式高亮 */}
      {editMode && isSelected && (
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[Math.max(w, l) * 0.75, Math.max(w, l) * 0.8, 32]}
          />
          <meshBasicMaterial
            color="#00FF88"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* ===== HTML标签 ===== */}
      <Html position={[0, hullHeight + 2.5, 0]} center distanceFactor={30}>
        <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none">
          <div
            className={`text-[9px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded ${
              isSelected ? "scale-110 text-[10px]" : ""
            }`}
            style={{ backgroundColor: color + "DD", color: "white" }}
          >
            {ship.name}
          </div>
          <div className="text-[7px] text-slate-400 bg-black/60 px-1 rounded whitespace-nowrap">
            {ship.shipType} · {ship.length}m
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
