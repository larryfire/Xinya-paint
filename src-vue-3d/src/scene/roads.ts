import * as THREE from 'three'
import type { FactoryLayout, RoadLayout } from '@/types/scene'

/**
 * 根据布局数据生成道路和隧道
 */
export function buildRoads(scene: THREE.Scene, layout: FactoryLayout) {
  const group = new THREE.Group()
  group.name = 'roads'

  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a5a5a,
    roughness: 0.9,
    metalness: 0.1,
  })

  const lineMaterial = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.8,
  })

  const tunnelMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    roughness: 0.7,
    metalness: 0.2,
    transparent: true,
    opacity: 0.8,
  })

  layout.roads.forEach((road) => {
    if (!road.points || road.points.length < 2) return

    buildRoadSegment(group, road, roadMaterial, lineMaterial, tunnelMaterial)
  })

  scene.add(group)
  return group
}

function buildRoadSegment(
  group: THREE.Group,
  road: RoadLayout,
  roadMat: THREE.Material,
  lineMat: THREE.Material,
  tunnelMat: THREE.Material
) {
  const points = road.points.map(([x, z]) => new THREE.Vector3(x, 0, z))

  // 使用 Catmull-Rom 曲线让道路更自然
  const curve = new THREE.CatmullRomCurve3(points)
  curve.curveType = 'catmullrom'
  curve.tension = 0.3

  // 道路主体
  const tubeGeo = new THREE.TubeGeometry(curve, 32, road.width / 2, 8, false)
  const tube = new THREE.Mesh(tubeGeo, roadMat)
  tube.position.y = -0.45
  tube.receiveShadow = true
  tube.userData = {
    type: 'road',
    id: 0,
    name: road.name,
    raw: road,
  }
  group.add(tube)

  // 道路中心线
  const centerLineGeo = new THREE.TubeGeometry(curve, 32, 0.08, 4, false)
  const centerLine = new THREE.Mesh(centerLineGeo, lineMat)
  centerLine.position.y = -0.43
  group.add(centerLine)

  // 隧道罩
  if (road.tunnel) {
    const tunnelHeight = road.tunnelHeight || 4
    const tunnelGeo = new THREE.TubeGeometry(
      curve,
      32,
      road.width / 2 + 0.5,
      12,
      false
    )
    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat)
    tunnel.position.y = -0.45 + tunnelHeight / 2
    tunnel.scale.y = tunnelHeight / (road.width / 2 + 0.5)
    tunnel.castShadow = true
    group.add(tunnel)
  }
}
