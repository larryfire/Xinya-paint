"use client"

import { useMemo, Suspense } from "react"
import { useLoader } from "@react-three/fiber"
import * as THREE from "three"

interface GroundTextureProps {
  /** 厂区ID，决定加载哪张纹理 */
  factoryId: 1 | 2
  /** 地面覆盖尺寸 [width, depth] */
  groundSize?: [number, number]
  /** 地面中心Z偏移 */
  groundZ?: number
  /** 透明度 (0-1) */
  opacity?: number
}

/**
 * 加载并显示卫星航拍纹理
 * 在 Suspense 边界内异步加载纹理
 */
function SatelliteGround({
  factoryId,
  groundSize = [120, 50],
  groundZ = -15,
  opacity = 0.85,
}: GroundTextureProps) {
  const texturePath =
    factoryId === 1 ? "/textures/factory1.webp" : "/textures/factory2.webp"

  const texture = useLoader(THREE.TextureLoader, texturePath)

  // 纹理配置：使用线性过滤避免模糊
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
  }, [texture])

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.44, groundZ]}
      receiveShadow
    >
      <planeGeometry args={groundSize} />
      <meshStandardMaterial
        map={texture}
        roughness={0.8}
        metalness={0.0}
        transparent
        opacity={opacity}
        depthWrite={true}
      />
    </mesh>
  )
}

/**
 * 卫星地图纹理底图组件
 * 在3D场景中显示船厂的真实航拍照片作为地面纹理
 *
 * 根据PDF图纸（航拍照片）生成：
 * - 工厂1（鑫亚）：北侧海岸线，水域在北
 * - 工厂2（亚泰）：L型海岸线，水域在北和东
 */
export function GroundTexture({
  factoryId,
  groundSize,
  groundZ,
  opacity,
}: GroundTextureProps) {
  return (
    <Suspense fallback={null}>
      <SatelliteGround
        factoryId={factoryId}
        groundSize={groundSize}
        groundZ={groundZ}
        opacity={opacity}
      />
    </Suspense>
  )
}
