import * as THREE from 'three'
import type { DockInfo } from '@/types/scene'

/**
 * 根据设施数据生成车间/仓库/办公楼模型
 */
export function buildBuildings(scene: THREE.Scene, docks: DockInfo[]) {
  const group = new THREE.Group()
  group.name = 'buildings'

  const buildings = docks.filter(
    (d) => d.type === 'workshop' || d.type === 'warehouse' || d.type === 'office'
  )

  buildings.forEach((dock) => {
    const buildingGroup = new THREE.Group()
    const width = Math.max(2, dock.width * 0.5)
    const depth = Math.max(3, dock.depth * 0.4)
    const height = dock.height || (dock.type === 'workshop' ? 2.5 : 2.0)

    // 建筑主体颜色
    const color = getBuildingColor(dock.type)

    // 主体
    const bodyGeo = new THREE.BoxGeometry(width, height, depth)
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.1,
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = height / 2
    body.castShadow = true
    body.receiveShadow = true
    buildingGroup.add(body)

    // 屋顶
    if (dock.type === 'workshop') {
      // 三角屋顶
      const roofHeight = 0.8
      const roofGeo = new THREE.ConeGeometry(
        Math.sqrt((width / 2) ** 2 + roofHeight ** 2),
        roofHeight,
        4
      )
      const roofMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.8,
        metalness: 0.2,
      })
      const roof = new THREE.Mesh(roofGeo, roofMat)
      roof.position.y = height + roofHeight / 2
      roof.rotation.y = Math.PI / 4
      roof.scale.set(width / roofHeight, 1, depth / roofHeight)
      roof.castShadow = true
      buildingGroup.add(roof)

      // 烟囱
      const chimneyGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.5, 8)
      const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x64748b })
      const chimney = new THREE.Mesh(chimneyGeo, chimneyMat)
      chimney.position.set(width / 3, height + 0.5, depth / 3)
      chimney.castShadow = true
      buildingGroup.add(chimney)
    } else if (dock.type === 'warehouse') {
      // 平顶仓库
      const roofGeo = new THREE.BoxGeometry(width + 0.2, 0.2, depth + 0.2)
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155 })
      const roof = new THREE.Mesh(roofGeo, roofMat)
      roof.position.y = height + 0.1
      roof.castShadow = true
      buildingGroup.add(roof)

      // 卷帘门
      const doorGeo = new THREE.BoxGeometry(width * 0.4, height * 0.6, 0.1)
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
      const door = new THREE.Mesh(doorGeo, doorMat)
      door.position.set(0, height * 0.3, depth / 2 + 0.05)
      buildingGroup.add(door)
    }

    buildingGroup.position.set(dock.positionX, 0, dock.positionZ)
    if (dock.rotation) {
      buildingGroup.rotation.y = dock.rotation
    }
    buildingGroup.userData = {
      type: 'building',
      id: dock.id,
      name: dock.name,
      raw: dock,
    }

    group.add(buildingGroup)
  })

  scene.add(group)
  return group
}

function getBuildingColor(type: string): number {
  switch (type) {
    case 'workshop':
      return 0x60a5fa // 蓝色车间
    case 'warehouse':
      return 0xfca5a5 // 红色仓库
    case 'office':
      return 0xfcd34d // 黄色办公楼
    default:
      return 0x94a3b8
  }
}
