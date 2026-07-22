import * as THREE from 'three'
import type { DockInfo } from '@/types/scene'

/**
 * 船坞/码头/泊位模型
 * 船坞为 U 型结构，泊位为带护舷的平台
 */
export function buildDocks(scene: THREE.Scene, docks: DockInfo[]) {
  const group = new THREE.Group()
  group.name = 'docks'

  const dockFacilities = docks.filter((d) => d.type === 'dock' || d.type === 'berth' || d.type === 'wharf'
  )

  dockFacilities.forEach((dock) => {
    if (dock.type === 'dock') {
      buildDryDock(group, dock)
    } else {
      buildBerth(group, dock)
    }
  })

  scene.add(group)
  return group
}

function buildDryDock(group: THREE.Group, dock: DockInfo) {
  const width = Math.max(4, dock.width * 0.5)
  const depth = Math.max(5, dock.depth * 0.4)
  const wallHeight = 1.2
  const wallThickness = 0.3
  const color = getDockColor(dock.status)

  const dockGroup = new THREE.Group()

  // 船坞底部
  const floorGeo = new THREE.BoxGeometry(width, 0.2, depth)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x4b5563,
    roughness: 0.8,
    metalness: 0.2,
  })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.position.y = -0.5
  floor.receiveShadow = true
  dockGroup.add(floor)

  // 两侧墙
  const sideWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, depth)
  const wallMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.3,
  })
  const leftWall = new THREE.Mesh(sideWallGeo, wallMat)
  leftWall.position.set(-width / 2 + wallThickness / 2, wallHeight / 2 - 0.5, 0)
  leftWall.castShadow = true
  leftWall.receiveShadow = true
  dockGroup.add(leftWall)

  const rightWall = new THREE.Mesh(sideWallGeo, wallMat)
  rightWall.position.set(width / 2 - wallThickness / 2, wallHeight / 2 - 0.5, 0)
  rightWall.castShadow = true
  rightWall.receiveShadow = true
  dockGroup.add(rightWall)

  // 后端墙
  const backWallGeo = new THREE.BoxGeometry(width, wallHeight, wallThickness)
  const backWall = new THREE.Mesh(backWallGeo, wallMat)
  backWall.position.set(0, wallHeight / 2 - 0.5, depth / 2 - wallThickness / 2)
  backWall.castShadow = true
  backWall.receiveShadow = true
  dockGroup.add(backWall)

  dockGroup.position.set(dock.positionX, 0, dock.positionZ)
  if (dock.rotation) {
    dockGroup.rotation.y = dock.rotation
  }
  dockGroup.userData = {
    type: 'dock',
    id: dock.id,
    name: dock.name,
    raw: dock,
  }

  group.add(dockGroup)
}

function buildBerth(group: THREE.Group, dock: DockInfo) {
  const width = Math.max(3, dock.width * 0.5)
  const depth = Math.max(4, dock.depth * 0.4)
  const height = 0.8
  const color = getDockColor(dock.status)

  const berthGroup = new THREE.Group()

  // 码头平台
  const platformGeo = new THREE.BoxGeometry(width, height, depth)
  const platformMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.2,
  })
  const platform = new THREE.Mesh(platformGeo, platformMat)
  platform.position.y = height / 2
  platform.castShadow = true
  platform.receiveShadow = true
  berthGroup.add(platform)

  // 护舷（小圆柱阵列）
  const fenderGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 8)
  const fenderMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 })
  const fenderCount = Math.max(3, Math.floor(depth / 2))
  for (let i = 0; i < fenderCount; i++) {
    const fender = new THREE.Mesh(fenderGeo, fenderMat)
    fender.rotation.z = Math.PI / 2
    fender.position.set(-width / 2 - 0.1, height / 2, -depth / 2 + (i + 0.5) * (depth / fenderCount))
    berthGroup.add(fender)
  }

  // 缆桩
  const bollardGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8)
  const bollardMat = new THREE.MeshStandardMaterial({ color: 0x374151 })
  const bollardPositions = [
    [-width / 2 + 0.5, height + 0.25, -depth / 2 + 0.5],
    [width / 2 - 0.5, height + 0.25, -depth / 2 + 0.5],
    [-width / 2 + 0.5, height + 0.25, depth / 2 - 0.5],
    [width / 2 - 0.5, height + 0.25, depth / 2 - 0.5],
  ]
  bollardPositions.forEach(([x, y, z]) => {
    const bollard = new THREE.Mesh(bollardGeo, bollardMat)
    bollard.position.set(x, y, z)
    bollard.castShadow = true
    berthGroup.add(bollard)
  })

  berthGroup.position.set(dock.positionX, 0, dock.positionZ)
  if (dock.rotation) {
    berthGroup.rotation.y = dock.rotation
  }
  berthGroup.userData = {
    type: 'dock',
    id: dock.id,
    name: dock.name,
    raw: dock,
  }

  group.add(berthGroup)
}

function getDockColor(status: string): number {
  switch (status) {
    case 'available':
      return 0x22d3ee // 可用青色
    case 'occupied':
      return 0xf87171 // 占用红色
    case 'maintenance':
      return 0xfacc15 // 维护黄色
    case 'offline':
    default:
      return 0x94a3b8 // 离线灰色
  }
}
