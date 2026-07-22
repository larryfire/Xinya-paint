import * as THREE from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { ShipSceneInfo, DockInfo, GantryCraneInfo } from '@/types/scene'

/**
 * 2D HTML 标签系统
 * 用于显示船舶、船坞、门机、建筑的名称和状态
 */
export function buildLabels(
  scene: THREE.Scene,
  data: {
    ships: ShipSceneInfo[]
    docks: DockInfo[]
    gantryCranes: GantryCraneInfo[]
  }
) {
  const group = new THREE.Group()
  group.name = 'labels'

  // 船舶标签
  data.ships.forEach((ship) => {
    const el = createLabelElement(ship.name, '#22d3ee')
    const label = new CSS2DObject(el)
    label.position.set(ship.positionX, 2.5, ship.positionZ + 3)
    group.add(label)
  })

  // 船坞/泊位标签
  data.docks
    .filter((d) => d.type === 'dock' || d.type === 'berth' || d.type === 'wharf')
    .forEach((dock) => {
      const color = getStatusColor(dock.status)
      const el = createLabelElement(dock.name, color)
      const label = new CSS2DObject(el)
      label.position.set(dock.positionX, 1.8, dock.positionZ)
      group.add(label)
    })

  // 门机标签
  data.gantryCranes.forEach((crane) => {
    const color = getCraneStatusColor(crane.status)
    const el = createLabelElement(crane.name, color)
    const label = new CSS2DObject(el)
    label.position.set(crane.positionX, 7.5, crane.positionZ)
    group.add(label)
  })

  // 建筑标签
  data.docks
    .filter((d) => d.type === 'workshop' || d.type === 'warehouse' || d.type === 'office')
    .forEach((building) => {
      const el = createLabelElement(building.name, '#94a3b8')
      const label = new CSS2DObject(el)
      const height = building.height || (building.type === 'workshop' ? 2.5 : 2.0)
      label.position.set(building.positionX, height + 0.8, building.positionZ)
      group.add(label)
    })

  scene.add(group)
  return group
}

/**
 * 创建 CSS2DRenderer
 */
export function createLabelRenderer(container: HTMLElement) {
  const renderer = new CSS2DRenderer()
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.domElement.style.position = 'absolute'
  renderer.domElement.style.top = '0'
  renderer.domElement.style.left = '0'
  renderer.domElement.style.pointerEvents = 'none'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  container.appendChild(renderer.domElement)
  return renderer
}

function createLabelElement(text: string, color: string) {
  const div = document.createElement('div')
  div.className = 'scene-label'
  div.textContent = text
  div.style.cssText = `
    padding: 2px 8px;
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid ${color}80;
    border-radius: 4px;
    color: ${color};
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    user-select: none;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  `
  return div
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'available':
      return '#22d3ee'
    case 'occupied':
      return '#f87171'
    case 'maintenance':
      return '#facc15'
    default:
      return '#94a3b8'
  }
}

function getCraneStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return '#22d3ee'
    case 'maintenance':
      return '#facc15'
    default:
      return '#94a3b8'
  }
}
