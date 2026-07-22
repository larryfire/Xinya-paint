import * as THREE from 'three'
import type { FactoryLayout } from '@/types/scene'

/**
 * 根据布局数据生成地形
 * 包括陆地、海岸线、山体
 */
export function buildTerrain(scene: THREE.Scene, layout: FactoryLayout) {
  const group = new THREE.Group()
  group.name = 'terrain'

  const { bounds, groundColor, coastColor, hills, waterBoundary } = layout

  // 1. 陆地基础平面
  const groundWidth = bounds.maxX - bounds.minX
  const groundDepth = bounds.maxZ - bounds.minZ
  const groundGeo = new THREE.PlaneGeometry(groundWidth, groundDepth, 1, 1)
  const groundMat = new THREE.MeshStandardMaterial({
    color: groundColor,
    roughness: 0.9,
    metalness: 0.0,
  })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, -0.5, (bounds.maxZ + bounds.minZ) / 2)
  ground.receiveShadow = true
  group.add(ground)

  // 2. 海岸线（沙滩/堤坝）
  if (waterBoundary && waterBoundary.length > 2) {
    const coastShape = new THREE.Shape()
    const [firstX, firstZ] = waterBoundary[0]
    coastShape.moveTo(firstX, firstZ)
    for (let i = 1; i < waterBoundary.length; i++) {
      const [x, z] = waterBoundary[i]
      coastShape.lineTo(x, z)
    }
    coastShape.lineTo(firstX, firstZ)

    // 外扩海岸线
    const coastExpand = 2.5
    const outerShape = new THREE.Shape()
    outerShape.moveTo(bounds.minX - coastExpand, bounds.maxZ + coastExpand)
    outerShape.lineTo(bounds.maxX + coastExpand, bounds.maxZ + coastExpand)
    outerShape.lineTo(bounds.maxX + coastExpand, bounds.minZ - coastExpand)
    outerShape.lineTo(bounds.minX - coastExpand, bounds.minZ - coastExpand)
    outerShape.lineTo(bounds.minX - coastExpand, bounds.maxZ + coastExpand)

    // 使用 Path 从外轮廓中挖去水域边界
    const holePath = new THREE.Path()
    const [holeFirstX, holeFirstZ] = waterBoundary[0]
    holePath.moveTo(holeFirstX, holeFirstZ)
    for (let i = 1; i < waterBoundary.length; i++) {
      const [x, z] = waterBoundary[i]
      holePath.lineTo(x, z)
    }
    holePath.lineTo(holeFirstX, holeFirstZ)
    outerShape.holes.push(holePath)

    const coastGeo = new THREE.ExtrudeGeometry(outerShape, {
      depth: 0.4,
      bevelEnabled: false,
    })
    const coastMat = new THREE.MeshStandardMaterial({
      color: coastColor,
      roughness: 0.8,
      metalness: 0.0,
    })
    const coast = new THREE.Mesh(coastGeo, coastMat)
    coast.rotation.x = -Math.PI / 2
    coast.position.y = -0.3
    coast.receiveShadow = true
    group.add(coast)
  }

  // 3. 山体
  hills.forEach((hill) => {
    if (!hill.contours || hill.contours.length < 3) return

    // 计算山体中心
    let centerX = 0
    let centerZ = 0
    hill.contours.forEach(([x, z]) => {
      centerX += x
      centerZ += z
    })
    centerX /= hill.contours.length
    centerZ /= hill.contours.length

    // 使用多个圆锥组合模拟山体
    const hillGroup = new THREE.Group()
    const levels = 4
    for (let i = 0; i < levels; i++) {
      const ratio = 1 - i / levels
      const radius = 8 * ratio + 2
      const height = hill.height * ratio + 1
      const coneGeo = new THREE.ConeGeometry(radius, height, 16)
      const coneMat = new THREE.MeshStandardMaterial({
        color: hill.color,
        roughness: 1.0,
        metalness: 0.0,
      })
      const cone = new THREE.Mesh(coneGeo, coneMat)
      cone.position.y = height / 2 + i * 0.5
      cone.castShadow = true
      cone.receiveShadow = true
      hillGroup.add(cone)
    }

    hillGroup.position.set(centerX, -0.5, centerZ)
    hillGroup.userData = {
      type: 'hill',
      id: 0,
      name: hill.name,
      raw: hill,
    }
    group.add(hillGroup)
  })

  scene.add(group)
  return group
}
