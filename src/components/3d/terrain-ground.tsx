"use client"

import type { FactoryId } from "@/stores/scene-store"

interface TerrainConfig {
  groundZ: number // 陆地中心Z
  groundSize: [number, number] // [width, depth]
  coastlineZ: number // 海岸线Z
  coastlineSize: [number, number] // [width, depth]
  waterZ: number // 水面中心Z
  waterColor: string
  groundColor: string
  coastColor: string
}

/** 两个厂区的地形配置 */
const TERRAIN_CONFIGS: Record<FactoryId, TerrainConfig> = {
  1: {
    // 鑫亚厂区：海岸线东西走向，水域在北(Z+)，陆地在南(Z-)
    groundZ: -15,
    groundSize: [120, 50],
    coastlineZ: 0,
    coastlineSize: [120, 3],
    waterZ: 15,
    waterColor: "#0A3D5C",
    groundColor: "#2D3A2A",
    coastColor: "#8B7355",
  },
  2: {
    // 亚泰厂区：L型海岸线，主岸线东西+东侧南北延伸
    groundZ: -12,
    groundSize: [90, 40],
    coastlineZ: 2,
    coastlineSize: [90, 3],
    waterZ: 18,
    waterColor: "#0A3550",
    groundColor: "#2A3528",
    coastColor: "#7D6B4F",
  },
}

export function getTerrainConfig(factoryId: FactoryId): TerrainConfig {
  return TERRAIN_CONFIGS[factoryId] || TERRAIN_CONFIGS[1]
}

/** 地形系统 — 陆地、海岸线 */
export function TerrainGround({
  factoryId,
  coastlineZ,
}: {
  factoryId: FactoryId
  coastlineZ?: number
}) {
  const config = getTerrainConfig(factoryId)
  const cz = coastlineZ ?? config.coastlineZ

  return (
    <>
      {/* 陆地区域 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.51, config.groundZ]}
        receiveShadow
      >
        <planeGeometry args={config.groundSize} />
        <meshStandardMaterial
          color={config.groundColor}
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>

      {/* 码头面（硬化地面） */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.47, cz - 2]}
        receiveShadow
      >
        <planeGeometry args={[config.groundSize[0], 6]} />
        <meshStandardMaterial
          color="#6B6B6B"
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      {/* 海岸线/沙滩 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, cz]}>
        <planeGeometry args={config.coastlineSize} />
        <meshStandardMaterial
          color={config.coastColor}
          roughness={0.8}
        />
      </mesh>

      {/* 码头前沿线 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.35, cz + 0.3]}
        receiveShadow
      >
        <planeGeometry args={[config.groundSize[0], 0.8]} />
        <meshStandardMaterial
          color="#888888"
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
    </>
  )
}
