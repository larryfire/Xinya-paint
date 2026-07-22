import * as THREE from 'three'
import type { ShipSceneInfo } from '@/types/scene'

/**
 * 船舶 3D 模型
 * 使用 Shape + ExtrudeGeometry 构建船体轮廓，Box 堆叠上层建筑
 */
export function buildShips(scene: THREE.Scene, ships: ShipSceneInfo[]) {
  const group = new THREE.Group()
  group.name = 'ships'

  ships.forEach((ship) => {
    const shipGroup = buildSingleShip(ship)
    // 与现有 React 模块保持一致：船舶 Z 轴微调
    shipGroup.position.set(ship.positionX, 0, ship.positionZ + 3)
    shipGroup.rotation.y = ship.rotation
    group.add(shipGroup)
  })

  scene.add(group)
  return group
}

function buildSingleShip(ship: ShipSceneInfo) {
  const group = new THREE.Group()

  const length = Math.max(4, ship.length * 0.35)
  const width = Math.max(1.5, ship.width * 0.18)
  const hullColor = getShipColor(ship.type)

  // 船体轮廓（纺锤形）
  const shape = new THREE.Shape()
  shape.moveTo(0, -width / 2)
  shape.lineTo(length * 0.85, -width / 2)
  shape.quadraticCurveTo(length, -width / 4, length, 0)
  shape.quadraticCurveTo(length, width / 4, length * 0.85, width / 2)
  shape.lineTo(0, width / 2)
  shape.quadraticCurveTo(-length * 0.15, width / 4, -length * 0.2, 0)
  shape.quadraticCurveTo(-length * 0.15, -width / 4, 0, -width / 2)

  const hullGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.8,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2,
  })
  const hullMat = new THREE.MeshStandardMaterial({
    color: hullColor,
    roughness: 0.4,
    metalness: 0.3,
  })
  const hull = new THREE.Mesh(hullGeo, hullMat)
  hull.rotation.x = -Math.PI / 2
  hull.position.y = 0.3
  hull.castShadow = true
  hull.receiveShadow = true
  group.add(hull)

  // 船舱/甲板建筑
  const deckGeo = new THREE.BoxGeometry(length * 0.5, 0.15, width * 0.7)
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 })
  const deck = new THREE.Mesh(deckGeo, deckMat)
  deck.position.set(-length * 0.05, 0.9, 0)
  deck.castShadow = true
  group.add(deck)

  // 上层建筑
  const superStructureGeo = new THREE.BoxGeometry(length * 0.2, 0.8, width * 0.5)
  const superStructureMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9 })
  const superStructure = new THREE.Mesh(superStructureGeo, superStructureMat)
  superStructure.position.set(-length * 0.25, 1.3, 0)
  superStructure.castShadow = true
  group.add(superStructure)

  // 烟囱
  const funnelGeo = new THREE.BoxGeometry(0.4, 0.6, 0.3)
  const funnelMat = new THREE.MeshStandardMaterial({ color: 0xef4444 })
  const funnel = new THREE.Mesh(funnelGeo, funnelMat)
  funnel.position.set(-length * 0.25, 2.0, 0.15)
  funnel.castShadow = true
  group.add(funnel)

  // 船名标签底座
  const namePlateGeo = new THREE.BoxGeometry(length * 0.3, 0.1, 0.05)
  const namePlateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b })
  const namePlate = new THREE.Mesh(namePlateGeo, namePlateMat)
  namePlate.position.set(0, 1.0, width / 2 + 0.03)
  group.add(namePlate)

  group.userData = {
    type: 'ship',
    id: ship.id,
    name: ship.name,
    raw: ship,
  }

  return group
}

function getShipColor(type: string): number {
  switch (type) {
    case 'container':
      return 0x60a5fa
    case 'bulk':
      return 0xf87171
    case 'tanker':
      return 0xfacc15
    case 'passenger':
      return 0xa78bfa
    default:
      return 0x94a3b8
  }
}
