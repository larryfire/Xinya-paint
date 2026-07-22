import * as THREE from 'three'
import type { DockInfo, GantryCraneInfo, FactoryId } from '@/types/scene'

/**
 * 门座式起重机模型
 * 四柱门架 + 顶部横梁 + 旋转平台 + 海侧吊臂 + 陆侧配重 + 司机室 + 吊钩
 */
export function buildCranes(
  scene: THREE.Scene,
  gantryCranes: GantryCraneInfo[],
  docks: DockInfo[],
  factoryId: FactoryId
) {
  const group = new THREE.Group()
  group.name = 'cranes'

  // 如果没有门机数据，根据船坞位置自动生成
  const cranesToBuild =
    gantryCranes.length > 0
      ? gantryCranes
      : generateCranesFromDocks(docks, factoryId)

  cranesToBuild.forEach((crane) => {
    const craneGroup = buildSingleCrane(crane, factoryId)
    craneGroup.position.set(crane.positionX, 0, crane.positionZ)
    if (crane.rotation) {
      craneGroup.rotation.y = crane.rotation
    }
    group.add(craneGroup)
  })

  scene.add(group)
  return group
}

function generateCranesFromDocks(
  docks: DockInfo[],
  factoryId: FactoryId
): GantryCraneInfo[] {
  const dockDocks = docks.filter((d) => d.type === 'dock')
  const cranes: GantryCraneInfo[] = []

  dockDocks.forEach((dock, idx) => {
    // 每个船坞配 2 台门机（左右各一）
    cranes.push({
      id: -(idx * 2 + 1),
      name: `门机${idx * 2 + 1}`,
      status: dock.status === 'available' ? 'active' : 'idle',
      factoryId,
      positionX: dock.positionX - 4,
      positionZ: dock.positionZ - 1,
      rotation: 0,
      dockId: dock.id,
    })
    cranes.push({
      id: -(idx * 2 + 2),
      name: `门机${idx * 2 + 2}`,
      status: dock.status === 'available' ? 'active' : 'idle',
      factoryId,
      positionX: dock.positionX + 4,
      positionZ: dock.positionZ - 1,
      rotation: 0,
      dockId: dock.id,
    })
  })

  return cranes
}

function buildSingleCrane(crane: GantryCraneInfo, factoryId: FactoryId) {
  const group = new THREE.Group()
  const seaDir = factoryId === 2 ? 'east' : 'north'

  // 颜色根据状态
  const color = getCraneColor(crane.status)

  // 1. 四柱门架
  const legHeight = 6
  const legWidth = 0.25
  const legPositions = [
    [-1.8, legHeight / 2, -1.2],
    [1.8, legHeight / 2, -1.2],
    [-1.8, legHeight / 2, 1.2],
    [1.8, legHeight / 2, 1.2],
  ]
  const legMat = new THREE.MeshStandardMaterial({ color: 0x4b5563 })
  legPositions.forEach(([x, y, z]) => {
    const legGeo = new THREE.BoxGeometry(legWidth, legHeight, legWidth)
    const leg = new THREE.Mesh(legGeo, legMat)
    leg.position.set(x, y, z)
    leg.castShadow = true
    group.add(leg)
  })

  // 2. 顶部横梁
  const beamGeo = new THREE.BoxGeometry(4.2, 0.4, 2.8)
  const beamMat = new THREE.MeshStandardMaterial({ color })
  const beam = new THREE.Mesh(beamGeo, beamMat)
  beam.position.y = legHeight + 0.2
  beam.castShadow = true
  group.add(beam)

  // 3. 旋转平台
  const platformGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 16)
  const platformMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b })
  const platform = new THREE.Mesh(platformGeo, platformMat)
  platform.position.y = legHeight + 0.55
  platform.castShadow = true
  group.add(platform)

  // 4. 海侧吊臂
  const armLength = 7
  const armGeo = new THREE.BoxGeometry(0.4, 0.4, armLength)
  const armMat = new THREE.MeshStandardMaterial({ color })
  const arm = new THREE.Mesh(armGeo, armMat)
  // 根据海侧方向调整吊臂朝向
  if (seaDir === 'east') {
    arm.rotation.y = Math.PI / 2
    arm.position.set(armLength / 2, legHeight + 1.2, 0)
  } else {
    arm.position.set(0, legHeight + 1.2, -armLength / 2)
  }
  arm.castShadow = true
  group.add(arm)

  // 5. 陆侧配重臂
  const counterLength = 3
  const counterGeo = new THREE.BoxGeometry(0.4, 0.4, counterLength)
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x4b5563 })
  const counter = new THREE.Mesh(counterGeo, counterMat)
  if (seaDir === 'east') {
    counter.rotation.y = Math.PI / 2
    counter.position.set(-counterLength / 2, legHeight + 1.2, 0)
  } else {
    counter.position.set(0, legHeight + 1.2, counterLength / 2)
  }
  counter.castShadow = true
  group.add(counter)

  // 6. 司机室
  const cabGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8)
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
  const cab = new THREE.Mesh(cabGeo, cabMat)
  if (seaDir === 'east') {
    cab.position.set(2, legHeight + 0.8, 0.8)
  } else {
    cab.position.set(0.8, legHeight + 0.8, -2)
  }
  cab.castShadow = true
  group.add(cab)

  // 7. 吊钩
  const hookGeo = new THREE.CylinderGeometry(0.1, 0.05, 0.6, 8)
  const hookMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 })
  const hook = new THREE.Mesh(hookGeo, hookMat)
  if (seaDir === 'east') {
    hook.position.set(armLength - 0.5, legHeight - 0.5, 0)
  } else {
    hook.position.set(0, legHeight - 0.5, -(armLength - 0.5))
  }
  group.add(hook)

  group.userData = {
    type: 'crane',
    id: crane.id,
    name: crane.name,
    raw: crane,
  }

  return group
}

function getCraneColor(status: string): number {
  switch (status) {
    case 'active':
      return 0x22d3ee // 青色运行
    case 'maintenance':
      return 0xfacc15 // 黄色维护
    case 'idle':
    default:
      return 0x94a3b8 // 灰色闲置
  }
}
